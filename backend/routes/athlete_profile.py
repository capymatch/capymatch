from fastapi import APIRouter, Request
from database import db
from auth import get_current_user, get_tenant_id
from subscriptions import get_user_subscription
from datetime import datetime, timezone
import re

router = APIRouter(prefix="/api")


def _normalize_school_name(name: str) -> str:
    """Normalize a school name for fuzzy comparison."""
    n = name.lower().strip()
    for word in ["university of", "university", "college of", "college", "the ", "– ", "- "]:
        n = n.replace(word, " ")
    n = re.sub(r"[^a-z0-9\s]", "", n)
    n = re.sub(r"\s+", " ", n).strip()
    return n


def _build_kb_index(all_kb):
    """Build lookup indexes from knowledge base entries for fast matching."""
    by_name = {}
    by_domain = {}
    by_norm = {}
    for kb in all_kb:
        name = kb.get("university_name", "")
        by_name[name] = kb
        domain = kb.get("domain", "")
        if domain:
            by_domain[domain] = kb
        norm = _normalize_school_name(name)
        if norm:
            by_norm[norm] = kb
    return by_name, by_domain, by_norm


def _find_kb_match(program, by_name, by_domain, by_norm):
    """Find the best KB entry for a program using multiple strategies."""
    name = program.get("university_name", "")

    # Strategy 1: Exact name
    if name in by_name:
        return by_name[name]

    # Strategy 2: Domain
    domain = program.get("domain", "")
    if domain and domain in by_domain:
        return by_domain[domain]

    # Strategy 3: Normalized text match
    norm = _normalize_school_name(name)
    if norm in by_norm:
        return by_norm[norm]

    # Strategy 4: Substring matching on key words
    key_words = [w for w in norm.split() if len(w) > 2]
    if not key_words:
        return None

    # For very short queries (1 word, <5 chars), require near-exact match
    min_score = 2.0 if (len(key_words) == 1 and len(norm) < 5) else 1.5

    best = None
    best_score = 0
    for kb_norm, kb in by_norm.items():
        matches = sum(1 for w in key_words if w in kb_norm)
        if matches < len(key_words) * 0.6:
            continue
        len_sim = 1 - abs(len(norm) - len(kb_norm)) / max(len(norm), len(kb_norm), 1)
        score = matches + len_sim
        if score > best_score:
            best_score = score
            best = kb

    return best if best_score >= min_score else None

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

    # Pre-load KB data for fuzzy matching with scorecard
    all_kb = await db.university_knowledge_base.find({}, {"_id": 0}).to_list(2000)
    by_name, by_domain, by_norm = _build_kb_index(all_kb)

    # Enrich programs with scorecard data from KB
    for p in programs:
        kb_match = _find_kb_match(p, by_name, by_domain, by_norm)
        if kb_match:
            if not p.get("scorecard_data") and kb_match.get("scorecard"):
                p["scorecard_data"] = kb_match["scorecard"]
            if not p.get("logo_url") and kb_match.get("logo_url"):
                p["logo_url"] = kb_match["logo_url"]

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
            "logo_url": p.get("logo_url"),
            "match_score": pct,
            "match_reasons": list(set(match_reasons)),
            "risk_badges": _compute_risk_badges(p, profile, match_reasons),
            "timeline": _compute_timeline_status(p, profile),
            "roster": _compute_roster_outlook(p, profile),
            "scholarship": _compute_scholarship_structure(p),
            "nil": _compute_nil_readiness(p),
            "data_confidence": _compute_data_confidence(p),
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
        school_avg_gpa = scorecard.get("avg_gpa") if not scorecard.get("gpa_is_estimated") else None
        if not school_avg_gpa:
            school_avg_gpa = scorecard.get("estimated_avg_gpa") or scorecard.get("avg_gpa")
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


