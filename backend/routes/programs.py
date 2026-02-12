from fastapi import APIRouter, HTTPException, Request
from typing import Optional
from datetime import datetime, timezone, timedelta
from database import db
from auth import get_current_user, get_tenant_id
from models import ProgramCreate, ProgramUpdate, CoachCreate, CoachUpdate, InteractionCreate, MarkFollowUpSent
import uuid

router = APIRouter(prefix="/api")


def apply_automation_rules(existing, updates):
    old_status = existing.get("recruiting_status", "")
    new_status = updates.get("recruiting_status", old_status)
    old_reply = existing.get("reply_status", "")
    new_reply = updates.get("reply_status", old_reply)
    old_contact = existing.get("initial_contact_sent", "")
    new_contact = updates.get("initial_contact_sent", old_contact)
    follow_up_days = updates.get("follow_up_days", existing.get("follow_up_days", 14))

    if old_status != new_status and new_status == "Contacted":
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        updates["initial_contact_sent"] = today
        new_contact = today

    if old_reply != new_reply and new_reply == "Reply Received":
        updates["priority"] = "Very High"

    if old_contact != new_contact and new_contact:
        try:
            contact_date = datetime.strptime(new_contact, "%Y-%m-%d")
            due_date = contact_date + timedelta(days=follow_up_days)
            updates["next_action_due"] = due_date.strftime("%Y-%m-%d")
        except ValueError:
            pass

    return updates


# ─── Programs CRUD ───

@router.get("/programs")
async def list_programs(request: Request, recruiting_status: Optional[str] = None, division: Optional[str] = None, region: Optional[str] = None, priority: Optional[str] = None, search: Optional[str] = None):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    query = {"tenant_id": tenant_id}
    if recruiting_status:
        query["recruiting_status"] = recruiting_status
    if division:
        query["division"] = division
    if region:
        query["region"] = region
    if priority:
        query["priority"] = priority
    if search:
        query["university_name"] = {"$regex": search, "$options": "i"}
    programs = await db.programs.find(query, {"_id": 0}).to_list(1000)
    for p in programs:
        coaches = await db.coaches.find({"tenant_id": tenant_id, "program_id": p["program_id"]}, {"_id": 0}).to_list(50)
        primary_coach = next((c for c in coaches if c.get("role") == "Head Coach"), coaches[0] if coaches else None)
        coordinator = next((c for c in coaches if c.get("role") == "Recruiting Coordinator"), None)
        p["primary_coach"] = primary_coach.get("coach_name", "") if primary_coach else ""
        p["coach_email"] = primary_coach.get("email", "") if primary_coach else ""
        p["recruiting_coordinator"] = coordinator.get("coach_name", "") if coordinator else ""
        p["coordinator_email"] = coordinator.get("email", "") if coordinator else ""
    return programs


