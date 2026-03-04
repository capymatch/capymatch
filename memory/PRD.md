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
- **DuckDuckGo**: Fallback for URL discovery

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

## Coaching Data Coverage (as of Mar 4, 2026)
- **1053 total schools** (D1: 348, D2: 284, D3: 421)
- **939 schools (89%)** have complete coaching_staff with real names from PR
- **374 schools (35%)** have at least 1 verified email from athletics sites
- **1032 schools (98%)** have a coach email (verified or generated)
- **2820 individual coaches**: 772 verified, 2038 likely, 10 missing email
- **D1**: 95% have names, 100% have email, 43% verified
- **D2**: 73% have names, 95% have email, 20% verified
- **D3**: 93% have names, 98% have email, 38% verified

## Completed Work
- Social Spotlight redesign (YouTube tabs, trending, Twitter quick links)
- Campus Diversity scraping (958 schools)
- Financial data + coaching staff names from Productive Recruit (930+ schools)
- YouTube URL audit (fixed 23 incorrect URLs)
- **Coach email enrichment**: 3-phase pipeline (PR names → email matching → athletics scraping)
- Frontend coaching staff display with "VERIFIED" email badges

## Upcoming Tasks (P1)
- Manual Email Logging: UI for non-Gmail users to log emails
- Camp Data Integration: Add camp_url to knowledge base

## Backlog (P2)
- Microsoft Outlook/365 Import
- Full NIL transaction/payment processing
- Separate Girls/Boys Volleyball data models
- Email templates & bulk outreach
- Redesign "Find Schools" page
- Resolve duplicate YouTube URLs for similarly-named schools

## 3rd Party Integrations
- Google YouTube Data API v3
- Anthropic Claude (via Emergent LLM Key)
- Google APIs (Gmail OAuth)
- Resend (transactional email)
- Stripe (payments)
- Playwright (web scraping)
- MongoDB Atlas
