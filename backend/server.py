from fastapi import FastAPI
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

# ─── Background Task: Auto-detect coach replies ───

reply_check_task = None

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

@app.on_event("startup")
async def startup_event():
    global reply_check_task
    
    # Start background task for checking coach replies
    reply_check_task = asyncio.create_task(check_coach_replies())
    logger.info("Started background task: coach reply checker (runs every 10 minutes)")


@app.on_event("shutdown")
async def shutdown_db_client():
    global reply_check_task
    
    # Cancel background task
    if reply_check_task:
        reply_check_task.cancel()
        try:
            await reply_check_task
        except asyncio.CancelledError:
            pass
    
    client.close()
