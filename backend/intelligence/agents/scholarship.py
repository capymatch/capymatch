"""
Stage 3 — Scholarship Structure Micro-Agent

Produces the "Scholarship Structure" intelligence card.
Deterministic when no scholarship_notes data exists (label = "Unknown").
AI invoked only when real scholarship signals are present in the payload.

Output labels: Mix of Partial and Full | Typically Partial | Walk-On Pathways Common | Unknown

Rules:
- No dollar amounts, no percentages, no guarantees
- No specific scholarship counts (e.g., "12 scholarships")
- Use "may", "typically", "often" — never absolutes
- If scholarship_notes exist but are non-specific → label "Unknown", evidence "partial"
- Contributed data stays pending_verification and NEVER upgrades evidence to "strong"
"""

import json
import logging
import os
import uuid
from datetime import datetime, timezone

logger = logging.getLogger("intelligence.agents.scholarship")

# ---------------------------------------------------------------------------
# Allowed labels (must match app-wide UI exactly)
# ---------------------------------------------------------------------------
ALLOWED_LABELS = {
    "Mix of Partial and Full",
    "Typically Partial",
    "Walk-On Pathways Common",
    "Unknown",
}

STATUS_KEY_MAP = {
    "Mix of Partial and Full": "mix",
    "Typically Partial": "partial",
    "Walk-On Pathways Common": "walkon",
    "Unknown": "unknown",
}

# ---------------------------------------------------------------------------
# Division context — parent-safe, no numbers, no guarantees
# ---------------------------------------------------------------------------
DIVISION_CONTEXT = {
    "D1": "Division I athletic aid may include partial awards and varies by program and year.",
    "D2": "Division II programs typically distribute athletic aid across the roster as partial awards.",
    "D3": "Division III programs do not offer athletic scholarships. Financial aid is need-based or merit-based.",
    "NAIA": "NAIA programs may offer partial athletic aid that varies by institution and sport.",
    "JUCO": "Junior college programs may offer partial athletic aid that varies by institution.",
}

# ---------------------------------------------------------------------------
# Next action rules
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

async def run_scholarship_structure(payload: dict, program_id: str) -> dict:
    """
    Produce the Scholarship Structure card.
    Deterministic when no stored scholarship data exists.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    scholarship_data = payload.get("scholarship", {})

    has_notes = bool(scholarship_data.get("scholarship_notes"))

    if has_notes:
        return await _run_ai_scholarship(payload, program_id)

    return _build_unknown_card(payload, program_id, now_iso)


def _build_unknown_card(payload: dict, program_id: str, now_iso: str) -> dict:
    """Build the fully deterministic Unknown card."""
    school = payload.get("school", {})
    recruiting = payload.get("recruiting", {})
    dq = payload.get("data_quality", {})

    division = (school.get("division") or "").upper()
    school_name = school.get("name")

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

    source_lookup = {
        s["section"]: s.get("source_id", "unknown")
        for s in payload.get("sources", [])
    }

    # Insights
    insights = []

    # Insight 1: Division-level factual context (parent-safe, no numbers)
    div_context = DIVISION_CONTEXT.get(division)
    if div_context:
        insights.append({
            "text": div_context,
            "based_on": ["school.division"],
            "citations": [{"section": "school", "source_id": source_lookup.get("school", "unknown")}],
            "evidence": "strong",
        })

    # Insight 2: Missing scholarship data
    insights.append({
        "text": "No program-specific scholarship data is stored. Aid structure cannot be determined from available data.",
        "based_on": ["scholarship"],
        "citations": [],
        "evidence": "none",
    })

    # Unknowns
    unknowns = _build_scholarship_unknowns(payload)
    next_action = NEXT_ACTIONS.get(current_status, "Continue building your recruiting profile.")

    # Summary
    summary = "Scholarship structure unknown for this program. No stored scholarship data."

    # UI mapping (matches existing ScholarshipStructureCard props)
    ui = {
        "status": "unknown",
        "label": "Unknown",
        "explanation": "Scholarship structure is not available for this program. Specific aid information cannot be determined from stored data.",
        "nil_context": None,
        "nil_tooltip": None,
        "tooltip": "Scholarship structures reflect typical program practices and are not guarantees. Aid decisions are made by coaching staffs and can change year to year.",
    }

    return {
        "card_type": "scholarship_structure",
        "status": "ok",
        "school_id": program_id,
        "school_name": school_name,
        "division": division,
        "scholarship_label": "Unknown",
        "scholarship_evidence": "none",
        "label_basis": "none",
        "recruiting_position": recruiting_position,
        "insights": insights,
        "unknowns": unknowns,
        "data_quality": dq,
        "reason": None,
        "missing_sections": ["scholarship"],
        "next_action": next_action,
        "summary": summary,
        "ui": ui,
        "generated_at": now_iso,
        "cache_ttl_hours": 24,
        "generated_by": "deterministic",
    }


# ---------------------------------------------------------------------------
# AI path (for when real scholarship data exists)
# ---------------------------------------------------------------------------

AI_SYSTEM_PROMPT = """You are a scholarship structure analyst for Recruiting HQ.
You produce structured JSON assessments for families evaluating volleyball programs.

