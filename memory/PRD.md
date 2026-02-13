# Volleyball Recruiting CRM - PRD

## Original Problem Statement
Build a Volleyball Recruiting CRM with Gmail integration, calendar, public athlete profile, AI-powered email drafting, guided onboarding tour, and recruiting pipeline management.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI, react-router-dom, sonner (toasts), react-joyride (tour)
- **Backend**: Python FastAPI, Motor (async MongoDB driver), asyncio background tasks
- **Database**: MongoDB
- **Integrations**: Gmail API, Anthropic Claude Sonnet 4.5 (via Emergent LLM Key), Google OAuth 2.0 (bypassed)

## Auth Status
- **BYPASSED** (not removed): `get_current_user` returns static user (`user_public_default`). All code preserved for re-enable.

## What's Been Implemented
- Kanban-style recruiting pipeline
- Gmail integration (send/receive emails)
- Calendar for events
- Athlete profile with Hudl link + public-facing page
- Automated email status updates (Contacted/Awaiting Reply/Reply Received)
- Background task polling Gmail for coach replies
- Notification system (coach replies, follow-up reminders, .edu profile views)
- Recruiting Journey page with AI summary
- Onboarding tour
- Auth bypass (Feb 2026) - app is fully public, no login required

## Completed (This Session - Feb 2026)
- [x] Auth bypass: Backend mock user, frontend direct routing, no login screen
- [x] All 17 API endpoints verified working without auth tokens
- [x] Frontend loads directly to Dashboard, /login redirects to /board
- [x] Logout button removed from UI

## Backlog
### P1
- App naming (user needs to decide, "Vollura" was taken)

### P2 - Recruiting Intelligence
- School Match Score
- Recruiting Timeline (NCAA dates/deadlines)
- Camp/Tournament ROI tracking

### P2 - Outreach Power-Ups
- Email Templates (pre-built, auto-filling)
- Bulk Outreach (personalized emails to multiple coaches)

### P3 - Family Collaboration
- Parent/Guardian read-only dashboard access

### Refactoring
- Move journey endpoints from programs.py to dedicated journey.py router
