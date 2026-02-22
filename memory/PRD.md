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

## What's Been Implemented
- Dynamic Recruiting Board with 5-stage funnel
- University Knowledge Base (scraping + enrichment)
- Match scoring system with risk badges
- Email integration (Gmail API)
- Subscription engine with Stripe
- Admin area
- Coach Watch (staff change detection)
- Notes system (per-school)
- Intelligence Pipeline (Stages 1-3) with 4 micro-agents
- All 4 intelligence cards wired to pipeline endpoints
- "Improve this card" data enrichment nudge on Unknown-state cards
- User contribution system (link, upload, request) with pending_verification

## Key API Endpoints (Intelligence)
- `POST /api/intelligence/school-insight/{program_id}` — Why This School card
- `POST /api/intelligence/timeline/{program_id}` — Timeline Intelligence card
- `POST /api/intelligence/roster/{program_id}` — Roster Reality + Commitment Stability cards
- `POST /api/intelligence/scholarship/{program_id}` — Scholarship Structure card
- `POST /api/intelligence/contribute` — User data contributions (link/request)
- `POST /api/intelligence/contribute/upload` — File upload contributions

## Scholarship Agent Rules
- Labels: "Mix of Partial and Full" | "Typically Partial" | "Walk-On Pathways Common" | "Unknown"
- No dollar amounts, no percentages, no guarantees
- Vague scholarship_notes → label "Unknown" with evidence "partial"
- Contributed data NEVER upgrades to evidence "strong" until admin-verified
- Division context is factual, non-numeric: "Division I athletic aid may include partial awards..."
- status always "ok" (insufficient_data only for broken payload)

## Prioritized Backlog

### P1 — Upcoming
- Phase D: Migrate NIL Readiness to the intelligence pipeline

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
- `frontend/src/pages/RecruitingJourney.js` — Main journey page
- `frontend/src/components/ScholarshipStructure.js` — Scholarship card
- `frontend/src/components/TimelineIntelligence.js` — Timeline card
- `frontend/src/components/RosterOutlook.js` — Roster card
- `frontend/src/components/CommitmentStabilityCard.js` — Stability card
- `frontend/src/components/SchoolInsightCard.js` — School insight card
- `frontend/src/components/ImproveCardNudge.js` — Data enrichment nudge
- `backend/routes/intelligence.py` — Intelligence API endpoints
- `backend/routes/intelligence_contribute.py` — Contribution endpoints
- `backend/intelligence/` — Full pipeline directory
