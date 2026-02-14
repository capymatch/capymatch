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
│   │   ├── programs.py           # Pipeline/board management with DYNAMIC GROUPING
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
│       │   ├── RecruitingBoard.js           # DYNAMIC GROUPING: Action Required, Upcoming, In Progress, Closed
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
- [x] **DYNAMIC BOARD GROUPING** (Feb 14, 2026)
  - Programs automatically categorized into 4 action-oriented groups
  - **Action Required**: Overdue, needs response, or stale (default catch-all)
  - **Upcoming**: Follow-up due within 14 days
  - **In Progress**: Recently contacted (7 days) OR active conversation
  - **Closed**: Not a Fit, Not Interested, Committed
  - Group funnel summary with counts
  - Group-specific context badges on program cards
  - Filters (search, division, region) work with grouped data
  - Backend: `categorize_program()` function, `GET /api/programs?grouped=true`
  - Frontend: `GroupFunnel` component, `ProgramCard` with board_group context

- [x] **MOBILE RESPONSIVENESS OVERHAUL** (Feb 14, 2026)
  - Collapsible sidebar with hamburger menu for mobile
  - Dashboard, Pipeline, Questionnaire pages made responsive
  - **Journey page** (`RecruitingJourney.js`) made fully responsive:
    - Header: school name + badges wrap, status badges on own row
    - NextStepHero: vertical stack on mobile, horizontal on desktop
    - LogInteractionForm: single-column grid on mobile, 3-col on desktop
    - Timeline header: compact "Log"/"Email" buttons
    - Sidebar cards (AI Insights, Coaches, Key Dates, Follow-up): full-width single column on mobile

- [x] **RECRUITING BOARD CARD CLEANUP** (Feb 14, 2026)
  - Removed redundant "Status" and "Reply" text from program cards
  - Added smart contextual alerts for Action Required cards (e.g. "You haven't contacted the coach yet", "Overdue since Feb 10", "No reply yet — consider following up")
  - Cards now show: school name, division, match score, region, conference, coach, contextual alerts (right side only), Journey button
  - **REMOVED duplicate group context badge** from next to school name (Feb 14, 2026) - contextual info now only appears inline next to Journey button
  - **REPLACED "+ Add Program" dialog with "+ Add School" button** that redirects to Schools page (`/knowledge-base`)
  - **ACCORDION-STYLE INDENTATION**: Cards are now indented (`ml-6 lg:ml-8`) to visually show they belong inside their section accordion

- [x] **PIPELINE ACCORDION REDESIGN** (Feb 14, 2026)
  - Connected panels: accordion header + cards form one seamless unit
  - Compact row-based cards replacing floating card layout
  - Thin colored accent bars (rose/amber/emerald/gray) replace heavy indentation
  - Simplified accordion headers: colored dot + label + inline description + count pill
  - Tight 1.5 spacing between groups (was 10/40px)
  - Removed extra dividers between funnel and filters
  - Closed group collapsed by default
  - Filters row simplified (no wrapping border)

## Prioritized Backlog

### Color Theme Overhaul ✅ COMPLETED (Feb 14, 2026)
- Applied Creative Tim-inspired dark navy + pink/coral color scheme across entire app
- Sidebar: dark pink/maroon gradient (from #c0375a to #6b1530)
- Background: #1a1f37, Cards: #202940
- All purple accents replaced with pink-600/700/800 (Tailwind)
- Dashboard stat cards: circular gradient icons (pink, amber, coral, teal)
- CSS variables updated in index.css for dark theme
- Affected files: index.css, Layout.js, Dashboard.js, and all page files
- Implemented as "NCAA Timeline" tab on Calendar page
- Current period banner with pulsing indicator and days remaining
- Division selector (D1/D2/D3/NAIA) with division-specific data
- Visual timeline bar chart with color-coded periods and NOW marker
- Key NCAA Dates & Deadlines grid with status tags (Passed, X days away, Info)
- D3/NAIA correctly show year-round contact with informational cards
- Fully mobile responsive

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

## Key API Endpoints

### Programs (Pipeline)
- `GET /api/programs` - List all programs (flat list with board_group field)
- `GET /api/programs?grouped=true` - List programs in 4 dynamic groups
- `POST /api/programs` - Add program to board
- `PUT /api/programs/{id}` - Update program
- `DELETE /api/programs/{id}` - Remove program

### Dynamic Grouping Logic (Priority Order)
1. **Closed**: status in ["Not a Fit / Closed", "Not Interested", "Committed"]
2. **In Progress**: contacted within 7 days OR reply_status in ["Reply Received", "In Conversation"], AND not overdue
3. **Upcoming**: next_action_due within 14 days, not recently contacted
4. **Action Required**: Default catch-all (overdue, stale, needs attention)
