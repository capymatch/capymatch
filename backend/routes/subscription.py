from fastapi import APIRouter, Request
from auth import get_current_user, get_tenant_id
from subscriptions import (
    SUBSCRIPTION_TIERS,
    TIER_ORDER,
    get_user_subscription,
    get_ai_usage_this_month,
)
from database import db

router = APIRouter(prefix="/api/subscription")


@router.get("")
async def get_my_subscription(request: Request):
    """Get the current user's subscription details and usage stats."""
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)

    subscription = await get_user_subscription(tenant_id)
    tier = subscription["tier"]

    # Usage stats
    school_count = await db.programs.count_documents({"tenant_id": tenant_id})
    ai_used = await get_ai_usage_this_month(tenant_id)

    max_schools = subscription.get("max_schools", 5)
    ai_limit = subscription.get("ai_drafts_per_month", 0)

    return {
        "tier": tier,
        "label": subscription["label"],
        "price": subscription.get("price", 0),
        "features": subscription.get("features", []),
        "limits": {
            "max_schools": max_schools,
            "ai_drafts_per_month": ai_limit,
            "gmail_integration": subscription.get("gmail_integration", False),
            "analytics": subscription.get("analytics", False),
            "recruiting_insights": subscription.get("recruiting_insights", False),
            "public_profile": subscription.get("public_profile", False),
            "follow_up_reminders": subscription.get("follow_up_reminders", False),
            "auto_reply_detection": subscription.get("auto_reply_detection", False),
            "weekly_digest": subscription.get("weekly_digest", False),
        },
        "usage": {
            "schools": school_count,
            "schools_limit": max_schools,
            "schools_remaining": (max_schools - school_count) if max_schools != -1 else -1,
            "ai_drafts_used": ai_used,
            "ai_drafts_limit": ai_limit,
            "ai_drafts_remaining": (ai_limit - ai_used) if ai_limit != -1 else -1,
        },
    }


@router.get("/tiers")
async def get_all_tiers():
    """Get all available subscription tiers for comparison."""
    tiers = []
    for key in TIER_ORDER:
        tier_data = SUBSCRIPTION_TIERS[key]
        tiers.append({
            "id": key,
            "label": tier_data["label"],
            "price": tier_data.get("price", 0),
            "features": tier_data.get("features", []),
            "max_schools": tier_data["max_schools"],
            "max_members": tier_data.get("max_members", 1),
            "ai_drafts_per_month": tier_data["ai_drafts_per_month"],
            "gmail_integration": tier_data["gmail_integration"],
            "analytics": tier_data["analytics"],
            "recruiting_insights": tier_data["recruiting_insights"],
            "public_profile": tier_data["public_profile"],
        })
    return {"tiers": tiers}
