from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone
from database import db
from auth import get_current_user, get_tenant_id
from models import NoteCreate, NoteUpdate
import uuid

router = APIRouter(prefix="/api")


@router.get("/programs/{program_id}/notes")
async def list_notes(program_id: str, request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    notes = await db.notes.find(
        {"tenant_id": tenant_id, "program_id": program_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    # Pinned first, then by date
    pinned = [n for n in notes if n.get("is_pinned")]
    unpinned = [n for n in notes if not n.get("is_pinned")]
    return {"pinned": pinned, "recent": unpinned}


@router.post("/programs/{program_id}/notes")
async def create_note(program_id: str, data: NoteCreate, request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    program = await db.programs.find_one(
        {"program_id": program_id, "tenant_id": tenant_id}, {"_id": 0}
    )
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    if not data.content.strip():
        raise HTTPException(status_code=400, detail="Note content is required")
    note_id = f"note_{uuid.uuid4().hex[:12]}"
    doc = {
        "note_id": note_id,
        "tenant_id": tenant_id,
        "program_id": program_id,
        "content": data.content.strip(),
        "is_pinned": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.notes.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/notes/{note_id}")
async def update_note(note_id: str, data: NoteUpdate, request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    existing = await db.notes.find_one(
        {"note_id": note_id, "tenant_id": tenant_id}, {"_id": 0}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Note not found")
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if not updates:
        return existing
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.notes.update_one(
        {"note_id": note_id, "tenant_id": tenant_id}, {"$set": updates}
    )
    updated = await db.notes.find_one(
        {"note_id": note_id, "tenant_id": tenant_id}, {"_id": 0}
    )
    return updated


@router.delete("/notes/{note_id}")
async def delete_note(note_id: str, request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    result = await db.notes.delete_one(
        {"note_id": note_id, "tenant_id": tenant_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    return {"ok": True}
