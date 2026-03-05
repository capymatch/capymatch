# CapyMatch – Volleyball Recruiting CRM

## Product Overview
CapyMatch is a full-stack React/FastAPI volleyball recruiting CRM that helps athletes track and manage their college recruiting pipeline.

## Core Features (Implemented)
- **Pipeline Board**: Kanban-style board to track school recruiting status
- **School Info Pages**: Detailed school profiles with academic, financial, admissions, coaching staff data
- **Social Spotlight**: Tabbed YouTube/Twitter feed for pipeline schools
- **Gmail Import**: OAuth-based email import for tracking coach communications
- **AI Assistant**: Claude-powered AI for recruiting advice
- **Athlete Profile**: Public shareable profile for coaches to view
- **Stripe Payments**: Subscription management
- **Monthly Coach Data Refresh**: Automated monthly re-scraping of coaching data with email change reports
- **Engagement Tracking System**: Email opens, link clicks, profile views
  - Dashboard "Who's Watching" widget
  - Pipeline card engagement badges
  - **Journey page**: Unified Coaches card with stats strip + inline email badges with hover tooltips (Mar 5, 2026)

## Journey Page Architecture
- **Unified Coaches Card** (right sidebar):
  - Header with staff health badge (Stable/Change)
  - Engagement stats strip (Opens/Clicks/Unique)
  - Staff change alert (when detected)
  - Coach list with edit/delete
  - Head coach social links from KB
- **Timeline** (left 2/3):
  - Sent email bubbles show engagement badge (eye icon + count) in top-right corner
  - Hover badge to see tooltip: who opened, who clicked, when
  - Badge matching: Gmail emails match by subject; logged emails match by content keywords
  - Orphaned link_clicks (no subject) included when opens are matched
- **Removed**: Old "At a Glance" card, standalone "Coach Engagement Tracker", standalone "Coaching Staff Social Media" section, "Recent Activity" list in sidebar

## Architecture
- **Frontend**: React (CRA) + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI + Motor (async MongoDB)
- **Database**: MongoDB Atlas (capymatch DB)

## Key DB Schema
- **`university_knowledge_base`**: `coaching_staff: [{name, role, email, email_verified}]`
- **`engagement_events`**: `{user_id, school_id, event_type, email_subject, coach_email, created_at}`

## Key API Endpoints
- `GET /api/engagement/school/{program_id}` — Per-school engagement (total_opens, total_clicks, unique_opens, timeline)
- `GET /api/programs/{program_id}/journey` — Timeline with interactions + Gmail emails
- `GET /api/track/open/{tracking_id}` — Pixel tracking endpoint
- `GET /api/track/click/{tracking_id}` — Link click tracking endpoint

## Upcoming Tasks (P1)
- Manual Email Logging: UI for non-Gmail users to manually log emails
- Camp Data Integration: Add camp_url to knowledge base

## Backlog (P2)
- Microsoft Outlook/365 Import
- Email templates & bulk outreach
- Redesign "Find Schools" page
- Fix duplicate YouTube URLs for similarly-named schools
- Full NIL transaction/payment processing
- Separate Girls/Boys Volleyball data models

## 3rd Party Integrations
- Google YouTube Data API v3, Anthropic Claude (Emergent LLM Key), Google APIs (Gmail OAuth), Resend, Stripe, Playwright, MongoDB Atlas, APScheduler, BeautifulSoup4
