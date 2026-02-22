"""
Fix stale demo data: Add fresh interactions for schools with old coach replies,
and push overdue next_action_due dates into the future.
"""
import asyncio
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import uuid

DEMO_EMAIL = "demo@capymatch.com"
MAX_REPLY_AGE_DAYS = 5  # Coach replies older than this for in_conversation schools get freshened
MAX_OVERDUE_DAYS = 0     # next_action_due in the past gets pushed forward


async def refresh_demo_dates():
    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "test_database")
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    now = datetime.now(timezone.utc)
    today = now.date()

    user = await db.users.find_one({"email": DEMO_EMAIL})
    if not user:
        print("[refresh_demo] Demo user not found, skipping")
        client.close()
        return

    tenant = await db.tenants.find_one({"owner_user_id": user["user_id"]})
    if not tenant:
        client.close()
        return

    tenant_id = tenant["tenant_id"]
    programs = await db.programs.find({"tenant_id": tenant_id}).to_list(50)
    changes = 0

    for p in programs:
        pid = p["program_id"]
        uni = p.get("university_name", "")

        # ── Fix 1: Freshen stale coach replies for in_conversation programs ──
        interactions = await db.interactions.find(
            {"tenant_id": tenant_id, "program_id": pid}
        ).sort("date_time", -1).to_list(100)

        has_reply = False
        latest_reply_date = None
        for ix in interactions:
            if ix.get("type") in ("coach_reply", "email_received"):
                has_reply = True
                try:
                    dt = datetime.fromisoformat(str(ix.get("date_time", "")).replace("Z", "+00:00"))
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=timezone.utc)
                    if latest_reply_date is None or dt > latest_reply_date:
                        latest_reply_date = dt
                except Exception:
                    pass

        if has_reply and latest_reply_date:
            reply_age = (now - latest_reply_date).days
            if reply_age > MAX_REPLY_AGE_DAYS:
                # Add a fresh coach reply interaction
                fresh_reply_time = now - timedelta(days=2, hours=3)
                fresh_interaction = {
                    "interaction_id": f"ix_{uuid.uuid4().hex[:12]}",
                    "tenant_id": tenant_id,
                    "program_id": pid,
                    "university_name": uni,
                    "type": "email_received",
                    "date_time": fresh_reply_time.isoformat(),
                    "created_at": fresh_reply_time.isoformat(),
                    "notes": _get_fresh_reply_note(uni),
                    "source": "demo_refresh",
                }
                await db.interactions.insert_one(fresh_interaction)
                changes += 1
                print(f"[refresh_demo] Added fresh coach reply for {uni} (was {reply_age}d old)")

        # ── Fix 2: Push past next_action_due dates into the future ──
        next_due = p.get("next_action_due", "")
        if next_due:
            try:
                due_date = datetime.strptime(next_due, "%Y-%m-%d").date()
                if due_date <= today:
                    # Push 3-5 days into the future
                    new_due = today + timedelta(days=3)
                    await db.programs.update_one(
                        {"_id": p["_id"]},
                        {"$set": {"next_action_due": new_due.strftime("%Y-%m-%d")}}
                    )
                    changes += 1
                    print(f"[refresh_demo] Pushed next_action_due for {uni}: {next_due} → {new_due}")
            except Exception:
                pass

    print(f"[refresh_demo] Done. Made {changes} changes.")
    client.close()


def _get_fresh_reply_note(university_name):
    """Return a realistic coach reply note for the given university."""
    notes = {
        "University of Texas": "Emma, Coach Elliott here. We've been following your season closely. Would love to have you come watch a practice this spring. Let me know what dates work.",
        "Stanford University": "Great to hear from you again, Emma. The coaching staff was impressed with your recent tournament footage. Let's set up a call this week.",
        "UCLA": "Emma, thanks for sending your updated schedule. We'll have a coach at the JVA event. Looking forward to seeing you compete.",
    }
    return notes.get(university_name, f"Thanks for the update, Emma. We'll be in touch about next steps for {university_name}.")


if __name__ == "__main__":
    asyncio.run(refresh_demo_dates())
