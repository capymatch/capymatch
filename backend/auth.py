from fastapi import HTTPException, Request
from datetime import datetime, timezone
from database import db
import uuid


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
