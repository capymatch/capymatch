from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from pathlib import Path
import os
import logging
import asyncio
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env', override=False)

from database import db, client
from routes.auth_routes import limiter as auth_limiter

app = FastAPI()
app.state.limiter = auth_limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ─── Register all route modules ───
from routes.auth_routes import router as auth_router
from routes.programs import router as programs_router
from routes.events import router as events_router
from routes.dashboard import router as dashboard_router
from routes.profile import router as profile_router
from routes.knowledge import router as knowledge_router
from routes.ai import router as ai_router
from routes.gmail import router as gmail_router
from routes.notifications import router as notifications_router
from routes.athlete_profile import router as athlete_profile_router
from routes.admin import router as admin_router
from routes.admin_universities import router as admin_universities_router
from routes.subscription import router as subscription_router
from routes.stripe import router as stripe_router
from routes.admin_integrations import router as admin_integrations_router
from routes.college_scorecard import router as scorecard_router
from routes.coach_scraper import router as coach_scraper_router
from routes.team import router as team_router
from routes.notes import router as notes_router
from routes.inbound_contacts import router as inbound_contacts_router
from routes.privacy import router as privacy_router
from routes.intelligence import router as intelligence_router
from routes.intelligence_contribute import router as intelligence_contribute_router
from routes.admin_contributions import router as admin_contributions_router
from routes.admin_import_analytics import router as admin_import_analytics_router
from routes.schedule import router as schedule_router
from routes.coach_card import router as coach_card_router

app.include_router(auth_router)
app.include_router(programs_router)
app.include_router(events_router)
app.include_router(dashboard_router)
app.include_router(profile_router)
app.include_router(knowledge_router)
app.include_router(ai_router)
app.include_router(gmail_router)
app.include_router(notifications_router)
app.include_router(athlete_profile_router)
app.include_router(admin_router)
app.include_router(admin_universities_router)
app.include_router(subscription_router)
app.include_router(stripe_router)
app.include_router(admin_integrations_router)
app.include_router(scorecard_router)
app.include_router(coach_scraper_router)
app.include_router(team_router)
app.include_router(notes_router)
app.include_router(inbound_contacts_router)
app.include_router(privacy_router)
app.include_router(intelligence_router)
app.include_router(intelligence_contribute_router)
app.include_router(admin_contributions_router)
app.include_router(admin_import_analytics_router)
app.include_router(schedule_router)
app.include_router(coach_card_router)


# ─── Serve Audit Report ───
from fastapi.responses import HTMLResponse
import markdown

@app.get("/api/audit-report", response_class=HTMLResponse)
async def serve_audit_report():
    try:
        with open("/app/audit_report.md", "r") as f:
            md_content = f.read()
        html = markdown.markdown(md_content, extensions=["tables", "fenced_code"])
        return f"""<!DOCTYPE html><html><head>
        <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
        <title>CapyMatch Audit Report</title>
        <style>
          body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 900px; margin: 40px auto; padding: 0 20px; color: #1a1a2e; line-height: 1.7; }}
          h1 {{ color: #0d1b2a; border-bottom: 3px solid #2ec4b6; padding-bottom: 12px; }}
          h2 {{ color: #1b263b; margin-top: 2em; }}
          h3 {{ color: #415a77; }}
          table {{ border-collapse: collapse; width: 100%; margin: 16px 0; }}
          th, td {{ border: 1px solid #ddd; padding: 10px 14px; text-align: left; }}
          th {{ background: #f0f4f8; font-weight: 600; }}
          tr:nth-child(even) {{ background: #fafbfc; }}
          code {{ background: #f0f4f8; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }}
          strong {{ color: #0d1b2a; }}
          hr {{ border: none; border-top: 2px solid #e8ecf0; margin: 2em 0; }}
        </style></head><body>{html}</body></html>"""
    except FileNotFoundError:
        return HTMLResponse("<h1>Report not found</h1>", status_code=404)


# ─── Stripe Webhook (must be outside router prefix) ───

