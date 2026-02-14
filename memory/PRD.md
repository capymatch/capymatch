# Volleyball Recruiting CRM - PRD

## Original Problem Statement
Build a Volleyball Recruiting CRM application to help athletes and parents manage their college recruiting process. The app tracks schools, coaches, communications, and recruiting pipeline status.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn/UI, port 3000
- **Backend**: FastAPI + Motor (async MongoDB), port 8001
- **Database**: MongoDB
- **Integrations**: Gmail API, Anthropic Claude Sonnet 4.5 (via Emergent LLM Key), React Joyride
- **Auth**: Fully public (no login), single tenant (`tenant_public_default`)

## Core Features (Implemented)

### Onboarding Questionnaire (Feb 14, 2026)
- **7-step multi-choice quiz** capturing: Position, Division, Priorities (multi-select top 3), Regions (multi-select), School Size, Academic Interests, Scholarship Priority
- **Automatic redirect**: First-time users redirected to `/onboarding` via `OnboardingGate` component
- **Match Score calculation**: On completion, top 3 matching schools from pipeline displayed with percentage scores
- **Profile persistence**: Stored in `athlete_profiles` collection with `questionnaire_completed: true` flag
- **Backend endpoints**: `GET /api/recruiting-profile`, `POST /api/recruiting-profile`, `GET /api/match-scores`
- **Keyboard navigation**: Enter to continue, number keys for single-select, Back button
- **Dark/light theme compatible**: Uses CSS custom properties (`var(--t-bg)`, `var(--t-surface)`, etc.)

### Recruiting Journey Page (Redesigned Feb 13, 2026)
- **Next Step Hero Card** -- Smart contextual action at top with:
  - Overdue follow-ups (urgent orange styling)
  - Upcoming follow-ups with days countdown
  - Status-based suggestions (intro email, follow-up, log interaction)
  - One-click CTA + Snooze option
  - **Data-driven insight tip** -- rotating insights computed from MongoDB
- **Timeline** -- Full left column with Log Interaction / Send Email in header
- **AI Insights** -- Top of sidebar with purple gradient, Generate button, expandable summary
- **Sidebar order**: AI Insights -> Coaches -> Interest Level -> Key Dates -> Schedule Follow-up

### Data-Driven Recruiting Insights (Feb 14, 2026)
- Backend endpoint `/api/recruiting-insights` aggregates interaction data
- Computes: best day to contact, avg response time, most effective outreach type, follow-up success rate
- Displayed as rotating tip in Next Step Hero card -- zero AI cost

### Other Features
- Recruiting Board -- Pipeline overview with 6 columns, color-coded due dates, status filtering
- Notification System -- Clickable alerts with routing, weekly summary
- Gmail Integration -- Send/receive emails, AI draft generation
- Public Athlete Profile, Onboarding Tour, Landing Page
- Calendar with events management

## Backlog
### P1
- **App Naming**: "Vollura" taken, pending user decision

### P2
- **Recruiting Intelligence**: NCAA Timeline, Camp/Tournament ROI tracker
- **Outreach Power-Ups**: Email Templates, Bulk Outreach

### P3
- **Family Collaboration**: Parent/Guardian read-only dashboard

## Recent Additions (Feb 14, 2026)

### Match Score Integration
- **Pipeline page**: Color-coded match score badges (green 80%+, amber 60-79%, gray <60%) next to each university name
- **Journey page**: Match badge with percentage and Target icon in the header
- **Backend**: `GET /api/match-scores` calculates based on division, region, priorities, school size

### Auto-Suggest Schools
- **Schools page**: "Recommended for You" section at top with up to 12 suggestion cards
- **Scoring**: Division (40pts), preferred region (30pts), priorities (up to 24pts), school size (5pts)
- **Features**: Match score badges, division badge, match reasons, one-click "Add to Board"
- **Backend**: `GET /api/suggested-schools` filters knowledge base, excludes pipeline schools

## Key Files
- `/app/backend/routes/athlete_profile.py` - Questionnaire backend (GET/POST profile, match scores)
- `/app/frontend/src/pages/AthleteProfileQuiz.js` - 7-step quiz component
- `/app/frontend/src/App.js` - OnboardingGate redirect logic
- `/app/frontend/src/pages/RecruitingJourney.js` - Journey page with Next Step Hero
- `/app/frontend/src/components/NextStepHero.js` - Hero card component (inlined in RecruitingJourney)
