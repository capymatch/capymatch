from fastapi import APIRouter, HTTPException, Request, Depends
from typing import Optional
from datetime import datetime, timezone, timedelta
from database import db
from subscriptions import SUBSCRIPTION_TIERS
from ws_manager import manager
from admin_guard import require_admin
import uuid
import os

router = APIRouter(prefix="/api/admin", dependencies=[Depends(require_admin)])


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


@router.get("/subscriptions")
async def list_subscriptions(search: Optional[str] = None, plan: Optional[str] = None, page: int = 1, limit: int = 50):
    """List all users with subscription info for admin management."""
    query = {}
    if plan and plan != "all":
        if plan == "basic":
            query["$or"] = [{"plan": "basic"}, {"plan": "free"}, {"plan": {"$exists": False}}]
        else:
            query["plan"] = plan

    tenants = await db.tenants.find(query, {"_id": 0}).sort("created_at", -1).to_list(2000)

    rows = []
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

        current_plan = t.get("plan", "basic")
        if current_plan == "free":
            current_plan = "basic"

        school_count = await db.programs.count_documents({"tenant_id": t["tenant_id"]})
        ai_used = await db.ai_usage.count_documents({
            "tenant_id": t["tenant_id"],
            "created_at": {"$gte": datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()},
        })

        tier_info = SUBSCRIPTION_TIERS.get(current_plan, SUBSCRIPTION_TIERS["basic"])

        rows.append({
            "user_id": user["user_id"],
            "tenant_id": t["tenant_id"],
            "name": user.get("name", ""),
            "email": user.get("email", ""),
            "athlete_name": t.get("athlete_name", ""),
            "plan": current_plan,
            "status": t.get("status", "active"),
            "school_count": school_count,
            "school_limit": tier_info.get("max_schools", 5),
            "ai_used": ai_used,
            "ai_limit": tier_info.get("ai_drafts_per_month", 0),
            "created_at": t.get("created_at", ""),
        })

    total = len(rows)
    start = (page - 1) * limit
    paginated = rows[start:start + limit]

    # Calculate stats
    plan_counts = {"basic": 0, "pro": 0, "premium": 0}
    for r in rows:
        plan_counts[r["plan"]] = plan_counts.get(r["plan"], 0) + 1

    mrr = plan_counts.get("pro", 0) * 19 + plan_counts.get("premium", 0) * 39

    return {
        "users": paginated,
        "total": total,
        "page": page,
        "limit": limit,
        "stats": {
            "plan_counts": plan_counts,
            "mrr": mrr,
            "total_users": total,
        },
    }


