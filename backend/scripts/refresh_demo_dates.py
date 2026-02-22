"""
Refresh demo account dates so the demo always looks fresh and realistic.
Shifts all interaction/program dates forward so the latest activity is "today".
Also ensures next_action_due dates are in the near future, not the past.
"""
import asyncio
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient

DEMO_EMAIL = "demo@capymatch.com"


async def refresh_demo_dates():
    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "test_database")
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    now = datetime.now(timezone.utc)
    today = now.date()

    # Find demo user and tenant
    user = await db.users.find_one({"email": DEMO_EMAIL})
    if not user:
        print("[refresh_demo] Demo user not found, skipping")
        client.close()
        return

    tenant = await db.tenants.find_one({"owner_user_id": user["user_id"]})
    if not tenant:
        print("[refresh_demo] Demo tenant not found, skipping")
        client.close()
        return

    tenant_id = tenant["tenant_id"]

    # ── Step 1: Find the shift amount ──
    # Get all interactions and find the most recent date
    interactions = await db.interactions.find({"tenant_id": tenant_id}).to_list(500)
    if not interactions:
        print("[refresh_demo] No interactions found, skipping")
        client.close()
        return

    max_date = None
    for ix in interactions:
        dt_str = ix.get("date_time") or ix.get("created_at", "")
        if not dt_str:
            continue
        try:
            dt = datetime.fromisoformat(str(dt_str).replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            if max_date is None or dt > max_date:
                max_date = dt
        except Exception:
            continue

    if not max_date:
        print("[refresh_demo] Could not find max interaction date, skipping")
        client.close()
        return

    # Shift so the latest interaction becomes ~yesterday
    target_latest = now - timedelta(hours=18)
    shift = target_latest - max_date

    # Only shift if more than 12 hours drift
    if abs(shift.total_seconds()) < 43200:
        print(f"[refresh_demo] Dates are fresh (shift={shift}), skipping")
        client.close()
        return

    print(f"[refresh_demo] Shifting dates by {shift} (latest was {max_date.isoformat()})")

    # ── Step 2: Shift all interaction dates ──
    for ix in interactions:
        dt_str = ix.get("date_time") or ""
        if not dt_str:
            continue
        try:
            dt = datetime.fromisoformat(str(dt_str).replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            new_dt = dt + shift
            updates = {"date_time": new_dt.isoformat()}
            if ix.get("created_at"):
                try:
                    ca = datetime.fromisoformat(str(ix["created_at"]).replace("Z", "+00:00"))
                    if ca.tzinfo is None:
                        ca = ca.replace(tzinfo=timezone.utc)
                    updates["created_at"] = (ca + shift).isoformat()
                except Exception:
                    pass
            await db.interactions.update_one({"_id": ix["_id"]}, {"$set": updates})
        except Exception:
            continue

    # ── Step 3: Shift program dates ──
    programs = await db.programs.find({"tenant_id": tenant_id}).to_list(50)
    for p in programs:
        updates = {}

        # Shift created_at
        if p.get("created_at"):
            try:
                ca = datetime.fromisoformat(str(p["created_at"]).replace("Z", "+00:00"))
                if ca.tzinfo is None:
                    ca = ca.replace(tzinfo=timezone.utc)
                updates["created_at"] = (ca + shift).isoformat()
            except Exception:
                pass

        # Shift updated_at
        if p.get("updated_at"):
            try:
                ua = datetime.fromisoformat(str(p["updated_at"]).replace("Z", "+00:00"))
                if ua.tzinfo is None:
                    ua = ua.replace(tzinfo=timezone.utc)
                updates["updated_at"] = (ua + shift).isoformat()
            except Exception:
                pass

        # Shift next_action_due — keep relative offset but ensure it's in the future
        if p.get("next_action_due"):
            try:
                due = datetime.strptime(p["next_action_due"], "%Y-%m-%d").date()
                new_due = due + timedelta(days=shift.days)
                # If it's still in the past after shift, push to tomorrow+
                if new_due <= today:
                    new_due = today + timedelta(days=2)
                updates["next_action_due"] = new_due.strftime("%Y-%m-%d")
            except Exception:
                pass

        if updates:
            await db.programs.update_one({"_id": p["_id"]}, {"$set": updates})

    # ── Step 4: Shift email dates ──
    emails = await db.emails.find({"tenant_id": tenant_id}).to_list(500)
    for em in emails:
        updates = {}
        for field in ("sent_at", "received_at", "created_at", "date"):
            if em.get(field):
                try:
                    dt = datetime.fromisoformat(str(em[field]).replace("Z", "+00:00"))
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=timezone.utc)
                    updates[field] = (dt + shift).isoformat()
                except Exception:
                    continue
        if updates:
            await db.emails.update_one({"_id": em["_id"]}, {"$set": updates})

    # ── Step 5: Shift activity/events dates ──
    for collection_name in ("activity_feed", "events", "notifications"):
        docs = await db[collection_name].find({"tenant_id": tenant_id}).to_list(500)
        for doc in docs:
            updates = {}
            for field in ("created_at", "date", "start_date", "end_date", "timestamp"):
                val = doc.get(field)
                if not val:
                    continue
                try:
                    if "T" in str(val):
                        dt = datetime.fromisoformat(str(val).replace("Z", "+00:00"))
                        if dt.tzinfo is None:
                            dt = dt.replace(tzinfo=timezone.utc)
                        updates[field] = (dt + shift).isoformat()
                    else:
                        d = datetime.strptime(str(val), "%Y-%m-%d").date()
                        new_d = d + timedelta(days=shift.days)
                        updates[field] = new_d.strftime("%Y-%m-%d")
                except Exception:
                    continue
            if updates:
                await db[collection_name].update_one({"_id": doc["_id"]}, {"$set": updates})

    print(f"[refresh_demo] Done. Shifted {len(interactions)} interactions, {len(programs)} programs, {len(emails)} emails")
    client.close()


if __name__ == "__main__":
    asyncio.run(refresh_demo_dates())
