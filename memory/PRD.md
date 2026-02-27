# CapyMatch PRD

## Original Problem Statement
Public-facing Volleyball Recruiting CRM ("CapyMatch") — a decision-support system for student-athletes providing data-driven insights for college recruiting. Features a three-stage AI pipeline for source-aware intelligence.

## User Personas
- **Student Athletes**: Navigate college recruiting with data-driven insights
- **Admin (Douglas)**: Manages platform, reviews contributions, monitors analytics

## Core Requirements
1. Dynamic Recruiting Board
2. University Knowledge Base (1053 schools)
3. Mobile-friendly responsive design
4. Admin Area with analytics
5. Subscription Engine with Stripe
6. AI-powered suggestions
7. Gmail integration (read-only scan + send emails)
8. Follow-up automation system
9. School detail pages with intelligence cards

## Architecture
- **Frontend**: React + TailwindCSS + Shadcn/UI (lazy-loaded pages)
- **Backend**: FastAPI + MongoDB (Motor async)
- **Auth**: Emergent-managed Google OAuth + email/password
- **AI**: Claude via Emergent LLM Key
- **Payments**: Stripe
- **Email**: Resend (password reset), Gmail API (user emails)

## Credentials
- **Demo User**: demo@capymatch.com / demo2026
- **Admin User**: douglas@yeslms.com (Google auth, also demo2026 in preview)

## What's Implemented (as of Feb 26, 2026)
- Full recruiting board with stages, signals, next-step suggestions
- Gmail integration (read-only + send, import history)
- AI intelligence cards with source-aware reasoning
- Stripe subscription (Free/Pro/Premium)
- Admin dashboard (users, contributions, import analytics)
- School detail pages with match scores, risk badges, timelines
- Knowledge base with 1053 schools (server-side pagination)
- Onboarding questionnaire with matching
- Delete account functionality
- Performance optimizations (40+ indexes, lazy loading, batch queries)
- **P0 Fix: Dashboard resilience** — All 6 API calls have individual .catch() handlers
- **P0 Fix: Name display** — Dashboard greeting uses authUser.name from Outlet context
- **P0 Fix: Gmail Admin UI** — Admin Integrations page for Gmail OAuth credential management
- **P0 Fix: Gmail credentials updated** — New OAuth client credentials (576814...) configured in .env and DB, verified working with Google (Feb 26, 2026)
- **P0 Fix: Gmail token revocation** — Disconnect endpoint now calls Google's revoke API before deleting tokens locally
- **Domain mapper KB fallback** — Import scan now checks university_knowledge_base.domain as fallback when school_domain_aliases has no match
- **Import confirm domain resolution** — Confirm endpoint resolves domains to schools via KB lookup for previously unmapped items
- **Import review checkboxes** — "Needs Review" items are now selectable (not disabled), allowing users to select and attempt import
- **Privacy Policy page** — Full legal privacy policy at /privacy, publicly accessible without login
- **Terms of Service page** — Full legal ToS at /terms, publicly accessible without login

## Pending Issues
- Dead questionnaire links (P2)

## IMPORTANT: Production Deployment Note
- The `.env` has updated Gmail credentials that will deploy automatically
- However, the **production database** may still have old credentials cached in `app_config` collection
- After deploying, admin should go to Admin -> Integrations and re-enter the new credentials there, OR the .env fallback will be used if no DB config exists

## Backlog (P2/Future)
- Full NIL transaction platform
- Separate Girls/Boys volleyball data
- Email templates & bulk outreach
- Camp/Tournament ROI tracker
- Family Collaboration Roles
- Redesign "Find Schools" page
- Private per-school notes feature
