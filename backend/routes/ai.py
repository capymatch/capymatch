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
        "intro": """Write an initial outreach email from the athlete to a college coach.

Tone: confident, enthusiastic, and respectful — not formal.
Length: short and easy to scan.

Include:
- A brief self-introduction (name, grad year, position)
- One or two key athletic details or stats
- A natural mention of a highlight video link
- A clear reason for interest in THIS program (1 specific detail)
- A polite closing that invites next steps

Do not use greetings like "Dear Coach."
Avoid clichés and generic praise.""",

        "follow_up": """Write a concise follow-up email from the athlete to a coach.

Context:
- The athlete previously sent an introduction
- No response yet

Tone:
- Polite, confident, and respectful
- No guilt, no pressure, no apologies

Include:
- A brief reference to the earlier message
- A short restatement of interest in the program
- One small new detail (training update, season progress, or upcoming event)
- A simple, professional closing

Keep it short and direct.
Do not sound frustrated or overly eager.""",

        "thank_you": """Write a thank-you email from the athlete after attending a camp, clinic, or campus visit.

Tone:
- Appreciative and genuine
- Confident, not overly formal

Include:
- Thanks for the opportunity
- One specific detail from the experience (drill, coaching moment, facility, or interaction)
- A short sentence reaffirming interest in the program
- A clean, respectful closing

Avoid generic phrases like "great experience" without detail.
Keep the message under 120 words.""",

        "interest_update": """Write an interest update email from the athlete to a coach.

Purpose:
- Share new achievements, progress, or upcoming events

Include:
- One or two meaningful updates (stats, awards, role change, or schedule)
- Why this update matters to the athlete's development
- A natural reference to where the coach can watch (video or event)
- A short restatement of interest in the program

Keep it focused and readable.
Do not list too many stats.""",
    }

    prompt_instruction = email_prompts.get(data.email_type, email_prompts["intro"])

    system_message = """You are ghostwriting on behalf of a high school athlete.

CRITICAL: You will be given the athlete's real profile data. You MUST use the EXACT values provided (name, height, position, grad year, GPA, video link, etc.). Do NOT make up, estimate, or change any stats. If a field is empty, skip it — do NOT insert placeholders like [Athlete Name] or [video link].

Writing style:
- Short, clear sentences
- Casual but respectful
- Use contractions
- Sound like a real teenager, not a marketing email
- No clichés, no corporate language

Rules:
- Do not start with "Dear Coach"
- Keep emails under 150 words
- Mention one specific detail about the school or program
- Include the video link naturally (not as a callout) — only if a real URL is provided
- Do not exaggerate or oversell
- Tone should be confident, not desperate
- Sign off with the athlete's actual name — not "[Athlete Name]"

The email should feel personal, simple, and authentic.

If the athlete is underclassman, keep language exploratory.
If upperclassman, make intent clearer but still respectful.

Format rules:
- Write in first person as the athlete
- Return response as JSON with "subject" and "body" fields only
- Subject line should be direct and simple, like a real person would write it"""

    user_prompt = f"""{prompt_instruction}

USE THIS EXACT ATHLETE DATA (do not change any values):
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


class NextStepRequest(BaseModel):
    program_id: str


@router.post("/next-step")
async def ai_next_step(data: NextStepRequest, request: Request):
    """AI-powered next step suggestion based on journey timeline. Premium only."""
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)

    subscription = await get_user_subscription(tenant_id)
    await enforce_ai_limit(tenant_id, subscription)

    program = await db.programs.find_one({"program_id": data.program_id, "tenant_id": tenant_id}, {"_id": 0})
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")

    profile = await db.athlete_profiles.find_one({"tenant_id": tenant_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=400, detail="Please set up your athlete profile first")

    interactions = await db.interactions.find(
        {"tenant_id": tenant_id, "program_id": data.program_id}, {"_id": 0}
    ).sort("date_time", -1).to_list(50)

    # Map recruiting_status to journey stage
    status_to_stage = {
        "Not Contacted": "Targeting",
        "Contacted": "Contacted",
        "Applied": "Engaged",
        "Camp Attended": "Evaluating",
        "Offer Received": "Offer",
        "Committed": "Closed",
        "Not Interested": "Closed",
    }
    stage = status_to_stage.get(program.get("recruiting_status", "Not Contacted"), "Targeting")

    # Map reply_status to coach response
    reply_to_response = {
        "No Reply": "no response",
        "Awaiting Reply": "no response",
        "Reply Received": "responded",
        "In Conversation": "asked for info",
    }
    coach_response = reply_to_response.get(program.get("reply_status", "No Reply"), "no response")

    # Calculate last contact info
    last_contact_date = "N/A"
    last_contact_method = "N/A"
    days_since_response = "N/A"
    if interactions:
        last = interactions[0]
        last_contact_date = last.get("date_time", "")[:10] if last.get("date_time") else "N/A"
        type_map = {"Phone Call": "call", "Video Call": "call", "Text Message": "email",
                     "Campus Visit": "visit", "Camp Meeting": "camp", "Showcase": "camp"}
        last_contact_method = type_map.get(last.get("type", ""), "email")
        if last.get("date_time"):
            try:
                last_dt = datetime.fromisoformat(last["date_time"].replace("Z", "+00:00"))
                days_since_response = (datetime.now(timezone.utc) - last_dt).days
            except Exception:
                days_since_response = "unknown"

    # Engagement signals
    coach_viewed = "unknown"
    coach_attended = "unknown"
    camp_upcoming = "no"
    watch_alert = "no"

    # Check for upcoming camps/events linked to this program
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    upcoming_events = await db.events.find(
        {"tenant_id": tenant_id, "start_date": {"$gte": today}}, {"_id": 0}
    ).sort("start_date", 1).to_list(10)
    camp_events = [e for e in upcoming_events if e.get("event_type", "").lower() in ("camp", "clinic", "showcase")]
    if camp_events:
        camp_upcoming = f"yes — {camp_events[0].get('title', '')} on {camp_events[0].get('start_date', '')}"

    # Check coach watch alerts
    coach_alert = await db.coach_watch_alerts.find_one(
        {"tenant_id": tenant_id, "university_name": program.get("university_name", "")}, {"_id": 0}
    )
    if coach_alert and coach_alert.get("severity") in ("red", "yellow"):
        watch_alert = f"yes — {coach_alert.get('headline', 'Staff change detected')}"

    # NCAA contact window (simplified — assume open for D2/D3, check timing for D1)
    division = program.get("division", "")
    ncaa_contact_open = "yes" if division in ("D2", "D3", "NAIA", "JUCO") else "check current NCAA calendar"

    # Upcoming tournaments from events
    tournament_events = [e for e in upcoming_events if e.get("event_type", "").lower() in ("tournament", "showcase", "match")]
    tournaments_detail = "None scheduled"
    if tournament_events:
        tournaments_detail = "; ".join([f"{e.get('title', '')} on {e.get('start_date', '')}" for e in tournament_events[:3]])

    system_message = """You are an AI recruiting assistant for a college-bound student-athlete.