@app.post("/api/webhook/stripe")
async def stripe_webhook(request: Request):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    from datetime import datetime, timezone
    import uuid as _uuid
    api_key = os.environ.get("STRIPE_API_KEY")
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    try:
        event = await stripe_checkout.handle_webhook(body, sig)
        logger.info(f"Stripe webhook: {event.event_type} session={event.session_id}")

        # Process completed checkout as backup (polling handles immediate feedback)
        if event.event_type in ("checkout.session.completed", "payment_intent.succeeded"):
            session_id = event.session_id
            txn = await db.payment_transactions.find_one(
                {"session_id": session_id, "payment_status": {"$ne": "paid"}},
                {"_id": 0},
            )
            if txn:
                now = datetime.now(timezone.utc).isoformat()
                plan = txn["plan"]
                tenant_id = txn["tenant_id"]
                user_id = txn["user_id"]

                await db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {"$set": {"payment_status": "paid", "status": "complete", "updated_at": now}},
                )

                tenant = await db.tenants.find_one({"tenant_id": tenant_id}, {"_id": 0})
                old_plan = tenant.get("plan", "basic") if tenant else "basic"

                await db.tenants.update_one(
                    {"tenant_id": tenant_id},
                    {"$set": {"plan": plan, "updated_at": now}},
                )

                await db.subscription_logs.insert_one({
                    "log_id": f"sublog_{_uuid.uuid4().hex[:12]}",
                    "user_id": user_id,
                    "tenant_id": tenant_id,
                    "old_plan": old_plan,
                    "new_plan": plan,
                    "reason": "Stripe webhook",
                    "changed_by": "stripe_webhook",
                    "session_id": session_id,
                    "created_at": now,
                })
                logger.info(f"Webhook: upgraded {tenant_id} from {old_plan} to {plan}")
    except Exception as e:
        logger.error(f"Stripe webhook error: {e}")
    return {"ok": True}

# ─── Background Task: Auto-detect coach replies ───

reply_check_task = None
coach_watch_task = None
inbound_scan_task = None
gpa_refresh_task = None
demo_refresh_task = None

async def check_coach_replies():
    """Background task that checks for coach email replies every 10 minutes"""
    from routes.gmail import get_gmail_credentials, get_gmail_service
    from routes.notifications import create_notification
    from datetime import datetime, timezone
    
    while True:
        try:
            await asyncio.sleep(600)  # Wait 10 minutes between checks
            
            # Get all users with connected Gmail
            gmail_tokens = await db.gmail_tokens.find({}, {"_id": 0, "user_id": 1}).to_list(1000)
            
            if not gmail_tokens:
                continue

            # Batch fetch all user docs in one query
            user_ids = [t["user_id"] for t in gmail_tokens]
            all_users = await db.users.find({"user_id": {"$in": user_ids}}, {"_id": 0, "user_id": 1, "tenant_id": 1}).to_list(1000)
            user_map = {u["user_id"]: u for u in all_users}

            for token_doc in gmail_tokens:
                user_id = token_doc["user_id"]
                
                try:
                    user = user_map.get(user_id)
                    if not user:
                        continue
                    tenant_id = user.get("tenant_id") or f"tenant_{user_id}"
                    
                    # Get Gmail credentials
                    creds = await get_gmail_credentials(user_id)
                    if not creds:
                        continue
                    
                    # Get all coach emails for this tenant
                    coaches = await db.coaches.find(
                        {"tenant_id": tenant_id, "email": {"$ne": ""}},
                        {"_id": 0, "email": 1, "program_id": 1, "coach_name": 1}
                    ).to_list(500)
                    
                    if not coaches:
                        continue
                    
                    # Build a map of coach email -> {program_id, coach_name}
                    coach_email_to_info = {}
                    for c in coaches:
                        email = c.get("email", "").strip().lower()
                        if email:
                            coach_email_to_info[email] = {
                                "program_id": c["program_id"],
                                "coach_name": c.get("coach_name", "")
                            }
                    
                    if not coach_email_to_info:
                        continue
                    
                    # Get programs with "No Reply" or "Awaiting Reply" status
                    awaiting_programs = await db.programs.find(
                        {"tenant_id": tenant_id, "reply_status": {"$in": ["No Reply", "Awaiting Reply"]}},
                        {"_id": 0, "program_id": 1, "university_name": 1}
                    ).to_list(500)
                    
                    awaiting_program_map = {p["program_id"]: p.get("university_name", "") for p in awaiting_programs}
                    
                    if not awaiting_program_map:
                        continue
                    
                    # Get Gmail service and check recent emails
                    service = get_gmail_service(creds)
                    
                    # Search for emails from coach addresses in the last 24 hours
                    coach_emails_list = list(coach_email_to_info.keys())
                    
                    # Build query for emails from coaches
                    from_queries = [f"from:{email}" for email in coach_emails_list[:20]]
                    query = f"({' OR '.join(from_queries)}) newer_than:1d"
                    
                    results = service.users().messages().list(
                        userId="me",
                        q=query,
                        maxResults=50
                    ).execute()
                    
                    messages = results.get("messages", [])
                    
                    for msg_ref in messages:
                        msg = service.users().messages().get(
                            userId="me",
                            id=msg_ref["id"],
                            format="metadata",
                            metadataHeaders=["From"]
                        ).execute()
                        
                        headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}
                        from_addr = headers.get("From", "").lower()
                        
                        # Check if this email is from a coach we're tracking
                        for coach_email, info in coach_email_to_info.items():
                            program_id = info["program_id"]
                            if coach_email in from_addr and program_id in awaiting_program_map:
                                university_name = awaiting_program_map[program_id]
                                coach_name = info.get("coach_name", "A coach")
                                
                                # Update the program's reply_status
                                result = await db.programs.update_one(
                                    {"program_id": program_id, "tenant_id": tenant_id, "reply_status": {"$in": ["No Reply", "Awaiting Reply"]}},
                                    {"$set": {
                                        "reply_status": "Reply Received",
                                        "priority": "Very High",
                                        "updated_at": datetime.now(timezone.utc).isoformat()
                                    }}
                                )
                                
                                if result.modified_count > 0:
                                    # Create notification for coach reply
                                    await create_notification(
                                        tenant_id=tenant_id,
                                        notif_type="coach_reply",
                                        title="Coach Replied!",
                                        message=f"{coach_name} from {university_name} replied to your email",
                                        data={"program_id": program_id, "university_name": university_name, "coach_email": coach_email}
                                    )
                                    logger.info(f"Auto-updated reply status for program {program_id} (coach: {coach_email})")
                                
                                del awaiting_program_map[program_id]  # Don't update twice
                                break
                
                except Exception as e:
                    logger.error(f"Error checking replies for user {user_id}: {e}")
                    continue
                    
        except asyncio.CancelledError:
            logger.info("Reply check task cancelled")
            break
        except Exception as e:
            logger.error(f"Error in reply check background task: {e}")
            await asyncio.sleep(60)  # Wait a minute before retrying on error

