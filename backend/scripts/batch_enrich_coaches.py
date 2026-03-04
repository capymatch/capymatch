"""
Phase 1: Scrape coaching staff names from Productive Recruit for remaining schools.
Phase 2: Match PR names with verified emails from coaches_scraped.
Phase 3: Scrape athletics sites for coaches missing emails.

Run:
  cd /app/backend && nohup python3 scripts/batch_enrich_coaches.py > /tmp/coach_enrich.log 2>&1 &
  tail -f /tmp/coach_enrich.log
  cat /tmp/coach_enrich_progress.json
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
from difflib import SequenceMatcher

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

PROGRESS_FILE = "/tmp/coach_enrich_progress.json"
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


def save_progress(stats):
    with open(PROGRESS_FILE, "w") as f:
        json.dump(stats, f, indent=2)


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


def name_similarity(name1, name2):
    """Fuzzy name matching. Returns 0-1 score."""
    if not name1 or not name2:
        return 0
    n1 = name1.lower().strip()
    n2 = name2.lower().strip()
    if n1 == n2:
        return 1.0
    # Check if last names match
    parts1 = n1.split()
    parts2 = n2.split()
    if parts1 and parts2:
        # Last name match
        if parts1[-1] == parts2[-1]:
            return 0.85
        # First name match
        if parts1[0] == parts2[0]:
            return 0.7
    return SequenceMatcher(None, n1, n2).ratio()


def name_matches_email(name, email):
    """Check if a name plausibly matches an email address."""
    if not name or not email:
        return False
    local = email.split("@")[0].lower()
    parts = name.lower().split()
    if not parts:
        return False
    # Check various patterns: first.last, flast, firstlast, last.first
    first = parts[0]
    last = parts[-1] if len(parts) > 1 else ""
    if last and f"{first}.{last}" in local:
        return True
    if last and f"{first[0]}{last}" in local:
        return True
    if last and f"{first}{last}" in local:
        return True
    if last and f"{last}.{first}" in local:
        return True
    if last and last in local and first[0] in local:
        return True
    # Check if the full last name appears
    if last and last in local:
        return True
    return False


def match_pr_coaches_to_emails(pr_coaches, scraped_coaches, school_domain):
    """Match PR coach names with verified emails from scraped data.
    Returns merged coaching_staff list."""
    result = []
    used_emails = set()

    for pr in pr_coaches:
        pr_name = pr.get("name", "")
        pr_role = pr.get("role", "")
        matched_email = ""

        if not pr_name or pr_name.lower() in ("coach", "staff", "tba"):
            continue

        # Try to match with scraped coaches
        best_match = None
        best_score = 0

        for sc in scraped_coaches:
            sc_email = sc.get("email", "").strip()
            sc_name = sc.get("name", "").strip()

            if not sc_email or sc_email in used_emails:
                continue

            # Check email domain matches school
            email_domain = sc_email.split("@")[-1].lower() if "@" in sc_email else ""
            if school_domain and email_domain and school_domain.lower() not in email_domain:
                # Email domain doesn't match school - likely wrong sport/school data
                continue

            # Method 1: Direct name match
            score = name_similarity(pr_name, sc_name)
            if score > best_score:
                best_score = score
                best_match = sc

            # Method 2: Name matches email pattern
            if name_matches_email(pr_name, sc_email):
                if score < 0.8:
                    score = 0.8
                if score > best_score:
                    best_score = score
                    best_match = sc

        if best_match and best_score >= 0.6:
            matched_email = best_match.get("email", "")
            used_emails.add(matched_email)

        # Fallback: use email_likely from PR data
        if not matched_email and pr.get("email_likely"):
            matched_email = pr["email_likely"]

        result.append({
            "name": pr_name,
            "role": pr_role,
            "email": matched_email,
            "email_verified": bool(best_match and best_score >= 0.6),
        })

    return result


async def phase1_scrape_remaining_pr(db, browser):
    """Scrape PR for schools missing coaching_staff_pr."""
    schools = await db.university_knowledge_base.find(
        {
            "pr_slug": {"$exists": True, "$nin": ["", "---", None]},
            "$or": [
                {"coaching_staff_pr": {"$exists": False}},
                {"coaching_staff_pr": []},
            ]
        },
        {"_id": 1, "university_name": 1, "pr_slug": 1, "pr_state": 1}
    ).to_list(2000)

    log.info(f"Phase 1: {len(schools)} schools need PR scraping")
    stats = {"phase1_total": len(schools), "phase1_ok": 0, "phase1_miss": 0, "phase1_err": 0}

    for i, school in enumerate(schools):
        name = school["university_name"]
        slug = school.get("pr_slug", "")
        state_raw = school.get("pr_state", "")

        if not slug or slug == "---":
            stats["phase1_miss"] += 1
            continue

        if len(state_raw) == 2:
            state = STATE_MAP.get(state_raw.upper())
            if not state:
                stats["phase1_miss"] += 1
                continue
        else:
            state = state_raw.lower().replace(" ", "-")

        url = f"{BASE}/{state}/{slug}"
        ctx = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
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
                # Generate email patterns for each coach
                domain = (await db.university_knowledge_base.find_one({"_id": school["_id"]}, {"domain": 1})).get("domain", "")
                for c in coaches:
                    c_name = c["name"]
                    parts = c_name.lower().split()
                    if len(parts) >= 2 and domain:
                        first, last = parts[0], parts[-1]
                        c["email_likely"] = f"{first}.{last}@{domain}"
                        c["email_patterns"] = [
                            f"{first}.{last}@{domain}",
                            f"{first[0]}{last}@{domain}",
                            f"{first}{last}@{domain}",
                            f"{last}.{first}@{domain}",
                        ]
                    else:
                        c["email_likely"] = None
                        c["email_patterns"] = []

                await db.university_knowledge_base.update_one(
                    {"_id": school["_id"]},
                    {"$set": {
                        "coaching_staff_pr": coaches,
                        "pr_coaches_scraped_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                stats["phase1_ok"] += 1
                log.info(f"  P1 OK [{i+1}/{len(schools)}] {name}: {len(coaches)} coaches")
            else:
                stats["phase1_miss"] += 1
                log.info(f"  P1 MISS [{i+1}/{len(schools)}] {name}")
        except Exception as e:
            stats["phase1_err"] += 1
            log.warning(f"  P1 ERR [{i+1}/{len(schools)}] {name}: {str(e)[:80]}")
        finally:
            await ctx.close()

        await asyncio.sleep(1)

    return stats


async def phase2_match_emails(db):
    """Match PR coach names to verified emails from athletics sites."""
    schools = await db.university_knowledge_base.find(
        {"coaching_staff_pr": {"$exists": True, "$ne": []}},
        {"_id": 1, "university_name": 1, "coaching_staff_pr": 1, "coaches_scraped": 1, "domain": 1}
    ).to_list(2000)

    log.info(f"Phase 2: Matching emails for {len(schools)} schools")
    stats = {"phase2_total": len(schools), "phase2_matched": 0, "phase2_partial": 0, "phase2_no_match": 0}
    total_coaches = 0
    verified_emails = 0
    likely_emails = 0
    no_emails = 0

    for school in schools:
        pr_coaches = school.get("coaching_staff_pr", [])
        scraped = school.get("coaches_scraped", [])
        domain = school.get("domain", "")

        merged = match_pr_coaches_to_emails(pr_coaches, scraped, domain)

        if not merged:
            stats["phase2_no_match"] += 1
            continue

        has_verified = sum(1 for c in merged if c.get("email_verified"))
        has_email = sum(1 for c in merged if c.get("email"))

        total_coaches += len(merged)
        verified_emails += has_verified
        likely_emails += has_email - has_verified
        no_emails += len(merged) - has_email

        # Update primary_coach and coach_email from the head coach
        update = {"coaching_staff": merged}
        head = next((c for c in merged if "head" in c.get("role", "").lower()), merged[0] if merged else None)
        if head:
            update["primary_coach"] = head["name"]
            if head.get("email"):
                update["coach_email"] = head["email"]

        await db.university_knowledge_base.update_one(
            {"_id": school["_id"]},
            {"$set": update}
        )

        if has_verified == len(merged):
            stats["phase2_matched"] += 1
        elif has_verified > 0:
            stats["phase2_partial"] += 1
        else:
            stats["phase2_no_match"] += 1

    log.info(f"  Phase 2 Results:")
    log.info(f"    Total coaches processed: {total_coaches}")
    log.info(f"    Verified emails: {verified_emails}")
    log.info(f"    Likely/generated emails: {likely_emails}")
    log.info(f"    No email at all: {no_emails}")
    stats["total_coaches"] = total_coaches
    stats["verified_emails"] = verified_emails
    stats["likely_emails"] = likely_emails
    stats["no_emails"] = no_emails
    return stats


async def phase3_scrape_missing_emails(db, browser):
    """Scrape athletics sites for schools with coaches but no verified emails."""
    # Find schools that have coaching_staff but head coach has unverified email
    schools = await db.university_knowledge_base.find(
        {
            "coaching_staff": {"$exists": True, "$ne": []},
            "coaching_staff.email_verified": False,
            "domain": {"$exists": True, "$ne": ""},
        },
        {"_id": 1, "university_name": 1, "domain": 1, "website": 1, "coaching_staff": 1}
    ).to_list(2000)

    # Filter to only schools where the head coach doesn't have a verified email
    needs_scrape = []
    for s in schools:
        staff = s.get("coaching_staff", [])
        head = next((c for c in staff if "head" in c.get("role", "").lower()), staff[0] if staff else None)
        if head and not head.get("email_verified"):
            needs_scrape.append(s)

    log.info(f"Phase 3: Scraping athletics sites for {len(needs_scrape)} schools")
    stats = {"phase3_total": len(needs_scrape), "phase3_found": 0, "phase3_miss": 0, "phase3_err": 0}

    SPORT_PATHS = [
        "/sports/womens-volleyball/coaches",
        "/sports/womens-volleyball/coaching-staff",
        "/sports/womens-volleyball/staff",
        "/sports/volleyball/coaches",
        "/sports/volleyball/coaching-staff",
        "/sports/wvball/coaches",
        "/sports/w-volley/coaches",
        "/sports/wvb/coaches",
    ]

    for i, school in enumerate(needs_scrape):
        name = school["university_name"]
        domain = school.get("domain", "")
        website = school.get("website", "")
        staff = school.get("coaching_staff", [])

        ctx = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            viewport={"width": 1920, "height": 1080}
        )
        page = await ctx.new_page()

        found_emails = {}
        try:
            # Build candidate URLs
            candidates = []
            if website:
                w = website.rstrip("/")
                if not w.startswith("http"):
                    w = f"https://{w}"
                base_sport = re.sub(r'/roster.*|/schedule.*', '', w)
                candidates.append(f"{base_sport}/coaches")
                candidates.append(f"{base_sport}/coaching-staff")

            for prefix in [f"https://{domain}", f"https://athletics.{domain}"]:
                for sp in SPORT_PATHS:
                    candidates.append(f"{prefix}{sp}")

            # Try each candidate URL
            for url in candidates[:8]:
                try:
                    resp = await page.goto(url, wait_until="domcontentloaded", timeout=12000)
                    if not resp or resp.status >= 400:
                        continue

                    html = await page.content()
                    if "volleyball" not in html.lower():
                        continue

                    # Extract mailto emails
                    mailto_emails = re.findall(r'mailto:([\w.+-]+@[\w.-]+\.(?:edu|com|org))', html.lower())
                    # Also extract emails from text
                    text_emails = re.findall(r'[\w.+-]+@[\w.-]+\.(?:edu|com|org)', html.lower())
                    all_emails = list(set(mailto_emails + text_emails))

                    # Filter to school domain emails
                    school_emails = [e for e in all_emails if domain.lower().split(".")[0] in e.split("@")[-1].lower()]

                    # Skip generic emails
                    skip_prefixes = {"info@", "admissions@", "webmaster@", "privacy@", "help@", "support@",
                                     "news@", "marketing@", "compliance@", "noreply@", "tickets@", "camps@",
                                     "recruiting@", "athletics@", "volleyball@", "vball@", "sportsinfo@"}
                    school_emails = [e for e in school_emails if not any(e.startswith(s) for s in skip_prefixes)]

                    if school_emails:
                        # Match emails to coach names
                        for coach in staff:
                            if coach.get("email_verified"):
                                continue
                            for email in school_emails:
                                if name_matches_email(coach["name"], email):
                                    found_emails[coach["name"]] = email
                                    break

                    if found_emails:
                        break  # Found what we need

                except Exception:
                    continue

            if found_emails:
                # Update the coaching_staff with verified emails
                updated_staff = []
                for coach in staff:
                    if coach["name"] in found_emails:
                        coach["email"] = found_emails[coach["name"]]
                        coach["email_verified"] = True
                    updated_staff.append(coach)

                update = {"coaching_staff": updated_staff}
                head = next((c for c in updated_staff if "head" in c.get("role", "").lower()), updated_staff[0])
                if head.get("email"):
                    update["coach_email"] = head["email"]
                    update["primary_coach"] = head["name"]

                await db.university_knowledge_base.update_one(
                    {"_id": school["_id"]},
                    {"$set": update}
                )
                stats["phase3_found"] += 1
                log.info(f"  P3 FOUND [{i+1}/{len(needs_scrape)}] {name}: {len(found_emails)} emails")
            else:
                stats["phase3_miss"] += 1
                if (i + 1) % 50 == 0:
                    log.info(f"  P3 progress [{i+1}/{len(needs_scrape)}]")

        except Exception as e:
            stats["phase3_err"] += 1
            log.warning(f"  P3 ERR [{i+1}/{len(needs_scrape)}] {name}: {str(e)[:80]}")
        finally:
            await ctx.close()

        await asyncio.sleep(0.5)

    return stats


async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ.get("DB_NAME", "capymatch")]

    total = await db.university_knowledge_base.count_documents({})
    log.info(f"Starting coach enrichment. Total schools: {total}")

    all_stats = {"started_at": datetime.now(timezone.utc).isoformat()}
    save_progress(all_stats)

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox"]
        )

        # Phase 1: Scrape remaining PR data
        log.info("=" * 60)
        log.info("PHASE 1: Scraping remaining schools from Productive Recruit")
        log.info("=" * 60)
        p1_stats = await phase1_scrape_remaining_pr(db, browser)
        all_stats.update(p1_stats)
        save_progress(all_stats)

        # Phase 2: Match PR names to emails
        log.info("=" * 60)
        log.info("PHASE 2: Matching PR names to verified emails")
        log.info("=" * 60)
        p2_stats = await phase2_match_emails(db)
        all_stats.update(p2_stats)
        save_progress(all_stats)

        # Phase 3: Scrape athletics sites for missing emails
        log.info("=" * 60)
        log.info("PHASE 3: Scraping athletics sites for missing emails")
        log.info("=" * 60)
        p3_stats = await phase3_scrape_missing_emails(db, browser)
        all_stats.update(p3_stats)

        await browser.close()

    # Final coverage report
    log.info("=" * 60)
    log.info("FINAL COVERAGE REPORT")
    log.info("=" * 60)

    has_coaching_staff = await db.university_knowledge_base.count_documents({"coaching_staff": {"$exists": True, "$ne": []}})
    has_verified = await db.university_knowledge_base.count_documents({"coaching_staff.email_verified": True})
    has_email = await db.university_knowledge_base.count_documents({"coach_email": {"$exists": True, "$ne": ""}})
    has_primary = await db.university_knowledge_base.count_documents({"primary_coach": {"$exists": True, "$ne": ""}})

    log.info(f"  Schools with coaching_staff: {has_coaching_staff}/{total}")
    log.info(f"  Schools with verified emails: {has_verified}/{total}")
    log.info(f"  Schools with coach_email: {has_email}/{total}")
    log.info(f"  Schools with primary_coach: {has_primary}/{total}")

    all_stats["finished_at"] = datetime.now(timezone.utc).isoformat()
    all_stats["final_coverage"] = {
        "total_schools": total,
        "has_coaching_staff": has_coaching_staff,
        "has_verified_emails": has_verified,
        "has_coach_email": has_email,
        "has_primary_coach": has_primary,
    }
    save_progress(all_stats)
    log.info(f"All done! Stats saved to {PROGRESS_FILE}")


if __name__ == "__main__":
    asyncio.run(main())
