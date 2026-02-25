# CapyMatch PRD

## Original Problem Statement
CapyMatch is a public-facing Volleyball Recruiting CRM evolving into a sophisticated decision-support system for student-athletes. The core goal is to provide data-driven insights to navigate the complexities of college recruiting, featuring a three-stage AI pipeline to generate reliable, source-aware intelligence for UI cards.

## Core Architecture
- **Frontend**: React (CRA) + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python) + MongoDB (Motor async)
- **Auth**: Bearer token (localStorage). Backend checks Authorization header first, then cookie fallback.
- **Integrations**: Stripe (payments), Resend (email), Claude AI (intelligence cards), Emergent-managed Google Auth, Google Gmail APIs

## Domain Setup
- **Landing**: `capymatch.com` -> readdy.ai marketing site
- **App**: `app.capymatch.com` -> Emergent-hosted CRM app
- **Preview**: `volleyball-crm.preview.emergentagent.com` -> dev/preview

## What's Been Implemented

### Completed Features
1. AI-powered school matching & intelligence cards (Claude via Emergent LLM Key)
2. Multi-stage recruiting pipeline with expandable cards
3. Full Stripe subscription system (Pro/Premium tiers, checkout, webhooks, billing page)
4. Emergent-managed Google Auth + email/password login
5. University Knowledge Base with scraped real data + background refresh jobs
6. Trust & Safety UI features (source-aware AI reasoning)
7. Commitment Stability Index, Match Risk Badges, Timeline Intelligence, Roster Reality, Scholarship Composition, NIL Readiness
8. Data contribution feature ("Improve this card")
9. School detail pages (/school/:domain)
10. Recruiting Journey page (complete UX/UI overhaul)
11. Hero card for commitments
12. Login/signup redesign (Notion-style)
13. Admin area with user management
14. Per-school notes via NotesSidebar
15. Athlete profile management (name/email updates)
16. Pre-launch system audit completed
17. Pipeline UI Redesign -- Rich expandable cards, progress ring, hero card
18. Bearer token auth for cross-domain support
19. Mobile sidebar overlay fix
20. Google OAuth + Login production fix (load_dotenv override fix)
21. CORS cleanup + MongoDB timeout
22. Darker teal color scheme (#2ec4b6 -> #1a8a80)
23. Mobile-friendly Gmail consent modal & Athlete profile quiz
24. Questionnaire Tracking (Feb 24, 2026)
25. Follow-Up Reminder Hero Card (Feb 24, 2026)
26. Upcoming Follow-Up Reminder (Feb 25, 2026)
27. Admin Contribution Review Dashboard (Feb 25, 2026)
28. Pipeline Card Redesign (Feb 25, 2026)
29. PWA Implementation (Feb 25, 2026) -- Full Progressive Web App
30. Gmail History Import - Backend (Feb 25, 2026) -- Domain mapper, header scanner, rule engine, idempotent APIs
31. Gmail History Import - Frontend (Feb 25, 2026) -- Full GmailImportModal with 4 states, Settings page integration, Imported badge
32. **Gmail Import Enrichment (Feb 25, 2026)** -- Confirm endpoint now auto-creates coach entries from KB (head coach + coordinator) + discovered .edu emails from Gmail scan. Sets `domain` field on imported programs. Coach deduplication prevents duplicates. Journey page auto-populates timeline from Gmail conversations with discovered coaches. Bug fix: consistent tenant_id resolution across all import endpoints.

## Key DB Schema (Gmail Import)
- `school_domain_aliases`: { domain, school_id (university_name), source, confidence }
- `import_runs`: { run_id, user_id, status, suggestions: [{ ..., discovered_emails: [] }], confirmed_school_ids: [] }
- `programs`: includes `domain`, `imported_at`, `import_run_id` for imported schools
- `coaches`: Auto-created for imported schools from KB data + discovered emails

## Key API Endpoints (Gmail Import)
- `POST /api/gmail/import-history`: Triggers a new Gmail scan
- `GET /api/gmail/import-history/{run_id}/status`: Polls for scan progress and results
- `POST /api/gmail/import-history/{run_id}/confirm`: Confirms selections, creates programs + coaches

## How Imported Schools Display
Imported schools display identically to manually-added ones:
- **Pipeline Board**: Shows with university logo (via domain), Imported badge (7 days), all standard fields
- **Journey Page**: Full timeline populated from Gmail (via auto-created coach emails), progress rail, coaches panel, follow-up alerts
- **School Intelligence**: Works via domain field for /school/:domain navigation

## Pending Issues
- **P2**: NCAA Timeline colors (recurring 5+ times, cosmetic)
- **P2**: Dead links for school recruiting questionnaires

## Prioritized Backlog

### P2
- Full NIL transaction/payment platform
- Separate Girls/Boys Volleyball data models
- Email templates & bulk outreach functionality
- Camp/Tournament ROI tracker
- Family Collaboration Roles
- Fix dead links for school recruiting questionnaires
- Re-run bulk discovery scraper for questionnaire URLs

### Refactoring
- Consolidate overlapping AccountPage / SettingsPage
- Consider migrating from university_name key to stable school_id

## Credentials
- **Demo User**: demo@capymatch.com / demo2026
- **Admin User**: douglas@yeslms.com (Google auth)

## 3rd Party Integrations
- Stripe (payments)
- Resend (forgot password emails)
- Claude AI via Emergent LLM Key (intelligence cards)
- Emergent-managed Google Auth
- Google Gmail APIs (read/write/history import)
- tldextract (backend domain parsing)
