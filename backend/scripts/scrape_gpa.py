"""
Scrape real GPA data from ProductiveRecruit using Playwright.
Handles Cloudflare protection via browser automation.

Run: cd /app/backend && MONGO_URL="mongodb://localhost:27017" DB_NAME="test_database" python3 scripts/scrape_gpa.py
"""
import asyncio
import re
import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from playwright.async_api import async_playwright

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
    slug = name.lower().replace("&", "and")
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"\s+", "-", slug.strip())
    return re.sub(r"-+", "-", slug)


def extract_gpa(html):
    m = re.search(r'(\d\.\d{1,2})\s*</(?:p|div|span|h\d)>\s*(?:<[^>]*>)*\s*Average GPA', html, re.DOTALL)
    if m:
        val = float(m.group(1))
        if 2.0 <= val <= 4.0:
            return val
    return None


async def scrape_all():
    client_db = AsyncIOMotorClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
    db = client_db[os.environ.get("DB_NAME", "test_database")]

    # Only scrape schools that don't already have real GPA
    all_schools = await db.university_knowledge_base.find(
        {"$or": [
            {"scorecard.avg_gpa": None},
            {"scorecard.avg_gpa": {"$exists": False}},
            {"scorecard.gpa_is_estimated": True},
        ]},
        {"_id": 1, "university_name": 1, "scorecard": 1, "state": 1}
    ).to_list(2000)

    logger.info(f"Scraping GPA for {len(all_schools)} schools (skipping those with real GPA)")

    now_iso = datetime.now(timezone.utc).isoformat()
    stats = {"scraped": 0, "found": 0, "not_found": 0, "failed": 0, "skipped": 0}

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-dev-shm-usage']
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080},
        )
        page = await context.new_page()

        # Initial Cloudflare warmup
        try:
            await page.goto(f"{BASE_URL}/florida/florida-gulf-coast-university", wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(8)
            logger.info("Cloudflare warmup complete")
        except:
            logger.warning("Warmup failed, continuing anyway")

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
                resp = await page.goto(url, wait_until="domcontentloaded", timeout=15000)
                await asyncio.sleep(2)  # Wait for page render

                if resp and resp.status == 200:
                    content = await page.content()
                    gpa = extract_gpa(content)
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
                else:
                    stats["not_found"] += 1
            except Exception as e:
                stats["failed"] += 1
                if stats["failed"] <= 10:
                    logger.warning(f"Failed {name}: {e}")

            stats["scraped"] += 1

            if stats["scraped"] % 25 == 0:
                logger.info(f"Progress: {stats['scraped']}/{len(all_schools)} | "
                            f"Found: {stats['found']} | Not found: {stats['not_found']} | Failed: {stats['failed']}")

            # Rate limit: ~1 req per 2.5s (be respectful)
            await asyncio.sleep(0.5)

        await browser.close()

    logger.info(f"COMPLETE: {stats}")

    # Final counts
    real = await db.university_knowledge_base.count_documents({"scorecard.gpa_is_estimated": False, "scorecard.avg_gpa": {"$ne": None}})
    est = await db.university_knowledge_base.count_documents({"scorecard.gpa_is_estimated": True})
    logger.info(f"Final: Real GPA={real} | Estimated GPA={est}")


if __name__ == "__main__":
    asyncio.run(scrape_all())
