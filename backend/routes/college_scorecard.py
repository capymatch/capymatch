from fastapi import APIRouter, HTTPException, Request, BackgroundTasks
from database import db
from datetime import datetime, timezone
import httpx
import os
import logging
import asyncio

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/integrations/scorecard")

SCORECARD_BASE = "https://api.data.gov/ed/collegescorecard/v1/schools"
SCORECARD_FIELDS = ",".join([
    "id", "school.name", "school.city", "school.state", "school.school_url",
    "school.student_size", "school.Carnegie_basic", "latest.student.size",
    "latest.admissions.admission_rate.overall",
    "latest.admissions.sat_scores.average.overall",
    "latest.admissions.act_scores.midpoint.cumulative",
    "latest.completion.completion_rate_4yr_100nt",
    "latest.student.retention_rate.four_year.full_time",
    "latest.student.demographics.student_faculty_ratio",
    "latest.cost.tuition.in_state",
    "latest.cost.tuition.out_of_state",
])

# Track sync status in memory
sync_status = {"running": False, "synced": 0, "failed": 0, "total": 0, "done": True}


def get_api_key():
    return os.environ.get("COLLEGE_SCORECARD_API_KEY", "")


def parse_scorecard_result(r):
    """Transform raw API result into our schema."""
    return {
        "scorecard_id": r.get("id"),
        "name": r.get("school.name"),
        "city": r.get("school.city"),
        "state": r.get("school.state"),
        "website": r.get("school.school_url"),
        "student_size": r.get("school.student_size"),
        "admission_rate": r.get("latest.admissions.admission_rate.overall"),
        "sat_avg": r.get("latest.admissions.sat_scores.average.overall"),
        "act_midpoint": r.get("latest.admissions.act_scores.midpoint.cumulative"),
        "graduation_rate": r.get("latest.completion.completion_rate_4yr_100nt"),
        "retention_rate": r.get("latest.student.retention_rate.four_year.full_time"),
        "student_faculty_ratio": r.get("latest.student.demographics.student_faculty_ratio"),
        "tuition_in_state": r.get("latest.cost.tuition.in_state"),
        "tuition_out_of_state": r.get("latest.cost.tuition.out_of_state"),
    }


def _name_similarity(query, candidate):
    """Score how well a Scorecard name matches our university name. Higher = better."""
    q = query.lower().strip()
    c = candidate.lower().strip()
    if q == c:
        return 100
    # Our name is a prefix/substring of the candidate (e.g. "Indiana University" in "Indiana University-Bloomington")
    c_normalized = c.replace("-", " ").replace("–", " ")
    q_normalized = q.replace("-", " ").replace("–", " ")
    if q_normalized in c_normalized:
        return 95 - min(len(c) - len(q), 20)
    if c_normalized in q_normalized:
        return 90 - min(len(q) - len(c), 20)
    # Word overlap
    q_words = set(q_normalized.split())
    c_words = set(c_normalized.split())
    common = q_words & c_words
    filler = {"university", "of", "the", "at", "and", "&", "college"}
    meaningful_common = common - filler
    meaningful_q = q_words - filler
    if not meaningful_q:
        return len(common) * 10
    return int((len(meaningful_common) / len(meaningful_q)) * 70)


def _best_match(name, results):
    """Find the best matching school from Scorecard results."""
    if not results:
        return None
    scored = []
    for r in results:
        sc_name = r.get("school.name", "")
        sim = _name_similarity(name, sc_name)
        # Use student_size as tiebreaker — larger campus = more likely the main one
        size = r.get("latest.student.size") or r.get("school.student_size") or 0
        scored.append((sim, size, r))
    scored.sort(key=lambda x: (-x[0], -x[1]))
    best_sim, _, best = scored[0]
    if best_sim > 40:
        return best
    return None


@router.get("/search")
async def search_school(name: str):
    """Search College Scorecard for a school by name."""
    api_key = get_api_key()
    if not api_key:
        raise HTTPException(status_code=400, detail="College Scorecard API key not configured")

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(SCORECARD_BASE, params={
            "api_key": api_key,
            "school.name": name,
            "fields": SCORECARD_FIELDS,
            "per_page": 10,
        })
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="College Scorecard API error")

    data = resp.json()
    results = [parse_scorecard_result(r) for r in data.get("results", [])]
    return {"results": results, "total": data.get("metadata", {}).get("total", 0)}


@router.get("/sync-status")
async def get_sync_status():
    """Get the current sync progress."""
    return sync_status


