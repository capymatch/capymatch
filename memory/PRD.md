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
- College Scorecard API (US Dept of Education) — WORKING
- Stripe (Payments) — requires User API Key
- Resend (Email Notifications) — requires User API Key
- beautifulsoup4 / lxml (Web Scraping for Coach Watch)
- icon.horse API (University logos)

## What's Been Implemented

### Completed Feb 18, 2026 (Latest)
- **Coach Contact Scraper**: Complete web scraper for finding volleyball coach names, emails, and titles from university athletics websites
  - Handles JS-rendered pages by deriving names from email patterns (e.g., `ryan.mcguyre@baylor.edu` -> "Ryan Mcguyre")
  - Structured extraction for Sidearm Sports CMS (most common college athletics platform)
  - Athletics domain discovery from university homepages (e.g., stanford.edu -> gostanford.com)
  - Generic/department email filtering (volleyball@, tickets@, etc.)
  - Background task with progress tracking, force re-scrape option
  - Admin UI with "Find Coaches for Missing Schools" and "Re-scrape All" buttons
  - Coach data displayed on expanded school cards in Find Schools (Knowledge Base)
  - Endpoints: POST /api/admin/coach-scraper/scrape, GET /api/admin/coach-scraper/status, POST /api/admin/coach-scraper/scrape-one
  - Test suite: /app/backend/tests/test_coach_scraper.py

### Completed Earlier (Feb 18, 2026)
- Dark + Pink theme on Journey header, Dashboard hero, What's Next card
- Theme toggle (sun/moon) in header
- Progress Ring fix (CSS conic-gradient)
- Journey page 4x performance boost (parallelized API calls)
- Sidebar reorder (Find Schools above Calendar)
- **College Scorecard integration**: Full backend (search/sync-one/sync-all/key-management), admin card, scorecard data display on Knowledge Base school detail pages
- 15 popular schools pre-synced with admissions data

### Design System
- Primary accent: `#e8456b` / `#be185d` (pink-700)
- Dark card background: `#1e1e2e` (charcoal)
- Key cards use Dark + Pink theme: Pipeline Hero, Journey Header, Dashboard Hero, What's Next

## Prioritized Backlog

### P1 — Upcoming
- Separate Girls/Boys Volleyball data architecture
- Camp/Tournament ROI tracker
- Email templates & bulk outreach

### P2 — Future
- Build Marketing Website
- Tiered Celebrations
- App Naming, Multi-sport, Family Collaboration Roles

## Test Accounts
- Pro User: `pro@test.com` / `password`
- Google Auth User (Demo Data): `douglas@yeslms.com`

## Key Files
- `/app/frontend/src/components/FindSchools/SchoolGridCard.js` — School cards with scorecard display
- `/app/backend/routes/college_scorecard.py` — College Scorecard API routes
- `/app/backend/routes/admin_integrations.py` — Admin integrations
- `/app/frontend/src/pages/AdminIntegrations.js` — Admin integrations UI
- `/app/frontend/src/pages/RecruitingBoard.js` — Pipeline page
- `/app/frontend/src/pages/RecruitingJourney.js` — Journey page
- `/app/frontend/src/pages/Dashboard.js` — Dashboard
- `/app/frontend/src/components/Layout.js` — Layout + theme toggle
