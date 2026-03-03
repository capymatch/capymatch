"""
D3 Social Media Scraper
Scrapes social media links from D3 school athletics websites using Playwright.
Run: python3 scripts/social_scraper_d3.py
"""
import asyncio, re, json, os, sys
from datetime import datetime, timezone
from urllib.parse import urlparse

# Add parent dir for imports
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

# Skip generic school-level accounts
SKIP_PATTERNS = ["/athletics", "/goathletics", "/sports", "/collegesports"]


def score_link(url, platform):
    """Volleyball-specific links score higher."""
    if VB_KEYWORDS.search(url):
        return 3
    return 1


def best_link(links, platform):
    """Pick the most volleyball-specific link for a platform."""
    if not links:
        return None
    scored = [(score_link(l, platform), l) for l in links]
    scored.sort(key=lambda x: -x[0])
    return scored[0][1]


async def scrape_school(page, school):
    """Visit school website and extract social links."""
    url = school.get("website", "")
    name = school.get("university_name", "unknown")

    if not url:
        return None

    # Normalize URL
    if not url.startswith("http"):
        url = "https://" + url

    # Try the main athletics page (strip path to get base domain)
    parsed = urlparse(url)
    base_url = f"{parsed.scheme}://{parsed.netloc}"

    social_links = {}

    for attempt_url in [url, base_url]:
        try:
            await page.goto(attempt_url, wait_until="domcontentloaded", timeout=15000)
            await page.wait_for_timeout(2000)

            # Get all links on page
            hrefs = await page.evaluate("""() => {
                return Array.from(document.querySelectorAll('a[href]')).map(a => a.href);
            }""")

            for platform, pattern in SOCIAL_PATTERNS.items():
                if platform in social_links:
                    continue
                matches = [h for h in hrefs if pattern.match(h)]
                # Filter out generic skip patterns
                matches = [m for m in matches if not any(s in m.lower() for s in SKIP_PATTERNS)]
                link = best_link(matches, platform)
                if link:
                    social_links[platform] = link

            # If we got at least 2 platforms, good enough
            if len(social_links) >= 2:
                break

        except Exception as e:
            continue

    return social_links if social_links else None


async def main():
    client = pymongo.MongoClient(MONGO_URL)
    db = client[DB_NAME]

    schools = list(db.university_knowledge_base.find(
        {"division": "D3", "$or": [
            {"social_links": {"$exists": False}},
            {"social_links": {}},
            {"social_links": None},
        ]},
        {"_id": 1, "university_name": 1, "website": 1}
    ))

    total = len(schools)
    print(f"[{datetime.now(timezone.utc).isoformat()}] Starting D3 social scraper: {total} schools")

    success = 0
    failed = 0
    skipped = 0

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True, args=["--no-sandbox"])
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
        )
        page = await context.new_page()

        for i, school in enumerate(schools):
            name = school.get("university_name", "?")
            website = school.get("website", "")

            if not website:
                skipped += 1
                print(f"  [{i+1}/{total}] SKIP (no URL): {name}")
                continue

            try:
                links = await scrape_school(page, school)
                if links:
                    db.university_knowledge_base.update_one(
                        {"_id": school["_id"]},
                        {"$set": {"social_links": links}}
                    )
                    platforms = ", ".join(links.keys())
                    vb_count = sum(1 for v in links.values() if VB_KEYWORDS.search(v))
                    success += 1
                    print(f"  [{i+1}/{total}] OK ({len(links)} links, {vb_count} VB): {name} -> {platforms}")
                else:
                    failed += 1
                    print(f"  [{i+1}/{total}] NONE: {name}")
            except Exception as e:
                failed += 1
                print(f"  [{i+1}/{total}] ERR: {name} -> {str(e)[:80]}")

            # Brief pause to be polite
            if (i + 1) % 10 == 0:
                print(f"  --- Progress: {i+1}/{total} (OK:{success} FAIL:{failed} SKIP:{skipped}) ---")
                await asyncio.sleep(1)

        await browser.close()

    print(f"\n[{datetime.now(timezone.utc).isoformat()}] DONE")
    print(f"  Total: {total} | Success: {success} | Failed: {failed} | Skipped: {skipped}")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
