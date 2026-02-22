"""
Intelligence Contribution API — User-submitted data for intelligence cards.

All contributions are stored as "pending_verification" and do NOT
immediately affect intelligence outputs. An admin must verify and
promote the data to a trusted source before it enters the pipeline.
"""

import os
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form
from database import db
from routes.auth_routes import get_current_user, get_tenant_id

router = APIRouter(prefix="/api/intelligence")

UPLOAD_DIR = "/app/backend/uploads/contributions"
ALLOWED_EXTENSIONS = {".csv", ".png", ".jpg", ".jpeg", ".pdf", ".xlsx"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/contribute")
async def submit_contribution(request: Request):
    """Submit a link or request contribution for an intelligence card."""
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    body = await request.json()

    program_id = body.get("program_id")
    card_type = body.get("card_type")
    contribution_type = body.get("contribution_type")
    data = body.get("data", "")

    if not program_id or not card_type or not contribution_type:
        raise HTTPException(status_code=400, detail="Missing required fields")

    if contribution_type not in ("link", "request"):
        raise HTTPException(status_code=400, detail="Invalid contribution type")

    if contribution_type == "link" and not data.strip():
        raise HTTPException(status_code=400, detail="URL is required for link contributions")

    doc = {
        "contribution_id": f"contrib_{uuid.uuid4().hex[:12]}",
        "program_id": program_id,
        "tenant_id": tenant_id,
        "card_type": card_type,
        "contribution_type": contribution_type,
        "data": data.strip(),
        "file_path": None,
        "status": "pending_verification",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["user_id"],
        "verified_at": None,
        "verified_by": None,
    }

    await db.intelligence_contributions.insert_one(doc)

    return {
        "contribution_id": doc["contribution_id"],
        "status": "pending_verification",
        "message": "Thank you! Your contribution has been submitted for review.",
    }


@router.post("/contribute/upload")
async def upload_contribution(
    request: Request,
    file: UploadFile = File(...),
    program_id: str = Form(...),
    card_type: str = Form(...),
):
    """Upload a file contribution (CSV, screenshot, etc.)."""
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type {ext} not allowed")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 10 MB limit")

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_id = uuid.uuid4().hex[:12]
    filename = f"{file_id}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(content)

    doc = {
        "contribution_id": f"contrib_{file_id}",
        "program_id": program_id,
        "tenant_id": tenant_id,
        "card_type": card_type,
        "contribution_type": "upload",
        "data": file.filename,
        "file_path": filepath,
        "status": "pending_verification",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["user_id"],
        "verified_at": None,
        "verified_by": None,
    }

    await db.intelligence_contributions.insert_one(doc)

    return {
        "contribution_id": doc["contribution_id"],
        "status": "pending_verification",
        "message": "File uploaded and submitted for review.",
    }
