"""
Backfill missing financial data + coaching staff from Productive Recruit.
Adds: median_debt, monthly_loan_payment, receive_federal_loans, coaching_staff
Run: tmux new-session -d -s backfill 'cd /app/backend && python3 scripts/scrape_financial_coaches.py > /tmp/financial_scrape.log 2>&1'
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

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger(__name__)

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


def parse_financial_and_coaches(html):
    """Parse missing financial fields + coaching staff from PR HTML."""
    clean = re.sub(r'<!--.*?-->', '', html, flags=re.DOTALL)
    result = {}

    # Receive Federal Loans: "46.2%"
    m = re.search(r'([\d.]+)%\s*<[^>]*>\s*(?:<[^>]*>\s*)*Receive Federal Loans', clean)
    if m:
        result["receive_federal_loans"] = float(m.group(1))

    # Median Debt at Graduation: "$25,000"
    m = re.search(r'\$([\d,]+)\s*<[^>]*>\s*(?:<[^>]*>\s*)*Median Debt at Graduation', clean)
    if m:
        result["median_debt"] = int(m.group(1).replace(",", ""))

    # Monthly Loan Payment: "$265"
    m = re.search(r'\$([\d,]+)\s*<[^>]*>\s*(?:<[^>]*>\s*)*Monthly Loan Payment', clean)
    if m:
        result["monthly_loan_payment"] = int(m.group(1).replace(",", ""))

    # Coaching Staff: role + name pairs
    coaches = []
    coach_section = re.search(r'Coaching Staff(.*?)(?:School Profile|Subscribe|Similar Programs)', clean, re.DOTALL)
    if coach_section:
        text = coach_section.group(1)
        # Match longer roles first to avoid substring matches (e.g. "Head Coach" matching inside "Associate Head Coach")
        roles = [
            'Associate Head Coach', 'Director of Volleyball Operations',
            'Director of Operations', 'Volunteer Assistant',
            'Graduate Assistant', 'Assistant Coach', 'Head Coach',
        ]
        for role in roles:
            pattern = re.escape(role) + r'\s*(?:</[^>]*>\s*)*(?:<[^>]*>\s*)*([A-Z][a-zA-Z\'\-\.\s]+?)(?:\s*<)'
            for name in re.findall(pattern, text):
                name = name.strip()
                if 2 < len(name) < 60 and not any(c['name'] == name for c in coaches):
                    coaches.append({"role": role, "name": name})

    if coaches:
        result["coaching_staff"] = coaches

    return result


async def main():
    client = AsyncIOMotorClient(os.environ.get("MONGO_URL"))
    db = client[os.environ.get("DB_NAME")]

    # Get schools that have pr_slug but are missing financial/coach data
    schools = await db.university_knowledge_base.find(
        {
            "pr_slug": {"$exists": True, "$ne": "---", "$ne": ""},
            "$or": [
                {"scorecard.median_debt": {"$exists": False}},
                {"coaching_staff_pr": {"$exists": False}},
            ]
        },
        {"_id": 1, "university_name": 1, "pr_slug": 1, "pr_state": 1}
    ).to_list(2000)

    log.info(f"Schools to scrape: {len(schools)}")
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
                await page.goto(url, wait_until="domcontentloaded", timeout=15000)
                try:
                    await page.wait_for_selector("text=Coaching Staff", timeout=12000)
                    await asyncio.sleep(1.5)
                except:
                    await asyncio.sleep(6)

                html = await page.content()
                data = parse_financial_and_coaches(html)

                if data:
                    update = {}
                    if "median_debt" in data:
                        update["scorecard.median_debt"] = data["median_debt"]
                    if "monthly_loan_payment" in data:
                        update["scorecard.monthly_loan_payment"] = data["monthly_loan_payment"]
                    if "receive_federal_loans" in data:
                        update["scorecard.receive_federal_loans"] = data["receive_federal_loans"]
                    if "coaching_staff" in data:
                        update["coaching_staff_pr"] = data["coaching_staff"]

                    if update:
                        update["financial_scraped_at"] = datetime.now(timezone.utc).isoformat()
                        await db.university_knowledge_base.update_one(
                            {"_id": school["_id"]},
                            {"$set": update}
                        )
                        stats["ok"] += 1
                    else:
                        stats["miss"] += 1
                else:
                    stats["miss"] += 1
            except Exception as e:
                stats["err"] += 1
                if stats["err"] <= 10:
                    log.warning(f"Error {name}: {str(e)[:80]}")
            finally:
                await ctx.close()

            stats["done"] += 1
            if stats["done"] % 25 == 0:
                log.info(f"Progress: {stats['done']}/{len(schools)} | OK={stats['ok']} Miss={stats['miss']} Err={stats['err']}")

        await browser.close()

    log.info(f"DONE: {stats}")
    has_debt = await db.university_knowledge_base.count_documents({"scorecard.median_debt": {"$exists": True}})
    has_coaches = await db.university_knowledge_base.count_documents({"coaching_staff_pr": {"$exists": True, "$ne": []}})
    total = await db.university_knowledge_base.count_documents({})
    log.info(f"Median debt coverage: {has_debt}/{total}")
    log.info(f"Coaching staff coverage: {has_coaches}/{total}")


if __name__ == "__main__":
    asyncio.run(main())
