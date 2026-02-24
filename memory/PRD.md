# CapyMatch PRD

## Original Problem Statement
CapyMatch is a public-facing Volleyball Recruiting CRM evolving into a sophisticated decision-support system for student-athletes. The core goal is to provide data-driven insights to navigate the complexities of college recruiting, featuring a three-stage AI pipeline to generate reliable, source-aware intelligence for UI cards.

## Core Architecture
- **Frontend**: React (CRA) + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python) + MongoDB (Motor async)
- **Auth**: Bearer token (localStorage). Backend checks Authorization header first, then cookie fallback.
- **Integrations**: Stripe (payments), Resend (email), Claude AI (intelligence cards), Emergent-managed Google Auth

## Domain Setup
- **Landing**: `capymatch.com` → readdy.ai marketing site
- **App**: `app.capymatch.com` → Emergent-hosted CRM app
- **Preview**: `volleyball-crm.preview.emergentagent.com` → dev/preview
- API calls use `REACT_APP_BACKEND_URL` (preview URL) as base

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
17. Pipeline UI Redesign — Rich expandable cards, progress ring, hero card
18. Bearer token auth for cross-domain support
19. Mobile sidebar overlay fix

### Recent Fixes (Feb 24, 2026)
20. **Google OAuth + Login production fix** — Fixed `load_dotenv(override=True)` overwriting Kubernetes production env vars, causing MongoDB to hang on production
21. **CORS cleanup** — Removed invalid `allow_credentials=True` + wildcard origin combo, removed leftover `set_cookie()` from auth endpoints
22. **MongoDB timeout** — Added `serverSelectionTimeoutMS=5000` to prevent infinite hangs
23. **Darker teal color scheme** — Changed accent from `#2ec4b6` to `#1a8a80` across entire app (Tailwind config override + global hex replace)
24. **Login page text darkened** — Inactive text bumped from gray-400 to gray-500
25. **Onboarding stepper darkened** — Inactive steps, labels, borders, connecting lines all darkened

### Auth System
- Backend returns `session_token` in register/login/OAuth exchange responses
- Frontend stores token in `localStorage`, sends as `Authorization: Bearer <token>`
- CORS: `allow_credentials=False`, `allow_origins=["*"]`
- `load_dotenv(override=False)` — preserves production Kubernetes env vars

## Pending Issues
- **P2**: NCAA Timeline colors (recurring 5+ times, cosmetic)
- **P2**: Dead links for school recruiting questionnaires

## Prioritized Backlog

### P1
- Admin Dashboard for Contribution Review (approve/reject user data contributions)

### P2
- Full NIL transaction/payment platform
- Separate Girls/Boys Volleyball data models
- Email templates & bulk outreach functionality
- Camp/Tournament ROI tracker
- Family Collaboration Roles
- N+1 query optimization in programs.py and dashboard.py

### Refactoring
- Consolidate overlapping AccountPage / SettingsPage

## Credentials
- **Demo User**: demo@capymatch.com / demo2026
- **Admin User**: douglas@yeslms.com (Google auth)
