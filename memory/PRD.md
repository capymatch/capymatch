# Volleyball Recruiting CRM — PRD

## Original Problem Statement
A public-facing Volleyball Recruiting CRM evolving into a decision-support system for student-athletes via a three-stage intelligence pipeline.

## Core Architecture
- **Frontend**: React + Shadcn UI | **Backend**: FastAPI + MongoDB
- **Auth**: Cookie-based sessions (Google OAuth + email/password)
- **AI**: Claude Sonnet 4.5 via Emergent LLM Key
- **Intelligence Pipeline**: Schema Mapper → Payload Builder → Intelligence Runtime

## Intelligence Pipeline Status
| Agent | Status | Endpoint |
|-------|--------|----------|
| School Insight | Done + Wired | `POST /api/intelligence/school-insight/{id}` |
| Timeline | Done + Wired | `POST /api/intelligence/timeline/{id}` |
| Roster/Stability | Done + Wired | `POST /api/intelligence/roster/{id}` |
| Scholarship | Done + Wired | `POST /api/intelligence/scholarship/{id}` |

## Scholarship Agent Design
- AI determines label only; all UI copy hardcoded in `UI_COPY` dict (5 states)
- **Labels**: Mix of Partial and Full | Typically Partial | Walk-On Pathways Common | Unknown (+ Unknown_vague)
- **Rules**: No dollars, no percentages, no guarantees. Vague notes → "Unknown" with evidence "partial"
- **Questions to ask the coach**: 2 universal + 4-5 label-specific per state, with "Copy Questions" button
- Contributed data stays `pending_verification`, never upgrades to "strong"

## Data Enrichment System
- "Improve this card" nudge on Unknown-state cards
- Contributions: link, upload, request — stored as `pending_verification`
- `POST /api/intelligence/contribute` and `/contribute/upload`

## Prioritized Backlog
### P1 — Upcoming
- Phase D: Migrate NIL Readiness to intelligence pipeline

### P2 — Known Issues
- NCAA Timeline colors (cosmetic, deprioritized)

### P2+ — Future
- Admin dashboard for reviewing pending contributions
- Separate Girls/Boys Volleyball data
- Email templates & bulk outreach
- Camp/Tournament ROI tracker | Marketing Website
- App Naming & Multi-sport | Family Collaboration Roles | Mobile App

## Test Credentials
- **Pro**: pro@test.com / password
- **Google Auth**: douglas@yeslms.com / password (has programs)
