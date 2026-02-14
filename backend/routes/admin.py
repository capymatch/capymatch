from fastapi import APIRouter, HTTPException, Request
from typing import Optional
from datetime import datetime, timezone, timedelta
from database import db
import uuid

router = APIRouter(prefix="/api/admin")

SUBSCRIPTION_TIERS = {
    "basic": {
        "label": "Basic",
        "max_schools": 5,
        "ai_drafts_per_month": 0,
        "gmail_integration": False,
        "follow_up_reminders": False,
        "recruiting_insights": False,
        "auto_reply_detection": False,
        "weekly_digest": False,
        "public_profile": False,
        "analytics": False,
        "match_scores_limit": 3,
    },
    "pro": {
        "label": "Pro",
        "max_schools": 25,
        "ai_drafts_per_month": 10,
        "gmail_integration": True,
        "follow_up_reminders": True,
        "recruiting_insights": True,
        "auto_reply_detection": False,
        "weekly_digest": False,
        "public_profile": True,
        "analytics": True,
        "match_scores_limit": -1,
    },
    "premium": {
        "label": "Premium",
        "max_schools": -1,
        "ai_drafts_per_month": -1,
        "gmail_integration": True,
        "follow_up_reminders": True,
        "recruiting_insights": True,
        "auto_reply_detection": True,
        "weekly_digest": True,
        "public_profile": True,
        "analytics": True,
        "match_scores_limit": -1,
    },
}


@router.get("/stats")
async def get_admin_stats():
    total_users = await db.tenants.count_documents({})
    plan_counts = {}
    for plan in ["basic", "pro", "premium"]:
        plan_counts[plan] = await db.tenants.count_documents({"plan": plan})
    # Count users without a plan set as basic
    no_plan = await db.tenants.count_documents({"plan": {"$exists": False}})
    free_count = await db.tenants.count_documents({"plan": "free"})
    plan_counts["basic"] += no_plan + free_count

    total_schools = await db.programs.count_documents({})
    total_interactions = await db.interactions.count_documents({})
    total_events = await db.events.count_documents({})

    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    active_this_week = await db.interactions.distinct("tenant_id", {"created_at": {"$gte": week_ago}})

    return {
        "total_users": total_users,
        "plan_counts": plan_counts,
        "total_schools_on_boards": total_schools,
        "total_interactions": total_interactions,
        "total_events": total_events,
        "active_users_this_week": len(active_this_week),
    }


@router.get("/users")
async def list_users(search: Optional[str] = None, plan: Optional[str] = None, page: int = 1, limit: int = 50):
    query = {}
    if plan and plan != "all":
        if plan == "basic":
            query["$or"] = [{"plan": "basic"}, {"plan": "free"}, {"plan": {"$exists": False}}]
        else:
            query["plan"] = plan
    
    tenants = await db.tenants.find(query, {"_id": 0}).sort("created_at", -1).to_list(2000)

    # Enrich with user data
    users_out = []
    for t in tenants:
        user = await db.users.find_one({"user_id": t.get("owner_user_id")}, {"_id": 0})
        if not user:
            continue

        if search:
            name = (user.get("name") or "").lower()
            email = (user.get("email") or "").lower()
            athlete = (t.get("athlete_name") or "").lower()
            if search.lower() not in name and search.lower() not in email and search.lower() not in athlete:
                continue

        school_count = await db.programs.count_documents({"tenant_id": t["tenant_id"]})
        interaction_count = await db.interactions.count_documents({"tenant_id": t["tenant_id"]})

        current_plan = t.get("plan", "basic")
        if current_plan == "free":
            current_plan = "basic"

        users_out.append({
            "user_id": user["user_id"],
            "tenant_id": t["tenant_id"],
            "name": user.get("name", ""),
            "email": user.get("email", ""),
            "athlete_name": t.get("athlete_name", ""),
            "plan": current_plan,
            "status": t.get("status", "active"),
            "school_count": school_count,
            "interaction_count": interaction_count,
            "created_at": t.get("created_at", user.get("created_at", "")),
            "last_active": t.get("last_active", ""),
        })

    total = len(users_out)
    start = (page - 1) * limit
    paginated = users_out[start:start + limit]

    return {"users": paginated, "total": total, "page": page, "limit": limit}


