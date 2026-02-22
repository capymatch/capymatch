# Volleyball Recruiting CRM — PRD

## Original Problem Statement
A public-facing Volleyball Recruiting CRM evolving into a decision-support system for student-athletes. Core goal: provide data-driven insights to navigate college recruiting complexities via a three-stage intelligence pipeline.

## Core Architecture
- **Frontend**: React + Shadcn UI
- **Backend**: FastAPI + MongoDB
- **Auth**: Cookie-based sessions (Google OAuth + email/password)
- **AI**: Claude Sonnet 4.5 via Emergent LLM Key
- **Intelligence Pipeline**: Three-stage (Schema Mapper → Payload Builder → Intelligence Runtime)

## Intelligence Pipeline Status
| Stage | Status | File |
|-------|--------|------|
| Stage 1: Schema Mapper | Done | `backend/intelligence/schema_mapper.py` |
| Stage 2: Payload Builder | Done | `backend/intelligence/payload_builder.py` |
| Stage 3: Orchestrator | Done | `backend/intelligence/orchestrator.py` |
| Agent: School Insight | Done + Wired | `backend/intelligence/agents/school_insight.py` |
| Agent: Timeline | Done + Wired | `backend/intelligence/agents/timeline.py` |
| Agent: Roster/Stability | Done + Wired | `backend/intelligence/agents/roster_stability.py` |
| Agent: Scholarship | Done + Wired | `backend/intelligence/agents/scholarship.py` |

## Scholarship Agent Design
- **AI determines label only** — all UI copy (explanation, guidance, tooltip) is hardcoded in `UI_COPY` dict
- **5 states**: Unknown, Unknown_vague, Typically Partial, Mix of Partial and Full, Walk-On Pathways Common
- **Rules**: No dollars, no percentages, no guarantees. Vague notes → "Unknown" with evidence "partial"
- **Contributed data NEVER upgrades to evidence "strong"** until admin-verified
- **Division context** is factual and non-numeric

## Data Enrichment System
- "Improve this card" nudge on Unknown-state cards
- Options: Add source link, Upload file (CSV/screenshot/PDF), Request update
- All contributions stored as `pending_verification` in `intelligence_contributions` collection
- Contributions do NOT affect insights until admin-verified

## Key API Endpoints
- `POST /api/intelligence/school-insight/{program_id}`
- `POST /api/intelligence/timeline/{program_id}`
- `POST /api/intelligence/roster/{program_id}`
- `POST /api/intelligence/scholarship/{program_id}`
- `POST /api/intelligence/contribute` (link/request)
- `POST /api/intelligence/contribute/upload` (file)

## Prioritized Backlog

### P1 — Upcoming
- Phase D: Migrate NIL Readiness to the intelligence pipeline

### P2 — Known Issues
- NCAA Timeline colors (cosmetic, consistently deprioritized)

### P2 — Future Features
- Admin dashboard for reviewing pending contributions
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
- `frontend/src/pages/RecruitingJourney.js` — Main journey page
- `frontend/src/components/ScholarshipStructure.js` — Scholarship card with guidance block
- `frontend/src/components/TimelineIntelligence.js` — Timeline card
- `frontend/src/components/RosterOutlook.js` — Roster card
- `frontend/src/components/CommitmentStabilityCard.js` — Stability card
- `frontend/src/components/SchoolInsightCard.js` — School insight card
- `frontend/src/components/ImproveCardNudge.js` — Data enrichment nudge component
- `backend/routes/intelligence.py` — Intelligence API endpoints
- `backend/routes/intelligence_contribute.py` — Contribution endpoints
- `backend/intelligence/agents/scholarship.py` — Scholarship agent with UI_COPY dict
- `backend/intelligence/` — Full pipeline directory
