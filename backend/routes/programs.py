from fastapi import APIRouter, HTTPException, Request
from typing import Optional
from datetime import datetime, timezone, timedelta
from database import db
from auth import get_current_user, get_tenant_id
from models import ProgramCreate, ProgramUpdate, CoachCreate, CoachUpdate, InteractionCreate, MarkFollowUpSent
import uuid

router = APIRouter(prefix="/api")


# ─── Dynamic Board Grouping Logic ───
CLOSED_STATUSES = ["Not a Fit / Closed", "Not Interested", "Committed"]

def categorize_program(program: dict) -> str:
    """
    Categorize a program into one of the 4 dynamic groups.
    Priority order: Closed > In Progress > Upcoming > Action Required (default)
    """
    now = datetime.now(timezone.utc)
    today = now.date()
    
    status = program.get("recruiting_status", "")
    reply_status = program.get("reply_status", "")
    next_action_due = program.get("next_action_due", "")
    initial_contact_sent = program.get("initial_contact_sent", "")
    last_follow_up = program.get("last_follow_up", "")
    
    # 1. CLOSED: Status is explicitly closed/committed
    if status in CLOSED_STATUSES:
        return "closed"
    
    # Parse dates for further logic
    due_date = None
    last_contact_date = None
    
    if next_action_due:
        try:
            due_date = datetime.strptime(next_action_due, "%Y-%m-%d").date()
        except ValueError:
            pass
    
    # Last contact is the more recent of initial_contact_sent or last_follow_up
    for date_str in [last_follow_up, initial_contact_sent]:
        if date_str:
            try:
                parsed = datetime.strptime(date_str, "%Y-%m-%d").date()
                if last_contact_date is None or parsed > last_contact_date:
                    last_contact_date = parsed
            except ValueError:
                pass
    
    # Calculate days since last contact
    days_since_contact = None
    if last_contact_date:
        days_since_contact = (today - last_contact_date).days
    
    # 2. IN PROGRESS: Recently contacted (within 7 days) OR has active conversation, AND nothing overdue
    is_recently_contacted = days_since_contact is not None and days_since_contact <= 7
    has_active_conversation = reply_status in ["Reply Received", "In Conversation"]
    is_overdue = due_date is not None and due_date < today
    
    if (is_recently_contacted or has_active_conversation) and not is_overdue:
        return "in_progress"
    
    # 3. UPCOMING: Has follow-up within next 14 days, but wasn't recently contacted
    if due_date is not None:
        days_until_due = (due_date - today).days
        if 0 <= days_until_due <= 14 and not is_recently_contacted:
            return "upcoming"
    
    # 4. ACTION REQUIRED: Default catch-all (overdue, needs response, stale, or no activity)
    return "action_required"


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


# ─── Journey Timeline ───

