from fastapi import HTTPException, Request
from datetime import datetime, timezone
from database import db
import uuid


async def get_current_user(request: Request):
    """Authenticate user via session cookie."""
    session_token = request.cookies.get("session_token")
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    session = await db.user_sessions.find_one(
        {"session_token": session_token}, {"_id": 0}
    )
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    if datetime.fromisoformat(session["expires_at"]) < datetime.now(timezone.utc):
        await db.user_sessions.delete_many({"session_token": session_token})
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one(
        {"user_id": session["user_id"]}, {"_id": 0}
    )
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def get_tenant_id(user):
    tenant = await db.tenants.find_one({"owner_user_id": user["user_id"]}, {"_id": 0})
    if not tenant:
        tenant_id = f"tenant_{user['user_id']}"
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
