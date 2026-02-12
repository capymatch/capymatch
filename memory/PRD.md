# Volleyball Recruiting CRM - PRD

## Original Problem Statement
Build a Volleyball Recruiting CRM with Gmail integration, calendar management, public athlete profiles, and AI-powered recruiting tools.

## Core Architecture
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Backend**: Python FastAPI + MongoDB (motor)
- **Auth**: Google OAuth 2.0 (Emergent-managed)
- **Gmail**: Google Gmail API via OAuth 2.0
- **AI**: Claude Sonnet 4.5 via Emergent LLM Key (emergentintegrations)

## Completed Features

### Core CRM
- Dashboard with 4 stat cards, pipeline funnel (clickable), recent activity, events table
- Pipeline/Recruiting Board with Kanban stages, inline editing, funnel bar click-to-focus
- Calendar with event CRUD (tournaments, camps, showcases)
- Settings with athlete profile management, Gmail connection, theme selector
- University Knowledge Base with search
- Follow-up task tracking

### Gmail Integration (Full)
- OAuth connect/disconnect
- Email listing filtered to .edu addresses + known coach emails
- Thread view, compose, reply, search, toggle read/unread
- Coach badge (green) vs New contact badge (blue) tagging

### AI Email Drafts (Claude Sonnet 4.5)
- One-click personalized email generation from compose modal
- 4 email types: Introduction, Follow-Up, Thank You, Interest Update
- Uses athlete profile, program/coach info, interaction history, upcoming events
- Optional custom instructions for fine-tuning

### Smart Follow-Up Reminders
- Dashboard widget showing overdue follow-ups with days overdue count
- Coach info, last interaction date, and quick "Send follow-up" action
- Filters out closed/not-a-fit programs

### Profile View Tracking
- Automatic logging when anyone visits public athlete profile
- Tracks visitor IP, user-agent, referrer, and .edu detection
- Dashboard widget showing recent views with .edu badge highlighting
- Stats: today count, this week count, total views

### Public Athlete Profile
- Shareable page at `/schedule/:tenantId`
- Displays bio, physical stats, contact info, upcoming/past events

### Clickable Dashboard Stats
- Pipeline funnel bars navigate to `/pipeline#section-key`
- Pipeline funnel strip items click-to-focus: expand section, collapse others, scroll

## Key API Endpoints
- `/api/auth/*` - Authentication
- `/api/programs`, `/api/coaches`, `/api/interactions` - CRUD
- `/api/events` - Calendar CRUD
- `/api/dashboard`, `/api/follow-ups`, `/api/reminders`
- `/api/athlete-profile` (GET/PUT), `/api/profile-views`
- `/api/public/schedule/{tenant_id}`
- `/api/gmail/*` - Gmail integration (connect, status, emails, threads, send, reply)
- `/api/ai/draft-email` - AI email generation

## Prioritized Backlog

### P1
- App renaming (user hasn't decided on name yet)
- Email templates library
- Bulk email sending

### P2
- Refactor SettingsPage.js into smaller components
- Refactor server.py into separate route files
- Mobile-responsive improvements

### P3
- Coach contact import/export
- Parent/Guardian read-only access
- School match scoring
- Recruiting timeline with NCAA deadlines
