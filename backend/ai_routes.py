from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from emergentintegrations.llm.chat import LlmChat, UserMessage
import os
import uuid
import logging

logger = logging.getLogger(__name__)

ai_router = APIRouter(prefix="/api/ai")

db = None

def set_db(database):
    global db
    db = database


# ─── Auth Helpers (shared) ───

async def get_current_user(request: Request):
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            session_token = auth_header[7:]
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def get_tenant_id(user):
    tenant = await db.tenants.find_one({"owner_user_id": user["user_id"]}, {"_id": 0})
    if tenant:
        return tenant["tenant_id"]
    raise HTTPException(status_code=404, detail="Tenant not found")


# ─── Pydantic Models ───

class DraftEmailRequest(BaseModel):
    program_id: str
    email_type: str = "intro"  # intro, follow_up, thank_you, interest_update
    custom_instructions: Optional[str] = ""


# ─── AI Email Draft ───

@ai_router.post("/draft-email")
async def draft_email(data: DraftEmailRequest, request: Request):
    """Generate a personalized email draft using AI."""
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)

    # Get athlete profile
    profile = await db.athlete_profiles.find_one({"tenant_id": tenant_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=400, detail="Please set up your athlete profile first")

    # Get program and coach info
    program = await db.programs.find_one({"program_id": data.program_id, "tenant_id": tenant_id}, {"_id": 0})
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")

    coaches = await db.coaches.find({"tenant_id": tenant_id, "program_id": data.program_id}, {"_id": 0}).to_list(10)
    head_coach = next((c for c in coaches if c.get("role") == "Head Coach"), coaches[0] if coaches else None)

    # Get recent interactions for context
    interactions = await db.interactions.find(
        {"tenant_id": tenant_id, "program_id": data.program_id}, {"_id": 0}
    ).sort("date_time", -1).to_list(5)

    # Get upcoming events
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    events = await db.events.find(
        {"tenant_id": tenant_id, "start_date": {"$gte": today}}, {"_id": 0}
    ).sort("start_date", 1).to_list(5)

    # Build athlete context
    athlete_info = f"""
Athlete Name: {profile.get('athlete_name', '')}
Position: {profile.get('position', '')}
Graduation Year: {profile.get('grad_year', '')}
Height: {profile.get('height', '')}
High School: {profile.get('high_school', '')}
Club Team: {profile.get('club_team', '')}
GPA: {profile.get('gpa', '')}
City/State: {profile.get('city', '')}, {profile.get('state', '')}
Video Link: {profile.get('video_link', '')}
Jersey Number: {profile.get('jersey_number', '')}
"""

    physical = []
    if profile.get('weight'): physical.append(f"Weight: {profile['weight']}")
    if profile.get('handed'): physical.append(f"Handedness: {profile['handed']}")
    if profile.get('standing_reach'): physical.append(f"Standing Reach: {profile['standing_reach']}")
    if profile.get('approach_touch'): physical.append(f"Approach Touch: {profile['approach_touch']}")
    if profile.get('block_touch'): physical.append(f"Block Touch: {profile['block_touch']}")
    if physical:
        athlete_info += "Physical Stats: " + ", ".join(physical) + "\n"

    # Build school context
    school_info = f"""
University: {program.get('university_name', '')}
Division: {program.get('division', '')}
Conference: {program.get('conference', '')}
Coach Name: {head_coach.get('coach_name', 'Coach') if head_coach else 'Coach'}
Coach Email: {head_coach.get('email', '') if head_coach else ''}
Current Status: {program.get('recruiting_status', '')}
"""

    if interactions:
        school_info += "\nRecent Interaction History:\n"
        for ix in interactions[:3]:
            school_info += f"- {ix.get('type', '')} on {ix.get('date_time', '')[:10]}: {ix.get('outcome', '')}\n"

    events_info = ""
    if events:
        events_info = "\nUpcoming Events the athlete is attending:\n"
        for evt in events[:3]:
            events_info += f"- {evt.get('title', '')} ({evt.get('event_type', '')}) on {evt.get('start_date', '')} at {evt.get('location', '')}\n"

    # Build prompt based on email type
    email_prompts = {
        "intro": "Write an initial outreach/introduction email from the athlete to the college volleyball coach. This is the first contact. Be enthusiastic but professional. Include the athlete's key stats, position, video link, and express genuine interest in the program.",
        "follow_up": "Write a polite follow-up email. Reference that the athlete previously reached out and hasn't heard back. Restate interest and offer to provide any additional information. Keep it concise and respectful of the coach's time.",
        "thank_you": "Write a thank-you email after attending a camp, clinic, or campus visit. Express gratitude for the opportunity, mention something specific about the experience, and reaffirm interest in the program.",
        "interest_update": "Write an update email sharing new achievements, stats, or upcoming events where the coach could see the athlete play. Keep it informative and brief.",
    }

    prompt_instruction = email_prompts.get(data.email_type, email_prompts["intro"])

    system_message = """You are ghostwriting recruiting emails for a high school volleyball player. Your #1 job is to sound EXACTLY like a real teenager wrote this — not an AI, not a college counselor, not a parent.

How real teens write:
- Short, simple sentences. No fancy vocabulary or SAT words.
- Slightly casual but still respectful. Think texting a teacher you like.
- They don't use phrases like "I am writing to express my interest" or "I would like to take this opportunity" — nobody talks like that.
- They say things like "I've been following your program" not "I have been closely monitoring your program's trajectory"
- They use contractions (I'm, I've, don't, can't) — always.
- They might start a sentence with "Also" or "And" — that's fine.
- No clichés like "passion for the game", "take my skills to the next level", "dream school", or "since I was young"
- Stats are mentioned casually, not listed like a resume.
- The sign-off is simple: "Thanks, [Name]" — not "Warm regards" or "Respectfully yours"

Absolute DON'Ts:
- Do NOT sound polished, templated, or corporate
- Do NOT use bullet points or numbered lists in the email body
- Do NOT start with "Dear Coach" — use "Hi Coach [LastName]," or "Coach [LastName],"
- Do NOT use words like "furthermore", "additionally", "thus", "hence", "endeavor", "utilize"
- Do NOT write more than 150 words. Coaches read hundreds of these — shorter is better.
- Do NOT use any subject line prefix like "Subject:" — just provide the email body

Format rules:
- Write in first person as the athlete
- Always include the video link if available (drop it naturally, not formally)
- Mention ONE specific thing about the school/program — shows you did your homework
- End with a simple ask (would love to talk, happy to send more info, etc.)
- Return response as JSON with "subject" and "body" fields only
- Subject line should be direct and simple, like a real person would write it"""

    user_prompt = f"""{prompt_instruction}

{athlete_info}
{school_info}
{events_info}

{f"Additional instructions from the athlete: {data.custom_instructions}" if data.custom_instructions else ""}

Return ONLY valid JSON: {{"subject": "email subject line", "body": "email body text"}}"""

    try:
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        chat = LlmChat(
            api_key=api_key,
            session_id=f"draft_{uuid.uuid4().hex[:8]}",
            system_message=system_message,
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")

        response = await chat.send_message(UserMessage(text=user_prompt))

        # Parse the JSON response
        import json
        # Try to extract JSON from the response
        response_text = response.strip()
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        result = json.loads(response_text)

        return {
            "subject": result.get("subject", ""),
            "body": result.get("body", ""),
            "email_type": data.email_type,
            "coach_name": head_coach.get("coach_name", "") if head_coach else "",
            "coach_email": head_coach.get("email", "") if head_coach else "",
        }

    except json.JSONDecodeError:
        # If JSON parsing fails, try to use the raw response
        return {
            "subject": f"Introduction - {profile.get('athlete_name', '')} | Class of {profile.get('grad_year', '')} {profile.get('position', '')}",
            "body": response_text,
            "email_type": data.email_type,
            "coach_name": head_coach.get("coach_name", "") if head_coach else "",
            "coach_email": head_coach.get("email", "") if head_coach else "",
        }
    except Exception as e:
        logger.error(f"AI draft error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate email draft: {str(e)}")
