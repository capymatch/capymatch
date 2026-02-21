"""
Scrape average GPA data from ProductiveRecruit school pages.
Run: cd /app/backend && MONGO_URL="mongodb://localhost:27017" DB_NAME="test_database" python3 scripts/scrape_gpa.py
"""
import asyncio
import re
import os
import httpx
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
logger = logging.getLogger(__name__)

BASE_URL = "https://productiverecruit.com/athletic-scholarships/womens-volleyball"

US_STATES = {
    "AL": "alabama", "AK": "alaska", "AZ": "arizona", "AR": "arkansas", "CA": "california",
    "CO": "colorado", "CT": "connecticut", "DE": "delaware", "DC": "district-of-columbia",
    "FL": "florida", "GA": "georgia", "HI": "hawaii", "ID": "idaho", "IL": "illinois",
    "IN": "indiana", "IA": "iowa", "KS": "kansas", "KY": "kentucky", "LA": "louisiana",
    "ME": "maine", "MD": "maryland", "MA": "massachusetts", "MI": "michigan", "MN": "minnesota",
    "MS": "mississippi", "MO": "missouri", "MT": "montana", "NE": "nebraska", "NV": "nevada",
    "NH": "new-hampshire", "NJ": "new-jersey", "NM": "new-mexico", "NY": "new-york",
    "NC": "north-carolina", "ND": "north-dakota", "OH": "ohio", "OK": "oklahoma", "OR": "oregon",
    "PA": "pennsylvania", "RI": "rhode-island", "SC": "south-carolina", "SD": "south-dakota",
    "TN": "tennessee", "TX": "texas", "UT": "utah", "VT": "vermont", "VA": "virginia",
    "WA": "washington", "WV": "west-virginia", "WI": "wisconsin", "WY": "wyoming",
}


def name_to_slug(name):
    """Convert a university name to a URL slug."""
    slug = name.lower()
    slug = slug.replace("&", "and")
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"\s+", "-", slug.strip())
    slug = re.sub(r"-+", "-", slug)
    return slug


def extract_gpa(html):
    """Extract the average GPA value from the school page HTML."""
    # Look for the GPA pattern: a number like 3.XX followed by "Average GPA"
    # The structure: <p>3.93</p> ... Average GPA
    patterns = [
        r'(\d\.\d{1,2})\s*</(?:p|div|span|h\d)>\s*(?:<[^>]*>)*\s*Average GPA',
        r'Average GPA.*?(\d\.\d{1,2})',
        r'(\d\.\d{1,2}).*?Average\s+GPA',
    ]
    for pattern in patterns:
        m = re.search(pattern, html, re.IGNORECASE | re.DOTALL)
        if m:
            val = float(m.group(1))
            if 2.0 <= val <= 4.0:
                return val
    return None


async def scrape_all():
    client_db = AsyncIOMotorClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
    db = client_db[os.environ.get("DB_NAME", "test_database")]

    all_schools = await db.university_knowledge_base.find(
        {}, {"_id": 1, "university_name": 1, "scorecard": 1, "state": 1}
    ).to_list(2000)

    logger.info(f"Starting GPA scrape for {len(all_schools)} schools")

    now_iso = datetime.now(timezone.utc).isoformat()
    stats = {"scraped": 0, "found": 0, "not_found": 0, "failed": 0, "skipped": 0}

    async with httpx.AsyncClient(
        timeout=15,
        headers={"User-Agent": "Mozilla/5.0 (compatible; RecruitingHQ/1.0)"},
        follow_redirects=True,
    ) as http:
        for i, school in enumerate(all_schools):
            name = school.get("university_name", "")
            sc = school.get("scorecard") or {}
            state_abbr = sc.get("state") or school.get("state", "")

            if not state_abbr or state_abbr not in US_STATES:
                stats["skipped"] += 1
                continue

            state_slug = US_STATES[state_abbr]
            school_slug = name_to_slug(name)
            url = f"{BASE_URL}/{state_slug}/{school_slug}"

            try:
                resp = await http.get(url)
                if resp.status_code == 200 and "Average GPA" in resp.text:
                    gpa = extract_gpa(resp.text)
                    if gpa:
                        await db.university_knowledge_base.update_one(
                            {"_id": school["_id"]},
                            {"$set": {
                                "scorecard.avg_gpa": gpa,
                                "scorecard.gpa_source": "productiverecruit.com",
                                "scorecard.gpa_scraped_at": now_iso,
                                "scorecard.gpa_is_estimated": False,
                            }}
                        )
                        stats["found"] += 1
                    else:
                        stats["not_found"] += 1
                elif resp.status_code == 404:
                    stats["not_found"] += 1
                else:
                    stats["not_found"] += 1
            except Exception as e:
                stats["failed"] += 1
                if stats["failed"] <= 5:
                    logger.warning(f"Failed {name}: {e}")

            stats["scraped"] += 1

            if stats["scraped"] % 50 == 0:
                logger.info(f"Progress: {stats['scraped']}/{len(all_schools)} | "
                            f"Found: {stats['found']} | Not found: {stats['not_found']} | Failed: {stats['failed']}")

            # Rate limit: ~2 requests per second
            await asyncio.sleep(0.5)

    logger.info(f"COMPLETE: {stats}")

    # Final count
    has_real_gpa = await db.university_knowledge_base.count_documents(
        {"scorecard.gpa_is_estimated": False, "scorecard.avg_gpa": {"$ne": None}}
    )
    has_est_gpa = await db.university_knowledge_base.count_documents(
        {"scorecard.gpa_is_estimated": True, "scorecard.estimated_avg_gpa": {"$ne": None}}
    )
    logger.info(f"Real GPA: {has_real_gpa} | Estimated GPA: {has_est_gpa}")


if __name__ == "__main__":
    asyncio.run(scrape_all())
