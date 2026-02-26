# CapyMatch PRD

## Original Problem Statement
CapyMatch is a public-facing Volleyball Recruiting CRM evolving into a sophisticated decision-support system for student-athletes. The core goal is to provide data-driven insights to navigate the complexities of college recruiting.

## Core Architecture
- **Frontend**: React (CRA) + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python) + MongoDB (Motor async)
- **Auth**: Bearer token (localStorage)
- **Integrations**: Stripe, Resend, Claude AI (Emergent LLM Key), Emergent Google Auth, Google Gmail APIs

## Gmail History Import (Complete Feature)
### Core Flow
- Scan Gmail headers → match .edu domains to KB → preview suggestions → confirm import
- Auto-creates coaches from KB + discovered emails, sets domain for logos/intelligence
- Header-only scanning (never reads message bodies)

### Safety & Intelligence
- Duplicate detection: marks schools already on board with `already_on_board` flag
- Plan limit enforcement: auto-selects within remaining slots, shows upgrade CTA
- Defensive KB check: only KB-verified schools can be imported
- "Schools waiting" counter on billing/upgrade pages for conversion motivation

### Re-Import (Post-Upgrade)
- When user clicks Import again, backend detects previous scan with unimported suggestions
- Skips Gmail scan entirely — goes straight to preview with fresh duplicate/plan checks
- Works even if Gmail token has expired (resume check before credential check)
- Confirmed schools and existing board entries excluded from resume

### Analytics (5 Areas)
1. Run metrics: scan duration, guardrails, stage distribution, conversion rate
2. Unmapped domain intelligence: global frequency tracking for KB gaps
3. User behavior: consent, start, preview, abandon, deselect, add manually events
4. Coach discovery: KB vs Gmail breakdown per run
5. Error tracking: skip reasons (no_school_id, no_suggestion, already_exists, not_in_kb, plan_limit)

### Admin Dashboard (`/admin/analytics`)
- Overview cards, import funnel, user behavior panel, stage distribution, expandable run rows

## Plan Limits
- **Free/Basic**: 5 schools max
- **Pro**: 25 schools max
- **Premium**: Unlimited (-1)

## Other Completed Features
1. AI intelligence cards (Claude), multi-stage pipeline, Stripe subscriptions
2. University KB with scraped data + background refresh
3. Trust & Safety, intelligence metrics (CSI, Match Risk, Timeline, etc.)
4. Data contribution + Admin review, School detail pages
5. Recruiting Journey, Questionnaire Tracking, Follow-Up Reminders
6. Gmail read/write/attachment downloads, Full PWA

## Pending Issues
- **P2**: NCAA Timeline colors (recurring cosmetic)
- **P2**: Dead links for school recruiting questionnaires

## Backlog
- NIL platform, Girls/Boys data separation, email templates, Camp/Tournament ROI, Family Collaboration Roles
- Consolidate AccountPage/SettingsPage, university_name → school_id migration

## Credentials
- **Demo User**: demo@capymatch.com / demo2026 (Premium, 10 schools)
- **Admin User**: douglas@yeslms.com (Google auth)
