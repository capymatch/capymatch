from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone, timedelta
from database import db
from auth import get_current_user, get_tenant_id
from subscriptions import get_user_subscription, enforce_feature
import uuid

router = APIRouter(prefix="/api")


# ─── Athlete Profile ───

@router.get("/athlete-profile")
async def get_athlete_profile(request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    profile = await db.athlete_profiles.find_one({"tenant_id": tenant_id}, {"_id": 0})
    if not profile:
        return {"tenant_id": tenant_id, "athlete_name": "", "grad_year": "", "position": "", "height": "", "club_team": "", "jersey_number": "", "high_school": "", "gpa": "", "contact_email": "", "contact_phone": "", "parent_name": "", "parent_email": "", "parent_phone": "", "video_link": "", "photo_url": "", "bio": "", "state": "", "city": "", "weight": "", "handed": "", "standing_reach": "", "approach_touch": "", "block_touch": "", "wingspan": "", "hudl_profile_url": ""}
    return profile


@router.put("/athlete-profile")
async def update_athlete_profile(request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    body = await request.json()
    allowed = {"athlete_name", "grad_year", "position", "height", "club_team", "jersey_number", "high_school", "gpa", "contact_email", "contact_phone", "parent_name", "parent_email", "parent_phone", "video_link", "photo_url", "bio", "state", "city", "weight", "handed", "standing_reach", "approach_touch", "block_touch", "wingspan", "hudl_profile_url"}
    updates = {k: v for k, v in body.items() if k in allowed}
    updates["tenant_id"] = tenant_id
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.athlete_profiles.update_one(
        {"tenant_id": tenant_id},
        {"$set": updates},
        upsert=True,
    )
    profile = await db.athlete_profiles.find_one({"tenant_id": tenant_id}, {"_id": 0})
    return profile


@router.post("/athlete-profile/photo")
async def upload_athlete_photo(request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    body = await request.json()
    photo_data = body.get("photo_data", "")
    if not photo_data:
        raise HTTPException(status_code=400, detail="photo_data required")
    if len(photo_data) > 5_000_000:
        raise HTTPException(status_code=400, detail="Photo too large (max 5MB)")
    await db.athlete_profiles.update_one(
        {"tenant_id": tenant_id},
        {"$set": {"photo_url": photo_data, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"ok": True}


# ─── Public Schedule ───

@router.get("/public/schedule/{tenant_id}")
async def public_schedule(tenant_id: str, request: Request):
    from routes.notifications import create_notification
    
    profile = await db.athlete_profiles.find_one({"tenant_id": tenant_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Athlete not found")
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    events = await db.events.find(
        {"tenant_id": tenant_id, "start_date": {"$gte": today}},
        {"_id": 0},
    ).sort("start_date", 1).to_list(100)
    past_events = await db.events.find(
        {"tenant_id": tenant_id, "start_date": {"$lt": today}},
        {"_id": 0},
    ).sort("start_date", -1).to_list(20)

    forwarded = request.headers.get("x-forwarded-for", "")
    visitor_ip = forwarded.split(",")[0].strip() if forwarded else request.client.host if request.client else ""
    user_agent = request.headers.get("user-agent", "")
    referer = request.headers.get("referer", "")
    is_edu = ".edu" in referer.lower() or ".edu" in user_agent.lower()
    
    # Extract potential school name from referer
    school_hint = ""
    if is_edu and referer:
        try:
            from urllib.parse import urlparse
            parsed = urlparse(referer)
            domain = parsed.netloc.lower()
            # Extract school name from domain like "athletics.stanford.edu"
            parts = domain.replace(".edu", "").split(".")
            school_hint = parts[-1].title() if parts else ""
        except:
            pass
    
    await db.profile_views.insert_one({
        "view_id": f"pv_{uuid.uuid4().hex[:12]}",
        "tenant_id": tenant_id,
        "visitor_ip": visitor_ip,
        "user_agent": user_agent,
        "referer": referer,
        "is_edu": is_edu,
        "school_hint": school_hint,
        "viewed_at": datetime.now(timezone.utc).isoformat(),
    })
    
    # Create notification for .edu visitors (potential coaches)
    if is_edu:
        # Check if we already notified about this IP in last hour to avoid spam
        one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
        recent_view = await db.profile_views.find_one({
            "tenant_id": tenant_id,
            "visitor_ip": visitor_ip,
            "is_edu": True,
            "viewed_at": {"$gte": one_hour_ago}
        })
        
        # Only notify once per IP per hour
        view_count = await db.profile_views.count_documents({
            "tenant_id": tenant_id,
            "visitor_ip": visitor_ip,
            "is_edu": True
        })
        
        if view_count <= 1:  # First view from this IP
            school_text = f" ({school_hint})" if school_hint else ""
            await create_notification(
                tenant_id=tenant_id,
                notif_type="profile_view_edu",
                title="College Coach May Be Viewing!",
                message=f"Someone from a .edu domain{school_text} viewed your profile",
                data={"referer": referer, "school_hint": school_hint}
            )

    return {
        "profile": profile,
        "upcoming_events": events,
        "past_events": past_events,
    }


# ─── Profile View Tracking ───

@router.get("/profile-views")
async def get_profile_views(request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    subscription = await get_user_subscription(tenant_id)
    if not subscription.get("public_profile", False):
        return {"views": [], "total": 0, "today": 0, "this_week": 0}
    views = await db.profile_views.find(
        {"tenant_id": tenant_id}, {"_id": 0}
    ).sort("viewed_at", -1).to_list(100)
    total = len(views)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_count = sum(1 for v in views if v.get("viewed_at", "").startswith(today))
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    week_count = sum(1 for v in views if v.get("viewed_at", "") >= week_ago)
    return {
        "views": views[:30],
        "total": total,
        "today": today_count,
        "this_week": week_count,
    }


# ─── Tenant Settings ───

@router.get("/tenant")
async def get_tenant(request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    tenant = await db.tenants.find_one({"tenant_id": tenant_id}, {"_id": 0})
    return tenant


@router.put("/tenant")
async def update_tenant(request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    body = await request.json()
    allowed = {"athlete_name"}
    updates = {k: v for k, v in body.items() if k in allowed}
    if updates:
        await db.tenants.update_one({"tenant_id": tenant_id}, {"$set": updates})
    tenant = await db.tenants.find_one({"tenant_id": tenant_id}, {"_id": 0})
    return tenant


@router.get("/share-link")
async def get_share_link(request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    return {"tenant_id": tenant_id}
