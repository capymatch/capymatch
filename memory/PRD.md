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
20. Google OAuth + Login production fix (load_dotenv override fix)
21. CORS cleanup + MongoDB timeout
22. Darker teal color scheme (#2ec4b6 → #1a8a80)
23. Mobile-friendly Gmail consent modal & Athlete profile quiz
24. **Questionnaire Tracking** (Feb 24, 2026) — Questionnaire section on journey page with "Open Form" link and "Mark Complete" toggle. Pipeline board shows Form/Form done badge.
25. **Follow-Up Reminder Hero Card** (Feb 24, 2026) — Dark hero-style overdue follow-up alert at top of Journey page with "Send Email" and "Reschedule" actions. Shows days overdue count.
26. **Upcoming Follow-Up Reminder** (Feb 25, 2026) — Teal-themed heads-up banner for follow-ups due within 3 days. Shows "Due tomorrow" / "Due in X days" with same action buttons. Mutually exclusive with the overdue banner.

### Questionnaire Tracking Feature
- Backend: `PATCH /api/programs/{id}/questionnaire` toggles completion
- Backend: Programs enriched with `questionnaire_url` from `university_knowledge_base`
- Frontend Journey: Own section card with ExternalLink + CheckCircle toggle
- Frontend Pipeline: ClipboardCheck badge (amber pending / green done)
- Data: `questionnaire_completed`, `questionnaire_completed_at` on programs collection

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

## Credentials
- **Demo User**: demo@capymatch.com / demo2026
- **Admin User**: douglas@yeslms.com (Google auth)
