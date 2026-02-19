from fastapi import APIRouter, HTTPException, Request
from typing import Optional
from datetime import datetime, timezone
from database import db
from auth import get_current_user, get_tenant_id
from subscriptions import get_user_subscription, enforce_school_limit
import uuid
import os
import re
import httpx
import logging
import asyncio

logger = logging.getLogger(__name__)

SCORECARD_BASE = "https://api.data.gov/ed/collegescorecard/v1/schools"
SCORECARD_FIELDS = ",".join([
    "id", "school.name", "school.city", "school.state", "school.school_url",
    "school.student_size", "latest.student.size",
    "latest.admissions.admission_rate.overall",
    "latest.admissions.sat_scores.average.overall",
    "latest.admissions.act_scores.midpoint.cumulative",
    "latest.completion.completion_rate_4yr_100nt",
    "latest.student.retention_rate.four_year.full_time",
    "latest.student.demographics.student_faculty_ratio",
    "latest.cost.tuition.in_state",
    "latest.cost.tuition.out_of_state",
    "latest.cost.avg_net_price.overall",
    "latest.aid.median_debt.completers.overall",
    "latest.aid.loan_principal",
    "latest.earnings.10_yrs_after_entry.median",
])

router = APIRouter(prefix="/api")


@router.get("/knowledge-base")
async def list_knowledge_base(division: Optional[str] = None, conference: Optional[str] = None, region: Optional[str] = None, search: Optional[str] = None):
    query = {}
    if division:
        query["division"] = division
    if conference:
        query["conference"] = {"$regex": conference, "$options": "i"}
    if region:
        query["region"] = {"$regex": f"^{region}$", "$options": "i"}
    if search:
        query["university_name"] = {"$regex": search, "$options": "i"}
    universities = await db.university_knowledge_base.find(query, {"_id": 0}).sort("university_name", 1).to_list(2000)
    return universities


