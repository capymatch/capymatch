"""
Stage 2 — Payload Builder

Constructs the smallest possible, source-aware JSON payload per school + athlete,
strictly based on the Agent Input Contract produced by Stage 1.

Rules:
- Fetch ONLY fields defined in the contract.
- If data is missing, omit the field and record it in missing_fields[].
- Do NOT infer, scrape, or hallucinate data.
- Attach source metadata when available.
- Output is deterministic JSON (no prose).
"""

import logging
from datetime import datetime, timezone

logger = logging.getLogger("intelligence.payload_builder")


def _resolve_field(doc: dict, dotted_path: str):
    """Walk a dotted path like 'scorecard.sat_avg' into a nested dict. Returns None if missing."""
    val = doc
    for part in dotted_path.split("."):
        if isinstance(val, dict):
            val = val.get(part)
        else:
            return None
    # Treat empty strings as missing
    if val == "" or val == []:
        return None
    return val


def _extract_section(
    contract_section: dict,
    raw_docs: dict,
    sources_out: list,
    missing_out: list,
    section_name: str,
    source_meta: dict | None = None,
) -> dict:
    """
    For each field in a contract section, resolve the value from the raw documents.
    Populates sources_out and missing_out as side effects.
    Returns a dict of only populated fields.
    """
    result = {}
    for field_key, mapping in contract_section.items():
        if mapping is None:
            # Contract explicitly marks this field as unmapped
            missing_out.append(f"{section_name}.{field_key}")
            continue

        # mapping is like "university_knowledge_base.scorecard.sat_avg"
        # Split into collection name and field path
        parts = mapping.split(".", 1)
        if len(parts) < 2:
            missing_out.append(f"{section_name}.{field_key}")
            continue

        collection_name = parts[0]
        field_path = parts[1]

        doc = raw_docs.get(collection_name)
        if doc is None:
            missing_out.append(f"{section_name}.{field_key}")
            continue

        value = _resolve_field(doc, field_path)
        if value is None:
            missing_out.append(f"{section_name}.{field_key}")
            continue

        result[field_key] = value

    # Attach source metadata for the section if any fields were populated
    if result and source_meta:
        sources_out.append({
            "section": section_name,
            "source_type": source_meta.get("source_type", "Unknown"),
            "retrieved_at": source_meta.get("retrieved_at"),
            "fields_populated": list(result.keys()),
        })

    return result


