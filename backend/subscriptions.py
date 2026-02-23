from fastapi import HTTPException
from database import db
from datetime import datetime, timezone

SUBSCRIPTION_TIERS = {
    "basic": {
        "label": "Starter",
        "price": 0,
        "max_schools": 5,
        "max_members": 1,
        "ai_drafts_per_month": 0,
        "gmail_integration": True,
        "follow_up_reminders": True,
        "recruiting_insights": False,
        "auto_reply_detection": False,
        "weekly_digest": False,
        "public_profile": True,
        "analytics": True,
        "match_scores_limit": -1,
        "description": "Perfect for getting started",
        "features": [
            "Track up to 5 schools",
            "Basic pipeline board",
            "Athlete profile page",
            "School discovery search",
            "Email support",
        ],
    },
    "pro": {
        "label": "Pro",
        "price": 29,
        "max_schools": 25,
        "max_members": 2,
        "ai_drafts_per_month": 10,
        "gmail_integration": True,
        "follow_up_reminders": True,
        "recruiting_insights": False,
        "auto_reply_detection": False,
        "weekly_digest": False,
        "public_profile": True,
        "analytics": True,
        "match_scores_limit": -1,
        "description": "For serious recruiting families",
        "features": [
            "Track up to 25 schools",
            "Gmail sync & timeline",
            "Automated follow-up reminders",
            "AI-powered next steps",
            "10 AI email drafts/month",
            "Today's action dashboard",
            "Priority email support",
        ],
    },
    "premium": {
        "label": "Premium",
        "price": 49,
        "max_schools": -1,
        "max_members": -1,
        "ai_drafts_per_month": -1,
        "gmail_integration": True,
        "follow_up_reminders": True,
        "recruiting_insights": True,
        "auto_reply_detection": True,
        "weekly_digest": True,
        "public_profile": True,
        "analytics": True,
        "match_scores_limit": -1,
        "description": "Complete recruiting solution",
        "features": [
            "Unlimited schools",
            "AI email draft generator",
            "Highlight video advisor",
            "Coach activity watch",
            "Advanced analytics",
            "Priority phone support",
            "Recruiting strategy calls",
        ],
    },
}

TIER_ORDER = ["basic", "pro", "premium"]


async def get_user_subscription(tenant_id: str) -> dict:
    """Get the current subscription tier for a tenant."""
    tenant = await db.tenants.find_one({"tenant_id": tenant_id}, {"_id": 0})
    if not tenant:
        return {"tier": "basic", **SUBSCRIPTION_TIERS["basic"]}
    plan = tenant.get("plan", "basic")
    if plan == "free":
        plan = "basic"
    if plan not in SUBSCRIPTION_TIERS:
        plan = "basic"
    return {"tier": plan, **SUBSCRIPTION_TIERS[plan]}


async def get_ai_usage_this_month(tenant_id: str) -> int:
    """Count how many AI drafts used this month."""
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    count = await db.ai_usage.count_documents({
        "tenant_id": tenant_id,
        "created_at": {"$gte": month_start},
    })
    return count


async def track_ai_usage(tenant_id: str):
    """Record an AI draft usage."""
    await db.ai_usage.insert_one({
        "tenant_id": tenant_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })


def check_feature_access(subscription: dict, feature: str) -> bool:
    """Check if a feature is available in the current subscription."""
    return subscription.get(feature, False)


async def enforce_school_limit(tenant_id: str, subscription: dict):
    """Check if user can add more schools. Raises HTTPException if at limit."""
    max_schools = subscription.get("max_schools", 5)
    if max_schools == -1:
        return
    current_count = await db.programs.count_documents({"tenant_id": tenant_id})
    if current_count >= max_schools:
        if subscription["tier"] == "basic":
            msg = f"You've reached {max_schools} schools. Most families track 20–40 schools. Upgrade to Pro to keep your recruiting organized in one place."
            upgrade_to = "pro"
        else:
            msg = f"You've reached your {subscription['label']} plan limit of {max_schools} schools. Upgrade to Premium for unlimited school tracking."
            upgrade_to = "premium"
        raise HTTPException(
            status_code=403,
            detail={
                "error": "subscription_limit",
                "feature": "max_schools",
                "message": msg,
                "current": current_count,
                "limit": max_schools,
                "upgrade_to": upgrade_to,
            },
        )


async def enforce_ai_limit(tenant_id: str, subscription: dict):
    """Check if user can use AI drafts. Raises HTTPException if at limit."""
    limit = subscription.get("ai_drafts_per_month", 0)
    if limit == 0:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "subscription_limit",
                "feature": "ai_drafts",
                "message": "AI email drafts are available on Pro and Premium plans.",
                "current": 0,
                "limit": 0,
                "upgrade_to": "pro",
            },
        )
    if limit == -1:
        return
    used = await get_ai_usage_this_month(tenant_id)
    if used >= limit:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "subscription_limit",
                "feature": "ai_drafts",
                "message": f"You've used all {limit} AI drafts this month. Upgrade for more.",
                "current": used,
                "limit": limit,
                "upgrade_to": "premium",
            },
        )


def enforce_feature(subscription: dict, feature: str, feature_label: str, upgrade_to: str = "pro"):
    """Check if a boolean feature is enabled. Raises HTTPException if not."""
    if not subscription.get(feature, False):
        raise HTTPException(
            status_code=403,
            detail={
                "error": "subscription_limit",
                "feature": feature,
                "message": f"{feature_label} is available on {upgrade_to.title()} and above plans.",
                "upgrade_to": upgrade_to,
            },
        )