async def _run_sync():
    """Background task that syncs all unsynced schools."""
    global sync_status
    api_key = get_api_key()
    if not api_key:
        sync_status = {"running": False, "synced": 0, "failed": 0, "total": 0, "done": True, "error": "No API key"}
        return

    universities = await db.university_knowledge_base.find(
        {"scorecard": {"$exists": False}},
        {"_id": 0, "university_name": 1}
    ).to_list(2000)

    sync_status["total"] = len(universities)
    if not universities:
        sync_status = {"running": False, "synced": 0, "failed": 0, "total": 0, "done": True}
        return

    async with httpx.AsyncClient(timeout=15) as client:
        for uni in universities:
            name = uni.get("university_name", "")
            if not name:
                sync_status["failed"] += 1
                continue

            success = False
            for attempt in range(3):
                try:
                    resp = await client.get(SCORECARD_BASE, params={
                        "api_key": api_key,
                        "school.name": name,
                        "fields": SCORECARD_FIELDS,
                        "per_page": 20,
                    })
                    if resp.status_code == 429:
                        wait = 2 ** (attempt + 1)
                        logger.info(f"Rate limited, waiting {wait}s...")
                        await asyncio.sleep(wait)
                        continue
                    if resp.status_code != 200:
                        break

                    results = resp.json().get("results", [])
                    match = _best_match(name, results)

                    if match:
                        scorecard = parse_scorecard_result(match)
                        scorecard["synced_at"] = datetime.now(timezone.utc).isoformat()
                        await db.university_knowledge_base.update_one(
                            {"university_name": name},
                            {"$set": {"scorecard": scorecard}}
                        )
                        sync_status["synced"] += 1
                        success = True
                    break
                except Exception as e:
                    logger.warning(f"Scorecard attempt {attempt+1} failed for {name}: {e}")
                    await asyncio.sleep(1)

            if not success:
                sync_status["failed"] += 1

            await asyncio.sleep(0.3)

    sync_status["running"] = False
    sync_status["done"] = True


@router.post("/sync")
async def sync_schools():
    """Start background sync for all unsynced universities."""
    global sync_status
    if sync_status["running"]:
        return {"status": "already_running", **sync_status}

    already_synced = await db.university_knowledge_base.count_documents({"scorecard": {"$exists": True}})
    remaining = await db.university_knowledge_base.count_documents({"scorecard": {"$exists": False}})

    sync_status = {"running": True, "synced": 0, "failed": 0, "total": remaining, "done": False}
    asyncio.create_task(_run_sync())

    return {"status": "started", "already_synced": already_synced, "remaining": remaining}


@router.post("/sync-one")
async def sync_one_school(request: Request):
    """Sync scorecard data for a single university."""
    body = await request.json()
    name = body.get("university_name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="university_name required")

    api_key = get_api_key()
    if not api_key:
        raise HTTPException(status_code=400, detail="College Scorecard API key not configured")

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(SCORECARD_BASE, params={
            "api_key": api_key,
            "school.name": name,
            "fields": SCORECARD_FIELDS,
            "per_page": 20,
        })

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="College Scorecard API error")

    results = resp.json().get("results", [])
    match = _best_match(name, results)

    if not match:
        raise HTTPException(status_code=404, detail=f"No scorecard data found for {name}")

    scorecard = parse_scorecard_result(match)
    scorecard["synced_at"] = datetime.now(timezone.utc).isoformat()

    await db.university_knowledge_base.update_one(
        {"university_name": name},
        {"$set": {"scorecard": scorecard}},
        upsert=False
    )
    return {"scorecard": scorecard}


@router.put("/key")
async def update_scorecard_key(request: Request):
    """Update the College Scorecard API key."""
    body = await request.json()
    new_key = body.get("api_key", "").strip()
    if not new_key:
        raise HTTPException(status_code=400, detail="API key is required")

    # Validate key with a test request
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(SCORECARD_BASE, params={
            "api_key": new_key,
            "school.name": "Harvard",
            "fields": "school.name",
            "per_page": 1,
        })
    if resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Invalid API key — failed validation")

    os.environ["COLLEGE_SCORECARD_API_KEY"] = new_key

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
        if line.strip().startswith("COLLEGE_SCORECARD_API_KEY="):
            new_lines.append(f"COLLEGE_SCORECARD_API_KEY={new_key}\n")
            found = True
        else:
            new_lines.append(line)
    if not found:
        new_lines.append(f"COLLEGE_SCORECARD_API_KEY={new_key}\n")

    with open(env_path, "w") as f:
        f.writelines(new_lines)

    return {"status": "ok"}
