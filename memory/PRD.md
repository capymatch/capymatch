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
- **PDF**: reportlab
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
- **Coach Card Feature (Complete)**:
  - Schedule CRUD + bulk + AI parsing
  - Per-school config (coach note, featured video selector, visibility toggles)
  - Public shareable page at /card/:slug (light theme)
  - PDF generation at /api/card/{slug}/pdf
  - Send to Coach email with pre-filled content
  - View analytics (total/unique, 7-day chart, last viewed)
- **Non-Gmail User Support**:
  - Manual logging feeds follow-up signals
  - Gmail nudge banner on Journey timeline
- **Social Links for D1 Schools**:
  - Playwright scraper extracted social links from 328/348 D1 school athletics pages (94% coverage)
  - 250 schools have volleyball-specific handles (VB, volleyball, vball)
  - Displays X, Instagram, Facebook, YouTube, TikTok icons in Journey page header
  - Data stored in university_knowledge_base.social_links field
  - Note: Some large schools with both men's/women's programs may show men's VB handles

## Key DB Collections
- `schedule_events`, `coach_cards`, `coach_card_views` (Coach Card)
- `university_knowledge_base.social_links` (social media URLs per school)

## Key API Endpoints
- Schedule: GET/POST/PUT/DELETE `/api/schedule/*`
- Coach Card: GET/PUT `/api/coach-card/{program_id}`, GET `/api/card/{slug}`, GET `/api/card/{slug}/pdf`, POST `/api/card/{slug}/view`
- Analytics: GET `/api/coach-card/{program_id}/analytics`
- Programs: GET `/api/programs/{program_id}` (now includes social_links from KB)

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
