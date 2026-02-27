from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone
from database import db
from auth import get_current_user, get_tenant_id
import logging
import json

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")


# ─── Privacy Preferences ───

@router.get("/privacy/preferences")
async def get_privacy_preferences(request: Request):
    """Get user's privacy preferences."""
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)

    prefs = await db.privacy_preferences.find_one(
        {"tenant_id": tenant_id}, {"_id": 0}
    )
    if not prefs:
        prefs = {
            "tenant_id": tenant_id,
            "inbound_email_scanning": True,
            "email_notifications": True,
            "gmail_consent_given": False,
            "consent_given_at": None,
        }

    return {
        "inbound_email_scanning": prefs.get("inbound_email_scanning", True),
        "email_notifications": prefs.get("email_notifications", True),
        "gmail_consent_given": prefs.get("gmail_consent_given", False),
        "consent_given_at": prefs.get("consent_given_at"),
    }


@router.put("/privacy/preferences")
async def update_privacy_preferences(request: Request):
    """Update user's privacy preferences."""
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    body = await request.json()

    updates = {}
    if "inbound_email_scanning" in body:
        updates["inbound_email_scanning"] = bool(body["inbound_email_scanning"])
    if "gmail_consent_given" in body:
        updates["gmail_consent_given"] = bool(body["gmail_consent_given"])
        if updates["gmail_consent_given"]:
            updates["consent_given_at"] = datetime.now(timezone.utc).isoformat()

    if updates:
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.privacy_preferences.update_one(
            {"tenant_id": tenant_id},
            {"$set": updates},
            upsert=True,
        )

    return {"ok": True}


# ─── Tour Tracking ───

@router.get("/user/tours")
async def get_tour_status(request: Request):
    """Get which tours the user has completed."""
    user = await get_current_user(request)
    user_id = user["user_id"]

    doc = await db.user_tours.find_one({"user_id": user_id}, {"_id": 0})
    if not doc:
        return {"main_tour": False, "pipeline_tour": False}

    return {
        "main_tour": doc.get("main_tour", False),
        "pipeline_tour": doc.get("pipeline_tour", False),
    }


@router.post("/user/tours/{tour_name}/complete")
async def complete_tour(tour_name: str, request: Request):
    """Mark a tour as completed so it never shows again."""
    user = await get_current_user(request)
    user_id = user["user_id"]

    if tour_name not in ("main_tour", "pipeline_tour"):
        return {"ok": False, "error": "Unknown tour"}

    await db.user_tours.update_one(
        {"user_id": user_id},
        {"$set": {tour_name: True, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"ok": True}


# ─── Data Export ───

@router.get("/privacy/export-data")
async def export_user_data(request: Request):
    """Export all user data as JSON. GDPR/CCPA compliance."""
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)

    # Gather all user data
    profile = await db.tenants.find_one({"tenant_id": tenant_id}, {"_id": 0})
    programs = await db.programs.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(1000)
    coaches = await db.coaches.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(5000)
    interactions = await db.interactions.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(10000)
    notes = await db.notes.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(5000)
    events = await db.events.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(1000)
    notifications = await db.notifications.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(1000)
    inbound = await db.inbound_contacts.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(1000)
    sent_log = await db.sent_email_log.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(5000)

    # User account info (no password)
    account = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "password_hash": 0})

    # Gmail status (no tokens)
    gmail = await db.gmail_tokens.find_one({"user_id": user["user_id"]}, {"_id": 0, "access_token": 0, "refresh_token": 0})

    privacy_prefs = await db.privacy_preferences.find_one({"tenant_id": tenant_id}, {"_id": 0})

    return {
        "export_date": datetime.now(timezone.utc).isoformat(),
        "account": account,
        "profile": profile,
        "privacy_preferences": privacy_prefs,
        "gmail_connection": gmail,
        "schools": programs,
        "coaches": coaches,
        "interactions": interactions,
        "notes": notes,
        "events": events,
        "notifications": notifications,
        "inbound_contacts": inbound,
        "sent_email_log": sent_log,
    }


# ─── Account Deletion ───

@router.delete("/privacy/delete-account")
async def delete_account(request: Request):
    """Permanently delete all user data. This is irreversible."""
    user = await get_current_user(request)
    user_id = user["user_id"]
    tenant_id = await get_tenant_id(user)

    logger.warning(f"Account deletion requested for user {user_id}, tenant {tenant_id}")

    # Delete all tenant data
    collections_to_clear = [
        ("programs", {"tenant_id": tenant_id}),
        ("coaches", {"tenant_id": tenant_id}),
        ("interactions", {"tenant_id": tenant_id}),
        ("notes", {"tenant_id": tenant_id}),
        ("events", {"tenant_id": tenant_id}),
        ("notifications", {"tenant_id": tenant_id}),
        ("inbound_contacts", {"tenant_id": tenant_id}),
        ("sent_email_log", {"tenant_id": tenant_id}),
        ("privacy_preferences", {"tenant_id": tenant_id}),
        ("coach_watch_alerts", {"tenant_id": tenant_id}),
        ("tenants", {"tenant_id": tenant_id}),
        ("athlete_profiles", {"tenant_id": tenant_id}),
        ("subscriptions", {"tenant_id": tenant_id}),
        ("emails", {"tenant_id": tenant_id}),
        ("email_settings", {"tenant_id": tenant_id}),
        ("profile_views", {"tenant_id": tenant_id}),
        ("team_members", {"tenant_id": tenant_id}),
        ("team_invitations", {"tenant_id": tenant_id}),
        ("import_analytics", {"tenant_id": tenant_id}),
    ]

    for coll_name, query in collections_to_clear:
        coll = db[coll_name]
        result = await coll.delete_many(query)
        logger.info(f"Deleted {result.deleted_count} docs from {coll_name}")

    # Delete user-level data
    await db.gmail_tokens.delete_many({"user_id": user_id})
    await db.gmail_oauth_states.delete_many({"user_id": user_id})
    await db.gmail_emails.delete_many({"user_id": user_id})
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.temp_attachments.delete_many({"user_id": user_id})
    await db.ai_conversations.delete_many({"user_id": user_id})
    await db.user_tours.delete_many({"user_id": user_id})
    await db.import_runs.delete_many({"user_id": user_id})
    await db.gmail_import_events.delete_many({"user_id": user_id})
    await db.password_resets.delete_many({"user_id": user_id})

    # Delete user account last
    await db.users.delete_one({"user_id": user_id})

    logger.warning(f"Account deletion complete for user {user_id}")

    return {"ok": True, "message": "All your data has been permanently deleted."}