@router.get("/programs/{program_id}/journey")
async def get_program_journey(program_id: str, request: Request):
    """Get timeline of all interactions with a program"""
    from routes.gmail import get_gmail_credentials, get_gmail_service
    
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    
    program = await db.programs.find_one({"program_id": program_id, "tenant_id": tenant_id}, {"_id": 0})
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    
    timeline = []
    
    # 1. Get logged interactions
    interactions = await db.interactions.find(
        {"tenant_id": tenant_id, "program_id": program_id}, 
        {"_id": 0}
    ).to_list(100)
    
    for i in interactions:
        event_type = "interaction"
        if i.get("type") == "Email":
            event_type = "email_sent"
        elif i.get("type") == "Phone Call":
            event_type = "phone_call"
        elif i.get("type") == "Video Call":
            event_type = "video_call"
        
        timeline.append({
            "id": i.get("interaction_id"),
            "event_type": event_type,
            "title": f"{i.get('type', 'Interaction')} logged",
            "date": i.get("date_time") or i.get("created_at"),
            "content": i.get("notes") or i.get("message_copy"),
            "coach_name": "",
        })
    
    # 2. Get events linked to this program
    events = await db.events.find(
        {"tenant_id": tenant_id, "program_id": program_id},
        {"_id": 0}
    ).to_list(100)
    
    for e in events:
        event_type = "camp"
        if e.get("event_type") == "Visit":
            event_type = "visit"
        elif e.get("event_type") == "Showcase":
            event_type = "showcase"
        elif e.get("event_type") == "Meeting":
            event_type = "meeting"
        
        timeline.append({
            "id": e.get("event_id"),
            "event_type": event_type,
            "title": e.get("title"),
            "date": e.get("start_date"),
            "content": e.get("description"),
            "location": e.get("location"),
        })
    
    # 3. Get Gmail emails with coach (if Gmail connected)
    coaches = await db.coaches.find(
        {"tenant_id": tenant_id, "program_id": program_id, "email": {"$ne": ""}},
        {"_id": 0}
    ).to_list(50)
    
    coach_emails = {c.get("email", "").lower(): c.get("coach_name", "") for c in coaches if c.get("email")}
    
    if coach_emails:
        try:
            creds = await get_gmail_credentials(user["user_id"])
            if creds:
                service = get_gmail_service(creds)
                profile = service.users().getProfile(userId="me").execute()
                user_email = profile.get("emailAddress", "").lower()
                
                # Search for emails to/from coaches
                for coach_email, coach_name in coach_emails.items():
                    query = f"(from:{coach_email} OR to:{coach_email})"
                    results = service.users().messages().list(
                        userId="me",
                        q=query,
                        maxResults=30
                    ).execute()
                    
                    messages = results.get("messages", [])
                    
                    for msg_ref in messages:
                        msg = service.users().messages().get(
                            userId="me",
                            id=msg_ref["id"],
                            format="metadata",
                            metadataHeaders=["From", "To", "Subject", "Date"]
                        ).execute()
                        
                        headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}
                        from_addr = headers.get("From", "").lower()
                        subject = headers.get("Subject", "")
                        date_str = headers.get("Date", "")
                        
                        # Parse date
                        try:
                            from email.utils import parsedate_to_datetime
                            date_obj = parsedate_to_datetime(date_str)
                            date_iso = date_obj.isoformat()
                        except:
                            date_iso = datetime.now(timezone.utc).isoformat()
                        
                        # Determine if sent or received
                        is_from_coach = coach_email in from_addr
                        
                        # Get snippet for content
                        snippet = msg.get("snippet", "")
                        
                        timeline.append({
                            "id": f"gmail_{msg_ref['id']}",
                            "event_type": "email_received" if is_from_coach else "email_sent",
                            "title": f"{'Coach replied' if is_from_coach else 'You sent'}: {subject}",
                            "date": date_iso,
                            "content": snippet,
                            "coach_name": coach_name if is_from_coach else "",
                        })
        except Exception as e:
            # Gmail not connected or error - just continue without emails
            pass
    
    # Sort by date descending
    def parse_date(item):
        d = item.get("date", "")
        try:
            if "T" in d:
                dt = datetime.fromisoformat(d.replace("Z", "+00:00"))
            else:
                dt = datetime.strptime(d, "%Y-%m-%d")
            # Ensure timezone-aware for consistent comparison
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except:
            return datetime.min.replace(tzinfo=timezone.utc)
    
    timeline.sort(key=parse_date, reverse=True)
    
    return {"timeline": timeline}


