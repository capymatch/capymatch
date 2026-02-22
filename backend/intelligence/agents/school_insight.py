"""
Stage 3 — School Insight Micro-Agent

Produces the "Why This School / Why Not" card using the payload from Stage 2.
Uses Claude via Emergent LLM Key for source-aware reasoning.

Output is deterministic JSON matching the card schema.
"""

import json
import logging
import os
import uuid
from datetime import datetime, timezone

logger = logging.getLogger("intelligence.agents.school_insight")

# ---------------------------------------------------------------------------
# Prompt template
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are a college recruiting analyst for Recruiting HQ.
You produce structured JSON assessments for families evaluating volleyball programs.

HARD RULES (violating any rule invalidates your output):
1. ONLY use facts present in the PAYLOAD below. Do not invent, assume, or look up data.
2. Every "text" field must cite specific numbers or values from the payload.
3. "based_on" must list the exact payload field paths that support the claim (e.g. "academics.sat.avg", "athlete.gpa").
4. "citations" must reference the source section and source_id from the payload's sources array.
5. "evidence" must be "strong" if ALL based_on fields exist and are non-null in the payload. Use "partial" only if some supporting field is borderline (avoid this — move weak claims to unknowns instead).
6. Do NOT make claims about roster, timeline, or NIL unless the payload has actual data for those sections (not empty objects) AND the data_quality for that section is not "unknown".
7. "unknowns" must be EXACTLY the items from payload.known_unknowns — do not add or remove any. Deduplicate by missing_data field.
8. Use parent-safe, non-alarmist, factual language. No marketing speak. No superlatives.
9. "severity" for concerns: "high" = significant barrier to admission or fit, "medium" = notable gap or risk, "low" = minor consideration.
10. Return ONLY valid JSON. No text outside the JSON object.

INSUFFICIENT DATA RULE:
If data_quality.school == "unknown" OR data_quality.academics == "unknown":
  Return status "insufficient_data" with empty strengths/concerns arrays and populate reason + missing_sections.

OUTPUT SCHEMA:
{
  "strengths": [
    {
      "text": "1-2 factual sentences citing specific payload values",
      "based_on": ["field.path1", "field.path2"],
      "citations": [{"section": "...", "source_id": "..."}],
      "evidence": "strong"
    }
  ],
  "concerns": [
    {
      "text": "1-2 factual sentences citing specific payload values",
      "based_on": ["field.path1"],
      "citations": [{"section": "...", "source_id": "..."}],
      "evidence": "strong",
      "severity": "high|medium|low"
    }
  ],
  "summary": "Single sentence, max 30 words, parent-safe overview."
}

