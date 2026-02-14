from fastapi import APIRouter, Request
from database import db
from auth import get_current_user, get_tenant_id
from datetime import datetime, timezone

router = APIRouter()

@router.get("/recruiting-profile")
async def get_recruiting_profile(request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    profile = await db.athlete_profiles.find_one({"tenant_id": tenant_id}, {"_id": 0})
    if not profile:
        return {"exists": False}
    return {**profile, "exists": True}

@router.post("/recruiting-profile")
async def save_recruiting_profile(request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    body = await request.json()

    profile = {
        "tenant_id": tenant_id,
        "position": body.get("position"),
        "division": body.get("division"),
        "priorities": body.get("priorities", []),
        "regions": body.get("regions", []),
        "school_size": body.get("school_size"),
        "academic_interests": body.get("academic_interests"),
        "scholarship_priority": body.get("scholarship_priority"),
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

    pref_division = (profile.get("division") or "").lower()
    pref_regions = profile.get("regions") or []
    pref_priorities = profile.get("priorities") or []
    pref_size = profile.get("school_size") or ""
    pref_scholarship = profile.get("scholarship_priority") or ""

    scores = []
    for p in programs:
        score = 0
        total_weight = 0
        match_reasons = []

        # Division match (30 pts)
        total_weight += 30
        prog_div = (p.get("division") or "").lower()
        if pref_division and prog_div:
            if pref_division in prog_div or prog_div in pref_division:
                score += 30
                match_reasons.append("Division")
            elif "d1" in pref_division and "d2" in prog_div:
                score += 10
            elif "d2" in pref_division and "d1" in prog_div:
                score += 15

        # Region match (25 pts)
        total_weight += 25
        if pref_regions:
            conf = p.get("conference", "")
            region_name = p.get("region") or conference_regions.get(conf, "")
            if region_name in pref_regions or "open" in [r.lower() for r in pref_regions]:
                score += 25
                match_reasons.append("Location")
            elif region_name:
                # Partial credit for adjacent regions
                score += 8

        # Priority alignment (30 pts)
        total_weight += 30
        priority_score = 0
        per_priority = 30 / max(len(pref_priorities), 1)

        for pr in pref_priorities:
            pr_lower = pr.lower()
            if "academ" in pr_lower:
                # Strong academic programs generally in D1/D2
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

        # School size match (15 pts)
        total_weight += 15
        if pref_size:
            # Approximate - give partial credit since we don't have exact enrollment
            score += 8  # Assume moderate match without exact data
            if pref_size == "Large (15K+)" and "d1" in prog_div:
                score += 7
            elif pref_size == "Medium (5K-15K)" and ("d2" in prog_div or "d3" in prog_div):
                score += 7
            elif pref_size == "Small (<5K)" and ("d3" in prog_div or "naia" in prog_div):
                score += 7

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
        })

    scores.sort(key=lambda x: x["match_score"], reverse=True)
    return {"scores": scores, "profile_exists": True}
