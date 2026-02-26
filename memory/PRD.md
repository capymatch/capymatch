# CapyMatch PRD

## Original Problem Statement
CapyMatch is a public-facing Volleyball Recruiting CRM evolving into a sophisticated decision-support system for student-athletes. The core goal is to provide data-driven insights to navigate the complexities of college recruiting.

## Core Architecture
- **Frontend**: React (CRA) + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python) + MongoDB (Motor async)
- **Auth**: Bearer token (localStorage)
- **Integrations**: Stripe, Resend, Claude AI (Emergent LLM Key), Emergent Google Auth, Google Gmail APIs

## What's Been Implemented

### Gmail History Import (Complete)
- Full scan → preview → confirm pipeline
- Enrichment: auto-creates coaches from KB + discovered emails, sets domain
- UX: Verified School badges, coach verification labels, unmapped row explanations, Add Manually flow
- Safety: defensive KB checks, idempotent confirm, header-only scanning
- **Duplicate detection**: Status endpoint marks schools already on user's board (`already_on_board`), shown in "Already on Your Board" group with disabled checkboxes
- **Plan limit enforcement**: Status returns `plan_info` (tier, max_schools, current_count, remaining_slots). Auto-selection respects slots. Toggle rejects at limit with toast. Confirm enforces server-side. Plan limit banner with upgrade CTA.
- Rich success card with Journey tip (3s display)
- Comprehensive analytics: run metrics, unmapped domains, user behavior, coach discovery stats

### Admin Import Analytics Dashboard (Complete)
- 5 endpoints: overview, funnel, behavior, recent-runs, stage-distribution
- Frontend: stat cards, funnel visualization, behavior panel, expandable run rows
- Admin-only access enforced

### Other Completed Features
1. AI intelligence cards (Claude), multi-stage pipeline, Stripe subscriptions
2. University KB with scraped data + background refresh
3. Trust & Safety, intelligence metrics (CSI, Match Risk, Timeline, etc.)
4. Data contribution + Admin review dashboard
5. School detail pages, Recruiting Journey, Questionnaire Tracking
6. Follow-Up Reminders, Gmail read/write/attachment downloads
7. Full PWA Implementation

## Plan Limits
- **Free/Basic**: 5 schools max
- **Pro**: 25 schools max
- **Premium**: Unlimited (-1)

## Pending Issues
- **P2**: NCAA Timeline colors (recurring cosmetic)
- **P2**: Dead links for school recruiting questionnaires

## Prioritized Backlog
- NIL transaction platform, Girls/Boys data separation
- Email templates & bulk outreach, Camp/Tournament ROI tracker
- Family Collaboration Roles
- Consolidate AccountPage/SettingsPage, university_name → school_id migration

## Credentials
- **Demo User**: demo@capymatch.com / demo2026 (Premium, 10 schools)
- **Admin User**: douglas@yeslms.com (Google auth)
