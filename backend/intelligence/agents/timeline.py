"""
Stage 3 — Timeline Intelligence Micro-Agent

Produces the "Recruiting Timeline Intelligence" card.
Deterministic when no commit timing data exists (label = "Unknown").
AI invoked only when real timeline signals are present in the payload.

Output labels: Fills Early | Standard Timeline | Late Opportunities | Unknown
"""

import json
import logging
import os
import uuid
from datetime import datetime, timezone

logger = logging.getLogger("intelligence.agents.timeline")

# ---------------------------------------------------------------------------
# Allowed labels
# ---------------------------------------------------------------------------
ALLOWED_LABELS = {"Fills Early", "Standard Timeline", "Late Opportunities", "Unknown"}

STATUS_KEY_MAP = {
    "Fills Early": "filling_early",
    "Standard Timeline": "standard",
    "Late Opportunities": "late",
    "Unknown": "unknown",
}

# ---------------------------------------------------------------------------
# Next action rules (deterministic, from recruiting status + interactions)
# ---------------------------------------------------------------------------
NEXT_ACTIONS = {
    "Not Contacted": "Send an introductory email to the coaching staff.",
    "Outreach": "Follow up if no reply within 7–10 days.",
    "Talking": "Ask about unofficial visit opportunities.",
    "Visit": "Send a thank-you note and ask about next steps.",
    "Offer": "Review the offer details with your family.",
    "Committed": "Complete any remaining enrollment paperwork.",
}


def _days_since(iso_str: str | None) -> int | None:
    """Days between an ISO date and now."""
    if not iso_str:
        return None
    try:
        dt = datetime.fromisoformat(iso_str)
        return max(0, (datetime.now(timezone.utc) - dt).days)
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Core agent
# ---------------------------------------------------------------------------

async def run_timeline_intelligence(payload: dict, program_id: str) -> dict:
    """
    Produce the Timeline Intelligence card.
    Deterministic when no commit timing signals exist.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    school = payload.get("school", {})
    recruiting = payload.get("recruiting", {})
    timeline_data = payload.get("timeline", {})
    dq = payload.get("data_quality", {})

    school_name = school.get("name")
    division = school.get("division")

    # ------------------------------------------------------------------
    # 1. Check for real commit timing signals
    # ------------------------------------------------------------------
    has_signals = bool(timeline_data.get("commit_timing_signals"))
    signal_count = len(timeline_data.get("commit_timing_signals", []) or [])

    # Minimum evidence threshold: need at least 3 data points across cycles
    # to produce a confident label. Thin evidence → Unknown.
    MIN_SIGNAL_COUNT = 3

    if has_signals and signal_count >= MIN_SIGNAL_COUNT:
        return await _run_ai_timeline(payload, program_id)

    # If signals exist but are too sparse, note it but still return Unknown
    sparse_signals = has_signals and signal_count < MIN_SIGNAL_COUNT

    # ------------------------------------------------------------------
    # 2. Deterministic path: no commit timing data → Unknown
    # ------------------------------------------------------------------

    # Recruiting position (always populated from user data)
    current_status = recruiting.get("status", "Unknown")
    interaction_count = recruiting.get("interaction_count", 0)
    last_interaction = recruiting.get("last_interaction")
    created_at = recruiting.get("created_at") or payload.get("now")
    days_on_board = _days_since(created_at) or 0

    recruiting_position = {
        "current_status": current_status,
        "interaction_count": interaction_count,
        "last_interaction": last_interaction,
        "days_on_board": days_on_board,
    }

    # Insights (max 2)
    insights = []

    # Insight 1: timeline data gap (or sparse data notice)
    if sparse_signals:
        insights.append({
            "text": f"Some commit timing signals exist ({signal_count} data point(s)), but the sample is too small for confident pattern analysis. A minimum of {MIN_SIGNAL_COUNT} data points across recruiting cycles is required.",
            "based_on": ["timeline.commit_timing_signals"],
            "citations": [],
            "evidence": "partial",
        })
    else:
        insights.append({
            "text": "No program-level commit timing data is available. Timeline patterns cannot be determined from stored data.",
            "based_on": ["timeline"],
            "citations": [],
            "evidence": "none",
        })

    # Insight 2: user's recruiting position
    source_lookup = {s["section"]: s.get("source_id", "unknown") for s in payload.get("sources", [])}
    if interaction_count > 0 and last_interaction:
        last_type = last_interaction.get("type", "interaction")
        last_date = last_interaction.get("date")
        days_ago = _days_since(last_date)
        days_text = f" ({days_ago} days ago)" if days_ago is not None else ""
        insights.append({
            "text": f"Current status is '{current_status}' with {interaction_count} interaction(s) logged. Most recent: {last_type}{days_text}.",
            "based_on": ["recruiting.status", "recruiting.interaction_count", "recruiting.last_interaction"],
            "citations": [{"section": "recruiting", "source_id": source_lookup.get("recruiting", "user_input:program")}],
            "evidence": "strong",
        })
    else:
        insights.append({
            "text": f"This school was added {days_on_board} day(s) ago with status '{current_status}' and no interactions logged.",
            "based_on": ["recruiting.status", "recruiting.interaction_count"],
            "citations": [{"section": "recruiting", "source_id": source_lookup.get("recruiting", "user_input:program")}],
            "evidence": "strong",
        })

    # Unknowns (from payload.known_unknowns + timeline-specific)
    unknowns = _build_timeline_unknowns(payload)

    # Next action
    next_action = NEXT_ACTIONS.get(current_status, "Continue building your recruiting profile.")

    # Summary
    if interaction_count > 0:
        summary = f"Timeline patterns unknown for this program. {interaction_count} interaction(s) logged so far."
    else:
        summary = "Timeline patterns unknown for this program. No outreach initiated."

    # UI mapping (so TimelineStatusCard works without frontend changes)
    ui = {
        "status": "unknown",
        "label": "Unknown",
        "explanation": "No commit timing data is available for this program. Timeline patterns cannot be assessed from stored data.",
        "guidance": next_action,
        "tooltip": "Timeline insights require historical commit dates or program-specific recruiting patterns. This data is not yet available.",
    }

    return {
        "card_type": "timeline_intelligence",
        "status": "ok",
        "school_id": program_id,
        "school_name": school_name,
        "division": division,
        "timeline_label": "Unknown",
        "timeline_evidence": "none",
        "label_basis": "none",
        "recruiting_position": recruiting_position,
        "insights": insights,
        "unknowns": unknowns,
        "data_quality": dq,
        "reason": None,
        "missing_sections": ["timeline"],
        "next_action": next_action,
        "summary": summary,
        "ui": ui,
        "generated_at": now_iso,
        "cache_ttl_hours": 24,
        "generated_by": "deterministic",
    }


# ---------------------------------------------------------------------------
# AI path (for when real timeline data exists — future)
# ---------------------------------------------------------------------------

AI_SYSTEM_PROMPT = """You are a recruiting timeline analyst for CapyMatch.
You produce structured JSON timeline assessments for families evaluating volleyball programs.

