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
- Backend: Domain mapper, header scanner, rule engine, idempotent APIs
- Frontend: Full GmailImportModal with 4 states (consent/scanning/preview/done)
- Enrichment: Auto-creates coaches from KB + discovered emails, sets domain
- UX polish: Verified School badges, coach verification labels, unmapped row explanations, Add Manually flow
- Safety: Defensive KB checks, unmapped domain logging, idempotent confirm
- Success card: "Imported N schools" with Journey tip and Reply Due guidance (3s display)
- **Comprehensive Analytics** (5 areas):
  1. Import Run Analytics: scan duration, guardrails stats, stage distribution, conversion rates
  2. Unmapped Domain Intelligence: global `unmapped_domain_stats` collection with frequency + recency
  3. User Behavior Tracking: `import_events` collection (consent_shown, started, preview_shown, abandoned, deselected, reselected, add_manually_clicked, confirmed, done_shown)
  4. Coach Discovery Stats: coaches_from_kb vs coaches_from_gmail counts, total per run
  5. Error/Edge Case Logging: skip_reasons breakdown (no_school_id, no_suggestion, already_exists, not_in_kb)
  - All analytics stored in: `import_analytics` (per-run summary), `import_events` (user behavior), `unmapped_domain_stats` (global KB gaps), `import_runs.scan_analytics` + `import_runs.confirm_analytics`

### Other Completed Features
1. AI-powered school matching & intelligence cards
2. Multi-stage recruiting pipeline with expandable cards
3. Full Stripe subscription system
4. Emergent Google Auth + email/password login
5. University Knowledge Base with background refresh
6. Trust & Safety UI features
7. Intelligence metrics (Commitment Stability, Match Risk, Timeline, Roster, Scholarship, NIL)
8. Data contribution + Admin review dashboard
9. School detail pages, Recruiting Journey page
10. Questionnaire Tracking, Follow-Up Reminders
11. Full PWA Implementation
12. Gmail read/write/attachment downloads

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