Your job is to recommend the single most important "Next Step" for a specific college program,
based on the athlete's recruiting timeline, communication history, and engagement signals.

You must adapt your recommendations based on NCAA division differences:

Division I:
- Coaches often recruit earlier.
- Timing and follow-up cadence matter.
- Emphasize visibility, highlights, camps, and responsiveness.
- Respect NCAA contact windows strictly.

Division II:
- Coaches recruit later and value consistent communication.
- Emphasize relationship-building, follow-ups, camps, and unofficial visits.
- Outreach is often welcomed sooner and more directly.

Division III:
- Recruiting is coach-driven and relationship-focused.
- Academics and admissions alignment are critical.
- Emphasize direct communication, admissions coordination, and visits.
- NCAA contact restrictions are minimal.

Your recommendation must be:
- Actionable and realistic
- Appropriate to the division
- Clear enough for a parent or athlete to act on immediately

Return ONLY valid JSON in this format:
{
  "next_step": "The single best next step — one clear sentence",
  "reasoning": "Brief 1-2 sentence explanation of why this is the right move",
  "urgency": "high" or "medium" or "low",
  "action_type": "email" or "call" or "visit" or "camp" or "highlight" or "academic" or "wait"
}

Do not provide multiple options. Return ONE best next step."""

    user_prompt = f"""Student Profile:
- Graduation Year: {profile.get('grad_year', 'N/A')}
- Sport: Volleyball
- Position: {profile.get('position', 'N/A')}
- GPA: {profile.get('gpa', 'N/A')}
- Current Journey Stage: {stage}
  (Targeting | Contacted | Engaged | Evaluating | Visit | Offer | Closed)

School Context:
- School Name: {program.get('university_name', 'N/A')}
- NCAA Division: {division or 'N/A'} (D1 | D2 | D3)
- Conference: {program.get('conference', 'N/A')}

Communication History:
- Last Contact Date: {last_contact_date}
- Last Contact Method: {last_contact_method}
- Coach Response Status: {coach_response}
- Days Since Last Coach Response: {days_since_response}

Engagement Signals:
- Coach viewed highlights: {coach_viewed}
- Coach attended event or watched film: {coach_attended}
- Camp or clinic upcoming: {camp_upcoming}
- Watch Alert or staff change: {watch_alert}

Timeline Constraints:
- NCAA contact window open: {ncaa_contact_open}
- Upcoming tournaments/showcases: {tournaments_detail}

Task:
Based on all information above, suggest the single best Next Step for this athlete at this school.

If direct contact is not permitted due to NCAA rules,
recommend a compliant alternative action (camp, highlight update, academic prep).

Return ONLY valid JSON."""

    try:
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        chat = LlmChat(
            api_key=api_key,
            session_id=f"nextstep_{uuid.uuid4().hex[:8]}",
            system_message=system_message,
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")

        response = await chat.send_message(UserMessage(text=user_prompt))
        response_text = response.strip()
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        result = json.loads(response_text)

        await track_ai_usage(tenant_id)

        return {
            "next_step": result.get("next_step", ""),
            "reasoning": result.get("reasoning", ""),
            "urgency": result.get("urgency", "medium"),
            "action_type": result.get("action_type", "email"),
            "program_id": data.program_id,
            "university_name": program.get("university_name", ""),
        }

    except json.JSONDecodeError:
        await track_ai_usage(tenant_id)
        return {
            "next_step": response_text[:300] if response_text else "Review your timeline and follow up with the coaching staff.",
            "reasoning": "AI generated a recommendation but in an unexpected format.",
            "urgency": "medium",
            "action_type": "email",
            "program_id": data.program_id,
            "university_name": program.get("university_name", ""),
        }
    except Exception as e:
        logger.error(f"AI next step error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate next step: {str(e)}")


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



# ── AI Assistant (Pro+) ───────────────────────────────────────

@router.post("/assistant")
async def ai_assistant(request: Request):
    """AI Recruiting Assistant - conversational chat with context."""
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)

    subscription = await get_user_subscription(tenant_id)
    await enforce_ai_limit(tenant_id, subscription)

    body = await request.json()
    message = body.get("message", "").strip()
    session_id = body.get("session_id", f"asst_{uuid.uuid4().hex[:8]}")

    if not message:
        raise HTTPException(status_code=400, detail="Message is required")

    # Gather context
    profile = await db.athlete_profiles.find_one({"tenant_id": tenant_id}, {"_id": 0}) or {}
    programs = await db.programs.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(30)
    interactions = await db.interactions.find({"tenant_id": tenant_id}, {"_id": 0}).sort("date_time", -1).to_list(20)

    # Load conversation history
    history = await db.ai_conversations.find(
        {"session_id": session_id, "tenant_id": tenant_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(20)

    athlete_ctx = f"""Athlete: {profile.get('athlete_name', 'Unknown')}
