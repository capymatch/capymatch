"""
Create a comprehensive demo account for CapyMatch with all features showcased.
Email: demo@capymatch.com
"""
import bcrypt
import uuid
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017")
db = client["test_database"]

# ─── 1. CREATE USER ───
user_id = f"user_{uuid.uuid4().hex[:12]}"
tenant_id = f"tenant_{user_id}"
email = "demo@capymatch.com"
password = "demo2026"

# Remove old demo account if exists
db.users.delete_many({"email": email})
db.tenants.delete_many({"tenant_id": {"$regex": "^tenant_user_"}})
# Find and clean old demo tenant
old_user = db.users.find_one({"email": email})
if old_user:
    old_tid = f"tenant_{old_user['user_id']}"
    for col in ["programs", "interactions", "coaches", "notes", "events", "athlete_profiles", "tenants", "user_sessions", "intelligence_cache", "ai_usage", "email_settings"]:
        db[col].delete_many({"tenant_id": old_tid})

pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
db.users.insert_one({
    "user_id": user_id,
    "email": email,
    "name": "Sarah Mitchell",
    "password_hash": pw_hash,
    "auth_provider": "local",
    "created_at": datetime.now(timezone.utc).isoformat(),
    "onboarding_complete": True,
})
print(f"User created: {email} / {password} (user_id: {user_id})")

# ─── 2. CREATE TENANT ───
db.tenants.insert_one({
    "tenant_id": tenant_id,
    "owner_user_id": user_id,
    "athlete_name": "Emma Mitchell",
    "subscription_tier": "premium",
    "status": "active",
    "created_at": datetime.now(timezone.utc).isoformat(),
    "updated_at": datetime.now(timezone.utc).isoformat(),
})
print(f"Tenant created: {tenant_id}")

# ─── 3. CREATE ATHLETE PROFILE ───
db.athlete_profiles.insert_one({
    "tenant_id": tenant_id,
    "athlete_name": "Emma Mitchell",
    "questionnaire_completed": True,
    "positions": ["Outside Hitter", "Opposite Hitter"],
    "grad_year": "2027",
    "class_year": "Junior",
    "club_team": "A5 Volleyball (17 National)",
    "height": "5'11\"",
    "gpa": "3.85",
    "state": "GA",
    "preferred_regions": ["Southeast", "Northeast", "Midwest"],
    "division_preference": ["D1", "D2"],
    "academic_interests": ["Kinesiology", "Business"],
    "highlight_video": "https://www.hudl.com/video/demo",
    "created_at": datetime.now(timezone.utc).isoformat(),
})
print("Athlete profile created")

# ─── 4. CREATE SCHOOLS (10 schools at different stages) ───
now = datetime.now(timezone.utc)

