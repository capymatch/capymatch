"""
Stage 3 — NIL Readiness Micro-Agent

Produces the "NIL Readiness" intelligence card.
Deterministic when no nil_signals data exists (label = "NIL Information Limited").
AI invoked only when real NIL signals are present in the payload.
AI determines ONLY the label; all UI copy is hardcoded per label.

Output labels:
  Established NIL Support | Emerging NIL Support | NIL Information Limited

Rules:
- Never mention dollar amounts or imply financial outcomes
- No ranking or "strength" scoring
- If nil_signals exist but are non-specific → label "NIL Information Limited", evidence "partial"
- Contributed data stays pending_verification and NEVER upgrades evidence to "strong"
"""

import json
import logging
import os
import uuid
from datetime import datetime, timezone

logger = logging.getLogger("intelligence.agents.nil_readiness")

# ---------------------------------------------------------------------------
# Allowed labels
# ---------------------------------------------------------------------------
ALLOWED_LABELS = {
    "Established NIL Support",
    "Emerging NIL Support",
    "NIL Information Limited",
}

STATUS_KEY_MAP = {
    "Established NIL Support": "established",
    "Emerging NIL Support": "emerging",
    "NIL Information Limited": "info_limited",
}

# ---------------------------------------------------------------------------
# Hardcoded UI copy per label — AI determines label only
# ---------------------------------------------------------------------------
UI_COPY = {
    "NIL Information Limited": {
        "status": "info_limited",
        "label": "NIL Information Limited",
        "status_label": "Information limited",
        "explanation": "NIL activity for this program isn't available in our stored data. We can't determine what support structures or opportunities exist.",
        "involves": [],
        "meaning": "",
        "guidance": "Ask the coaching staff what NIL resources are available to athletes and how the program approaches NIL education.",
        "tooltip": "NIL opportunities vary and are not guaranteed.",
        "context_tags": [],
    },
    "NIL Information Limited_vague": {
        "status": "info_limited",
        "label": "NIL Information Limited",
        "status_label": "Information limited",
        "explanation": "We have program notes mentioning NIL, but they aren't specific enough to determine what support structures exist.",
        "involves": [],
        "meaning": "",
        "guidance": "Ask the coaching staff directly about NIL resources, partnerships, and how athletes currently navigate opportunities.",
        "tooltip": "NIL opportunities vary and are not guaranteed.",
        "context_tags": [],
    },
    "Established NIL Support": {
        "status": "established",
        "label": "Established NIL Support",
        "status_label": "Established support",
        "explanation": "Based on program notes, this program has organized NIL support including education, local partnerships, or collective involvement.",
        "involves": [
            "NIL education or onboarding resources",
            "Organized collective or partnership access",
            "Staff guidance on navigating opportunities",
        ],
        "meaning": "Athletes in this program generally have structured support for navigating NIL from early in their careers.",
        "guidance": "Ask how the program supports athletes in navigating NIL opportunities and what resources are available from day one.",
        "tooltip": "NIL opportunities vary and are not guaranteed.",
        "context_tags": [],
    },
    "Emerging NIL Support": {
        "status": "emerging",
        "label": "Emerging NIL Support",
        "status_label": "Emerging support",
        "explanation": "Program notes indicate some NIL awareness or developing support, but formal structures may still be taking shape.",
        "involves": [
            "Some NIL awareness programs",
            "Growing local partnerships",
        ],
        "meaning": "NIL opportunities may exist but could be less structured. Focus on athletic and academic fit as primary factors.",
        "guidance": "Ask what NIL education or partnerships currently exist and how the program plans to develop support over time.",
        "tooltip": "NIL opportunities vary and are not guaranteed.",
        "context_tags": [],
    },
}

