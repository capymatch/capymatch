"""
Batch Campus Diversity scraper for ALL schools in KB.
Uses Playwright with fresh contexts per batch to avoid SPA caching.
Run: cd /app/backend && nohup python3 scripts/scrape_diversity_all.py > /tmp/diversity_scrape.log 2>&1 &
"""
import asyncio
import re
import os
import logging
from dotenv import load_dotenv
load_dotenv()
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from playwright.async_api import async_playwright

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(message)s",
    handlers=[logging.StreamHandler()]
)
log = logging.getLogger(__name__)

BASE = "https://productiverecruit.com/athletic-scholarships/womens-volleyball"

# State abbreviation to full name mapping
STATE_MAP = {
    "AL": "alabama", "AK": "alaska", "AZ": "arizona", "AR": "arkansas",
    "CA": "california", "CO": "colorado", "CT": "connecticut", "DE": "delaware",
    "FL": "florida", "GA": "georgia", "HI": "hawaii", "ID": "idaho",
    "IL": "illinois", "IN": "indiana", "IA": "iowa", "KS": "kansas",
    "KY": "kentucky", "LA": "louisiana", "ME": "maine", "MD": "maryland",
    "MA": "massachusetts", "MI": "michigan", "MN": "minnesota", "MS": "mississippi",
    "MO": "missouri", "MT": "montana", "NE": "nebraska", "NV": "nevada",
    "NH": "new-hampshire", "NJ": "new-jersey", "NM": "new-mexico", "NY": "new-york",
    "NC": "north-carolina", "ND": "north-dakota", "OH": "ohio", "OK": "oklahoma",
    "OR": "oregon", "PA": "pennsylvania", "RI": "rhode-island", "SC": "south-carolina",
    "SD": "south-dakota", "TN": "tennessee", "TX": "texas", "UT": "utah",
    "VT": "vermont", "VA": "virginia", "WA": "washington", "WV": "west-virginia",
    "WI": "wisconsin", "WY": "wyoming", "DC": "district-of-columbia",
}


def parse_diversity(html):
    clean = re.sub(r'<!--.*?-->', '', html, flags=re.DOTALL)
    cats = [
        'American Indian/Alaska Native', 'Asian', 'Black', 'Hispanic/Latino',
        'Native Hawaiian/Pacific Islander', 'Non Resident', 'Two or more',
        'Unknown', 'White',
    ]
    div = {}
    for cat in cats:
        m = re.search(
            re.escape(cat) + r'.*?Students:\s*([\d.]+)%\s*/\s*Faculty:\s*([\d.]+)%',
            clean, re.DOTALL
        )
        if m:
            div[cat] = {"students": float(m.group(1)), "faculty": float(m.group(2))}
    return div if div else None


async def main():
    client = AsyncIOMotorClient(os.environ.get("MONGO_URL"))
    db = client[os.environ.get("DB_NAME")]

    # Get all schools that have pr_slug and pr_state but no diversity data yet
    schools = await db.university_knowledge_base.find(
        {
            "pr_slug": {"$exists": True, "$ne": "---", "$ne": ""},
            "$or": [
                {"campus_diversity": {"$exists": False}},
                {"campus_diversity": None},
            ]
        },
        {"_id": 1, "university_name": 1, "pr_slug": 1, "pr_state": 1}
    ).to_list(2000)

    log.info(f"Schools to scrape: {len(schools)}")

    # Already have data count
    already = await db.university_knowledge_base.count_documents(
        {"campus_diversity": {"$exists": True, "$ne": None}}
    )
    log.info(f"Schools already with diversity data: {already}")

    stats = {"ok": 0, "miss": 0, "err": 0, "skip": 0, "done": 0}

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox"]
        )

        for school in schools:
            name = school["university_name"]
            slug = school.get("pr_slug", "")
            state_raw = school.get("pr_state", "")

            if not slug or slug == "---":
                stats["skip"] += 1
                stats["done"] += 1
                continue

            # Convert state abbreviation to full name if needed
            if len(state_raw) == 2:
                state = STATE_MAP.get(state_raw.upper())
                if not state:
                    stats["skip"] += 1
                    stats["done"] += 1
                    continue
            else:
                state = state_raw.lower().replace(" ", "-")

            url = f"{BASE}/{state}/{slug}"

            ctx = await browser.new_context(
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
                viewport={"width": 1920, "height": 1080}
            )
            page = await ctx.new_page()

            try:
                resp = await page.goto(url, wait_until="domcontentloaded", timeout=15000)
                try:
                    await page.wait_for_selector("text=Campus Diversity", timeout=12000)
                    await asyncio.sleep(1.5)
                except:
                    await asyncio.sleep(6)

                if resp and resp.status == 200:
                    html = await page.content()
                    div = parse_diversity(html)
                    if div:
                        now = datetime.now(timezone.utc).isoformat()
                        await db.university_knowledge_base.update_one(
                            {"_id": school["_id"]},
                            {"$set": {
                                "campus_diversity": div,
                                "campus_diversity_source": "productiverecruit.com",
                                "campus_diversity_scraped_at": now,
                            }}
                        )
                        stats["ok"] += 1
                    else:
                        stats["miss"] += 1
                else:
                    stats["err"] += 1
            except Exception as e:
                stats["err"] += 1
                if stats["err"] <= 10:
                    log.warning(f"Error {name}: {str(e)[:80]}")
            finally:
                await ctx.close()

            stats["done"] += 1
            if stats["done"] % 25 == 0:
                total_with = already + stats["ok"]
                log.info(f"Progress: {stats['done']}/{len(schools)} | OK={stats['ok']} Miss={stats['miss']} Err={stats['err']} Skip={stats['skip']} | Total coverage: {total_with}")

        await browser.close()

    total_with = already + stats["ok"]
    total_schools = await db.university_knowledge_base.count_documents({})
    log.info(f"DONE: {stats}")
    log.info(f"Final coverage: {total_with}/{total_schools} ({round(total_with/total_schools*100, 1)}%)")


if __name__ == "__main__":
    asyncio.run(main())
