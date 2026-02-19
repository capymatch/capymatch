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
    """Use DuckDuckGo to find the recruiting questionnaire URL for a school."""
    try:
        from ddgs import DDGS
        from urllib.parse import urlparse
        athletics_domain = None
        if website:
            parsed = urlparse(website)
            athletics_domain = parsed.netloc or parsed.path.split("/")[0]

        # Only search with athletics domain or academic domain — both are "trusted"
        trusted_domains = [d for d in [athletics_domain, domain] if d]
        queries = []
        if athletics_domain:
            queries.append(f'site:{athletics_domain} recruiting questionnaire')
            queries.append(f'{athletics_domain} volleyball recruiting questionnaire')
        queries.append(f'site:{domain} volleyball recruiting questionnaire')

        for query in queries:
            try:
                results = list(DDGS().text(query, max_results=8, region="us-en"))
                for r in results:
                    href = r.get("href", "")
                    if not href:
                        continue
                    lower = href.lower()
                    # Only accept URLs from the school's own domains
                    if not any(td in lower for td in trusted_domains):
                        continue
                    if any(kw in lower for kw in ["questionnaire", "prospect", "recruit", "form", "interest"]):
                        return href
            except Exception:
                continue
    except Exception as e:
        logger.warning(f"Questionnaire search failed for {university_name}: {e}")
    return None


@router.get("/knowledge-base/school/{domain}")
async def get_school_by_domain(domain: str, request: Request):
    """Return a single university by its domain, with scorecard and match data if available."""
    uni = await db.university_knowledge_base.find_one({"domain": domain}, {"_id": 0})
    if not uni:
        raise HTTPException(status_code=404, detail="University not found")

    # Auto-fetch scorecard data if missing
    if not uni.get("scorecard") or not uni["scorecard"].get("synced_at"):
        scorecard = await _fetch_scorecard_for_school(uni)
        if scorecard:
            uni["scorecard"] = scorecard
            await db.university_knowledge_base.update_one(
                {"domain": domain},
                {"$set": {"scorecard": scorecard}}
            )

    # Auto-fetch questionnaire URL if missing
    if not uni.get("questionnaire_url"):
        q_url = await _search_questionnaire_url(uni.get("university_name", ""), domain, uni.get("website"))
        if q_url:
            uni["questionnaire_url"] = q_url
            await db.university_knowledge_base.update_one(
                {"domain": domain},
                {"$set": {"questionnaire_url": q_url}}
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
