"""
Domain Mapping Engine for Gmail History Import.
Maps email addresses to schools in the Knowledge Base using registrable domain matching.
"""
import tldextract
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone


def extract_registrable_domain(email_or_url: str) -> str | None:
    """Extract the registrable domain from an email address or URL."""
    text = email_or_url.strip().lower()
    if "@" in text:
        text = text.split("@", 1)[1]
    ext = tldextract.extract(text)
    if ext.domain and ext.suffix:
        return f"{ext.domain}.{ext.suffix}"
    return None


async def map_email_to_school(db: AsyncIOMotorDatabase, email: str) -> dict:
    """
    Map an email address to a school via the school_domain_aliases collection.
    Returns: { school_id, normalized_domain, match_type, confidence, match_reason }
    """
    domain = extract_registrable_domain(email)
    if not domain:
        return {
            "school_id": None,
            "normalized_domain": None,
            "match_type": "unmapped",
            "confidence": 0,
            "match_reason": "Could not parse domain",
        }

    # Lookup in aliases (highest confidence first)
    alias = await db.school_domain_aliases.find_one(
        {"domain": domain},
        {"_id": 0},
        sort=[("confidence", -1)],
    )

    if alias:
        return {
            "school_id": alias["school_id"],
            "normalized_domain": domain,
            "match_type": "exact_alias",
            "confidence": alias["confidence"],
            "match_reason": f"Matched by domain: {email.split('@')[1] if '@' in email else email} → {domain} → {alias['school_id']}",
        }

    return {
        "school_id": None,
        "normalized_domain": domain,
        "match_type": "unmapped",
        "confidence": 0,
        "match_reason": f"No school found for domain: {domain}",
    }
