# Volleyball Recruiting CRM - PRD

## Original Problem Statement
Public-facing Volleyball Recruiting CRM with Gmail integration, calendar, public athlete profile, AI-powered email drafter, onboarding questionnaire, match scores, and university knowledge base. The scope has expanded to include a full-app visual redesign, admin area, subscription engine, and monetization features.

## Core Requirements
- **Recruiting Pipeline**: Track universities through recruiting stages (Not Contacted -> Committed)
- **University Knowledge Base**: Searchable database of 1,053+ volleyball programs (D1/D2/D3)
- **Match Score System**: Calculate compatibility scores between athlete profile and universities
- **Onboarding Questionnaire**: First-time user flow to capture preferences
- **Gmail Integration**: Send/receive emails to coaches directly from the app
- **AI Email Drafter**: Claude Sonnet 4.5 powered email composition
- **Calendar**: Event tracking and scheduling
- **Admin Area**: User management, university data management, subscription management
- **Subscription Engine**: Feature gating based on tiers (Basic, Pro, Premium)

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn/UI, react-router-dom
- **Backend**: Python, FastAPI, Motor (async MongoDB driver)
- **Database**: MongoDB
- **AI**: Anthropic Claude Sonnet 4.5 (via Emergent LLM Key)
- **Auth**: Mocked (public app, single-tenant)

## Architecture
```
/app
├── backend/
│   ├── server.py
│   ├── database.py
│   ├── auth.py
│   ├── subscriptions.py          # Subscription engine: tiers, limits, enforcement
│   ├── routes/
│   │   ├── subscription.py       # User-facing subscription API endpoints
│   │   ├── admin.py              # Admin endpoints (users, stats)
│   │   ├── admin_universities.py # Admin university CRUD
│   │   ├── programs.py           # Pipeline/board with school limit gate
│   │   ├── ai.py                 # AI drafts with usage tracking + limit gate
│   │   ├── gmail.py              # Gmail with Pro+ feature gate
│   │   ├── knowledge.py          # Knowledge base (READ-ONLY)
│   │   ├── athlete_profile.py    # Questionnaire, match scores
│   │   ├── events.py             # Calendar events
│   │   ├── dashboard.py          # Dashboard stats
│   │   ├── profile.py            # User profile
│   │   ├── notifications.py      # Notifications
│   │   └── auth_routes.py        # Auth routes
│   └── scripts/
│       └── import_universities.py
├── frontend/
│   └── src/
│       ├── App.js                # SubscriptionProvider + SubscriptionGuard
│       ├── lib/
│       │   ├── api.js            # Axios with 403 subscription error interceptor
│       │   ├── subscription.js   # React context for subscription state
│       │   └── constants.js
│       ├── components/
│       │   ├── Layout.js         # Sidebar with subscription badge
│       │   ├── UpgradeModal.js   # Tier comparison modal
│       │   ├── FeatureGate.js    # Wrapper to gate features
│       │   ├── SubscriptionBadge.js # Plan indicator in sidebar
│       │   └── AdminLayout.js
│       └── pages/
│           ├── Dashboard.js      # Subscription usage card
│           ├── Analytics.js      # Gated behind Pro+
│           └── ...
```

## Subscription Tiers
| Feature | Basic ($0) | Pro ($19/mo) | Premium ($39/mo) |
|---------|-----------|-------------|-----------------|
| Schools | 5 | 25 | Unlimited |
| AI Drafts/mo | 0 | 10 | Unlimited |
| Gmail | No | Yes | Yes |
| Analytics | No | Yes | Yes |
| Recruiting Insights | No | Yes | Yes |
| Public Profile | No | Yes | Yes |
| Follow-up Reminders | No | Yes | Yes |
| Auto Reply Detection | No | No | Yes |
| Weekly Digest | No | No | Yes |

## Key Database Collections
- **university_knowledge_base**: 1,053 universities
- **programs**: User's recruiting board
- **athlete_profiles**: User preferences + questionnaire_completed flag
- **gmail_tokens**: Gmail OAuth tokens
- **tenants**: User tenants with plan field (basic/pro/premium)
- **ai_usage**: Tracks AI draft usage per tenant per month

