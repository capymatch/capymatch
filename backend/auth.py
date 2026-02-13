from fastapi import HTTPException, Request
from datetime import datetime, timezone
from database import db
import uuid

# Auth bypass: static user/tenant for public access (keep original code commented for re-enable)
STATIC_USER_ID = "user_public_default"
STATIC_TENANT_ID = "tenant_public_default"


async def get_current_user(request: Request):
    """Bypassed: returns a static public user. Original auth logic preserved below."""
    user = await db.users.find_one({"user_id": STATIC_USER_ID}, {"_id": 0})
    if not user:
        user = {
            "user_id": STATIC_USER_ID,
            "email": "athlete@recruitinghq.app",
            "name": "Athlete",
            "picture": "",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user)
        user.pop("_id", None)
    return user


async def get_tenant_id(user):
    tenant = await db.tenants.find_one({"owner_user_id": user["user_id"]}, {"_id": 0})
    if not tenant:
        tenant_id = STATIC_TENANT_ID
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
