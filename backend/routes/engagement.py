"""Engagement tracking: email opens, link clicks, profile views."""
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import Response, RedirectResponse
from database import db
from auth import get_current_user, get_tenant_id
from datetime import datetime, timezone, timedelta
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")

# 1x1 transparent GIF
PIXEL_GIF = bytes([
    0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00,
    0x01, 0x00, 0x80, 0x00, 0x00, 0xff, 0xff, 0xff,
    0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00,
    0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
    0x01, 0x00, 0x3b
])


def _ip_hash(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", request.client.host if request.client else "")
    return str(hash(forwarded))[-8:]


# ─── Public tracking endpoints (no auth) ───

@router.get("/track/open/{tracking_id}")
async def track_email_open(tracking_id: str, request: Request):
    """Tracking pixel — records email open event."""
    tracker = await db.email_tracking.find_one(
        {"tracking_id": tracking_id},
        {"_id": 0, "tenant_id": 1, "program_id": 1, "coach_email": 1, "subject": 1, "university_name": 1}
    )
    if tracker:
        await db.engagement_events.insert_one({
            "event_id": str(uuid.uuid4()),
            "tenant_id": tracker["tenant_id"],
            "event_type": "email_open",
            "tracking_id": tracking_id,
            "program_id": tracker.get("program_id", ""),
            "university_name": tracker.get("university_name", ""),
            "coach_email": tracker.get("coach_email", ""),
            "email_subject": tracker.get("subject", ""),
            "ip_hash": _ip_hash(request),
            "user_agent": request.headers.get("user-agent", "")[:200],
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Email open tracked: {tracking_id} for {tracker.get('university_name', '')}")

    return Response(content=PIXEL_GIF, media_type="image/gif", headers={
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
    })


@router.get("/track/click/{tracking_id}")
async def track_link_click(tracking_id: str, request: Request):
    """Link click tracker — records click and redirects."""
    tracker = await db.link_tracking.find_one(
        {"tracking_id": tracking_id},
        {"_id": 0, "destination_url": 1, "tenant_id": 1, "program_id": 1,
         "coach_email": 1, "university_name": 1, "email_tracking_id": 1}
    )
    if not tracker:
        return RedirectResponse(url="/", status_code=302)

    await db.engagement_events.insert_one({
        "event_id": str(uuid.uuid4()),
        "tenant_id": tracker["tenant_id"],
        "event_type": "link_click",
        "tracking_id": tracking_id,
        "email_tracking_id": tracker.get("email_tracking_id", ""),
        "program_id": tracker.get("program_id", ""),
        "university_name": tracker.get("university_name", ""),
        "coach_email": tracker.get("coach_email", ""),
        "link_url": tracker.get("destination_url", ""),
        "ip_hash": _ip_hash(request),
        "user_agent": request.headers.get("user-agent", "")[:200],
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    logger.info(f"Link click tracked: {tracking_id} → {tracker.get('destination_url', '')[:60]}")

    return RedirectResponse(url=tracker["destination_url"], status_code=302)


# ─── Authenticated endpoints ───

@router.get("/engagement/summary")
async def get_engagement_summary(request: Request):
    """Get engagement summary for the dashboard — grouped by school."""
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)

    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()

    # Recent events (last 30 days)
    events = await db.engagement_events.find(
        {"tenant_id": tenant_id, "created_at": {"$gte": thirty_days_ago}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(500)

    # Also get profile views
    profile = await db.athlete_profiles.find_one(
        {"tenant_id": tenant_id},
        {"_id": 0, "public_slug": 1}
    )
    profile_views = []
    if profile and profile.get("public_slug"):
        profile_views = await db.profile_views.find(
            {"slug": profile["public_slug"], "viewed_at": {"$gte": thirty_days_ago}},
            {"_id": 0}
        ).sort("viewed_at", -1).to_list(200)

    # Merge profile views into events
    for pv in profile_views:
        events.append({
            "event_type": "profile_view",
            "created_at": pv.get("viewed_at", ""),
            "visitor_hash": pv.get("visitor_hash", ""),
            "user_agent": pv.get("user_agent", ""),
            "referer": pv.get("referer", ""),
        })

    # Sort all events by date
    events.sort(key=lambda e: e.get("created_at", ""), reverse=True)

    # Aggregate by school
    by_school = {}
    for ev in events:
        pid = ev.get("program_id", "")
        uname = ev.get("university_name", "")
        key = pid or uname or "unknown"
        if key not in by_school:
            by_school[key] = {
                "program_id": pid,
                "university_name": uname,
                "email_opens": 0,
                "link_clicks": 0,
                "profile_views": 0,
                "last_activity": "",
                "events": [],
            }
        t = ev.get("event_type", "")
        if t == "email_open":
            by_school[key]["email_opens"] += 1
        elif t == "link_click":
            by_school[key]["link_clicks"] += 1
        elif t == "profile_view":
            by_school[key]["profile_views"] += 1

        if not by_school[key]["last_activity"]:
            by_school[key]["last_activity"] = ev.get("created_at", "")

        if len(by_school[key]["events"]) < 5:
            by_school[key]["events"].append({
                "event_type": t,
                "created_at": ev.get("created_at", ""),
                "coach_email": ev.get("coach_email", ""),
                "email_subject": ev.get("email_subject", ""),
                "link_url": ev.get("link_url", ""),
            })

    # Totals
    week_events = [e for e in events if e.get("created_at", "") >= seven_days_ago]
    total_opens = sum(1 for e in events if e.get("event_type") == "email_open")
    total_clicks = sum(1 for e in events if e.get("event_type") == "link_click")
    total_profile_views = sum(1 for e in events if e.get("event_type") == "profile_view")
    week_opens = sum(1 for e in week_events if e.get("event_type") == "email_open")
    week_clicks = sum(1 for e in week_events if e.get("event_type") == "link_click")

    # "Who's Watching" feed — latest 15 events
    feed = []
    for ev in events[:15]:
        feed.append({
            "event_type": ev.get("event_type", ""),
            "university_name": ev.get("university_name", ""),
            "program_id": ev.get("program_id", ""),
            "coach_email": ev.get("coach_email", ""),
            "email_subject": ev.get("email_subject", ""),
            "link_url": ev.get("link_url", ""),
            "created_at": ev.get("created_at", ""),
        })

    # "Hot leads" — schools with most engagement
    hot = sorted(by_school.values(), key=lambda s: s["email_opens"] + s["link_clicks"] * 2, reverse=True)

    return {
        "totals": {
            "email_opens": total_opens,
            "link_clicks": total_clicks,
            "profile_views": total_profile_views,
            "week_opens": week_opens,
            "week_clicks": week_clicks,
        },
        "feed": feed,
        "by_school": {k: {sk: sv for sk, sv in v.items() if sk != "events"} for k, v in by_school.items()},
        "hot_leads": [{"university_name": h["university_name"], "program_id": h["program_id"],
                        "email_opens": h["email_opens"], "link_clicks": h["link_clicks"],
                        "score": h["email_opens"] + h["link_clicks"] * 2}
                       for h in hot[:5] if h.get("university_name")],
    }


@router.get("/engagement/school/{program_id}")
async def get_school_engagement(program_id: str, request: Request):
    """Get engagement details for a specific school — for the Journey page."""
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)

    events = await db.engagement_events.find(
        {"tenant_id": tenant_id, "program_id": program_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)

    total_opens = sum(1 for e in events if e["event_type"] == "email_open")
    total_clicks = sum(1 for e in events if e["event_type"] == "link_click")
    unique_opens = len(set(e.get("ip_hash", "") for e in events if e["event_type"] == "email_open"))

    timeline = []
    for ev in events[:20]:
        timeline.append({
            "event_type": ev.get("event_type", ""),
            "coach_email": ev.get("coach_email", ""),
            "email_subject": ev.get("email_subject", ""),
            "link_url": ev.get("link_url", ""),
            "created_at": ev.get("created_at", ""),
        })

    return {
        "program_id": program_id,
        "total_opens": total_opens,
        "total_clicks": total_clicks,
        "unique_opens": unique_opens,
        "timeline": timeline,
    }