Position: {profile.get('position', '')} | Grad Year: {profile.get('grad_year', '')}
GPA: {profile.get('gpa', '')} | State: {profile.get('state', '')}
Height: {profile.get('height', '')} | Club: {profile.get('club_team', '')}"""

    school_list = ", ".join([f"{p.get('university_name', '')} ({p.get('recruiting_status', '')})" for p in programs[:15]])
    recent_activity = "\n".join([
        f"- {i.get('type', '')} with {i.get('university_name', '')} on {i.get('date_time', '')}: {i.get('outcome', '')}"
        for i in interactions[:10]
    ])

    system_message = f"""You are an expert volleyball recruiting advisor. You help high school athletes navigate the college recruiting process.

ATHLETE CONTEXT:
{athlete_ctx}

CURRENT PIPELINE ({len(programs)} schools):
{school_list or "No schools added yet"}

RECENT ACTIVITY:
{recent_activity or "No recent interactions"}

GUIDELINES:
- Give specific, actionable advice based on the athlete's profile and pipeline
- Reference actual schools in their pipeline when relevant
- Keep answers concise (2-4 paragraphs max) but helpful
- Consider NCAA recruiting rules and timelines
- Be encouraging but realistic
- If asked about a school not in their pipeline, suggest adding it
- Use their name when appropriate"""

    try:
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=system_message,
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")

        # Add conversation history as context
        for h in history[-6:]:
            if h.get("role") == "user":
                await chat.send_message(UserMessage(text=h["content"]))

        response = await chat.send_message(UserMessage(text=message))
        response_text = response.text if hasattr(response, "text") else str(response)

        await track_ai_usage(tenant_id)

        # Save conversation
        now = datetime.now(timezone.utc).isoformat()
        await db.ai_conversations.insert_one({
            "session_id": session_id,
            "tenant_id": tenant_id,
            "role": "user",
            "content": message,
            "created_at": now,
        })
        await db.ai_conversations.insert_one({
            "session_id": session_id,
            "tenant_id": tenant_id,
            "role": "assistant",
            "content": response_text,
            "created_at": now,
        })

        return {"response": response_text, "session_id": session_id}

    except Exception as e:
        logger.error(f"AI Assistant error: {e}")
        raise HTTPException(status_code=500, detail=f"Assistant error: {str(e)}")


@router.get("/assistant/history")
async def get_assistant_history(session_id: str, request: Request):
    """Get conversation history for a session."""
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)

    messages = await db.ai_conversations.find(
        {"session_id": session_id, "tenant_id": tenant_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(50)

    return {"messages": messages, "session_id": session_id}


@router.get("/assistant/sessions")
async def get_assistant_sessions(request: Request):
    """List recent assistant sessions."""
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)

    pipeline = [
        {"$match": {"tenant_id": tenant_id}},
        {"$sort": {"created_at": -1}},
        {"$group": {
            "_id": "$session_id",
            "last_message": {"$first": "$content"},
            "last_at": {"$first": "$created_at"},
            "count": {"$sum": 1},
        }},
        {"$sort": {"last_at": -1}},
        {"$limit": 10},
    ]
    sessions = await db.ai_conversations.aggregate(pipeline).to_list(10)
    return {"sessions": [{"session_id": s["_id"], "preview": s["last_message"][:80], "last_at": s["last_at"], "messages": s["count"]} for s in sessions]}


# ── Outreach Analysis (Premium) ──────────────────────────────

@router.get("/outreach-analysis")
async def outreach_analysis(request: Request):
    """AI-powered analysis of recruiting outreach effectiveness."""
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)

    subscription = await get_user_subscription(tenant_id)
    enforce_feature(subscription, "auto_reply_detection", "Outreach Analysis", "premium")

    # Gather all data
    programs = await db.programs.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(100)
    interactions = await db.interactions.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(500)
    profile = await db.athlete_profiles.find_one({"tenant_id": tenant_id}, {"_id": 0}) or {}

    if not programs:
        return {"analysis": None, "message": "Add schools to your pipeline first to get outreach analysis."}

    # Compute stats
    total_interactions = len(interactions)
    by_type = {}
    by_outcome = {}
    by_school = {}
    replied_schools = set()

    for i in interactions:
        t = i.get("type", "Other")
        o = i.get("outcome", "No Response")
        school = i.get("university_name", "Unknown")
        by_type[t] = by_type.get(t, 0) + 1
        by_outcome[o] = by_outcome.get(o, 0) + 1
        by_school[school] = by_school.get(school, 0) + 1
        if o in ("Positive Response", "Reply Received"):
            replied_schools.add(school)

    response_rate = len(replied_schools) / len(programs) * 100 if programs else 0

    # Division breakdown
    by_division = {}
    for p in programs:
        d = p.get("division", "Unknown")
        status = p.get("reply_status", "No Reply")
        if d not in by_division:
            by_division[d] = {"total": 0, "replied": 0}
        by_division[d]["total"] += 1
        if status != "No Reply":
            by_division[d]["replied"] += 1

    # Build context for AI analysis
    stats_ctx = f"""