HARD RULES:
1. ONLY use stored scholarship data from the payload. Do NOT infer structure from division or conference alone.
2. scholarship_label MUST be one of: "Mix of Partial and Full", "Typically Partial", "Walk-On Pathways Common", "Unknown".
3. NEVER include dollar amounts, percentages, or specific scholarship counts (e.g., "12 scholarships").
4. NEVER use absolute language: "guarantees", "always", "will receive", "full ride", "no spots".
5. Use range language: "may include", "typically offers", "opportunities may exist".
6. If scholarship_notes exist but are NON-SPECIFIC (e.g., "scholarships available", "aid offered", or similarly vague), you MUST return label "Unknown".
7. Only return a non-Unknown label when notes contain SPECIFIC information about scholarship types, structures, or distributions.
8. evidence: "strong" only when based on specific, detailed scholarship notes. "partial" when notes exist but are vague or non-specific. "none" when no data.
9. based_on must list exact payload field paths. citations must reference section + source_id.
10. Return ONLY valid JSON matching the schema. No text outside JSON.

OUTPUT SCHEMA:
{
  "scholarship_label": "Mix of Partial and Full | Typically Partial | Walk-On Pathways Common | Unknown",
  "nil_context": "string or null (only if notes mention NIL environment)",
  "insights": [
    { "text": "...", "based_on": [...], "citations": [{"section":"...","source_id":"..."}], "evidence": "strong|partial|none" }
  ],
  "summary": "Max 25 words, parent-safe."
}

