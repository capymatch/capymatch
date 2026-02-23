from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone, timedelta
from database import db
from auth import get_current_user, get_tenant_id
from subscriptions import SUBSCRIPTION_TIERS, TIER_ORDER, get_user_subscription
from ws_manager import manager
import os
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/stripe")

STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY")

# Fixed plan prices — must match SUBSCRIPTION_TIERS in subscriptions.py
PLAN_PRICES = {
    "pro": 29.00,
    "premium": 49.00,
}


@router.post("/checkout")
async def create_checkout(request: Request):
    """Create a Stripe Checkout session for a subscription upgrade."""
    from emergentintegrations.payments.stripe.checkout import (
        StripeCheckout, CheckoutSessionRequest,
    )

    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    body = await request.json()

    plan = body.get("plan")
    origin_url = body.get("origin_url", "")

    if plan not in PLAN_PRICES:
        raise HTTPException(status_code=400, detail="Invalid plan. Choose 'pro' or 'premium'.")

    if not origin_url:
        raise HTTPException(status_code=400, detail="origin_url is required")

    # Check current plan — don't allow paying for same or lower tier
    current_sub = await get_user_subscription(tenant_id)
    tier_order = ["basic", "pro", "premium"]
    if tier_order.index(plan) <= tier_order.index(current_sub["tier"]):
        raise HTTPException(status_code=400, detail=f"You are already on {current_sub['tier'].title()} or higher.")

    amount = PLAN_PRICES[plan]
    success_url = f"{origin_url}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin_url}/board"

    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"

    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)

    metadata = {
        "user_id": user["user_id"],
        "tenant_id": tenant_id,
        "plan": plan,
        "plan_label": SUBSCRIPTION_TIERS[plan]["label"],
    }

    checkout_request = CheckoutSessionRequest(
        amount=amount,
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )

    session = await stripe_checkout.create_checkout_session(checkout_request)

    # Create pending transaction record
    txn = {
        "txn_id": f"txn_{uuid.uuid4().hex[:12]}",
        "session_id": session.session_id,
        "user_id": user["user_id"],
        "tenant_id": tenant_id,
        "plan": plan,
        "amount": amount,
        "currency": "usd",
        "payment_status": "pending",
        "status": "initiated",
        "metadata": metadata,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.payment_transactions.insert_one(txn)
    txn.pop("_id", None)

    logger.info(f"Checkout session created: {session.session_id} for {plan} plan (user={user['user_id']})")

    return {"url": session.url, "session_id": session.session_id}


@router.get("/checkout/status/{session_id}")
async def get_checkout_status(session_id: str, request: Request):
    """Poll the status of a checkout session and upgrade plan if paid."""
    from emergentintegrations.payments.stripe.checkout import StripeCheckout

    # Check DB first
    txn = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)

    try:
        status = await stripe_checkout.get_checkout_status(session_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Checkout session not found")

    # Update transaction status
    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {"$set": {
            "payment_status": status.payment_status,
            "status": status.status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )

    # If paid and not already processed, upgrade the plan
    if status.payment_status == "paid" and txn.get("payment_status") != "paid":
        plan = txn["plan"]
        tenant_id = txn["tenant_id"]
        user_id = txn["user_id"]

        # Get old plan for audit
        tenant = await db.tenants.find_one({"tenant_id": tenant_id}, {"_id": 0})
        old_plan = tenant.get("plan", "basic") if tenant else "basic"

        # Upgrade the plan
        now = datetime.now(timezone.utc).isoformat()
        await db.tenants.update_one(
            {"tenant_id": tenant_id},
            {"$set": {"plan": plan, "updated_at": now}},
        )

        # Audit log
        log_entry = {
            "log_id": f"sublog_{uuid.uuid4().hex[:12]}",
            "user_id": user_id,
            "tenant_id": tenant_id,
            "old_plan": old_plan,
            "new_plan": plan,
            "reason": "Stripe payment",
            "changed_by": "stripe",
            "session_id": session_id,
            "created_at": now,
        }
        await db.subscription_logs.insert_one(log_entry)

        # Notify via WebSocket
        await manager.send_to_tenant(tenant_id, {
            "type": "plan_changed",
            "old_plan": old_plan,
            "new_plan": plan,
            "reason": "Payment successful",
        })

        logger.info(f"Plan upgraded: {old_plan} -> {plan} for tenant {tenant_id} (session={session_id})")

    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency,
        "plan": txn["plan"],
    }
