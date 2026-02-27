import asyncio
import httpx
import json
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone

async def recheck():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["test_database"]
    
    schools = await db.university_knowledge_base.find(
        {}, {"_id": 0, "university_name": 1, "website": 1, "domain": 1}
    ).to_list(2000)
    
    print(f"Re-checking {len(schools)} schools...")
    
    dead = []
    checked = 0
    sem = asyncio.Semaphore(20)
    
    async def check_one(school):
        nonlocal checked
        name = school.get("university_name", "")
        url = school.get("website", "")
        if not url or not url.startswith("http"):
            dead.append({"university_name": name, "url": url or "(empty)", "error": "No URL"})
            checked += 1
            return
        
        async with sem:
            try:
                async with httpx.AsyncClient(
                    follow_redirects=True, timeout=15,
                    headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
                ) as http:
                    resp = await http.get(url)
                    if resp.status_code >= 400:
                        dead.append({"university_name": name, "url": url, "error": f"HTTP {resp.status_code}"})
            except httpx.TimeoutException:
                dead.append({"university_name": name, "url": url, "error": "Timeout"})
            except Exception as e:
                dead.append({"university_name": name, "url": url, "error": str(e)[:80]})
        
        checked += 1
        if checked % 200 == 0:
            print(f"  {checked}/{len(schools)}...")
    
    await asyncio.gather(*[check_one(s) for s in schools])
    
    dead.sort(key=lambda x: x["university_name"])
    
    print(f"\nDone! {len(dead)} issues out of {len(schools)} schools.")
    for d in dead:
        print(f"  {d['error']:12s} | {d['university_name']}: {d['url']}")
    
    with open("/app/dead_links_recheck.json", "w") as f:
        json.dump({"timestamp": datetime.now(timezone.utc).isoformat(), "total": len(schools), "dead": len(dead), "items": dead}, f, indent=2)
    
    client.close()

asyncio.run(recheck())
