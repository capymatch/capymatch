"""
Enhanced retry scraper for hard-to-scrape schools.
Improvements over v1:
- Uses networkidle wait (better for JS-heavy Sidearm/Learfield athletic sites)
- Tries more URL paths: base domain, /sports/volleyball, /volleyball
- Looks at meta tags and data attributes in addition to anchors
- Longer timeout (25s)
"""
import asyncio
import re
import os
import sys
from datetime import datetime, timezone
from urllib.parse import urlparse

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")
import pymongo
from playwright.async_api import async_playwright

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

SOCIAL_PATTERNS = {
    "twitter": re.compile(r"https?://(www\.)?(twitter\.com|x\.com)/[A-Za-z0-9_]+", re.I),
    "instagram": re.compile(r"https?://(www\.)?instagram\.com/[A-Za-z0-9_.]+", re.I),
    "facebook": re.compile(r"https?://(www\.)?facebook\.com/[A-Za-z0-9_./-]+", re.I),
    "youtube": re.compile(r"https?://(www\.)?youtube\.com/(c/|channel/|@)[A-Za-z0-9_-]+", re.I),
    "tiktok": re.compile(r"https?://(www\.)?tiktok\.com/@[A-Za-z0-9_.]+", re.I),
}
VB_KEYWORDS = re.compile(r"volley|vball|vb", re.I)
SKIP_HANDLES = {"intent", "share", "home", "sharer", "dialog", "watch", "embed", "hashtag",
                "p", "reel", "stories", "login", "signup", "about", "help", "settings",
                "explore", "search", "athletics", "sports", "goathletics"}


def score_link(url):
    return 3 if VB_KEYWORDS.search(url) else 1


def best_link(links):
    if not links:
        return None
    scored = [(score_link(l), l) for l in links]
    scored.sort(key=lambda x: -x[0])
    return scored[0][1]


def filter_links(links):
    """Remove blacklisted handles."""
    cleaned = []
    for l in links:
        path = urlparse(l).path.strip("/").split("/")
        if path and path[0].lower() in SKIP_HANDLES:
            continue
        cleaned.append(l)
    return cleaned


async def get_all_links(page, url, timeout=25000):
    """Load a URL and extract all social links from anchors + text content."""
    try:
        await page.goto(url, wait_until="networkidle", timeout=timeout)
        await page.wait_for_timeout(2000)
    except Exception:
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=timeout)
            await page.wait_for_timeout(3000)
        except Exception:
            return []

    try:
        # Get links from hrefs AND all text in the page (catches data attributes / scripts)
        data = await page.evaluate("""() => {
            const hrefs = Array.from(document.querySelectorAll('a[href]')).map(a => a.href);
            const text = document.body ? document.body.innerHTML : '';
            return { hrefs, text };
        }""")
        hrefs = data.get("hrefs", [])
        text = data.get("text", "")
        # Extract URLs from page text (covers data-attributes, inline scripts etc.)
        text_urls = re.findall(r'https?://[^\s\'"<>]+', text)
        all_urls = hrefs + text_urls
        return all_urls
    except Exception:
        return []


async def scrape_school(page, school):
    website = school.get("website", "")
    if not website or "nike.com" in website:
        return None
    if not website.startswith("http"):
        website = "https://" + website

    parsed = urlparse(website)
    base = f"{parsed.scheme}://{parsed.netloc}"

    # Build list of URLs to try
    urls_to_try = [base, website]
    # Also try common athletics page patterns
    for suffix in ["/sports/womens-volleyball", "/sports/volleyball", "/volleyball"]:
        candidate = base + suffix
        if candidate not in urls_to_try:
            urls_to_try.append(candidate)

    social_links = {}

    for attempt_url in urls_to_try:
        if len(social_links) >= 3:
            break
        all_urls = await get_all_links(page, attempt_url)
        for platform, pattern in SOCIAL_PATTERNS.items():
            if platform in social_links:
                continue
            matches = [u for u in all_urls if pattern.search(u)]
            matches = filter_links(matches)
            link = best_link(matches)
            if link:
                social_links[platform] = link

    return social_links if social_links else None


async def main():
    client = pymongo.MongoClient(MONGO_URL)
    db = client[DB_NAME]

    schools = list(db.university_knowledge_base.find(
        {"$or": [{"social_links": {"$exists": False}}, {"social_links": {}}, {"social_links": None}]},
        {"_id": 1, "university_name": 1, "website": 1, "division": 1}
    ).sort("division", 1))

    total = len(schools)
    print(f"[{datetime.now(timezone.utc).isoformat()}] Enhanced retry: {total} schools")

    success = 0
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-blink-features=AutomationControlled"]
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800},
        )
        page = await context.new_page()

        for i, school in enumerate(schools):
            name = school.get("university_name", "?")
            div = school.get("division", "?")
            website = school.get("website", "")

            if not website or "nike.com" in website:
                print(f"  [{i+1}/{total}] SKIP (bad URL): {name} [{div}]")
                continue

            try:
                links = await scrape_school(page, school)
                if links:
                    db.university_knowledge_base.update_one(
                        {"_id": school["_id"]},
                        {"$set": {"social_links": links}}
                    )
                    success += 1
                    platforms = ", ".join(links.keys())
                    print(f"  [{i+1}/{total}] OK ({len(links)}): {name} [{div}] -> {platforms}")
                else:
                    print(f"  [{i+1}/{total}] NONE: {name} [{div}]")
            except Exception as e:
                print(f"  [{i+1}/{total}] ERR: {name} [{div}] -> {str(e)[:80]}")

        await browser.close()

    print(f"\n[{datetime.now(timezone.utc).isoformat()}] DONE | Recovered: {success}/{total}")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
