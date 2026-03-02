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
10. Coach Card — shareable, always-current, coach-ready package per school
11. Non-Gmail user support — manual interaction logging feeds follow-up signals, Gmail nudge banner

## Architecture
- **Frontend**: React + TailwindCSS + Shadcn/UI (lazy-loaded pages)
- **Backend**: FastAPI + MongoDB (Motor async)
- **Auth**: Emergent-managed Google OAuth + email/password
- **AI**: Claude via Emergent LLM Key
- **Payments**: Stripe
- **Email**: Resend (password reset), Gmail API (user emails)
- **PDF**: reportlab (Coach Card PDF generation)

## Credentials
- **Demo User**: demo@capymatch.com / demo2026
- **Admin User**: douglas@yeslms.com (Google auth, also demo2026 in preview)

## What's Implemented (as of Mar 2, 2026)
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
- Privacy Policy & Terms of Service public pages
- Gmail credential management & token revocation
- **Coach Card Feature (Complete)**:
  - Schedule CRUD + bulk creation + AI-powered schedule parsing
  - Coach Card config per school (coach note, featured video, visibility toggles)
  - Auto-generated slugs, public shareable page at /card/:slug (light theme)
  - PDF generation at /api/card/{slug}/pdf
  - Featured clip selector (radio buttons for existing videos + custom URL)
  - Send to Coach email with pre-filled subject/body
  - View analytics (total/unique counts, 7-day bar chart, last viewed)
- **Non-Gmail User Support**:
  - Manual interaction logging (existing LogInteractionForm) feeds into follow-up signals
  - Gmail nudge banner on Journey page timeline section when Gmail not connected
  - "Connect Gmail" link directs to Settings page

## Key DB Collections (Coach Card)
- `schedule_events`: `{ event_id, tenant_id, name, start_date, end_date, location, division, jersey_number, notes, created_at }`
- `coach_cards`: `{ tenant_id, program_id, coach_note, featured_video, show_schedule, show_academics, show_measurables, show_videos, slug, view_count, updated_at }`
- `coach_card_views`: `{ slug, tenant_id, viewed_at, user_agent, referer, visitor_hash }`

## Key API Endpoints (Coach Card)
- `GET, POST /api/schedule` — List/create schedule events
- `PUT, DELETE /api/schedule/{event_id}` — Update/delete event
- `POST /api/schedule/bulk` — Bulk add events
- `POST /api/schedule/parse` — AI-powered text parsing to events
- `GET, PUT /api/coach-card/{program_id}` — Get/update coach card config
- `GET /api/coach-card/{program_id}/analytics` — View analytics (auth required)
- `GET /api/card/{slug}` — Public coach card data (no auth)
- `GET /api/card/{slug}/pdf` — Download 1-page PDF (no auth)
- `POST /api/card/{slug}/view` — Record view (no auth, fire-and-forget)

## Backlog (P2/Future)
- Microsoft Outlook/365 email import
- Full NIL transaction platform
- Separate Girls/Boys volleyball data
- Email templates & bulk outreach
- Camp/Tournament ROI tracker
- Family Collaboration Roles
- Redesign "Find Schools" page
- Fix dead links for school recruiting questionnaires (recurring maintenance)