OUTREACH STATS:
- Total schools: {len(programs)}
- Total interactions: {total_interactions}
- Schools that replied: {len(replied_schools)}
- Response rate: {response_rate:.0f}%

BY TYPE: {json.dumps(by_type)}
BY OUTCOME: {json.dumps(by_outcome)}
BY DIVISION: {json.dumps(by_division)}

TOP SCHOOLS BY ACTIVITY: {json.dumps(dict(sorted(by_school.items(), key=lambda x: -x[1])[:10]))}

ATHLETE: {profile.get('athlete_name', '')} - {profile.get('position', '')} - Class of {profile.get('grad_year', '')}
"""

    try:
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        chat = LlmChat(
            api_key=api_key,
            session_id=f"outreach_{uuid.uuid4().hex[:8]}",
            system_message="You are an expert volleyball recruiting data analyst. Analyze the athlete's outreach data and provide actionable insights. Return ONLY valid JSON.",
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")

        prompt = f"""{stats_ctx}

Analyze this recruiting outreach data and return JSON:
{{
  "overall_score": <1-100 score>,
  "score_label": "<Excellent/Good/Needs Work/Getting Started>",
  "summary": "<2-3 sentence overview>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<improvement 1>", "<improvement 2>", "<improvement 3>"],
  "division_insights": "<insights about D1/D2/D3 response patterns>",
  "next_steps": ["<specific action 1>", "<specific action 2>", "<specific action 3>"],
  "best_performing_type": "<which interaction type works best>"
}}"""

        response = await chat.send_message(UserMessage(text=prompt))
        response_text = response.text if hasattr(response, "text") else str(response)
        response_text = response_text.strip()
        if response_text.startswith("```"):
            response_text = response_text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        await track_ai_usage(tenant_id)
        ai_insights = json.loads(response_text)

        return {
            "analysis": {
                "ai_insights": ai_insights,
                "stats": {
                    "total_schools": len(programs),
                    "total_interactions": total_interactions,
                    "replied_schools": len(replied_schools),
                    "response_rate": round(response_rate, 1),
                    "by_type": by_type,
                    "by_outcome": by_outcome,
                    "by_division": by_division,
                    "top_schools": dict(sorted(by_school.items(), key=lambda x: -x[1])[:5]),
                },
            },
        }

    except json.JSONDecodeError:
        return {
            "analysis": {
                "ai_insights": None,
                "stats": {
                    "total_schools": len(programs),
                    "total_interactions": total_interactions,
                    "replied_schools": len(replied_schools),
                    "response_rate": round(response_rate, 1),
                    "by_type": by_type,
                    "by_outcome": by_outcome,
                    "by_division": by_division,
                },
            },
        }
    except Exception as e:
        logger.error(f"Outreach analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")


# ── Highlight Reel Advisor (Premium) ─────────────────────────

@router.post("/highlight-advice")
async def highlight_reel_advice(request: Request):
    """AI-powered highlight reel recommendations based on athlete profile."""
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)

    subscription = await get_user_subscription(tenant_id)
    enforce_feature(subscription, "auto_reply_detection", "Highlight Reel Advisor", "premium")

    body = await request.json()
    question = body.get("question", "")

    profile = await db.athlete_profiles.find_one({"tenant_id": tenant_id}, {"_id": 0}) or {}
    programs = await db.programs.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(30)

    divisions = list(set(p.get("division", "") for p in programs if p.get("division")))

    athlete_ctx = f"""Athlete: {profile.get('athlete_name', 'Unknown')}
