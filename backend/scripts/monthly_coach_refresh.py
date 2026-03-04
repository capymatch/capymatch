"""
Monthly Coach Data Refresh & Change Detection

Re-runs all 3 phases of coach enrichment, detects changes, and sends
a detailed email report to the admin.

Run manually:
  cd /app/backend && nohup python3 scripts/monthly_coach_refresh.py > /tmp/monthly_refresh.log 2>&1 &
  tail -f /tmp/monthly_refresh.log

Cron (1st of every month at 3 AM UTC):
  0 3 1 * * cd /app/backend && python3 scripts/monthly_coach_refresh.py >> /tmp/monthly_refresh.log 2>&1
"""
import asyncio
import re
import os
import json
import logging
import copy
from dotenv import load_dotenv
load_dotenv()
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from playwright.async_api import async_playwright
from difflib import SequenceMatcher

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

ADMIN_EMAIL = "douglas@capymatch.com"
PROGRESS_FILE = "/tmp/monthly_refresh_progress.json"
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


def save_progress(stats):
    with open(PROGRESS_FILE, "w") as f:
        json.dump(stats, f, indent=2)


# ─── Parsing helpers (reused from batch_enrich_coaches.py) ───

def parse_coaches_from_pr(html):
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
    if not name1 or not name2:
        return 0
    n1 = name1.lower().strip()
    n2 = name2.lower().strip()
    if n1 == n2:
        return 1.0
    parts1 = n1.split()
    parts2 = n2.split()
    if parts1 and parts2:
        if parts1[-1] == parts2[-1]:
            return 0.85
        if parts1[0] == parts2[0]:
            return 0.7
    return SequenceMatcher(None, n1, n2).ratio()


def name_matches_email(name, email):
    if not name or not email:
        return False
    local = email.split("@")[0].lower()
    parts = name.lower().split()
    if not parts:
        return False
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
    if last and last in local:
        return True
    return False


def match_pr_coaches_to_emails(pr_coaches, scraped_coaches, school_domain):
    result = []
    used_emails = set()
    for pr in pr_coaches:
        pr_name = pr.get("name", "")
        pr_role = pr.get("role", "")
        matched_email = ""
        if not pr_name or pr_name.lower() in ("coach", "staff", "tba"):
            continue
        best_match = None
        best_score = 0
        for sc in scraped_coaches:
            sc_email = sc.get("email", "").strip()
            sc_name = sc.get("name", "").strip()
            if not sc_email or sc_email in used_emails:
                continue
            email_domain = sc_email.split("@")[-1].lower() if "@" in sc_email else ""
            if school_domain and email_domain and school_domain.lower() not in email_domain:
                continue
            score = name_similarity(pr_name, sc_name)
            if score > best_score:
                best_score = score
                best_match = sc
            if name_matches_email(pr_name, sc_email):
                if score < 0.8:
                    score = 0.8
                if score > best_score:
                    best_score = score
                    best_match = sc
        if best_match and best_score >= 0.6:
            matched_email = best_match.get("email", "")
            used_emails.add(matched_email)
        if not matched_email and pr.get("email_likely"):
            matched_email = pr["email_likely"]
        result.append({
            "name": pr_name,
            "role": pr_role,
            "email": matched_email,
            "email_verified": bool(best_match and best_score >= 0.6),
        })
    return result


# ─── Snapshot & Diff ───

async def take_snapshot(db):
    """Take a snapshot of all coaching data before refresh."""
    snapshot = {}
    async for doc in db.university_knowledge_base.find(
        {},
        {"_id": 0, "university_name": 1, "division": 1, "domain": 1,
         "coaching_staff": 1, "coaching_staff_pr": 1, "primary_coach": 1, "coach_email": 1}
    ):
        name = doc.get("university_name", "")
        if name:
            snapshot[name] = doc
    return snapshot


