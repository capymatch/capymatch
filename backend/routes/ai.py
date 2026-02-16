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
    enforce_feature(subscription, "recruiting_insights", "Outreach Analysis", "pro")

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