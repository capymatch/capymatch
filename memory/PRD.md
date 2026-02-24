# CapyMatch PRD

## Original Problem Statement
CapyMatch is a public-facing Volleyball Recruiting CRM evolving into a sophisticated decision-support system for student-athletes. The core goal is to provide data-driven insights to navigate the complexities of college recruiting, featuring a three-stage AI pipeline to generate reliable, source-aware intelligence for UI cards.

## Core Architecture
- **Frontend**: React (CRA) + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python) + MongoDB
- **Auth**: Session-based (cookies) + Emergent-managed Google Auth
- **Integrations**: Stripe (payments), Resend (email), Claude AI (intelligence cards)

## What's Been Implemented

### Completed Features
1. **AI-powered school matching & intelligence cards** (Claude via Emergent LLM Key)
2. **Multi-stage recruiting pipeline** with expandable cards (REDESIGNED Feb 2026)
3. **Full Stripe subscription system** (Pro/Premium tiers, checkout, webhooks, billing page)
4. **Emergent-managed Google Auth** + email/password login
5. **University Knowledge Base** with scraped real data + background refresh jobs
6. **Trust & Safety UI features** (source-aware AI reasoning)
7. **Commitment Stability Index, Match Risk Badges, Timeline Intelligence, Roster Reality, Scholarship Composition, NIL Readiness**
8. **Data contribution feature** ("Improve this card")
9. **School detail pages** (/school/:domain)
10. **Recruiting Journey page** (complete UX/UI overhaul)
11. **Hero card for commitments**
12. **Login/signup redesign** (Notion-style)
13. **Branding**: Tab title "CapyMatch | Your Recruiting Journey"
14. **Admin area** with user management
15. **Per-school notes** via NotesSidebar
16. **Athlete profile management** (name/email updates)
17. **Pre-launch system audit** completed
18. **Pipeline UI Redesign** (Feb 24, 2026) - Rich expandable cards, collapsible sections, filter chips, view toggle

### Pipeline UI Redesign (Latest - Feb 24, 2026)
- Replaced simple pipeline rows with rich, expandable card design
- 4 sections: Needs Outreach (teal), Waiting on Reply (amber), In Conversation (green), Committed (gold)
- Compact/Expanded view toggle
- Filter chips: All, Outreach, Waiting, In Convo, Committed
- Expandable cards show: Coach info, Match Score with progress bar, Outreach stats, Timeline (lazy-loaded)
- Removed "Mark as Replied" button per user request
- Collapsible section headers
- Mobile responsive (stats hidden, icon-only buttons)
- 100% test pass rate (14/14 tests)

## Pending Issues
- **P2**: NCAA Timeline colors (recurring 4+ times, cosmetic)
- **P2**: Dead links for school recruiting questionnaires

## Prioritized Backlog

### P1
- Admin Dashboard for Contribution Review (approve/reject user data contributions)

### P2
- Full NIL transaction/payment platform
- Separate Girls/Boys Volleyball data models
- Email templates & bulk outreach
- Camp/Tournament ROI tracker
- Family Collaboration Roles
- Dev/staging environment setup
- Dead links handling (report broken link feature)
- Consolidate AccountPage/SettingsPage overlap

## Key Data Models
- **tenants**: stripe_customer_id, stripe_subscription_id, plan_status, plan_renews_at
- **programs**: university_name, domain, division, conference, recruiting_status, board_group, signals, primary_coach, coach_email
- **transactions**: user_id, stripe_session_id, amount, plan, status
- **interactions**: tenant_id, program_id, type, date_time, notes
- **coaches**: tenant_id, program_id, coach_name, email, role

## Key API Endpoints
- `GET /api/programs` - List programs (optional ?grouped=true)
- `GET /api/programs/:id` - Get single program
- `GET /api/match-scores` - Get match scores
- `GET /api/interactions` - List interactions (optional ?program_id=X)
- `POST /api/stripe/create-checkout-session` - Stripe checkout
- `POST /api/stripe/webhook` - Stripe webhook
- `GET /api/stripe/billing-history` - Billing history
- `POST /api/stripe/cancel-subscription` - Cancel subscription

## Credentials
- Demo: demo@capymatch.com / demo2026
- Admin: douglas@yeslms.com (Google auth)