# ---------------------------------------------------------------------------
# Division context — factual, no ranking
# ---------------------------------------------------------------------------
DIVISION_CONTEXT = {
    "D1": "Division I programs operate under current NCAA NIL guidelines. Support structures vary widely by program.",
    "D2": "Division II programs operate under NCAA NIL guidelines. Formal NIL support may be less common than at the D1 level.",
    "D3": "Division III programs operate under NCAA NIL guidelines. NIL activity at this level is generally less structured.",
    "NAIA": "NAIA programs have their own NIL policies. Formal support structures vary by institution.",
    "JUCO": "Junior college programs may have limited NIL infrastructure. Opportunities vary by institution.",
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

async def run_nil_readiness(payload: dict, program_id: str) -> dict:
    """
    Produce the NIL Readiness card.
    Deterministic when no stored NIL data exists.
    AI determines only the label when signals exist.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    nil_data = payload.get("nil", {})
    has_signals = bool(nil_data.get("nil_signals"))

    if has_signals:
        return await _run_ai_nil(payload, program_id, now_iso)

    return _build_card(payload, program_id, now_iso, "NIL Information Limited", "none", "none", [], False)


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
        copy = UI_COPY["NIL Information Limited_vague"]
    else:
        copy = UI_COPY.get(label, UI_COPY["NIL Information Limited"])

    # Build context tags from school data
    context_tags = list(copy["context_tags"])  # start with copy defaults (empty)
    if division:
        context_tags.append(f"NCAA {division}")
    if division in ("D1", "D2"):
        context_tags.append("Current NIL Era")

    # Insights: division context + AI insights
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

    if not ai_insights and evidence == "none":
        insights.append({
            "text": "No program-specific NIL data is stored. Support structures cannot be determined from available data.",
            "based_on": ["nil"],
            "citations": [],
            "evidence": "none",
        })

    ui = {
        "status": copy["status"],
        "label": copy["label"],
        "status_label": copy["status_label"],
        "explanation": copy["explanation"],
        "involves": copy["involves"],
        "meaning": copy["meaning"],
        "guidance": copy["guidance"],
        "tooltip": copy["tooltip"],
        "context_tags": context_tags,
    }

    return {
        "card_type": "nil_readiness",
        "status": "ok",
        "school_id": program_id,
        "school_name": school.get("name"),
        "division": division,
        "nil_label": label if not is_vague else "NIL Information Limited",
        "nil_evidence": evidence,
        "label_basis": basis,
        "recruiting_position": recruiting_position,
        "insights": insights,
        "unknowns": _build_nil_unknowns(payload),
        "data_quality": dq,
        "missing_sections": ["nil"] if copy["status"] == "info_limited" else None,
        "next_action": NEXT_ACTIONS.get(current_status, "Continue building your recruiting profile."),
        "summary": f"NIL readiness: {copy['label']}.",
        "ui": ui,
        "generated_at": now_iso,
        "cache_ttl_hours": 24,
        "generated_by": generated_by,
    }


# ---------------------------------------------------------------------------
# AI path
# ---------------------------------------------------------------------------

AI_SYSTEM_PROMPT = """You are a NIL (Name, Image, Likeness) environment classifier for Recruiting HQ.
Your ONLY job is to classify a program's NIL support level from stored notes.

HARD RULES:
1. ONLY use stored NIL data from the payload. Do NOT infer from division or conference alone.
2. nil_label MUST be one of: "Established NIL Support", "Emerging NIL Support", "NIL Information Limited".
3. If nil_signals are NON-SPECIFIC (e.g., "NIL available", "has NIL", or similarly vague), you MUST return "NIL Information Limited" and set "signals_are_vague": true.
4. Only return a non-Limited label when signals contain SPECIFIC information about NIL programs, collectives, partnerships, or education.
5. NEVER mention dollar amounts, compensation levels, or financial outcomes.
6. NEVER rank, score, or grade the NIL environment.
7. evidence: "strong" when signals are specific and detailed. "partial" when signals exist but are vague.
8. based_on must list exact payload field paths. citations must reference section + source_id.
9. Return ONLY valid JSON. No text outside JSON.

OUTPUT SCHEMA:
{
  "nil_label": "Established NIL Support | Emerging NIL Support | NIL Information Limited",
  "signals_are_vague": true | false,
  "insights": [
    { "text": "...", "based_on": [...], "citations": [{"section":"...","source_id":"..."}], "evidence": "strong|partial" }
  ]
}

Produce 1-2 insights maximum. Be conservative — when in doubt, return "NIL Information Limited"."""


async def _run_ai_nil(payload: dict, program_id: str, now_iso: str) -> dict:
    """AI determines label from NIL signals; UI copy is hardcoded per label."""
    source_lookup = _build_source_lookup(payload)
    nil_data = payload.get("nil", {})
    nil_source = source_lookup.get("nil", "unknown")
    is_contributed = "pending" in str(nil_source).lower() or "user_contrib" in str(nil_source).lower()

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        chat = LlmChat(
            api_key=api_key,
            session_id=f"nil_{uuid.uuid4().hex[:8]}",
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
        logger.error(f"NIL AI error: {e}")
        return _build_card(payload, program_id, now_iso, "NIL Information Limited", "none", "none", [], False)

    label = ai_output.get("nil_label", "NIL Information Limited")
    if label not in ALLOWED_LABELS:
        label = "NIL Information Limited"

    signals_are_vague = ai_output.get("signals_are_vague", False)
    if signals_are_vague:
        label = "NIL Information Limited"

    if label == "NIL Information Limited":
        evidence = "partial" if nil_data.get("nil_signals") else "none"
    elif is_contributed:
        evidence = "partial"
    else:
        evidence = "strong"

    basis = "stored_signals" if label != "NIL Information Limited" else ("vague_signals" if signals_are_vague else "none")

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
            item_evidence = item.get("evidence", evidence)
            if is_contributed and item_evidence == "strong":
                item_evidence = "partial"
            insights.append({
                "text": item["text"],
                "based_on": based_on,
                "citations": citations,
                "evidence": item_evidence,
            })

    return _build_card(
        payload, program_id, now_iso,
        label, evidence, basis, insights,
        is_vague=signals_are_vague,
        generated_by="ai",
    )


# ---------------------------------------------------------------------------
# Unknowns builder
# ---------------------------------------------------------------------------

def _build_nil_unknowns(payload: dict) -> list:
    raw = payload.get("known_unknowns", [])
    nil_data = payload.get("nil", {})
    has_signals = bool(nil_data.get("nil_signals"))
    unknowns = []
    seen = set()

    for text in raw:
        if "nil" in text.lower() and "nil.nil_signals" not in seen:
            seen.add("nil.nil_signals")
            unknowns.append({
                "text": text,
                "missing_data": "nil.nil_signals",
                "unlock_hint": "Program-specific NIL notes (from public sources or verified contributions) would enable this card.",
            })

    if "nil.nil_signals" not in seen and not has_signals:
        unknowns.append({
            "text": "No NIL-specific data exists for this program.",
            "missing_data": "nil.nil_signals",
            "unlock_hint": "Program-specific NIL notes (from public sources or verified contributions) would enable this card.",
        })

    return unknowns
