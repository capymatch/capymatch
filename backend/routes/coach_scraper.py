from fastapi import APIRouter, Request
from database import db
from datetime import datetime, timezone
from bs4 import BeautifulSoup
import httpx
import re
import asyncio
import logging
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/coach-scraper")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate",
}

# Track scrape progress
scrape_status = {"running": False, "scraped": 0, "failed": 0, "total": 0, "done": True}

# Placeholder names that indicate JS rendering failed
PLACEHOLDER_NAMES = {"name", "title", "first last", "staff", "coaching staff", "coaches", "coach", ""}

SPORT_PATHS = [
    "/sports/womens-volleyball/coaches",
    "/sports/womens-volleyball/coaching-staff",
    "/sports/womens-volleyball/staff",
    "/sports/volleyball/coaches",
    "/sports/volleyball/coaching-staff",
    "/sports/wvball/coaches",
    "/sports/w-volley/coaches",
    "/sports/wvb/coaches",
    "/sports/womens-volleyball",  # some sites embed coaches on the main page
    "/sports/volleyball",
]


def get_url_candidates(domain, website=""):
    """Generate candidate URLs for the volleyball coaching page."""
    candidates = []

    if website:
        w = website.rstrip("/")
        if not w.startswith("http"):
            w = f"https://{w}"
        if "/sports/" in w or "/volleyball" in w:
            base_sport = re.sub(r'/roster.*|/schedule.*', '', w)
            candidates.append(f"{base_sport}/coaches")
            candidates.append(base_sport)
        parsed = urlparse(w)
        ath_base = f"{parsed.scheme}://{parsed.netloc}"
        for sp in SPORT_PATHS:
            candidates.append(f"{ath_base}{sp}")

    base = domain.rstrip("/")
    if base:
        # Try common athletics subdomain patterns
        prefixes = [
            f"https://{base}",
            f"https://athletics.{base}",
        ]
        # Derive likely athletics domain (e.g. baylor.edu -> baylorbears.com)
        short = base.replace(".edu", "").replace(".com", "")
        for suffix in ["athletics", "bears", "tigers", "eagles", "lions", "hawks", "wolves", "wildcats", "bulldogs", "warriors", "knights", "panthers", "cougars", "mustangs", "rams", "rebels", "falcons", "cardinals", "aggies", "gators", "terriers", "owls", "hornets"]:
            prefixes.append(f"https://{short}{suffix}.com")

        for prefix in prefixes:
            for sp in SPORT_PATHS:
                candidates.append(f"{prefix}{sp}")

    # Deduplicate while preserving order
    seen = set()
    unique = []
    for c in candidates:
        if c not in seen:
            seen.add(c)
            unique.append(c)
    return unique


def name_from_email(email):
    """Derive a likely name from an email address like firstname.lastname@school.edu."""
    local = email.split("@")[0]
    local = re.sub(r'\d+$', '', local)
    parts = re.split(r'[._\-]', local)
    parts = [p.capitalize() for p in parts if len(p) > 1]
    return " ".join(parts[:3]) if parts else ""


def is_valid_name(name):
    """Check if a name is real (not a JS-rendered placeholder or label)."""
    if not name:
        return False
    n = name.strip().lower()
    if n in PLACEHOLDER_NAMES:
        return False
    if len(n) < 3:
        return False
    # Reject labels/categories
    bad_words = ["volleyball", "sport", "staff", "directory", "contact", "email", "team",
                 "roster", "schedule", "ticket", "news", "media", "men's", "women's", "athletic"]
    if any(w in n for w in bad_words):
        return False
    # Reject names with years in them
    if re.search(r'20\d{2}', n):
        return False
    return True


def is_valid_title(title):
    """Check if a title is a real coaching title."""
    if not title:
        return False
    t = title.strip().lower()
    if t in PLACEHOLDER_NAMES:
        return False
    # Must contain a coaching-related word
    coach_words = ["coach", "coordinator", "director", "analyst", "manager", "trainer"]
    return any(w in t for w in coach_words)