# ─── Background Task: Inbound Coach Contact Scanner ───

async def scan_inbound_contacts():
    """Background task that scans for inbound coach emails and sent emails every 2 hours."""
    from routes.inbound_contacts import scan_inbound_for_user, scan_sent_emails_for_user

    while True:
        try:
            await asyncio.sleep(7200)  # Wait 2 hours between scans

            # Get all users with connected Gmail
            gmail_tokens = await db.gmail_tokens.find({}, {"_id": 0, "user_id": 1}).to_list(1000)

            if not gmail_tokens:
                continue

            # Batch fetch users
            user_ids = [t["user_id"] for t in gmail_tokens]
            all_users = await db.users.find({"user_id": {"$in": user_ids}}, {"_id": 0, "user_id": 1, "tenant_id": 1}).to_list(1000)
            user_map = {u["user_id"]: u for u in all_users}

            for token_doc in gmail_tokens:
                user_id = token_doc["user_id"]
                try:
                    user = user_map.get(user_id)
                    if not user:
                        continue
                    tenant_id = user.get("tenant_id") or f"tenant_{user_id}"

                    new_count = await scan_inbound_for_user(user_id, tenant_id)
                    if new_count > 0:
                        logger.info(f"Inbound scan: Added {new_count} new school(s) for user {user_id}")

                    sent_count = await scan_sent_emails_for_user(user_id, tenant_id)
                    if sent_count > 0:
                        logger.info(f"Sent scan: Logged {sent_count} sent email(s) for user {user_id}")

                except Exception as e:
                    logger.error(f"Email scan error for user {user_id}: {e}")
                    continue

        except asyncio.CancelledError:
            logger.info("Inbound contact scan task cancelled")
            break
        except Exception as e:
            logger.error(f"Inbound contact scan background error: {e}")
            await asyncio.sleep(300)  # Retry in 5 min on error

# ─── WebSocket ───

from ws_manager import manager

@app.websocket("/api/ws/{tenant_id}")
async def websocket_endpoint(ws: WebSocket, tenant_id: str):
    await manager.connect(tenant_id, ws)
    try:
        while True:
            await ws.receive_text()  # keep-alive; ignore client messages
    except WebSocketDisconnect:
        manager.disconnect(tenant_id, ws)

# ─── Root ───

