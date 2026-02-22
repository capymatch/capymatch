"""
Stage 3 — Scholarship Structure Micro-Agent

Produces the "Scholarship Structure" intelligence card.
Deterministic when no scholarship_notes data exists (label = "Unknown").
AI invoked only when real scholarship signals are present in the payload.
AI determines ONLY the label; all UI copy is hardcoded per label.

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
# Hardcoded UI copy per label — the AI determines the label only
# ---------------------------------------------------------------------------
UI_COPY = {
    "Unknown": {
        "status": "unknown",
        "label": "Unknown",
        "explanation": "Scholarship structure isn't available for this program in our stored data. We can't determine how athletic aid is typically distributed here.",
        "guidance": "Ask the coaching staff what aid is common for your position and class year, and what academic/need-based aid families often combine with athletic support.",
        "tooltip": "Scholarship structures reflect typical program practices and may change year to year. This is not a guarantee of aid.",
    },
    "Unknown_vague": {
        "status": "unknown",
        "label": "Unknown",
        "explanation": "We have program notes, but they aren't specific enough to determine the typical scholarship structure.",
        "guidance": "Ask whether aid is commonly partial, occasionally full, or primarily walk-on with later opportunities — and what that looks like for your position.",
        "tooltip": "This reflects limited specificity in available notes, not a guarantee of aid.",
    },
    "Typically Partial": {
        "status": "partial",
        "label": "Typically Partial",
        "explanation": "Based on the program notes we have, athletic aid is most often offered as partial awards. Amounts can vary by role, timing, and roster needs.",
        "guidance": "If this school is a priority, ask what a typical package looks like for your position and whether academic aid is commonly stacked.",
        "tooltip": "This reflects typical patterns from available notes, not a guarantee of aid.",
    },
    "Mix of Partial and Full": {
        "status": "mix",
        "label": "Mix of Partial and Full",
        "explanation": "Program notes suggest a mix of partial and occasional larger awards depending on roster needs. Aid decisions vary significantly by year and recruiting class.",
        "guidance": "Ask directly what profiles tend to receive larger awards and what the staff prioritizes (position needs, academics, impact timeline).",
        "tooltip": "This reflects typical patterns from available notes, not a guarantee of aid.",
    },
    "Walk-On Pathways Common": {
        "status": "walkon",
        "label": "Walk-On Pathways Common",
        "explanation": "Program notes indicate many athletes begin as walk-ons, with potential opportunities to earn aid later. Availability can change by season and roster movement.",
        "guidance": "Ask how walk-on athletes are evaluated for future aid and what milestones typically lead to support (contribution, development, role).",
        "tooltip": "Walk-on pathways vary by program and year. This is not a guarantee of future aid.",
    },
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


def _build_recruiting_position(payload: dict) -> dict:
    recruiting = payload.get("recruiting", {})
    created_at = recruiting.get("created_at") or payload.get("now")
    return {
        "current_status": recruiting.get("status", "Unknown"),
        "interaction_count": recruiting.get("interaction_count", 0),
        "last_interaction": recruiting.get("last_interaction"),
        "days_on_board": _days_since(created_at) or 0,
    }


def _build_source_lookup(payload: dict) -> dict:
    return {
        s["section"]: s.get("source_id", "unknown")
        for s in payload.get("sources", [])
    }


# ---------------------------------------------------------------------------
# Core agent
# ---------------------------------------------------------------------------

async def run_scholarship_structure(payload: dict, program_id: str) -> dict:
    """
    Produce the Scholarship Structure card.
    Deterministic when no stored scholarship data exists.
    AI determines only the label when notes exist.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    scholarship_data = payload.get("scholarship", {})
    has_notes = bool(scholarship_data.get("scholarship_notes"))

    if has_notes:
        return await _run_ai_scholarship(payload, program_id, now_iso)

    return _build_card(payload, program_id, now_iso, "Unknown", "none", "none", [], None)


# ---------------------------------------------------------------------------
# Card builder — shared by deterministic and AI paths
# ---------------------------------------------------------------------------

def _build_card(
    payload: dict,
    program_id: str,
    now_iso: str,
    label: str,
    evidence: str,
    basis: str,
    ai_insights: list,
    nil_context: str | None,
    is_vague: bool = False,
    generated_by: str = "deterministic",
) -> dict:
    school = payload.get("school", {})
    dq = payload.get("data_quality", {})
    division = (school.get("division") or "").upper()
    source_lookup = _build_source_lookup(payload)
    recruiting_position = _build_recruiting_position(payload)
    current_status = recruiting_position["current_status"]

    # Pick exact UI copy
    if is_vague:
        copy = UI_COPY["Unknown_vague"]
    else:
        copy = UI_COPY.get(label, UI_COPY["Unknown"])

    # Insights: start with division context, then AI insights
    insights = []
    div_context = DIVISION_CONTEXT.get(division)
    if div_context:
        insights.append({
            "text": div_context,
            "based_on": ["school.division"],
            "citations": [{"section": "school", "source_id": source_lookup.get("school", "unknown")}],
            "evidence": "strong",
        })

    insights.extend(ai_insights)

    # If no AI insights and no notes, add the missing-data insight
    if not ai_insights and evidence == "none":
        insights.append({
            "text": "No program-specific scholarship data is stored. Aid structure cannot be determined from available data.",
            "based_on": ["scholarship"],
            "citations": [],
            "evidence": "none",
        })

    nil_tooltip = "NIL opportunities vary by athlete and situation. This reflects the current known environment." if nil_context else None

    ui = {
        "status": copy["status"],
        "label": copy["label"],
        "explanation": copy["explanation"],
        "guidance": copy["guidance"],
        "nil_context": nil_context,
        "nil_tooltip": nil_tooltip,
        "tooltip": copy["tooltip"],
    }

    return {
        "card_type": "scholarship_structure",
        "status": "ok",
        "school_id": program_id,
        "school_name": school.get("name"),
        "division": division,
        "scholarship_label": label if not is_vague else "Unknown",
        "scholarship_evidence": evidence,
        "label_basis": basis,
        "recruiting_position": recruiting_position,
        "insights": insights,
        "unknowns": _build_scholarship_unknowns(payload),
        "data_quality": dq,
        "reason": None,
        "missing_sections": ["scholarship"] if copy["status"] == "unknown" else None,
        "next_action": NEXT_ACTIONS.get(current_status, "Continue building your recruiting profile."),
        "summary": f"Scholarship structure: {copy['label']}.",
        "ui": ui,
        "generated_at": now_iso,
        "cache_ttl_hours": 24,
        "generated_by": generated_by,
    }


