# Volleyball Recruiting CRM - PRD

## Original Problem Statement
Build a Volleyball Recruiting CRM with Gmail integration, calendar management, public athlete profiles, and AI-powered recruiting tools.

## Core Architecture
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Backend**: Python FastAPI + MongoDB (motor)
- **Auth**: Google OAuth 2.0 (Emergent-managed)
- **Gmail**: Google Gmail API via OAuth 2.0
- **AI**: Claude Sonnet 4.5 via Emergent LLM Key (emergentintegrations)

## Backend Structure (Refactored Feb 2026)
```
/app/backend/
├── server.py          # Slim entry point: app setup, middleware, router inclusion
├── database.py        # Shared MongoDB connection (db, client)
├── auth.py            # Shared auth helpers (get_current_user, get_tenant_id)
├── models.py          # All Pydantic models
├── routes/
│   ├── auth_routes.py # /api/auth/* endpoints
│   ├── programs.py    # /api/programs, /api/coaches, /api/interactions, /api/follow-ups
│   ├── events.py      # /api/events CRUD
│   ├── dashboard.py   # /api/dashboard, /api/reminders
│   ├── profile.py     # /api/athlete-profile, /api/public/schedule, /api/profile-views, /api/tenant, /api/share-link
│   ├── knowledge.py   # /api/knowledge-base, /api/seed
│   ├── ai.py          # /api/ai/draft-email
│   └── gmail.py       # /api/gmail/* endpoints
```

## Completed Features

### Core CRM
- Dashboard with stat cards, pipeline funnel, events
- Pipeline/Recruiting Board with Kanban stages, inline editing
- Calendar with event CRUD
- University Knowledge Base with search (45 schools)
- Follow-up task tracking

### Onboarding Experience (Feb 2026)
- **Guided Tour**: 8-step spotlight overlay on first login walking through Dashboard, Pipeline, Calendar, Inbox, Schools, and Profile
- **Onboarding Checklist**: Dashboard card tracking real setup progress (profile, schools, Gmail, events) with live completion states
- Both persist dismissal via localStorage
- Tour targets sidebar nav items with spotlight cutout and tooltip

### Profile Page
- Dedicated page at `/profile` with 5 distinct card sections
- Shortened share link (`/s/{id}` instead of `/schedule/tenant_{id}`)

### Gmail Integration
- OAuth connect/disconnect
- Email listing filtered to .edu + known coaches
- Thread view, compose, reply, search
- Coach vs New contact tagging

### AI Email Drafts (Claude Sonnet 4.5)
- One-click personalized email generation
- 4 email types: Introduction, Follow-Up, Thank You, Interest Update

### Smart Follow-Up Reminders
- Dashboard widget showing overdue follow-ups
- Coach info, last interaction, quick action

### Profile View Tracking
- Auto-logging on public profile visits
- .edu domain detection, dashboard widget

### Public Schedule Page
- YouTube embed support (converts watch URLs to embed format)
- Backwards-compatible URL routing

### UI Cleanup (Feb 2026)
- Removed hardcoded fake notification badges from header
- Removed non-functional "Add Group" sidebar button
- Header icons now navigate to relevant pages (tasks -> /follow-ups, mail -> /inbox)
- Removed header search field
- Dropdown spacing improvements in pipeline InlineSelect

## Prioritized Backlog

### P1
- App renaming (user hasn't decided on name yet)
- Email templates library
- Bulk email sending
- Page title in header breadcrumb
- Dashboard stat cards should be clickable/navigable

### P2
- Mobile-responsive improvements
- School match scoring
- Empty state illustrations
- Dashboard quick actions row

### P3
- Coach contact import/export
- Parent/Guardian read-only access
- Recruiting timeline with NCAA deadlines
- Camp/Tournament ROI tracking