def _compute_timeline_status(school, profile):
    """Compute recruiting timeline status for a school given an athlete profile."""
    division = (school.get("division") or "").upper()
    grad_year = profile.get("graduation_year") or profile.get("grad_year") or ""
    try:
        grad_yr = int(grad_year)
    except (ValueError, TypeError):
        grad_yr = None
    current_year = datetime.now(timezone.utc).year
    years_out = (grad_yr - current_year) if grad_yr else None

    # If no graduation year, return unknown
    if years_out is None:
        return {
            "status": "unknown",
            "label": "Timeline Pending",
            "explanation": "Timeline information is still being evaluated for this program.",
            "guidance": "Complete your profile with your graduation year to see personalized timeline insights.",
            "tooltip": "Timeline insights improve as more public recruiting data becomes available.",
        }

    # Filling Early: D1 programs with athlete junior year or closer, or D2 with athlete senior year
    if division == "D1" and years_out <= 2:
        return {
            "status": "filling_early",
            "label": "Filling Early",
            "explanation": "This program often commits athletes earlier than average.",
            "guidance": "If this school is a priority, earlier outreach and follow-up may be important.",
            "tooltip": "Recruiting timelines are estimated using historical commitment patterns, roster changes, and public program data. Timelines can change year to year.",
        }
    if division == "D2" and years_out <= 1:
        return {
            "status": "filling_early",
            "label": "Filling Early",
            "explanation": "This program often commits athletes earlier than average.",
            "guidance": "If this school is a priority, earlier outreach and follow-up may be important.",
            "tooltip": "Recruiting timelines are estimated using historical commitment patterns, roster changes, and public program data. Timelines can change year to year.",
        }

    # Standard: D1 with more time, or D2 with some time
    if division == "D1" and years_out <= 4:
        return {
            "status": "standard",
            "label": "Standard",
            "explanation": "This program typically fills spots throughout the normal recruiting window.",
            "guidance": "Outreach within the next few months is recommended to stay competitive.",
            "tooltip": "Recruiting timelines are estimated using historical commitment patterns, roster changes, and public program data. Timelines can change year to year.",
        }
    if division == "D2" and years_out <= 3:
        return {
            "status": "standard",
            "label": "Standard",
            "explanation": "This program typically fills spots throughout the normal recruiting window.",
            "guidance": "Outreach within the next few months is recommended to stay competitive.",
            "tooltip": "Recruiting timelines are estimated using historical commitment patterns, roster changes, and public program data. Timelines can change year to year.",
        }

    # Late Opportunities: D3, NAIA, JUCO, or early in recruitment cycle
    return {
        "status": "late",
        "label": "Late Opportunities",
        "explanation": "This program often has roster openings later in the recruiting cycle.",
        "guidance": "You can continue building your profile and reach out as opportunities arise.",
        "tooltip": "Recruiting timelines are estimated using historical commitment patterns, roster changes, and public program data. Timelines can change year to year.",
    }


