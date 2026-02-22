"""
Stage 3 — Roster Reality / Commitment Stability Micro-Agent

Produces a combined "Roster Intelligence" card covering:
- Roster spot availability (open | limited | tight | unknown)
- Commitment stability (high | moderate | volatile | unknown)

Deterministic when no roster/history data exists.
AI invoked only when real roster or historical snapshot data is present.

Rules:
- Openings MUST be ranges, never single numbers, never "full" or "no spots"
- Commitment stability requires >= 2 historical roster snapshots
- No inference from division/conference
"""

import json
import logging
import os
import uuid
from datetime import datetime, timezone

logger = logging.getLogger("intelligence.agents.roster_stability")

# ---------------------------------------------------------------------------
# Next action rules (shared with timeline agent pattern)
# ---------------------------------------------------------------------------
NEXT_ACTIONS = {
    "Not Contacted": "Send an introductory email to the coaching staff.",
    "Outreach": "Follow up if no reply within 7-10 days.",
    "Talking": "Ask about unofficial visit opportunities.",
    "Visit": "Send a thank-you note and ask about next steps.",
    "Offer": "Review the offer details with your family.",
    "Committed": "Complete any remaining enrollment paperwork.",
}


def _days_since(iso_str: str | None) -> int | None:
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

async def run_roster_stability(payload: dict, program_id: str) -> dict:
    """
    Produce the Roster Reality / Commitment Stability card.
    Deterministic when no stored roster data exists.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    roster_data = payload.get("roster", {})

    has_roster = bool(roster_data.get("roster_size"))
    snapshots = roster_data.get("roster_snapshots") or []
    has_stability_data = len(snapshots) >= 2

    if has_roster:
        return await _run_ai_roster(payload, program_id, has_stability_data)

    return _build_unknown_card(payload, program_id, now_iso)


def _build_unknown_card(payload: dict, program_id: str, now_iso: str) -> dict:
    """Build the fully deterministic Unknown card."""
    school = payload.get("school", {})
    recruiting = payload.get("recruiting", {})
    dq = payload.get("data_quality", {})

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

    # Insights
    insights = []
    insights.append({
        "text": "No roster data is available for this program. Roster size, class distribution, and openings cannot be determined from stored data.",
        "based_on": ["roster"],
        "citations": [],
        "evidence": "none",
    })
    insights.append({
        "text": "No historical roster snapshots exist. Commitment stability and retention trends cannot be assessed.",
        "based_on": ["roster"],
        "citations": [],
        "evidence": "none",
    })

    # Unknowns
    unknowns = _build_roster_unknowns(payload)
    next_action = NEXT_ACTIONS.get(current_status, "Continue building your recruiting profile.")

    # UI mappings for existing frontend cards
    ui_roster = {
        "status": "unknown",
        "label": "Unknown",
        "openings": None,
        "explanation": "Roster data is not available for this program. Size, class distribution, and openings cannot be assessed from stored data.",
        "guidance": "Ask the coaching staff directly about roster availability and expected openings for your class.",
        "tooltip": "Roster insights require stored roster data including team size and class distribution. This data is not yet available.",
    }

    ui_stability = {
        "status": "unknown",
        "retention_rate": None,
        "signals": [],
        "meaning": "Commitment stability cannot be assessed without at least two historical roster snapshots.",
        "trend": None,
        "history": None,
        "context_tags": [],
    }

    return {
        "card_type": "roster_stability",
        "status": "ok",
        "school_id": program_id,
        "school_name": school.get("name"),
        "division": school.get("division"),
        "roster_label": "Unknown",
        "roster_evidence": "none",
        "stability_label": "Unknown",
        "stability_evidence": "none",
        "label_basis": "none",
        "recruiting_position": recruiting_position,
        "insights": insights,
        "unknowns": unknowns,
        "data_quality": dq,
        "reason": None,
        "missing_sections": ["roster"],
        "next_action": next_action,
        "summary": "Roster availability and commitment stability unknown for this program. No stored roster data.",
        "ui_roster": ui_roster,
        "ui_stability": ui_stability,
        "generated_at": now_iso,
        "cache_ttl_hours": 24,
        "generated_by": "deterministic",
    }


# ---------------------------------------------------------------------------
# AI path (for when real roster data exists — future)
# ---------------------------------------------------------------------------

AI_SYSTEM_PROMPT = """You are a roster and commitment stability analyst for Recruiting HQ.
You produce structured JSON assessments for families evaluating volleyball programs.

HARD RULES:
1. ONLY use stored roster data from the payload. Do NOT synthesize from division or conference.
2. Openings MUST be expressed as ranges (e.g. "2-4"), NEVER single numbers, NEVER "full", NEVER "no spots".
3. roster_label MUST be one of: "Open" (range >= 3 low end), "Limited" (range 1-3 low end), "Tight" (range 0-1 low end), "Unknown".
4. stability_label MUST be one of: "High Stability", "Moderate", "Volatile", "Unknown".
5. Stability requires >= 2 historical roster snapshots. If fewer exist → "Unknown".
6. Use range language ("typically", "approximately", "may have"). Never absolutes.
7. evidence: "strong" when based on complete data, "partial" when incomplete. "none" if no data.
8. based_on must list exact payload field paths. citations must reference section + source_id.
9. Return ONLY valid JSON. No text outside JSON.

OUTPUT SCHEMA:
{
  "roster_label": "Open | Limited | Tight | Unknown",
  "roster_openings_range": "X-Y" or null,
  "stability_label": "High Stability | Moderate | Volatile | Unknown",
  "retention_rate": number or null,
  "insights": [
    { "text": "...", "based_on": [...], "citations": [...], "evidence": "strong|partial|none" }
  ],
  "summary": "Max 30 words."
}

