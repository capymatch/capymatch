from fastapi import FastAPI, APIRouter, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import httpx
from pathlib import Path
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ─── Pydantic Models ───

class ProgramCreate(BaseModel):
    university_name: str
    division: str = ""
    conference: str = ""
    region: str = ""
    website: str = ""
    program_interest: str = ""
    mascot: str = ""
    recruiting_status: str = "Not Contacted"
    reply_status: str = "No Reply"
    priority: str = "Medium"
    initial_contact_sent: str = ""
    last_follow_up: str = ""
    follow_up_days: int = 14
    next_action: str = ""
    next_action_due: str = ""
    scholarship_type: str = ""
    roster_needs: str = ""
    events_seen: str = ""
    video_link: str = ""
    coach_contract_expiration: str = ""
    notes: str = ""

class ProgramUpdate(BaseModel):
    university_name: Optional[str] = None
    division: Optional[str] = None
    conference: Optional[str] = None
    region: Optional[str] = None
    website: Optional[str] = None
    program_interest: Optional[str] = None
    mascot: Optional[str] = None
    recruiting_status: Optional[str] = None
    reply_status: Optional[str] = None
    priority: Optional[str] = None
    initial_contact_sent: Optional[str] = None
    last_follow_up: Optional[str] = None
    follow_up_days: Optional[int] = None
    next_action: Optional[str] = None
    next_action_due: Optional[str] = None
    scholarship_type: Optional[str] = None
    roster_needs: Optional[str] = None
    events_seen: Optional[str] = None
    video_link: Optional[str] = None
    coach_contract_expiration: Optional[str] = None
    notes: Optional[str] = None

class CoachCreate(BaseModel):
    program_id: str
    university_name: str = ""
    coach_name: str
    role: str = "Head Coach"
    email: str = ""
    phone: str = ""
    notes: str = ""

class CoachUpdate(BaseModel):
    coach_name: Optional[str] = None
    role: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None

class InteractionCreate(BaseModel):
    program_id: str
    university_name: str = ""
    coach_email: str = ""
    date_time: str = ""
    type: str = "Email"
    outcome: str = "No Response"
    notes: str = ""
    message_copy: str = ""
    links: str = ""

class MarkFollowUpSent(BaseModel):
    outcome: str = "No Response"
    reply_status: str = "No Reply"

# ─── Auth Helpers ───

async def get_current_user(request: Request):
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            session_token = auth_header[7:]
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def get_tenant_id(user):
    tenant = await db.tenants.find_one({"owner_user_id": user["user_id"]}, {"_id": 0})
    if not tenant:
        tenant_id = f"tenant_{uuid.uuid4().hex[:12]}"
        tenant = {
            "tenant_id": tenant_id,
            "athlete_name": user.get("name", "My Athlete"),
            "owner_user_id": user["user_id"],
            "plan": "free",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.tenants.insert_one(tenant)
        del tenant["_id"]
    return tenant["tenant_id"]

# ─── Automation Rules ───

def apply_automation_rules(existing, updates):
    """Apply server-side automation rules when program fields change."""
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

# ─── Auth Endpoints ───

@api_router.post("/auth/session")
async def exchange_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    async with httpx.AsyncClient() as hc:
        resp = await hc.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session_id")
    data = resp.json()
    email = data.get("email")
    name = data.get("name", "")
    picture = data.get("picture", "")
    ext_session_token = data.get("session_token", "")
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if user:
        user_id = user["user_id"]
        await db.users.update_one({"email": email}, {"$set": {"name": name, "picture": picture}})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user)
    session_token = ext_session_token or f"sess_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.user_sessions.insert_one({
        "session_token": session_token,
        "user_id": user_id,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    await get_tenant_id({"user_id": user_id, "name": name})
    response.set_cookie(
        key="session_token", value=session_token, httponly=True,
        secure=True, samesite="none", path="/", max_age=7*24*3600
    )
    return {"user_id": user_id, "email": email, "name": name, "picture": picture}

@api_router.get("/auth/me")
async def auth_me(request: Request):
    user = await get_current_user(request)
    return {k: v for k, v in user.items() if k != "_id"}

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})
    response.delete_cookie("session_token", path="/", secure=True, samesite="none")
    return {"ok": True}

# ─── Programs CRUD ───

@api_router.get("/programs")
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

@api_router.get("/programs/{program_id}")
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

@api_router.post("/programs")
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

@api_router.put("/programs/{program_id}")
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