schools = [
    # 1. COMMITTED — Stanford (showcase celebration)
    {
        "program_id": f"prog_{uuid.uuid4().hex[:12]}",
        "university_name": "Stanford University",
        "division": "D1",
        "conference": "Pac-12",
        "state": "CA",
        "domain": "stanford.edu",
        "coach_name": "Coach Kevin Hambly",
        "coach_email": "volleyball@stanford.edu",
        "recruiting_status": "Committed",
        "reply_status": "In Conversation",
        "board_group": "Reach",
        "is_active": True,
        "signals": {"has_first_outreach": True, "has_coach_reply": True, "has_visit": True, "has_offer": True, "committed": True},
        "notes": "Dream school! Full scholarship offered after campus visit.",
        "created_at": (now - timedelta(days=45)).isoformat(),
    },
    # 2. OFFER RECEIVED — UCLA (celebration + next steps)
    {
        "program_id": f"prog_{uuid.uuid4().hex[:12]}",
        "university_name": "UCLA",
        "division": "D1",
        "conference": "Pac-12",
        "state": "CA",
        "domain": "ucla.edu",
        "coach_name": "Coach Michael Sealy",
        "coach_email": "volleyball@ucla.edu",
        "recruiting_status": "Offer Received",
        "reply_status": "In Conversation",
        "board_group": "Reach",
        "is_active": True,
        "signals": {"has_first_outreach": True, "has_coach_reply": True, "has_visit": True, "has_offer": True},
        "notes": "Partial scholarship offered. Great program and facilities.",
        "created_at": (now - timedelta(days=40)).isoformat(),
    },
    # 3. ACTIVE CONVERSATION — Penn State (coach replied, show celebration)
    {
        "program_id": f"prog_{uuid.uuid4().hex[:12]}",
        "university_name": "Penn State",
        "division": "D1",
        "conference": "Big Ten",
        "state": "PA",
        "domain": "psu.edu",
        "coach_name": "Coach Katie Schumacher-Cawley",
        "coach_email": "volleyball@psu.edu",
        "recruiting_status": "Active Conversation",
        "reply_status": "In Conversation",
        "board_group": "Target",
        "is_active": True,
        "signals": {"has_first_outreach": True, "has_coach_reply": True, "has_visit": True},
        "notes": "Coach invited us for an unofficial visit. Very positive.",
        "created_at": (now - timedelta(days=35)).isoformat(),
    },
    # 4. ACTIVE CONVERSATION — University of Texas
    {
        "program_id": f"prog_{uuid.uuid4().hex[:12]}",
        "university_name": "University of Texas",
        "division": "D1",
        "conference": "Big 12",
        "state": "TX",
        "domain": "utexas.edu",
        "coach_name": "Coach Jerritt Elliott",
        "coach_email": "volleyball@utexas.edu",
        "recruiting_status": "Active Conversation",
        "reply_status": "In Conversation",
        "board_group": "Target",
        "is_active": True,
        "signals": {"has_first_outreach": True, "has_coach_reply": True},
        "notes": "Coach wants to see Emma play at next tournament.",
        "created_at": (now - timedelta(days=30)).isoformat(),
    },
    # 5. CAMP ATTENDED — University of Florida
    {
        "program_id": f"prog_{uuid.uuid4().hex[:12]}",
        "university_name": "University of Florida",
        "division": "D1",
        "conference": "SEC",
        "state": "FL",
        "domain": "ufl.edu",
        "coach_name": "Coach Mary Wise",
        "coach_email": "volleyball@ufl.edu",
        "recruiting_status": "Camp Attended",
        "reply_status": "Awaiting Reply",
        "board_group": "Target",
        "is_active": True,
        "signals": {"has_first_outreach": True, "has_coach_reply": False},
        "notes": "Attended summer camp. Coach watched Emma closely. Following up.",
        "created_at": (now - timedelta(days=25)).isoformat(),
    },
    # 6. SOME INTEREST — Georgia Tech (waiting on reply)
    {
        "program_id": f"prog_{uuid.uuid4().hex[:12]}",
        "university_name": "Georgia Tech",
        "division": "D1",
        "conference": "ACC",
        "state": "GA",
        "domain": "gatech.edu",
        "coach_name": "Coach Michelle Collier",
        "coach_email": "volleyball@gatech.edu",
        "recruiting_status": "Some Interest",
        "reply_status": "Awaiting Reply",
        "board_group": "Target",
        "is_active": True,
        "signals": {"has_first_outreach": True, "has_coach_reply": False},
        "notes": "Local school. Sent intro email and highlight video. Great academics.",
        "created_at": (now - timedelta(days=20)).isoformat(),
    },
    # 7. CONTACTED — Lewis University (D2, waiting)
    {
        "program_id": f"prog_{uuid.uuid4().hex[:12]}",
        "university_name": "Lewis University",
        "division": "D2",
        "conference": "GLVC",
        "state": "IL",
        "domain": "lewisu.edu",
        "coach_name": "Coach Dan Friend",
        "coach_email": "volleyball@lewisu.edu",
        "recruiting_status": "Contacted",
        "reply_status": "Awaiting Reply",
        "board_group": "Safety",
        "is_active": True,
        "signals": {"has_first_outreach": True},
        "notes": "Strong D2 program. Good academic fit.",
        "created_at": (now - timedelta(days=15)).isoformat(),
    },
    # 8. NOT CONTACTED — Johns Hopkins (D3, needs outreach)
    {
        "program_id": f"prog_{uuid.uuid4().hex[:12]}",
        "university_name": "Johns Hopkins University",
        "division": "D3",
        "conference": "Centennial",
        "state": "MD",
        "domain": "jhu.edu",
        "coach_name": "Coach Beth Dill",
        "coach_email": "volleyball@jhu.edu",
        "recruiting_status": "Not Contacted",
        "reply_status": "No Reply",
        "board_group": "Safety",
        "is_active": True,
        "signals": {},
        "notes": "Top academics. Considering for academic fit.",
        "created_at": (now - timedelta(days=10)).isoformat(),
    },
    # 9. NOT CONTACTED — University of Tampa (D2, needs outreach)
    {
        "program_id": f"prog_{uuid.uuid4().hex[:12]}",
        "university_name": "University of Tampa",
        "division": "D2",
        "conference": "SSC",
        "state": "FL",
        "domain": "ut.edu",
        "coach_name": "Coach Chris Catanach",
        "coach_email": "volleyball@ut.edu",
        "recruiting_status": "Not Contacted",
        "reply_status": "No Reply",
        "board_group": "Target",
        "is_active": True,
        "signals": {},
        "notes": "Strong D2 program in Florida. Beautiful campus.",
        "created_at": (now - timedelta(days=5)).isoformat(),
    },
    # 10. CONTACTED — Emory University (D3, replied)
    {
        "program_id": f"prog_{uuid.uuid4().hex[:12]}",
        "university_name": "Emory University",
        "division": "D3",
        "conference": "UAA",
        "state": "GA",
        "domain": "emory.edu",
        "coach_name": "Coach Jenny McDowell",
        "coach_email": "volleyball@emory.edu",
        "recruiting_status": "Active Conversation",
        "reply_status": "Reply Received",
        "board_group": "Safety",
        "is_active": True,
        "signals": {"has_first_outreach": True, "has_coach_reply": True},
        "notes": "Excellent academics. Coach is very welcoming.",
        "created_at": (now - timedelta(days=28)).isoformat(),
    },
]

