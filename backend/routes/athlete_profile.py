from fastapi import APIRouter, Request
from database import db
from auth import get_current_user, get_tenant_id
from subscriptions import get_user_subscription
from datetime import datetime, timezone

router = APIRouter(prefix="/api")

@router.get("/recruiting-profile")
async def get_recruiting_profile(request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    profile = await db.athlete_profiles.find_one({"tenant_id": tenant_id}, {"_id": 0})
    if not profile:
        return {"exists": False, "questionnaire_completed": False}
    return {
        **profile,
        "exists": True,
        "questionnaire_completed": profile.get("questionnaire_completed", False),
    }

@router.post("/recruiting-profile")
async def save_recruiting_profile(request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    body = await request.json()

    profile = {
        "tenant_id": tenant_id,
        "position": body.get("position", []),
        "division": body.get("division", []),
        "priorities": body.get("priorities", []),
        "regions": body.get("regions", []),
        "gpa": body.get("gpa"),
        "act_score": body.get("act_score"),
        "sat_score": body.get("sat_score"),
        "academic_interests": body.get("academic_interests"),
        "questionnaire_completed": True,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.athlete_profiles.update_one(
        {"tenant_id": tenant_id},
        {"$set": profile},
        upsert=True,
    )
    return {**profile, "exists": True}

@router.get("/match-scores")
async def get_match_scores(request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)

    profile = await db.athlete_profiles.find_one({"tenant_id": tenant_id}, {"_id": 0})
    if not profile:
        return {"scores": [], "profile_exists": False}

    programs = await db.programs.find(
        {"tenant_id": tenant_id}, {"_id": 0}
    ).to_list(200)

    region_map = {
        "Northeast": ["NY", "MA", "PA", "CT", "NJ", "ME", "VT", "NH", "RI"],
        "Southeast": ["FL", "GA", "NC", "VA", "SC", "TN", "AL", "MS", "LA", "KY", "AR"],
        "Midwest": ["OH", "IL", "MI", "IN", "WI", "MN", "IA", "MO", "KS", "NE", "ND", "SD"],
        "Southwest": ["TX", "AZ", "NM", "OK"],
        "Mountain West": ["CO", "UT", "MT", "ID", "WY", "NV"],
        "West Coast": ["CA", "OR", "WA", "HI", "AK"],
    }
    region_to_name = {}
    for rname, states in region_map.items():
        for st in states:
            region_to_name[st] = rname

    # Conference to region mapping
    conference_regions = {
        "ACC": "Southeast", "SEC": "Southeast", "Big 12": "Southwest",
        "Big Ten": "Midwest", "Big East": "Northeast", "Pac-12": "West Coast",
        "Mountain West": "Mountain West", "AAC": "Southeast", "WCC": "West Coast",
        "A-10": "Northeast", "Colonial": "Northeast", "Patriot": "Northeast",
        "MAAC": "Northeast", "Missouri Valley": "Midwest", "Summit": "Midwest",
        "Horizon": "Midwest", "GLVC": "Midwest", "South Central": "Southwest",
    }

    pref_divisions = profile.get("division") or []
    # Handle legacy single-value division field
    if isinstance(pref_divisions, str):
        pref_divisions = [pref_divisions] if pref_divisions else []
    pref_divisions_lower = [d.lower() for d in pref_divisions]
    pref_regions = profile.get("regions") or []
    pref_priorities = profile.get("priorities") or []
    try:
        user_gpa = float(profile["gpa"]) if profile.get("gpa") else None
    except (ValueError, TypeError):
        user_gpa = None
    try:
        user_act = int(profile["act_score"]) if profile.get("act_score") else None
    except (ValueError, TypeError):
        user_act = None
    try:
        user_sat = int(profile["sat_score"]) if profile.get("sat_score") else None
    except (ValueError, TypeError):
        user_sat = None

    scores = []
    for p in programs:
        score = 0
        total_weight = 0
        match_reasons = []

        # Division match (30 pts)
        total_weight += 30
        prog_div = (p.get("division") or "").lower()
        if pref_divisions_lower and prog_div:
            if any(pd in prog_div or prog_div in pd for pd in pref_divisions_lower):
                score += 30
                match_reasons.append("Division Match")
            elif any(("d1" in pd and "d2" in prog_div) or ("d2" in pd and "d1" in prog_div) for pd in pref_divisions_lower):
                score += 12

        # Region match (25 pts)
        total_weight += 25
        if pref_regions:
            conf = p.get("conference", "")
            region_name = p.get("region") or conference_regions.get(conf, "")
            if region_name in pref_regions or "open" in [r.lower() for r in pref_regions]:
                score += 25
                match_reasons.append("Preferred Region")
            elif region_name:
                score += 8

        # Priority alignment (25 pts)
        total_weight += 25
        priority_score = 0
        per_priority = 25 / max(len(pref_priorities), 1)

        for pr in pref_priorities:
            pr_lower = pr.lower()
            if "academ" in pr_lower:
                if prog_div and ("d1" in prog_div or "d2" in prog_div):
                    priority_score += per_priority
                    if "Academics" not in match_reasons:
                        match_reasons.append("Academics")
            elif "athlet" in pr_lower:
                if "d1" in prog_div:
                    priority_score += per_priority
                    match_reasons.append("Athletics")
                elif "d2" in prog_div:
                    priority_score += per_priority * 0.6
            elif "scholarship" in pr_lower:
                if prog_div and ("d1" in prog_div or "d2" in prog_div or "naia" in prog_div):
                    priority_score += per_priority
                    match_reasons.append("Scholarship")
            elif "location" in pr_lower:
                conf = p.get("conference", "")
                region_name = p.get("region") or conference_regions.get(conf, "")
                if region_name in pref_regions:
                    priority_score += per_priority
            elif "campus" in pr_lower or "culture" in pr_lower:
                priority_score += per_priority * 0.5
            elif "coach" in pr_lower:
                priority_score += per_priority * 0.5
            elif "conference" in pr_lower:
                if p.get("conference"):
                    priority_score += per_priority * 0.7
            elif "playing" in pr_lower or "roster" in pr_lower:
                if "d2" in prog_div or "d3" in prog_div or "naia" in prog_div:
                    priority_score += per_priority
                else:
                    priority_score += per_priority * 0.3

        score += priority_score

        # Academic fit (20 pts) — based on GPA/ACT/SAT vs school admission data
        total_weight += 20
        academic_score = 0
        academic_checks = 0
        uni_data = p.get("scorecard_data") or {}

        if user_gpa and uni_data.get("acceptance_rate") is not None:
            academic_checks += 1
            accept_rate = uni_data["acceptance_rate"]
            if accept_rate >= 70:
                academic_score += 1.0  # Open admission — easy fit
            elif accept_rate >= 50:
                academic_score += 0.85 if user_gpa >= 3.0 else 0.5
            elif accept_rate >= 30:
                academic_score += 0.9 if user_gpa >= 3.3 else 0.5 if user_gpa >= 2.8 else 0.2
            else:
                academic_score += 0.9 if user_gpa >= 3.7 else 0.5 if user_gpa >= 3.3 else 0.1

        if user_sat and uni_data.get("sat_avg"):
            academic_checks += 1
            diff = user_sat - uni_data["sat_avg"]
            if diff >= 0:
                academic_score += 1.0
            elif diff >= -100:
                academic_score += 0.7
            elif diff >= -200:
                academic_score += 0.3
            else:
                academic_score += 0.1

        if user_act:
            academic_checks += 1
            # Estimate using division as proxy if no school-specific data
            if "d1" in prog_div:
                academic_score += 0.9 if user_act >= 24 else 0.5 if user_act >= 20 else 0.2
            elif "d2" in prog_div:
                academic_score += 0.9 if user_act >= 21 else 0.6 if user_act >= 18 else 0.3
            else:
                academic_score += 0.8

        if academic_checks > 0:
            avg_academic = academic_score / academic_checks
            pts = round(avg_academic * 20)
            score += pts
            if avg_academic >= 0.7:
                match_reasons.append("Academic Fit")

        # Calculate percentage
        pct = round((score / total_weight) * 100) if total_weight > 0 else 0
        pct = min(pct, 99)  # Cap at 99

        scores.append({
            "program_id": p.get("program_id"),
            "university_name": p.get("university_name"),
            "division": p.get("division"),
            "conference": p.get("conference"),
            "region": p.get("region"),
            "match_score": pct,
            "match_reasons": list(set(match_reasons)),
            "risk_badges": _compute_risk_badges(p, profile, match_reasons),
        })

    scores.sort(key=lambda x: x["match_score"], reverse=True)
    sub = await get_user_subscription(tenant_id)
    limit = sub.get("match_scores_limit", 3)
    if limit != -1:
        scores = scores[:limit]
    return {"scores": scores, "profile_exists": True}


def _compute_suggestion_match(school, profile):
    """Weighted match score for suggested schools — uses school-specific academic data."""
    score = 0
    total_weight = 0
    reasons = []

    pref_divisions = profile.get("division") or []
    if isinstance(pref_divisions, str):
        pref_divisions = [pref_divisions] if pref_divisions else []
    pref_divisions_upper = [d.upper() for d in pref_divisions]
    pref_regions = profile.get("regions") or []
    pref_priorities = profile.get("priorities") or []
    try:
        user_gpa = float(profile["gpa"]) if profile.get("gpa") else None
    except (ValueError, TypeError):
        user_gpa = None
    try:
        user_act = int(profile["act_score"]) if profile.get("act_score") else None
    except (ValueError, TypeError):
        user_act = None
    try:
        user_sat = int(profile["sat_score"]) if profile.get("sat_score") else None
    except (ValueError, TypeError):
        user_sat = None

    school_div = (school.get("division") or "").upper()
    school_region = school.get("region") or ""
    scorecard = school.get("scorecard") or {}

    region_aliases = {
        "West Coast": ["West"], "West": ["West"],
        "Mountain West": ["West", "Central"],
        "Southwest": ["South", "South Central"],
        "South": ["South", "South Central", "Southeast"],
        "South Central": ["South", "South Central"],
        "Northeast": ["Northeast", "East", "Atlantic"],
        "East": ["East", "Atlantic", "Northeast"],
        "Atlantic": ["Atlantic", "East"],
        "Southeast": ["Southeast", "South"],
        "Midwest": ["Midwest", "Great Lakes", "Central"],
        "Central": ["Central", "Midwest"],
        "Great Lakes": ["Great Lakes", "Midwest"],
    }

    # Division match (20 pts)
    total_weight += 20
    if pref_divisions_upper and school_div:
        if school_div in pref_divisions_upper:
            score += 20
            reasons.append("Division Match")
        elif any(("D1" in pd and school_div == "D2") or ("D2" in pd and school_div in ("D1", "D3")) for pd in pref_divisions_upper):
            score += 8

    # Region match (20 pts)
    total_weight += 20
    if pref_regions:
        matched = False
        for pref_r in pref_regions:
            aliases = region_aliases.get(pref_r, [pref_r])
            if school_region in aliases or school_region == pref_r:
                matched = True
                break
        if matched:
            score += 20
            reasons.append("Preferred Region")
        else:
            score += 4

    # Priority alignment (20 pts)
    total_weight += 20
    per_priority = 20 / max(len(pref_priorities), 1)
    for pr in pref_priorities:
        pr_lower = pr.lower()
        if "academ" in pr_lower and school_div in ("D1", "D2", "D3"):
            score += per_priority
            if "Academics" not in reasons:
                reasons.append("Academics")
        elif "athlet" in pr_lower:
            if school_div == "D1":
                score += per_priority
                if "Athletics" not in reasons:
                    reasons.append("Athletics")
            elif school_div == "D2":
                score += per_priority * 0.6
        elif "scholarship" in pr_lower and school_div in ("D1", "D2", "NAIA"):
            score += per_priority
            if "Scholarship" not in reasons:
                reasons.append("Scholarship")
        elif "location" in pr_lower:
            for pref_r in pref_regions:
                aliases = region_aliases.get(pref_r, [pref_r])
                if school_region in aliases or school_region == pref_r:
                    score += per_priority
                    break
        elif "campus" in pr_lower or "culture" in pr_lower:
            score += per_priority * 0.5
        elif "coach" in pr_lower:
            score += per_priority * 0.5
        elif "conference" in pr_lower:
            if school.get("conference"):
                score += per_priority * 0.7
        elif "playing" in pr_lower or "roster" in pr_lower:
            if school_div in ("D2", "D3", "NAIA"):
                score += per_priority
            else:
                score += per_priority * 0.3

    # Academic fit (40 pts) — tier-based with geometric mean so one weak metric pulls score down
    has_academic_data = bool(user_gpa or user_sat or user_act)
    if has_academic_data:
        total_weight += 40
    metric_scores = []

    # Division-typical benchmarks for fallback scoring
    DIV_SAT_BENCH = {"D1": 1150, "D2": 1050, "D3": 1100, "NAIA": 1000}
    DIV_ACT_BENCH = {"D1": 25, "D2": 22, "D3": 24, "NAIA": 22}
    DIV_GPA_BENCH = {"D1": 3.2, "D2": 2.9, "D3": 3.1, "NAIA": 2.8}

    # GPA tier
    if user_gpa:
        school_avg_gpa = scorecard.get("avg_gpa")
        if school_avg_gpa:
            try:
                school_avg_gpa = float(school_avg_gpa)
            except (ValueError, TypeError):
                school_avg_gpa = None
        if school_avg_gpa:
            # Best case: compare directly against school's published average GPA
            diff = user_gpa - school_avg_gpa
            if diff >= 0.3:
                metric_scores.append(1.0)
            elif diff >= 0:
                metric_scores.append(0.85)
            elif diff >= -0.3:
                metric_scores.append(0.55)
            elif diff >= -0.6:
                metric_scores.append(0.25)
            else:
                metric_scores.append(0.08)
        elif scorecard.get("admission_rate") is not None:
            # Fallback: infer from admission selectivity
            accept_rate = scorecard["admission_rate"]
            accept_pct = accept_rate * 100 if accept_rate <= 1 else accept_rate
            if accept_pct >= 70:
                metric_scores.append(1.0)
            elif accept_pct >= 50:
                metric_scores.append(0.85 if user_gpa >= 3.0 else 0.4)
            elif accept_pct >= 30:
                metric_scores.append(0.8 if user_gpa >= 3.3 else 0.4 if user_gpa >= 2.8 else 0.15)
            else:
                metric_scores.append(0.9 if user_gpa >= 3.7 else 0.4 if user_gpa >= 3.3 else 0.08)
        else:
            bench = DIV_GPA_BENCH.get(school_div, 3.0)
            diff = user_gpa - bench
            if diff >= 0.5:
                metric_scores.append(1.0)
            elif diff >= 0:
                metric_scores.append(0.8)
            elif diff >= -0.3:
                metric_scores.append(0.45)
            elif diff >= -0.7:
                metric_scores.append(0.2)
            else:
                metric_scores.append(0.05)

    # SAT tier — Strong Fit / Slight Reach / Reach / High Reach
    if user_sat:
        sat_avg = scorecard.get("sat_avg")
        if not sat_avg:
            sat_avg = DIV_SAT_BENCH.get(school_div, 1100)
        diff = user_sat - sat_avg
        if diff >= 50:
            metric_scores.append(1.0)      # Strong Fit
        elif diff >= -50:
            metric_scores.append(0.85)     # Good Fit
        elif diff >= -150:
            metric_scores.append(0.5)      # Slight Reach
        elif diff >= -250:
            metric_scores.append(0.2)      # Reach
        else:
            metric_scores.append(0.05)     # High Reach

    # ACT tier — Strong Fit / Slight Reach / Reach / High Reach
    if user_act:
        act_mid = scorecard.get("act_midpoint")
        if not act_mid:
            act_mid = DIV_ACT_BENCH.get(school_div, 24)
        diff = user_act - act_mid
        if diff >= 2:
            metric_scores.append(1.0)      # Strong Fit
        elif diff >= -1:
            metric_scores.append(0.85)     # Good Fit
        elif diff >= -3:
            metric_scores.append(0.5)      # Slight Reach
        elif diff >= -6:
            metric_scores.append(0.2)      # Reach
        else:
            metric_scores.append(0.05)     # High Reach

    if metric_scores:
        # Geometric mean: one bad metric drags the whole score down
        product = 1.0
        for ms in metric_scores:
            product *= max(ms, 0.01)
        geo_mean = product ** (1.0 / len(metric_scores))
        academic_pts = round(geo_mean * 40)
        score += academic_pts

        # Determine tier label for display
        if geo_mean >= 0.75:
            reasons.append("Strong Academic Fit")
        elif geo_mean >= 0.50:
            reasons.append("Good Academic Fit")
        elif geo_mean >= 0.35:
            reasons.append("Slight Reach")
        elif geo_mean >= 0.18:
            reasons.append("Reach")
        else:
            reasons.append("High Reach")

    pct = round((score / total_weight) * 100) if total_weight > 0 else 0
    pct = min(pct, 99)
    return {"score": pct, "reasons": reasons}



def _compute_risk_badges(school, profile, match_reasons=None):
    """Compute NCAA-aware risk badges for a school given an athlete profile."""
    badges = []
    reasons = match_reasons or []
    division = (school.get("division") or "").upper()

    # 1. Academic Reach — if match algorithm flagged Reach / High Reach
    if any(r in reasons for r in ("Reach", "High Reach")):
        badges.append({
            "key": "academic_reach",
            "label": "Academic Reach",
            "severity": "warn",
            "summary": "This school's typical admitted academic range is higher than your current profile. This doesn't mean \"no,\" but it does mean admission may be more competitive.",
        })

    # 2. Roster Tight — D1 indoor volleyball has 18-player cap
    if division == "D1":
        badges.append({
            "key": "roster_tight",
            "label": "Roster Tight",
            "severity": "info",
            "summary": "Based on public roster data, this program may have limited openings for your class year. Opportunities can change due to transfers and injuries.",
        })

    # 3. Timeline Risk — D1/D2 fill earlier; flag if athlete is junior year or later
    grad_year = profile.get("graduation_year") or profile.get("grad_year") or ""
    try:
        grad_yr = int(grad_year)
    except (ValueError, TypeError):
        grad_yr = None
    current_year = datetime.now(timezone.utc).year
    if grad_yr and division in ("D1", "D2"):
        years_out = grad_yr - current_year
        if years_out <= 2:  # Junior year or closer
            badges.append({
                "key": "timeline_risk",
                "label": "Timeline Risk",
                "severity": "time",
                "summary": "This program often fills spots earlier in the recruiting cycle. If you're interested, outreach sooner rather than later is recommended.",
            })

    # 4. Funding Dependent — equivalency sports (D2, NAIA use partial scholarships; D3 no athletic scholarships)
    if division in ("D2", "NAIA", "D3"):
        badges.append({
            "key": "funding_dependent",
            "label": "Funding Dependent",
            "severity": "funding",
            "summary": "This program typically uses partial scholarships or relies on additional funding sources. Aid packages may vary by role and timing.",
        })

    return badges



@router.get("/suggested-schools")
async def get_suggested_schools(request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)

    profile = await db.athlete_profiles.find_one({"tenant_id": tenant_id}, {"_id": 0})
    if not profile or not profile.get("questionnaire_completed"):
        return {"suggestions": [], "profile_exists": False}

    existing = await db.programs.find(
        {"tenant_id": tenant_id}, {"_id": 0, "university_name": 1}
    ).to_list(500)
    existing_names = {p["university_name"] for p in existing}

    all_schools = await db.university_knowledge_base.find({}, {"_id": 0}).to_list(2000)

    suggestions = []
    for school in all_schools:
        if school["university_name"] in existing_names:
            continue

        match = _compute_suggestion_match(school, profile)
        if match["score"] > 20:
            suggestions.append({
                "university_name": school.get("university_name"),
                "division": school.get("division"),
                "conference": school.get("conference"),
                "region": school.get("region"),
                "website": school.get("website"),
                "domain": school.get("domain"),
                "mascot": school.get("mascot"),
                "match_score": match["score"],
                "match_reasons": match["reasons"],
                "risk_badges": _compute_risk_badges(school, profile, match["reasons"]),
            })

    suggestions.sort(key=lambda x: x["match_score"], reverse=True)
    sub = await get_user_subscription(tenant_id)
    limit = sub.get("match_scores_limit", 3)
    if limit != -1:
        suggestions = suggestions[:limit]
    return {"suggestions": suggestions, "profile_exists": True}
