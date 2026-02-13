from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone, timedelta
from database import db
from auth import get_current_user, get_tenant_id

router = APIRouter(prefix="/api")


@router.get("/dashboard")
async def get_dashboard(request: Request):
    from routes.notifications import create_notification, generate_weekly_summary
    
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    total = await db.programs.count_documents({"tenant_id": tenant_id})
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    follow_ups_due = await db.programs.count_documents({
        "tenant_id": tenant_id, "next_action_due": {"$ne": "", "$lte": today}
    })
    
    # Generate weekly summary if one doesn't exist this week
    await generate_weekly_summary(tenant_id)
    
    # Check for follow-ups due today and create notifications if not already created
    if follow_ups_due > 0:
        # Check if we already created a follow-up notification today
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0).isoformat()
        existing_notif = await db.notifications.find_one({
            "tenant_id": tenant_id,
            "type": "follow_up_due",
            "created_at": {"$gte": today_start}
        })
        
        if not existing_notif:
            # Get the schools with follow-ups due
            due_programs = await db.programs.find({
                "tenant_id": tenant_id, 
                "next_action_due": {"$ne": "", "$lte": today}
            }, {"_id": 0, "university_name": 1, "program_id": 1}).to_list(5)
            
            school_names = [p.get("university_name", "Unknown") for p in due_programs[:3]]
            schools_text = ", ".join(school_names)
            if follow_ups_due > 3:
                schools_text += f" +{follow_ups_due - 3} more"
            
            # Include first program_id for navigation
            first_program_id = due_programs[0].get("program_id") if due_programs else None
            
            await create_notification(
                tenant_id=tenant_id,
                notif_type="follow_up_due",
                title=f"{follow_ups_due} Follow-up{'s' if follow_ups_due > 1 else ''} Due Today",
                message=schools_text,
                data={"count": follow_ups_due, "program_id": first_program_id}
            )
    
    status_groups = {
        "Active - Not Contacted": ["Not Contacted"],
        "Contacted - Awaiting Reply": ["Contacted", "No Response Yet", "Video Viewed"],
        "Active Conversations": ["Some Interest", "Active Conversation"],
        "Offers / Serious Interest": ["Offer / Commit Talk"],
        "Closed / Archived": ["Not a Fit / Closed"]
    }
    status_counts = {}
    for group_name, statuses in status_groups.items():
        count = await db.programs.count_documents({"tenant_id": tenant_id, "recruiting_status": {"$in": statuses}})
        status_counts[group_name] = count
    recent_interactions = await db.interactions.find(
        {"tenant_id": tenant_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(10)
    tenant = await db.tenants.find_one({"tenant_id": tenant_id}, {"_id": 0})
    return {
        "total_schools": total,
        "follow_ups_due": follow_ups_due,
        "status_counts": status_counts,
        "recent_interactions": recent_interactions,
        "athlete_name": tenant.get("athlete_name", "") if tenant else ""
    }


@router.get("/reminders")
async def get_reminders(request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    overdue = await db.programs.find({
        "tenant_id": tenant_id,
        "next_action_due": {"$ne": "", "$lte": today},
        "recruiting_status": {"$nin": ["Not a Fit / Closed"]},
    }, {"_id": 0}).sort("next_action_due", 1).to_list(50)
    reminders = []
    for p in overdue:
        try:
            due_date = datetime.strptime(p["next_action_due"], "%Y-%m-%d")
            days_overdue = (datetime.now(timezone.utc).replace(tzinfo=None) - due_date).days
        except ValueError:
            days_overdue = 0
        coaches = await db.coaches.find({"tenant_id": tenant_id, "program_id": p["program_id"]}, {"_id": 0}).to_list(5)
        head_coach = next((c for c in coaches if c.get("role") == "Head Coach"), coaches[0] if coaches else None)
        last_interaction = await db.interactions.find_one(
            {"tenant_id": tenant_id, "program_id": p["program_id"]},
            {"_id": 0},
            sort=[("date_time", -1)],
        )
        reminders.append({
            "program_id": p["program_id"],
            "university_name": p.get("university_name", ""),
            "division": p.get("division", ""),
            "recruiting_status": p.get("recruiting_status", ""),
            "reply_status": p.get("reply_status", ""),
            "next_action": p.get("next_action", ""),
            "next_action_due": p.get("next_action_due", ""),
            "days_overdue": days_overdue,
            "coach_name": head_coach.get("coach_name", "") if head_coach else "",
            "coach_email": head_coach.get("email", "") if head_coach else "",
            "last_interaction_date": last_interaction.get("date_time", "")[:10] if last_interaction else "",
            "last_interaction_type": last_interaction.get("type", "") if last_interaction else "",
        })
    return {"reminders": reminders, "total_overdue": len(reminders)}