for s in schools:
    s["tenant_id"] = tenant_id
    s["updated_at"] = now.isoformat()

db.programs.insert_many(schools)
print(f"Created {len(schools)} schools")

# ─── 5. CREATE INTERACTIONS (timeline entries) ───
interactions = []
program_ids = {s["university_name"]: s["program_id"] for s in schools}

def make_int(prog_name, event_type, notes, days_ago, coach_name="", outcome=""):
    return {
        "interaction_id": f"int_{uuid.uuid4().hex[:12]}",
        "tenant_id": tenant_id,
        "program_id": program_ids[prog_name],
        "university_name": prog_name,
        "type": event_type,
        "event_type": event_type,
        "notes": notes,
        "coach_email": "",
        "coach_name": coach_name,
        "outcome": outcome,
        "message_copy": "",
        "links": "",
        "date_time": (now - timedelta(days=days_ago)).isoformat(),
        "created_at": (now - timedelta(days=days_ago)).isoformat(),
    }

# Stanford timeline (Committed - full journey)
interactions += [
    make_int("Stanford University", "email_sent", "Hi Coach Hambly, my name is Emma Mitchell and I'm a junior OH from A5 Volleyball in GA. I wanted to introduce myself and share my highlight reel. I'd love to learn more about the Stanford program.", 45),
    make_int("Stanford University", "email_received", "Emma, thank you for reaching out. I've watched your highlights and I'm impressed with your court awareness. Let's set up a call to discuss the program.", 42, "Coach Hambly", "Positive Response"),
    make_int("Stanford University", "phone_call", "Had a great 30-minute call with Coach Hambly. Discussed the program culture, academic expectations, and my playing style. He invited us for a campus visit next month.", 38, outcome="Positive"),
    make_int("Stanford University", "campus_visit", "Toured campus, met the team, watched practice. Incredible facilities. Coach Hambly said Emma would be a great fit for their offensive system.", 25, outcome="Positive"),
    make_int("Stanford University", "email_received", "Emma, we'd like to extend a full scholarship offer. You'd be a tremendous addition to our program. Let's talk details.", 15, "Coach Hambly", "Offer Extended"),
    make_int("Stanford University", "email_sent", "Coach Hambly, we are thrilled to accept the offer! Emma is so excited to be a Cardinal. Thank you for believing in her.", 10),
]

# UCLA timeline (Offer Received)
interactions += [
    make_int("UCLA", "email_sent", "Hi Coach Sealy, I'm Emma Mitchell, a junior OH at A5 Volleyball. I've always admired the UCLA program and would love to be considered.", 40),
    make_int("UCLA", "email_received", "Emma, great to hear from you! Your film looks solid. We have a prospect day coming up — would you like to attend?", 37, "Coach Sealy", "Positive Response"),
    make_int("UCLA", "campus_visit", "Attended prospect day. Met the whole coaching staff. Emma got to practice with the team. Very positive experience.", 28, outcome="Positive"),
    make_int("UCLA", "email_received", "Emma, we'd like to offer you a partial scholarship. Let's schedule a call to discuss the details and answer any questions.", 18, "Coach Sealy", "Offer Extended"),
]

