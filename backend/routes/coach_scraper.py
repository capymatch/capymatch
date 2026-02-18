from fastapi import APIRouter, Request
from database import db
from datetime import datetime, timezone
from bs4 import BeautifulSoup
import httpx
import re
import asyncio
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/coach-scraper")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

# Track scrape progress
scrape_status = {"running": False, "scraped": 0, "failed": 0, "total": 0, "done": True}

# URL patterns to try for volleyball coaching pages
def get_url_candidates(domain, website=""):
    """Generate candidate URLs for the volleyball coaching page."""
    candidates = []

    # Priority 1: Use the athletics website URL if available
    if website:
        w = website.rstrip("/")
        if not w.startswith("http"):
            w = f"https://{w}"
        # If it's a sport-specific URL, try appending /coaches
        if "/sports/" in w or "/volleyball" in w:
            base_sport = re.sub(r'/roster.*|/schedule.*', '', w)
            candidates.append(f"{base_sport}/coaches")
            candidates.append(base_sport)
        # Try the athletics domain root + coaching pages
        from urllib.parse import urlparse
        parsed = urlparse(w)
        ath_base = f"{parsed.scheme}://{parsed.netloc}"
        for sp in ["/sports/womens-volleyball/coaches", "/sports/volleyball/coaches", "/sports/wvball/coaches"]:
            candidates.append(f"{ath_base}{sp}")

    # Priority 2: Try domain-based patterns
    base = domain.rstrip("/")
    if base:
        for sp in ["/sports/womens-volleyball/coaches", "/sports/volleyball/coaches", "/sports/wvball/coaches"]:
            candidates.append(f"https://{base}{sp}")
            candidates.append(f"https://athletics.{base}{sp}")

    return candidates


def extract_emails_from_html(html_text):
    """Extract .edu and other emails from HTML."""
    emails = set(re.findall(r'[\w.+-]+@[\w.-]+\.(?:edu|com|org|net)', html_text.lower()))
    # Filter out common non-coach emails
    skip = {"info@", "admissions@", "webmaster@", "privacy@", "help@", "support@", "news@", "marketing@"}
    return [e for e in emails if not any(e.startswith(s) for s in skip)]


def extract_coaches_structured(soup):
    """Try to extract structured coach data from common CMS patterns."""
    coaches = []

    # Pattern 1: Sidearm Sports (most common college athletics CMS)
    for card in soup.select('.sidearm-coaches-coach'):
        name_el = card.select_one('.sidearm-coaches-coach-name a, .sidearm-coaches-coach-name')
        title_el = card.select_one('.sidearm-coaches-coach-title')
        email_el = card.select_one('a[href^="mailto:"]')
        name = name_el.get_text(strip=True) if name_el else None
        title = title_el.get_text(strip=True) if title_el else None
        email = email_el['href'].replace('mailto:', '').strip() if email_el else None
        if name and name.lower() not in ("coaching staff", "staff", "coaches"):
            coaches.append({"name": name, "title": title or "", "email": email or ""})

    if coaches:
        return coaches

    # Pattern 2: Generic staff cards with mailto links
    for mailto in soup.select('a[href^="mailto:"]'):
        email = mailto['href'].replace('mailto:', '').split('?')[0].strip()
        # Walk up to find name context
        parent = mailto.find_parent(['div', 'li', 'article', 'section'])
        if parent:
            name_el = parent.select_one('h2, h3, h4, h5, .name, [class*="name"]')
            title_el = parent.select_one('.title, [class*="title"], [class*="position"], .subtitle')
            name = name_el.get_text(strip=True) if name_el else ""
            title = title_el.get_text(strip=True) if title_el else ""
            if name and email:
                coaches.append({"name": name, "title": title, "email": email})

    if coaches:
        return coaches

    # Pattern 3: Look for staff/person cards
    for card in soup.select('[class*="staff"], [class*="person"], [class*="coach"]'):
        name_el = card.select_one('h2, h3, h4, h5, [class*="name"]')
        title_el = card.select_one('[class*="title"], [class*="position"], [class*="role"]')
        email_el = card.select_one('a[href^="mailto:"]')
        name = name_el.get_text(strip=True) if name_el else None
        title = title_el.get_text(strip=True) if title_el else None
        email = email_el['href'].replace('mailto:', '').split('?')[0].strip() if email_el else None
        if name and len(name) < 60 and not any(w in name.lower() for w in ["coaching staff", "staff directory"]):
            coaches.append({"name": name, "title": title or "", "email": email or ""})

    return coaches


async def scrape_coaching_page(client, domain, website=""):
    """Try to find and scrape the volleyball coaching page for a school."""
    candidates = get_url_candidates(domain, website)

    for url in candidates:
        try:
            resp = await client.get(url, headers=HEADERS, follow_redirects=True, timeout=10)
            if resp.status_code != 200:
                continue

            html = resp.text
            # Quick check: does this page mention volleyball?
            if "volleyball" not in html.lower() and "volley" not in html.lower():
                continue

            soup = BeautifulSoup(html, "lxml")

            # Extract structured coaches
            coaches = extract_coaches_structured(soup)

            # If no structured data, fall back to email extraction
            if not coaches:
                emails = extract_emails_from_html(html)
                if emails:
                    coaches = [{"name": "", "title": "", "email": e} for e in emails[:5]]

            if coaches:
                return {"url": str(resp.url), "coaches": coaches}

        except Exception:
            continue

    return None


