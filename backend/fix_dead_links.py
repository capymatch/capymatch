import asyncio
import httpx
import json
import re
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone

# Schools with confirmed 404s (genuinely dead, not just timeouts/403s)
DEAD_404_SCHOOLS = [
    "Auburn University",
    "Clemson University",
    "Georgia Tech",
    "Mary Baldwin University",
    "Purdue University",
    "University of Iowa",
    "University of Kentucky",
    "University of Nebraska",
    "University of Notre Dame",
    "University of South Carolina",
    "University of Virginia",
    "Vanderbilt University",
    "Virginia Tech",
]

# Also fix malformed URLs
MALFORMED_SCHOOLS = [
    "Fairleigh Dickinson University",
    "SUNY Stony Brook University",
]

async def find_volleyball_url(http, school_name):
    """Search for the correct volleyball page URL"""
    queries = [
        f"{school_name} women's volleyball roster",
        f"{school_name} volleyball athletics",
    ]
    
    for query in queries:
        try:
            # Use Google search via a simple approach - check common URL patterns
            pass
        except:
            pass
    
    # Try common athletic site URL patterns
    return None

async def try_url(http, url):
    """Check if a URL is valid (returns 200-399)"""
    try:
        resp = await http.get(url, follow_redirects=True, timeout=10)
        return resp.status_code < 400, resp.status_code, str(resp.url)
    except:
        return False, 0, url

async def fix_dead_links():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["test_database"]
    
    results = []
    
    async with httpx.AsyncClient(
        follow_redirects=True, 
        timeout=15,
        headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}
    ) as http:
        
        all_schools = DEAD_404_SCHOOLS + MALFORMED_SCHOOLS
        
        for school_name in all_schools:
            print(f"\nFixing: {school_name}")
            
            doc = await db.university_knowledge_base.find_one(
                {"university_name": school_name},
                {"_id": 0, "university_name": 1, "website": 1, "domain": 1}
            )
            if not doc:
                print(f"  NOT FOUND in KB")
                results.append({"school": school_name, "status": "not_found"})
                continue
            
            old_url = doc.get("website", "")
            domain = doc.get("domain", "")
            print(f"  Old URL: {old_url}")
            print(f"  Domain: {domain}")
            
            # Strategy 1: Try common URL pattern variations
            candidates = []
            
            if old_url and old_url.startswith("http"):
                # Extract base domain from old URL
                try:
                    from urllib.parse import urlparse
                    parsed = urlparse(old_url)
                    base = f"{parsed.scheme}://{parsed.netloc}"
                    
                    # Try variations
                    candidates.extend([
                        f"{base}/sports/volleyball",
                        f"{base}/sports/womens-volleyball",
                        f"{base}/sports/w-volley",
                        f"{base}/sports/wvball",
                        f"{base}/sports/wvb",
                        f"{base}/sport/volleyball",
                        f"{base}/volleyball",
                    ])
                    
                    # Try with /index at the end
                    candidates.extend([
                        f"{base}/sports/volleyball/index",
                        f"{base}/sports/womens-volleyball/index",
                    ])
                except:
                    pass
            
            # Strategy 2: Try well-known athletic domains for major schools
            known_domains = {
                "Auburn University": ["auburntigers.com"],
                "Clemson University": ["clemsontigers.com"],
                "Georgia Tech": ["ramblinwreck.com"],
                "Purdue University": ["purduesports.com", "purdueboilermakers.com"],
                "University of Iowa": ["hawkeyesports.com"],
                "University of Kentucky": ["ukathletics.com"],
                "University of Nebraska": ["huskers.com"],
                "University of Notre Dame": ["und.com", "fightingirish.com"],
                "University of South Carolina": ["gamecocksonline.com"],
                "University of Virginia": ["virginiasports.com"],
                "Vanderbilt University": ["vucommodores.com"],
                "Virginia Tech": ["hokiesports.com"],
                "Fairleigh Dickinson University": ["fduknights.com"],
                "SUNY Stony Brook University": ["stonybrookathletics.com", "goseawolves.com"],
            }
            
            if school_name in known_domains:
                for dom in known_domains[school_name]:
                    candidates.extend([
                        f"https://{dom}/sports/volleyball",
                        f"https://{dom}/sports/womens-volleyball",
                        f"https://{dom}/sports/wvball",
                        f"https://{dom}/sports/w-volley",
                        f"https://{dom}",
                    ])
            
            # Strategy 3: Try the school's main domain
            if domain:
                candidates.extend([
                    f"https://{domain}",
                    f"https://www.{domain}",
                    f"https://athletics.{domain}",
                    f"https://athletics.{domain}/sports/volleyball",
                    f"https://athletics.{domain}/sports/womens-volleyball",
                ])
            
            # Remove duplicates while preserving order
            seen = set()
            unique_candidates = []
            for c in candidates:
                if c not in seen and c != old_url:
                    seen.add(c)
                    unique_candidates.append(c)
            
            # Test each candidate
            found_url = None
            for url in unique_candidates:
                ok, status, final_url = await try_url(http, url)
                if ok:
                    found_url = final_url if final_url != url else url
                    print(f"  FOUND: {found_url} (status: {status})")
                    break
            
            if found_url:
                # Update the KB
                await db.university_knowledge_base.update_one(
                    {"university_name": school_name},
                    {"$set": {"website": found_url, "updated_at": datetime.now(timezone.utc).isoformat()}}
                )
                results.append({
                    "school": school_name,
                    "status": "fixed",
                    "old_url": old_url,
                    "new_url": found_url,
                })
                print(f"  UPDATED KB!")
            else:
                results.append({
                    "school": school_name,
                    "status": "not_fixed",
                    "old_url": old_url,
                    "tried": len(unique_candidates),
                })
                print(f"  Could not find working URL (tried {len(unique_candidates)} candidates)")
    
    # Summary
    fixed = [r for r in results if r["status"] == "fixed"]
    not_fixed = [r for r in results if r["status"] == "not_fixed"]
    
    print(f"\n{'='*60}")
    print(f"RESULTS: {len(fixed)} fixed, {len(not_fixed)} not fixed")
    print(f"{'='*60}")
    
    for r in fixed:
        print(f"  FIXED: {r['school']}")
        print(f"    Old: {r['old_url']}")
        print(f"    New: {r['new_url']}")
    
    for r in not_fixed:
        print(f"  NOT FIXED: {r['school']} (tried {r.get('tried', 0)} URLs)")
    
    with open("/app/dead_links_fix_report.json", "w") as f:
        json.dump(results, f, indent=2)
    
    client.close()

asyncio.run(fix_dead_links())
