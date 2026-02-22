"""
Intelligence API — Authenticated endpoints for intelligence cards.

Stage 3 runtime: Orchestrator → Micro-agents → Card JSON
"""

from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request
from database import db
from routes.auth_routes import get_current_user, get_tenant_id

router = APIRouter(prefix="/api/intelligence")

CACHE_TTL_HOURS = 24


async def _run_cached_card(card_type: str, program_id: str, tenant_id: str, force: bool) -> dict:
    """Shared cache + pipeline runner for any card type."""
    cache_key = {"tenant_id": tenant_id, "program_id": program_id, "card_type": card_type}

    if not force:
        cached = await db.intelligence_cache.find_one(cache_key, {"_id": 0})
        if cached:
            try:
                cache_dt = datetime.fromisoformat(cached.get("created_at", ""))
                age_hours = (datetime.now(timezone.utc) - cache_dt).total_seconds() / 3600
                if age_hours < cached.get("ttl_hours", CACHE_TTL_HOURS):
                    return cached.get("card", {})
            except Exception:
                pass

    from intelligence.orchestrator import run_card
    card = await run_card(db, card_type, program_id, tenant_id)

    ttl = card.get("cache_ttl_hours", CACHE_TTL_HOURS)
    if card.get("status") != "error":
        await db.intelligence_cache.update_one(
            cache_key,
            {"$set": {
                **cache_key,
                "card": card,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "ttl_hours": ttl,
            }},
            upsert=True,
        )

    return card


@router.post("/school-insight/{program_id}")
async def get_school_insight(program_id: str, request: Request):
    """Generate the 'Why This School / Why Not' intelligence card."""
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    force = request.query_params.get("force", "false").lower() == "true"
    try:
        return await _run_cached_card("school_insight", program_id, tenant_id, force)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Intelligence pipeline error: {str(e)}")


@router.post("/timeline/{program_id}")
async def get_timeline_intelligence(program_id: str, request: Request):
    """Generate the 'Recruiting Timeline Intelligence' card."""
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    force = request.query_params.get("force", "false").lower() == "true"
    try:
        return await _run_cached_card("timeline_intelligence", program_id, tenant_id, force)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Intelligence pipeline error: {str(e)}")


@router.post("/roster/{program_id}")
async def get_roster_stability(program_id: str, request: Request):
    """Generate the 'Roster Reality / Commitment Stability' card."""
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    force = request.query_params.get("force", "false").lower() == "true"
    try:
        return await _run_cached_card("roster_stability", program_id, tenant_id, force)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Intelligence pipeline error: {str(e)}")


@router.post("/scholarship/{program_id}")
async def get_scholarship_structure(program_id: str, request: Request):
    """Generate the 'Scholarship Structure' intelligence card."""
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    force = request.query_params.get("force", "false").lower() == "true"
    try:
        return await _run_cached_card("scholarship_structure", program_id, tenant_id, force)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Intelligence pipeline error: {str(e)}")
