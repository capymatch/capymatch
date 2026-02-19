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
    c_normalized = c.replace("-", " ").replace("–", " ")
    q_normalized = q.replace("-", " ").replace("–", " ")
    # Our name is a prefix/substring of the candidate — all campus variants score equally
    if q_normalized in c_normalized:
        return 90
    if c_normalized in q_normalized:
        return 85
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
    best_sim = 0
    best_size = 0
    best = None
    for r in results:
        sc_name = r.get("school.name", "")
        sim = _name_similarity(name, sc_name)
        if sim < 40:
            continue
        size = r.get("latest.student.size") or r.get("school.student_size") or 0
        if sim > best_sim or (sim == best_sim and size > best_size):
            best_sim = sim
            best_size = size
            best = r
    return best


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


def _extract_domain(url):
    """Extract root domain from a URL like 'https://www.indiana.edu/foo' -> 'indiana.edu'."""
    if not url:
        return ""
    from urllib.parse import urlparse
    try:
        parsed = urlparse(url if url.startswith("http") else f"https://{url}")
        host = parsed.netloc or parsed.path.split("/")[0]
        host = host.lower().strip(".")
        if host.startswith("www."):
            host = host[4:]
        return host
    except Exception:
        return ""


def _root_domain(host):
    """Get the root .edu or .com domain: 'bloomington.iu.edu' -> 'iu.edu'."""
    parts = host.split(".")
    if len(parts) >= 2:
        return ".".join(parts[-2:])
    return host


async def _download_all_scorecard(api_key):
    """Download ALL schools from College Scorecard API. Returns list of raw results."""
    all_schools = []
    page = 0
    per_page = 100

    async with httpx.AsyncClient(timeout=20) as client:
        while True:
            for attempt in range(3):
                try:
                    resp = await client.get(f"{SCORECARD_BASE}.json", params={
                        "api_key": api_key,
                        "fields": SCORECARD_FIELDS,
                        "per_page": per_page,
                        "page": page,
                    })
                    if resp.status_code == 429:
                        await asyncio.sleep(2 ** (attempt + 1))
                        continue
                    if resp.status_code != 200:
                        logger.error(f"Scorecard API error on page {page}: {resp.status_code}")
                        return all_schools
                    data = resp.json()
                    results = data.get("results", [])
                    all_schools.extend(results)
                    total = data.get("metadata", {}).get("total", 0)
                    logger.info(f"Scorecard download: page {page}, got {len(results)}, total so far {len(all_schools)}/{total}")
                    break
                except Exception as e:
                    logger.warning(f"Scorecard download page {page} attempt {attempt+1}: {e}")
                    await asyncio.sleep(1)

            if not results or len(all_schools) >= total:
                break
            page += 1
            await asyncio.sleep(0.2)

    return all_schools


def _build_domain_lookup(scorecard_schools):
    """Build lookups: exact domain AND root domain -> list of scorecard results (sorted by student size desc)."""
    exact = {}
    root = {}
    for s in scorecard_schools:
        url = s.get("school.school_url", "") or ""
        domain = _extract_domain(url)
        if domain:
            exact.setdefault(domain, []).append(s)
            rd = _root_domain(domain)
            if rd != domain:
                root.setdefault(rd, []).append(s)
    # Sort each by student size (largest first = main campus)
    for lookup in [exact, root]:
        for d in lookup:
            lookup[d].sort(
                key=lambda x: x.get("latest.student.size") or x.get("school.student_size") or 0,
                reverse=True
            )
    return exact, root


async def _run_sync():
    """Background task: download all Scorecard data, then match to our volleyball schools by domain."""
    global sync_status
    api_key = get_api_key()
    if not api_key:
        sync_status = {"running": False, "synced": 0, "failed": 0, "total": 0, "done": True, "error": "No API key"}
        return

    try:
        # Step 1: Download all Scorecard schools
        sync_status["phase"] = "downloading"
        all_scorecard = await _download_all_scorecard(api_key)
        if not all_scorecard:
            sync_status = {"running": False, "synced": 0, "failed": 0, "total": 0, "done": True, "error": "Download failed"}
            return

        # Build lookup by domain (exact + root)
        exact_lookup, root_lookup = _build_domain_lookup(all_scorecard)
        logger.info(f"Domain lookups: {len(exact_lookup)} exact, {len(root_lookup)} root domains")

        # Step 2: Match our volleyball schools
        sync_status["phase"] = "matching"
        universities = await db.university_knowledge_base.find(
            {},
            {"_id": 0, "university_name": 1, "domain": 1}
        ).to_list(2000)

        sync_status["total"] = len(universities)

        for uni in universities:
            name = uni.get("university_name", "")
            domain = uni.get("domain", "")

            match = None
            method = "none"

            # Strategy 1: Exact domain match
            if domain and domain in exact_lookup:
                match = exact_lookup[domain][0]
                method = "domain_exact"

            # Strategy 2: Root domain match (e.g., our 'stanford.edu' matches their 'www.stanford.edu')
            if not match and domain:
                rd = _root_domain(domain)
                if rd in root_lookup:
                    match = root_lookup[rd][0]
                    method = "domain_root"
                elif rd in exact_lookup:
                    match = exact_lookup[rd][0]
                    method = "domain_root"

            # Strategy 3: Best name match against ALL downloaded schools
            if not match:
                match = _best_match(name, all_scorecard)
                if match:
                    method = "name"

            if match:
                scorecard = parse_scorecard_result(match)
                scorecard["synced_at"] = datetime.now(timezone.utc).isoformat()
                scorecard["match_method"] = method
                await db.university_knowledge_base.update_one(
                    {"university_name": name},
                    {"$set": {"scorecard": scorecard}}
                )
                sync_status["synced"] += 1
            else:
                sync_status["failed"] += 1

    except Exception as e:
        logger.error(f"Scorecard sync error: {e}")
    finally:
        sync_status["running"] = False
        sync_status["done"] = True
        sync_status["phase"] = "complete"


@router.post("/sync")
async def sync_schools(request: Request):
    """Start background sync. With force=true, clears all existing scorecard data first."""
    global sync_status
    if sync_status["running"]:
        return {"status": "already_running", **sync_status}

    body = {}
    try:
        body = await request.json()
    except Exception:
        pass
    force = body.get("force", False)

    if force:
        # Clear all existing scorecard data for a fresh rebuild
        await db.university_knowledge_base.update_many({}, {"$unset": {"scorecard": ""}})

    total = await db.university_knowledge_base.count_documents({})
    already_synced = 0 if force else await db.university_knowledge_base.count_documents({"scorecard": {"$exists": True}})

    sync_status = {"running": True, "synced": 0, "failed": 0, "total": total, "done": False, "phase": "starting"}
    asyncio.create_task(_run_sync())

    return {"status": "started", "already_synced": already_synced, "total": total, "mode": "force_rebuild" if force else "incremental"}


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
