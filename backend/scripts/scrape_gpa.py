"""Concurrent GPA scraper using multiple Playwright tabs."""
import asyncio, re, os, logging
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from playwright.async_api import async_playwright

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger(__name__)

BASE = "https://productiverecruit.com/athletic-scholarships/womens-volleyball"
STATES = {
    "AL":"alabama","AK":"alaska","AZ":"arizona","AR":"arkansas","CA":"california",
    "CO":"colorado","CT":"connecticut","DE":"delaware","DC":"district-of-columbia",
    "FL":"florida","GA":"georgia","HI":"hawaii","ID":"idaho","IL":"illinois",
    "IN":"indiana","IA":"iowa","KS":"kansas","KY":"kentucky","LA":"louisiana",
    "ME":"maine","MD":"maryland","MA":"massachusetts","MI":"michigan","MN":"minnesota",
    "MS":"mississippi","MO":"missouri","MT":"montana","NE":"nebraska","NV":"nevada",
    "NH":"new-hampshire","NJ":"new-jersey","NM":"new-mexico","NY":"new-york",
    "NC":"north-carolina","ND":"north-dakota","OH":"ohio","OK":"oklahoma","OR":"oregon",
    "PA":"pennsylvania","RI":"rhode-island","SC":"south-carolina","SD":"south-dakota",
    "TN":"tennessee","TX":"texas","UT":"utah","VT":"vermont","VA":"virginia",
    "WA":"washington","WV":"west-virginia","WI":"wisconsin","WY":"wyoming",
}

def slug(name):
    s = name.lower().replace("&","and")
    s = re.sub(r"[^a-z0-9\s-]","",s)
    s = re.sub(r"\s+","-",s.strip())
    return re.sub(r"-+","-",s)

def parse_gpa(html):
    m = re.search(r'(\d\.\d{1,2})\s*</(?:p|div|span|h\d)>\s*(?:<[^>]*>)*\s*Average GPA', html, re.DOTALL)
    if m:
        v = float(m.group(1))
        if 2.0 <= v <= 4.0: return v
    return None

async def worker(sem, page, school, db, now, stats):
    name = school.get("university_name","")
    sc = school.get("scorecard") or {}
    st = sc.get("state") or school.get("state","")
    if not st or st not in STATES:
        stats["skip"] += 1
        return
    url = f"{BASE}/{STATES[st]}/{slug(name)}"
    async with sem:
        try:
            resp = await page.goto(url, wait_until="domcontentloaded", timeout=12000)
            await asyncio.sleep(1.5)
            if resp and resp.status == 200:
                gpa = parse_gpa(await page.content())
                if gpa:
                    await db.university_knowledge_base.update_one(
                        {"_id": school["_id"]},
                        {"$set": {"scorecard.avg_gpa": gpa, "scorecard.gpa_source": "productiverecruit.com",
                                  "scorecard.gpa_scraped_at": now, "scorecard.gpa_is_estimated": False}})
                    stats["found"] += 1
                else:
                    stats["miss"] += 1
            else:
                stats["miss"] += 1
        except:
            stats["fail"] += 1
        stats["done"] += 1
        if stats["done"] % 50 == 0:
            log.info(f"Progress: {stats['done']}/{stats['total']} | Found: {stats['found']} | Miss: {stats['miss']} | Fail: {stats['fail']}")

async def main():
    client = AsyncIOMotorClient(os.environ.get("MONGO_URL","mongodb://localhost:27017"))
    db = client[os.environ.get("DB_NAME","test_database")]

    schools = await db.university_knowledge_base.find(
        {"$or": [{"scorecard.avg_gpa":None},{"scorecard.avg_gpa":{"$exists":False}},{"scorecard.gpa_is_estimated":True}]},
        {"_id":1,"university_name":1,"scorecard":1,"state":1}
    ).to_list(2000)

    log.info(f"Scraping {len(schools)} schools with 5 concurrent tabs")
    now = datetime.now(timezone.utc).isoformat()
    stats = {"done":0,"found":0,"miss":0,"fail":0,"skip":0,"total":len(schools)}

    CONCURRENCY = 5
    sem = asyncio.Semaphore(1)  # One page at a time per tab, but 5 tabs

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=['--disable-blink-features=AutomationControlled','--no-sandbox'])

        # Create multiple pages (tabs)
        pages = []
        for _ in range(CONCURRENCY):
            ctx = await browser.new_context(
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
                viewport={"width":1920,"height":1080})
            pg = await ctx.new_page()
            pages.append(pg)

        # Warmup the first page
        try:
            await pages[0].goto(f"{BASE}/florida/florida-gulf-coast-university", wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(5)
            log.info("Warmup done")
        except:
            pass

        # Distribute schools across pages
        chunks = [[] for _ in range(CONCURRENCY)]
        for i, s in enumerate(schools):
            chunks[i % CONCURRENCY].append(s)

        async def process_chunk(page, chunk):
            for school in chunk:
                await worker(sem, page, school, db, now, stats)
                await asyncio.sleep(0.3)

        # Run all chunks concurrently
        await asyncio.gather(*[process_chunk(pages[i], chunks[i]) for i in range(CONCURRENCY)])
        await browser.close()

    log.info(f"DONE: {stats}")
    real = await db.university_knowledge_base.count_documents({"scorecard.gpa_is_estimated":False,"scorecard.avg_gpa":{"$ne":None}})
    est = await db.university_knowledge_base.count_documents({"scorecard.gpa_is_estimated":True})
    log.info(f"Final: Real={real} | Estimated={est} | None={1053-real-est}")

if __name__ == "__main__":
    asyncio.run(main())
