"""
Demo Data Seed Script for douglas@yeslms.com
Seeds 8 schools across all pipeline stages with realistic data
"""
import asyncio, os, uuid
from datetime import datetime, timezone, timedelta

os.environ['MONGO_URL'] = 'mongodb://localhost:27017'
os.environ['DB_NAME'] = 'test_database'
from database import db

USER_ID = 'user_02cfb4bd2d19'
TENANT_ID = 'tenant_e724b777ce6e'

def uid(): return str(uuid.uuid4())[:12]
def now(): return datetime.now(timezone.utc)
def ago(days): return (now() - timedelta(days=days)).isoformat()
def prog_id(): return f"prog_{uid()}"
def int_id(): return f"int_{uid()}"
def coach_id(): return f"coach_{uid()}"
def note_id(): return f"note_{uid()}"
def evt_id(): return f"evt_{uid()}"

# ═══════════════════════════════════════════════
# SCHOOL DEFINITIONS (8 schools, all stages)
# ═══════════════════════════════════════════════
SCHOOLS = [
    {
        "university_name": "Stanford University",
        "division": "D1", "conference": "ACC", "region": "West",
        "domain": "stanford.edu", "website": "https://gostanford.com",
        "recruiting_status": "Closed",
        "reply_status": "Replied",
        "priority": "High",
        "scholarship_type": "Athletic + Academic",
        "notes": "Clara's dream school — COMMITTED! Full ride scholarship.",
        "created_days_ago": 90,
        "coaches": [
            {"name": "Kevin Hambly", "role": "Head Coach", "email": "khambly@stanford.edu", "phone": "650-723-4591"},
            {"name": "Jessica Franklin", "role": "Recruiting Coordinator", "email": "jfranklin@stanford.edu", "phone": "650-723-4592"},
        ],
        "interactions": [
            {"type": "Email", "outcome": "Sent", "notes": "Initial intro email with highlight reel and academic transcript", "days_ago": 85, "message_copy": "Dear Coach Hambly,\n\nMy name is Clara Gimenes, a Class of 2027 Libero from Munciana VBC in Indiana. I'm reaching out because Stanford's volleyball program and academic excellence are exactly what I'm looking for in my college experience.\n\nI currently have a 3.8 GPA and have been a starter since my freshman year. I'd love the opportunity to discuss how I might contribute to the Cardinal program.\n\nHighlight reel: [link]\n\nThank you for your time,\nClara Gimenes"},
            {"type": "Email", "outcome": "Positive Response", "notes": "Coach Hambly replied! Wants to see Clara play at nationals", "days_ago": 80},
            {"type": "Phone Call", "outcome": "Positive Response", "notes": "30-min call with Coach Franklin. Discussed academic interests, position needs. They have a spot for a libero in 2027 class.", "days_ago": 72},
            {"type": "Campus Visit", "outcome": "Positive Response", "notes": "Official visit — toured campus, met team, watched practice. Clara loved the culture and facilities.", "days_ago": 55},
            {"type": "Email", "outcome": "Positive Response", "notes": "Coach Hambly extended verbal offer! Full athletic scholarship with academic enhancement.", "days_ago": 40},
            {"type": "Phone Call", "outcome": "Positive Response", "notes": "Family call with coaching staff to discuss scholarship details, NLI timeline, and housing.", "days_ago": 35},
            {"type": "Email", "outcome": "Positive Response", "notes": "Clara verbally committed to Stanford! NLI signing scheduled for November.", "days_ago": 14},
        ],
        "private_notes": [
            {"content": "This is Clara's dream school. The campus visit sealed the deal — she connected instantly with the team.", "pinned": True, "days_ago": 55},
            {"content": "Scholarship covers full tuition + room & board. Academic enhancement adds book stipend.", "pinned": False, "days_ago": 38},
            {"content": "NLI signing day is November 13. Need to coordinate with high school for ceremony.", "pinned": True, "days_ago": 10},
        ],
        "events": [
            {"title": "Stanford Official Visit", "type": "Campus Visit", "days_ago": 55, "location": "Stanford, CA", "color": "purple"},
            {"title": "NLI Signing Day", "type": "Other", "days_from_now": 30, "location": "Lincoln High School", "color": "green"},
        ],
    },
    {
        "university_name": "University of Texas – Austin",
        "division": "D1", "conference": "SEC", "region": "South",
        "domain": "utexas.edu", "website": "https://texassports.com",
        "recruiting_status": "Offer Received",
        "reply_status": "Replied",
        "priority": "High",
        "scholarship_type": "Athletic",
        "notes": "Received scholarship offer. Considering alongside Stanford.",
        "created_days_ago": 75,
        "coaches": [
            {"name": "Jerritt Elliott", "role": "Head Coach", "email": "jelliott@athletics.utexas.edu", "phone": "512-471-7892"},
            {"name": "Nicole Walch", "role": "Assistant Coach", "email": "nwalch@athletics.utexas.edu", "phone": "512-471-7893"},
        ],
        "interactions": [
            {"type": "Email", "outcome": "Sent", "notes": "Intro email sent with highlight reel", "days_ago": 70},
            {"type": "Email", "outcome": "Positive Response", "notes": "Coach Elliott responded — impressed with defensive stats", "days_ago": 65},
            {"type": "Phone Call", "outcome": "Positive Response", "notes": "Call with Coach Walch about program culture and academic support", "days_ago": 58},
            {"type": "Campus Visit", "outcome": "Positive Response", "notes": "Unofficial visit. Great facilities, Austin is amazing.", "days_ago": 42},
            {"type": "Email", "outcome": "Positive Response", "notes": "Received partial athletic scholarship offer!", "days_ago": 20},
        ],
        "private_notes": [
            {"content": "Texas offer is good but not full ride like Stanford. Coach Elliott is incredibly passionate.", "pinned": True, "days_ago": 19},
            {"content": "Austin campus is beautiful. Clara liked the team dynamics but Stanford is still #1.", "pinned": False, "days_ago": 42},
        ],
        "events": [
            {"title": "Texas Unofficial Visit", "type": "Campus Visit", "days_ago": 42, "location": "Austin, TX", "color": "orange"},
        ],
    },
    {
        "university_name": "University of California – Los Angeles – UCLA",
        "division": "D1", "conference": "Big Ten", "region": "West",
        "domain": "ucla.edu", "website": "https://uclabruins.com",
        "recruiting_status": "Actively Recruiting",
        "reply_status": "Replied",
        "priority": "High",
        "notes": "Active back-and-forth with coaching staff. Visit being planned.",
        "created_days_ago": 60,
        "coaches": [
            {"name": "Alfee Reft", "role": "Head Coach", "email": "uclawvb@athletics.ucla.edu", "phone": "310-825-8699"},
            {"name": "Megan Higgins", "role": "Recruiting Coordinator", "email": "mhiggins@athletics.ucla.edu", "phone": "310-825-8700"},
        ],
        "interactions": [
            {"type": "Email", "outcome": "Sent", "notes": "Intro email to Coach Reft", "days_ago": 55},
            {"type": "Email", "outcome": "Positive Response", "notes": "Coach Reft replied — wants to see Clara at AAU nationals", "days_ago": 48},
            {"type": "Phone Call", "outcome": "Positive Response", "notes": "Spoke with Megan about recruiting timeline and academic requirements", "days_ago": 35},
            {"type": "Email", "outcome": "Sent", "notes": "Sent updated stats and fall tournament schedule", "days_ago": 15},
            {"type": "Email", "outcome": "Positive Response", "notes": "Coach wants to schedule official visit in March", "days_ago": 5},
        ],
        "private_notes": [
            {"content": "UCLA program is on the rise under Coach Reft. Love the LA location.", "pinned": False, "days_ago": 48},
            {"content": "Need to coordinate March visit date with school schedule.", "pinned": True, "days_ago": 4},
        ],
        "events": [
            {"title": "UCLA Official Visit", "type": "Campus Visit", "days_from_now": 25, "location": "Los Angeles, CA", "color": "blue"},
        ],
    },
    {
        "university_name": "University of Michigan",
        "division": "D1", "conference": "Big Ten", "region": "Midwest",
        "domain": "umich.edu", "website": "https://mgoblue.com",
        "recruiting_status": "In Conversation",
        "reply_status": "Replied",
        "priority": "Medium",
        "notes": "Coach replied to intro email. Building relationship.",
        "created_days_ago": 45,
        "coaches": [
            {"name": "Mark Rosen", "role": "Head Coach", "email": "mrosen@umich.edu", "phone": "734-647-1227"},
        ],
        "interactions": [
            {"type": "Email", "outcome": "Sent", "notes": "Intro email with highlight reel and tournament schedule", "days_ago": 40},
            {"type": "Email", "outcome": "Positive Response", "notes": "Coach Rosen responded — asked for updated stats and GPA", "days_ago": 30},
            {"type": "Email", "outcome": "Sent", "notes": "Sent updated academic transcript and fall schedule", "days_ago": 25},
        ],
        "private_notes": [
            {"content": "Michigan academics are top-notch. Good backup option if Stanford doesn't work out.", "pinned": False, "days_ago": 28},
        ],
        "events": [],
    },
    {
        "university_name": "Duke University",
        "division": "D1", "conference": "ACC", "region": "South",
        "domain": "duke.edu", "website": "https://goduke.com",
        "recruiting_status": "Contacted",
        "reply_status": "No Reply",
        "priority": "Medium",
        "notes": "Intro email sent. No reply yet — follow-up scheduled.",
        "created_days_ago": 20,
        "coaches": [
            {"name": "Rachel Goodson", "role": "Head Coach", "email": "rgoodson@duke.edu", "phone": "919-684-2211"},
            {"name": "Tim Allen", "role": "Assistant Coach", "email": "tallen@duke.edu", "phone": "919-684-2212"},
        ],
        "interactions": [
            {"type": "Email", "outcome": "Sent", "notes": "Sent introductory email with highlight video and stats sheet", "days_ago": 15, "message_copy": "Dear Coach Goodson,\n\nI'm Clara Gimenes, a 2027 Libero from Munciana VBC. I'm very interested in Duke's volleyball program and world-class academics.\n\nMy highlight reel and stats are attached. I'd love to learn more about the program.\n\nBest,\nClara Gimenes"},
        ],
        "private_notes": [
            {"content": "Duke would be amazing for pre-med track. Follow up if no reply by next week.", "pinned": False, "days_ago": 12},
        ],
        "events": [],
        "follow_up_due": 2,
    },
    {
        "university_name": "Florida State University",
        "division": "D1", "conference": "ACC", "region": "South",
        "domain": "fsu.edu", "website": "https://seminoles.com",
        "recruiting_status": "Contacted",
        "reply_status": "No Reply",
        "priority": "Medium",
        "notes": "Initial outreach sent. Camp registration in progress.",
        "created_days_ago": 18,
        "coaches": [
            {"name": "Lindsay Allman", "role": "Head Coach", "email": "Lmallman@fsu.edu", "phone": "850-644-1079"},
        ],
        "interactions": [
            {"type": "Email", "outcome": "Sent", "notes": "Intro email to Coach Allman with highlight reel", "days_ago": 12},
        ],
        "private_notes": [],
        "events": [
            {"title": "FSU Volleyball Camp", "type": "Camp", "days_from_now": 45, "location": "Tallahassee, FL", "color": "red"},
        ],
        "follow_up_due": 0,
    },
    {
        "university_name": "Ohio State University",
        "division": "D1", "conference": "Big Ten", "region": "Midwest",
        "domain": "osu.edu", "website": "https://ohiostatebuckeyes.com",
        "recruiting_status": "Not Contacted",
        "reply_status": "No Reply",
        "priority": "Medium",
        "notes": "",
        "created_days_ago": 5,
        "coaches": [
            {"name": "Jen Flynn Oldenburg", "role": "Head Coach", "email": "oldenburg.3@osu.edu", "phone": "614-292-0711"},
        ],
        "interactions": [],
        "private_notes": [
            {"content": "Just added to board. Need to research the program and draft intro email.", "pinned": False, "days_ago": 4},
        ],
        "events": [],
    },
    {
        "university_name": "Penn State",
        "division": "D1", "conference": "Big Ten", "region": "Northeast",
        "domain": "penn.edu", "website": "https://gopsusports.com",
        "recruiting_status": "Not Contacted",
        "reply_status": "No Reply",
        "priority": "Low",
        "notes": "",
        "created_days_ago": 3,
        "coaches": [
            {"name": "Russ Rose", "role": "Head Coach", "email": "rrose@psu.edu", "phone": "814-865-5464"},
        ],
        "interactions": [],
        "private_notes": [],
        "events": [],
    },
]