@router.put("/subscriptions/{user_id}")
async def change_subscription(user_id: str, request: Request):
    """Change a user's subscription plan with audit logging."""
    body = await request.json()
    new_plan = body.get("plan")
    reason = body.get("reason", "Admin change")

    if new_plan not in SUBSCRIPTION_TIERS:
        raise HTTPException(status_code=400, detail="Invalid plan")

    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    tenant = await db.tenants.find_one({"owner_user_id": user_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    old_plan = tenant.get("plan", "basic")
    if old_plan == "free":
        old_plan = "basic"

    now = datetime.now(timezone.utc).isoformat()

    # Update tenant plan
    await db.tenants.update_one(
        {"tenant_id": tenant["tenant_id"]},
        {"$set": {"plan": new_plan, "updated_at": now}},
    )

    # Log the change
    log_entry = {
        "log_id": f"sublog_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "tenant_id": tenant["tenant_id"],
        "user_name": user.get("name", ""),
        "user_email": user.get("email", ""),
        "old_plan": old_plan,
        "new_plan": new_plan,
        "reason": reason,
        "changed_by": "admin",
        "created_at": now,
    }
    await db.subscription_logs.insert_one(log_entry)
    log_entry.pop("_id", None)

    # Notify user in real-time via WebSocket
    await manager.send_to_tenant(tenant["tenant_id"], {
        "type": "plan_changed",
        "old_plan": old_plan,
        "new_plan": new_plan,
        "reason": reason,
    })

    return {"ok": True, "log": log_entry}


@router.get("/subscription-logs")
async def list_subscription_logs(page: int = 1, limit: int = 30):
    """Get recent subscription change audit logs."""
    total = await db.subscription_logs.count_documents({})
    skip = (page - 1) * limit
    logs = await db.subscription_logs.find(
        {}, {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"logs": logs, "total": total, "page": page, "limit": limit}


@router.post("/refresh-gpa")
async def trigger_gpa_refresh(request: Request):
    """Admin-only: trigger a manual GPA data refresh from ProductiveRecruit."""
    import subprocess
    from pathlib import Path

    # Fire and forget — run in background
    ROOT = Path(__file__).parent.parent
    subprocess.Popen(
        ["python3", "scripts/scrape_gpa.py"],
        env={**os.environ},
        cwd=str(ROOT),
        stdout=open("/tmp/gpa_manual_refresh.log", "w"),
        stderr=subprocess.STDOUT,
    )
    return {"status": "started", "log_file": "/tmp/gpa_manual_refresh.log"}


@router.get("/gpa-status")
async def gpa_data_status():
    """Get GPA data coverage stats."""
    real = await db.university_knowledge_base.count_documents({"scorecard.gpa_is_estimated": False, "scorecard.avg_gpa": {"$ne": None}})
    estimated = await db.university_knowledge_base.count_documents({"scorecard.gpa_is_estimated": True})
    total = await db.university_knowledge_base.count_documents({})
    no_gpa = total - real - estimated

    # Get freshness
    sample = await db.university_knowledge_base.find_one(
        {"scorecard.gpa_scraped_at": {"$exists": True}},
        {"_id": 0, "scorecard.gpa_scraped_at": 1}
    )
    last_scraped = (sample or {}).get("scorecard", {}).get("gpa_scraped_at", "unknown")

    return {
        "total_schools": total,
        "real_gpa": real,
        "estimated_gpa": estimated,
        "no_gpa": no_gpa,
        "real_pct": round(real / total * 100, 1) if total else 0,
        "coverage_pct": round((real + estimated) / total * 100, 1) if total else 0,
        "last_scraped": last_scraped,
        "source": "productiverecruit.com",
    }



@router.post("/scrape-school-data")
async def trigger_school_data_scrape(request: Request):
    """Admin-only: trigger comprehensive data scrape from ProductiveRecruit (SAT, ACT, logos, etc)."""
    import subprocess
    import sys
    from pathlib import Path

    ROOT = Path(__file__).parent.parent
    env = {**os.environ, "PLAYWRIGHT_BROWSERS_PATH": "/pw-browsers"}
    subprocess.Popen(
        [sys.executable, "scripts/scrape_school_data.py"],
        env=env,
        cwd=str(ROOT),
        stdout=open("/tmp/school_data_scrape.log", "w"),
        stderr=subprocess.STDOUT,
    )
    return {"status": "started", "log_file": "/tmp/school_data_scrape.log"}


@router.get("/scrape-school-data/status")
async def school_data_scrape_status():
    """Check progress of comprehensive school data scrape."""
    total = await db.university_knowledge_base.count_documents({})
    has_sat = await db.university_knowledge_base.count_documents({"scorecard.sat_avg": {"$exists": True, "$ne": None}})
    has_act = await db.university_knowledge_base.count_documents({"scorecard.act_midpoint": {"$exists": True, "$ne": None}})
    has_logo = await db.university_knowledge_base.count_documents({"logo_url": {"$exists": True, "$ne": None}})
    has_gpa = await db.university_knowledge_base.count_documents({"scorecard.avg_gpa": {"$exists": True, "$ne": None}, "scorecard.gpa_is_estimated": False})
    has_accept = await db.university_knowledge_base.count_documents({"scorecard.acceptance_rate": {"$exists": True, "$ne": None}})
    has_grad = await db.university_knowledge_base.count_documents({"scorecard.graduation_rate": {"$exists": True, "$ne": None}})

    # Check if scrape is running
    import subprocess
    running = "scrape_school_data" in subprocess.getoutput("ps aux")

    # Get last few log lines
    log_tail = ""
    try:
        with open("/tmp/school_data_scrape.log") as f:
            lines = f.readlines()
            log_tail = "".join(lines[-5:])
    except FileNotFoundError:
        log_tail = "No scrape has been run yet"

    return {
        "total_schools": total,
        "coverage": {
            "logo": {"count": has_logo, "pct": round(has_logo / total * 100, 1)},
            "gpa": {"count": has_gpa, "pct": round(has_gpa / total * 100, 1)},
            "sat": {"count": has_sat, "pct": round(has_sat / total * 100, 1)},
            "act": {"count": has_act, "pct": round(has_act / total * 100, 1)},
            "acceptance_rate": {"count": has_accept, "pct": round(has_accept / total * 100, 1)},
            "graduation_rate": {"count": has_grad, "pct": round(has_grad / total * 100, 1)},
        },
        "scrape_running": running,
        "log_tail": log_tail,
    }


# ---------------------------------------------------------------------------
# Intelligence Pipeline — Schema Mapper (Stage 1)
# ---------------------------------------------------------------------------

@router.post("/run-schema-mapper")
async def run_schema_mapper_endpoint():
    """Run the Schema Mapper to generate/refresh the Agent Input Contract."""
    from intelligence.schema_mapper import run_schema_mapper
    try:
        contract = await run_schema_mapper(db)
        return {
            "status": "ok",
            "schema_version": contract.get("schema_version"),
            "generated_at": contract.get("generated_at"),
            "open_questions_count": len(contract.get("open_questions", [])),
            "field_coverage_count": len(contract.get("field_coverage", {})),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Schema Mapper failed: {str(e)}")


@router.get("/agent-contract")
async def get_agent_contract():
    """Retrieve the latest Agent Input Contract."""
    doc = await db.intelligence_contracts.find_one(
        {"contract_type": "agent_input"}, {"_id": 0}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="No Agent Input Contract found. Run the Schema Mapper first.")
    return doc.get("contract", {})


# ---------------------------------------------------------------------------
# Intelligence Pipeline — Payload Builder (Stage 2)
# ---------------------------------------------------------------------------

@router.post("/build-payload/{program_id}")
async def build_payload_endpoint(program_id: str, request: Request):
    """Build a minimal intelligence payload for a school + athlete."""
    from intelligence.payload_builder import build_payload
    # Accept tenant_id from query param (admin testing) or auth
    tenant_id = request.query_params.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="tenant_id query param required")
    debug = request.query_params.get("debug", "false").lower() == "true"
    try:
        payload = await build_payload(db, program_id, tenant_id, debug=debug)
        # Compute estimated token size (rough: 4 chars ≈ 1 token)
        import json
        payload_str = json.dumps(payload)
        estimated_tokens = len(payload_str) // 4
        return {
            "payload": payload,
            "meta": {
                "payload_bytes": len(payload_str),
                "estimated_tokens": estimated_tokens,
                "missing_fields_count": len(payload.get("missing_fields", [])),
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Payload Builder failed: {str(e)}")