# Penn State timeline (Active Conversation)
interactions += [
    make_int("Penn State", "email_sent", "Coach Schumacher-Cawley, I'm Emma Mitchell from A5 Volleyball. I've been following Penn State volleyball and would love to learn more about your program.", 35),
    make_int("Penn State", "email_received", "Emma, we appreciate your interest! We've seen you play at nationals. Can you send updated stats and your schedule?", 32, "Coach Schumacher-Cawley", "Positive Response"),
    make_int("Penn State", "email_sent", "Of course! Here are my updated stats and upcoming tournament schedule. I'd love to set up a time to talk more about the program.", 31),
    make_int("Penn State", "email_received", "Thanks Emma. We'd like to invite you for an unofficial visit. How does March work for your family?", 20, "Coach Schumacher-Cawley", "Positive Response"),
    make_int("Penn State", "campus_visit", "Unofficial visit scheduled. Coach was very welcoming. Got to tour the facilities and meet current players. Team culture feels great.", 8, outcome="Positive"),
]

# University of Texas timeline
interactions += [
    make_int("University of Texas", "email_sent", "Coach Elliott, I'm reaching out to introduce myself. I'm a junior OH from GA and a big fan of the Longhorns program.", 30),
    make_int("University of Texas", "email_received", "Hi Emma, thanks for the interest. I've looked at your Hudl page. Where are you playing next? I'd like to come watch.", 26, "Coach Elliott", "Positive Response"),
    make_int("University of Texas", "email_sent", "We'll be at the JVA World Challenge in Louisville next weekend. I'll be wearing #12 for A5 17 National.", 24),
]

# Florida timeline
interactions += [
    make_int("University of Florida", "email_sent", "Coach Wise, I'm Emma Mitchell and I attended your summer camp last month. I'd love to continue the conversation about playing for the Gators.", 25),
    make_int("University of Florida", "camp", "Attended UF summer camp. Coach Wise watched Emma's group closely. Good feedback on hitting mechanics. Need to follow up.", 22, outcome="Positive"),
    make_int("University of Florida", "email_sent", "Coach Wise, thank you for the camp experience. I really enjoyed working with your staff. I wanted to follow up on next steps.", 14),
]

# Georgia Tech timeline
interactions += [
    make_int("Georgia Tech", "email_sent", "Coach Collier, I'm Emma Mitchell, a local junior OH from A5 Volleyball. I'd love to learn about the volleyball program at GT.", 20),
    make_int("Georgia Tech", "email_sent", "Following up on my email from last week. Attached is my updated highlight video and stats. Would love to set up a call.", 13),
]

# Lewis University timeline
interactions += [
    make_int("Lewis University", "email_sent", "Coach Friend, I'm interested in Lewis volleyball. I've heard great things about the GLVC. Would love to learn more.", 15),
]

# Emory timeline
interactions += [
    make_int("Emory University", "email_sent", "Coach McDowell, I'm Emma Mitchell from A5 Volleyball. Emory is one of my top academic choices and I'd love to play volleyball there.", 28),
    make_int("Emory University", "email_received", "Emma! So glad to hear from you. Emory volleyball is all about student-athletes who love the game. Tell me more about your goals.", 24, "Coach McDowell", "Positive Response"),
    make_int("Emory University", "email_sent", "I'm looking for a program that values academics equally with athletics. My GPA is 3.85 and I'm interested in Kinesiology.", 22),
    make_int("Emory University", "email_received", "That sounds perfect for our program. We have several kinesiology majors on the team. Would your family like to visit campus?", 18, "Coach McDowell", "Positive Response"),
]

db.interactions.insert_many(interactions)
print(f"Created {len(interactions)} timeline interactions")

# ─── 6. CREATE COACHES ───
coaches = []
for s in schools:
    coaches.append({
        "coach_id": f"coach_{uuid.uuid4().hex[:12]}",
        "tenant_id": tenant_id,
        "program_id": s["program_id"],
        "university_name": s["university_name"],
        "coach_name": s["coach_name"],
        "email": s["coach_email"],
        "role": "Head Coach",
        "phone": "",
        "notes": "",
        "created_at": s["created_at"],
    })