def extract_emails_from_html(html_text):
    """Extract .edu and other emails from HTML."""
    emails = set(re.findall(r'[\w.+-]+@[\w.-]+\.(?:edu|com|org|net)', html_text.lower()))
    skip_prefixes = {"info@", "admissions@", "webmaster@", "privacy@", "help@", "support@", "news@", "marketing@",
            "compliance@", "noreply@", "tickets@", "camps@", "recruiting@", "athletics@", "ticket@", "sidearm@",
            "volleyball@", "vball@", "sportsinfo@", "media@", "development@", "giving@", "alumni@"}
    skip_substrings = {"volleyball", "vball", "ticket", "camp", "recruit", "sport"}
    result = []
    for e in emails:
        if any(e.startswith(s) for s in skip_prefixes):
            continue
        local = e.split("@")[0]
        if any(s in local for s in skip_substrings):
            continue
        result.append(e)
    return result


def assign_titles(coaches):
    """Assign Head Coach / Assistant titles when titles are missing, using order heuristic."""
    for i, c in enumerate(coaches):
        if not is_valid_title(c.get("title", "")):
            c["title"] = "Head Coach" if i == 0 else "Assistant Coach"
    return coaches


def extract_coaches_structured(soup):
    """Extract structured coach data from common CMS patterns, then clean up placeholder names."""
    coaches = []

    # Pattern 1: Sidearm Sports
    for card in soup.select('.sidearm-coaches-coach'):
        name_el = card.select_one('.sidearm-coaches-coach-name a, .sidearm-coaches-coach-name')
        title_el = card.select_one('.sidearm-coaches-coach-title')
        email_el = card.select_one('a[href^="mailto:"]')
        name = name_el.get_text(strip=True) if name_el else ""
        title = title_el.get_text(strip=True) if title_el else ""
        email = email_el['href'].replace('mailto:', '').split('?')[0].strip() if email_el else ""
        if email or is_valid_name(name):
            coaches.append({"name": name, "title": title, "email": email})

    if coaches:
        return _clean_coaches(coaches)

    # Pattern 2: Generic staff cards with mailto links
    for mailto in soup.select('a[href^="mailto:"]'):
        email = mailto['href'].replace('mailto:', '').split('?')[0].strip()
        parent = mailto.find_parent(['div', 'li', 'article', 'section'])
        if parent:
            name_el = parent.select_one('h2, h3, h4, h5, .name, [class*="name"]')
            title_el = parent.select_one('.title, [class*="title"], [class*="position"], .subtitle')
            name = name_el.get_text(strip=True) if name_el else ""
            title = title_el.get_text(strip=True) if title_el else ""
            if email:
                coaches.append({"name": name, "title": title, "email": email})

    if coaches:
        return _clean_coaches(coaches)

    # Pattern 3: Staff/person/coach cards
    for card in soup.select('[class*="staff"], [class*="person"], [class*="coach"]'):
        name_el = card.select_one('h2, h3, h4, h5, [class*="name"]')
        title_el = card.select_one('[class*="title"], [class*="position"], [class*="role"]')
        email_el = card.select_one('a[href^="mailto:"]')
        name = name_el.get_text(strip=True) if name_el else ""
        title = title_el.get_text(strip=True) if title_el else ""
        email = email_el['href'].replace('mailto:', '').split('?')[0].strip() if email_el else ""
        if (email or is_valid_name(name)) and len(name) < 60:
            coaches.append({"name": name, "title": title, "email": email})

    return _clean_coaches(coaches)


def _is_generic_email(email):
    """Check if an email is a generic sports/department email, not a personal one."""
    local = email.split("@")[0].lower()
    generic_words = ["volleyball", "vball", "ticket", "camp", "recruit", "sport", "athletics",
                     "info", "admissions", "webmaster", "privacy", "help", "support", "news",
                     "marketing", "compliance", "noreply", "media", "weareuk", "goheels",
                     "gobulldogs", "gofrogs", "gotigers", "goducks", "gobears"]
    if any(w in local for w in generic_words):
        return True
    # If the local part has no separators and is > 10 chars, likely a word not a name
    if '.' not in local and '_' not in local and '-' not in local and len(local) > 10:
        return True
    return False


