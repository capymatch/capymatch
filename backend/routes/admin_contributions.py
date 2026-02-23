"""
Admin Contribution Review — Review, verify, promote, or reject
user-submitted intelligence card contributions.

Status flow: pending_verification → verified → promoted | rejected
Promotion writes data into the university knowledge base with provenance.
"""

from fastapi import APIRouter, HTTPException, Request, Depends
from datetime import datetime, timezone
from database import db
from bson import ObjectId
from admin_guard import require_admin

router = APIRouter(prefix="/api/admin/contributions", dependencies=[Depends(require_admin)])


def _serialize(doc: dict) -> dict:
    """Remove _id and ensure JSON-safe."""
    doc.pop("_id", None)
    return doc


@router.get("")
async def list_contributions(
    status: str = None,
    card_type: str = None,
    limit: int = 50,
    skip: int = 0,
):
    """List contributions with optional filters."""
    query = {}
    if status:
        query["status"] = status
    if card_type:
        query["card_type"] = card_type

    cursor = db.intelligence_contributions.find(
        query, {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit)

    items = await cursor.to_list(length=limit)
    total = await db.intelligence_contributions.count_documents(query)

    # Enrich with program names
    program_ids = list({c["program_id"] for c in items if c.get("program_id")})
    programs = {}
    if program_ids:
        prog_cursor = db.programs.find(
            {"program_id": {"$in": program_ids}},
            {"_id": 0, "program_id": 1, "university_name": 1}
        )
        async for p in prog_cursor:
            programs[p["program_id"]] = p.get("university_name", "Unknown")

    for item in items:
        item["university_name"] = programs.get(item.get("program_id"), "Unknown")

    return {"items": items, "total": total}


@router.get("/stats")
async def contribution_stats():
    """Aggregate counts by status."""
    pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ]
    results = await db.intelligence_contributions.aggregate(pipeline).to_list(length=20)
    stats = {r["_id"]: r["count"] for r in results}
    return {
        "pending": stats.get("pending_verification", 0),
        "verified": stats.get("verified", 0),
        "promoted": stats.get("promoted", 0),
        "rejected": stats.get("rejected", 0),
        "total": sum(stats.values()),
    }


@router.patch("/{contribution_id}/verify")
async def verify_contribution(contribution_id: str, request: Request):
    """Mark a contribution as verified with admin notes."""
    body = await request.json()
    notes = body.get("notes", "")

    result = await db.intelligence_contributions.find_one_and_update(
        {"contribution_id": contribution_id, "status": "pending_verification"},
        {"$set": {
            "status": "verified",
            "admin_notes": notes,
            "verified_at": datetime.now(timezone.utc).isoformat(),
        }},
        return_document=False,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Contribution not found or not pending")

    return {"status": "verified", "contribution_id": contribution_id}


@router.patch("/{contribution_id}/reject")
async def reject_contribution(contribution_id: str, request: Request):
    """Reject a contribution with a reason."""
    body = await request.json()
    reason = body.get("reason", "")

    result = await db.intelligence_contributions.find_one_and_update(
        {"contribution_id": contribution_id, "status": {"$in": ["pending_verification", "verified"]}},
        {"$set": {
            "status": "rejected",
            "rejection_reason": reason,
            "rejected_at": datetime.now(timezone.utc).isoformat(),
        }},
        return_document=False,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Contribution not found or already terminal")

    return {"status": "rejected", "contribution_id": contribution_id}


@router.patch("/{contribution_id}/promote")
async def promote_contribution(contribution_id: str, request: Request):
    """
    Promote a verified contribution into the university knowledge base.
    Only works on 'verified' contributions.
    Writes the submitted data into the appropriate KB field with provenance.
    """
    body = await request.json()
    target_field = body.get("target_field")  # e.g. "scholarship_notes", "nil_signals"
    admin_notes = body.get("notes", "")

    contrib = await db.intelligence_contributions.find_one(
        {"contribution_id": contribution_id, "status": "verified"},
        {"_id": 0}
    )
    if not contrib:
        raise HTTPException(status_code=404, detail="Contribution not found or not verified")

    program_id = contrib["program_id"]
    card_type = contrib["card_type"]
    contrib_type = contrib["contribution_type"]
    data = contrib.get("data", "")

    # Determine target field if not explicitly provided
    if not target_field:
        target_field = _infer_target_field(card_type, contrib_type)

    if not target_field:
        raise HTTPException(status_code=400, detail="Cannot determine target field. Provide target_field explicitly.")

    now_iso = datetime.now(timezone.utc).isoformat()

    # Write into the university knowledge base
    program = await db.programs.find_one({"program_id": program_id}, {"_id": 0, "university_name": 1})
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")

    uni_name = program.get("university_name", "")

    # Update the university knowledge base
    kb_update = {
        target_field: data,
        f"{target_field}_last_updated": now_iso,
        f"{target_field}_source": "user_contribution",
        f"{target_field}_provenance": {
            "contribution_id": contribution_id,
            "promoted_at": now_iso,
            "admin_notes": admin_notes,
            "original_submitter": contrib.get("created_by"),
            "submitted_at": contrib.get("created_at"),
        },
    }

    await db.university_knowledge_base.update_one(
        {"name": {"$regex": f"^{uni_name}$", "$options": "i"}},
        {"$set": kb_update},
        upsert=False,
    )

    # Mark contribution as promoted
    await db.intelligence_contributions.update_one(
        {"contribution_id": contribution_id},
        {"$set": {
            "status": "promoted",
            "promoted_at": now_iso,
            "promoted_target_field": target_field,
            "promotion_notes": admin_notes,
        }},
    )

    # Invalidate intelligence cache for this program so next request gets fresh data
    await db.intelligence_cache.delete_many({"program_id": program_id})

    return {
        "status": "promoted",
        "contribution_id": contribution_id,
        "target_field": target_field,
        "cache_invalidated": True,
    }


def _infer_target_field(card_type: str, contrib_type: str) -> str | None:
    """Infer which KB field to write based on card type."""
    mapping = {
        "roster_stability": "roster_url",
        "timeline_intelligence": "commit_timing_signals",
        "scholarship_structure": "scholarship_notes",
        "nil_readiness": "nil_signals",
    }
    if contrib_type == "link":
        return mapping.get(card_type)
    if contrib_type == "upload":
        return mapping.get(card_type)
    return None
