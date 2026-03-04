# CapyMatch — Product Requirements Document

## Original Problem Statement
A public-facing Volleyball Recruiting CRM called "CapyMatch." Athletes use it to manage their college volleyball recruiting process — tracking schools, logging interactions, sending emails, and monitoring their pipeline.

## Target Users
- High school volleyball athletes actively recruiting for college programs
- Coaches/staff reviewing athlete profiles (via public-facing profile links)

## Core Architecture
- **Frontend**: React (CRA), Tailwind CSS, Shadcn UI
- **Backend**: FastAPI (Python), MongoDB Atlas (persistent cloud DB)
- **Auth**: JWT-based custom auth + Google OAuth (Gmail import)
- **Integrations**: Anthropic Claude (AI features), Resend (email), Stripe (payments), Google APIs (Gmail import)

---

## What's Been Implemented

### Database & Infrastructure
- **[2025] MongoDB Atlas Migration**: Migrated from ephemeral local Docker to persistent Atlas M0 Free Tier. Data survives deployments.

### Data Enrichment
- **[2025] Social Media Scraping**: Scraped social links for schools (D1, D2, D3) and 751 individual coaches using Playwright.
- **[Mar 2026] Social Spotlight — Live Feed (YouTube)**: Real YouTube videos from pipeline schools displayed in a 3-column grid for Pro/Premium users. Backed by `GET /api/social-spotlight/feed` (batch KB lookup → YouTube Data API v3 → 6-hour MongoDB cache). Basic users see blurred preview + upgrade CTA. Google API key stored in `backend/.env` as `YOUTUBE_API_KEY`.
- New collection: `coaches_scraped` stores `{ school_id, coach_name, social_links }`.

### Features
- **Public Athlete Profile**: Full public-facing profile page with schedule, stats, highlights.
- **Recruiting Board / My Schools** (`/pipeline`): Kanban-style pipeline with Hero Card, filter chips, compact/expanded view.
  - Hero Card shows most urgent school with advice, action button, **and social media icons** [Added Mar 2026].
  - Pipeline cards show school social icons (X, Instagram, Facebook, YouTube).
- **Journey Page** (`/journey/:id`): Detailed per-school recruiting journey with interaction log, coach info, coaching staff social links section (isolated `CoachSocialLinks.js` component).
- **Dashboard**: Stats, school spotlight, pipeline snapshot, recent activity.
- **AI Features**: AI assistant drawer, highlight advisor, outreach analysis, NIL readiness.
- **Gmail Import**: OAuth-based email import for Gmail users.
- **Calendar**: Recruiting events calendar.
- **Find Schools / Knowledge Base**: Browse/search 1000+ schools.

### UI/UX Improvements
- Removed donut chart from "My Schools" for cleaner look.
- Simplified Profile Page to single-column layout.
- Fixed mobile notification dropdown CSS overflow bug.
- Hero Card and Pipeline cards now both show social media icons for consistency.

---

## Prioritized Backlog

### P0 — In Progress / Immediate
- ✅ Hero Card social media icons (DONE Mar 2026)

### P1 — Upcoming
- **Manual Email Logging**: UI on Journey page for non-Gmail users to manually log email interactions.
- **Camp Data Integration**: Add `camp_url` field to knowledge base; scrape and display university camp info in UI.
- **Re-scrape Missing Schools**: ~98 schools that failed during initial social media scraping passes.

### P2 — Backlog
- Microsoft Outlook/365 email import
- NIL transaction/payment processing platform
- Separate Girls/Boys Volleyball data models
- Email templates & bulk outreach functionality
- Redesign "Find Schools" page
- Consolidate scraper scripts into a single parameterized utility (`python scraper.py --division D2 --retry`)

---

## Key Technical Notes
- **Journey Page sensitivity**: `RecruitingJourney.js` is sensitive to changes. Always isolate new features into separate components with error handling (pattern: `CoachSocialLinks.js`).
- **Data may not exist for demo user**: Coach social links may not be present for Stanford. Test with "Abilene Christian University" for social data.
- **Scraping is done**: Do NOT re-run main scrapers unless explicitly requested.
- **All MongoDB responses**: Must exclude `_id` field to avoid JSON serialization errors.

## Credentials
- Demo user: `demo@capymatch.com` / `demo2026`
- DB: MongoDB Atlas (connection in `backend/.env`)