Produce 2-3 insights maximum."""


async def _run_ai_roster(payload: dict, program_id: str, has_stability_data: bool) -> dict:
    """AI-powered roster analysis when real data exists."""
    now_iso = datetime.now(timezone.utc).isoformat()
    school = payload.get("school", {})
    roster_data = payload.get("roster", {})
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
            session_id=f"rs_{uuid.uuid4().hex[:8]}",
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
        logger.error(f"Roster AI error: {e}")
        return _build_unknown_card(payload, program_id, now_iso)

    # Validate labels
    roster_label = ai_output.get("roster_label", "Unknown")
    if roster_label not in ("Open", "Limited", "Tight", "Unknown"):
        roster_label = "Unknown"

    stability_label = ai_output.get("stability_label", "Unknown")
    if stability_label not in ("High Stability", "Moderate", "Volatile", "Unknown"):
        stability_label = "Unknown"
    # Enforce: stability requires >= 2 snapshots
    if not has_stability_data:
        stability_label = "Unknown"

    openings_range = ai_output.get("roster_openings_range")
    retention_rate = ai_output.get("retention_rate")

    # Validate insights
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
                "evidence": item.get("evidence", "strong"),
            })

    unknowns = _build_roster_unknowns(payload)
    next_action = NEXT_ACTIONS.get(current_status, "Continue building your recruiting profile.")
    summary = ai_output.get("summary", "Roster analysis based on stored data.")

    # Map roster_label to status key
    roster_status_map = {"Open": "open", "Limited": "limited", "Tight": "tight", "Unknown": "unknown"}
    stability_status_map = {"High Stability": "high", "Moderate": "moderate", "Volatile": "volatile", "Unknown": "unknown"}

    roster_evidence = "strong" if roster_label != "Unknown" else "none"
    stability_evidence = "strong" if stability_label != "Unknown" else "none"
    basis = "stored_roster" if roster_label != "Unknown" else "none"
    if stability_label != "Unknown":
        basis = "stored_history"

    # UI mapping for RosterRealityCard
    ui_roster = {
        "status": roster_status_map.get(roster_label, "unknown"),
        "label": roster_label,
        "openings": openings_range,
        "explanation": insights[0]["text"] if insights else "Roster outlook based on stored data.",
        "guidance": next_action,
        "tooltip": "Roster insights are based on stored roster data including team size and class distribution.",
    }

    # UI mapping for CommitmentStabilityCard
    stability_signals = []
    if stability_label != "Unknown" and len(insights) > 1:
        for ins in insights[1:]:
            stability_signals.append({"text": ins["text"], "positive": "stable" in ins["text"].lower() or "retain" in ins["text"].lower()})

    ui_stability = {
        "status": stability_status_map.get(stability_label, "unknown"),
        "retention_rate": retention_rate,
        "signals": stability_signals,
        "meaning": summary,
        "trend": None,
        "history": None,
        "context_tags": [],
    }

    missing_sections = []
    if roster_label == "Unknown":
        missing_sections.append("roster")

    return {
        "card_type": "roster_stability",
        "status": "ok",
        "school_id": program_id,
        "school_name": school.get("name"),
        "division": school.get("division"),
        "roster_label": roster_label,
        "roster_evidence": roster_evidence,
        "stability_label": stability_label,
        "stability_evidence": stability_evidence,
        "label_basis": basis,
        "recruiting_position": recruiting_position,
        "insights": insights,
        "unknowns": unknowns,
        "data_quality": dq,
        "reason": None,
        "missing_sections": missing_sections if missing_sections else None,
        "next_action": next_action,
        "summary": summary,
        "ui_roster": ui_roster,
        "ui_stability": ui_stability,
        "generated_at": now_iso,
        "cache_ttl_hours": 24,
        "generated_by": "ai",
    }


# ---------------------------------------------------------------------------
# Unknowns builder
# ---------------------------------------------------------------------------

def _build_roster_unknowns(payload: dict) -> list:
    """Build roster-specific unknowns from known_unknowns."""
    raw = payload.get("known_unknowns", [])
    unknowns = []
    seen = set()

    for text in raw:
        t = text.lower()
        if "roster" in t and "roster.roster_size" not in seen:
            seen.add("roster.roster_size")
            unknowns.append({
                "text": text,
                "missing_data": "roster.roster_size",
                "unlock_hint": "Roster size and class distribution data would enable openings estimates and competition analysis.",
            })

    # Ensure core unknowns are present
    if "roster.roster_size" not in seen:
        unknowns.append({
            "text": "No roster data available for this program. Roster size and class distribution are unknown.",
            "missing_data": "roster.roster_size",
            "unlock_hint": "Roster size and class distribution data would enable openings estimates and competition analysis.",
        })

    if "roster.roster_snapshots" not in seen:
        unknowns.append({
            "text": "No historical roster snapshots exist. Commitment stability requires at least 2 snapshots to assess retention trends.",
            "missing_data": "roster.roster_snapshots",
            "unlock_hint": "Historical roster data from multiple years would enable retention rate and stability trend analysis.",
        })

    # Athlete-specific
    for text in raw:
        t = text.lower()
        if "graduation year" in t and "athlete.grad_year" not in seen:
            seen.add("athlete.grad_year")
            unknowns.append({
                "text": text,
                "missing_data": "athlete.grad_year",
                "unlock_hint": "Graduation year helps assess which class openings are relevant to your recruiting timeline.",
            })

    return unknowns