Position: {profile.get('position', 'Unknown')}
Height: {profile.get('height', '')}
Grad Year: {profile.get('grad_year', '')}
Club Team: {profile.get('club_team', '')}
Targeting Divisions: {', '.join(divisions) if divisions else 'Not specified'}
Number of target schools: {len(programs)}"""

    system_message = """You are an expert volleyball recruiting video consultant. You help athletes create highlight reels that get coaches' attention. You know what college coaches look for at every level (D1, D2, D3, NAIA, JUCO). Return ONLY valid JSON."""

    prompt = f"""{athlete_ctx}

{f"Athlete's question: {question}" if question else "Provide comprehensive highlight reel recommendations."}

Return JSON:
{{
  "video_length": "<recommended length>",
  "structure": [
    {{"section": "<section name>", "duration": "<time>", "description": "<what to include>"}},
    ...
  ],
  "must_include_skills": ["<skill 1>", "<skill 2>", ...],
  "avoid": ["<what to avoid 1>", "<what to avoid 2>"],
  "technical_tips": ["<tip 1>", "<tip 2>", ...],
  "position_specific": "<position-specific advice>",
  "coach_perspective": "<what coaches look for first>",
  "distribution_tips": ["<how to share 1>", "<how to share 2>"]
}}"""

    try:
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        chat = LlmChat(
            api_key=api_key,
            session_id=f"highlight_{uuid.uuid4().hex[:8]}",
            system_message=system_message,
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")

        response = await chat.send_message(UserMessage(text=prompt))
        response_text = response.text if hasattr(response, "text") else str(response)
        response_text = response_text.strip()
        if response_text.startswith("```"):
            response_text = response_text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        await track_ai_usage(tenant_id)
        advice = json.loads(response_text)

        return {"advice": advice}

    except json.JSONDecodeError:
        return {"advice": {"error": "Unable to generate advice. Please try again."}}
    except Exception as e:
        logger.error(f"Highlight advice error: {e}")
        raise HTTPException(status_code=500, detail=f"Highlight advice error: {str(e)}")


# ── Coach Watch (Premium) ─────────────────────────────────────

async def _search_coaching_news(school_names: list[str]) -> dict:
    """Search for volleyball coaching news for given schools using DuckDuckGo."""
    from duckduckgo_search import DDGS
    import asyncio

    results = {}
    ddgs = DDGS()

    def _search(school):
        try:
            articles = ddgs.news(f'"{school}" volleyball head coach', max_results=5)
            return school, [{"title": a.get("title", ""), "url": a.get("url", ""), "date": a.get("date", ""), "body": a.get("body", "")} for a in articles]
        except Exception as e:
            logger.warning(f"Coach watch search failed for {school}: {e}")
            return school, []

    loop = asyncio.get_event_loop()
    for school in school_names:
        name, articles = await loop.run_in_executor(None, _search, school)
        results[name] = articles

    return results


@router.post("/coach-watch/scan")
async def coach_watch_scan(request: Request):
    """Scan for coaching changes at schools in user's pipeline. Premium only."""
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)

    subscription = await get_user_subscription(tenant_id)
    enforce_feature(subscription, "auto_reply_detection", "Coach Watch", "premium")

    programs = await db.programs.find({"tenant_id": tenant_id}, {"_id": 0, "university_name": 1}).to_list(100)
    if not programs:
        return {"alerts": [], "message": "Add schools to your pipeline first."}

    school_names = list(set(p["university_name"] for p in programs))

    # Search for news
    news_results = await _search_coaching_news(school_names)

    # Build context for AI
    news_ctx = ""
    for school, articles in news_results.items():
        if articles:
            news_ctx += f"\n## {school}\n"
            for a in articles:
                news_ctx += f"- {a['title']} ({a['date']})\n  {a['body'][:200]}\n"
        else:
            news_ctx += f"\n## {school}\nNo recent news found.\n"

    try:
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        chat = LlmChat(
            api_key=api_key,
            session_id=f"coachwatch_{uuid.uuid4().hex[:8]}",
            system_message="You are a volleyball recruiting analyst specializing in coaching staff changes. Analyze news articles and identify coaching changes, contract updates, and staff stability. Return ONLY valid JSON.",
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")

        prompt = f"""Analyze these recent news articles about volleyball coaching staff at these universities.
For EACH school, determine:
- Is there a coaching change (departure, new hire, firing)?
- Is there a contract update (extension, expiration)?
- Is the coaching situation stable?

NEWS ARTICLES:
{news_ctx}

Return a JSON array. One entry per school. ONLY include schools where something noteworthy was found (changes, extensions, new hires, departures). Skip schools with no news or no relevant coaching updates.

[
  {{
    "university_name": "School Name",
    "severity": "red|yellow|green",
    "headline": "Short alert headline",
    "summary": "2-3 sentence summary of the situation",
    "coach_name": "Coach name involved",
    "change_type": "departure|new_hire|extension|contract_update|staff_change|stable",
    "recommendation": "What this means for a recruit targeting this school"
  }}
]

Severity guide:
- red: Head coach departed/fired, or new head coach hired (major disruption)
- yellow: Assistant changes, contract negotiations, rumors, new coach in early tenure (year 1-2)
- green: Contract extension, long-tenured stable coach (positive signal)

If NO schools have noteworthy coaching news, return an empty array: []"""

        response = await chat.send_message(UserMessage(text=prompt))
        response_text = response.text if hasattr(response, "text") else str(response)
        response_text = response_text.strip()
        if response_text.startswith("```"):
            response_text = response_text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        await track_ai_usage(tenant_id)
        alerts = json.loads(response_text)

        if not isinstance(alerts, list):
            alerts = []

        # Store alerts in DB
        now = datetime.now(timezone.utc).isoformat()
        await db.coach_watch_alerts.delete_many({"tenant_id": tenant_id})

        from routes.notifications import create_notification

        for alert in alerts:
            alert["alert_id"] = f"cw_{uuid.uuid4().hex[:12]}"
            alert["tenant_id"] = tenant_id
            alert["created_at"] = now
            alert["read"] = False
            await db.coach_watch_alerts.insert_one(alert)
            alert.pop("_id", None)

            # Create notification for red/yellow alerts
            if alert.get("severity") in ("red", "yellow"):
                await create_notification(
                    tenant_id,
                    "coach_watch",
                    f"Coach Watch: {alert['university_name']}",
                    alert.get("headline", "Coaching update detected"),
                    {"university_name": alert["university_name"], "severity": alert["severity"]},
                )

        return {"alerts": alerts, "scanned_at": now, "schools_scanned": len(school_names)}

    except json.JSONDecodeError:
        return {"alerts": [], "error": "Failed to parse AI response"}
    except Exception as e:
        logger.error(f"Coach watch error: {e}")
        raise HTTPException(status_code=500, detail=f"Coach watch error: {str(e)}")


@router.get("/coach-watch/alerts")
async def get_coach_watch_alerts(request: Request):
    """Get stored coach watch alerts for user's pipeline."""
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)

    subscription = await get_user_subscription(tenant_id)
    enforce_feature(subscription, "auto_reply_detection", "Coach Watch", "premium")

    alerts = await db.coach_watch_alerts.find({"tenant_id": tenant_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"alerts": alerts}


@router.get("/coach-watch/alert/{university_name}")
async def get_coach_watch_alert_for_school(university_name: str, request: Request):
    """Get coach watch alert for a specific school (used by Journey page)."""
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)

    alert = await db.coach_watch_alerts.find_one(
        {"tenant_id": tenant_id, "university_name": university_name},
        {"_id": 0}
    )
    return {"alert": alert}


