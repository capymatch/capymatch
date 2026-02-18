from fastapi import APIRouter, HTTPException, Request, Response
from datetime import datetime, timezone, timedelta
from database import db
from auth import get_current_user, get_tenant_id
from email_service import send_welcome_email
import uuid
import httpx
import bcrypt
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")


@router.post("/auth/register")
async def register(request: Request, response: Response):
    body = await request.json()
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    name = (body.get("name") or "").strip()
    if not email or not password or not name:
        raise HTTPException(status_code=400, detail="Name, email and password are required")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user = {
        "user_id": user_id,
        "email": email,
        "name": name,
        "picture": "",
        "password_hash": hashed,
        "auth_provider": "local",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    session_token = f"sess_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
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
    # Send welcome email (fire-and-forget)
    import asyncio
    asyncio.create_task(send_welcome_email(name, email))
    return {"user_id": user_id, "email": email, "name": name, "picture": ""}


@router.post("/auth/login")
async def login(request: Request, response: Response):
    body = await request.json()
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required")
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not bcrypt.checkpw(password.encode(), user["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    user_id = user["user_id"]
    session_token = f"sess_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.user_sessions.insert_one({
        "session_token": session_token,
        "user_id": user_id,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    response.set_cookie(
        key="session_token", value=session_token, httponly=True,
        secure=True, samesite="none", path="/", max_age=7*24*3600
    )
    return {"user_id": user_id, "email": user["email"], "name": user.get("name", ""), "picture": user.get("picture", "")}


@router.post("/auth/session")
async def exchange_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    logger.info(f"[OAuth] Session exchange attempt, session_id present: {bool(session_id)}")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    async with httpx.AsyncClient(timeout=10.0) as hc:
        resp = await hc.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
    logger.info(f"[OAuth] Emergent auth response status: {resp.status_code}")
    if resp.status_code != 200:
        logger.error(f"[OAuth] Emergent auth failed: {resp.text}")
        raise HTTPException(status_code=401, detail="Invalid session_id")
    data = resp.json()
    email = data.get("email")
    name = data.get("name", "")
    picture = data.get("picture", "")
    ext_session_token = data.get("session_token", "")
    logger.info(f"[OAuth] User authenticated: {email}")
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


@router.get("/auth/me")
async def auth_me(request: Request):
    user = await get_current_user(request)
    return {k: v for k, v in user.items() if k not in ("_id", "password_hash")}


@router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})
    response.delete_cookie("session_token", path="/", secure=True, samesite="none")
    return {"ok": True}



@router.post("/auth/change-password")
async def change_password(request: Request):
    user = await get_current_user(request)
    if not user.get("password_hash"):
        raise HTTPException(status_code=400, detail="Password change is not available for social login accounts")
    body = await request.json()
    current_password = body.get("current_password") or ""
    new_password = body.get("new_password") or ""
    if not current_password or not new_password:
        raise HTTPException(status_code=400, detail="Current and new password are required")
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    if not bcrypt.checkpw(current_password.encode(), user["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    hashed = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"password_hash": hashed}})
    return {"ok": True}
