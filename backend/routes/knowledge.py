from fastapi import APIRouter, HTTPException, Request
from typing import Optional
from datetime import datetime, timezone
from database import db
from auth import get_current_user, get_tenant_id
from subscriptions import get_user_subscription, enforce_school_limit
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")


@router.get("/knowledge-base")
async def list_knowledge_base(division: Optional[str] = None, conference: Optional[str] = None, region: Optional[str] = None, search: Optional[str] = None):
    query = {}
    if division:
        query["division"] = division
    if conference:
        query["conference"] = {"$regex": conference, "$options": "i"}
    if region:
        query["region"] = {"$regex": region, "$options": "i"}
    if search:
        query["university_name"] = {"$regex": search, "$options": "i"}
    universities = await db.university_knowledge_base.find(query, {"_id": 0}).sort("university_name", 1).to_list(2000)
    return universities


@router.post("/knowledge-base/add-to-board")
async def add_to_board(request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    # Enforce subscription school limit
    subscription = await get_user_subscription(tenant_id)
    await enforce_school_limit(tenant_id, subscription)
    body = await request.json()
    uni_name = body.get("university_name")
    if not uni_name:
        raise HTTPException(status_code=400, detail="university_name required")
    uni = await db.university_knowledge_base.find_one({"university_name": uni_name}, {"_id": 0})
    if not uni:
        raise HTTPException(status_code=404, detail="University not found in knowledge base")
    existing = await db.programs.find_one({"tenant_id": tenant_id, "university_name": uni_name}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="University already on your board")
    program_id = f"prog_{uuid.uuid4().hex[:12]}"
    doc = {
        "program_id": program_id,
        "tenant_id": tenant_id,
        "university_name": uni.get("university_name", ""),
        "division": uni.get("division", ""),
        "conference": uni.get("conference", ""),
        "region": uni.get("region", ""),
        "website": uni.get("website", ""),
        "domain": uni.get("domain", ""),
        "mascot": uni.get("mascot", ""),
        "primary_coach": uni.get("primary_coach", ""),
        "coach_email": uni.get("coach_email", ""),
        "recruiting_coordinator": uni.get("recruiting_coordinator", ""),
        "coordinator_email": uni.get("coordinator_email", ""),
        "program_interest": "",
        "recruiting_status": "Not Contacted",
        "reply_status": "No Reply",
        "priority": "Medium",
        "initial_contact_sent": "",
        "last_follow_up": "",
        "follow_up_days": 14,
        "next_action": "",
        "next_action_due": "",
        "scholarship_type": uni.get("scholarship_type", ""),
        "roster_needs": uni.get("roster_needs", ""),
        "events_seen": "",
        "video_link": "",
        "coach_contract_expiration": "",
        "notes": "",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.programs.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.get("/knowledge-base/filters")
async def get_filters():
    """Return distinct conferences and regions from the knowledge base."""
    conferences = await db.university_knowledge_base.distinct("conference")
    regions = await db.university_knowledge_base.distinct("region")
    conferences = sorted([c for c in conferences if c])
    regions = sorted([r for r in regions if r])
    return {"conferences": conferences, "regions": regions}
