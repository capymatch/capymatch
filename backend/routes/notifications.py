from fastapi import APIRouter, Request
from datetime import datetime, timezone, timedelta
from database import db
from auth import get_current_user, get_tenant_id
import uuid

router = APIRouter(prefix="/api")


async def create_notification(tenant_id: str, notif_type: str, title: str, message: str, data: dict = None):
    """Helper to create a notification"""
    notif_id = f"notif_{uuid.uuid4().hex[:12]}"
    doc = {
        "notification_id": notif_id,
        "tenant_id": tenant_id,
        "type": notif_type,
        "title": title,
        "message": message,
        "data": data or {},
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.notifications.insert_one(doc)
    return notif_id


async def generate_weekly_summary(tenant_id: str):
    """Generate a weekly recruiting summary notification if one hasn't been created this week."""
    now = datetime.now(timezone.utc)
    # Monday of this week
    week_start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    week_start_iso = week_start.isoformat()

    # Check if we already created one this week
    existing = await db.notifications.find_one({
        "tenant_id": tenant_id,
        "type": "weekly_summary",
        "created_at": {"$gte": week_start_iso}
    })
    if existing:
        return None

    today = now.strftime("%Y-%m-%d")
    week_ago = (now - timedelta(days=7)).strftime("%Y-%m-%d")
    week_ago_iso = (now - timedelta(days=7)).isoformat()

    # 1. Coach replies this week (interactions with outcome "Positive" from emails)
    coach_replies = await db.interactions.count_documents({
        "tenant_id": tenant_id,
        "created_at": {"$gte": week_ago_iso},
        "type": {"$in": ["Email", "email_received"]},
        "outcome": "Positive"
    })
    # Also count reply_status changes
    reply_programs = await db.programs.count_documents({
        "tenant_id": tenant_id,
        "reply_status": {"$in": ["Reply Received", "In Conversation"]}
    })

    # 2. Follow-ups due this week
    next_week = (now + timedelta(days=7)).strftime("%Y-%m-%d")
    follow_ups_due = await db.programs.count_documents({
        "tenant_id": tenant_id,
        "next_action_due": {"$ne": "", "$lte": next_week}
    })

    # 3. High-interest programs (school_interest >= 7)
    high_interest = await db.programs.count_documents({
        "tenant_id": tenant_id,
        "school_interest": {"$gte": 7}
    })

    # 4. New interactions this week
    new_interactions = await db.interactions.count_documents({
        "tenant_id": tenant_id,
        "created_at": {"$gte": week_ago_iso}
    })

    # Build summary lines
    lines = []
    if coach_replies > 0:
        lines.append(f"{coach_replies} coach repl{'ies' if coach_replies != 1 else 'y'}")
    if reply_programs > 0:
        lines.append(f"{reply_programs} program{'s' if reply_programs != 1 else ''} in conversation")
    if follow_ups_due > 0:
        lines.append(f"{follow_ups_due} follow-up{'s' if follow_ups_due != 1 else ''} due")
    if high_interest > 0:
        lines.append(f"{high_interest} high-interest program{'s' if high_interest != 1 else ''}")
    if new_interactions > 0:
        lines.append(f"{new_interactions} new interaction{'s' if new_interactions != 1 else ''} logged")

    if not lines:
        lines.append("No activity yet — time to reach out!")

    message = " • ".join(lines)

    notif_id = await create_notification(
        tenant_id=tenant_id,
        notif_type="weekly_summary",
        title="Weekly Recruiting Summary",
        message=message,
        data={
            "coach_replies": coach_replies,
            "reply_programs": reply_programs,
            "follow_ups_due": follow_ups_due,
            "high_interest": high_interest,
            "new_interactions": new_interactions
        }
    )
    return notif_id


@router.get("/notifications")
async def get_notifications(request: Request):
    """Get unread notifications for the current user"""
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    
    # Get unread notifications from last 7 days
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    notifications = await db.notifications.find(
        {"tenant_id": tenant_id, "created_at": {"$gte": week_ago}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    unread_count = sum(1 for n in notifications if not n.get("read"))
    
    return {
        "notifications": notifications,
        "unread_count": unread_count
    }


@router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, request: Request):
    """Mark a single notification as read"""
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    
    await db.notifications.update_one(
        {"notification_id": notification_id, "tenant_id": tenant_id},
        {"$set": {"read": True}}
    )
    return {"ok": True}


@router.post("/notifications/read-all")
async def mark_all_read(request: Request):
    """Mark all notifications as read"""
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    
    await db.notifications.update_many(
        {"tenant_id": tenant_id, "read": False},
        {"$set": {"read": True}}
    )
    return {"ok": True}


@router.delete("/notifications/{notification_id}")
async def delete_notification(notification_id: str, request: Request):
    """Delete a notification"""
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    
    await db.notifications.delete_one(
        {"notification_id": notification_id, "tenant_id": tenant_id}
    )
    return {"ok": True}
