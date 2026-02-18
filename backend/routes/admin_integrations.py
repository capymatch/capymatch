from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone
from database import db
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/integrations")


@router.get("")
async def get_integrations_status():
    """Get status of all integrations: Gmail, Stripe, AI."""

    # ── Gmail ──
    gmail_tokens = await db.gmail_tokens.find({}, {"_id": 0, "user_id": 1}).to_list(100)
    gmail_connected_users = []
    for t in gmail_tokens:
        user = await db.users.find_one({"user_id": t["user_id"]}, {"_id": 0, "email": 1, "name": 1, "user_id": 1})
        if user:
            gmail_connected_users.append(user)

    gmail_client_id = os.environ.get("GMAIL_CLIENT_ID", "")

    # ── Stripe ──
    stripe_key = os.environ.get("STRIPE_API_KEY", "")
    stripe_connected = bool(stripe_key)
    stripe_key_masked = f"sk_...{stripe_key[-6:]}" if len(stripe_key) > 10 else ("Set" if stripe_key else "Not set")
    stripe_is_live = stripe_key.startswith("sk_live_") if stripe_key else False

    total_txns = await db.payment_transactions.count_documents({})
    paid_txns = await db.payment_transactions.count_documents({"payment_status": "paid"})
    revenue_pipeline = await db.payment_transactions.find({"payment_status": "paid"}, {"_id": 0, "amount": 1}).to_list(1000)
    total_revenue = sum(t.get("amount", 0) for t in revenue_pipeline)
    pending_txns = await db.payment_transactions.count_documents({"payment_status": "pending"})

    # ── AI (Emergent LLM Key) ──
    ai_key = os.environ.get("EMERGENT_LLM_KEY", "")
    ai_connected = bool(ai_key)
    ai_key_masked = f"sk-...{ai_key[-6:]}" if len(ai_key) > 10 else ("Set" if ai_key else "Not set")

    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    ai_usage_month = await db.ai_usage.count_documents({"created_at": {"$gte": month_start}})
    ai_usage_total = await db.ai_usage.count_documents({})

    # ── Email (Resend) ──
    resend_key = os.environ.get("RESEND_API_KEY", "")
    resend_connected = bool(resend_key)
    resend_key_masked = f"re_...{resend_key[-6:]}" if len(resend_key) > 10 else ("Set" if resend_key else "Not set")
    sender_email = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")

    # Check email settings in DB
    email_settings = await db.email_settings.find_one({"setting_id": "global"}, {"_id": 0})
    if not email_settings:
        email_settings = {"welcome_email": True, "invitation_email": True}

    # ── College Scorecard ──
    scorecard_key = os.environ.get("COLLEGE_SCORECARD_API_KEY", "")
    scorecard_connected = bool(scorecard_key)
    scorecard_key_masked = f"...{scorecard_key[-8:]}" if len(scorecard_key) > 10 else ("Set" if scorecard_key else "Not set")
    synced_count = await db.universities.count_documents({"scorecard": {"$exists": True}})
    total_universities = await db.universities.count_documents({})

    return {
        "gmail": {
            "connected": len(gmail_connected_users) > 0,
            "configured": bool(gmail_client_id),
            "client_id_set": bool(gmail_client_id),
            "connected_users": gmail_connected_users,
            "total_connected": len(gmail_connected_users),
        },
        "stripe": {
            "connected": stripe_connected,
            "key_masked": stripe_key_masked,
            "is_live": stripe_is_live,
            "mode": "Live" if stripe_is_live else "Test" if stripe_connected else "Not configured",
            "stats": {
                "total_transactions": total_txns,
                "paid_transactions": paid_txns,
                "pending_transactions": pending_txns,
                "total_revenue": total_revenue,
            },
        },
        "ai": {
            "connected": ai_connected,
            "key_masked": ai_key_masked,
            "provider": "Anthropic Claude (via Emergent)",
            "stats": {
                "usage_this_month": ai_usage_month,
                "usage_total": ai_usage_total,
            },
        },
        "email": {
            "connected": resend_connected,
            "provider": "Resend",
            "key_masked": resend_key_masked,
            "sender_email": sender_email,
            "settings": {
                "welcome_email": email_settings.get("welcome_email", True),
                "invitation_email": email_settings.get("invitation_email", True),
            },
        },
    }


