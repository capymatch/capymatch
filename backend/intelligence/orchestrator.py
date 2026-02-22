"""
Stage 3 — Intelligence Orchestrator

Lightweight router that:
1. Calls the Payload Builder for a given school + athlete
2. Routes to the correct micro-agent
3. Returns card-ready JSON

Currently supports: school_insight
"""

import logging
from intelligence.payload_builder import build_payload

logger = logging.getLogger("intelligence.orchestrator")


async def run_card(db, card_type: str, program_id: str, tenant_id: str) -> dict:
    """
    Run a single intelligence card.

    Args:
        db: Motor database instance
        card_type: One of "school_insight" (more to come)
        program_id: The user's tracked program ID
        tenant_id: The user's tenant ID

    Returns:
        Card-ready JSON dict.
    """
    # Step 1: Build the payload
    payload = await build_payload(db, program_id, tenant_id)

    # Step 2: Route to the correct agent
    if card_type == "school_insight":
        from intelligence.agents.school_insight import run_school_insight
        return await run_school_insight(payload, program_id)

    raise ValueError(f"Unknown card_type: {card_type}")
