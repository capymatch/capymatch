from fastapi import APIRouter, HTTPException, Request
from typing import Optional
from datetime import datetime, timezone
from database import db
from auth import get_current_user, get_tenant_id
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")


@router.get("/knowledge-base")
async def list_knowledge_base(division: Optional[str] = None, conference: Optional[str] = None, region: Optional[str] = None, search: Optional[str] = None):
    query = {}
    if division:
        query["division"] = division
    if conference:
        query["conference"] = {"$regex": conference, "$options": "i"}
    if region:
        query["region"] = {"$regex": region, "$options": "i"}
    if search:
        query["university_name"] = {"$regex": search, "$options": "i"}
    universities = await db.university_knowledge_base.find(query, {"_id": 0}).sort("university_name", 1).to_list(2000)
    return universities


@router.post("/knowledge-base/add-to-board")
async def add_to_board(request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
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
        "mascot": uni.get("mascot", ""),
        "program_interest": "",
        "recruiting_status": "Not Contacted",
        "reply_status": "No Reply",
        "priority": "Medium",
        "initial_contact_sent": "",
        "last_follow_up": "",
        "follow_up_days": 14,
        "next_action": "",
        "next_action_due": "",
        "scholarship_type": "",
        "roster_needs": "",
        "events_seen": "",
        "video_link": "",
        "coach_contract_expiration": "",
        "notes": uni.get("notes", ""),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.programs.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.post("/seed")
async def seed_data():
    count = await db.university_knowledge_base.count_documents({})
    if count > 0:
        return {"message": f"Knowledge base already has {count} universities", "seeded": False}
    universities = [
        {"university_name": "University of Nebraska", "division": "D1", "conference": "Big Ten", "region": "Midwest", "website": "https://huskers.com", "mascot": "Cornhuskers", "notes": "Top D1 volleyball program"},
        {"university_name": "Stanford University", "division": "D1", "conference": "Pac-12", "region": "West", "website": "https://gostanford.com", "mascot": "Cardinal", "notes": ""},
        {"university_name": "University of Texas", "division": "D1", "conference": "Big 12", "region": "South Central", "website": "https://texassports.com", "mascot": "Longhorns", "notes": ""},
        {"university_name": "Penn State University", "division": "D1", "conference": "Big Ten", "region": "East", "website": "https://gopsusports.com", "mascot": "Nittany Lions", "notes": ""},
        {"university_name": "University of Wisconsin", "division": "D1", "conference": "Big Ten", "region": "Midwest", "website": "https://uwbadgers.com", "mascot": "Badgers", "notes": ""},
        {"university_name": "University of Minnesota", "division": "D1", "conference": "Big Ten", "region": "Midwest", "website": "https://gophersports.com", "mascot": "Golden Gophers", "notes": ""},
        {"university_name": "University of Pittsburgh", "division": "D1", "conference": "ACC", "region": "East", "website": "https://pittsburghpanthers.com", "mascot": "Panthers", "notes": ""},
        {"university_name": "Baylor University", "division": "D1", "conference": "Big 12", "region": "South Central", "website": "https://baylorbears.com", "mascot": "Bears", "notes": ""},
        {"university_name": "University of Louisville", "division": "D1", "conference": "ACC", "region": "Southeast", "website": "https://gocards.com", "mascot": "Cardinals", "notes": ""},
        {"university_name": "University of Florida", "division": "D1", "conference": "SEC", "region": "Southeast", "website": "https://floridagators.com", "mascot": "Gators", "notes": ""},
        {"university_name": "Ohio State University", "division": "D1", "conference": "Big Ten", "region": "Midwest", "website": "https://ohiostatebuckeyes.com", "mascot": "Buckeyes", "notes": ""},
        {"university_name": "University of Kentucky", "division": "D1", "conference": "SEC", "region": "Southeast", "website": "https://ukathletics.com", "mascot": "Wildcats", "notes": ""},
        {"university_name": "Purdue University", "division": "D1", "conference": "Big Ten", "region": "Midwest", "website": "https://purduesports.com", "mascot": "Boilermakers", "notes": ""},
        {"university_name": "Creighton University", "division": "D1", "conference": "Big East", "region": "Midwest", "website": "https://gocreighton.com", "mascot": "Bluejays", "notes": ""},
        {"university_name": "University of Washington", "division": "D1", "conference": "Pac-12", "region": "West", "website": "https://gohuskies.com", "mascot": "Huskies", "notes": ""},
        {"university_name": "BYU", "division": "D1", "conference": "Big 12", "region": "West", "website": "https://byucougars.com", "mascot": "Cougars", "notes": ""},
        {"university_name": "University of Southern California", "division": "D1", "conference": "Big Ten", "region": "West", "website": "https://usctrojans.com", "mascot": "Trojans", "notes": ""},
        {"university_name": "Florida State University", "division": "D1", "conference": "ACC", "region": "Southeast", "website": "https://seminoles.com", "mascot": "Seminoles", "notes": ""},
        {"university_name": "University of Georgia", "division": "D1", "conference": "SEC", "region": "Southeast", "website": "https://georgiadogs.com", "mascot": "Bulldogs", "notes": ""},
        {"university_name": "Michigan State University", "division": "D1", "conference": "Big Ten", "region": "Midwest", "website": "https://msuspartans.com", "mascot": "Spartans", "notes": ""},
        {"university_name": "University of Tampa", "division": "D2", "conference": "Sunshine State", "region": "Southeast", "website": "https://tampaspartans.com", "mascot": "Spartans", "notes": ""},
        {"university_name": "Concordia-St. Paul", "division": "D2", "conference": "NSIC", "region": "Midwest", "website": "https://cusp.edu", "mascot": "Golden Bears", "notes": ""},
        {"university_name": "University of Nebraska-Kearney", "division": "D2", "conference": "MIAA", "region": "Midwest", "website": "https://unklopers.com", "mascot": "Lopers", "notes": ""},
        {"university_name": "Minnesota Duluth", "division": "D2", "conference": "NSIC", "region": "Midwest", "website": "https://umdbulldogs.com", "mascot": "Bulldogs", "notes": ""},
        {"university_name": "Southwest Minnesota State", "division": "D2", "conference": "NSIC", "region": "Midwest", "website": "https://smsumustangs.com", "mascot": "Mustangs", "notes": ""},
        {"university_name": "Regis University", "division": "D2", "conference": "RMAC", "region": "West", "website": "https://regisrangers.com", "mascot": "Rangers", "notes": ""},
        {"university_name": "Washburn University", "division": "D2", "conference": "MIAA", "region": "Midwest", "website": "https://wusports.com", "mascot": "Ichabods", "notes": ""},
        {"university_name": "Lewis University", "division": "D2", "conference": "GLVC", "region": "Midwest", "website": "https://lewisflyers.com", "mascot": "Flyers", "notes": ""},
        {"university_name": "Cal State San Bernardino", "division": "D2", "conference": "CCAA", "region": "West", "website": "https://csusbathletics.com", "mascot": "Coyotes", "notes": ""},
        {"university_name": "Wingate University", "division": "D2", "conference": "SAC", "region": "Southeast", "website": "https://wingatebulldogs.com", "mascot": "Bulldogs", "notes": ""},
        {"university_name": "Calvin University", "division": "D3", "conference": "MIAA", "region": "Midwest", "website": "https://calvinknights.com", "mascot": "Knights", "notes": ""},
        {"university_name": "Claremont-Mudd-Scripps", "division": "D3", "conference": "SCIAC", "region": "West", "website": "https://cmsathletics.com", "mascot": "Stags/Athenas", "notes": ""},
        {"university_name": "Emory University", "division": "D3", "conference": "UAA", "region": "Southeast", "website": "https://emoryathletics.com", "mascot": "Eagles", "notes": ""},
        {"university_name": "Juniata College", "division": "D3", "conference": "Landmark", "region": "East", "website": "https://juniataeagles.com", "mascot": "Eagles", "notes": ""},
        {"university_name": "Trinity University", "division": "D3", "conference": "SCAC", "region": "South Central", "website": "https://trinitytigers.com", "mascot": "Tigers", "notes": ""},
        {"university_name": "Wittenberg University", "division": "D3", "conference": "NCAC", "region": "Midwest", "website": "https://wittenbergtigers.com", "mascot": "Tigers", "notes": ""},
        {"university_name": "Hope College", "division": "D3", "conference": "MIAA", "region": "Midwest", "website": "https://hopeathletics.com", "mascot": "Flying Dutch", "notes": ""},
        {"university_name": "Washington University in St. Louis", "division": "D3", "conference": "UAA", "region": "Midwest", "website": "https://wustlbears.com", "mascot": "Bears", "notes": ""},
        {"university_name": "Johns Hopkins University", "division": "D3", "conference": "Centennial", "region": "East", "website": "https://hopkinssports.com", "mascot": "Blue Jays", "notes": ""},
        {"university_name": "MIT", "division": "D3", "conference": "NEWMAC", "region": "Northeast", "website": "https://mitathletics.com", "mascot": "Engineers", "notes": ""},
        {"university_name": "Berry College", "division": "D3", "conference": "SAA", "region": "Southeast", "website": "https://berryathletics.com", "mascot": "Vikings", "notes": ""},
        {"university_name": "Pomona-Pitzer Colleges", "division": "D3", "conference": "SCIAC", "region": "West", "website": "https://sagehens.com", "mascot": "Sagehens", "notes": ""},
        {"university_name": "Tufts University", "division": "D3", "conference": "NESCAC", "region": "Northeast", "website": "https://tuftsjumbos.com", "mascot": "Jumbos", "notes": ""},
        {"university_name": "University of Chicago", "division": "D3", "conference": "UAA", "region": "Midwest", "website": "https://uchicagoathletics.com", "mascot": "Maroons", "notes": ""},
        {"university_name": "Bowdoin College", "division": "D3", "conference": "NESCAC", "region": "Northeast", "website": "https://bowdoinbears.com", "mascot": "Polar Bears", "notes": ""},
    ]
    await db.university_knowledge_base.insert_many(universities)
    return {"message": f"Seeded {len(universities)} universities", "seeded": True}