@router.get("/users/{user_id}")
async def get_user_detail(user_id: str):
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    tenant = await db.tenants.find_one({"owner_user_id": user_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    tenant_id = tenant["tenant_id"]
    current_plan = tenant.get("plan", "basic")
    if current_plan == "free":
        current_plan = "basic"

    # Get profile
    profile = await db.athlete_profiles.find_one({"tenant_id": tenant_id}, {"_id": 0})

    # Get programs summary
    programs = await db.programs.find({"tenant_id": tenant_id}, {"_id": 0, "university_name": 1, "division": 1, "recruiting_status": 1, "board_group": 1, "created_at": 1}).to_list(200)
    
    # Status breakdown
    status_counts = {}
    for p in programs:
        s = p.get("recruiting_status", "Unknown")
        status_counts[s] = status_counts.get(s, 0) + 1

    # Recent interactions
    recent_interactions = await db.interactions.find(
        {"tenant_id": tenant_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(10)

    # Profile views
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    profile_views_week = await db.profile_views.count_documents({"tenant_id": tenant_id, "viewed_at": {"$gte": week_ago}})
    profile_views_total = await db.profile_views.count_documents({"tenant_id": tenant_id})

    # Events count
    event_count = await db.events.count_documents({"tenant_id": tenant_id})

    # Gmail connected?
    gmail = await db.gmail_tokens.find_one({"user_id": user_id}, {"_id": 0, "user_id": 1})

    return {
        "user": user,
        "tenant": {**tenant, "plan": current_plan},
        "profile": profile,
        "subscription": SUBSCRIPTION_TIERS.get(current_plan, SUBSCRIPTION_TIERS["basic"]),
        "stats": {
            "school_count": len(programs),
            "interaction_count": len(recent_interactions),
            "status_counts": status_counts,
            "profile_views_week": profile_views_week,
            "profile_views_total": profile_views_total,
            "event_count": event_count,
            "gmail_connected": gmail is not None,
            "questionnaire_completed": profile.get("questionnaire_completed", False) if profile else False,
        },
        "recent_interactions": recent_interactions,
        "programs": programs,
    }


@router.put("/users/{user_id}")
async def update_user(user_id: str, request: Request):
    body = await request.json()
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    tenant = await db.tenants.find_one({"owner_user_id": user_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # Update user fields
    user_updates = {}
    if "name" in body:
        user_updates["name"] = body["name"]
    if "email" in body:
        user_updates["email"] = body["email"]
    if user_updates:
        await db.users.update_one({"user_id": user_id}, {"$set": user_updates})

    # Update tenant fields
    tenant_updates = {}
    if "plan" in body and body["plan"] in SUBSCRIPTION_TIERS:
        tenant_updates["plan"] = body["plan"]
    if "status" in body and body["status"] in ("active", "suspended", "deactivated"):
        tenant_updates["status"] = body["status"]
    if "athlete_name" in body:
        tenant_updates["athlete_name"] = body["athlete_name"]
    if tenant_updates:
        tenant_updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.tenants.update_one({"tenant_id": tenant["tenant_id"]}, {"$set": tenant_updates})

    return {"ok": True, "updated_fields": list(user_updates.keys()) + list(tenant_updates.keys())}


@router.post("/users")
async def create_user(request: Request):
    body = await request.json()
    name = body.get("name", "").strip()
    email = body.get("email", "").strip()
    plan = body.get("plan", "basic")

    if not name or not email:
        raise HTTPException(status_code=400, detail="Name and email are required")

    # Check duplicate email
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="A user with this email already exists")

    user_id = f"user_{uuid.uuid4().hex[:12]}"
    tenant_id = f"tenant_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()

    user_doc = {
        "user_id": user_id,
        "email": email,
        "name": name,
        "picture": "",
        "created_at": now,
    }
    await db.users.insert_one(user_doc)
    user_doc.pop("_id", None)

    tenant_doc = {
        "tenant_id": tenant_id,
        "athlete_name": name,
        "owner_user_id": user_id,
        "plan": plan if plan in SUBSCRIPTION_TIERS else "basic",
        "status": "active",
        "created_at": now,
    }
    await db.tenants.insert_one(tenant_doc)
    tenant_doc.pop("_id", None)

    return {"user": user_doc, "tenant": tenant_doc}


@router.get("/subscription-tiers")
async def get_subscription_tiers():
    return {"tiers": SUBSCRIPTION_TIERS}
