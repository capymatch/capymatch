"""
Two-pass GPA scraper:
1. Scrape all 51 state index pages to get real school slugs
2. Match to our KB and scrape GPA from each school page

Run: cd /app/backend && MONGO_URL=mongodb://localhost:27017 DB_NAME=test_database python3 scripts/scrape_gpa.py
"""
import asyncio, re, os, logging, json
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from playwright.async_api import async_playwright

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger(__name__)

BASE = "https://productiverecruit.com/athletic-scholarships/womens-volleyball"
STATES = [
    "alabama","alaska","arizona","arkansas","california","colorado","connecticut",
    "delaware","district-of-columbia","florida","georgia","hawaii","idaho","illinois",
    "indiana","iowa","kansas","kentucky","louisiana","maine","maryland","massachusetts",
    "michigan","minnesota","mississippi","missouri","montana","nebraska","nevada",
    "new-hampshire","new-jersey","new-mexico","new-york","north-carolina","north-dakota",
    "ohio","oklahoma","oregon","pennsylvania","rhode-island","south-carolina","south-dakota",
    "tennessee","texas","utah","vermont","virginia","washington","west-virginia","wisconsin","wyoming",
]

def normalize(name):
    n = name.lower().strip()
    for w in ["the ", "university of ", "university", "college of ", "college", "– ", "- ", "&", "at ", "in "]:
        n = n.replace(w, " ")
    return re.sub(r"[^a-z0-9]", "", n)

def parse_gpa(html):
    m = re.search(r'(\d\.\d{1,2})\s*</(?:p|div|span|h\d)>\s*(?:<[^>]*>)*\s*Average GPA', html, re.DOTALL)
    if m:
        v = float(m.group(1))
        if 2.0 <= v <= 4.0: return v
    return None


async def pass1_collect_slugs(page):
    """Scrape all state index pages to collect {name -> (state, slug)} mapping."""
    slug_map = {}  # normalized_name -> (state_slug, school_slug, original_name)

    for state in STATES:
        url = f"{BASE}/{state}"
        try:
            resp = await page.goto(url, wait_until="domcontentloaded", timeout=15000)
            await asyncio.sleep(3)
            if not resp or resp.status != 200:
                continue
            content = await page.content()

            # Extract all school links from the table
            links = re.findall(
                r'href="https://productiverecruit\.com/athletic-scholarships/womens-volleyball/'
                + re.escape(state) + r'/([^"]+)"[^>]*>\s*\n?\s*([^<]+)',
                content
            )
            for school_slug, school_name in links:
                clean_name = school_name.strip()
                norm = normalize(clean_name)
                slug_map[norm] = (state, school_slug, clean_name)

        except Exception as e:
            log.warning(f"State {state} failed: {e}")

        if len(slug_map) % 100 == 0 and slug_map:
            log.info(f"Pass 1: {len(slug_map)} slugs collected so far")

    log.info(f"Pass 1 complete: {len(slug_map)} school slugs collected from {len(STATES)} states")
    return slug_map


async def pass2_scrape_gpas(page, slug_map, db):
    """Match KB entries to slug map, then scrape GPA from each school page."""
    schools = await db.university_knowledge_base.find(
        {"$or": [
            {"scorecard.avg_gpa": None}, {"scorecard.avg_gpa": {"$exists": False}},
            {"scorecard.gpa_is_estimated": True},
        ]},
        {"_id": 1, "university_name": 1}
    ).to_list(2000)

    log.info(f"Pass 2: {len(schools)} schools need GPA data")
    now = datetime.now(timezone.utc).isoformat()
    stats = {"done": 0, "found": 0, "no_match": 0, "no_gpa": 0, "fail": 0, "total": len(schools)}

    for school in schools:
        name = school.get("university_name", "")
        norm = normalize(name)

        # Try to find matching slug
        match = slug_map.get(norm)
        if not match:
            # Try partial matching
            best_key = None
            best_overlap = 0
            for key in slug_map:
                # Check how much overlap there is
                if norm in key or key in norm:
                    overlap = min(len(norm), len(key)) / max(len(norm), len(key))
                    if overlap > best_overlap:
                        best_overlap = overlap
                        best_key = key
            if best_key and best_overlap > 0.7:
                match = slug_map[best_key]

        if not match:
            stats["no_match"] += 1
            stats["done"] += 1
            continue

        state, school_slug, _ = match
        url = f"{BASE}/{state}/{school_slug}"

        try:
            resp = await page.goto(url, wait_until="domcontentloaded", timeout=12000)
            await asyncio.sleep(1)
            if resp and resp.status == 200:
                gpa = parse_gpa(await page.content())
                if gpa:
                    await db.university_knowledge_base.update_one(
                        {"_id": school["_id"]},
                        {"$set": {
                            "scorecard.avg_gpa": gpa,
                            "scorecard.gpa_source": "productiverecruit.com",
                            "scorecard.gpa_scraped_at": now,
                            "scorecard.gpa_is_estimated": False,
                        }}
                    )
                    stats["found"] += 1
                else:
                    stats["no_gpa"] += 1
            else:
                stats["fail"] += 1
        except:
            stats["fail"] += 1

        stats["done"] += 1
        if stats["done"] % 50 == 0:
            log.info(f"Pass 2: {stats['done']}/{stats['total']} | Found: {stats['found']} | No match: {stats['no_match']} | No GPA on page: {stats['no_gpa']}")

    log.info(f"Pass 2 complete: {stats}")


async def main():
    client = AsyncIOMotorClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
    db = client[os.environ.get("DB_NAME", "test_database")]

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=['--disable-blink-features=AutomationControlled', '--no-sandbox'])
        ctx = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080})
        page = await ctx.new_page()

        # Warmup
        try:
            await page.goto(f"{BASE}/florida", wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(5)
            log.info("Cloudflare warmup done")
        except:
            pass

        # Pass 1: Collect real slugs
        slug_map = await pass1_collect_slugs(page)

        # Save slug map for reference
        with open("/tmp/slug_map.json", "w") as f:
            json.dump({k: v for k, v in slug_map.items()}, f, indent=2)

        # Pass 2: Scrape GPAs
        await pass2_scrape_gpas(page, slug_map, db)

        await browser.close()

    # Final stats
    real = await db.university_knowledge_base.count_documents({"scorecard.gpa_is_estimated": False, "scorecard.avg_gpa": {"$ne": None}})
    est = await db.university_knowledge_base.count_documents({"scorecard.gpa_is_estimated": True})
    log.info(f"FINAL: Real GPA={real} | Estimated={est} | None={1053 - real - est}")

if __name__ == "__main__":
    asyncio.run(main())