HARD RULES:
1. ONLY use stored commit timing data from the payload. Do NOT synthesize from division or conference.
2. timeline_label MUST be one of: "Fills Early", "Standard Timeline", "Late Opportunities", "Unknown".
3. If commit_timing_signals is null or missing → label MUST be "Unknown".
4. Use range language ("typically", "often", "may") — never absolutes ("always", "never", "full", "no spots").
5. evidence: "strong" only when commit data exists and supports the claim. "partial" when interaction-only. "none" when no data.
6. based_on must list exact payload field paths. citations must reference section + source_id.
7. Return ONLY valid JSON matching the schema. No text outside JSON.

OUTPUT SCHEMA:
{
  "timeline_label": "Fills Early | Standard Timeline | Late Opportunities | Unknown",
  "insights": [
    { "text": "...", "based_on": [...], "citations": [...], "evidence": "strong|partial|none" }
  ],
  "summary": "Max 30 words, parent-safe."
}

Produce 2-3 insights maximum. If commit_timing_signals is present, use it to determine the label."""


async def _run_ai_timeline(payload: dict, program_id: str) -> dict:
    """AI-powered timeline analysis when real signals exist."""
    now_iso = datetime.now(timezone.utc).isoformat()
    school = payload.get("school", {})
    recruiting = payload.get("recruiting", {})
    dq = payload.get("data_quality", {})
    source_lookup = {s["section"]: s.get("source_id", "unknown") for s in payload.get("sources", [])}

    current_status = recruiting.get("status", "Unknown")
    interaction_count = recruiting.get("interaction_count", 0)
    last_interaction = recruiting.get("last_interaction")
    created_at = recruiting.get("created_at") or payload.get("now")
    days_on_board = _days_since(created_at) or 0

    recruiting_position = {
        "current_status": current_status,
        "interaction_count": interaction_count,
        "last_interaction": last_interaction,
        "days_on_board": days_on_board,
    }

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        chat = LlmChat(
            api_key=api_key,
            session_id=f"ti_{uuid.uuid4().hex[:8]}",
            system_message=AI_SYSTEM_PROMPT,
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")

        clean = {k: v for k, v in payload.items() if k != "missing_fields"}
        user_prompt = f"PAYLOAD:\n{json.dumps(clean, separators=(',', ':'))}"
        response = await chat.send_message(UserMessage(text=user_prompt))
        response_text = response.strip() if isinstance(response, str) else str(response).strip()

        if response_text.startswith("```"):
            response_text = response_text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        ai_output = json.loads(response_text)
    except Exception as e:
        logger.error(f"Timeline AI error: {e}")
        # Fall back to deterministic Unknown
        return await run_timeline_intelligence(
            {**payload, "timeline": {}}, program_id
        )

    # Validate label
    label = ai_output.get("timeline_label", "Unknown")
    if label not in ALLOWED_LABELS:
        label = "Unknown"

    status_key = STATUS_KEY_MAP.get(label, "unknown")
    evidence = "strong" if label != "Unknown" else "partial"
    basis = "stored_signals" if label != "Unknown" else "none"

    insights = []
    for item in ai_output.get("insights", [])[:3]:
        if isinstance(item, dict) and "text" in item:
            based_on = item.get("based_on", [])
            citations = []
            for path in based_on:
                section = path.split(".")[0] if "." in path else path
                sid = source_lookup.get(section)
                if sid:
                    citations.append({"section": section, "source_id": sid})
            insights.append({
                "text": item["text"],
                "based_on": based_on,
                "citations": citations,
                "evidence": item.get("evidence", evidence),
            })

    unknowns = _build_timeline_unknowns(payload)
    next_action = NEXT_ACTIONS.get(current_status, "Continue building your recruiting profile.")
    summary = ai_output.get("summary", f"Timeline: {label}.")

    # Explanation/guidance for UI
    explanation_map = {
        "Fills Early": "This program typically commits athletes earlier than average based on stored data.",
        "Standard Timeline": "This program typically fills spots within the standard recruiting window.",
        "Late Opportunities": "This program often has roster openings later in the recruiting cycle.",
        "Unknown": "Commit timing data is not yet available for this program.",
    }
    guidance_map = {
        "Fills Early": "Earlier outreach and follow-up may be important if this school is a priority.",
        "Standard Timeline": "Outreach within the next few months is recommended to stay competitive.",
        "Late Opportunities": "You can continue building your profile and reach out as opportunities arise.",
        "Unknown": next_action,
    }

    ui = {
        "status": status_key,
        "label": label,
        "explanation": explanation_map.get(label, ""),
        "guidance": guidance_map.get(label, next_action),
        "tooltip": "Timeline insights are based on stored commit timing data and program-specific patterns.",
    }

    missing_sections = ["timeline"] if label == "Unknown" else None

    return {
        "card_type": "timeline_intelligence",
        "status": "ok",
        "school_id": program_id,
        "school_name": school.get("name"),
        "division": school.get("division"),
        "timeline_label": label,
        "timeline_evidence": evidence,
        "label_basis": basis,
        "recruiting_position": recruiting_position,
        "insights": insights,
        "unknowns": unknowns,
        "data_quality": dq,
        "reason": None,
        "missing_sections": missing_sections,
        "next_action": next_action,
        "summary": summary,
        "ui": ui,
        "generated_at": now_iso,
        "cache_ttl_hours": 24,
        "generated_by": "ai",
    }


# ---------------------------------------------------------------------------
# Unknowns builder
# ---------------------------------------------------------------------------

def _build_timeline_unknowns(payload: dict) -> list:
    """Build timeline-specific unknowns from known_unknowns."""
    raw = payload.get("known_unknowns", [])
    unknowns = []
    seen = set()

    # Always include the core timeline unknown
    core = "timeline.commit_timing_signals"
    for text in raw:
        t = text.lower()
        if "timeline" in t or "commit" in t or "interaction" in t:
            if core not in seen:
                seen.add(core)
                unknowns.append({
                    "text": text,
                    "missing_data": "timeline.commit_timing_signals",
                    "unlock_hint": "Historical commit dates and program-specific recruiting patterns would enable timeline analysis.",
                })

    # If no timeline unknown was found in payload, add one explicitly
    if core not in seen:
        unknowns.append({
            "text": "No commit timing data exists for this program. Timeline analysis relies on user-logged interactions only.",
            "missing_data": "timeline.commit_timing_signals",
            "unlock_hint": "Historical commit dates and program-specific recruiting patterns would enable timeline analysis.",
        })

    # Athlete-specific unknowns relevant to timeline
    for text in raw:
        t = text.lower()
        if "graduation year" in t and "athlete.grad_year" not in seen:
            seen.add("athlete.grad_year")
            unknowns.append({
                "text": text,
                "missing_data": "athlete.grad_year",
                "unlock_hint": "Graduation year enables assessment of timeline relevance and recruiting window.",
            })

    return unknowns