@router.get("/programs/{program_id}")
async def get_program(program_id: str, request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    program = await db.programs.find_one({"program_id": program_id, "tenant_id": tenant_id}, {"_id": 0})
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    coaches = await db.coaches.find({"tenant_id": tenant_id, "program_id": program_id}, {"_id": 0}).to_list(50)
    interactions = await db.interactions.find({"tenant_id": tenant_id, "program_id": program_id}, {"_id": 0}).sort("date_time", -1).to_list(100)
    program["coaches"] = coaches
    program["interactions"] = interactions
    return program


@router.post("/programs")
async def create_program(data: ProgramCreate, request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    existing = await db.programs.find_one({"tenant_id": tenant_id, "university_name": data.university_name}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="University already on your board")
    program_id = f"prog_{uuid.uuid4().hex[:12]}"
    doc = data.model_dump()
    doc["program_id"] = program_id
    doc["tenant_id"] = tenant_id
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.programs.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/programs/{program_id}")
async def update_program(program_id: str, data: ProgramUpdate, request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    existing = await db.programs.find_one({"program_id": program_id, "tenant_id": tenant_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Program not found")
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if not updates:
        return existing
    updates = apply_automation_rules(existing, updates)
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.programs.update_one({"program_id": program_id, "tenant_id": tenant_id}, {"$set": updates})
    updated = await db.programs.find_one({"program_id": program_id, "tenant_id": tenant_id}, {"_id": 0})
    return updated


@router.delete("/programs/{program_id}")
async def delete_program(program_id: str, request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    result = await db.programs.delete_one({"program_id": program_id, "tenant_id": tenant_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Program not found")
    await db.coaches.delete_many({"program_id": program_id, "tenant_id": tenant_id})
    await db.interactions.delete_many({"program_id": program_id, "tenant_id": tenant_id})
    return {"ok": True}


# ─── Coaches CRUD ───

@router.get("/coaches")
async def list_coaches(request: Request, program_id: Optional[str] = None):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    query = {"tenant_id": tenant_id}
    if program_id:
        query["program_id"] = program_id
    coaches = await db.coaches.find(query, {"_id": 0}).to_list(500)
    return coaches


@router.post("/coaches")
async def create_coach(data: CoachCreate, request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    program = await db.programs.find_one({"program_id": data.program_id, "tenant_id": tenant_id}, {"_id": 0})
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    coach_id = f"coach_{uuid.uuid4().hex[:12]}"
    doc = data.model_dump()
    doc["coach_id"] = coach_id
    doc["tenant_id"] = tenant_id
    doc["university_name"] = program["university_name"]
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.coaches.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/coaches/{coach_id}")
async def update_coach(coach_id: str, data: CoachUpdate, request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    await db.coaches.update_one({"coach_id": coach_id, "tenant_id": tenant_id}, {"$set": updates})
    updated = await db.coaches.find_one({"coach_id": coach_id, "tenant_id": tenant_id}, {"_id": 0})
    if not updated:
        raise HTTPException(status_code=404, detail="Coach not found")
    return updated


@router.delete("/coaches/{coach_id}")
async def delete_coach(coach_id: str, request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    result = await db.coaches.delete_one({"coach_id": coach_id, "tenant_id": tenant_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Coach not found")
    return {"ok": True}


# ─── Interactions CRUD ───

@router.get("/interactions")
async def list_interactions(request: Request, program_id: Optional[str] = None):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    query = {"tenant_id": tenant_id}
    if program_id:
        query["program_id"] = program_id
    interactions = await db.interactions.find(query, {"_id": 0}).sort("date_time", -1).to_list(500)
    return interactions


@router.post("/interactions")
async def create_interaction(data: InteractionCreate, request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    program = await db.programs.find_one({"program_id": data.program_id, "tenant_id": tenant_id}, {"_id": 0})
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    interaction_id = f"int_{uuid.uuid4().hex[:12]}"
    doc = data.model_dump()
    doc["interaction_id"] = interaction_id
    doc["tenant_id"] = tenant_id
    doc["university_name"] = program["university_name"]
    if not doc["date_time"]:
        doc["date_time"] = datetime.now(timezone.utc).isoformat()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.interactions.insert_one(doc)
    doc.pop("_id", None)
    return doc


# ─── Follow-Ups ───

@router.get("/follow-ups")
async def list_follow_ups(request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    programs = await db.programs.find({
        "tenant_id": tenant_id,
        "next_action_due": {"$ne": "", "$lte": today}
    }, {"_id": 0}).sort("next_action_due", 1).to_list(200)
    for p in programs:
        coaches = await db.coaches.find({"tenant_id": tenant_id, "program_id": p["program_id"]}, {"_id": 0}).to_list(10)
        primary_coach = next((c for c in coaches if c.get("role") == "Head Coach"), coaches[0] if coaches else None)
        p["primary_coach"] = primary_coach.get("coach_name", "") if primary_coach else ""
        p["coach_email"] = primary_coach.get("email", "") if primary_coach else ""
    return programs


@router.post("/follow-ups/{program_id}/mark-sent")
async def mark_follow_up_sent(program_id: str, data: MarkFollowUpSent, request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    program = await db.programs.find_one({"program_id": program_id, "tenant_id": tenant_id}, {"_id": 0})
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    follow_up_days = program.get("follow_up_days", 14)
    next_due = (datetime.now(timezone.utc) + timedelta(days=follow_up_days)).strftime("%Y-%m-%d")
    updates = {
        "last_follow_up": today,
        "next_action_due": next_due,
        "reply_status": data.reply_status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.programs.update_one({"program_id": program_id, "tenant_id": tenant_id}, {"$set": updates})
    interaction_doc = {
        "interaction_id": f"int_{uuid.uuid4().hex[:12]}",
        "tenant_id": tenant_id,
        "program_id": program_id,
        "university_name": program.get("university_name", ""),
        "coach_email": "",
        "date_time": datetime.now(timezone.utc).isoformat(),
        "type": "Follow Up",
        "outcome": data.outcome,
        "notes": f"Follow-up marked sent on {today}",
        "message_copy": "",
        "links": "",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.interactions.insert_one(interaction_doc)
    updated = await db.programs.find_one({"program_id": program_id, "tenant_id": tenant_id}, {"_id": 0})
    return updated
