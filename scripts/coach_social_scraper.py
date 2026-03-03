"""
Coach Social Media Scraper
Visits each school's coaches page and individual coach bio pages to find social media links.
Stores results in coaches_scraped[].social_links
"""
import asyncio, re, os, sys
from datetime import datetime, timezone
from urllib.parse import urlparse, urljoin

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import pymongo
from playwright.async_api import async_playwright

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

SOCIAL_PATTERNS = {
    "twitter": re.compile(r"https?://(www\.)?(twitter\.com|x\.com)/[A-Za-z0-9_]+", re.I),
    "instagram": re.compile(r"https?://(www\.)?instagram\.com/[A-Za-z0-9_.]+", re.I),
    "facebook": re.compile(r"https?://(www\.)?facebook\.com/[A-Za-z0-9_./-]+", re.I),
}

# Generic school accounts to skip — we want personal coach accounts
GENERIC_SKIP = re.compile(r"(athletics|sports|gowildcats|go[a-z]+s|official|team)", re.I)

async def extract_social_links(page):
    """Extract social media links from current page."""
    hrefs = await page.evaluate("() => Array.from(document.querySelectorAll('a[href]')).map(a => a.href)")
    links = {}
    for platform, pattern in SOCIAL_PATTERNS.items():
        matches = [h for h in hrefs if pattern.match(h)]
        if matches:
            links[platform] = matches
    return links

async def find_coach_bio_links(page, coaches_url):
    """Find links to individual coach bio pages from the coaches listing page."""
    try:
        parsed = urlparse(coaches_url)
        base = f"{parsed.scheme}://{parsed.netloc}"
        
        links = await page.evaluate("""() => {
            const results = [];
            // Look for links within coach cards/sections
            const allLinks = document.querySelectorAll('a[href]');
            for (const a of allLinks) {
                const href = a.href;
                // Coach bio pages typically have patterns like /staff/, /coaches/, /roster/coaches/
                if (href && (
                    href.includes('/staff/') || 
                    href.includes('/coaches/') && !href.endsWith('/coaches') && !href.endsWith('/coaches/') ||
                    href.includes('/coach/')
                )) {
                    const text = a.textContent.trim();
                    if (text && text.length > 2 && text.length < 60) {
                        results.push({href: href, text: text});
                    }
                }
            }
            return results;
        }""")
        return links
    except:
        return []

def match_coach_name(bio_text, coach_name):
    """Check if a bio link text matches a coach name."""
    if not coach_name or not bio_text:
        return False
    # Normalize both
    bio_lower = bio_text.lower().strip()
    name_lower = coach_name.lower().strip()
    # Direct match
    if name_lower in bio_lower or bio_lower in name_lower:
        return True
    # Last name match
    parts = name_lower.split()
    if len(parts) >= 2:
        last = parts[-1]
        if len(last) > 2 and last in bio_lower:
            return True
    return False

async def scrape_coaches(page, school):
    """Scrape social media for coaches at a school."""
    coaches_url = school.get("coaches_source_url", "")
    coaches = school.get("coaches_scraped", [])
    
    if not coaches_url or not coaches:
        return None
    
    if not coaches_url.startswith("http"):
        coaches_url = "https://" + coaches_url
    
    updated_coaches = []
    found_any = False
    
    try:
        # Visit the coaches listing page
        await page.goto(coaches_url, wait_until="domcontentloaded", timeout=15000)
        await page.wait_for_timeout(2000)
        
        # Get social links from the coaches page itself
        page_socials = await extract_social_links(page)
        
        # Find individual coach bio page links
        bio_links = await find_coach_bio_links(page, coaches_url)
        
        for coach in coaches:
            coach_name = coach.get("name", "")
            coach_copy = dict(coach)
            
            # Try to find this coach's bio page
            matched_bio = None
            for bl in bio_links:
                if match_coach_name(bl["text"], coach_name):
                    matched_bio = bl["href"]
                    break
            
            coach_socials = {}
            
            if matched_bio:
                try:
                    await page.goto(matched_bio, wait_until="domcontentloaded", timeout=12000)
                    await page.wait_for_timeout(1500)
                    bio_socials = await extract_social_links(page)
                    
                    # Take the first link for each platform (most likely personal)
                    for platform, urls in bio_socials.items():
                        if urls:
                            # Prefer non-generic accounts
                            for u in urls:
                                handle = u.rstrip("/").split("/")[-1]
                                if not GENERIC_SKIP.search(handle):
                                    coach_socials[platform] = u
                                    break
                            if platform not in coach_socials:
                                coach_socials[platform] = urls[0]
                except:
                    pass
            
            if coach_socials:
                coach_copy["social_links"] = coach_socials
                found_any = True
            
            updated_coaches.append(coach_copy)
    
    except Exception as e:
        return None
    
    if found_any:
        return updated_coaches
    return None


async def main():
    client = pymongo.MongoClient(MONGO_URL)
    db = client[DB_NAME]

    schools = list(db.university_knowledge_base.find(
        {
            "coaches_source_url": {"$exists": True, "$ne": ""},
            "coaches_scraped": {"$exists": True, "$ne": []},
        },
        {"_id": 1, "university_name": 1, "coaches_source_url": 1, "coaches_scraped": 1, "division": 1}
    ))
    
    total = len(schools)
    print(f"[{datetime.now(timezone.utc).isoformat()}] Coach social scraper: {total} schools with coach pages")

    success = 0
    coaches_with_socials = 0
    failed = 0

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True, args=["--no-sandbox"])
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
        )
        page = await context.new_page()

        for i, school in enumerate(schools):
            name = school.get("university_name", "?")
            div = school.get("division", "?")
            
            try:
                updated = await scrape_coaches(page, school)
                if updated:
                    count = sum(1 for c in updated if c.get("social_links"))
                    db.university_knowledge_base.update_one(
                        {"_id": school["_id"]},
                        {"$set": {"coaches_scraped": updated}}
                    )
                    success += 1
                    coaches_with_socials += count
                    coach_names = [f"{c['name']}({','.join(c['social_links'].keys())})" for c in updated if c.get("social_links")]
                    print(f"  [{i+1}/{total}] OK {count} coaches: {name} [{div}] -> {'; '.join(coach_names)}")
                else:
                    failed += 1
                    if (i+1) % 50 == 0:
                        print(f"  [{i+1}/{total}] NONE: {name} [{div}]")
            except Exception as e:
                failed += 1
                if (i+1) % 50 == 0:
                    print(f"  [{i+1}/{total}] ERR: {name} [{div}] -> {str(e)[:60]}")

            if (i + 1) % 50 == 0:
                print(f"  --- Progress: {i+1}/{total} (Schools:{success} Coaches:{coaches_with_socials} Fail:{failed}) ---")

        await browser.close()

    print(f"\n[{datetime.now(timezone.utc).isoformat()}] DONE")
    print(f"  Schools with coach socials: {success}/{total}")
    print(f"  Total coaches with socials: {coaches_with_socials}")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
