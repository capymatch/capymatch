# Volleyball Recruiting CRM — PRD

## Original Problem Statement
A public-facing Volleyball Recruiting CRM evolving into a decision-support system for student-athletes. Core goal: provide data-driven insights to navigate college recruiting complexities.

## Core Architecture
- **Frontend**: React + Shadcn UI
- **Backend**: FastAPI + MongoDB
- **Auth**: Cookie-based sessions (Google OAuth + email/password)
- **AI**: Claude Sonnet 4.5 via Emergent LLM Key
- **Intelligence Pipeline**: Three-stage architecture (Schema Mapper → Payload Builder → Intelligence Runtime)

## Intelligence Pipeline Status
| Stage | Status | File |
|-------|--------|------|
| Stage 1: Schema Mapper | ✅ Complete | `backend/intelligence/schema_mapper.py` |
| Stage 2: Payload Builder | ✅ Complete | `backend/intelligence/payload_builder.py` |
| Stage 3: Orchestrator | ✅ Complete | `backend/intelligence/orchestrator.py` |
| Agent: School Insight | ✅ Complete + Frontend Wired | `backend/intelligence/agents/school_insight.py` |
| Agent: Timeline | ✅ Complete + Frontend Wired | `backend/intelligence/agents/timeline.py` |
| Agent: Roster/Stability | ✅ Complete + Frontend Wired | `backend/intelligence/agents/roster_stability.py` |

## What's Been Implemented
- Dynamic Recruiting Board with 5-stage funnel
- University Knowledge Base (scraping + enrichment)
- Match scoring system with risk badges
- Email integration (Gmail API)
- Subscription engine with Stripe
- Admin area
- Coach Watch (staff change detection)
- Notes system (per-school)
- Intelligence Pipeline (Stages 1-3) with 3 micro-agents
- Frontend wiring for all 3 intelligence cards (Timeline, Roster, Stability)
- SchoolInsightCard fully migrated to pipeline
- TimelineStatusCard fully migrated to pipeline (Feb 2026)
- RosterRealityCard fully migrated to pipeline (Feb 2026)
- CommitmentStabilityCard fully migrated to pipeline (Feb 2026)

## Key API Endpoints (Intelligence)
- `POST /api/intelligence/school-insight/{program_id}` — Why This School card
- `POST /api/intelligence/timeline/{program_id}` — Timeline Intelligence card
- `POST /api/intelligence/roster/{program_id}` — Roster Reality + Commitment Stability cards

## Prioritized Backlog

### P1 — Upcoming
- Phase C: Migrate Scholarship Structure or NIL Readiness to intelligence pipeline

### P2 — Known Issues
- NCAA Timeline colors (cosmetic, consistently deprioritized)

### P2 — Future Features
- Separate Girls/Boys Volleyball data
- Email templates & bulk outreach
- Camp/Tournament ROI tracker
- Build Marketing Website
- App Naming & Multi-sport capability
- Family Collaboration Roles
- Mobile App

## Test Credentials
- **Pro User**: pro@test.com / password
- **Google Auth User**: douglas@yeslms.com / password (has programs, best for testing)

## Key Files
- `frontend/src/pages/RecruitingJourney.js` — Main journey page with intelligence cards
- `frontend/src/components/TimelineIntelligence.js` — Timeline card component
- `frontend/src/components/RosterOutlook.js` — Roster card component
- `frontend/src/components/CommitmentStabilityCard.js` — Stability card component
- `frontend/src/components/SchoolInsightCard.js` — School insight card component
- `backend/routes/intelligence.py` — Intelligence API endpoints
- `backend/intelligence/` — Full pipeline directory
