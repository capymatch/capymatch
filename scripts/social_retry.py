"""
Retry scraper for schools that failed to get social links on first pass.
"""
import asyncio, re, os, sys
from datetime import datetime, timezone
from urllib.parse import urlparse

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import pymongo
from playwright.async_api import async_playwright

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

SOCIAL_PATTERNS = {
    "twitter": re.compile(r"https?://(www\.)?(twitter\.com|x\.com)/[A-Za-z0-9_]+", re.I),
    "instagram": re.compile(r"https?://(www\.)?instagram\.com/[A-Za-z0-9_.]+", re.I),
    "facebook": re.compile(r"https?://(www\.)?facebook\.com/[A-Za-z0-9_./-]+", re.I),
    "youtube": re.compile(r"https?://(www\.)?youtube\.com/(c/|channel/|@)[A-Za-z0-9_-]+", re.I),
    "tiktok": re.compile(r"https?://(www\.)?tiktok\.com/@[A-Za-z0-9_.]+", re.I),
}
VB_KEYWORDS = re.compile(r"volley|vball|vb", re.I)
SKIP_PATTERNS = ["/athletics", "/goathletics", "/sports", "/collegesports"]

def best_link(links):
    if not links: return None
    scored = [(3 if VB_KEYWORDS.search(l) else 1, l) for l in links]
    scored.sort(key=lambda x: -x[0])
    return scored[0][1]

async def scrape_school(page, url):
    if not url: return None
    if not url.startswith("http"): url = "https://" + url
    parsed = urlparse(url)
    base_url = f"{parsed.scheme}://{parsed.netloc}"
    social_links = {}

    for attempt_url in [url, base_url]:
        try:
            await page.goto(attempt_url, wait_until="domcontentloaded", timeout=20000)
            await page.wait_for_timeout(3000)  # Extra wait for retry
            hrefs = await page.evaluate("() => Array.from(document.querySelectorAll('a[href]')).map(a => a.href)")
            for platform, pattern in SOCIAL_PATTERNS.items():
                if platform in social_links: continue
                matches = [h for h in hrefs if pattern.match(h)]
                matches = [m for m in matches if not any(s in m.lower() for s in SKIP_PATTERNS)]
                link = best_link(matches)
                if link: social_links[platform] = link
            if len(social_links) >= 2: break
        except: continue
    return social_links if social_links else None

async def main():
    client = pymongo.MongoClient(MONGO_URL)
    db = client[DB_NAME]

    schools = list(db.university_knowledge_base.find(
        {"$or": [{"social_links": {"$exists": False}}, {"social_links": {}}, {"social_links": None}]},
        {"_id": 1, "university_name": 1, "website": 1, "division": 1}
    ))
    total = len(schools)
    print(f"[{datetime.now(timezone.utc).isoformat()}] Retry scraper: {total} schools without social links")

    success = 0
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True, args=["--no-sandbox"])
        context = await browser.new_context(user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36")
        page = await context.new_page()

        for i, school in enumerate(schools):
            name = school.get("university_name", "?")
            website = school.get("website", "")
            div = school.get("division", "?")
            if not website:
                print(f"  [{i+1}/{total}] SKIP (no URL): {name} [{div}]")
                continue
            try:
                links = await scrape_school(page, website)
                if links:
                    db.university_knowledge_base.update_one({"_id": school["_id"]}, {"$set": {"social_links": links}})
                    success += 1
                    print(f"  [{i+1}/{total}] OK ({len(links)}): {name} [{div}] -> {', '.join(links.keys())}")
                else:
                    print(f"  [{i+1}/{total}] NONE: {name} [{div}]")
            except Exception as e:
                print(f"  [{i+1}/{total}] ERR: {name} [{div}] -> {str(e)[:60]}")

        await browser.close()
    print(f"\n[{datetime.now(timezone.utc).isoformat()}] DONE | Recovered: {success}/{total}")
    client.close()

if __name__ == "__main__":
    asyncio.run(main())