async def seed():
    print("=== Starting demo data seed ===\n")

    # Clean existing data for this tenant
    for coll in ['programs', 'coaches', 'interactions', 'notes', 'events']:
        r = await db[coll].delete_many({'tenant_id': TENANT_ID})
        print(f"Cleaned {coll}: {r.deleted_count}")

    # Also ensure questionnaire is completed for this user
    await db.users.update_one(
        {'user_id': USER_ID},
        {'$set': {'questionnaire_completed': True, 'onboarding_completed': True}}
    )
    print("Set user questionnaire_completed=True\n")

    for school in SCHOOLS:
        pid = prog_id()
        created = ago(school['created_days_ago'])

        # Create program
        program = {
            "program_id": pid,
            "tenant_id": TENANT_ID,
            "university_name": school["university_name"],
            "division": school["division"],
            "conference": school["conference"],
            "region": school["region"],
            "website": school.get("website", ""),
            "mascot": "",
            "program_interest": "",
            "recruiting_status": school["recruiting_status"],
            "reply_status": school.get("reply_status", "No Reply"),
            "priority": school.get("priority", "Medium"),
            "initial_contact_sent": ago(school["interactions"][0]["days_ago"]) if school["interactions"] else "",
            "last_follow_up": ago(school["interactions"][-1]["days_ago"]) if school["interactions"] else "",
            "follow_up_days": 14,
            "next_action": "",
            "next_action_due": "",
            "scholarship_type": school.get("scholarship_type", ""),
            "roster_needs": "",
            "events_seen": "",
            "video_link": "",
            "coach_contract_expiration": "",
            "notes": school.get("notes", ""),
            "created_at": created,
            "domain": school["domain"],
        }

        # Set follow-up due if specified
        if "follow_up_due" in school:
            program["next_action"] = "Send follow-up email"
            program["next_action_due"] = ago(-school["follow_up_due"])  # negative = future

        # Set committed fields
        if school["recruiting_status"] == "Closed":
            program["committed"] = True
            program["committed_at"] = ago(14)

        await db.programs.insert_one(program)
        print(f"[+] {school['university_name']} — {school['recruiting_status']}")

        # Create coaches
        for c in school.get("coaches", []):
            await db.coaches.insert_one({
                "program_id": pid,
                "university_name": school["university_name"],
                "coach_name": c["name"],
                "role": c["role"],
                "email": c["email"],
                "phone": c.get("phone", ""),
                "notes": "",
                "coach_id": coach_id(),
                "tenant_id": TENANT_ID,
                "created_at": created,
            })

        # Create interactions (timeline)
        for ix in school.get("interactions", []):
            await db.interactions.insert_one({
                "program_id": pid,
                "university_name": school["university_name"],
                "coach_email": "",
                "date_time": ago(ix["days_ago"]),
                "type": ix["type"],
                "outcome": ix["outcome"],
                "notes": ix["notes"],
                "message_copy": ix.get("message_copy", ""),
                "links": "",
                "interaction_id": int_id(),
                "tenant_id": TENANT_ID,
                "created_at": ago(ix["days_ago"]),
            })

        # Create private notes
        for n in school.get("private_notes", []):
            await db.notes.insert_one({
                "note_id": note_id(),
                "tenant_id": TENANT_ID,
                "program_id": pid,
                "content": n["content"],
                "is_pinned": n.get("pinned", False),
                "created_at": ago(n["days_ago"]),
                "updated_at": ago(n["days_ago"]),
            })

        # Create events
        for e in school.get("events", []):
            start = ago(e["days_ago"]) if "days_ago" in e else ago(-e.get("days_from_now", 0))
            start_date = (now() - timedelta(days=e.get("days_ago", 0)) if "days_ago" in e else now() + timedelta(days=e.get("days_from_now", 0))).strftime("%Y-%m-%d")
            await db.events.insert_one({
                "title": e["title"],
                "event_type": e["type"],
                "location": e.get("location", ""),
                "description": "",
                "start_date": start_date,
                "end_date": start_date,
                "start_time": "09:00",
                "end_time": "17:00",
                "program_id": pid,
                "color": e.get("color", "blue"),
                "event_id": evt_id(),
                "tenant_id": TENANT_ID,
                "user_id": USER_ID,
                "created_at": now().isoformat(),
                "updated_at": now().isoformat(),
            })

    print("\n=== Demo data seeded successfully! ===")
    print(f"\nSummary:")
    progs = await db.programs.find({'tenant_id': TENANT_ID}).to_list(50)
    for p in progs:
        coaches = await db.coaches.count_documents({'program_id': p['program_id']})
        ints = await db.interactions.count_documents({'program_id': p['program_id']})
        notes = await db.notes.count_documents({'program_id': p['program_id']})
        evts = await db.events.count_documents({'program_id': p['program_id']})
        print(f"  {p['university_name']:50s} | {p['recruiting_status']:20s} | {coaches} coaches | {ints} interactions | {notes} notes | {evts} events")

asyncio.run(seed())
