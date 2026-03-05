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
- **Engagement Tracking**: Email opens, link clicks, profile views — with Dashboard widget, Pipeline badges, and Journey unified card
- **Journey Page UI Refactor (Mar 4, 2026)**: Consolidated At a Glance + Coach Engagement + Coaches panel into a single unified "Coaches" card

## Architecture
- **Frontend**: React (CRA) + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI + Motor (async MongoDB)
- **Database**: MongoDB Atlas (capymatch DB)
- **Hosting**: Kubernetes preview environment

## Engagement Tracking System
### How it works:
1. **Email Open Tracking**: 1x1 transparent pixel injected into all outgoing emails via Gmail integration
2. **Link Click Tracking**: All links wrapped with tracked redirect URLs
3. **Profile View Tracking**: Via `/api/p/{slug}/view`

### Endpoints:
- `GET /api/track/open/{tracking_id}` — Public pixel endpoint
- `GET /api/track/click/{tracking_id}` — Public redirect endpoint
- `GET /api/engagement/summary` — Dashboard totals, feed, hot_leads
- `GET /api/engagement/school/{program_id}` — Per-school engagement details

### Frontend Display:
- **Dashboard "Who's Watching"**: Stats + Hot Leads + Activity Feed
- **Pipeline Card Badges**: Engagement badges per school
- **Journey Unified Coaches Card**: Engagement stats strip + timeline embedded in coaches card

## Key DB Schema: `university_knowledge_base`
- `coaching_staff`: [{name, role, email, email_verified}]
- `coaching_staff_pr`, `coaches_scraped`, `primary_coach`, `coach_email`
- `scorecard`, `campus_diversity`, `social_links`

## Coaching Data Coverage
- 1053 total schools (D1: 348, D2: 284, D3: 421)
- 939 schools (89%) have coaching staff with real names
- 374 schools (35%) have verified emails

## Monthly Coach Refresh System
- Schedule: 1st of each month at 3 AM UTC
- Admin API: POST /api/admin/coach-refresh/trigger, GET /api/admin/coach-refresh/status

## Upcoming Tasks (P1)
- Manual Email Logging: UI for non-Gmail users to log emails
- Camp Data Integration: Add camp_url to knowledge base

## Backlog (P2)
- Microsoft Outlook/365 Import
- Full NIL transaction/payment processing
- Separate Girls/Boys Volleyball data models
- Email templates & bulk outreach
- Redesign "Find Schools" page
- Fix duplicate YouTube URLs for similarly-named schools

## 3rd Party Integrations
- Google YouTube Data API v3
- Anthropic Claude (via Emergent LLM Key)
- Google APIs (Gmail OAuth)
- Resend (transactional email + monthly reports)
- Stripe (payments)
- Playwright (web scraping)
- MongoDB Atlas