@app.get("/api/")
async def root():
    return {"message": "Volleyball Recruiting CRM API"}

# ─── Middleware ───

_cors_raw = os.environ.get('CORS_ORIGINS', '')
_cors_origins = [o.strip() for o in _cors_raw.split(',') if o.strip()] if _cors_raw and _cors_raw != '*' else []

logger.info(f"CORS origins configured: {_cors_origins or ['(allow all)']}")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=False,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Lifecycle ───

async def coach_watch_weekly_scan():
    """Background task: weekly Coach Watch scan for all Premium tenants."""
    from routes.ai import _search_coaching_news
    from routes.notifications import create_notification
    from subscriptions import get_user_subscription
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    import json
    import uuid

    while True:
        try:
            await asyncio.sleep(604800)  # 7 days

            premium_tenants = await db.tenants.find({"plan": "premium"}, {"_id": 0}).to_list(500)
            logger.info(f"Coach Watch: scanning {len(premium_tenants)} premium tenants")

            for tenant in premium_tenants:
                tenant_id = tenant["tenant_id"]
                try:
                    programs = await db.programs.find({"tenant_id": tenant_id}, {"_id": 0, "university_name": 1}).to_list(100)
                    if not programs:
                        continue

                    school_names = list(set(p["university_name"] for p in programs))
                    news_results = await _search_coaching_news(school_names)

                    news_ctx = ""
                    for school, articles in news_results.items():
                        if articles:
                            news_ctx += f"\n## {school}\n"
                            for a in articles:
                                news_ctx += f"- {a['title']} ({a['date']})\n  {a['body'][:200]}\n"
                        else:
                            news_ctx += f"\n## {school}\nNo recent news found.\n"

                    api_key = os.environ.get("EMERGENT_LLM_KEY")
                    chat = LlmChat(
                        api_key=api_key,
                        session_id=f"cw_auto_{uuid.uuid4().hex[:8]}",
                        system_message="You are a volleyball recruiting analyst. Analyze news for coaching changes. Return ONLY valid JSON.",
                    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

                    prompt = f"""Analyze these news articles about volleyball coaching staff. For EACH school with noteworthy changes, return a JSON array entry.
{news_ctx}
Return JSON array: [{{"university_name":"","severity":"red|yellow|green","headline":"","summary":"","coach_name":"","change_type":"departure|new_hire|extension|staff_change|stable","recommendation":""}}]
If no changes found, return []"""

                    response = await chat.send_message(UserMessage(text=prompt))
                    response_text = response.text if hasattr(response, "text") else str(response)
                    response_text = response_text.strip()
                    if response_text.startswith("```"):
                        response_text = response_text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

                    alerts = json.loads(response_text)
                    if not isinstance(alerts, list):
                        alerts = []

                    from datetime import datetime, timezone
                    now = datetime.now(timezone.utc).isoformat()
                    await db.coach_watch_alerts.delete_many({"tenant_id": tenant_id})

                    if alerts:
                        for alert in alerts:
                            alert["alert_id"] = f"cw_{uuid.uuid4().hex[:12]}"
                            alert["tenant_id"] = tenant_id
                            alert["created_at"] = now
                            alert["read"] = False
                        await db.coach_watch_alerts.insert_many(alerts)

                        if alert.get("severity") in ("red", "yellow"):
                            await create_notification(
                                tenant_id, "coach_watch",
                                f"Coach Watch: {alert['university_name']}",
                                alert.get("headline", "Coaching update detected"),
                                {"university_name": alert["university_name"], "severity": alert["severity"]},
                            )

                    logger.info(f"Coach Watch: {tenant_id} - {len(alerts)} alerts found")
                except Exception as e:
                    logger.error(f"Coach Watch scan error for {tenant_id}: {e}")
                    continue

        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Coach Watch background task error: {e}")
            await asyncio.sleep(3600)  # Retry in 1 hour on error


# ── Monthly GPA Refresh Job ──────────────────────────
async def gpa_refresh_monthly():
    """Monthly background job to refresh GPA data from ProductiveRecruit."""
    import re as _re
    import subprocess
    while True:
        try:
            # Run every 30 days
            await asyncio.sleep(30 * 24 * 3600)

            logger.info("GPA Refresh: Starting monthly scrape")
            result = subprocess.run(
                ["python3", "scripts/scrape_gpa.py"],
                capture_output=True, text=True, timeout=7200,  # 2 hour timeout
                env={**os.environ, "MONGO_URL": os.environ.get("MONGO_URL", ""), "DB_NAME": os.environ.get("DB_NAME", "")},
                cwd=str(ROOT_DIR),
            )
            logger.info(f"GPA Refresh: Complete. stdout={result.stdout[-200:]}")
            if result.returncode != 0:
                logger.error(f"GPA Refresh error: {result.stderr[-300:]}")

        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"GPA Refresh background error: {e}")
            await asyncio.sleep(86400)  # Retry next day