## What's Been Implemented
- [x] Full recruiting pipeline (CRUD for programs)
- [x] Onboarding questionnaire with redirect gate
- [x] Match Score calculation and display
- [x] Suggested Schools
- [x] University Knowledge Base: 1,053 schools
- [x] Dynamic filters (107 conferences, 10 regions, 3 divisions)
- [x] Coach data display
- [x] Gmail integration
- [x] AI email drafter (Claude Sonnet 4.5)
- [x] Calendar + NCAA Timeline
- [x] Notifications + Background coach reply detection
- [x] Dynamic Board Grouping (Feb 14, 2026)
- [x] Mobile Responsiveness Overhaul (Feb 14, 2026)
- [x] Color Theme Overhaul (Feb 14, 2026)
- [x] Pipeline Accordion Redesign (Feb 14, 2026)
- [x] Admin Panel Phase 1 (Feb 14, 2026)
- [x] University Data Manager (Feb 14, 2026)
- [x] **Subscription Engine Phase 2 (Feb 14, 2026)**
  - Backend subscription middleware with tier definitions
  - Feature gates on programs, AI, Gmail, analytics, insights
  - AI usage tracking (per-month counting)
  - Frontend subscription context + provider
  - Upgrade modal with 3-tier comparison
  - FeatureGate wrapper component
  - Dashboard usage card (schools + AI drafts bars)
  - Sidebar subscription badge
  - Global 403 interceptor for automatic upgrade prompts
  - Testing: 100% pass (11/11 backend, 13/13 frontend)
- [x] **Admin Subscription Management Phase 3 (Feb 14, 2026)**
  - Dedicated admin subscriptions page (`/admin/subscriptions`)
  - Revenue stats dashboard (MRR, paid users, conversion rate)
  - Plan distribution visualization with progress bars
  - User table with inline plan changers (dropdown + save)
  - Search and plan filter for user management
  - Subscription change audit log with timestamps and reasons
  - Backend: GET /admin/subscriptions, PUT /admin/subscriptions/{id}, GET /admin/subscription-logs
  - Admin dashboard "Manage Subscriptions" quick action linked
  - Testing: 100% pass (14/14 backend, 13/13 frontend)
- [x] **AI-Powered Features (Feb 14, 2026)**
  - AI Recruiting Assistant: Chat drawer with session history, suggestion prompts, context-aware advice using athlete profile + pipeline data
  - Outreach Analysis (Premium): AI-generated outreach effectiveness score, strengths/improvements, division insights, next steps, interaction breakdowns
  - Highlight Reel Advisor (Premium): Personalized video structure, must-include skills, avoid list, position-specific advice, distribution tips
  - All 3 features gated by subscription tier (Pro+ for Assistant, Premium for Outreach/Highlight)
  - Sidebar nav updated with PRO/AI badges
  - Backend: 5 new endpoints (assistant chat, sessions, history, outreach-analysis, highlight-advice)
  - Uses Claude Sonnet 4.5 via Emergent LLM Key (REAL AI, not mocked)
  - Testing: 100% pass (11/11 backend, 14/14 frontend)

## Prioritized Backlog

### P1 - Stripe Integration (Phase 4)
- Integrate Stripe for real payment processing
- Allow users to self-serve upgrades
- Webhook handling for subscription changes

### P2 - AI-Powered Features
- AI Assistant for personalized recruiting advice
- Automated Outreach Insights
- Highlight Reel Creator

### P2 - App Naming
- User wants unique name (Vollura was taken)
- Blocked on user decision

### P2 - Outreach Power-Ups
- Email templates for common recruiting scenarios
- Bulk outreach capabilities

### P3 - Recruiting Intelligence
- Camp/Tournament ROI tracker

### P3 - Family Collaboration
- Read-only dashboard for parents/guardians

## Key API Endpoints
- `GET /api/subscription` - Current user's subscription + usage
- `GET /api/subscription/tiers` - All available tiers
- `GET /api/programs` - List programs (with dynamic grouping)
- `POST /api/programs` - Add program (school limit gate)
- `POST /api/ai/draft-email` - AI draft (usage limit gate)
- `GET /api/recruiting-insights` - Insights (Pro+ gate)
- `GET /api/gmail/connect` - Gmail (Pro+ gate)
- `GET/POST/PUT/DELETE /api/admin/universities` - University CRUD
- `GET /api/admin/stats` - Admin stats
- `GET /api/admin/users` - User list

## Mocked Features
- User authentication (get_current_user returns static user)
- Stripe payment (upgrade buttons close modal without processing payment)