Produce 2-3 insights maximum. Be conservative — when in doubt, return "Unknown"."""


async def _run_ai_scholarship(payload: dict, program_id: str) -> dict:
    """AI-powered scholarship analysis when real notes exist."""
    now_iso = datetime.now(timezone.utc).isoformat()
    school = payload.get("school", {})
    recruiting = payload.get("recruiting", {})
    dq = payload.get("data_quality", {})
    source_lookup = {
        s["section"]: s.get("source_id", "unknown")
        for s in payload.get("sources", [])
    }

    division = (school.get("division") or "").upper()
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
            session_id=f"ss_{uuid.uuid4().hex[:8]}",
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
        logger.error(f"Scholarship AI error: {e}")
        return _build_unknown_card(payload, program_id, now_iso)

    # Validate label
    label = ai_output.get("scholarship_label", "Unknown")
    if label not in ALLOWED_LABELS:
        label = "Unknown"

    status_key = STATUS_KEY_MAP.get(label, "unknown")

    # Determine evidence — contributed data NEVER gets "strong"
    scholarship_data = payload.get("scholarship", {})
    scholarship_source = source_lookup.get("scholarship", "unknown")
    is_contributed = "pending" in str(scholarship_source).lower() or "user_contrib" in str(scholarship_source).lower()

    if label == "Unknown":
        evidence = "partial" if scholarship_data.get("scholarship_notes") else "none"
    elif is_contributed:
        evidence = "partial"  # contributed data stays partial until verified
    else:
        evidence = "strong"

    basis = "stored_notes" if label != "Unknown" else ("vague_notes" if evidence == "partial" else "none")

    # Validate insights
    insights = []
    for item in ai_output.get("insights", [])[:3]:
        if isinstance(item, dict) and "text" in item:
            based_on = item.get("based_on", [])
            citations = item.get("citations", [])
            if not citations:
                for path in based_on:
                    section = path.split(".")[0] if "." in path else path
                    sid = source_lookup.get(section)
                    if sid:
                        citations.append({"section": section, "source_id": sid})
            insights.append({
                "text": item["text"],
                "based_on": based_on,
                "citations": citations,
                "evidence": min_evidence(item.get("evidence", evidence), is_contributed),
            })

    # Add division context as factual insight if not already present
    div_context = DIVISION_CONTEXT.get(division)
    if div_context and not any("division" in str(i.get("based_on", [])).lower() for i in insights):
        insights.insert(0, {
            "text": div_context,
            "based_on": ["school.division"],
            "citations": [{"section": "school", "source_id": source_lookup.get("school", "unknown")}],
            "evidence": "strong",
        })

    unknowns = _build_scholarship_unknowns(payload)
    next_action = NEXT_ACTIONS.get(current_status, "Continue building your recruiting profile.")
    summary = ai_output.get("summary", f"Scholarship structure: {label}.")

    nil_context = ai_output.get("nil_context")
    nil_tooltip = "NIL opportunities vary by athlete and situation. This reflects the current known environment." if nil_context else None

    # Explanation/guidance for UI
    explanation_map = {
        "Mix of Partial and Full": "This program may offer a mix of partial and full athletic aid based on available information.",
        "Typically Partial": "This program typically distributes athletic aid as partial awards based on available information.",
        "Walk-On Pathways Common": "Many athletes join this program as walk-ons, with opportunities to earn aid based on contribution.",
        "Unknown": "Scholarship structure is not available for this program. Specific aid information cannot be determined from stored data.",
    }

    ui = {
        "status": status_key,
        "label": label,
        "explanation": explanation_map.get(label, ""),
        "nil_context": nil_context,
        "nil_tooltip": nil_tooltip,
        "tooltip": "Scholarship structures reflect typical program practices and are not guarantees. Aid decisions are made by coaching staffs and can change year to year.",
    }

    missing_sections = ["scholarship"] if label == "Unknown" else None

    return {
        "card_type": "scholarship_structure",
        "status": "ok",
        "school_id": program_id,
        "school_name": school.get("name"),
        "division": division,
        "scholarship_label": label,
        "scholarship_evidence": evidence,
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


def min_evidence(ai_evidence: str, is_contributed: bool) -> str:
    """Downgrade evidence if data source is unverified contribution."""
    if is_contributed:
        return "partial" if ai_evidence == "strong" else ai_evidence
    return ai_evidence


# ---------------------------------------------------------------------------
# Unknowns builder
# ---------------------------------------------------------------------------

def _build_scholarship_unknowns(payload: dict) -> list:
    """Build scholarship-specific unknowns from known_unknowns."""
    raw = payload.get("known_unknowns", [])
    unknowns = []
    seen = set()

    for text in raw:
        t = text.lower()
        if "scholarship" in t and "scholarship.scholarship_notes" not in seen:
            seen.add("scholarship.scholarship_notes")
            unknowns.append({
                "text": text,
                "missing_data": "scholarship.scholarship_notes",
                "unlock_hint": "Program-specific scholarship notes would enable aid structure analysis.",
            })

    if "scholarship.scholarship_notes" not in seen:
        unknowns.append({
            "text": "No scholarship-specific data exists for this program. Aid structure is unknown.",
            "missing_data": "scholarship.scholarship_notes",
            "unlock_hint": "Program-specific scholarship notes would enable aid structure analysis.",
        })

    # Athlete-specific
    for text in raw:
        t = text.lower()
        if "graduation year" in t and "athlete.grad_year" not in seen:
            seen.add("athlete.grad_year")
            unknowns.append({
                "text": text,
                "missing_data": "athlete.grad_year",
                "unlock_hint": "Graduation year helps assess which aid opportunities are relevant to your timeline.",
            })

    return unknowns
