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
- **Engagement Tracking**: Email opens, link clicks, profile views — with Dashboard widget, Pipeline badges, and Journey timeline

## Architecture
- **Frontend**: React (CRA) + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI + Motor (async MongoDB)
- **Database**: MongoDB Atlas (capymatch DB)
- **Hosting**: Kubernetes preview environment

## Engagement Tracking System
### How it works:
1. **Email Open Tracking**: 1x1 transparent pixel injected into all outgoing emails via Gmail integration. When email client loads the pixel, it records an open event.
2. **Link Click Tracking**: All links in outgoing emails are wrapped with tracked redirect URLs. When coach clicks a link, it logs the click and redirects to the destination.
3. **Profile View Tracking**: Already existed via `/api/p/{slug}/view`. Enhanced to feed into engagement summary.

### Endpoints:
- `GET /api/track/open/{tracking_id}` — Public pixel endpoint (returns 1x1 GIF)
- `GET /api/track/click/{tracking_id}` — Public redirect endpoint (302 to destination)
- `GET /api/engagement/summary` — Authenticated: totals, feed, hot_leads, by_school
- `GET /api/engagement/school/{program_id}` — Authenticated: per-school engagement details

### Collections:
- `email_tracking`: Records for each tracked email (tracking_id, tenant_id, program_id, coach_email, subject)
- `link_tracking`: Records for each tracked link (tracking_id, destination_url, email_tracking_id)
- `engagement_events`: All tracking events (event_type: email_open | link_click | profile_view)

### Frontend:
- **Dashboard "Who's Watching"**: Shows Email Opens, Link Clicks, Profile Views stats + Hot Leads + Activity Feed
- **Pipeline Card Badges**: Green engagement badges showing opens/clicks for each school
- **Journey Page Tracker**: Detailed engagement timeline for individual school

## Key DB Schema: `university_knowledge_base`
- `coaching_staff`: [{name, role, email, email_verified}]
- `coaching_staff_pr`: [{name, role, email_likely}]
- `coaches_scraped`: [{name, title, email}]
- `primary_coach`, `coach_email`
- `scorecard`, `campus_diversity`, `social_links`

## Coaching Data Coverage (as of Mar 4, 2026)
- 1053 total schools (D1: 348, D2: 284, D3: 421)
- 939 schools (89%) have coaching staff with real names from PR
- 374 schools (35%) have verified emails
- 1032 schools (98%) have coach email (verified or generated)

## Monthly Coach Refresh System
- Schedule: 1st of each month at 3 AM UTC
- 3-phase pipeline: PR → email matching → athletics scraping
- Detailed email report to douglas@capymatch.com via Resend
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

## 3rd Party Integrations
- Google YouTube Data API v3
- Anthropic Claude (via Emergent LLM Key)
- Google APIs (Gmail OAuth)
- Resend (transactional email + monthly reports)
- Stripe (payments)
- Playwright (web scraping)
- MongoDB Atlas
