import asyncio
import httpx
import json
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from urllib.parse import urlparse

async def try_url(http, url):
    """Check if a URL is valid"""
    try:
        resp = await http.get(url, follow_redirects=True, timeout=12)
        return resp.status_code < 400, resp.status_code, str(resp.url)
    except:
        return False, 0, url

async def fix_all_dead():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["test_database"]

    with open("/app/dead_links_report.json") as f:
        report = json.load(f)

    # Skip already fixed schools
    already_fixed = {
        "Auburn University", "Clemson University", "Georgia Tech",
        "Mary Baldwin University", "Purdue University", "University of Iowa",
        "University of Kentucky", "University of Nebraska",
        "University of Notre Dame", "University of South Carolina",
        "University of Virginia", "Vanderbilt University", "Virginia Tech",
        "Fairleigh Dickinson University", "SUNY Stony Brook University",
    }

    remaining = [d for d in report["dead_links"] if d["university_name"] not in already_fixed]
    print(f"Attempting to fix {len(remaining)} remaining dead links...\n")

    results = {"fixed": [], "not_fixed": []}
    sem = asyncio.Semaphore(5)

    async def fix_one(entry):
        name = entry["university_name"]
        old_url = entry["url"]

        async with sem:
            doc = await db.university_knowledge_base.find_one(
                {"university_name": name},
                {"_id": 0, "university_name": 1, "website": 1, "domain": 1}
            )
            if not doc:
                return

            domain = doc.get("domain", "")
            candidates = []

            # Generate candidates from old URL
            if old_url and old_url.startswith("http"):
                try:
                    parsed = urlparse(old_url)
                    base = f"{parsed.scheme}://{parsed.netloc}"
                    candidates.extend([
                        f"{base}/sports/volleyball",
                        f"{base}/sports/womens-volleyball",
                        f"{base}/sports/wvball",
                        f"{base}/sports/wvb",
                        f"{base}/sports/w-volley",
                        f"{base}/sports/volleyball/index",
                        f"{base}/sports/womens-volleyball/index",
                        f"{base}/sports/wvball/index",
                        f"{base}",
                    ])
                except:
                    pass

            # Generate from .edu domain
            if domain:
                for prefix in ["athletics", "www", ""]:
                    d = f"{prefix}.{domain}" if prefix else domain
                    for path in ["/sports/volleyball", "/sports/womens-volleyball", "/sports/wvball", "/sports/wvb", ""]:
                        candidates.append(f"https://{d}{path}")

            # Deduplicate, skip old URL
            seen = set()
            unique = []
            for c in candidates:
                if c not in seen and c != old_url:
                    seen.add(c)
                    unique.append(c)

            async with httpx.AsyncClient(
                follow_redirects=True, timeout=12,
                headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
            ) as http:
                for url in unique:
                    ok, status, final_url = await try_url(http, url)
                    if ok:
                        await db.university_knowledge_base.update_one(
                            {"university_name": name},
                            {"$set": {"website": final_url, "updated_at": datetime.now(timezone.utc).isoformat()}}
                        )
                        results["fixed"].append({"school": name, "old": old_url, "new": final_url})
                        print(f"  FIXED: {name} → {final_url}")
                        return

            results["not_fixed"].append({"school": name, "old": old_url, "tried": len(unique)})
            print(f"  FAILED: {name} (tried {len(unique)} URLs)")

    tasks = [fix_one(e) for e in remaining]
    await asyncio.gather(*tasks)

    print(f"\n{'='*60}")
    print(f"RESULTS: {len(results['fixed'])} fixed, {len(results['not_fixed'])} still broken")
    print(f"{'='*60}")

    if results["not_fixed"]:
        print("\nStill broken:")
        for r in sorted(results["not_fixed"], key=lambda x: x["school"]):
            print(f"  {r['school']}: {r['old']}")

    with open("/app/dead_links_fix_report_all.json", "w") as f:
        json.dump(results, f, indent=2)

    client.close()

asyncio.run(fix_all_dead())
