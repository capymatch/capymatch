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
│   │   ├── knowledge.py          # Knowledge base (READ-ONLY) + filters + add-to-board
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
│       └── import_universities.py # Excel → MongoDB import (admin-only offline tool)
├── frontend/
│   └── src/
│       ├── App.js
│       ├── pages/
│       │   ├── UniversityKnowledgeBase.js  # 1053 schools, dynamic filters, pagination, card layout
│       │   ├── RecruitingBoard.js           # Pipeline with card layout, key dates, match scores
│       │   ├── RecruitingJourney.js         # Program detail (Interest Level removed, Match Score only)
│       │   ├── Onboarding.js                # Multi-step questionnaire
│       │   └── ...
│       ├── components/
│       │   ├── OnboardingGate.js            # Redirect new users to questionnaire
│       │   └── ProgramRow.js
│       └── lib/
│           └── constants.js                 # App constants (divisions, regions, statuses)
```

## Key Database Collections
- **university_knowledge_base**: 1,053 universities (READ-ONLY via API, admin import script only)
- **programs**: User's recruiting board (copied from knowledge base on "Add to Board")
- **athlete_profiles**: User preferences from questionnaire + `questionnaire_completed` flag
- **gmail_tokens**: Gmail OAuth tokens

## What's Been Implemented
- [x] Full recruiting pipeline (CRUD for programs)
- [x] Onboarding questionnaire with redirect gate
- [x] Match Score calculation and display (sole scoring metric)
- [x] Suggested Schools (auto-recommend based on profile)
- [x] University Knowledge Base: 1,053 schools (D1:347, D2:284, D3:422)
- [x] Dynamic filters (107 conferences, 10 regions, 3 divisions)
- [x] Pagination (50 per page) on Schools page
- [x] Coach data display (names + email links)
- [x] Gmail integration
- [x] AI email drafter (Claude Sonnet 4.5)
- [x] Calendar
- [x] Analytics
- [x] Notifications
- [x] Background coach reply detection
- [x] Data protection: /api/seed removed, university_knowledge_base is read-only
- [x] Pipeline redesign: card layout matching Schools style with school info (region, conference, coach)
- [x] Pipeline: read-only statuses (editable only in Journey), key dates from Journey
- [x] Pipeline: school name links to school detail view
- [x] Removed Interest Level widget (Match Score is sole indicator)

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
