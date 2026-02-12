from fastapi import FastAPI
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from pathlib import Path
import os
import logging
import httpx
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from database import db, client

app = FastAPI()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ─── Register all route modules ───
from routes.auth_routes import router as auth_router
from routes.programs import router as programs_router
from routes.events import router as events_router
from routes.dashboard import router as dashboard_router
from routes.profile import router as profile_router
from routes.knowledge import router as knowledge_router
from routes.ai import router as ai_router
from routes.gmail import router as gmail_router

app.include_router(auth_router)
app.include_router(programs_router)
app.include_router(events_router)
app.include_router(dashboard_router)
app.include_router(profile_router)
app.include_router(knowledge_router)
app.include_router(ai_router)
app.include_router(gmail_router)

# ─── Root ───

@app.get("/api/")
async def root():
    return {"message": "Volleyball Recruiting CRM API"}

# ─── Middleware ───

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Lifecycle ───

@app.on_event("startup")
async def startup_event():
    count = await db.university_knowledge_base.count_documents({})
    if count == 0:
        logger.info("Seeding university knowledge base...")
        async with httpx.AsyncClient() as hc:
            try:
                await hc.post("http://localhost:8001/api/seed")
            except Exception:
                pass


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
