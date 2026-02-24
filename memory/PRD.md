# CapyMatch PRD

## Original Problem Statement
CapyMatch is a public-facing Volleyball Recruiting CRM evolving into a sophisticated decision-support system for student-athletes. The core goal is to provide data-driven insights to navigate the complexities of college recruiting, featuring a three-stage AI pipeline to generate reliable, source-aware intelligence for UI cards.

## Core Architecture
- **Frontend**: React (CRA) + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python) + MongoDB
- **Auth**: Bearer token (localStorage). Backend checks Authorization header first, then cookie fallback.
- **Integrations**: Stripe (payments), Resend (email), Claude AI (intelligence cards), Emergent-managed Google Auth

## Domain Setup
- **Landing**: `capymatch.com` → readdy.ai marketing site
- **App**: `app.capymatch.com` → Emergent-hosted CRM app
- **Preview**: `volleyball-crm.preview.emergentagent.com` → dev/preview
- API calls use `REACT_APP_BACKEND_URL` (preview URL) as base, works cross-origin via Bearer tokens

## What's Been Implemented

### Completed Features
1. AI-powered school matching & intelligence cards (Claude via Emergent LLM Key)
2. Multi-stage recruiting pipeline with expandable cards (REDESIGNED Feb 2026)
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
13. Branding: Tab title "CapyMatch | Your Recruiting Journey"
14. Admin area with user management
15. Per-school notes via NotesSidebar
16. Athlete profile management (name/email updates)
17. Pre-launch system audit completed
18. Pipeline UI Redesign (Feb 24, 2026) — Rich expandable cards, progress ring, hero card
19. Bearer token auth for cross-domain support (Feb 24, 2026)
20. Mobile sidebar overlay fix (Feb 24, 2026)
21. Google OAuth CORS fix (Feb 24, 2026) — Removed invalid credentials+wildcard CORS combo

### Auth System (Updated Feb 24, 2026)
- Backend returns `session_token` in register/login/OAuth exchange responses
- Frontend stores token in `localStorage`, sends as `Authorization: Bearer <token>`
- Backend `get_current_user()` checks Bearer header first, then falls back to cookies
- CORS: `allow_credentials=False`, `allow_origins=["*"]` — compatible with infrastructure proxy
- No more `set_cookie()` in auth endpoints (cleaned up Feb 24, 2026)

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

### Refactoring
- Consolidate overlapping AccountPage / SettingsPage
