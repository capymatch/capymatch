"""
Stage 1 — Schema Mapper

Introspects the MongoDB database to produce an Agent Input Contract:
a minimal, consistent mapping of actual DB fields used by intelligence micro-agents.

Run once (or on-demand via admin endpoint), then save the output.
"""

import asyncio
import logging
import os
from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger("intelligence.schema_mapper")

# ---------------------------------------------------------------------------
# Field coverage helper
# ---------------------------------------------------------------------------

async def _field_coverage(collection, field_path: str) -> dict:
    """Return coverage stats for a single dotted field path."""
    total = await collection.count_documents({})
    if total == 0:
        return {"total": 0, "populated": 0, "coverage_pct": 0.0}

    populated = await collection.count_documents(
        {field_path: {"$exists": True, "$ne": None, "$ne": ""}}
    )
    return {
        "total": total,
        "populated": populated,
        "coverage_pct": round(populated / total * 100, 1),
    }


async def _sample_field_type(collection, field_path: str) -> str:
    """Return the Python type name of the first non-null value for a field."""
    doc = await collection.find_one(
        {field_path: {"$exists": True, "$ne": None}},
        {"_id": 0, field_path: 1},
    )
    if not doc:
        return "missing"
    # Navigate dotted path
    val = doc
    for part in field_path.split("."):
        if isinstance(val, dict):
            val = val.get(part)
        else:
            return "missing"
    return type(val).__name__ if val is not None else "null"


# ---------------------------------------------------------------------------
# Core mapper
# ---------------------------------------------------------------------------

