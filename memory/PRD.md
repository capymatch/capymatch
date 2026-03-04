# CapyMatch – Volleyball Recruiting CRM

## Product Overview
CapyMatch is a full-stack React/FastAPI volleyball recruiting CRM that helps athletes track and manage their college recruiting pipeline.

## Core Features (Implemented)
- **Pipeline Board**: Kanban-style board to track school recruiting status
- **School Info Pages**: Detailed school profiles with academic, financial, admissions, coaching staff data
- **Social Spotlight**: Tabbed YouTube/Twitter feed for pipeline schools
- **Gmail Import**: OAuth-based email import for tracking coach communications
- **AI Assistant**: Claude-powered AI for recruiting advice
- **Coach Cards**: Shareable athlete profile cards
- **Stripe Payments**: Subscription management
- **Monthly Coach Data Refresh**: Automated monthly re-scraping of coaching data with email change reports

## Architecture
- **Frontend**: React (CRA) + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI + Motor (async MongoDB)
- **Database**: MongoDB Atlas (capymatch DB)
- **Hosting**: Kubernetes preview environment

## Data Sources
- **College Scorecard API**: Academic/financial data
- **Productive Recruit**: Coach names, campus diversity, financial details
- **Official Athletics Websites**: Verified coach emails
- **YouTube Data API v3**: Video content for social feed

## Key DB Schema: `university_knowledge_base`
- `university_name`, `division`, `conference`, `region`, `domain`
- `coaching_staff`: [{name, role, email, email_verified}] — merged PR names + verified emails
- `coaching_staff_pr`: [{name, role, email_likely, email_patterns}] — raw PR data
- `coaches_scraped`: [{name, title, email}] — raw athletics site data
- `primary_coach`, `coach_email` — head coach summary fields
- `scorecard`: {graduation_rate, retention_rate, tuition_*, sat_avg, etc.}
- `campus_diversity`: {category: {students, faculty}}
- `social_links`: {youtube, twitter}
- `pr_slug`, `pr_state` — Productive Recruit identifiers

## Key DB Schema: `coach_refresh_runs`
- `run_date`, `duration_minutes`, `total_changes`
- `changes_summary`: {head_coach_changes, new_coaches_added, coaches_removed, new_emails_found, emails_changed, new_schools_with_data}
- `coverage`: {total_schools, has_coaching_staff, has_verified_emails, has_coach_email}

## Coaching Data Coverage (as of Mar 4, 2026)
- **1053 total schools** (D1: 348, D2: 284, D3: 421)
- **939 schools (89%)** have complete coaching_staff with real names from PR
- **374 schools (35%)** have at least 1 verified email from athletics sites
- **1032 schools (98%)** have a coach email (verified or generated)
- **2820 individual coaches**: 772 verified, 2038 likely, 10 missing email

## Monthly Coach Refresh System
- **Schedule**: Runs automatically on 1st of each month at 3 AM UTC
- **3-Phase Pipeline**: (1) Re-scrape all PR data, (2) Match emails, (3) Scrape athletics sites
- **Change Detection**: Tracks head coach changes, new/removed coaches, new/changed emails
- **Email Report**: Detailed HTML report sent to douglas@capymatch.com via Resend
- **Manual Trigger**: Admin API endpoint POST /api/admin/coach-refresh/trigger
- **Status Check**: GET /api/admin/coach-refresh/status
- **Run History**: Stored in `coach_refresh_runs` collection

## Completed Work
- Social Spotlight redesign (YouTube tabs, trending, Twitter quick links)
- Campus Diversity scraping (958 schools)
- Financial data + coaching staff names from Productive Recruit (930+ schools)
- YouTube URL audit (fixed 23 incorrect URLs)
- Coach email enrichment: 3-phase pipeline (PR names → email matching → athletics scraping)
- Frontend coaching staff display with "VERIFIED" email badges
- Monthly automated coach data refresh with email notifications

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