# ── Source-Aware School Insight (Pro+) ────────────────────────

from routes.athlete_profile import _normalize_school_name as _norm_name


async def _find_university_kb(name: str, domain: str = ""):
    """Multi-strategy lookup for a university in the knowledge base."""
    import re as _re
    # Strategy 1: Exact name
    result = await db.university_knowledge_base.find_one({"university_name": name}, {"_id": 0})
    if result:
        return result

    # Strategy 2: Domain match
    if domain:
        result = await db.university_knowledge_base.find_one({"domain": domain}, {"_id": 0})
        if result:
            return result

    # Strategy 3: Normalized text matching
    norm = _norm_name(name)
    if len(norm) < 3:
        return None

    key_words = [w for w in norm.split() if len(w) > 2]
    if key_words:
        regex_pattern = "".join(f"(?=.*{_re.escape(w)})" for w in key_words[:3])
        candidates = await db.university_knowledge_base.find(
            {"university_name": {"$regex": regex_pattern, "$options": "i"}},
            {"_id": 0}
        ).to_list(5)

        if len(candidates) == 1:
            return candidates[0]

        if candidates:
            best = None
            best_score = 0
            for c in candidates:
                c_norm = _norm_name(c["university_name"])
                matches = sum(1 for w in key_words if w in c_norm)
                len_sim = 1 - abs(len(norm) - len(c_norm)) / max(len(norm), len(c_norm), 1)
                score = matches + len_sim
                if score > best_score:
                    best_score = score
                    best = c
            if best and best_score >= 1.5:
                return best

    return None


@router.delete("/school-insight/{program_id}/cache")
async def clear_school_insight_cache(program_id: str, request: Request):
    """Clear cached insight for a specific school to force regeneration."""
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    await db.ai_school_insights.delete_one({"tenant_id": tenant_id, "program_id": program_id})
    return {"cleared": True}


