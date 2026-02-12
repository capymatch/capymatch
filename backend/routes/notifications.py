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
        "type": notif_type,  # "coach_reply", "follow_up_due", "profile_view_edu"
        "title": title,
        "message": message,
        "data": data or {},
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.notifications.insert_one(doc)
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
