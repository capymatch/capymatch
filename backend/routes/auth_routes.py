from fastapi import APIRouter, HTTPException, Request, Response
from datetime import datetime, timezone, timedelta
from database import db
from auth import get_current_user, get_tenant_id
from email_service import send_welcome_email
from slowapi import Limiter
from slowapi.util import get_remote_address
import uuid
import httpx
import bcrypt
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")

def _get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip", "")
    if real_ip:
        return real_ip
    return request.client.host if request.client else "unknown"

limiter = Limiter(key_func=_get_client_ip)


@router.post("/auth/register")
async def register(request: Request):
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
    # Send welcome email (fire-and-forget)
    import asyncio
    asyncio.create_task(send_welcome_email(name, email))
    return {"user_id": user_id, "email": email, "name": name, "picture": "", "session_token": session_token}


@router.post("/auth/login")
async def login(request: Request):
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
    return {"user_id": user_id, "email": user["email"], "name": user.get("name", ""), "picture": user.get("picture", ""), "session_token": session_token}


@router.post("/auth/session")
async def exchange_session(request: Request):
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid request body")
    session_id = body.get("session_id")
    logger.info(f"[OAuth] Session exchange attempt, session_id present: {bool(session_id)}")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    try:
        async with httpx.AsyncClient(timeout=15.0) as hc:
            resp = await hc.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
    except Exception as e:
        logger.error(f"[OAuth] Network error reaching auth server: {e}")
        raise HTTPException(status_code=503, detail="Authentication service temporarily unavailable. Please try again.")
    logger.info(f"[OAuth] Emergent auth response status: {resp.status_code}")
    if resp.status_code != 200:
        logger.error(f"[OAuth] Emergent auth failed: {resp.text}")
        detail = "Session expired. Please try signing in again."
        if resp.status_code == 404:
            detail = "Session expired. Please try signing in with Google again."
        raise HTTPException(status_code=401, detail=detail)
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
    return {"user_id": user_id, "email": email, "name": name, "picture": picture, "session_token": session_token}


@router.get("/auth/me")
async def auth_me(request: Request):
    user = await get_current_user(request)
    return {k: v for k, v in user.items() if k not in ("_id", "password_hash")}


@router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    # Also check Bearer token
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        session_token = session_token or auth_header[7:].strip()
    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})
    response.delete_cookie("session_token", path="/", secure=True, samesite="none")
    return {"ok": True}



@router.put("/auth/update-account")
async def update_account(request: Request):
    user = await get_current_user(request)
    body = await request.json()
    new_name = (body.get("name") or "").strip()
    new_email = (body.get("email") or "").strip().lower()

    if not new_name:
        raise HTTPException(status_code=400, detail="Name is required")
    if not new_email:
        raise HTTPException(status_code=400, detail="Email is required")

    # Validate email format
    import re as re_mod
    if not re_mod.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", new_email):
        raise HTTPException(status_code=400, detail="Invalid email format")

    # Check email uniqueness if changed
    if new_email != user.get("email", ""):
        existing = await db.users.find_one({"email": new_email})
        if existing:
            raise HTTPException(status_code=409, detail="An account with this email already exists")

    user_id = user["user_id"]

    # Update users collection
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"name": new_name, "email": new_email}}
    )

    # Update athlete_name in tenants collection
    tenant_id = await get_tenant_id(user)
    await db.tenants.update_one(
        {"tenant_id": tenant_id},
        {"$set": {"athlete_name": new_name}}
    )

    # Update athlete_name in athlete_profiles collection if it exists
    await db.athlete_profiles.update_one(
        {"tenant_id": tenant_id},
        {"$set": {"athlete_name": new_name}},
    )

    return {"ok": True, "name": new_name, "email": new_email}


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


@router.post("/auth/forgot-password")
@limiter.limit("3/minute")
async def forgot_password(request: Request):
    body = await request.json()
    email = (body.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    user = await db.users.find_one({"email": email})
    # Always return success to prevent email enumeration
    if not user or not user.get("password_hash"):
        return {"ok": True}

    token = uuid.uuid4().hex
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

    await db.password_resets.delete_many({"user_id": user["user_id"]})
    await db.password_resets.insert_one({
        "user_id": user["user_id"],
        "token": token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    # Build reset URL and send email
    origin = str(request.base_url).rstrip("/")
    # Use the frontend origin from the Referer header if available
    referer = request.headers.get("referer") or request.headers.get("origin") or ""
    if referer:
        from urllib.parse import urlparse
        parsed = urlparse(referer)
        origin = f"{parsed.scheme}://{parsed.netloc}"

    reset_url = f"{origin}/reset-password/{token}"
    logger.info(f"[Password Reset] Token generated for {email}: {reset_url}")

    from email_service import send_email
    await send_email(
        to=email,
        subject="Reset your CapyMatch password",
        html=f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 22px; font-weight: 700; color: #1a1a2e; margin-bottom: 8px;">Reset your password</h1>
          <p style="font-size: 15px; color: #64748b; margin-bottom: 24px;">
            We received a request to reset the password for your CapyMatch account. Click the button below to choose a new password.
          </p>
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="{reset_url}" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #1a3a4a, #2ec4b6); color: white; text-decoration: none; border-radius: 24px; font-size: 14px; font-weight: 600;">
              Reset Password
            </a>
          </div>
          <p style="font-size: 13px; color: #94a3b8;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
        </div>
        """,
    )

    return {"ok": True}


@router.post("/auth/reset-password")
@limiter.limit("5/minute")
async def reset_password(request: Request):
    body = await request.json()
    token = (body.get("token") or "").strip()
    new_password = body.get("new_password") or ""

    if not token:
        raise HTTPException(status_code=400, detail="Reset token is required")
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    reset = await db.password_resets.find_one({"token": token})
    if not reset:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    expires_at = datetime.fromisoformat(reset["expires_at"].replace("Z", "+00:00"))
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > expires_at:
        await db.password_resets.delete_one({"token": token})
        raise HTTPException(status_code=400, detail="This reset link has expired. Please request a new one.")

    hashed = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
    await db.users.update_one({"user_id": reset["user_id"]}, {"$set": {"password_hash": hashed}})
    await db.password_resets.delete_many({"user_id": reset["user_id"]})

    return {"ok": True}