def _clean_coaches(coaches):
    """Post-process: replace placeholder names with email-derived names, fix titles."""
    cleaned = []
    seen_emails = set()
    for c in coaches:
        email = c.get("email", "").strip().lower()
        # Deduplicate by email
        if email and email in seen_emails:
            continue
        if email:
            seen_emails.add(email)

        # Skip generic/department emails
        if email and _is_generic_email(email):
            continue

        # Fix placeholder names
        if not is_valid_name(c.get("name", "")) and email:
            c["name"] = name_from_email(email)

        # Fix placeholder titles
        if not is_valid_title(c.get("title", "")):
            c["title"] = ""

        # Only keep entries with at least a name or email
        if c.get("name") or c.get("email"):
            cleaned.append(c)

    return assign_titles(cleaned)


async def discover_athletics_domain(http_client, domain):
    """Fetch the main university page and look for links to athletics sites."""
    try:
        resp = await http_client.get(f"https://www.{domain}", headers=HEADERS, follow_redirects=True, timeout=8)
        if resp.status_code != 200:
            resp = await http_client.get(f"https://{domain}", headers=HEADERS, follow_redirects=True, timeout=8)
        if resp.status_code != 200:
            return []

        html = resp.text
        soup = BeautifulSoup(html, "lxml")
        found = set()
        for a in soup.select('a[href]'):
            href = a.get('href', '').lower()
            text = a.get_text(strip=True).lower()
            if ('athletics' in href or 'athletics' in text or 'sports' in href) and href.startswith('http'):
                parsed = urlparse(href)
                if parsed.netloc and parsed.netloc != domain and f"www.{domain}" not in parsed.netloc:
                    found.add(f"{parsed.scheme}://{parsed.netloc}")
        return list(found)[:3]
    except Exception:
        return []


async def scrape_coaching_page(http_client, domain, website=""):
    """Try to find and scrape the volleyball coaching page for a school."""
    candidates = get_url_candidates(domain, website)

    # First pass: try all pre-built candidates
    result = await _try_candidates(http_client, candidates[:15])
    if result:
        return result

    # Second pass: discover the athletics domain and try those
    ath_domains = await discover_athletics_domain(http_client, domain)
    if ath_domains:
        extra = []
        for ath_base in ath_domains:
            for sp in SPORT_PATHS:
                extra.append(f"{ath_base}{sp}")
        result = await _try_candidates(http_client, extra)
        if result:
            return result

    return None


async def _try_candidates(http_client, urls):
    """Try a list of candidate URLs and return scraped coaches if found."""
    for url in urls:
        try:
            resp = await http_client.get(url, headers=HEADERS, follow_redirects=True, timeout=12)
            if resp.status_code != 200:
                continue

            html = resp.text
            if "volleyball" not in html.lower() and "volley" not in html.lower():
                continue

            soup = BeautifulSoup(html, "lxml")
            coaches = extract_coaches_structured(soup)

            if not coaches:
                emails = extract_emails_from_html(html)
                if emails:
                    coaches = []
                    for e in emails[:5]:
                        coaches.append({"name": name_from_email(e), "title": "", "email": e})
                    coaches = assign_titles(coaches)

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

        async with httpx.AsyncClient() as http_client:
            for uni in universities:
                domain = uni.get("domain", "")
                name = uni.get("university_name", "")
                if not domain:
                    scrape_status["failed"] += 1
                    continue

                try:
                    result = await scrape_coaching_page(http_client, domain, uni.get("website", ""))
                    if result and result["coaches"]:
                        update = _build_update(result)
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


def _build_update(result):
    """Build the DB update dict from scraped coach data."""
    coaches = result["coaches"]
    update = {"coaches_scraped": coaches, "coaches_source_url": result["url"]}

    head = None
    assistant = None
    for c in coaches:
        if "head" in c.get("title", "").lower():
            head = c
        elif not assistant and c.get("email"):
            assistant = c
    if not head and coaches:
        head = coaches[0]
    if not assistant and len(coaches) > 1:
        assistant = coaches[1]

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

    return update


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

    async with httpx.AsyncClient() as http_client:
        result = await scrape_coaching_page(http_client, domain, uni.get("website", ""))

    if not result or not result["coaches"]:
        return {"found": False, "message": f"Could not find coaching data for {name}"}

    update = _build_update(result)
    await db.university_knowledge_base.update_one(
        {"university_name": name}, {"$set": update}
    )

    return {"found": True, "url": result["url"], "coaches": result["coaches"]}