# ---------------------------------------------------------------------------
# AI path — determines label only, copy is hardcoded
# ---------------------------------------------------------------------------

AI_SYSTEM_PROMPT = """You are a scholarship structure classifier for CapyMatch.
Your ONLY job is to classify a program's scholarship structure from stored notes.

HARD RULES:
1. ONLY use stored scholarship data from the payload. Do NOT infer from division or conference alone.
2. scholarship_label MUST be one of: "Mix of Partial and Full", "Typically Partial", "Walk-On Pathways Common", "Unknown".
3. If scholarship_notes are NON-SPECIFIC (e.g., "scholarships available", "aid offered", "offers scholarships", or similarly vague), you MUST return "Unknown" and set "notes_are_vague": true.
4. Only return a non-Unknown label when notes contain SPECIFIC information about scholarship types, structures, or distributions.
5. evidence: "strong" when notes are specific and detailed. "partial" when notes exist but are vague.
6. NEVER include dollar amounts, percentages, or specific scholarship counts in insights.
7. based_on must list exact payload field paths. citations must reference section + source_id.
8. Return ONLY valid JSON. No text outside JSON.

OUTPUT SCHEMA:
{
  "scholarship_label": "Mix of Partial and Full | Typically Partial | Walk-On Pathways Common | Unknown",
  "notes_are_vague": true | false,
  "nil_context": "string or null (only if notes explicitly mention NIL environment)",
  "insights": [
    { "text": "...", "based_on": [...], "citations": [{"section":"...","source_id":"..."}], "evidence": "strong|partial" }
  ]
}

Produce 1-2 insights maximum. Be conservative — when in doubt, return "Unknown"."""


async def _run_ai_scholarship(payload: dict, program_id: str, now_iso: str) -> dict:
    """AI determines label from notes; UI copy is hardcoded per label."""
    source_lookup = _build_source_lookup(payload)
    scholarship_data = payload.get("scholarship", {})
    scholarship_source = source_lookup.get("scholarship", "unknown")
    is_contributed = "pending" in str(scholarship_source).lower() or "user_contrib" in str(scholarship_source).lower()

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
        return _build_card(payload, program_id, now_iso, "Unknown", "none", "none", [], None)

    # Validate label
    label = ai_output.get("scholarship_label", "Unknown")
    if label not in ALLOWED_LABELS:
        label = "Unknown"

    notes_are_vague = ai_output.get("notes_are_vague", False)

    # Force Unknown for vague notes
    if notes_are_vague:
        label = "Unknown"

    # Determine evidence — contributed data NEVER gets "strong"
    if label == "Unknown":
        evidence = "partial" if scholarship_data.get("scholarship_notes") else "none"
    elif is_contributed:
        evidence = "partial"
    else:
        evidence = "strong"

    basis = "stored_notes" if label != "Unknown" else ("vague_notes" if notes_are_vague else "none")

    # Process insights — downgrade evidence for contributed data
    insights = []
    for item in ai_output.get("insights", [])[:2]:
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
                "evidence": _min_evidence(item.get("evidence", evidence), is_contributed),
            })

    nil_context = ai_output.get("nil_context")

    return _build_card(
        payload, program_id, now_iso,
        label, evidence, basis, insights, nil_context,
        is_vague=notes_are_vague,
        generated_by="ai",
    )


def _min_evidence(ai_evidence: str, is_contributed: bool) -> str:
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
    scholarship_data = payload.get("scholarship", {})
    has_notes = bool(scholarship_data.get("scholarship_notes"))
    unknowns = []
    seen = set()

    for text in raw:
        t = text.lower()
        if "scholarship" in t and "scholarship.scholarship_notes" not in seen:
            seen.add("scholarship.scholarship_notes")
            unknowns.append({
                "text": text,
                "missing_data": "scholarship.scholarship_notes",
                "unlock_hint": "Program-specific scholarship notes (from public sources or verified contributions) would enable this card.",
            })

    if "scholarship.scholarship_notes" not in seen and not has_notes:
        unknowns.append({
            "text": "No scholarship-specific data exists for this program.",
            "missing_data": "scholarship.scholarship_notes",
            "unlock_hint": "Program-specific scholarship notes (from public sources or verified contributions) would enable this card.",
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
