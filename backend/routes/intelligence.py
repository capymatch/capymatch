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


@router.post("/school-insight/{program_id}")
async def get_school_insight(program_id: str, request: Request):
    """
    Generate the "Why This School / Why Not" intelligence card.
    Uses the 3-stage pipeline: Contract → Payload → AI Agent.
    Cached for 24 hours per tenant+program. Use ?force=true to bypass.
    """
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    force = request.query_params.get("force", "false").lower() == "true"

    # Check cache (unless force refresh)
    cache_key = {"tenant_id": tenant_id, "program_id": program_id, "card_type": "school_insight"}
    if not force:
        cached = await db.intelligence_cache.find_one(cache_key, {"_id": 0})
        if cached:
            try:
                created = cached.get("created_at", "")
                cache_dt = datetime.fromisoformat(created)
                age_hours = (datetime.now(timezone.utc) - cache_dt).total_seconds() / 3600
                if age_hours < CACHE_TTL_HOURS:
                    return cached.get("card", {})
            except Exception:
                pass

    # Run the intelligence pipeline
    from intelligence.orchestrator import run_card
    try:
        card = await run_card(db, "school_insight", program_id, tenant_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Intelligence pipeline error: {str(e)}")

    # Cache the result
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
