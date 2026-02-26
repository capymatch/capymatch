from fastapi import HTTPException, Request
from datetime import datetime, timezone, timedelta
from database import db
import uuid


async def get_current_user(request: Request):
    """Authenticate user via Bearer token (header) or session cookie."""
    session_token = None

    # Check Authorization header first (Bearer token)
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        session_token = auth_header[7:].strip()

    # Fall back to session cookie
    if not session_token:
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
    # Auto-extend session on activity (if <7 days remaining, extend to 30 days)
    remaining = datetime.fromisoformat(session["expires_at"]) - datetime.now(timezone.utc)
    if remaining.days < 7:
        new_expiry = (datetime.now(timezone.utc) + __import__("datetime").timedelta(days=30)).isoformat()
        await db.user_sessions.update_one(
            {"session_token": session_token},
            {"$set": {"expires_at": new_expiry}}
        )
    user = await db.users.find_one(
        {"user_id": session["user_id"]}, {"_id": 0}
    )
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def get_tenant_id(user):
    """Get tenant_id for user. Checks ownership first, then team membership."""
    user_id = user["user_id"]

    # Check if user owns a tenant
    tenant = await db.tenants.find_one({"owner_user_id": user_id}, {"_id": 0})

    # Check if user is a member of another tenant
    membership = await db.team_members.find_one(
        {"user_id": user_id, "role": "member"}, {"_id": 0}
    )
    if membership:
        return membership["tenant_id"]

    # If no membership, use owned tenant (create if needed)
    if not tenant:
        tenant_id = f"tenant_{user_id}"
        tenant = {
            "tenant_id": tenant_id,
            "athlete_name": user.get("name", "My Athlete"),
            "owner_user_id": user_id,
            "plan": "free",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.tenants.insert_one(tenant)
        del tenant["_id"]

    return tenant["tenant_id"]


async def get_user_role(user):
    """Get user's role in their current tenant: 'owner' or 'member'."""
    user_id = user["user_id"]
    membership = await db.team_members.find_one(
        {"user_id": user_id, "role": "member"}, {"_id": 0}
    )
    if membership:
        return "member"
    return "owner"
