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
- Dashboard with stat cards, pipeline funnel (clickable), events
- Pipeline/Recruiting Board with Kanban stages, inline editing
- Calendar with event CRUD
- University Knowledge Base with search
- Follow-up task tracking

### Profile Page (Updated Feb 2026)
- Dedicated page at `/profile` with 5 distinct card sections:
  - Athlete Info (photo, name, position, grad year, height, weight, jersey)
  - Physical Info (handed, reach, touch, wingspan, GPA)
  - Team & Location (club, high school, city, state)
  - Media & Bio (video link, bio text)
  - Contact Info (athlete contact + club coach)
- Share link for public schedule page

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

### Settings
- Appearance/theme management
- Gmail connection management

## Key API Endpoints
- `/api/auth/*` - Authentication
- `/api/programs`, `/api/coaches`, `/api/interactions` - CRUD
- `/api/events` - Calendar CRUD
- `/api/follow-ups` - Follow-up tracking
- `/api/dashboard`, `/api/reminders` - Dashboard data
- `/api/athlete-profile`, `/api/profile-views` - Profile management
- `/api/public/schedule/{tenant_id}` - Public schedule
- `/api/tenant`, `/api/share-link` - Settings
- `/api/knowledge-base`, `/api/seed` - University data
- `/api/gmail/*` - Gmail integration
- `/api/ai/draft-email` - AI email generation

## Prioritized Backlog

### P1
- App renaming (user hasn't decided on name yet)
- Email templates library
- Bulk email sending

### P2
- Mobile-responsive improvements
- School match scoring

### P3
- Coach contact import/export
- Parent/Guardian read-only access
- Recruiting timeline with NCAA deadlines
- Camp/Tournament ROI tracking
