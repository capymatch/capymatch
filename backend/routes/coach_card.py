from fastapi import APIRouter, Request, HTTPException
from database import db
from auth import get_current_user, get_tenant_id
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger("coach_card")
router = APIRouter(prefix="/api")


@router.get("/coach-card/{program_id}")
async def get_coach_card_config(program_id: str, request: Request):
    """Get Coach Card config for a specific program."""
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    config = await db.coach_cards.find_one(
        {"tenant_id": tenant_id, "program_id": program_id}, {"_id": 0}
    )
    if not config:
        config = {
            "tenant_id": tenant_id,
            "program_id": program_id,
            "coach_note": "",
            "featured_video": "",
            "show_schedule": True,
            "show_academics": True,
            "show_measurables": True,
            "show_videos": True,
            "slug": "",
        }
    else:
        # Ensure defaults for visibility toggles
        for field in ["show_schedule", "show_academics", "show_measurables", "show_videos"]:
            config.setdefault(field, True)
        config.setdefault("coach_note", "")
        config.setdefault("featured_video", "")
    return config


@router.put("/coach-card/{program_id}")
async def update_coach_card_config(program_id: str, request: Request):
    """Update Coach Card config (coach note, featured video, visibility toggles)."""
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    body = await request.json()

    updates = {}
    for field in ["coach_note", "featured_video", "show_schedule", "show_academics",
                   "show_measurables", "show_videos"]:
        if field in body:
            updates[field] = body[field]
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    # Generate slug if it doesn't exist
    existing = await db.coach_cards.find_one(
        {"tenant_id": tenant_id, "program_id": program_id}, {"_id": 0, "slug": 1}
    )
    if not existing or not existing.get("slug"):
        # Build slug from athlete name + school name
        profile = await db.athlete_profiles.find_one({"tenant_id": tenant_id}, {"_id": 0, "athlete_name": 1, "first_name": 1, "last_name": 1})
        program = await db.programs.find_one({"program_id": program_id, "tenant_id": tenant_id}, {"_id": 0, "university_name": 1})
        # Support both athlete_name (single field) and first/last name
        if profile and profile.get("athlete_name"):
            name_part = profile["athlete_name"].lower().strip()
        else:
            fname = (profile.get("first_name", "") if profile else "").lower().strip()
            lname = (profile.get("last_name", "") if profile else "").lower().strip()
            name_part = f"{fname} {lname}".strip()
        school = (program.get("university_name", "") if program else "").lower().strip()
        import re
        slug_parts = f"{name_part}-{school}".replace(" ", "-")
        slug_parts = re.sub(r"[^a-z0-9\-]", "", slug_parts)
        slug_parts = re.sub(r"-+", "-", slug_parts).strip("-")
        short_id = uuid.uuid4().hex[:6]
        updates["slug"] = f"{slug_parts}-{short_id}"

    updates["tenant_id"] = tenant_id
    updates["program_id"] = program_id

    await db.coach_cards.update_one(
        {"tenant_id": tenant_id, "program_id": program_id},
        {"$set": updates},
        upsert=True,
    )
    doc = await db.coach_cards.find_one(
        {"tenant_id": tenant_id, "program_id": program_id}, {"_id": 0}
    )
    return doc


@router.get("/card/{slug}")
async def get_public_coach_card(slug: str):
    """Public endpoint — no auth required. Returns Coach Card data for the given slug."""
    config = await db.coach_cards.find_one({"slug": slug}, {"_id": 0})
    if not config:
        raise HTTPException(status_code=404, detail="Coach Card not found")

    tenant_id = config["tenant_id"]
    program_id = config["program_id"]

    # Get athlete profile
    profile = await db.athlete_profiles.find_one(
        {"tenant_id": tenant_id},
        {"_id": 0, "athlete_name": 1, "first_name": 1, "last_name": 1,
         "graduation_year": 1, "grad_year": 1,
         "positions": 1, "position": 1, "secondary_position": 1,
         "height": 1, "weight": 1,
         "jersey_number": 1, "gpa": 1, "sat_score": 1, "act_score": 1,
         "club_team": 1, "high_school": 1, "state": 1, "city": 1,
         "highlight_video": 1, "highlights_url": 1, "hudl_url": 1, "full_game_film_url": 1,
         "photo_url": 1, "dominant_hand": 1, "reach": 1, "approach_jump": 1,
         "block_jump": 1, "standing_reach": 1, "vertical_jump": 1,
         "wingspan": 1, "speed_60yd": 1}
    )

    # Get program info
    program = await db.programs.find_one(
        {"program_id": program_id, "tenant_id": tenant_id},
        {"_id": 0, "university_name": 1, "stage": 1}
    )

    # Get schedule (upcoming events only)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    schedule = []
    if config.get("show_schedule", True):
        schedule = await db.schedule_events.find(
            {"tenant_id": tenant_id, "start_date": {"$gte": today}},
            {"_id": 0, "name": 1, "start_date": 1, "end_date": 1,
             "location": 1, "division": 1, "jersey_number": 1}
        ).sort("start_date", 1).to_list(20)

    return {
        "profile": profile or {},
        "program": program or {},
        "config": {
            "coach_note": config.get("coach_note", ""),
            "featured_video": config.get("featured_video", ""),
            "show_schedule": config.get("show_schedule", True),
            "show_academics": config.get("show_academics", True),
            "show_measurables": config.get("show_measurables", True),
            "show_videos": config.get("show_videos", True),
        },
        "schedule": schedule,
    }
