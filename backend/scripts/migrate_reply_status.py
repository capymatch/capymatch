"""
One-time migration: Create coach_reply interactions for schools where
the old reply_status field indicates a coach had replied.
This bridges old manual data to the new data-driven system.
"""
import asyncio
import os
import uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = "test_database"

REPLY_STATUSES_THAT_MEAN_REPLIED = {"Replied", "In Conversation", "Reply Received"}


async def migrate():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    programs = await db.programs.find(
        {"reply_status": {"$in": list(REPLY_STATUSES_THAT_MEAN_REPLIED)}},
        {"_id": 0, "program_id": 1, "tenant_id": 1, "university_name": 1, "reply_status": 1}
    ).to_list(500)

    print(f"Found {len(programs)} programs with old reply_status indicating coach replied")

    migrated = 0
    skipped = 0
    for p in programs:
        tenant_id = p["tenant_id"]
        program_id = p["program_id"]

        # Check if a coach_reply interaction already exists
        existing = await db.interactions.find_one(
            {"tenant_id": tenant_id, "program_id": program_id, "type": "coach_reply"}
        )
        if existing:
            skipped += 1
            continue

        # Create a coach_reply interaction
        doc = {
            "interaction_id": f"int_{uuid.uuid4().hex[:12]}",
            "tenant_id": tenant_id,
            "program_id": program_id,
            "university_name": p.get("university_name", ""),
            "date_time": datetime.now(timezone.utc).isoformat(),
            "type": "coach_reply",
            "outcome": "Positive",
            "notes": f"Migrated from legacy data (old reply_status: {p['reply_status']})",
            "message_copy": "",
            "links": "",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.interactions.insert_one(doc)
        migrated += 1
        print(f"  Migrated: {p['university_name']} ({tenant_id})")

    print(f"\nDone. Migrated: {migrated}, Skipped (already had coach_reply): {skipped}")
    client.close()


if __name__ == "__main__":
    asyncio.run(migrate())
