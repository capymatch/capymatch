import asyncio
import httpx
import json
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone

async def check_links():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["test_database"]
    
    schools = await db.university_knowledge_base.find(
        {}, {"_id": 0, "university_name": 1, "website": 1, "domain": 1, "volleyball_url": 1}
    ).to_list(2000)
    
    print(f"Checking {len(schools)} schools...")
    
    dead_links = []
    checked = 0
    
    semaphore = asyncio.Semaphore(20)  # limit concurrency
    
    async def check_one(school):
        nonlocal checked
        name = school.get("university_name", "Unknown")
        urls_to_check = {}
        
        if school.get("website"):
            urls_to_check["website"] = school["website"]
        if school.get("volleyball_url") and school.get("volleyball_url") != school.get("website"):
            urls_to_check["volleyball_url"] = school["volleyball_url"]
        
        for field, url in urls_to_check.items():
            if not url or not url.startswith("http"):
                continue
            async with semaphore:
                try:
                    async with httpx.AsyncClient(follow_redirects=True, timeout=15) as http:
                        resp = await http.get(url, headers={"User-Agent": "Mozilla/5.0 (compatible; LinkChecker/1.0)"})
                        if resp.status_code >= 400:
                            dead_links.append({
                                "university_name": name,
                                "field": field,
                                "url": url,
                                "status": resp.status_code,
                                "error": f"HTTP {resp.status_code}"
                            })
                except httpx.ConnectError as e:
                    dead_links.append({
                        "university_name": name, "field": field, "url": url,
                        "status": 0, "error": f"Connection failed: {str(e)[:80]}"
                    })
                except httpx.TimeoutException:
                    dead_links.append({
                        "university_name": name, "field": field, "url": url,
                        "status": 0, "error": "Timeout (15s)"
                    })
                except Exception as e:
                    dead_links.append({
                        "university_name": name, "field": field, "url": url,
                        "status": 0, "error": str(e)[:100]
                    })
        
        checked += 1
        if checked % 100 == 0:
            print(f"  Checked {checked}/{len(schools)}...")
    
    tasks = [check_one(s) for s in schools]
    await asyncio.gather(*tasks)
    
    # Sort by university name
    dead_links.sort(key=lambda x: x["university_name"])
    
    report = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_schools": len(schools),
        "dead_link_count": len(dead_links),
        "dead_links": dead_links
    }
    
    with open("/app/dead_links_report.json", "w") as f:
        json.dump(report, f, indent=2)
    
    print(f"\nDone! {len(dead_links)} dead links found out of {len(schools)} schools.")
    print(f"Report saved to /app/dead_links_report.json")
    
    # Print summary
    for d in dead_links:
        print(f"  DEAD: {d['university_name']} [{d['field']}] → {d['error']} — {d['url']}")

    client.close()

asyncio.run(check_links())
