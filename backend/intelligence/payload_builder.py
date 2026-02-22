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
- All numeric fields are numbers, not strings.
- Test scores use structured { avg, min, max, unit } shape.
"""

import logging
from datetime import datetime, timezone

logger = logging.getLogger("intelligence.payload_builder")

# ---------------------------------------------------------------------------
# Freshness windows from contract (months)
# ---------------------------------------------------------------------------
FRESHNESS_WINDOWS = {
    "academics": 18,
    "roster": 12,
    "timeline": 24,
    "scholarship": 24,
    "nil": 18,
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _resolve_field(doc: dict, dotted_path: str):
    """Walk a dotted path into a nested dict. Returns None if missing."""
    val = doc
    for part in dotted_path.split("."):
        if isinstance(val, dict):
            val = val.get(part)
        else:
            return None
    if val == "" or val == []:
        return None
    return val


def _to_number(val):
    """Coerce a string to int or float if possible. Returns None if not numeric."""
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return val
    if isinstance(val, str):
        val = val.strip()
        if not val:
            return None
        try:
            return int(val)
        except ValueError:
            pass
        try:
            return float(val)
        except ValueError:
            return None
    return None


def _compute_freshness_months(retrieved_at_iso: str | None) -> int | None:
    """How many months old is this data?"""
    if not retrieved_at_iso:
        return None
    try:
        dt = datetime.fromisoformat(retrieved_at_iso)
        delta = datetime.now(timezone.utc) - dt
        return max(0, int(delta.days / 30))
    except Exception:
        return None


def _quality_rating(populated_count: int, total_fields: int) -> str:
    """Rate data quality for a section based on field coverage."""
    if total_fields == 0:
        return "unknown"
    ratio = populated_count / total_fields
    if ratio >= 0.7:
        return "high"
    if ratio >= 0.4:
        return "partial"
    if ratio > 0:
        return "low"
    return "unknown"


# ---------------------------------------------------------------------------
# Section extractors
# ---------------------------------------------------------------------------

def _extract_section(
    contract_section: dict,
    raw_docs: dict,
    sources_out: list,
    missing_out: list,
    section_name: str,
    source_meta: dict | None = None,
    debug: bool = False,
) -> dict:
    """
    For each field in a contract section, resolve the value from the raw documents.
    Returns a dict of only populated fields.
    """
    result = {}
    total_fields = 0
    for field_key, mapping in contract_section.items():
        total_fields += 1
        if mapping is None:
            missing_out.append(f"{section_name}.{field_key}")
            continue

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

    if result and source_meta:
        freshness = _compute_freshness_months(source_meta.get("retrieved_at"))
        populated = list(result.keys())
        quality = _quality_rating(len(populated), total_fields)
        source_record = {
            "section": section_name,
            "source_id": source_meta.get("source_id", "unknown"),
            "retrieved_at": source_meta.get("retrieved_at"),
            "license_ok": source_meta.get("license_ok", True),
            "freshness_months": freshness,
        }
        # Only include per-field list when quality is not high or debug mode
        if debug or quality != "high":
            source_record["fields_populated"] = populated
        sources_out.append(source_record)

    return result, total_fields


# ---------------------------------------------------------------------------
# Core builder
# ---------------------------------------------------------------------------

async def build_payload(db, program_id: str, tenant_id: str, debug: bool = False) -> dict:
    """
    Build a minimal, source-aware payload for a single school + athlete.
    All numeric fields normalized. Test scores use structured shape.
    When debug=False, fields_populated is omitted from sources where quality is high.
    """
    now = datetime.now(timezone.utc).isoformat()

    # ------------------------------------------------------------------
    # 1. Load the Agent Input Contract
    # ------------------------------------------------------------------
    contract_doc = await db.intelligence_contracts.find_one(
        {"contract_type": "agent_input"}, {"_id": 0}
    )
    if not contract_doc:
        return _empty_payload(now, ["_contract_not_found"])

    contract = contract_doc["contract"]["agent_contract"]

    # ------------------------------------------------------------------
    # 2. Fetch raw documents
    # ------------------------------------------------------------------
    program = await db.programs.find_one(
        {"program_id": program_id, "tenant_id": tenant_id}, {"_id": 0}
    )
    if not program:
        return _empty_payload(now, ["_program_not_found"])

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

    profile = await db.athlete_profiles.find_one(
        {"tenant_id": tenant_id}, {"_id": 0}
    )
    profile = profile or {}

    # Interaction summary
    interaction_count = await db.interactions.count_documents(
        {"program_id": program_id, "tenant_id": tenant_id}
    )
    latest_interaction = await db.interactions.find_one(
        {"program_id": program_id, "tenant_id": tenant_id},
        {"_id": 0, "date_time": 1, "type": 1, "outcome": 1},
        sort=[("date_time", -1)],
    )

    raw_docs = {
        "university_knowledge_base": ukb,
        "programs": program,
        "athlete_profiles": profile,
    }

    sources = []
    missing_fields = []

    # ------------------------------------------------------------------
    # 3. Source metadata (cleaned — no competitor references)
    # ------------------------------------------------------------------
    scorecard = ukb.get("scorecard", {})
    academic_source = {
        "source_id": "internal_db:university_knowledge_base",
        "source_url": None,
        "retrieved_at": scorecard.get("data_scraped_at"),
        "license_ok": True,
    }
    athlete_source = {
        "source_id": "user_input:athlete_profile",
        "source_url": None,
        "retrieved_at": profile.get("updated_at"),
        "license_ok": True,
    }
    program_source = {
        "source_id": "user_input:program",
        "source_url": None,
        "retrieved_at": program.get("created_at"),
        "license_ok": True,
    }

    # ------------------------------------------------------------------
    # 4. Extract sections
    # ------------------------------------------------------------------
    school, school_total = _extract_section(
        contract["school"], raw_docs, sources, missing_fields, "school", academic_source, debug
    )

    academics_raw, acad_total = _extract_section(
        contract["academics"], raw_docs, sources, missing_fields, "academics", academic_source, debug
    )

    athlete_raw, athlete_total = _extract_section(
        contract["athlete"], raw_docs, sources, missing_fields, "athlete", athlete_source, debug
    )

    roster, roster_total = _extract_section(
        contract["roster"], raw_docs, sources, missing_fields, "roster", None, debug
    )

    timeline_section, timeline_total = _extract_section(
        contract["timeline"], raw_docs, sources, missing_fields, "timeline", None, debug
    )

    nil_section, nil_total = _extract_section(
        contract["nil"], raw_docs, sources, missing_fields, "nil", None, debug
    )

    scholarship_section, scholarship_total = _extract_section(
        contract["scholarship"], raw_docs, sources, missing_fields, "scholarship", None, debug
    )

    recruiting, _ = _extract_section(
        {k: v for k, v in contract["recruiting"].items()
         if k not in ("interactions_collection", "events_collection")},
        raw_docs, sources, missing_fields, "recruiting", program_source, debug
    )
    recruiting["interaction_count"] = interaction_count
    if latest_interaction:
        recruiting["last_interaction"] = {
            "date": latest_interaction.get("date_time"),
            "type": latest_interaction.get("type"),
            "outcome": latest_interaction.get("outcome"),
        }

    # ------------------------------------------------------------------
    # 5. Normalize: academics → structured test scores
    # ------------------------------------------------------------------
    academics = _normalize_academics(academics_raw)

    # ------------------------------------------------------------------
    # 6. Normalize: athlete → numeric types
    # ------------------------------------------------------------------
    athlete = _normalize_athlete(athlete_raw)

    # ------------------------------------------------------------------
    # 7. Timeline interaction history
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
                "source_id": "user_input:interactions",
                "source_url": None,
                "retrieved_at": now,
                "license_ok": True,
                "freshness_months": 0,
                "fields_populated": ["interaction_summary"],
            })

    # ------------------------------------------------------------------
    # 8. Data quality ratings
    # ------------------------------------------------------------------
    acad_populated = len([k for k in academics if k not in ("last_updated",)])
    data_quality = {
        "school": _quality_rating(len(school), school_total),
        "academics": _quality_rating(acad_populated, acad_total - 1),  # exclude last_updated
        "athlete": _quality_rating(len(athlete), athlete_total),
        "roster": _quality_rating(len(roster), roster_total),
        "timeline": _quality_rating(
            len(timeline_section), max(timeline_total, 1)
        ),
        "nil": _quality_rating(len(nil_section), nil_total),
        "scholarship": _quality_rating(len(scholarship_section), max(scholarship_total, 1)),
    }

    # ------------------------------------------------------------------
    # 9. Known unknowns (human-readable)
    # ------------------------------------------------------------------
    known_unknowns = _build_known_unknowns(missing_fields, data_quality)

    # ------------------------------------------------------------------
    # 10. Assemble final payload
    # ------------------------------------------------------------------
    return {
        "school": school,
        "athlete": athlete,
        "academics": academics,
        "roster": roster,
        "timeline": timeline_section,
        "nil": nil_section,
        "scholarship": scholarship_section,
        "recruiting": recruiting,
        "sources": sources,
        "data_quality": data_quality,
        "missing_fields": missing_fields,
        "known_unknowns": known_unknowns,
        "now": now,
    }


# ---------------------------------------------------------------------------
# Normalization helpers
# ---------------------------------------------------------------------------

def _normalize_academics(raw: dict) -> dict:
    """Convert flat test score fields to structured { avg, min, max, unit } shape."""
    result = {}

    # SAT
    sat_val = _to_number(raw.get("sat_avg_or_range"))
    if sat_val is not None:
        result["sat"] = {"avg": int(sat_val), "min": None, "max": None, "unit": "1600"}

    # ACT
    act_val = _to_number(raw.get("act_avg_or_range"))
    if act_val is not None:
        result["act"] = {"avg": int(act_val), "min": None, "max": None, "unit": "36"}

    # GPA
    gpa_val = _to_number(raw.get("avg_gpa"))
    if gpa_val is not None:
        result["avg_gpa"] = round(float(gpa_val), 2)

    # Boolean passthrough
    if "gpa_is_estimated" in raw:
        result["gpa_is_estimated"] = raw["gpa_is_estimated"]

    # Rates (already numeric fractions)
    for key in ("acceptance_rate", "graduation_rate", "retention_rate"):
        val = _to_number(raw.get(key))
        if val is not None:
            result[key] = round(float(val), 4)

    # Passthrough
    if "test_optional_policy" in raw:
        result["test_optional_policy"] = raw["test_optional_policy"]
    if "last_updated" in raw:
        result["last_updated"] = raw["last_updated"]

    return result


def _normalize_athlete(raw: dict) -> dict:
    """Coerce athlete fields to proper types. Test scores as structured objects."""
    result = {}

    # GPA → number
    gpa = _to_number(raw.get("gpa"))
    if gpa is not None:
        result["gpa"] = round(float(gpa), 2)

    # SAT → structured
    sat = _to_number(raw.get("sat_score"))
    if sat is not None:
        result["sat"] = {"score": int(sat), "unit": "1600"}

    # ACT → structured
    act = _to_number(raw.get("act_score"))
    if act is not None:
        result["act"] = {"score": int(act), "unit": "36"}

    # String passthroughs
    for key in ("position", "grad_year", "state"):
        if key in raw and raw[key] is not None:
            result[key] = raw[key]

    # List passthroughs
    if "priorities" in raw and raw["priorities"]:
        result["priorities"] = raw["priorities"]

    return result


def _build_known_unknowns(missing_fields: list, data_quality: dict) -> list:
    """Convert missing_fields into human-readable known unknowns."""
    unknowns = []

    # Group by section
    sections = {}
    for f in missing_fields:
        parts = f.split(".", 1)
        section = parts[0] if len(parts) > 1 else f
        sections.setdefault(section, []).append(parts[1] if len(parts) > 1 else f)

    if data_quality.get("roster") == "unknown":
        unknowns.append("No roster data available for this program. Roster size and class distribution are unknown.")

    if data_quality.get("timeline") == "unknown":
        if "interaction_summary" not in sections.get("timeline", []):
            unknowns.append("No commit timing data exists for this program. Timeline analysis relies on user-logged interactions only.")
        else:
            unknowns.append("No commit timing or interaction history exists for this program.")

    if data_quality.get("nil") == "unknown":
        unknowns.append("No NIL-specific data exists. NIL readiness is inferred from division and conference only.")

    if "athlete" in sections:
        athlete_missing = sections["athlete"]
        if "grad_year" in athlete_missing:
            unknowns.append("Athlete graduation year not provided. Timeline relevance cannot be assessed.")
        if "state" in athlete_missing:
            unknowns.append("Athlete state not provided. Regional fit cannot be assessed.")

    if "academics" in sections:
        acad_missing = sections["academics"]
        if "sat_avg_or_range" in acad_missing and "act_avg_or_range" in acad_missing:
            unknowns.append("School test score data is unavailable. Academic fit comparison is limited.")
        if "acceptance_rate" in acad_missing:
            unknowns.append("Acceptance rate not available for this school.")

    return unknowns


def _empty_payload(now: str, missing: list) -> dict:
    """Return the empty-state payload structure."""
    return {
        "school": {}, "athlete": {}, "academics": {}, "roster": {},
        "timeline": {}, "nil": {}, "recruiting": {},
        "sources": [], "data_quality": {
            "school": "unknown", "academics": "unknown", "athlete": "unknown",
            "roster": "unknown", "timeline": "unknown", "nil": "unknown",
        },
        "missing_fields": missing,
        "known_unknowns": ["Insufficient data to build intelligence payload."],
        "now": now,
    }