async def run_schema_mapper(db) -> dict:
    """
    Introspect the live database and produce the Agent Input Contract.

    Returns the full contract dict ready for storage or API response.
    """
    ukb = db.university_knowledge_base   # 1053 schools
    programs = db.programs               # user-tracked programs
    profiles = db.athlete_profiles       # athlete data

    # -----------------------------------------------------------------------
    # 1. Compute coverage for every field we care about
    # -----------------------------------------------------------------------
    coverage = {}

    ukb_fields = [
        "university_name", "division", "conference", "region", "domain",
        "logo_url", "primary_coach", "coach_email", "scholarship_type",
        "roster_needs", "coaches_scraped", "pr_slug",
        "scorecard.sat_avg", "scorecard.act_midpoint", "scorecard.avg_gpa",
        "scorecard.acceptance_rate", "scorecard.graduation_rate",
        "scorecard.retention_rate", "scorecard.student_size",
        "scorecard.school_type", "scorecard.avg_annual_cost",
        "scorecard.data_source", "scorecard.data_scraped_at",
        "scorecard.gpa_is_estimated",
    ]
    for f in ukb_fields:
        stats = await _field_coverage(ukb, f)
        ftype = await _sample_field_type(ukb, f)
        coverage[f"university_knowledge_base.{f}"] = {**stats, "type": ftype}

    profile_fields = [
        "athlete_name", "position", "height", "grad_year", "gpa",
        "sat_score", "act_score", "priorities", "city", "state",
        "high_school", "club_team", "video_link",
    ]
    for f in profile_fields:
        stats = await _field_coverage(profiles, f)
        ftype = await _sample_field_type(profiles, f)
        coverage[f"athlete_profiles.{f}"] = {**stats, "type": ftype}

    program_fields = [
        "program_id", "university_name", "division", "conference", "region",
        "domain", "recruiting_status", "priority", "scholarship_type",
        "roster_needs", "follow_up_days", "initial_contact_sent",
        "last_follow_up", "notes",
    ]
    for f in program_fields:
        stats = await _field_coverage(programs, f)
        ftype = await _sample_field_type(programs, f)
        coverage[f"programs.{f}"] = {**stats, "type": ftype}

    # -----------------------------------------------------------------------
    # 2. Build the Agent Input Contract
    # -----------------------------------------------------------------------
    agent_contract = {
        "school": {
            "id": "university_knowledge_base.domain",
            "name": "university_knowledge_base.university_name",
            "division": "university_knowledge_base.division",
            "conference": "university_knowledge_base.conference",
            "region": "university_knowledge_base.region",
        },
        "academics": {
            "sat_avg_or_range": "university_knowledge_base.scorecard.sat_avg",
            "act_avg_or_range": "university_knowledge_base.scorecard.act_midpoint",
            "acceptance_rate": "university_knowledge_base.scorecard.acceptance_rate",
            "avg_gpa": "university_knowledge_base.scorecard.avg_gpa",
            "gpa_is_estimated": "university_knowledge_base.scorecard.gpa_is_estimated",
            "graduation_rate": "university_knowledge_base.scorecard.graduation_rate",
            "retention_rate": "university_knowledge_base.scorecard.retention_rate",
            "test_optional_policy": None,
            "last_updated": "university_knowledge_base.scorecard.data_scraped_at",
        },
        "roster": {
            "roster_size": None,
            "class_distribution": None,
            "roster_limit": None,
            "roster_last_updated": None,
        },
        "timeline": {
            "commit_timing_signals": None,
            "history_window_years": None,
            "timeline_last_updated": None,
        },
        "scholarship": {
            "scholarship_notes": "university_knowledge_base.scholarship_type",
            "scholarship_last_updated": None,
        },
        "nil": {
            "nil_signals": None,
            "market_signal": None,
            "collective_present": None,
            "nil_last_updated": None,
        },
        "athlete": {
            "gpa": "athlete_profiles.gpa",
            "sat_score": "athlete_profiles.sat_score",
            "act_score": "athlete_profiles.act_score",
            "position": "athlete_profiles.position",
            "grad_year": "athlete_profiles.grad_year",
            "priorities": "athlete_profiles.priorities",
            "state": "athlete_profiles.state",
        },
        "recruiting": {
            "status": "programs.recruiting_status",
            "priority": "programs.priority",
            "interactions_collection": "interactions",
            "events_collection": "events",
        },
        "sources": {
            "sources_array": None,
            "source_id": None,
            "source_type": "university_knowledge_base.scorecard.data_source",
            "retrieved_at": "university_knowledge_base.scorecard.data_scraped_at",
            "fields_supported": None,
        },
    }

    source_precedence = [
        "ManualOverride",
        "SchoolSite",
        "IPEDS",
        "CDS",
        "AthleticsRoster",
        "ThirdParty",
        "Inference",
    ]

    freshness_windows_months = {
        "academics": 18,
        "roster": 12,
        "timeline": 24,
        "scholarship": 24,
        "nil": 18,
    }

    open_questions = [
        "No roster_size or class_distribution data exists in DB. The roster_needs field is 0% populated across university_knowledge_base.",
        "No commit_timing_signals or history_window_years data exists. Timeline intelligence relies on interaction history per-tenant, not program-level commit data.",
        "No NIL-specific signals, market data, or collective presence data exists in any collection.",
        "No test_optional_policy data exists for academics.",
        "Roster limits are inferred from NCAA division rules (not stored in DB). D1/D2 volleyball: 18.",
        "scholarship_type is a categorical label (e.g. 'Full & Partial Athletic'), not a detailed financial breakdown.",
        "athlete_profiles.sat_score and act_score have very low coverage (12.5%). Most athlete academic data is GPA-only.",
        "scorecard.avg_gpa may be estimated (check gpa_is_estimated boolean). Estimated GPAs use a formula, not direct school reporting.",
    ]

    # -----------------------------------------------------------------------
    # 3. Assemble the full contract output
    # -----------------------------------------------------------------------
    contract = {
        "agent_contract": agent_contract,
        "source_precedence": source_precedence,
        "freshness_windows_months": freshness_windows_months,
        "open_questions": open_questions,
        "field_coverage": coverage,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "schema_version": "1.0.0",
    }

    # -----------------------------------------------------------------------
    # 4. Persist to DB
    # -----------------------------------------------------------------------
    await db.intelligence_contracts.update_one(
        {"contract_type": "agent_input"},
        {"$set": {
            "contract_type": "agent_input",
            "contract": contract,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )

    logger.info("Schema Mapper: Agent Input Contract generated and stored.")
    return contract