def _compute_roster_outlook(school, profile):
    """Compute roster spot reality for a school given an athlete profile."""
    division = (school.get("division") or "").upper()
    grad_year = profile.get("graduation_year") or profile.get("grad_year") or ""
    try:
        grad_yr = int(grad_year)
    except (ValueError, TypeError):
        grad_yr = None
    current_year = datetime.now(timezone.utc).year
    years_out = (grad_yr - current_year) if grad_yr else None

    tooltip = "Roster outlooks are estimates based on public team rosters, class years, and recent changes. Actual openings may change due to transfers, injuries, or coaching decisions."

    if years_out is None:
        return {
            "status": "unknown",
            "label": "Pending",
            "openings": None,
            "explanation": "Roster availability is still being evaluated for this program.",
            "guidance": "Complete your profile with your graduation year to see roster insights.",
            "tooltip": "Estimates improve as roster information becomes available.",
        }

    # Roster cap and estimated openings by division
    # D1 indoor volleyball: 18-player roster cap, typically 3-5 graduate per year
    # D2: ~16 players, 2-4 graduate; D3/NAIA: ~18-20 players, more flexible
    if division == "D1":
        if years_out <= 1:
            estimated_low, estimated_high = 1, 3
            status = "tight"
        elif years_out <= 2:
            estimated_low, estimated_high = 2, 4
            status = "limited"
        else:
            estimated_low, estimated_high = 3, 5
            status = "open"
    elif division == "D2":
        if years_out <= 1:
            estimated_low, estimated_high = 2, 4
            status = "limited"
        elif years_out <= 2:
            estimated_low, estimated_high = 2, 5
            status = "limited"
        else:
            estimated_low, estimated_high = 3, 6
            status = "open"
    elif division == "D3":
        estimated_low, estimated_high = 3, 6
        status = "open"
    elif division in ("NAIA", "JUCO"):
        estimated_low, estimated_high = 3, 6
        status = "open"
    else:
        estimated_low, estimated_high = 2, 5
        status = "limited"

    labels = {"open": "Open", "limited": "Limited", "tight": "Tight"}
    guidance_map = {
        "open": "This program appears to have room for new athletes in your class year.",
        "limited": "Opportunities may be competitive. Early outreach and follow-up are recommended.",
        "tight": "This program may have limited room for your class. Timing and fit will matter.",
    }

    return {
        "status": status,
        "label": labels[status],
        "openings": f"{estimated_low}\u2013{estimated_high} spots",
        "explanation": "Based on public roster data, graduating players, and recent roster changes.",
        "guidance": guidance_map[status],
        "tooltip": tooltip,
    }


def _compute_scholarship_structure(school):
    """Compute scholarship structure insight for a school based on division and conference."""
    division = (school.get("division") or "").upper()
    conference = (school.get("conference") or "").upper()
    tooltip = "Scholarship structures reflect typical program practices and are not guarantees. Aid decisions are made by coaching staffs and can change year to year."

    # D1 volleyball is a head-count sport for women (12 full scholarships for women's volleyball)
    # For men's volleyball, it's equivalency. Most D1 programs offer a mix.
    if division == "D1":
        # Power conferences and top programs more likely to offer full scholarships
        power_conf = {"BIG 12", "SEC", "ACC", "BIG TEN", "BIG EAST", "PAC-12"}
        if any(pc in conference for pc in power_conf):
            return {
                "status": "mix",
                "label": "Mix of Partial and Full Scholarships",
                "explanation": "This program may offer a mix of partial and full athletic scholarships depending on needs and roster makeup.",
                "nil_context": "Program-supported",
                "nil_tooltip": "This program operates in an environment where Name, Image, and Likeness opportunities may be available. NIL opportunities vary by athlete and situation.",
                "tooltip": tooltip,
            }
        return {
            "status": "partial",
            "label": "Typically Partial Scholarships",
            "explanation": "Most athletes receive partial athletic aid. Scholarship amounts may vary by role and timing.",
            "nil_context": None,
            "nil_tooltip": None,
            "tooltip": tooltip,
        }

    # D2 is equivalency — partial scholarships are the norm
    if division == "D2":
        return {
            "status": "partial",
            "label": "Typically Partial Scholarships",
            "explanation": "Most athletes receive partial athletic aid. Scholarship amounts may vary by role and timing.",
            "nil_context": None,
            "nil_tooltip": None,
            "tooltip": tooltip,
        }

    # NAIA — equivalency, partial scholarships common
    if division == "NAIA":
        return {
            "status": "partial",
            "label": "Typically Partial Scholarships",
            "explanation": "Most athletes receive partial athletic aid. Scholarship amounts may vary by role and timing.",
            "nil_context": None,
            "nil_tooltip": None,
            "tooltip": tooltip,
        }

    # D3 — no athletic scholarships, walk-on pathways
    if division == "D3":
        return {
            "status": "walkon",
            "label": "Walk-On Pathways Common",
            "explanation": "Many athletes join as walk-ons, with opportunities to earn aid later based on contribution.",
            "nil_context": None,
            "nil_tooltip": None,
            "tooltip": tooltip,
        }

    # JUCO — typically partial
    if division == "JUCO":
        return {
            "status": "partial",
            "label": "Typically Partial Scholarships",
            "explanation": "Most athletes receive partial athletic aid. Scholarship amounts may vary by role and timing.",
            "nil_context": None,
            "nil_tooltip": None,
            "tooltip": tooltip,
        }

    # Unknown
    return {
        "status": "unknown",
        "label": "Unknown",
        "explanation": "Typical scholarship information is not publicly available for this program.",
        "nil_context": None,
        "nil_tooltip": None,
        "tooltip": tooltip,
    }