@api_router.delete("/programs/{program_id}")
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

@api_router.get("/coaches")
async def list_coaches(request: Request, program_id: Optional[str] = None):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    query = {"tenant_id": tenant_id}
    if program_id:
        query["program_id"] = program_id
    coaches = await db.coaches.find(query, {"_id": 0}).to_list(500)
    return coaches

@api_router.post("/coaches")
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

@api_router.put("/coaches/{coach_id}")
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

@api_router.delete("/coaches/{coach_id}")
async def delete_coach(coach_id: str, request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    result = await db.coaches.delete_one({"coach_id": coach_id, "tenant_id": tenant_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Coach not found")
    return {"ok": True}

# ─── Interactions CRUD ───

@api_router.get("/interactions")
async def list_interactions(request: Request, program_id: Optional[str] = None):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    query = {"tenant_id": tenant_id}
    if program_id:
        query["program_id"] = program_id
    interactions = await db.interactions.find(query, {"_id": 0}).sort("date_time", -1).to_list(500)
    return interactions

@api_router.post("/interactions")
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

@api_router.get("/follow-ups")
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

@api_router.post("/follow-ups/{program_id}/mark-sent")
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

# ─── Dashboard ───

@api_router.get("/dashboard")
async def get_dashboard(request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    total = await db.programs.count_documents({"tenant_id": tenant_id})
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    follow_ups_due = await db.programs.count_documents({
        "tenant_id": tenant_id, "next_action_due": {"$ne": "", "$lte": today}
    })
    status_groups = {
        "Active - Not Contacted": ["Not Contacted"],
        "Contacted - Awaiting Reply": ["Contacted", "No Response Yet", "Video Viewed"],
        "Active Conversations": ["Some Interest", "Active Conversation"],
        "Offers / Serious Interest": ["Offer / Commit Talk"],
        "Closed / Archived": ["Not a Fit / Closed"]
    }
    status_counts = {}
    for group_name, statuses in status_groups.items():
        count = await db.programs.count_documents({"tenant_id": tenant_id, "recruiting_status": {"$in": statuses}})
        status_counts[group_name] = count
    recent_interactions = await db.interactions.find(
        {"tenant_id": tenant_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(10)
    tenant = await db.tenants.find_one({"tenant_id": tenant_id}, {"_id": 0})
    return {
        "total_schools": total,
        "follow_ups_due": follow_ups_due,
        "status_counts": status_counts,
        "recent_interactions": recent_interactions,
        "athlete_name": tenant.get("athlete_name", "") if tenant else ""
    }

# ─── University Knowledge Base ───

@api_router.get("/knowledge-base")
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

@api_router.post("/knowledge-base/add-to-board")
async def add_to_board(request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
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
        "mascot": uni.get("mascot", ""),
        "program_interest": "",
        "recruiting_status": "Not Contacted",
        "reply_status": "No Reply",
        "priority": "Medium",
        "initial_contact_sent": "",
        "last_follow_up": "",
        "follow_up_days": 14,
        "next_action": "",
        "next_action_due": "",
        "scholarship_type": "",
        "roster_needs": "",
        "events_seen": "",
        "video_link": "",
        "coach_contract_expiration": "",
        "notes": uni.get("notes", ""),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.programs.insert_one(doc)
    doc.pop("_id", None)
    return doc

# ─── Tenant Settings ───

@api_router.get("/tenant")
async def get_tenant(request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    tenant = await db.tenants.find_one({"tenant_id": tenant_id}, {"_id": 0})
    return tenant

@api_router.put("/tenant")
async def update_tenant(request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    body = await request.json()
    allowed = {"athlete_name"}
    updates = {k: v for k, v in body.items() if k in allowed}
    if updates:
        await db.tenants.update_one({"tenant_id": tenant_id}, {"$set": updates})
    tenant = await db.tenants.find_one({"tenant_id": tenant_id}, {"_id": 0})
    return tenant

# ─── Seed Data ───

@api_router.post("/seed")
async def seed_data():
    count = await db.university_knowledge_base.count_documents({})
    if count > 0:
        return {"message": f"Knowledge base already has {count} universities", "seeded": False}
    universities = [
        {"university_name": "University of Nebraska", "division": "D1", "conference": "Big Ten", "region": "Midwest", "website": "https://huskers.com", "mascot": "Cornhuskers", "notes": "Top D1 volleyball program"},
        {"university_name": "Stanford University", "division": "D1", "conference": "Pac-12", "region": "West", "website": "https://gostanford.com", "mascot": "Cardinal", "notes": ""},
        {"university_name": "University of Texas", "division": "D1", "conference": "Big 12", "region": "South Central", "website": "https://texassports.com", "mascot": "Longhorns", "notes": ""},
        {"university_name": "Penn State University", "division": "D1", "conference": "Big Ten", "region": "East", "website": "https://gopsusports.com", "mascot": "Nittany Lions", "notes": ""},
        {"university_name": "University of Wisconsin", "division": "D1", "conference": "Big Ten", "region": "Midwest", "website": "https://uwbadgers.com", "mascot": "Badgers", "notes": ""},
        {"university_name": "University of Minnesota", "division": "D1", "conference": "Big Ten", "region": "Midwest", "website": "https://gophersports.com", "mascot": "Golden Gophers", "notes": ""},
        {"university_name": "University of Pittsburgh", "division": "D1", "conference": "ACC", "region": "East", "website": "https://pittsburghpanthers.com", "mascot": "Panthers", "notes": ""},
        {"university_name": "Baylor University", "division": "D1", "conference": "Big 12", "region": "South Central", "website": "https://baylorbears.com", "mascot": "Bears", "notes": ""},
        {"university_name": "University of Louisville", "division": "D1", "conference": "ACC", "region": "Southeast", "website": "https://gocards.com", "mascot": "Cardinals", "notes": ""},
        {"university_name": "University of Florida", "division": "D1", "conference": "SEC", "region": "Southeast", "website": "https://floridagators.com", "mascot": "Gators", "notes": ""},
        {"university_name": "Ohio State University", "division": "D1", "conference": "Big Ten", "region": "Midwest", "website": "https://ohiostatebuckeyes.com", "mascot": "Buckeyes", "notes": ""},
        {"university_name": "University of Kentucky", "division": "D1", "conference": "SEC", "region": "Southeast", "website": "https://ukathletics.com", "mascot": "Wildcats", "notes": ""},
        {"university_name": "Purdue University", "division": "D1", "conference": "Big Ten", "region": "Midwest", "website": "https://purduesports.com", "mascot": "Boilermakers", "notes": ""},
        {"university_name": "Creighton University", "division": "D1", "conference": "Big East", "region": "Midwest", "website": "https://gocreighton.com", "mascot": "Bluejays", "notes": ""},
        {"university_name": "University of Washington", "division": "D1", "conference": "Pac-12", "region": "West", "website": "https://gohuskies.com", "mascot": "Huskies", "notes": ""},
        {"university_name": "BYU", "division": "D1", "conference": "Big 12", "region": "West", "website": "https://byucougars.com", "mascot": "Cougars", "notes": ""},
        {"university_name": "University of Southern California", "division": "D1", "conference": "Big Ten", "region": "West", "website": "https://usctrojans.com", "mascot": "Trojans", "notes": ""},
        {"university_name": "Florida State University", "division": "D1", "conference": "ACC", "region": "Southeast", "website": "https://seminoles.com", "mascot": "Seminoles", "notes": ""},
        {"university_name": "University of Georgia", "division": "D1", "conference": "SEC", "region": "Southeast", "website": "https://georgiadogs.com", "mascot": "Bulldogs", "notes": ""},
        {"university_name": "Michigan State University", "division": "D1", "conference": "Big Ten", "region": "Midwest", "website": "https://msuspartans.com", "mascot": "Spartans", "notes": ""},
        # D2
        {"university_name": "University of Tampa", "division": "D2", "conference": "Sunshine State", "region": "Southeast", "website": "https://tampaspartans.com", "mascot": "Spartans", "notes": ""},
        {"university_name": "Concordia-St. Paul", "division": "D2", "conference": "NSIC", "region": "Midwest", "website": "https://cusp.edu", "mascot": "Golden Bears", "notes": ""},
        {"university_name": "University of Nebraska-Kearney", "division": "D2", "conference": "MIAA", "region": "Midwest", "website": "https://unklopers.com", "mascot": "Lopers", "notes": ""},
        {"university_name": "Minnesota Duluth", "division": "D2", "conference": "NSIC", "region": "Midwest", "website": "https://umdbulldogs.com", "mascot": "Bulldogs", "notes": ""},
        {"university_name": "Southwest Minnesota State", "division": "D2", "conference": "NSIC", "region": "Midwest", "website": "https://smsumustangs.com", "mascot": "Mustangs", "notes": ""},
        {"university_name": "Regis University", "division": "D2", "conference": "RMAC", "region": "West", "website": "https://regisrangers.com", "mascot": "Rangers", "notes": ""},
        {"university_name": "Washburn University", "division": "D2", "conference": "MIAA", "region": "Midwest", "website": "https://wusports.com", "mascot": "Ichabods", "notes": ""},
        {"university_name": "Lewis University", "division": "D2", "conference": "GLVC", "region": "Midwest", "website": "https://lewisflyers.com", "mascot": "Flyers", "notes": ""},
        {"university_name": "Cal State San Bernardino", "division": "D2", "conference": "CCAA", "region": "West", "website": "https://csusbathletics.com", "mascot": "Coyotes", "notes": ""},
        {"university_name": "Wingate University", "division": "D2", "conference": "SAC", "region": "Southeast", "website": "https://wingatebulldogs.com", "mascot": "Bulldogs", "notes": ""},
        # D3
        {"university_name": "Calvin University", "division": "D3", "conference": "MIAA", "region": "Midwest", "website": "https://calvinknights.com", "mascot": "Knights", "notes": ""},
        {"university_name": "Claremont-Mudd-Scripps", "division": "D3", "conference": "SCIAC", "region": "West", "website": "https://cmsathletics.com", "mascot": "Stags/Athenas", "notes": ""},
        {"university_name": "Emory University", "division": "D3", "conference": "UAA", "region": "Southeast", "website": "https://emoryathletics.com", "mascot": "Eagles", "notes": ""},
        {"university_name": "Juniata College", "division": "D3", "conference": "Landmark", "region": "East", "website": "https://juniataeagles.com", "mascot": "Eagles", "notes": ""},
        {"university_name": "Trinity University", "division": "D3", "conference": "SCAC", "region": "South Central", "website": "https://trinitytigers.com", "mascot": "Tigers", "notes": ""},
        {"university_name": "Wittenberg University", "division": "D3", "conference": "NCAC", "region": "Midwest", "website": "https://wittenbergtigers.com", "mascot": "Tigers", "notes": ""},
        {"university_name": "Hope College", "division": "D3", "conference": "MIAA", "region": "Midwest", "website": "https://hopeathletics.com", "mascot": "Flying Dutch", "notes": ""},
        {"university_name": "Washington University in St. Louis", "division": "D3", "conference": "UAA", "region": "Midwest", "website": "https://wustlbears.com", "mascot": "Bears", "notes": ""},
        {"university_name": "Johns Hopkins University", "division": "D3", "conference": "Centennial", "region": "East", "website": "https://hopkinssports.com", "mascot": "Blue Jays", "notes": ""},
        {"university_name": "MIT", "division": "D3", "conference": "NEWMAC", "region": "Northeast", "website": "https://mitathletics.com", "mascot": "Engineers", "notes": ""},
        {"university_name": "Berry College", "division": "D3", "conference": "SAA", "region": "Southeast", "website": "https://berryathletics.com", "mascot": "Vikings", "notes": ""},
        {"university_name": "Pomona-Pitzer Colleges", "division": "D3", "conference": "SCIAC", "region": "West", "website": "https://sagehens.com", "mascot": "Sagehens", "notes": ""},
        {"university_name": "Tufts University", "division": "D3", "conference": "NESCAC", "region": "Northeast", "website": "https://tuftsjumbos.com", "mascot": "Jumbos", "notes": ""},
        {"university_name": "University of Chicago", "division": "D3", "conference": "UAA", "region": "Midwest", "website": "https://uchicagoathletics.com", "mascot": "Maroons", "notes": ""},
        {"university_name": "Bowdoin College", "division": "D3", "conference": "NESCAC", "region": "Northeast", "website": "https://bowdoinbears.com", "mascot": "Polar Bears", "notes": ""},
    ]
    await db.university_knowledge_base.insert_many(universities)
    return {"message": f"Seeded {len(universities)} universities", "seeded": True}

@api_router.get("/")
async def root():
    return {"message": "Volleyball Recruiting CRM API"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    # Auto-seed knowledge base
    count = await db.university_knowledge_base.count_documents({})
    if count == 0:
        logger.info("Seeding university knowledge base...")
        async with httpx.AsyncClient() as hc:
            try:
                await hc.post("http://localhost:8001/api/seed")
            except Exception:
                pass

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