async def build_payload(db, program_id: str, tenant_id: str) -> dict:
    """
    Build a minimal, source-aware payload for a single school + athlete.

    Args:
        db: Motor database instance
        program_id: The user's tracked program ID
        tenant_id: The user's tenant ID

    Returns:
        Deterministic JSON payload matching the required shape.
    """
    now = datetime.now(timezone.utc).isoformat()

    # ------------------------------------------------------------------
    # 1. Load the Agent Input Contract
    # ------------------------------------------------------------------
    contract_doc = await db.intelligence_contracts.find_one(
        {"contract_type": "agent_input"}, {"_id": 0}
    )
    if not contract_doc:
        return {
            "school": {}, "athlete": {}, "academics": {}, "roster": {},
            "timeline": {}, "nil": {}, "sources": [],
            "missing_fields": ["_contract_not_found"],
            "now": now,
        }

    contract = contract_doc["contract"]["agent_contract"]

    # ------------------------------------------------------------------
    # 2. Fetch raw documents (ONLY the collections referenced by contract)
    # ------------------------------------------------------------------
    # Program doc
    program = await db.programs.find_one(
        {"program_id": program_id, "tenant_id": tenant_id}, {"_id": 0}
    )
    if not program:
        return {
            "school": {}, "athlete": {}, "academics": {}, "roster": {},
            "timeline": {}, "nil": {}, "sources": [],
            "missing_fields": ["_program_not_found"],
            "now": now,
        }

    # University knowledge base — look up by domain, fall back to name
    domain = program.get("domain", "")
    uni_name = program.get("university_name", "")
    ukb = None
    if domain:
        ukb = await db.university_knowledge_base.find_one(
            {"domain": domain}, {"_id": 0}
        )
    if not ukb and uni_name:
        ukb = await db.university_knowledge_base.find_one(
            {"university_name": {"$regex": f"^{uni_name}$", "$options": "i"}},
            {"_id": 0},
        )
    ukb = ukb or {}

    # Athlete profile
    profile = await db.athlete_profiles.find_one(
        {"tenant_id": tenant_id}, {"_id": 0}
    )
    profile = profile or {}

    # Interaction summary (count + most recent date, not full docs)
    interaction_count = await db.interactions.count_documents(
        {"program_id": program_id, "tenant_id": tenant_id}
    )
    latest_interaction = await db.interactions.find_one(
        {"program_id": program_id, "tenant_id": tenant_id},
        {"_id": 0, "date_time": 1, "type": 1, "outcome": 1},
        sort=[("date_time", -1)],
    )

    # ------------------------------------------------------------------
    # 3. Build raw_docs lookup keyed by collection name
    # ------------------------------------------------------------------
    raw_docs = {
        "university_knowledge_base": ukb,
        "programs": program,
        "athlete_profiles": profile,
    }

    sources = []
    missing_fields = []

    # Determine source metadata from scorecard
    scorecard = ukb.get("scorecard", {})
    academic_source = {
        "source_type": scorecard.get("data_source", "Unknown"),
        "retrieved_at": scorecard.get("data_scraped_at"),
    }
    athlete_source = {
        "source_type": "UserInput",
        "retrieved_at": profile.get("updated_at"),
    }
    program_source = {
        "source_type": "UserInput",
        "retrieved_at": program.get("created_at"),
    }

    # ------------------------------------------------------------------
    # 4. Extract each section per contract
    # ------------------------------------------------------------------
    school = _extract_section(
        contract["school"], raw_docs, sources, missing_fields, "school", academic_source
    )

    academics = _extract_section(
        contract["academics"], raw_docs, sources, missing_fields, "academics", academic_source
    )

    athlete = _extract_section(
        contract["athlete"], raw_docs, sources, missing_fields, "athlete", athlete_source
    )

    roster = _extract_section(
        contract["roster"], raw_docs, sources, missing_fields, "roster", None
    )

    timeline_section = _extract_section(
        contract["timeline"], raw_docs, sources, missing_fields, "timeline", None
    )

    nil_section = _extract_section(
        contract["nil"], raw_docs, sources, missing_fields, "nil", None
    )

    # ------------------------------------------------------------------
    # 5. Add recruiting context (from program + interaction summary)
    # ------------------------------------------------------------------
    recruiting = _extract_section(
        {k: v for k, v in contract["recruiting"].items()
         if k not in ("interactions_collection", "events_collection")},
        raw_docs, sources, missing_fields, "recruiting", program_source
    )
    # Append interaction summary (not full docs — token-safe)
    recruiting["interaction_count"] = interaction_count
    if latest_interaction:
        recruiting["last_interaction"] = {
            "date": latest_interaction.get("date_time"),
            "type": latest_interaction.get("type"),
            "outcome": latest_interaction.get("outcome"),
        }

    # ------------------------------------------------------------------
    # 6. Add timeline interaction history summary
    # ------------------------------------------------------------------
    if interaction_count > 0:
        pipeline = [
            {"$match": {"program_id": program_id, "tenant_id": tenant_id}},
            {"$group": {
                "_id": "$type",
                "count": {"$sum": 1},
                "latest": {"$max": "$date_time"},
            }},
        ]
        type_summary = {}
        async for doc in db.interactions.aggregate(pipeline):
            type_summary[doc["_id"]] = {
                "count": doc["count"],
                "latest": doc["latest"],
            }
        if type_summary:
            timeline_section["interaction_summary"] = type_summary
            sources.append({
                "section": "timeline",
                "source_type": "UserInput",
                "retrieved_at": now,
                "fields_populated": ["interaction_summary"],
            })

    # ------------------------------------------------------------------
    # 7. Assemble final payload
    # ------------------------------------------------------------------
    payload = {
        "school": school,
        "athlete": athlete,
        "academics": academics,
        "roster": roster,
        "timeline": timeline_section,
        "nil": nil_section,
        "recruiting": recruiting,
        "sources": sources,
        "missing_fields": missing_fields,
        "now": now,
    }

    return payload
