from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone
from database import db
from auth import get_current_user, get_tenant_id
from subscriptions import get_user_subscription, enforce_ai_limit, enforce_feature, track_ai_usage
from models import DraftEmailRequest
from emergentintegrations.llm.chat import LlmChat, UserMessage
import os
import uuid
import json
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai")


@router.post("/draft-email")
async def draft_email(data: DraftEmailRequest, request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)

    # Enforce AI draft limit
    subscription = await get_user_subscription(tenant_id)
    await enforce_ai_limit(tenant_id, subscription)

    profile = await db.athlete_profiles.find_one({"tenant_id": tenant_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=400, detail="Please set up your athlete profile first")

    program = await db.programs.find_one({"program_id": data.program_id, "tenant_id": tenant_id}, {"_id": 0})
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")

    coaches = await db.coaches.find({"tenant_id": tenant_id, "program_id": data.program_id}, {"_id": 0}).to_list(10)
    head_coach = next((c for c in coaches if c.get("role") == "Head Coach"), coaches[0] if coaches else None)

    interactions = await db.interactions.find(
        {"tenant_id": tenant_id, "program_id": data.program_id}, {"_id": 0}
    ).sort("date_time", -1).to_list(5)

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    events = await db.events.find(
        {"tenant_id": tenant_id, "start_date": {"$gte": today}}, {"_id": 0}
    ).sort("start_date", 1).to_list(5)

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

        response_text = response.strip()
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        result = json.loads(response_text)

        # Track successful AI usage
        await track_ai_usage(tenant_id)

        return {
            "subject": result.get("subject", ""),
            "body": result.get("body", ""),
            "email_type": data.email_type,
            "coach_name": head_coach.get("coach_name", "") if head_coach else "",
            "coach_email": head_coach.get("email", "") if head_coach else "",
        }

    except json.JSONDecodeError:
        # Track usage even on JSON parse fail (AI was still called)
        await track_ai_usage(tenant_id)
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


from pydantic import BaseModel

class JourneySummaryRequest(BaseModel):
    program_id: str


@router.post("/journey-summary")
async def generate_journey_summary(data: JourneySummaryRequest, request: Request):
    """Generate AI summary of recruiting journey with a program"""
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)

    # Enforce AI draft limit (journey summaries count toward AI usage)
    subscription = await get_user_subscription(tenant_id)
    await enforce_ai_limit(tenant_id, subscription)
    
    program = await db.programs.find_one({"program_id": data.program_id, "tenant_id": tenant_id}, {"_id": 0})
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    
    profile = await db.athlete_profiles.find_one({"tenant_id": tenant_id}, {"_id": 0})
    
    # Get coaches
    coaches = await db.coaches.find(
        {"tenant_id": tenant_id, "program_id": data.program_id}, 
        {"_id": 0}
    ).to_list(10)
    head_coach = next((c for c in coaches if c.get("role") == "Head Coach"), coaches[0] if coaches else None)
    
    # Get interactions
    interactions = await db.interactions.find(
        {"tenant_id": tenant_id, "program_id": data.program_id}, 
        {"_id": 0}
    ).sort("date_time", -1).to_list(50)
    
    # Get events linked to this program
    events = await db.events.find(
        {"tenant_id": tenant_id, "program_id": data.program_id},
        {"_id": 0}
    ).to_list(20)
    
    # Build context for AI
    context = f"""
Program: {program.get('university_name', '')}
Division: {program.get('division', '')}
Conference: {program.get('conference', '')}
Current Recruiting Status: {program.get('recruiting_status', 'Not Contacted')}
Reply Status: {program.get('reply_status', 'No Reply')}
Priority: {program.get('priority', 'Medium')}
Initial Contact Date: {program.get('initial_contact_sent', 'Not yet')}
Last Follow-up: {program.get('last_follow_up', 'None')}
Next Action: {program.get('next_action', 'None')}
Next Action Due: {program.get('next_action_due', 'Not set')}
Notes: {program.get('notes', '')}

Coach: {head_coach.get('coach_name', 'Unknown') if head_coach else 'No coach added'}
Coach Email: {head_coach.get('email', '') if head_coach else ''}
"""
    
    if interactions:
        context += "\n\nInteraction History (most recent first):\n"
        for ix in interactions[:10]:
            context += f"- {ix.get('date_time', '')[:10]}: {ix.get('type', '')} - {ix.get('outcome', '')}. {ix.get('notes', '')}\n"
    
    if events:
        context += "\n\nEvents Attended:\n"
        for evt in events[:5]:
            context += f"- {evt.get('start_date', '')}: {evt.get('title', '')} ({evt.get('event_type', '')}) at {evt.get('location', '')}\n"
    
    athlete_name = profile.get('athlete_name', 'The athlete') if profile else 'The athlete'
    
    system_message = """You are a recruiting advisor helping a volleyball athlete understand their relationship with a college program.

Your job is to:
1. Summarize the recruiting journey so far in 2-3 sentences
2. Highlight 2-3 key moments or milestones
3. Suggest a specific next action based on the current status

Be encouraging but realistic. Use simple language a teenager would understand.

Return ONLY valid JSON in this exact format:
{
  "relationship_summary": "2-3 sentence summary of the relationship and where things stand",
  "key_highlights": ["highlight 1", "highlight 2", "highlight 3"],
  "suggested_action": "Specific actionable next step",
  "action_type": "email" or "call" or "wait" or "event" or "other"
}"""
    
    user_prompt = f"""Analyze this recruiting journey and provide a summary:

{context}

What should {athlete_name} do next with {program.get('university_name', 'this program')}?

Return ONLY valid JSON."""
    
    try:
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        chat = LlmChat(
            api_key=api_key,
            session_id=f"journey_{uuid.uuid4().hex[:8]}",
            system_message=system_message,
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        response = await chat.send_message(UserMessage(text=user_prompt))
        
        response_text = response.strip()
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        result = json.loads(response_text)

        # Track AI usage
        await track_ai_usage(tenant_id)
        
        return {
            "relationship_summary": result.get("relationship_summary", ""),
            "key_highlights": result.get("key_highlights", []),
            "suggested_action": result.get("suggested_action", ""),
            "action_type": result.get("action_type", "other"),
            "program_id": data.program_id,
            "university_name": program.get("university_name", ""),
            "coach_name": head_coach.get("coach_name", "") if head_coach else "",
        }
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {e}, response: {response_text}")
        return {
            "relationship_summary": "Unable to generate summary. Please try again.",
            "key_highlights": [],
            "suggested_action": "Review your interactions and decide on next steps.",
            "action_type": "other",
        }
    except Exception as e:
        logger.error(f"Journey summary error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate summary: {str(e)}")
