"""
Phase 1: Scrape coaching staff names/roles from Productive Recruit for all schools.
Stores data in `coaching_staff_pr` field.

Run:
  cd /app/backend && nohup python3 scripts/batch_scrape_pr_coaches.py > /tmp/pr_coaches.log 2>&1 &
  tail -f /tmp/pr_coaches.log
"""
import asyncio
import re
import os
import json
import logging
from dotenv import load_dotenv
load_dotenv()
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from playwright.async_api import async_playwright

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

PROGRESS_FILE = "/tmp/pr_coaches_progress.json"
BASE = "https://productiverecruit.com/athletic-scholarships/womens-volleyball"

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


def parse_coaches_from_pr(html):
    """Parse coaching staff names and roles from Productive Recruit HTML."""
    clean = re.sub(r'<!--.*?-->', '', html, flags=re.DOTALL)
    coaches = []

    coach_section = re.search(r'Coaching Staff(.*?)(?:School Profile|Subscribe|Similar Programs|$)', clean, re.DOTALL)
    if not coach_section:
        return coaches

    text = coach_section.group(1)
    roles = [
        'Associate Head Coach', 'Director of Volleyball Operations',
        'Director of Operations', 'Volunteer Assistant Coach',
        'Volunteer Assistant', 'Graduate Assistant Coach',
        'Graduate Assistant', 'Assistant Coach', 'Head Coach',
    ]
    for role in roles:
        pattern = re.escape(role) + r'\s*(?:</[^>]*>\s*)*(?:<[^>]*>\s*)*([A-Z][a-zA-Z\'\-\.\s]+?)(?:\s*<)'
        for name in re.findall(pattern, text):
            name = name.strip()
            if 2 < len(name) < 60 and not any(c['name'] == name for c in coaches):
                coaches.append({"role": role, "name": name})

    return coaches


def save_progress(stats):
    with open(PROGRESS_FILE, "w") as f:
        json.dump(stats, f)


async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ.get("DB_NAME", "test_database")]

    # Get all schools with pr_slug that don't already have coaching_staff_pr
    schools = await db.university_knowledge_base.find(
        {
            "pr_slug": {"$exists": True, "$nin": ["", "---", None]},
            "$or": [
                {"coaching_staff_pr": {"$exists": False}},
                {"coaching_staff_pr": []},
            ]
        },
        {"_id": 1, "university_name": 1, "pr_slug": 1, "pr_state": 1, "division": 1}
    ).to_list(2000)

    total = len(schools)
    log.info(f"Schools to scrape from PR: {total}")

    stats = {"total": total, "done": 0, "ok": 0, "miss": 0, "err": 0, "started_at": datetime.now(timezone.utc).isoformat()}
    save_progress(stats)

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
                stats["miss"] += 1
                stats["done"] += 1
                save_progress(stats)
                continue

            if len(state_raw) == 2:
                state = STATE_MAP.get(state_raw.upper())
                if not state:
                    stats["miss"] += 1
                    stats["done"] += 1
                    save_progress(stats)
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
                await page.goto(url, wait_until="domcontentloaded", timeout=20000)
                try:
                    await page.wait_for_selector("text=Coaching Staff", timeout=15000)
                    await asyncio.sleep(1)
                except Exception:
                    await asyncio.sleep(5)

                html = await page.content()
                coaches = parse_coaches_from_pr(html)

                if coaches:
                    await db.university_knowledge_base.update_one(
                        {"_id": school["_id"]},
                        {"$set": {
                            "coaching_staff_pr": coaches,
                            "pr_coaches_scraped_at": datetime.now(timezone.utc).isoformat()
                        }}
                    )
                    stats["ok"] += 1
                    log.info(f"OK [{stats['done']+1}/{total}] {name}: {len(coaches)} coaches")
                else:
                    stats["miss"] += 1
                    log.info(f"MISS [{stats['done']+1}/{total}] {name}: No coaches found on PR page")
            except Exception as e:
                stats["err"] += 1
                log.warning(f"ERR [{stats['done']+1}/{total}] {name}: {str(e)[:100]}")
            finally:
                await ctx.close()

            stats["done"] += 1
            save_progress(stats)

            # Rate limit
            await asyncio.sleep(1)

        await browser.close()

    stats["finished_at"] = datetime.now(timezone.utc).isoformat()
    save_progress(stats)

    # Final stats
    has_pr = await db.university_knowledge_base.count_documents({"coaching_staff_pr": {"$exists": True, "$ne": []}})
    total_schools = await db.university_knowledge_base.count_documents({})
    log.info(f"DONE: {stats}")
    log.info(f"PR coaching staff coverage: {has_pr}/{total_schools}")


if __name__ == "__main__":
    asyncio.run(main())