def compute_changes(before_snapshot, after_snapshot):
    """Compare before and after snapshots to detect all changes."""
    changes = {
        "head_coach_changes": [],
        "new_coaches_added": [],
        "coaches_removed": [],
        "new_emails_found": [],
        "emails_changed": [],
        "new_schools_with_data": [],
    }

    all_schools = set(list(before_snapshot.keys()) + list(after_snapshot.keys()))

    for school in sorted(all_schools):
        before = before_snapshot.get(school, {})
        after = after_snapshot.get(school, {})
        division = after.get("division", before.get("division", ""))

        old_staff = {c["name"]: c for c in before.get("coaching_staff", []) if c.get("name")}
        new_staff = {c["name"]: c for c in after.get("coaching_staff", []) if c.get("name")}

        # School gained data for the first time
        if not old_staff and new_staff:
            changes["new_schools_with_data"].append({
                "school": school, "division": division,
                "coaches": [c["name"] for c in after.get("coaching_staff", [])],
            })
            continue

        # Head coach change
        old_head = before.get("primary_coach", "")
        new_head = after.get("primary_coach", "")
        if old_head and new_head and old_head != new_head:
            changes["head_coach_changes"].append({
                "school": school, "division": division,
                "old_coach": old_head, "new_coach": new_head,
                "new_email": after.get("coach_email", ""),
            })

        # New coaches added
        for name in new_staff:
            if name not in old_staff:
                c = new_staff[name]
                changes["new_coaches_added"].append({
                    "school": school, "division": division,
                    "name": name, "role": c.get("role", ""), "email": c.get("email", ""),
                })

        # Coaches removed
        for name in old_staff:
            if name not in new_staff:
                c = old_staff[name]
                changes["coaches_removed"].append({
                    "school": school, "division": division,
                    "name": name, "role": c.get("role", ""),
                })

        # Email changes
        for name in new_staff:
            if name in old_staff:
                old_email = old_staff[name].get("email", "")
                new_email = new_staff[name].get("email", "")
                old_verified = old_staff[name].get("email_verified", False)
                new_verified = new_staff[name].get("email_verified", False)

                if not old_email and new_email:
                    changes["new_emails_found"].append({
                        "school": school, "division": division,
                        "name": name, "email": new_email,
                        "verified": new_verified,
                    })
                elif old_email and new_email and old_email != new_email:
                    changes["emails_changed"].append({
                        "school": school, "division": division,
                        "name": name, "old_email": old_email, "new_email": new_email,
                        "verified": new_verified,
                    })
                elif not old_verified and new_verified:
                    changes["new_emails_found"].append({
                        "school": school, "division": division,
                        "name": name, "email": new_email,
                        "verified": True, "note": "Newly verified",
                    })

    return changes


# ─── Email Report ───