@router.get("/recruiting-insights")
async def get_recruiting_insights(request: Request):
    """Compute data-driven recruiting insights from interactions and programs."""
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)

    interactions = await db.interactions.find(
        {"tenant_id": tenant_id}, {"_id": 0}
    ).to_list(500)

    programs = await db.programs.find(
        {"tenant_id": tenant_id}, {"_id": 0}
    ).to_list(200)

    insights = []

    # 1. Best day to contact — day of week with most positive outcomes
    day_positive = {}
    day_total = {}
    for i in interactions:
        dt_str = i.get("date_time") or i.get("created_at", "")
        try:
            dt = datetime.fromisoformat(str(dt_str).replace("Z", "+00:00"))
            day_name = dt.strftime("%A")
        except Exception:
            continue
        outcome = (i.get("outcome") or "").lower()
        day_total[day_name] = day_total.get(day_name, 0) + 1
        if "positive" in outcome or "response" in outcome:
            day_positive[day_name] = day_positive.get(day_name, 0) + 1

    if day_positive:
        best_day = max(day_positive, key=day_positive.get)
        count = day_positive[best_day]
        insights.append({
            "type": "best_day",
            "text": f"Your outreach on {best_day}s led to {count} positive response{'s' if count != 1 else ''} — try reaching out on {best_day}s",
            "icon": "calendar",
        })

    # 2. Average response time — time between sent and reply
    program_first_contact = {}
    program_first_reply = {}
    for i in interactions:
        pid = i.get("program_id", "")
        dt_str = i.get("date_time") or i.get("created_at", "")
        try:
            dt = datetime.fromisoformat(str(dt_str).replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
        except Exception:
            continue
        itype = (i.get("type") or "").lower()
        outcome = (i.get("outcome") or "").lower()
        if "email" in itype or "call" in itype or "message" in itype:
            if pid not in program_first_contact or dt < program_first_contact[pid]:
                program_first_contact[pid] = dt
        if "positive" in outcome or "response" in outcome:
            if pid not in program_first_reply or dt < program_first_reply[pid]:
                program_first_reply[pid] = dt

    response_times = []
    for pid, contact_dt in program_first_contact.items():
        if pid in program_first_reply and program_first_reply[pid] > contact_dt:
            diff = (program_first_reply[pid] - contact_dt).days
            if 0 < diff < 120:
                response_times.append(diff)

    if response_times:
        avg_days = round(sum(response_times) / len(response_times))
        insights.append({
            "type": "response_time",
            "text": f"Coaches typically respond within {avg_days} day{'s' if avg_days != 1 else ''} of your first outreach",
            "icon": "clock",
        })

    # 3. Most effective outreach type
    type_positive = {}
    type_total = {}
    for i in interactions:
        itype = i.get("type", "Other")
        outcome = (i.get("outcome") or "").lower()
        type_total[itype] = type_total.get(itype, 0) + 1
        if "positive" in outcome or "response" in outcome:
            type_positive[itype] = type_positive.get(itype, 0) + 1

    if type_positive and type_total:
        type_rates = {t: type_positive.get(t, 0) / type_total[t] for t in type_total if type_total[t] >= 2}
        if type_rates:
            best_type = max(type_rates, key=type_rates.get)
            rate = round(type_rates[best_type] * 100)
            insights.append({
                "type": "best_outreach",
                "text": f"{best_type}s have a {rate}% positive outcome rate — your most effective outreach method",
                "icon": "zap",
            })

    # 4. Follow-up success rate
    total_programs_with_followup = 0
    programs_with_reply = 0
    for p in programs:
        if p.get("recruiting_status") not in ("Not Contacted", None):
            total_programs_with_followup += 1
            if p.get("reply_status") in ("Reply Received", "In Conversation"):
                programs_with_reply += 1

    if total_programs_with_followup >= 2:
        rate = round(programs_with_reply / total_programs_with_followup * 100)
        insights.append({
            "type": "followup_rate",
            "text": f"{rate}% of schools you've contacted have responded — {'keep it up!' if rate >= 50 else 'persistence pays off, keep following up!'}",
            "icon": "target",
        })

    # 5. Activity streak / volume
    if len(interactions) >= 5:
        recent = [i for i in interactions if i.get("created_at")]
        if recent:
            try:
                dates = set()
                for i in recent:
                    dt = datetime.fromisoformat(str(i["created_at"]).replace("Z", "+00:00"))
                    dates.add(dt.date())
                active_days = len(dates)
                if active_days >= 3:
                    insights.append({
                        "type": "activity",
                        "text": f"You've been active on {active_days} different days — consistency is key in recruiting",
                        "icon": "activity",
                    })
            except Exception:
                pass

    return {"insights": insights}
