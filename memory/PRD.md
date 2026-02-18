# Volleyball Recruiting CRM — Product Requirements Document

## Original Problem Statement
Build a public-facing Volleyball Recruiting CRM with dynamic recruiting board, university knowledge base, mobile-friendly design, admin area, subscription engine, and AI-powered recruiting assistance.

## Target Audience
High School Volleyball Athletes & Families

## Core Requirements
1. Dynamic Recruiting Board with custom, parent-friendly grouping
2. University Knowledge Base with logos
3. Mobile-friendly responsive design
4. Full-app visual redesign (dark theme with pink/coral accents)
5. Admin Area (User, University, Subscription, Integration Management)
6. Subscription Engine with feature gating (Starter, Pro, Premium)
7. Stripe integration for payments
8. AI-powered "Next Step" suggestions
9. Separate Girls/Boys volleyball data
10. UX/UI overhaul of Recruiting Journey page
11. Rule-based "What's Next?" prompts
12. File attachments for emails
13. Celebratory hero card for commitments
14. Private per-school notes
15. Automated follow-up system
16. Dashboard redesign for daily actions
17. University logos for Knowledge Base
18. College Scorecard integration for admissions data

## Tech Stack
- Frontend: React + Tailwind + Shadcn/UI
- Backend: FastAPI + MongoDB
- Auth: Emergent-managed Google Auth, JWT
- AI: Anthropic Claude Sonnet 4.5 (Emergent LLM Key)
- Icons: Lucide React
- Product Tour: react-joyride

## 3rd Party Integrations
- Emergent-managed Google Auth (Gmail API) — WORKING
- Anthropic Claude Sonnet 4.5 (Emergent LLM Key)
- react-joyride (Product Tour)
- lucide-react (Icons)
- Stripe (Payments) — requires User API Key
- Resend (Email Notifications) — requires User API Key
- beautifulsoup4 / lxml (Web Scraping for Coach Watch)
- icon.horse API (University logos)
- Google Favicon API (Fallback logos)
- **College Scorecard API** (US Dept of Education) — WORKING, key configured

## What's Been Implemented

### Completed in This Session (Feb 18, 2026)
- **Journey Card Dark + Pink theme**: Applied `#1e1e2e` charcoal bg with `#e8456b` pink accents to Journey header card and progress rail
- **Dashboard Hero Dark + Pink theme**: Applied matching dark theme to dashboard greeting card and PulseStat components
- **Darker pink accents on Journey page**: Deepened all pink from `pink-500` to `pink-700` across timeline, labels, badges
- **What's Next card dark theme**: Applied `#1e1e2e` bg with white text and pink accents
- **Theme toggle**: Added sun/moon button in top-right header for light/dark mode switching
- **Progress Ring fix**: Replaced broken SVG stroke-dash approach with CSS conic-gradient donut chart — distinct colors per stage (Red=Overdue, Pink=Outreach, Amber=Waiting, Green=In Conversation, Gray=Archived)
- **Journey page performance**: Parallelized 7 API calls (was 3 parallel + 4 sequential), ~4x faster load
- **Sidebar reorder**: Moved "Find Schools" above "Calendar"
- **College Scorecard integration**: Backend routes for search/sync/key-management, admin UI card with sync button

### Design System
- **Primary accent**: `#e8456b` / `#be185d` (pink-700)
- **Dark card background**: `#1e1e2e` (charcoal)
- **Key cards use Dark + Pink theme**: Pipeline Hero, Journey Header, Dashboard Hero, What's Next
- Minimalist palette: charcoal, brand pink, urgent red, success green
- Theme toggle in header (light/dark mode)

## Prioritized Backlog

### P1 — Upcoming
- Display scorecard data on school detail / Knowledge Base pages
- Separate Girls/Boys Volleyball data architecture
- Camp/Tournament ROI tracker
- Email templates & bulk outreach

### P2 — Future
- Build Marketing Website
- Tiered Celebrations (milestones beyond first reply)
- App Naming
- Multi-sport capability
- Family Collaboration Roles (read-only Parent/Viewer role)

## Test Accounts
- **Pro User**: `pro@test.com` / `password`
- **Google Auth User (Demo Data)**: `douglas@yeslms.com`

## Key Files
- `/app/frontend/src/pages/RecruitingBoard.js` — Pipeline page
- `/app/frontend/src/pages/RecruitingJourney.js` — Journey page
- `/app/frontend/src/pages/Dashboard.js` — Main dashboard
- `/app/frontend/src/pages/AdminIntegrations.js` — Admin integrations
- `/app/frontend/src/components/Layout.js` — App layout + theme toggle
- `/app/backend/routes/college_scorecard.py` — College Scorecard API routes
- `/app/backend/routes/admin_integrations.py` — Admin integrations backend