def build_report_html(changes, stats, duration_min):
    """Build a detailed HTML email report."""
    now = datetime.now(timezone.utc).strftime("%B %d, %Y")
    total_changes = (
        len(changes["head_coach_changes"]) +
        len(changes["new_coaches_added"]) +
        len(changes["coaches_removed"]) +
        len(changes["new_emails_found"]) +
        len(changes["emails_changed"]) +
        len(changes["new_schools_with_data"])
    )

    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 700px; margin: 0 auto; padding: 40px 20px; color: #1a1a2e;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="width: 56px; height: 56px; border-radius: 16px; background: linear-gradient(135deg, #1a8a80, #0d6b63); display: inline-flex; align-items: center; justify-content: center;">
          <span style="color: white; font-size: 24px; font-weight: bold;">C</span>
        </div>
      </div>
      <h1 style="font-size: 22px; font-weight: 700; text-align: center; margin-bottom: 4px;">Monthly Coach Data Refresh</h1>
      <p style="font-size: 14px; color: #64748b; text-align: center; margin-bottom: 32px;">{now} &middot; Completed in {duration_min:.0f} minutes</p>

      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin-bottom: 24px; text-align: center;">
        <div style="font-size: 36px; font-weight: 800; color: #16a34a;">{total_changes}</div>
        <div style="font-size: 13px; color: #64748b; font-weight: 600;">Total Changes Detected</div>
      </div>

      <div style="display: flex; gap: 12px; margin-bottom: 28px; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 100px; background: #f8fafc; border-radius: 10px; padding: 14px; text-align: center;">
          <div style="font-size: 20px; font-weight: 700; color: #1a8a80;">{stats.get('final_coverage', {}).get('has_coaching_staff', 0)}</div>
          <div style="font-size: 11px; color: #94a3b8;">Schools w/ Staff</div>
        </div>
        <div style="flex: 1; min-width: 100px; background: #f8fafc; border-radius: 10px; padding: 14px; text-align: center;">
          <div style="font-size: 20px; font-weight: 700; color: #1a8a80;">{stats.get('final_coverage', {}).get('has_verified_emails', 0)}</div>
          <div style="font-size: 11px; color: #94a3b8;">Verified Emails</div>
        </div>
        <div style="flex: 1; min-width: 100px; background: #f8fafc; border-radius: 10px; padding: 14px; text-align: center;">
          <div style="font-size: 20px; font-weight: 700; color: #1a8a80;">{stats.get('final_coverage', {}).get('has_coach_email', 0)}</div>
          <div style="font-size: 11px; color: #94a3b8;">Total w/ Email</div>
        </div>
      </div>
    """

    # Section builder
    def section(title, emoji, items, color):
        if not items:
            return ""
        s = f"""
        <div style="margin-bottom: 28px;">
          <h2 style="font-size: 15px; font-weight: 700; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid {color};">
            {emoji} {title} ({len(items)})
          </h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        """
        return s

    # Head Coach Changes
    if changes["head_coach_changes"]:
        html += section("Head Coach Changes", "🔄", changes["head_coach_changes"], "#ef4444")
        for c in changes["head_coach_changes"]:
            html += f"""
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 4px; font-weight: 600;">{c['school']}</td>
              <td style="padding: 8px 4px; color: #94a3b8;"><span style="background: #fef2f2; color: #ef4444; padding: 2px 6px; border-radius: 4px; font-size: 11px;">{c['division']}</span></td>
              <td style="padding: 8px 4px;"><span style="color: #ef4444; text-decoration: line-through;">{c['old_coach']}</span> &rarr; <span style="color: #16a34a; font-weight: 600;">{c['new_coach']}</span></td>
              <td style="padding: 8px 4px; color: #1a8a80; font-size: 12px;">{c.get('new_email', '')}</td>
            </tr>"""
        html += "</table></div>"

    # New Coaches Added
    if changes["new_coaches_added"]:
        html += section("New Coaches Added", "➕", changes["new_coaches_added"], "#16a34a")
        for c in changes["new_coaches_added"]:
            html += f"""
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 4px; font-weight: 600;">{c['school']}</td>
              <td style="padding: 8px 4px;"><span style="background: #f0fdf4; color: #16a34a; padding: 2px 6px; border-radius: 4px; font-size: 11px;">{c['division']}</span></td>
              <td style="padding: 8px 4px;">{c['name']} <span style="color: #94a3b8;">({c['role']})</span></td>
              <td style="padding: 8px 4px; color: #1a8a80; font-size: 12px;">{c.get('email', '')}</td>
            </tr>"""
        html += "</table></div>"

    # Coaches Removed
    if changes["coaches_removed"]:
        html += section("Coaches Removed", "➖", changes["coaches_removed"], "#f97316")
        for c in changes["coaches_removed"]:
            html += f"""
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 4px; font-weight: 600;">{c['school']}</td>
              <td style="padding: 8px 4px;"><span style="background: #fff7ed; color: #f97316; padding: 2px 6px; border-radius: 4px; font-size: 11px;">{c['division']}</span></td>
              <td style="padding: 8px 4px; color: #94a3b8;">{c['name']} ({c['role']})</td>
            </tr>"""
        html += "</table></div>"

    # New Emails Found
    if changes["new_emails_found"]:
        html += section("New Emails Found / Verified", "📧", changes["new_emails_found"], "#1a8a80")
        for c in changes["new_emails_found"]:
            badge = '<span style="background: #d1fae5; color: #059669; padding: 1px 5px; border-radius: 3px; font-size: 10px; margin-left: 4px;">VERIFIED</span>' if c.get("verified") else ""
            html += f"""
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 4px; font-weight: 600;">{c['school']}</td>
              <td style="padding: 8px 4px;"><span style="font-size: 11px; color: #94a3b8;">{c['division']}</span></td>
              <td style="padding: 8px 4px;">{c['name']}</td>
              <td style="padding: 8px 4px; color: #1a8a80; font-size: 12px;">{c['email']}{badge}</td>
            </tr>"""
        html += "</table></div>"

    # Emails Changed
    if changes["emails_changed"]:
        html += section("Emails Changed", "✏️", changes["emails_changed"], "#8b5cf6")
        for c in changes["emails_changed"]:
            html += f"""
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 4px; font-weight: 600;">{c['school']}</td>
              <td style="padding: 8px 4px;"><span style="font-size: 11px; color: #94a3b8;">{c['division']}</span></td>
              <td style="padding: 8px 4px;">{c['name']}</td>
              <td style="padding: 8px 4px; font-size: 12px;"><span style="color: #94a3b8; text-decoration: line-through;">{c['old_email']}</span> &rarr; <span style="color: #1a8a80;">{c['new_email']}</span></td>
            </tr>"""
        html += "</table></div>"

    # New Schools With Data
    if changes["new_schools_with_data"]:
        html += section("New Schools With Coach Data", "🏫", changes["new_schools_with_data"], "#0284c7")
        for c in changes["new_schools_with_data"]:
            coaches_str = ", ".join(c["coaches"][:3])
            if len(c["coaches"]) > 3:
                coaches_str += f" +{len(c['coaches'])-3} more"
            html += f"""
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 4px; font-weight: 600;">{c['school']}</td>
              <td style="padding: 8px 4px;"><span style="font-size: 11px; color: #94a3b8;">{c['division']}</span></td>
              <td style="padding: 8px 4px; color: #64748b;">{coaches_str}</td>
            </tr>"""
        html += "</table></div>"

    if total_changes == 0:
        html += """
        <div style="text-align: center; padding: 32px; color: #94a3b8;">
          <p style="font-size: 15px;">No changes detected this month. All coaching data is up to date.</p>
        </div>
        """

    html += """
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center;">
        <p style="font-size: 11px; color: #94a3b8;">This is an automated monthly report from CapyMatch.</p>
      </div>
    </div>
    """
    return html


async def send_report_email(html, total_changes):
    """Send the report email via Resend."""
    import resend
    resend.api_key = os.environ.get("RESEND_API_KEY", "")
    sender = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")

    if not resend.api_key:
        log.warning("RESEND_API_KEY not set, skipping email")
        return

    now = datetime.now(timezone.utc).strftime("%b %Y")
    subject = f"CapyMatch Coach Data Refresh — {now} ({total_changes} changes)"

    try:
        result = resend.Emails.send({
            "from": f"CapyMatch <{sender}>",
            "to": [ADMIN_EMAIL],
            "subject": subject,
            "html": html,
        })
        log.info(f"Report email sent to {ADMIN_EMAIL}: {result.get('id', 'ok')}")
    except Exception as e:
        log.error(f"Failed to send report email: {e}")


# ─── Phase 1: Re-scrape ALL schools from PR ───

async def phase1_refresh_pr(db, browser):
    """Re-scrape PR for ALL schools with pr_slug (full refresh)."""
    schools = await db.university_knowledge_base.find(
        {"pr_slug": {"$exists": True, "$nin": ["", "---", None]}},
        {"_id": 1, "university_name": 1, "pr_slug": 1, "pr_state": 1, "domain": 1}
    ).to_list(2000)

    log.info(f"Phase 1: Re-scraping {len(schools)} schools from PR")
    stats = {"phase1_total": len(schools), "phase1_ok": 0, "phase1_miss": 0, "phase1_err": 0}

    for i, school in enumerate(schools):
        name = school["university_name"]
        slug = school.get("pr_slug", "")
        state_raw = school.get("pr_state", "")
        domain = school.get("domain", "")

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
                for c in coaches:
                    parts = c["name"].lower().split()
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
            else:
                stats["phase1_miss"] += 1
        except Exception as e:
            stats["phase1_err"] += 1
            if stats["phase1_err"] <= 10:
                log.warning(f"  P1 ERR {name}: {str(e)[:80]}")
        finally:
            await ctx.close()

        if (i + 1) % 50 == 0:
            log.info(f"  P1 progress [{i+1}/{len(schools)}] OK={stats['phase1_ok']} Miss={stats['phase1_miss']}")
            save_progress({"phase": "1", **stats})

        await asyncio.sleep(1)

    log.info(f"Phase 1 done: {stats}")
    return stats


# ─── Phase 2: Match PR names to emails ───

async def phase2_match_emails(db):
    """Match PR coach names to verified emails."""
    schools = await db.university_knowledge_base.find(
        {"coaching_staff_pr": {"$exists": True, "$ne": []}},
        {"_id": 1, "university_name": 1, "coaching_staff_pr": 1, "coaches_scraped": 1, "domain": 1}
    ).to_list(2000)

    log.info(f"Phase 2: Matching emails for {len(schools)} schools")
    stats = {"phase2_total": len(schools), "phase2_matched": 0, "phase2_partial": 0, "phase2_no_match": 0}
    verified_count = 0
    likely_count = 0

    for school in schools:
        pr_coaches = school.get("coaching_staff_pr", [])
        scraped = school.get("coaches_scraped", [])
        domain = school.get("domain", "")
        merged = match_pr_coaches_to_emails(pr_coaches, scraped, domain)

        if not merged:
            stats["phase2_no_match"] += 1
            continue

        has_verified = sum(1 for c in merged if c.get("email_verified"))
        verified_count += has_verified
        likely_count += len(merged) - has_verified

        update = {"coaching_staff": merged}
        head = next((c for c in merged if "head" in c.get("role", "").lower()), merged[0] if merged else None)
        if head:
            update["primary_coach"] = head["name"]
            if head.get("email"):
                update["coach_email"] = head["email"]

        await db.university_knowledge_base.update_one({"_id": school["_id"]}, {"$set": update})

        if has_verified == len(merged):
            stats["phase2_matched"] += 1
        elif has_verified > 0:
            stats["phase2_partial"] += 1
        else:
            stats["phase2_no_match"] += 1

    stats["verified_emails"] = verified_count
    stats["likely_emails"] = likely_count
    log.info(f"Phase 2 done: verified={verified_count}, likely={likely_count}")
    return stats


# ─── Phase 3: Scrape athletics sites for missing emails ───

async def phase3_scrape_missing_emails(db, browser):
    """Scrape athletics sites for coaches without verified emails."""
    schools = await db.university_knowledge_base.find(
        {
            "coaching_staff": {"$exists": True, "$ne": []},
            "coaching_staff.email_verified": False,
            "domain": {"$exists": True, "$ne": ""},
        },
        {"_id": 1, "university_name": 1, "domain": 1, "website": 1, "coaching_staff": 1}
    ).to_list(2000)

    needs_scrape = []
    for s in schools:
        staff = s.get("coaching_staff", [])
        head = next((c for c in staff if "head" in c.get("role", "").lower()), staff[0] if staff else None)
        if head and not head.get("email_verified"):
            needs_scrape.append(s)

    log.info(f"Phase 3: Scraping {len(needs_scrape)} athletics sites")
    stats = {"phase3_total": len(needs_scrape), "phase3_found": 0, "phase3_miss": 0, "phase3_err": 0}

    for i, school in enumerate(needs_scrape):
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

            for url in candidates[:8]:
                try:
                    resp = await page.goto(url, wait_until="domcontentloaded", timeout=12000)
                    if not resp or resp.status >= 400:
                        continue
                    html = await page.content()
                    if "volleyball" not in html.lower():
                        continue
                    mailto_emails = re.findall(r'mailto:([\w.+-]+@[\w.-]+\.(?:edu|com|org))', html.lower())
                    text_emails = re.findall(r'[\w.+-]+@[\w.-]+\.(?:edu|com|org)', html.lower())
                    all_emails = list(set(mailto_emails + text_emails))
                    school_emails = [e for e in all_emails if domain.lower().split(".")[0] in e.split("@")[-1].lower()]
                    skip_prefixes = {"info@", "admissions@", "webmaster@", "privacy@", "help@", "support@",
                                     "news@", "marketing@", "compliance@", "noreply@", "tickets@", "camps@",
                                     "recruiting@", "athletics@", "volleyball@", "vball@", "sportsinfo@"}
                    school_emails = [e for e in school_emails if not any(e.startswith(s) for s in skip_prefixes)]
                    if school_emails:
                        for coach in staff:
                            if coach.get("email_verified"):
                                continue
                            for email in school_emails:
                                if name_matches_email(coach["name"], email):
                                    found_emails[coach["name"]] = email
                                    break
                    if found_emails:
                        break
                except Exception:
                    continue

            if found_emails:
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
                await db.university_knowledge_base.update_one({"_id": school["_id"]}, {"$set": update})
                stats["phase3_found"] += 1
            else:
                stats["phase3_miss"] += 1
        except Exception as e:
            stats["phase3_err"] += 1
        finally:
            await ctx.close()

        if (i + 1) % 50 == 0:
            log.info(f"  P3 progress [{i+1}/{len(needs_scrape)}] Found={stats['phase3_found']}")
            save_progress({"phase": "3", **stats})

        await asyncio.sleep(0.5)

    log.info(f"Phase 3 done: {stats}")
    return stats


# ─── Main ───

async def main():
    start_time = datetime.now(timezone.utc)
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ.get("DB_NAME", "capymatch")]

    total = await db.university_knowledge_base.count_documents({})
    log.info(f"{'='*60}")
    log.info(f"MONTHLY COACH DATA REFRESH — {start_time.strftime('%B %d, %Y')}")
    log.info(f"{'='*60}")
    log.info(f"Total schools: {total}")

    # Step 1: Snapshot before
    log.info("Taking pre-refresh snapshot...")
    before_snapshot = await take_snapshot(db)
    log.info(f"Snapshot: {len(before_snapshot)} schools")

    all_stats = {"started_at": start_time.isoformat()}
    save_progress(all_stats)

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox"]
        )

        # Phase 1
        log.info(f"{'='*60}")
        log.info("PHASE 1: Re-scraping ALL schools from Productive Recruit")
        log.info(f"{'='*60}")
        p1 = await phase1_refresh_pr(db, browser)
        all_stats.update(p1)
        save_progress(all_stats)

        # Phase 2
        log.info(f"{'='*60}")
        log.info("PHASE 2: Matching PR names to verified emails")
        log.info(f"{'='*60}")
        p2 = await phase2_match_emails(db)
        all_stats.update(p2)
        save_progress(all_stats)

        # Phase 3
        log.info(f"{'='*60}")
        log.info("PHASE 3: Scraping athletics sites for missing emails")
        log.info(f"{'='*60}")
        p3 = await phase3_scrape_missing_emails(db, browser)
        all_stats.update(p3)

        await browser.close()

    # Step 2: Snapshot after
    log.info("Taking post-refresh snapshot...")
    after_snapshot = await take_snapshot(db)

    # Step 3: Compute changes
    log.info("Computing changes...")
    changes = compute_changes(before_snapshot, after_snapshot)

    total_changes = sum(len(v) for v in changes.values())
    log.info(f"Changes detected: {total_changes}")
    for k, v in changes.items():
        if v:
            log.info(f"  {k}: {len(v)}")

    # Final coverage
    has_staff = await db.university_knowledge_base.count_documents({"coaching_staff": {"$exists": True, "$ne": []}})
    has_verified = await db.university_knowledge_base.count_documents({"coaching_staff.email_verified": True})
    has_email = await db.university_knowledge_base.count_documents({"coach_email": {"$exists": True, "$ne": ""}})

    all_stats["final_coverage"] = {
        "total_schools": total,
        "has_coaching_staff": has_staff,
        "has_verified_emails": has_verified,
        "has_coach_email": has_email,
    }

    end_time = datetime.now(timezone.utc)
    duration_min = (end_time - start_time).total_seconds() / 60
    all_stats["finished_at"] = end_time.isoformat()
    all_stats["duration_minutes"] = round(duration_min, 1)
    all_stats["changes"] = {k: len(v) for k, v in changes.items()}
    save_progress(all_stats)

    # Step 4: Save run record to DB
    await db.coach_refresh_runs.insert_one({
        "run_date": start_time.isoformat(),
        "duration_minutes": round(duration_min, 1),
        "total_changes": total_changes,
        "changes_summary": {k: len(v) for k, v in changes.items()},
        "coverage": all_stats["final_coverage"],
        "stats": {k: v for k, v in all_stats.items() if k.startswith("phase")},
    })

    # Step 5: Send email report
    log.info("Sending report email...")
    report_html = build_report_html(changes, all_stats, duration_min)
    await send_report_email(report_html, total_changes)

    log.info(f"{'='*60}")
    log.info(f"ALL DONE in {duration_min:.0f} minutes. {total_changes} changes detected.")
    log.info(f"{'='*60}")


if __name__ == "__main__":
    asyncio.run(main())