@router.put("/stripe")
async def update_stripe_key(request: Request):
    """Update the Stripe API key."""
    body = await request.json()
    new_key = body.get("api_key", "").strip()

    if not new_key:
        raise HTTPException(status_code=400, detail="API key is required")
    if not new_key.startswith("sk_"):
        raise HTTPException(status_code=400, detail="Invalid Stripe key format. Must start with sk_test_ or sk_live_")

    # Update in environment (runtime)
    os.environ["STRIPE_API_KEY"] = new_key

    # Update .env file
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    lines = []
    found = False
    try:
        with open(env_path, "r") as f:
            lines = f.readlines()
    except FileNotFoundError:
        pass

    new_lines = []
    for line in lines:
        if line.strip().startswith("STRIPE_API_KEY="):
            new_lines.append(f"STRIPE_API_KEY={new_key}\n")
            found = True
        else:
            new_lines.append(line)
    if not found:
        new_lines.append(f"STRIPE_API_KEY={new_key}\n")

    with open(env_path, "w") as f:
        f.writelines(new_lines)

    is_live = new_key.startswith("sk_live_")
    masked = f"sk_...{new_key[-6:]}" if len(new_key) > 10 else "Set"
    logger.info(f"Stripe key updated: mode={'live' if is_live else 'test'}")

    return {
        "ok": True,
        "key_masked": masked,
        "is_live": is_live,
        "mode": "Live" if is_live else "Test",
    }


@router.delete("/gmail/{user_id}")
async def disconnect_gmail(user_id: str):
    """Disconnect Gmail for a user."""
    result = await db.gmail_tokens.delete_one({"user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Gmail connection not found for this user")
    logger.info(f"Gmail disconnected for user {user_id}")
    return {"ok": True}



@router.put("/email")
async def update_resend_key(request: Request):
    """Update the Resend API key."""
    body = await request.json()
    new_key = body.get("api_key", "").strip()

    if not new_key:
        raise HTTPException(status_code=400, detail="API key is required")
    if not new_key.startswith("re_"):
        raise HTTPException(status_code=400, detail="Invalid Resend key format. Must start with re_")

    os.environ["RESEND_API_KEY"] = new_key
    import resend
    resend.api_key = new_key

    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    lines = []
    found = False
    try:
        with open(env_path, "r") as f:
            lines = f.readlines()
    except FileNotFoundError:
        pass

    new_lines = []
    for line in lines:
        if line.strip().startswith("RESEND_API_KEY="):
            new_lines.append(f"RESEND_API_KEY={new_key}\n")
            found = True
        else:
            new_lines.append(line)
    if not found:
        new_lines.append(f"RESEND_API_KEY={new_key}\n")

    with open(env_path, "w") as f:
        f.writelines(new_lines)

    masked = f"re_...{new_key[-6:]}" if len(new_key) > 10 else "Set"
    logger.info(f"Resend key updated")
    return {"ok": True, "key_masked": masked}


@router.put("/email/settings")
async def update_email_settings(request: Request):
    """Toggle email notification types."""
    body = await request.json()
    welcome = body.get("welcome_email")
    invitation = body.get("invitation_email")

    update = {}
    if welcome is not None:
        update["welcome_email"] = bool(welcome)
    if invitation is not None:
        update["invitation_email"] = bool(invitation)

    if not update:
        raise HTTPException(status_code=400, detail="No settings provided")

    await db.email_settings.update_one(
        {"setting_id": "global"},
        {"$set": update},
        upsert=True
    )

    return {"ok": True, **update}
