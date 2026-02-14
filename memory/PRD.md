# Volleyball Recruiting CRM - PRD

## Original Problem Statement
Public-facing Volleyball Recruiting CRM with Gmail integration, calendar, public athlete profile, AI-powered email drafter, onboarding questionnaire, match scores, and university knowledge base.

## Core Requirements
- **Recruiting Pipeline**: Track universities through recruiting stages (Not Contacted → Committed)
- **University Knowledge Base**: Searchable database of 1,053+ volleyball programs (D1/D2/D3)
- **Match Score System**: Calculate compatibility scores between athlete profile and universities
- **Onboarding Questionnaire**: First-time user flow to capture preferences (position, division, region, priorities)
- **Gmail Integration**: Send/receive emails to coaches directly from the app
- **AI Email Drafter**: Claude Sonnet 4.5 powered email composition
- **Calendar**: Event tracking and scheduling
- **Coach Data**: Store coach names, emails, recruiting coordinator info per university

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
│   ├── routes/
│   │   ├── knowledge.py          # Knowledge base CRUD + filters + add-to-board
│   │   ├── athlete_profile.py    # Questionnaire, match scores, suggested schools
│   │   ├── programs.py           # Pipeline/board management
│   │   ├── gmail.py              # Gmail integration
│   │   ├── ai.py                 # AI email drafter
│   │   ├── events.py             # Calendar events
│   │   ├── dashboard.py          # Dashboard stats
│   │   ├── profile.py            # User profile
│   │   ├── notifications.py      # Notifications
│   │   └── auth_routes.py        # Auth routes
│   └── scripts/
│       └── import_universities.py # Excel → MongoDB import script
├── frontend/
│   └── src/
│       ├── App.js
│       ├── pages/
│       │   ├── UniversityKnowledgeBase.js  # 1053 schools, dynamic filters, pagination
│       │   ├── RecruitingBoard.js           # Pipeline with match scores
│       │   ├── RecruitingJourney.js         # Program detail with match scores
│       │   ├── Onboarding.js                # Multi-step questionnaire
│       │   └── ...
│       ├── components/
│       │   ├── OnboardingGate.js            # Redirect new users to questionnaire
│       │   └── ProgramRow.js                # Match score badges
│       └── lib/
│           └── constants.js                 # App constants (divisions, regions, statuses)
```

## Key Database Collections
- **university_knowledge_base**: 1,053 universities with division, conference, region, coach data
- **programs**: User's recruiting board (schools they're tracking)
- **athlete_profiles**: User preferences from questionnaire + `questionnaire_completed` flag
- **gmail_tokens**: Gmail OAuth tokens

## What's Been Implemented (as of Feb 14, 2026)
- [x] Full recruiting pipeline (CRUD for programs)
- [x] Onboarding questionnaire with redirect gate
- [x] Match Score calculation and display
- [x] Suggested Schools (auto-recommend based on profile)
- [x] University Knowledge Base populated with 1,053 schools (D1:347, D2:284, D3:422)
- [x] Dynamic filters (107 conferences, 10 regions, 3 divisions)
- [x] Pagination (50 per page)
- [x] Coach data display (names + email links)
- [x] Gmail integration
- [x] AI email drafter (Claude Sonnet 4.5)
- [x] Calendar
- [x] Analytics
- [x] Notifications
- [x] Background coach reply detection

## Prioritized Backlog

### P1 - NCAA Recruiting Timeline
- Implement as new tab on Recruiting Journey page
- Mockup exists at `/app/mockups/ncaa_timeline.html`
- Show contact/dead/evaluation/quiet periods by division
- Key NCAA dates and deadlines

### P2 - App Naming
- User wants unique name (Vollura was taken)
- Blocked on user decision

### P2 - Outreach Power-Ups
- Email templates for common recruiting scenarios
- Bulk outreach capabilities

### P3 - Recruiting Intelligence
- Camp/Tournament ROI tracker
- Visual recruiting analytics

### P3 - Family Collaboration
- Read-only dashboard for parents/guardians