@router.post("/school-insight/{program_id}")
async def get_school_insight(program_id: str, request: Request):
    """Source-aware AI reasoning for a specific school. Returns top reasons, risks, and confidence."""
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)

    subscription = await get_user_subscription(tenant_id)
    await enforce_ai_limit(tenant_id, subscription)

    # Check cache first (24-hour TTL)
    cache_key = {"tenant_id": tenant_id, "program_id": program_id}
    cached = await db.ai_school_insights.find_one(cache_key, {"_id": 0})
    if cached:
        created = cached.get("created_at", "")
        try:
            cache_dt = datetime.fromisoformat(created)
            age_hours = (datetime.now(timezone.utc) - cache_dt).total_seconds() / 3600
            if age_hours < 24:
                return cached.get("insight", {})
        except Exception:
            pass

    # Load program
    program = await db.programs.find_one({"program_id": program_id, "tenant_id": tenant_id}, {"_id": 0})
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")

    # Load athlete profile
    profile = await db.athlete_profiles.find_one({"tenant_id": tenant_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=400, detail="Complete your athlete profile first")

    # Load university knowledge base data — multi-strategy lookup
    uni_name = program.get("university_name", "")
    uni_data = await _find_university_kb(uni_name, program.get("domain", ""))

    # Build source records
    sources = []
    now_iso = datetime.now(timezone.utc).isoformat()

    scorecard = (uni_data or {}).get("scorecard") or program.get("scorecard_data") or {}
    if scorecard:
        sc_fields = []
        if scorecard.get("sat_avg"): sc_fields.append("sat_avg")
        if scorecard.get("act_midpoint"): sc_fields.append("act_midpoint")
        if scorecard.get("admission_rate") is not None: sc_fields.append("acceptance_rate")
        if scorecard.get("graduation_rate"): sc_fields.append("graduation_rate")
        if scorecard.get("retention_rate"): sc_fields.append("retention_rate")
        if scorecard.get("tuition_in_state"): sc_fields.append("tuition")
        if scorecard.get("student_size"): sc_fields.append("student_size")
        if scorecard.get("estimated_avg_gpa"): sc_fields.append("estimated_avg_gpa")
        sources.append({
            "source_id": "COLLEGE_SCORECARD",
            "source_type": "IPEDS",
            "retrieved_at": scorecard.get("synced_at", now_iso),
            "fields_supported": sc_fields,
        })

    if uni_data:
        uni_fields = []
        if uni_data.get("coaches_scraped"): uni_fields.append("coaching_staff")
        if uni_data.get("coaches_source_url"): uni_fields.append("coaches_url")
        if uni_data.get("avg_gpa"): uni_fields.append("avg_gpa")
        if uni_fields:
            sources.append({
                "source_id": "SCHOOL_SITE_SCRAPE",
                "source_type": "SchoolSite",
                "retrieved_at": (uni_data or {}).get("coaches_scraped_at", now_iso),
                "fields_supported": uni_fields,
            })

    # Always add program-level source from knowledge base
    if uni_data and uni_data.get("division"):
        sources.append({
            "source_id": "KNOWLEDGE_BASE",
            "source_type": "Manual",
            "retrieved_at": now_iso,
            "fields_supported": ["division", "conference", "region", "scholarship_type"],
        })

    # Build the structured input for the AI
    school_context = {
        "name": uni_name,
        "division": program.get("division", ""),
        "conference": program.get("conference", ""),
        "region": program.get("region", ""),
    }

    academics_context = {}
    if scorecard.get("sat_avg"): academics_context["sat_avg"] = scorecard["sat_avg"]
    if scorecard.get("act_midpoint"): academics_context["act_midpoint"] = scorecard["act_midpoint"]
    if scorecard.get("admission_rate") is not None: academics_context["acceptance_rate"] = scorecard["admission_rate"]
    if scorecard.get("graduation_rate"): academics_context["graduation_rate"] = scorecard["graduation_rate"]
    # Prefer real GPA over estimated
    if scorecard.get("avg_gpa") and not scorecard.get("gpa_is_estimated"):
        academics_context["avg_gpa"] = scorecard["avg_gpa"]
        academics_context["gpa_source"] = scorecard.get("gpa_source", "productiverecruit.com")
    elif scorecard.get("estimated_avg_gpa"):
        academics_context["avg_gpa"] = scorecard["estimated_avg_gpa"]
        academics_context["gpa_is_estimated"] = True

    athlete_context = {
        "graduation_year": profile.get("graduation_year") or profile.get("grad_year", ""),
        "gpa": profile.get("gpa", ""),
        "sat_score": profile.get("sat_score", ""),
        "act_score": profile.get("act_score", ""),
        "position": profile.get("position", ""),
        "state": profile.get("state", ""),
        "priorities": profile.get("priorities", []),
        "preferred_divisions": profile.get("division", []),
        "preferred_regions": profile.get("regions", []),
    }

    # Compute existing intelligence for context
    from routes.athlete_profile import (
        _compute_risk_badges, _compute_timeline_status, _compute_roster_outlook,
        _compute_scholarship_structure, _compute_nil_readiness, _compute_suggestion_match
    )

    match_result = _compute_suggestion_match(program if not uni_data else {**program, **(uni_data or {})}, profile)
    risk_badges = _compute_risk_badges(program, profile, match_result["reasons"])
    timeline_status = _compute_timeline_status(program, profile)
    roster_outlook = _compute_roster_outlook(program, profile)
    scholarship = _compute_scholarship_structure(program)
    nil_readiness = _compute_nil_readiness(program)

    # Build the full structured input
    structured_input = json.dumps({
        "school": school_context,
        "academics": academics_context,
        "athlete": athlete_context,
        "existing_intelligence": {
            "match_score": match_result["score"],
            "match_reasons": match_result["reasons"],
            "risk_badges": [b["key"] for b in risk_badges],
            "timeline": timeline_status.get("status", "unknown"),
            "roster": roster_outlook.get("status", "unknown"),
            "scholarship": scholarship.get("status", "unknown"),
            "nil": nil_readiness.get("status", "unknown"),
        },
        "sources": sources,
    }, indent=2)

    system_message = """You are the "Recruiting HQ Source-Aware Intelligence Agent."

Your job is to generate recruiting insights that families can trust. You must be conservative, transparent, and never invent facts.

Non-Negotiable Rules
1. Never hallucinate or guess silently. If a field is missing, say it's missing.
2. Every factual claim must be backed by a source record provided in the input context.
3. If no valid source supports a claim, you must either omit the claim, or mark it explicitly as Estimate or Unknown.
4. Separate facts from interpretations: Facts = "Program Data", Interpretations = "AI Insight"
5. Use calm, parent-safe language. No guarantees, no "almost full," no money promises.

Output Requirements (STRICT JSON)

Return a single JSON object with this exact shape:

{
  "program_data": {
    "academic_fit": {
      "status": "Complete|Partial|Incomplete",
      "inputs_used": ["SAT","ACT","GPA","TestOptionalPolicy"],
      "notes": "",
      "sources": ["source_id"]
    },
    "roster_outlook": {
      "label": "Open|Limited|Tight|Unknown",
      "estimated_openings_range": "e.g., 2-4|Unknown",
      "notes": "",
      "sources": ["source_id"]
    },
    "recruiting_timeline": {
      "label": "Late Opportunities|Standard|Filling Early|Unknown",
      "notes": "",
      "sources": ["source_id"]
    },
    "scholarship_structure": {
      "label": "Typically Partial|Mix of Partial and Full|Walk-on Pathways Common|Unknown",
      "notes": "",
      "sources": ["source_id"]
    },
    "nil_readiness": {
      "label": "NIL-Friendly Environment|NIL-Limited Environment|NIL Information Limited",
      "notes": "",
      "sources": ["source_id"]
    }
  },
  "ai_insight": {
    "top_reasons": [
      {"text": "", "supports": ["program_data_key"], "sources": ["source_id"]},
      {"text": "", "supports": ["program_data_key"], "sources": ["source_id"]},
      {"text": "", "supports": ["program_data_key"], "sources": ["source_id"]}
    ],
    "top_risks": [
      {"text": "", "supports": ["program_data_key"], "sources": ["source_id"]},
      {"text": "", "supports": ["program_data_key"], "sources": ["source_id"]}
    ]
  },
  "data_confidence": {
    "level": "High|Medium|Limited",
    "reasons": ["", "", ""]
  },
  "disclaimers": [
    "Insights are based on public data and historical trends and may change.",
    "Scholarship and NIL outcomes are not guaranteed."
  ]
}

Additional Hard Constraints:
- top_reasons must be exactly 3 items (use "Unknown" only if necessary).
- top_risks must be exactly 3 items.
- Each reason/risk must reference at least one program_data_key in supports.
- Each reason/risk must include at least one source_id. If you truly cannot, set text to "Limited data available to support this insight." and sources to [] and lower confidence to Limited.

Data Confidence Logic:
High: At least 3 categories have sources, sources are recent, at least one is high-quality (IPEDS/CDS/SchoolSite)
Medium: 2 categories have sources OR some sources are stale, data includes at least one high-quality source
Limited: 0-1 categories have sources OR most data is missing/stale

Academic Fit Handling:
- If SAT/ACT exist: use SAT/ACT + GPA (if GPA exists)
- If SAT/ACT missing but GPA exists: GPA-only fit and mark status: Partial
- If no academic inputs: mark status: Incomplete and note "Add GPA/test scores to improve match accuracy."
- Never assume average test scores.

Roster Outlook: If roster data exists estimate openings. If no roster data label Unknown. Never say "full" or "no spots."

NIL: No dollar amounts. No promises. Only the allowed labels.

Style: calm, supportive, confident. Avoid dramatic language. Prefer "may", "typically", "based on public data".

Return ONLY the JSON. No extra commentary."""

    user_prompt = f"""Analyze this school for the athlete and return source-aware insights.

INPUT DATA:
{structured_input}

Return ONLY valid JSON matching the exact schema specified."""

    try:
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        chat = LlmChat(
            api_key=api_key,
            session_id=f"insight_{uuid.uuid4().hex[:8]}",
            system_message=system_message,
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")

        response = await chat.send_message(UserMessage(text=user_prompt))
        response_text = response.strip() if isinstance(response, str) else str(response).strip()
        if response_text.startswith("```"):
            response_text = response_text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        await track_ai_usage(tenant_id)
        insight = json.loads(response_text)

        # Validate structure
        if "ai_insight" not in insight or "program_data" not in insight:
            raise ValueError("Missing required keys in AI response")

        # Ensure exactly 3 reasons and 3 risks
        reasons = insight.get("ai_insight", {}).get("top_reasons", [])
        risks = insight.get("ai_insight", {}).get("top_risks", [])
        while len(reasons) < 3:
            reasons.append({"text": "Limited data available to support this insight.", "supports": [], "sources": []})
        while len(risks) < 3:
            risks.append({"text": "Limited data available to support this insight.", "supports": [], "sources": []})
        insight["ai_insight"]["top_reasons"] = reasons[:3]
        insight["ai_insight"]["top_risks"] = risks[:3]

        # Add metadata
        result = {
            "insight": insight,
            "program_id": program_id,
            "university_name": uni_name,
            "generated_at": now_iso,
            "sources_used": sources,
        }

        # Cache the result
        await db.ai_school_insights.update_one(
            cache_key,
            {"$set": {**cache_key, "insight": result, "created_at": now_iso}},
            upsert=True,
        )

        return result

    except json.JSONDecodeError as e:
        logger.error(f"School insight JSON error: {e}, response: {response_text[:200]}")
        await track_ai_usage(tenant_id)
        # Return a fallback structure
        return _build_fallback_insight(program_id, uni_name, sources, now_iso)
    except Exception as e:
        logger.error(f"School insight error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate school insight: {str(e)}")


def _build_fallback_insight(program_id, uni_name, sources, now_iso):
    """Build a minimal fallback when AI response fails to parse."""
    return {
        "insight": {
            "program_data": {
                "academic_fit": {"status": "Incomplete", "inputs_used": [], "notes": "Unable to analyze at this time.", "sources": []},
                "roster_outlook": {"label": "Unknown", "estimated_openings_range": "Unknown", "notes": "", "sources": []},
                "recruiting_timeline": {"label": "Unknown", "notes": "", "sources": []},
                "scholarship_structure": {"label": "Unknown", "notes": "", "sources": []},
                "nil_readiness": {"label": "NIL Information Limited", "notes": "", "sources": []},
            },
            "ai_insight": {
                "top_reasons": [
                    {"text": "Limited data available to support this insight.", "supports": [], "sources": []},
                    {"text": "Limited data available to support this insight.", "supports": [], "sources": []},
                    {"text": "Limited data available to support this insight.", "supports": [], "sources": []},
                ],
                "top_risks": [
                    {"text": "Limited data available to support this insight.", "supports": [], "sources": []},
                    {"text": "Limited data available to support this insight.", "supports": [], "sources": []},
                    {"text": "Limited data available to support this insight.", "supports": [], "sources": []},
                ],
            },
            "data_confidence": {"level": "Limited", "reasons": ["AI analysis unavailable. Try again later."]},
            "disclaimers": [
                "Insights are based on public data and historical trends and may change.",
                "Scholarship and NIL outcomes are not guaranteed.",
            ],
        },
        "program_id": program_id,
        "university_name": uni_name,
        "generated_at": now_iso,
        "sources_used": sources,
    }