async def demo_date_refresh_loop():
    """Keep demo account dates fresh — runs daily."""
    from scripts.refresh_demo_dates import refresh_demo_dates
    while True:
        try:
            await refresh_demo_dates()
        except Exception as e:
            logger.error(f"Demo date refresh error: {e}")
        await asyncio.sleep(86400)  # 24 hours


@app.on_event("startup")
async def startup_event():
    global reply_check_task, coach_watch_task, inbound_scan_task, gpa_refresh_task, demo_refresh_task
    
    # Create database indexes (idempotent, runs fast if indexes exist)
    from create_indexes import create_indexes
    await create_indexes(db)
    
    # Clean up expired sessions and stale OAuth states
    now = datetime.now(timezone.utc).isoformat()
    expired = await db.user_sessions.delete_many({"expires_at": {"$lt": now}})
    stale_oauth = await db.gmail_oauth_states.delete_many({"created_at": {"$lt": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()}})
    if expired.deleted_count or stale_oauth.deleted_count:
        logger.info(f"Cleanup: {expired.deleted_count} expired sessions, {stale_oauth.deleted_count} stale OAuth states")
    
    # Ensure demo account exists with correct password
    import bcrypt
    demo_email = "demo@capymatch.com"
    demo_pw = "demo2026"
    demo_user = await db.users.find_one({"email": demo_email})
    if demo_user:
        # Verify password matches, reset if not
        if not bcrypt.checkpw(demo_pw.encode(), demo_user["password_hash"].encode()):
            new_hash = bcrypt.hashpw(demo_pw.encode(), bcrypt.gensalt()).decode()
            await db.users.update_one({"email": demo_email}, {"$set": {"password_hash": new_hash}})
            logger.info("Demo account password reset to default")
    else:
        logger.info("Demo account not found — will be created by create_demo.py if needed")
    
    # Start background task for checking coach replies
    reply_check_task = asyncio.create_task(check_coach_replies())
    logger.info("Started background task: coach reply checker (runs every 10 minutes)")
    
    # Start background task for weekly Coach Watch
    coach_watch_task = asyncio.create_task(coach_watch_weekly_scan())
    logger.info("Started background task: Coach Watch (runs weekly)")

    # Start background task for inbound coach contact scanning
    inbound_scan_task = asyncio.create_task(scan_inbound_contacts())
    logger.info("Started background task: inbound coach contact scanner (runs every 2 hours)")

    # Start monthly GPA refresh
    gpa_refresh_task = asyncio.create_task(gpa_refresh_monthly())
    logger.info("Started background task: GPA refresh (runs monthly)")

    # Keep demo account dates fresh
    demo_refresh_task = asyncio.create_task(demo_date_refresh_loop())
    logger.info("Started background task: demo date refresh (runs daily)")

    # One-time KB domain fixes
    domain_fixes = {
        "Palm Beach Atlantic University": "pba.edu",
        "Ball State University": "bsu.edu",
        "University of Tampa": "ut.edu",
        "Murray State University": "murraystate.edu",
        "Loyola University Chicago": "luc.edu",
        "University of South Carolina – Upstate": "uscupstate.edu",
        "Southern Illinois University Carbondale": "siu.edu",
        "Texas State University": "txstate.edu",
        "Penn State": "psu.edu",
    }
    for uni_name, correct_domain in domain_fixes.items():
        r = await db.university_knowledge_base.update_one(
            {"university_name": uni_name, "domain": {"$ne": correct_domain}},
            {"$set": {"domain": correct_domain}},
        )
        if r.modified_count:
            logger.info(f"KB fix: {uni_name} domain → {correct_domain}")


@app.on_event("shutdown")
async def shutdown_db_client():
    global reply_check_task, coach_watch_task, inbound_scan_task, gpa_refresh_task, demo_refresh_task
    
    # Cancel background tasks
    for task in [reply_check_task, coach_watch_task, inbound_scan_task, gpa_refresh_task, demo_refresh_task]:
        if task:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
    
    client.close()