async def _run_scrape():
    """Background task to scrape coaches for all schools missing coach emails."""
    global scrape_status
    try:
        universities = await db.university_knowledge_base.find(
            {"$or": [{"coach_email": ""}, {"coach_email": {"$exists": False}}]},
            {"_id": 0, "university_name": 1, "domain": 1, "website": 1}
        ).to_list(2000)

        scrape_status["total"] = len(universities)
        if not universities:
            scrape_status.update({"running": False, "done": True})
            return

        async with httpx.AsyncClient() as client:
            for uni in universities:
                domain = uni.get("domain", "")
                name = uni.get("university_name", "")
                if not domain:
                    scrape_status["failed"] += 1
                    continue

                try:
                    result = await scrape_coaching_page(client, domain, uni.get("website", ""))
                    if result and result["coaches"]:
                        # Find head coach (first one, or one with "head" in title)
                        head = None
                        assistant = None
                        for c in result["coaches"]:
                            if "head" in c.get("title", "").lower():
                                head = c
                            elif not assistant and c.get("email"):
                                assistant = c
                        if not head and result["coaches"]:
                            head = result["coaches"][0]
                        if not assistant and len(result["coaches"]) > 1:
                            assistant = result["coaches"][1]

                        update = {"coaches_scraped": result["coaches"], "coaches_source_url": result["url"]}
                        if head:
                            if head.get("name"):
                                update["primary_coach"] = head["name"]
                            if head.get("email"):
                                update["coach_email"] = head["email"]
                        if assistant:
                            if assistant.get("name"):
                                update["recruiting_coordinator"] = assistant["name"]
                            if assistant.get("email"):
                                update["coordinator_email"] = assistant["email"]

                        await db.university_knowledge_base.update_one(
                            {"university_name": name},
                            {"$set": update}
                        )
                        scrape_status["scraped"] += 1
                    else:
                        scrape_status["failed"] += 1
                except Exception as e:
                    logger.warning(f"Coach scrape failed for {name}: {e}")
                    scrape_status["failed"] += 1

                await asyncio.sleep(0.5)

    except Exception as e:
        logger.error(f"Coach scrape task error: {e}")
    finally:
        scrape_status["running"] = False
        scrape_status["done"] = True


@router.post("/scrape")
async def start_scrape():
    """Start background scraping of coach data."""
    global scrape_status
    if scrape_status["running"]:
        return {"status": "already_running", **scrape_status}

    already_have = await db.university_knowledge_base.count_documents({"coach_email": {"$ne": ""}})
    missing = await db.university_knowledge_base.count_documents(
        {"$or": [{"coach_email": ""}, {"coach_email": {"$exists": False}}]}
    )

    scrape_status = {"running": True, "scraped": 0, "failed": 0, "total": missing, "done": False}
    asyncio.create_task(_run_scrape())

    return {"status": "started", "already_have": already_have, "missing": missing}


@router.get("/status")
async def get_scrape_status():
    """Get scrape progress."""
    return scrape_status


@router.post("/scrape-one")
async def scrape_one(request: Request):
    """Scrape coach data for a single university."""
    body = await request.json()
    name = body.get("university_name", "").strip()
    if not name:
        return {"error": "university_name required"}

    uni = await db.university_knowledge_base.find_one(
        {"university_name": name}, {"_id": 0, "domain": 1, "website": 1}
    )
    if not uni:
        return {"error": "University not found"}

    domain = uni.get("domain", "")
    if not domain:
        return {"error": "No domain for this university"}

    async with httpx.AsyncClient() as client:
        result = await scrape_coaching_page(client, domain, uni.get("website", ""))

    if not result or not result["coaches"]:
        return {"found": False, "message": f"Could not find coaching data for {name}"}

    # Update DB
    head = None
    assistant = None
    for c in result["coaches"]:
        if "head" in c.get("title", "").lower():
            head = c
        elif not assistant and c.get("email"):
            assistant = c
    if not head:
        head = result["coaches"][0]
    if not assistant and len(result["coaches"]) > 1:
        assistant = result["coaches"][1]

    update = {"coaches_scraped": result["coaches"], "coaches_source_url": result["url"]}
    if head:
        if head.get("name"):
            update["primary_coach"] = head["name"]
        if head.get("email"):
            update["coach_email"] = head["email"]
    if assistant:
        if assistant.get("name"):
            update["recruiting_coordinator"] = assistant["name"]
        if assistant.get("email"):
            update["coordinator_email"] = assistant["email"]

    await db.university_knowledge_base.update_one(
        {"university_name": name}, {"$set": update}
    )

    return {"found": True, "url": result["url"], "coaches": result["coaches"]}