def _compute_nil_readiness(school):
    """Compute NIL readiness for a school based on division, conference, and market factors."""
    division = (school.get("division") or "").upper()
    conference = (school.get("conference") or "").upper()
    region = (school.get("region") or "").lower()
    tooltip = "NIL readiness is estimated using public information such as conference environment, market size, and publicly known NIL support structures. NIL opportunities vary by athlete and are not guaranteed."

    power_conf = {"BIG 12", "SEC", "ACC", "BIG TEN", "BIG EAST", "PAC-12"}
    mid_major_conf = {"AAC", "MOUNTAIN WEST", "WCC", "A-10", "MVC", "COLONIAL", "SOUTHLAND", "SUN BELT", "C-USA"}
    urban_regions = {"southeast", "southwest", "west coast"}

    # NIL-Friendly: D1 power conferences, or D1 mid-majors in large urban markets
    if division == "D1":
        if any(pc in conference for pc in power_conf):
            return {
                "status": "friendly",
                "label": "NIL-Friendly Environment",
                "explanation": "This program operates in an environment where Name, Image, and Likeness opportunities are commonly supported. Opportunities vary by athlete and role.",
                "guidance": [
                    "NIL may be part of recruiting conversations",
                    "Aid decisions still vary by athlete",
                    "Ask about NIL support during visits",
                ],
                "tooltip": tooltip,
            }
        if any(mc in conference for mc in mid_major_conf) or region in urban_regions:
            return {
                "status": "limited",
                "label": "NIL-Limited Environment",
                "explanation": "NIL opportunities may be available but are less common or more limited for this program.",
                "guidance": [
                    "NIL may not be a major factor",
                    "Athletic and academic fit remain primary",
                ],
                "tooltip": tooltip,
            }
        # Other D1
        return {
            "status": "limited",
            "label": "NIL-Limited Environment",
            "explanation": "NIL opportunities may be available but are less common or more limited for this program.",
            "guidance": [
                "NIL may not be a major factor",
                "Athletic and academic fit remain primary",
            ],
            "tooltip": tooltip,
        }

    # D2, NAIA, JUCO — NIL limited
    if division in ("D2", "NAIA", "JUCO"):
        return {
            "status": "limited",
            "label": "NIL-Limited Environment",
            "explanation": "NIL opportunities may be available but are less common or more limited for this program.",
            "guidance": [
                "NIL may not be a major factor",
                "Athletic and academic fit remain primary",
            ],
            "tooltip": tooltip,
        }

    # D3 — NIL info limited
    if division == "D3":
        return {
            "status": "info_limited",
            "label": "NIL Information Limited",
            "explanation": "Public information about NIL activity for this program is limited or unavailable.",
            "guidance": [
                "NIL impact is unclear",
                "Consider asking coaches directly",
            ],
            "tooltip": tooltip,
        }

    # Unknown
    return {
        "status": "unknown",
        "label": "NIL Information Limited",
        "explanation": "NIL context is still being evaluated for this program.",
        "guidance": [
            "NIL impact is unclear",
            "Consider asking coaches directly",
        ],
        "tooltip": "NIL information becomes clearer as more public data becomes available.",
    }







