from fastapi import APIRouter, HTTPException, Request
from typing import Optional
from datetime import datetime, timezone
from database import db
from auth import get_current_user, get_tenant_id
from models import EventCreate, EventUpdate
import uuid

router = APIRouter(prefix="/api")


@router.get("/events")
async def list_events(request: Request, start_date: Optional[str] = None, end_date: Optional[str] = None):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    query = {"tenant_id": tenant_id}
    if start_date and end_date:
        query["start_date"] = {"$gte": start_date, "$lte": end_date}
    elif start_date:
        query["start_date"] = {"$gte": start_date}
    events = await db.events.find(query, {"_id": 0}).sort("start_date", 1).to_list(500)
    return events


@router.get("/events/{event_id}")
async def get_event(event_id: str, request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    event = await db.events.find_one({"event_id": event_id, "tenant_id": tenant_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.post("/events")
async def create_event(data: EventCreate, request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    if not data.title.strip():
        raise HTTPException(status_code=400, detail="Title is required")
    event_id = f"evt_{uuid.uuid4().hex[:12]}"
    doc = data.model_dump()
    doc["event_id"] = event_id
    doc["tenant_id"] = tenant_id
    doc["user_id"] = user["user_id"]
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.events.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/events/{event_id}")
async def update_event(event_id: str, data: EventUpdate, request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    existing = await db.events.find_one({"event_id": event_id, "tenant_id": tenant_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Event not found")
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if not updates:
        return existing
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.events.update_one({"event_id": event_id, "tenant_id": tenant_id}, {"$set": updates})
    updated = await db.events.find_one({"event_id": event_id, "tenant_id": tenant_id}, {"_id": 0})
    return updated


@router.delete("/events/{event_id}")
async def delete_event(event_id: str, request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    result = await db.events.delete_one({"event_id": event_id, "tenant_id": tenant_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"ok": True}
