# CapyMatch PRD

## Original Problem Statement
CapyMatch is a public-facing Volleyball Recruiting CRM evolving into a sophisticated decision-support system for student-athletes. The core goal is to provide data-driven insights to navigate the complexities of college recruiting, featuring a three-stage AI pipeline to generate reliable, source-aware intelligence for UI cards.

## Core Architecture
- **Frontend**: React (CRA) + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python) + MongoDB (Motor async)
- **Auth**: Bearer token (localStorage)
- **Integrations**: Stripe, Resend, Claude AI (Emergent LLM Key), Emergent Google Auth, Google Gmail APIs

## What's Been Implemented

### Gmail History Import (Complete)
- Full backend: domain mapper, header scanner, rule engine, idempotent APIs
- Full frontend: GmailImportModal with 4 states, Verified School badges, coach labels, Add Manually flow
- Enrichment: auto-creates coaches from KB + discovered emails, sets domain
- Safety: defensive KB checks, unmapped domain logging, idempotent confirm
- Rich success card with Journey tip
- Comprehensive analytics (5 areas): run metrics, unmapped domain intelligence, user behavior tracking, coach discovery stats, error/edge case logging

### Admin Import Analytics Dashboard (Complete - Feb 26, 2026)
- **5 backend endpoints** at `/api/admin/import-analytics/`:
  - `overview`: total imports, unique users, schools/coaches created, avg scan time, conversion rate
  - `funnel`: messages → schools found → high confidence → selected → created
  - `behavior`: consent shown, start rate, abandon rate, deselections, add manually clicks
  - `recent-runs`: expandable table with user info, scan/confirm details, skip reasons, unmapped domains
  - `stage-distribution`: breakdown of confirmed stages
- **Frontend page** at `/admin/analytics` with 6 stat cards, funnel visualization, behavior panel, stage distribution, expandable run rows
- Admin-only access enforced (require_admin guard)
- **Testing**: 21/21 backend tests passed, all frontend components verified

### Other Completed Features
1. AI-powered school matching & intelligence cards (Claude)
2. Multi-stage recruiting pipeline with expandable cards
3. Full Stripe subscription system
4. Emergent Google Auth + email/password login
5. University Knowledge Base with background refresh
6. Trust & Safety UI, intelligence metrics (CSI, Match Risk, Timeline, Roster, Scholarship, NIL)
7. Data contribution + Admin review dashboard
8. School detail pages, Recruiting Journey page
9. Questionnaire Tracking, Follow-Up Reminders
10. Full PWA Implementation
11. Gmail read/write/attachment downloads

## Pending Issues
- **P2**: NCAA Timeline colors (recurring cosmetic)
- **P2**: Dead links for school recruiting questionnaires

## Prioritized Backlog
- Full NIL transaction/payment platform
- Separate Girls/Boys Volleyball data models
- Email templates & bulk outreach
- Camp/Tournament ROI tracker
- Family Collaboration Roles
- Fix dead links + re-run scraper for questionnaire URLs

### Refactoring
- Consolidate AccountPage / SettingsPage
- Consider university_name → stable school_id migration

## Credentials
- **Demo User**: demo@capymatch.com / demo2026
- **Admin User**: douglas@yeslms.com (Google auth)