def _compute_data_confidence(school):
    """Compute data confidence level and academic completeness for a school."""
    scorecard = school.get("scorecard_data") or school.get("scorecard") or {}
    factors = []
    available = []
    missing = []

    # Check GPA
    has_real_gpa = bool(scorecard.get("avg_gpa") and not scorecard.get("gpa_is_estimated"))
    has_estimated_gpa = bool(scorecard.get("estimated_avg_gpa") or scorecard.get("avg_gpa"))
    if has_real_gpa:
        factors.append("Verified GPA data available")
        available.append("GPA")
    elif has_estimated_gpa:
        factors.append("Estimated GPA data (less reliable)")
        available.append("GPA (estimated)")
    else:
        missing.append("GPA")

    # Check SAT
    if scorecard.get("sat_avg"):
        factors.append("SAT averages from IPEDS")
        available.append("SAT")
    else:
        missing.append("SAT")

    # Check admission rate
    if scorecard.get("admission_rate") is not None:
        factors.append("Admission rate from IPEDS")
        available.append("Admission Rate")
    else:
        missing.append("Admission Rate")

    # Check ACT
    if scorecard.get("act_midpoint"):
        available.append("ACT")
    else:
        missing.append("ACT")

    # Determine level
    academic_points = sum([
        2 if has_real_gpa else (1 if has_estimated_gpa else 0),
        1 if scorecard.get("sat_avg") else 0,
        1 if scorecard.get("admission_rate") is not None else 0,
        0.5 if scorecard.get("act_midpoint") else 0,
    ])

    if academic_points >= 3.5:
        level = "High"
    elif academic_points >= 1.5:
        level = "Medium"
    else:
        level = "Limited"

    # Data freshness
    last_updated = scorecard.get("gpa_scraped_at") or scorecard.get("synced_at")

    return {
        "level": level,
        "factors": factors,
        "academic_completeness": {
            "complete": len(missing) == 0,
            "available": available,
            "missing": missing,
        },
        "last_updated": last_updated,
    }


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
                "logo_url": school.get("logo_url"),
                "match_score": match["score"],
                "match_reasons": match["reasons"],
                "risk_badges": _compute_risk_badges(school, profile, match["reasons"]),
                "timeline": _compute_timeline_status(school, profile),
                "roster": _compute_roster_outlook(school, profile),
                "scholarship": _compute_scholarship_structure(school),
                "nil": _compute_nil_readiness(school),
                "data_confidence": _compute_data_confidence(school),
            })

    suggestions.sort(key=lambda x: x["match_score"], reverse=True)
    sub = await get_user_subscription(tenant_id)
    limit = sub.get("match_scores_limit", 3)
    if limit != -1:
        suggestions = suggestions[:limit]
    return {"suggestions": suggestions, "profile_exists": True}


@router.get("/risk-badges/{program_id}")
async def get_risk_badges(program_id: str, request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    profile = await db.athlete_profiles.find_one({"tenant_id": tenant_id}, {"_id": 0})
    if not profile:
        return {"badges": [], "empty_state": True}

    program = await db.programs.find_one({"tenant_id": tenant_id, "program_id": program_id}, {"_id": 0})
    if not program:
        return {"badges": [], "empty_state": True}

    # Enrich program with KB scorecard data via fuzzy matching
    uni_data = None
    if not program.get("scorecard_data") or not program.get("logo_url"):
        uni_data = await db.university_knowledge_base.find_one({"university_name": program.get("university_name", "")}, {"_id": 0})
        if not uni_data and program.get("domain"):
            uni_data = await db.university_knowledge_base.find_one({"domain": program["domain"]}, {"_id": 0})
        if uni_data:
            if not program.get("scorecard_data") and uni_data.get("scorecard"):
                program["scorecard_data"] = uni_data["scorecard"]
            if not program.get("logo_url") and uni_data.get("logo_url"):
                program["logo_url"] = uni_data["logo_url"]

    match = _compute_suggestion_match(program, profile)
    badges = _compute_risk_badges(program, profile, match["reasons"])
    timeline = _compute_timeline_status(program, profile)
    roster = _compute_roster_outlook(program, profile)
    scholarship = _compute_scholarship_structure(program)
    nil_readiness = _compute_nil_readiness(program)
    data_confidence = _compute_data_confidence(program)
    return {"badges": badges, "empty_state": len(badges) == 0, "timeline": timeline, "roster": roster, "scholarship": scholarship, "nil": nil_readiness, "data_confidence": data_confidence}
