from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from pathlib import Path
import os
import logging
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from database import db, client

app = FastAPI()

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


# ─── Stripe Webhook (must be outside router prefix) ───

@app.post("/api/webhook/stripe")
async def stripe_webhook(request: Request):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    import os
    api_key = os.environ.get("STRIPE_API_KEY")
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    try:
        event = await stripe_checkout.handle_webhook(body, sig)
        logging.getLogger(__name__).info(f"Stripe webhook: {event.event_type} session={event.session_id}")
    except Exception as e:
        logging.getLogger(__name__).error(f"Stripe webhook error: {e}")
    return {"ok": True}

# ─── Background Task: Auto-detect coach replies ───

reply_check_task = None
coach_watch_task = None
inbound_scan_task = None

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
            
            for token_doc in gmail_tokens:
                user_id = token_doc["user_id"]
                
                try:
                    # Get user's tenant_id
                    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
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

            for token_doc in gmail_tokens:
                user_id = token_doc["user_id"]
                try:
                    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
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

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
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

                    for alert in alerts:
                        alert["alert_id"] = f"cw_{uuid.uuid4().hex[:12]}"
                        alert["tenant_id"] = tenant_id
                        alert["created_at"] = now
                        alert["read"] = False
                        await db.coach_watch_alerts.insert_one(alert)

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


@app.on_event("startup")
async def startup_event():
    global reply_check_task, coach_watch_task, inbound_scan_task, gpa_refresh_task
    
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


@app.on_event("shutdown")
async def shutdown_db_client():
    global reply_check_task, coach_watch_task, inbound_scan_task, gpa_refresh_task
    
    # Cancel background tasks
    for task in [reply_check_task, coach_watch_task, inbound_scan_task, gpa_refresh_task]:
        if task:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
    
    client.close()