@router.post("/knowledge-base/add-to-board")
async def add_to_board(request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    # Enforce subscription school limit
    subscription = await get_user_subscription(tenant_id)
    await enforce_school_limit(tenant_id, subscription)
    body = await request.json()
    uni_name = body.get("university_name")
    if not uni_name:
        raise HTTPException(status_code=400, detail="university_name required")
    uni = await db.university_knowledge_base.find_one({"university_name": uni_name}, {"_id": 0})
    if not uni:
        raise HTTPException(status_code=404, detail="University not found in knowledge base")
    existing = await db.programs.find_one({"tenant_id": tenant_id, "university_name": uni_name}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="University already on your board")
    program_id = f"prog_{uuid.uuid4().hex[:12]}"
    doc = {
        "program_id": program_id,
        "tenant_id": tenant_id,
        "university_name": uni.get("university_name", ""),
        "division": uni.get("division", ""),
        "conference": uni.get("conference", ""),
        "region": uni.get("region", ""),
        "website": uni.get("website", ""),
        "domain": uni.get("domain", ""),
        "mascot": uni.get("mascot", ""),
        "primary_coach": uni.get("primary_coach", ""),
        "coach_email": uni.get("coach_email", ""),
        "recruiting_coordinator": uni.get("recruiting_coordinator", ""),
        "coordinator_email": uni.get("coordinator_email", ""),
        "program_interest": "",
        "recruiting_status": "Not Contacted",
        "reply_status": "No Reply",
        "priority": "Medium",
        "initial_contact_sent": "",
        "last_follow_up": "",
        "follow_up_days": 14,
        "next_action": "",
        "next_action_due": "",
        "scholarship_type": uni.get("scholarship_type", ""),
        "roster_needs": uni.get("roster_needs", ""),
        "events_seen": "",
        "video_link": "",
        "coach_contract_expiration": "",
        "notes": "",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.programs.insert_one(doc)
    doc.pop("_id", None)
    return doc


async def _search_questionnaire_url(university_name, domain, website=None):
    """Use DuckDuckGo to find the volleyball recruiting questionnaire URL for a school."""
    try:
        from ddgs import DDGS
        from urllib.parse import urlparse

        athletics_domain = None
        if website:
            parsed = urlparse(website if website.startswith("http") else f"https://{website}")
            athletics_domain = parsed.netloc.replace("www.", "")

        import asyncio as _aio
        # Known 3rd-party questionnaire platforms schools commonly use
        questionnaire_platforms = ["armssoftware.com", "jumpforward.com", "formstack.com", "fieldlevel.com"]

        school_domains = set()
        if athletics_domain:
            school_domains.add(athletics_domain)
        if domain:
            school_domains.add(domain)

        # Build a search-friendly name that won't match sibling schools
        # e.g. "UCLA" not "University of California", "Ohio State" not "Ohio"
        search_name = university_name or ""
        # Try to get the most specific part after a dash/separator
        for sep in ["–", "—", " - "]:
            if sep in search_name:
                parts = search_name.split(sep)
                # Use last part if it's a short acronym like "UCLA", else use full name
                last = parts[-1].strip()
                if len(last) <= 6 and last.isupper():
                    search_name = last
                else:
                    search_name = university_name
                break

        queries = []
        if athletics_domain:
            queries.append(f"site:{athletics_domain} volleyball recruiting questionnaire")
        queries.append(f'"{search_name}" women\'s volleyball recruiting questionnaire')
        queries.append(f'"{search_name}" volleyball prospect questionnaire')

        scored = []  # list of (score, url)
        seen_urls = set()

        for i, query in enumerate(queries):
            if i > 0:
                await _aio.sleep(1)  # avoid rate limiting between queries
            try:
                results = list(DDGS().text(query, max_results=8, region="us-en"))
                for r in results:
                    href = r.get("href", "")
                    if not href or "bing.com/aclick" in href or href in seen_urls:
                        continue
                    seen_urls.add(href)

                    title = (r.get("title") or "").lower()
                    body = (r.get("body") or "").lower()
                    url_lower = href.lower()

                    # Skip URLs with sport-specific query params for wrong sports
                    if "?path=" in url_lower:
                        wrong_sport_paths = ["wsoc", "msoc", "base", "soft", "foot", "mbkb", "wbkb",
                                             "track", "swim", "golf", "tennis", "wrest", "lacros"]
                        if any(sp in url_lower.split("?path=")[-1] for sp in wrong_sport_paths):
                            continue

                    # Must be from school domain or known questionnaire platform
                    from_school = any(sd in url_lower for sd in school_domains)
                    from_platform = any(qp in url_lower for qp in questionnaire_platforms)
                    if not from_school and not from_platform:
                        continue

                    # Questionnaire signal — check title and URL (not body, too noisy)
                    title_url = f"{url_lower} {title}"
                    q_keywords = ["questionnaire", "prospect form", "prospect-form",
                                  "prospect_form", "prospective student-athlete",
                                  "prospective-student-athlete", "recruiting information",
                                  "recruiting form", "recruit-form"]
                    has_q_signal = any(kw in title_url for kw in q_keywords)
                    if not has_q_signal:
                        continue

                    score = 40  # base score for having questionnaire signal

                    # Volleyball in title or URL (strong signal)
                    if any(vk in title_url for vk in ["volleyball", "wvb", "w-vball"]):
                        score += 30

                    # Penalize other sports showing up in title
                    other_sports = ["track", "field", "soccer", "basketball", "baseball",
                                    "softball", "swimming", "tennis", "golf", "football",
                                    "lacrosse", "hockey", "wrestling", "gymnast", "rowing"]
                    if any(sp in title for sp in other_sports):
                        score -= 40

                    # Penalize beach volleyball (different sport)
                    if "beach" in title_url:
                        score -= 25

                    # Penalize men's volleyball when women's is what we want
                    if "men's volleyball" in title and "women" not in title:
                        score -= 30

                    # Bonus: women's specific
                    if "women" in title_url:
                        score += 10

                    # Bonus: from school's own domain
                    if from_school:
                        score += 15

                    # Bonus: from known questionnaire platform
                    if from_platform:
                        score += 10

                    # Bonus: questionnaire is in the title (not just URL)
                    if "questionnaire" in title:
                        score += 10

                    scored.append((score, href))
            except Exception:
                continue

        if scored:
            scored.sort(key=lambda x: x[0], reverse=True)
            best_score, best_url = scored[0]
            if best_score >= 40:
                return best_url
        return None
    except Exception as e:
        logger.warning(f"Questionnaire search failed for {university_name}: {e}")
    return None


@router.get("/knowledge-base/school/{domain}")
async def get_school_by_domain(domain: str, request: Request):
    """Return a single university by its domain, with scorecard and match data if available."""
    uni = await db.university_knowledge_base.find_one({"domain": domain}, {"_id": 0})
    if not uni:
        raise HTTPException(status_code=404, detail="University not found")

    # Auto-fetch scorecard and questionnaire in parallel if missing
    needs_scorecard = not uni.get("scorecard") or not uni["scorecard"].get("synced_at")
    needs_questionnaire = uni.get("questionnaire_url") is None  # empty string means "searched, not found"

    if needs_scorecard or needs_questionnaire:
        tasks = []
        if needs_scorecard:
            tasks.append(_fetch_scorecard_for_school(uni))
        else:
            tasks.append(asyncio.coroutine(lambda: None)() if False else asyncio.sleep(0))
        if needs_questionnaire and not _bulk_status["running"]:
            tasks.append(_search_questionnaire_url(uni.get("university_name", ""), domain, uni.get("website")))
        else:
            tasks.append(asyncio.sleep(0))

        results = await asyncio.gather(*tasks, return_exceptions=True)

        scorecard_result = results[0] if needs_scorecard else None
        q_url_result = results[1] if needs_questionnaire and not _bulk_status["running"] else None

        if scorecard_result and not isinstance(scorecard_result, (Exception, type(None))):
            uni["scorecard"] = scorecard_result
            await db.university_knowledge_base.update_one(
                {"domain": domain}, {"$set": {"scorecard": scorecard_result}}
            )
        if q_url_result and not isinstance(q_url_result, (Exception, type(None))):
            uni["questionnaire_url"] = q_url_result
            await db.university_knowledge_base.update_one(
                {"domain": domain}, {"$set": {"questionnaire_url": q_url_result}}
            )

    try:
        user = await get_current_user(request)
        tenant_id = await get_tenant_id(user)
        profile = await db.athlete_profiles.find_one({"tenant_id": tenant_id}, {"_id": 0})
        if profile:
            uni["match_score"] = _compute_match(uni, profile)["score"]
            uni["match_reasons"] = _compute_match(uni, profile)["reasons"]
        else:
            uni["match_score"] = 0
            uni["match_reasons"] = []
        on_board = await db.programs.find_one({"tenant_id": tenant_id, "university_name": uni.get("university_name")})
        uni["on_board"] = bool(on_board)
        if on_board:
            uni["program_id"] = on_board.get("program_id")
    except Exception:
        uni["match_score"] = 0
        uni["match_reasons"] = []
        uni["on_board"] = False
    return uni


async def _fetch_scorecard_for_school(uni):
    """Fetch College Scorecard data on-demand for a single university."""
    api_key = os.environ.get("COLLEGE_SCORECARD_API_KEY", "")
    if not api_key:
        return None
    domain = uni.get("domain", "")
    name = uni.get("university_name", "")
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            # Try by domain first
            if domain:
                resp = await client.get(SCORECARD_BASE, params={
                    "api_key": api_key, "school.school_url": domain,
                    "fields": SCORECARD_FIELDS, "per_page": 3
                })
                if resp.status_code == 200:
                    results = resp.json().get("results", [])
                    if results:
                        return _parse_scorecard(results[0])
            # Fallback: search by name
            if name:
                resp = await client.get(SCORECARD_BASE, params={
                    "api_key": api_key, "school.name": name,
                    "fields": SCORECARD_FIELDS, "per_page": 5
                })
                if resp.status_code == 200:
                    results = resp.json().get("results", [])
                    name_lower = name.lower()
                    for r in results:
                        if r.get("school.name", "").lower() == name_lower:
                            return _parse_scorecard(r)
                    if results:
                        return _parse_scorecard(results[0])
    except Exception as e:
        logger.warning(f"Scorecard fetch failed for {name}: {e}")
    return None


def _parse_scorecard(r):
    """Parse a single College Scorecard API result into our schema."""
    return {
        "scorecard_id": r.get("id"),
        "city": r.get("school.city"),
        "state": r.get("school.state"),
        "student_size": r.get("latest.student.size") or r.get("school.student_size"),
        "admission_rate": r.get("latest.admissions.admission_rate.overall"),
        "sat_avg": r.get("latest.admissions.sat_scores.average.overall"),
        "act_midpoint": r.get("latest.admissions.act_scores.midpoint.cumulative"),
        "graduation_rate": r.get("latest.completion.completion_rate_4yr_100nt"),
        "retention_rate": r.get("latest.student.retention_rate.four_year.full_time"),
        "student_faculty_ratio": r.get("latest.student.demographics.student_faculty_ratio"),
        "tuition_in_state": r.get("latest.cost.tuition.in_state"),
        "tuition_out_of_state": r.get("latest.cost.tuition.out_of_state"),
        "avg_net_price": r.get("latest.cost.avg_net_price.overall"),
        "median_debt": r.get("latest.aid.median_debt.completers.overall"),
        "median_earnings": r.get("latest.earnings.10_yrs_after_entry.median"),
        "synced_at": datetime.now(timezone.utc).isoformat(),
    }


def _compute_match(uni, profile):
    """Quick match score between a university and athlete profile."""
    score, total, reasons = 0, 100, []
    pref_div = (profile.get("division") or "").lower()
    prog_div = (uni.get("division") or "").lower()
    if pref_div and prog_div and (pref_div in prog_div or prog_div in pref_div):
        score += 30
        reasons.append("Division")
    pref_regions = profile.get("regions") or []
    region = uni.get("region", "")
    if region and (region in pref_regions or "open" in [r.lower() for r in pref_regions]):
        score += 25
        reasons.append("Location")
    for pr in (profile.get("priorities") or []):
        pr_l = pr.lower()
        if "academ" in pr_l and prog_div in ("d1", "d2"):
            score += 10; reasons.append("Academics")
        elif "athlet" in pr_l and "d1" in prog_div:
            score += 10; reasons.append("Athletics")
        elif "scholarship" in pr_l and prog_div in ("d1", "d2", "naia"):
            score += 10; reasons.append("Scholarship")
    pct = min(round(score / total * 100), 99)
    return {"score": pct, "reasons": list(set(reasons))}


@router.get("/knowledge-base/filters")
async def get_filters():
    """Return distinct conferences and regions from the knowledge base."""
    conferences = await db.university_knowledge_base.distinct("conference")
    regions = await db.university_knowledge_base.distinct("region")
    conferences = sorted([c for c in conferences if c])
    regions = sorted([r for r in regions if r])
    return {"conferences": conferences, "regions": regions}


# ── Bulk Questionnaire Discovery ──
_bulk_status = {"running": False, "processed": 0, "found": 0, "failed": 0, "total": 0}


async def _bulk_discover_questionnaires():
    """Background task: discover questionnaire URLs for all schools missing one."""
    global _bulk_status
    _bulk_status = {"running": True, "processed": 0, "found": 0, "failed": 0, "total": 0}

    schools = await db.university_knowledge_base.find(
        {"$or": [{"questionnaire_url": {"$exists": False}}, {"questionnaire_url": None}, {"questionnaire_url": ""}]},
        {"_id": 0, "domain": 1, "university_name": 1, "website": 1}
    ).to_list(5000)

    _bulk_status["total"] = len(schools)
    logger.info(f"Bulk questionnaire discovery started for {len(schools)} schools")

    for school in schools:
        domain = school.get("domain", "")
        name = school.get("university_name", "")
        website = school.get("website")
        try:
            url = await _search_questionnaire_url(name, domain, website)
            if url:
                await db.university_knowledge_base.update_one(
                    {"domain": domain},
                    {"$set": {"questionnaire_url": url}}
                )
                _bulk_status["found"] += 1
            else:
                # Mark as searched so we don't retry every time
                await db.university_knowledge_base.update_one(
                    {"domain": domain},
                    {"$set": {"questionnaire_url": ""}}
                )
        except Exception as e:
            _bulk_status["failed"] += 1
            logger.warning(f"Bulk discovery failed for {name}: {e}")

        _bulk_status["processed"] += 1

        if _bulk_status["processed"] % 50 == 0:
            logger.info(f"Bulk progress: {_bulk_status['processed']}/{_bulk_status['total']} "
                        f"(found: {_bulk_status['found']}, failed: {_bulk_status['failed']})")

        # Throttle: 4s between searches to avoid rate limiting
        await asyncio.sleep(4)

    _bulk_status["running"] = False
    logger.info(f"Bulk questionnaire discovery complete: {_bulk_status['found']} found out of {_bulk_status['total']}")


@router.post("/knowledge-base/bulk-discover-questionnaires")
async def start_bulk_discover():
    """Trigger bulk discovery of questionnaire URLs for all schools."""
    if _bulk_status["running"]:
        return {"status": "already_running", **_bulk_status}
    asyncio.create_task(_bulk_discover_questionnaires())
    return {"status": "started", "message": "Bulk discovery started in background"}


@router.get("/knowledge-base/bulk-discover-status")
async def get_bulk_discover_status():
    """Check progress of bulk questionnaire discovery."""
    return _bulk_status