db.coaches.insert_many(coaches)
print(f"Created {len(coaches)} coaches")

# ─── 7. CREATE NOTES ───
notes = [
    {"program_id": program_ids["Stanford University"], "content": "Emma was SO happy after the campus visit. The team welcomed her like she was already part of the family. This feels like the right place.", "is_pinned": True},
    {"program_id": program_ids["UCLA"], "content": "Need to compare UCLA's partial scholarship offer with other options. Schedule a family meeting this weekend to discuss.", "is_pinned": False},
    {"program_id": program_ids["Penn State"], "content": "Coach S-C mentioned they're looking for a left-side hitter. Emma's versatility as OH/OPP could be a real advantage here.", "is_pinned": True},
    {"program_id": program_ids["University of Texas"], "content": "Coach Elliott will be at JVA Worlds. Make sure Emma warms up extra and is ready to be evaluated from the first point.", "is_pinned": False},
    {"program_id": program_ids["University of Florida"], "content": "Camp feedback: Coach Wise liked Emma's approach off the net. Need to work on serve receive consistency before next contact.", "is_pinned": False},
    {"program_id": program_ids["Emory University"], "content": "Great academic fit. Coach McDowell seems genuinely interested. This is our top D3 choice if D1 doesn't work out.", "is_pinned": True},
]
for n in notes:
    n["note_id"] = f"note_{uuid.uuid4().hex[:12]}"
    n["tenant_id"] = tenant_id
    n["created_at"] = now.isoformat()
    n["updated_at"] = now.isoformat()
db.notes.insert_many(notes)
print(f"Created {len(notes)} notes")

# ─── 8. CREATE EVENTS ───
events = [
    {
        "title": "JVA World Challenge",
        "event_type": "Tournament",
        "location": "Louisville, KY",
        "description": "Major national tournament. Coach Elliott (UT) and several other coaches will be watching.",
        "start_date": (now + timedelta(days=14)).strftime("%Y-%m-%d"),
        "end_date": (now + timedelta(days=16)).strftime("%Y-%m-%d"),
        "start_time": "08:00",
        "end_time": "18:00",
        "program_id": program_ids["University of Texas"],
        "color": "teal",
    },
    {
        "title": "Penn State Unofficial Visit",
        "event_type": "Campus Visit",
        "location": "State College, PA",
        "description": "Unofficial visit to Penn State. Tour campus, meet team, watch practice.",
        "start_date": (now + timedelta(days=21)).strftime("%Y-%m-%d"),
        "end_date": (now + timedelta(days=21)).strftime("%Y-%m-%d"),
        "start_time": "10:00",
        "end_time": "16:00",
        "program_id": program_ids["Penn State"],
        "color": "green",
    },
    {
        "title": "A5 Regional Qualifier",
        "event_type": "Tournament",
        "location": "Atlanta, GA",
        "description": "Regional qualifying tournament. Good exposure for local schools like GT and Emory.",
        "start_date": (now + timedelta(days=7)).strftime("%Y-%m-%d"),
        "end_date": (now + timedelta(days=8)).strftime("%Y-%m-%d"),
        "start_time": "09:00",
        "end_time": "17:00",
        "program_id": "",
        "color": "purple",
    },
]
for e in events:
    e["event_id"] = f"evt_{uuid.uuid4().hex[:12]}"
    e["tenant_id"] = tenant_id
    e["user_id"] = user_id
    e["created_at"] = now.isoformat()
    e["updated_at"] = now.isoformat()
db.events.insert_many(events)
print(f"Created {len(events)} events")

print()
print("=" * 50)
print(f"DEMO ACCOUNT READY")
print(f"Email:    demo@capymatch.com")
print(f"Password: demo2026")
print(f"Athlete:  Emma Mitchell (Junior OH, A5 Volleyball)")
print(f"Schools:  {len(schools)} (Committed, Offer, Active, Camp, Contacted, Not Contacted)")
print(f"Timeline: {len(interactions)} interactions across all schools")
print(f"Notes:    {len(notes)} private notes")
print(f"Events:   {len(events)} upcoming events")
print("=" * 50)
