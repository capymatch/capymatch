# CapyMatch PRD

## Original Problem Statement
Public-facing Volleyball Recruiting CRM ("CapyMatch") — a decision-support system for student-athletes providing data-driven insights for college recruiting.

## Architecture
- **Frontend**: React + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB (Motor async)
- **Auth**: Emergent-managed Google OAuth + email/password
- **AI**: Claude via Emergent LLM Key
- **Payments**: Stripe
- **Email**: Resend + Gmail API
- **PDF**: reportlab (via coach_card._build_pdf)
- **Scraping**: Playwright (social links)

## Credentials
- **Demo User**: demo@capymatch.com / demo2026
- **Admin User**: douglas@yeslms.com (Google auth)

## What's Implemented (as of Mar 2, 2026)
- Full recruiting board with stages, signals, next-step suggestions
- Gmail integration (read-only + send, import history)
- AI intelligence cards with source-aware reasoning
- Stripe subscription (Free/Pro/Premium)
- Admin dashboard
- School detail pages with match scores, risk badges, timelines
- Knowledge base with 1053 schools
- Onboarding questionnaire with matching
- Privacy Policy & Terms of Service
- **Public Athlete Profile (Complete - replaces Coach Card)**:
  - Shareable public URL at /p/:slug (light theme)
  - View-tracking analytics (total views, unique visitors, 7-day chart)
  - PDF download at /api/p/{slug}/pdf
  - Visibility toggles (measurables, academics, schedule, videos, contact)
  - ProfileSharing component on /profile page with Copy Link, Preview, PDF buttons
  - "Send Profile to Coach" on Journey page with email pre-fill
  - Schedule CRUD + bulk + AI parsing (retained from Coach Card)
- **Non-Gmail User Support**:
  - Gmail nudge banner on Journey timeline
- **Social Links for D1 Schools**:
  - Playwright scraper extracted social links from 328/348 D1 school athletics pages (94% coverage)
  - 250 schools have volleyball-specific handles (VB, volleyball, vball)
  - Displays X, Instagram, Facebook, YouTube, TikTok icons in Journey page header
  - Data stored in university_knowledge_base.social_links field

## Key DB Collections
- `athlete_profiles` (includes public_slug, visibility toggles, profile_view_count)
- `profile_views` (slug, tenant_id, viewed_at, user_agent, referer, visitor_hash)
- `schedule_events` (tournament/camp schedule)
- `university_knowledge_base` (school data including social_links)

## Key API Endpoints
- Public Profile: GET /api/p/{slug}, POST /api/p/{slug}/view, GET /api/p/{slug}/pdf
- Sharing Settings: GET/PUT /api/athlete-profile/sharing
- Analytics: GET /api/athlete-profile/analytics
- Schedule: GET/POST/PUT/DELETE /api/schedule/*
- Programs: GET /api/programs/{program_id} (includes social_links from KB)

## Upcoming Tasks (P1)
- Manual Email Logging for non-Gmail users
- Camp Data Integration for universities
- Scrape D2/D3 social media links
- Codebase cleanup: remove obsolete Coach Card references (coach_card.py still needed for _build_pdf)

## Backlog (P2/Future)
- Microsoft Outlook/365 email import
- Full NIL transaction platform
- Separate Girls/Boys volleyball data
- Email templates & bulk outreach
- Camp/Tournament ROI tracker
- Family Collaboration Roles
- Redesign "Find Schools" page
- Social links scrape for D2/D3 schools
- Admin tool to manually correct social handles
