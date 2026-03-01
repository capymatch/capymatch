from fastapi import APIRouter, Request, UploadFile, File
from database import db
from auth import get_current_user, get_tenant_id
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger("schedule")
router = APIRouter(prefix="/api")


@router.get("/schedule")
async def get_schedule(request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    events = await db.schedule_events.find(
        {"tenant_id": tenant_id}, {"_id": 0}
    ).sort("start_date", 1).to_list(200)
    return {"events": events}


@router.post("/schedule")
async def add_event(request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    body = await request.json()
    event = {
        "event_id": f"evt_{uuid.uuid4().hex[:12]}",
        "tenant_id": tenant_id,
        "name": body.get("name", ""),
        "start_date": body.get("start_date", ""),
        "end_date": body.get("end_date", ""),
        "location": body.get("location", ""),
        "division": body.get("division", ""),
        "jersey_number": body.get("jersey_number", ""),
        "notes": body.get("notes", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.schedule_events.insert_one(event)
    event.pop("_id", None)
    return event


@router.put("/schedule/{event_id}")
async def update_event(event_id: str, request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    body = await request.json()
    updates = {}
    for field in ["name", "start_date", "end_date", "location", "division", "jersey_number", "notes"]:
        if field in body:
            updates[field] = body[field]
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.schedule_events.update_one(
        {"event_id": event_id, "tenant_id": tenant_id}, {"$set": updates}
    )
    return {"ok": True}


@router.delete("/schedule/{event_id}")
async def delete_event(event_id: str, request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    await db.schedule_events.delete_one({"event_id": event_id, "tenant_id": tenant_id})
    return {"ok": True}


@router.post("/schedule/bulk")
async def bulk_add_events(request: Request):
    """Add multiple events at once (from AI parse or manual)."""
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    body = await request.json()
    events = body.get("events", [])
    created = []
    for e in events:
        event = {
            "event_id": f"evt_{uuid.uuid4().hex[:12]}",
            "tenant_id": tenant_id,
            "name": e.get("name", ""),
            "start_date": e.get("start_date", ""),
            "end_date": e.get("end_date", ""),
            "location": e.get("location", ""),
            "division": e.get("division", ""),
            "jersey_number": e.get("jersey_number", ""),
            "notes": e.get("notes", ""),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.schedule_events.insert_one(event)
        event.pop("_id", None)
        created.append(event)
    return {"created": len(created), "events": created}


@router.post("/schedule/parse")
async def parse_schedule(request: Request):
    """AI-powered schedule parsing from uploaded file content."""
    user = await get_current_user(request)
    body = await request.json()
    file_text = body.get("text", "")

    if not file_text:
        return {"events": [], "error": "No text provided"}

    from emergentintegrations.llm.chat import LlmChat, UserMessage
    import os, json

    prompt = f"""You are a schedule parser. Extract all tournament/event data from the text below.
Return ONLY a JSON array of objects, each with these fields:
- "name": tournament/event name (string)
- "start_date": start date in YYYY-MM-DD format (string, use 2026 if no year specified)
- "end_date": end date in YYYY-MM-DD format (string, same as start_date if single day)
- "location": city and state (string)
- "division": division/age group if mentioned (string, empty if not mentioned)

Be precise with dates. If a date range like "January 3rd & 4th" is given, start_date=2026-01-03, end_date=2026-01-04.
If "TBA" for dates, use empty string for start_date and end_date.
Return ONLY the JSON array, no markdown, no explanation.

TEXT:
{file_text}"""

    try:
        chat = LlmChat(
            api_key=os.environ.get("EMERGENT_LLM_KEY"),
            session_id=f"schedule_parse_{uuid.uuid4().hex[:8]}",
            system_message="You are a schedule parser. Extract structured event data from text. Return ONLY valid JSON.",
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")

        response = await chat.send_message(UserMessage(text=prompt))
        text = (response.text if hasattr(response, "text") else str(response)).strip()
        # Strip markdown code fences if present
        if text.startswith("```"):
            text = text.split("\n", 1)[1]
            text = text.rsplit("```", 1)[0]
        events = json.loads(text)
        return {"events": events}
    except Exception as e:
        logger.error(f"Schedule parse error: {e}")
        return {"events": [], "error": str(e)}
