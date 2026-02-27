import asyncio
import httpx
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from urllib.parse import urlparse

BROKEN_404 = [
    "Goucher College",
    "Huntingdon College",
    "La Roche University",
    "Lasell University",
    "Minnesota State University – Mankato",
    "Minnesota State University – Moorhead",
    "Northwood University – Michigan",
    "University of Tampa",
    "Willamette University",
]

async def try_url(http, url):
    try:
        resp = await http.get(url, follow_redirects=True, timeout=12)
        return resp.status_code < 400, resp.status_code, str(resp.url)
    except:
        return False, 0, url

async def fix():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["test_database"]

    async with httpx.AsyncClient(
        follow_redirects=True, timeout=12,
        headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
    ) as http:

        for name in BROKEN_404:
            doc = await db.university_knowledge_base.find_one(
                {"university_name": name},
                {"_id": 0, "university_name": 1, "website": 1, "domain": 1}
            )
            if not doc:
                print(f"NOT FOUND: {name}")
                continue

            old_url = doc.get("website", "")
            domain = doc.get("domain", "")
            print(f"\n{name}")
            print(f"  Old: {old_url}")

            candidates = []
            # From old URL base
            if old_url and old_url.startswith("http"):
                try:
                    parsed = urlparse(old_url)
                    base = f"{parsed.scheme}://{parsed.netloc}"
                    for p in ["/sports/volleyball", "/sports/womens-volleyball", "/sports/wvball",
                              "/sports/wvb", "/sports/w-volley", "/sports/wvball/index",
                              "/sports/volleyball/index", "/sports/womens-volleyball/index",
                              "/sports/wvball/roster", "/sports/volleyball/roster", ""]:
                        candidates.append(f"{base}{p}")
                except:
                    pass

            # Known alternative domains
            alt_domains = {
                "Goucher College": ["athletics.goucher.edu", "gouchergophers.com"],
                "Huntingdon College": ["huntingdonhawks.com", "gohuntingdon.com"],
                "La Roche University": ["www.larochesports.com", "larocheredhawks.com"],
                "Lasell University": ["laserpride.lasell.edu", "laselllasers.com"],
                "Minnesota State University – Mankato": ["msumavericks.com", "mnsumavericks.com"],
                "Minnesota State University – Moorhead": ["msumdragons.com", "msumdragonsathletics.com"],
                "Northwood University – Michigan": ["www.gonorthwood.com", "northwoodtimberwolves.com"],
                "University of Tampa": ["www.tampaspartans.com", "tampaspartans.com", "utspartans.com"],
                "Willamette University": ["www.wubearcats.com", "willamettebearcats.com"],
            }

            for dom in alt_domains.get(name, []):
                for p in ["/sports/volleyball", "/sports/womens-volleyball", "/sports/wvball",
                          "/sports/wvb", "/sports/wvball/index", "/sports/volleyball/index",
                          "/sports/womens-volleyball/index", ""]:
                    candidates.append(f"https://{dom}{p}")

            # From .edu domain
            if domain:
                for prefix in ["athletics", "www", ""]:
                    d = f"{prefix}.{domain}" if prefix else domain
                    for p in ["/sports/volleyball", "/sports/womens-volleyball", "/sports/wvball", ""]:
                        candidates.append(f"https://{d}{p}")

            seen = set()
            unique = []
            for c in candidates:
                if c not in seen:
                    seen.add(c)
                    unique.append(c)

            found = None
            for url in unique:
                ok, status, final = await try_url(http, url)
                if ok:
                    found = final
                    print(f"  FIXED → {found} ({status})")
                    await db.university_knowledge_base.update_one(
                        {"university_name": name},
                        {"$set": {"website": found, "updated_at": datetime.now(timezone.utc).isoformat()}}
                    )
                    break

            if not found:
                print(f"  STILL BROKEN (tried {len(unique)} URLs)")

    client.close()

asyncio.run(fix())