Produce exactly 3 strengths and 3 concerns (unless insufficient_data)."""


def _build_user_prompt(payload: dict) -> str:
    """Build the user prompt with the payload JSON."""
    # Strip debug-only fields to minimize tokens
    clean = {k: v for k, v in payload.items() if k != "missing_fields"}
    return f"PAYLOAD:\n{json.dumps(clean, separators=(',', ':'))}"


# ---------------------------------------------------------------------------
# Insufficient data handler (no AI call needed)
# ---------------------------------------------------------------------------

def _handle_insufficient_data(payload: dict, program_id: str) -> dict:
    """Return an insufficient_data card when school or academics quality is unknown."""
    dq = payload.get("data_quality", {})
    missing_sections = [s for s in ("school", "academics") if dq.get(s) == "unknown"]

    unknowns = _build_unknowns(payload)

    return {
        "card_type": "school_insight",
        "status": "insufficient_data",
        "school_id": program_id,
        "school_name": payload.get("school", {}).get("name"),
        "division": payload.get("school", {}).get("division"),
        "reason": f"Cannot generate insight — missing data for: {', '.join(missing_sections)}.",
        "missing_sections": missing_sections,
        "strengths": [],
        "concerns": [],
        "unknowns": unknowns,
        "data_quality": dq,
        "summary": None,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "cache_ttl_hours": 24,
        "model": None,
    }


# ---------------------------------------------------------------------------
# Unknowns builder (deterministic, from payload only)
# ---------------------------------------------------------------------------

def _build_unknowns(payload: dict) -> list:
    """Build unknowns list from payload.known_unknowns. Deduped."""
    raw = payload.get("known_unknowns", [])
    seen = set()
    unknowns = []
    for text in raw:
        # Use text as dedup key (normalized)
        key = text.strip().lower()
        if key in seen:
            continue
        seen.add(key)
        # Derive missing_data hint from the text
        missing_data = _infer_missing_data_key(text)
        unknowns.append({
            "text": text,
            "missing_data": missing_data,
            "unlock_hint": text,
        })
    return unknowns


def _infer_missing_data_key(text: str) -> str:
    """Best-effort extraction of a missing_data key from the unknown text."""
    t = text.lower()
    if "roster" in t:
        return "roster"
    if "commit timing" in t or "timeline" in t or "interaction" in t:
        return "timeline"
    if "nil" in t:
        return "nil"
    if "graduation year" in t or "grad_year" in t:
        return "athlete.grad_year"
    if "state" in t:
        return "athlete.state"
    if "test score" in t or "sat" in t or "act" in t:
        return "academics.test_scores"
    if "acceptance" in t:
        return "academics.acceptance_rate"
    return "unknown"


# ---------------------------------------------------------------------------
# Source citation helper
# ---------------------------------------------------------------------------

def _sources_lookup(payload: dict) -> dict:
    """Build a section→source_id lookup from payload sources."""
    lookup = {}
    for s in payload.get("sources", []):
        lookup[s["section"]] = s.get("source_id", "unknown")
    return lookup


# ---------------------------------------------------------------------------
# Core agent
# ---------------------------------------------------------------------------

async def run_school_insight(payload: dict, program_id: str) -> dict:
    """
    Run the School Insight micro-agent.
    Returns card-ready JSON.
    """
    dq = payload.get("data_quality", {})

    # Check insufficient data condition
    if dq.get("school") == "unknown" or dq.get("academics") == "unknown":
        logger.info(f"School insight: insufficient data for {program_id}")
        return _handle_insufficient_data(payload, program_id)

    # Build unknowns deterministically
    unknowns = _build_unknowns(payload)
    source_lookup = _sources_lookup(payload)

    # Call Claude
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        chat = LlmChat(
            api_key=api_key,
            session_id=f"si_{uuid.uuid4().hex[:8]}",
            system_message=SYSTEM_PROMPT,
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")

        user_prompt = _build_user_prompt(payload)
        response = await chat.send_message(UserMessage(text=user_prompt))
        response_text = response.strip() if isinstance(response, str) else str(response).strip()

        # Strip markdown code fences if present
        if response_text.startswith("```"):
            response_text = response_text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        ai_output = json.loads(response_text)
    except json.JSONDecodeError as e:
        logger.error(f"School insight JSON parse error: {e}")
        return _build_fallback_card(payload, program_id, unknowns, str(e))
    except Exception as e:
        logger.error(f"School insight agent error: {e}")
        return _build_fallback_card(payload, program_id, unknowns, str(e))

    # Validate and normalize AI output
    strengths = _validate_items(ai_output.get("strengths", []), source_lookup, max_items=3)
    concerns = _validate_concerns(ai_output.get("concerns", []), source_lookup, max_items=3)
    summary = ai_output.get("summary", "")
    if len(summary) > 200:
        summary = summary[:197] + "..."

    return {
        "card_type": "school_insight",
        "status": "ok",
        "school_id": program_id,
        "school_name": payload.get("school", {}).get("name"),
        "division": payload.get("school", {}).get("division"),
        "reason": None,
        "missing_sections": None,
        "strengths": strengths,
        "concerns": concerns,
        "unknowns": unknowns,
        "data_quality": dq,
        "summary": summary,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "cache_ttl_hours": 24,
        "model": "claude-sonnet-4-5",
    }


# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------

def _validate_items(items: list, source_lookup: dict, max_items: int = 3) -> list:
    """Validate and normalize strength items."""
    result = []
    for item in items[:max_items]:
        if not isinstance(item, dict) or "text" not in item:
            continue
        based_on = item.get("based_on", [])
        # Build citations from based_on field paths
        citations = _derive_citations(based_on, source_lookup, item.get("citations"))
        evidence = item.get("evidence", "strong")
        if evidence not in ("strong", "partial"):
            evidence = "strong"
        result.append({
            "text": item["text"],
            "based_on": based_on,
            "citations": citations,
            "evidence": evidence,
        })
    return result


def _validate_concerns(items: list, source_lookup: dict, max_items: int = 3) -> list:
    """Validate and normalize concern items with severity."""
    result = []
    for item in items[:max_items]:
        if not isinstance(item, dict) or "text" not in item:
            continue
        based_on = item.get("based_on", [])
        citations = _derive_citations(based_on, source_lookup, item.get("citations"))
        evidence = item.get("evidence", "strong")
        if evidence not in ("strong", "partial"):
            evidence = "strong"
        severity = item.get("severity", "medium")
        if severity not in ("high", "medium", "low"):
            severity = "medium"
        result.append({
            "text": item["text"],
            "based_on": based_on,
            "citations": citations,
            "evidence": evidence,
            "severity": severity,
        })
    return result


def _derive_citations(based_on: list, source_lookup: dict, ai_citations: list | None) -> list:
    """
    Derive citations from based_on field paths using the source lookup.
    Falls back to AI-provided citations if available.
    """
    if ai_citations and isinstance(ai_citations, list):
        # Validate AI citations have required fields
        valid = []
        for c in ai_citations:
            if isinstance(c, dict) and "section" in c and "source_id" in c:
                valid.append({"section": c["section"], "source_id": c["source_id"]})
        if valid:
            return valid

    # Derive from based_on paths
    seen = set()
    citations = []
    for path in based_on:
        section = path.split(".")[0] if "." in path else path
        source_id = source_lookup.get(section)
        if source_id and section not in seen:
            seen.add(section)
            citations.append({"section": section, "source_id": source_id})
    return citations


# ---------------------------------------------------------------------------
# Fallback card (when AI fails)
# ---------------------------------------------------------------------------

def _build_fallback_card(payload: dict, program_id: str, unknowns: list, error: str) -> dict:
    """Return a minimal card when AI call fails."""
    dq = payload.get("data_quality", {})
    return {
        "card_type": "school_insight",
        "status": "error",
        "school_id": program_id,
        "school_name": payload.get("school", {}).get("name"),
        "division": payload.get("school", {}).get("division"),
        "reason": "Analysis temporarily unavailable. Please try again.",
        "missing_sections": None,
        "strengths": [],
        "concerns": [],
        "unknowns": unknowns,
        "data_quality": dq,
        "summary": None,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "cache_ttl_hours": 1,
        "model": None,
    }
