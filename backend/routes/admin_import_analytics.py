"""
Admin Import Analytics — Dashboard for tracking Gmail History Import
performance, user behavior, and conversion funnel.
"""

from fastapi import APIRouter, Depends
from datetime import datetime, timezone, timedelta
from database import db
from admin_guard import require_admin

router = APIRouter(prefix="/api/admin/import-analytics", dependencies=[Depends(require_admin)])


def _serialize(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


@router.get("/overview")
async def import_overview():
    """Aggregate overview stats across all import runs."""
    # Total completed imports
    total_runs = await db.import_analytics.count_documents({})

    # Aggregate from import_analytics collection
    pipeline = [
        {"$group": {
            "_id": None,
            "total_schools_imported": {"$sum": "$confirm.created_count"},
            "total_schools_skipped": {"$sum": "$confirm.skipped_count"},
            "total_coaches_from_kb": {"$sum": "$confirm.coaches_created_from_kb"},
            "total_coaches_from_gmail": {"$sum": "$confirm.coaches_created_from_gmail"},
            "total_messages_scanned": {"$sum": "$scan.messages_scanned"},
            "avg_scan_duration": {"$avg": "$scan.scan_duration_s"},
            "avg_conversion_rate": {"$avg": "$confirm.conversion_rate"},
            "avg_schools_per_run": {"$avg": "$confirm.created_count"},
        }}
    ]
    results = await db.import_analytics.aggregate(pipeline).to_list(1)
    agg = results[0] if results else {}
    agg.pop("_id", None)

    # Unique users who completed imports
    unique_users = await db.import_analytics.distinct("user_id")

    # Total in-progress or pending runs
    pending_runs = await db.import_runs.count_documents({"status": {"$in": ["scanning", "aggregating"]}})
    ready_not_confirmed = await db.import_runs.count_documents({"status": "ready", "confirmed_at": None})

    return {
        "total_completed_imports": total_runs,
        "unique_users": len(unique_users),
        "pending_runs": pending_runs,
        "ready_not_confirmed": ready_not_confirmed,
        "total_schools_imported": agg.get("total_schools_imported", 0),
        "total_schools_skipped": agg.get("total_schools_skipped", 0),
        "total_coaches_from_kb": agg.get("total_coaches_from_kb", 0),
        "total_coaches_from_gmail": agg.get("total_coaches_from_gmail", 0),
        "total_messages_scanned": agg.get("total_messages_scanned", 0),
        "avg_scan_duration_s": round(agg.get("avg_scan_duration", 0), 1),
        "avg_conversion_rate": round(agg.get("avg_conversion_rate", 0), 1),
        "avg_schools_per_run": round(agg.get("avg_schools_per_run", 0), 1),
    }


@router.get("/funnel")
async def import_funnel():
    """Aggregate funnel data across all imports."""
    pipeline = [
        {"$group": {
            "_id": None,
            "total_messages_scanned": {"$sum": "$funnel.messages_scanned"},
            "total_schools_found": {"$sum": "$funnel.schools_found"},
            "total_high_confidence": {"$sum": "$funnel.high_confidence"},
            "total_user_selected": {"$sum": "$funnel.user_selected"},
            "total_actually_created": {"$sum": "$funnel.actually_created"},
        }}
    ]
    results = await db.import_analytics.aggregate(pipeline).to_list(1)
    agg = results[0] if results else {}
    agg.pop("_id", None)

    return {
        "messages_scanned": agg.get("total_messages_scanned", 0),
        "schools_found": agg.get("total_schools_found", 0),
        "high_confidence": agg.get("total_high_confidence", 0),
        "user_selected": agg.get("total_user_selected", 0),
        "actually_created": agg.get("total_actually_created", 0),
    }


@router.get("/behavior")
async def import_behavior():
    """Aggregate user behavior events."""
    pipeline = [
        {"$group": {"_id": "$event", "count": {"$sum": 1}}}
    ]
    results = await db.import_events.aggregate(pipeline).to_list(20)
    events = {r["_id"]: r["count"] for r in results}

    consent_shown = events.get("import_consent_shown", 0)
    started = events.get("import_started", 0)
    preview_shown = events.get("import_preview_shown", 0)
    confirmed = events.get("import_confirmed", 0)
    abandoned = events.get("import_abandoned", 0)
    deselected = events.get("import_suggestion_deselected", 0)
    reselected = events.get("import_suggestion_reselected", 0)
    add_manually = events.get("import_add_manually_clicked", 0)

    return {
        "consent_shown": consent_shown,
        "started": started,
        "preview_shown": preview_shown,
        "confirmed": confirmed,
        "abandoned": abandoned,
        "start_rate": round(started / max(consent_shown, 1) * 100, 1),
        "abandon_rate": round(abandoned / max(preview_shown, 1) * 100, 1),
        "confirm_rate": round(confirmed / max(preview_shown, 1) * 100, 1),
        "total_deselections": deselected,
        "total_reselections": reselected,
        "add_manually_clicks": add_manually,
    }


@router.get("/recent-runs")
async def recent_runs(limit: int = 20, skip: int = 0):
    """List recent import runs with analytics."""
    cursor = db.import_runs.find(
        {},
        {"_id": 0, "suggestions": 0}
    ).sort("started_at", -1).skip(skip).limit(limit)

    runs = await cursor.to_list(length=limit)
    total = await db.import_runs.count_documents({})

    # Enrich with user email
    user_ids = list({r.get("user_id") for r in runs if r.get("user_id")})
    user_map = {}
    if user_ids:
        user_cursor = db.users.find(
            {"user_id": {"$in": user_ids}},
            {"_id": 0, "user_id": 1, "email": 1, "name": 1}
        )
        async for u in user_cursor:
            user_map[u["user_id"]] = {"email": u.get("email", ""), "name": u.get("name", "")}

    enriched = []
    for r in runs:
        uid = r.get("user_id", "")
        user_info = user_map.get(uid, {})
        enriched.append({
            "run_id": r.get("run_id"),
            "user_email": user_info.get("email", ""),
            "user_name": user_info.get("name", ""),
            "status": r.get("status"),
            "started_at": r.get("started_at"),
            "completed_at": r.get("completed_at"),
            "confirmed_at": r.get("confirmed_at"),
            "messages_scanned": r.get("messages_scanned", 0),
            "schools_found": r.get("schools_found", 0),
            "schools_high_confidence": r.get("schools_high_confidence", 0),
            "confirmed_school_ids": r.get("confirmed_school_ids", []),
            "scan_analytics": r.get("scan_analytics"),
            "confirm_analytics": r.get("confirm_analytics"),
            "unmapped_domains": r.get("unmapped_domains", []),
            "error": r.get("error"),
        })

    return {"runs": enriched, "total": total}


@router.get("/stage-distribution")
async def stage_distribution():
    """Aggregate stage distribution across all confirmed imports."""
    pipeline = [
        {"$match": {"confirm_analytics.stages_confirmed": {"$exists": True}}},
        {"$project": {"stages": {"$objectToArray": "$confirm_analytics.stages_confirmed"}}},
        {"$unwind": "$stages"},
        {"$group": {"_id": "$stages.k", "count": {"$sum": "$stages.v"}}},
        {"$sort": {"count": -1}},
    ]
    results = await db.import_analytics.aggregate(pipeline).to_list(10)
    return {"stages": {r["_id"]: r["count"] for r in results}}
