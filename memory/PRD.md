# Volleyball Recruiting CRM - PRD

## Original Problem Statement
Build a Volleyball Recruiting CRM with Gmail integration, calendar, public athlete profile, AI-powered email drafting, guided onboarding tour, and recruiting pipeline management.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI, react-router-dom, sonner (toasts), react-joyride (tour)
- **Backend**: Python FastAPI, Motor (async MongoDB driver), asyncio background tasks
- **Database**: MongoDB
- **Integrations**: Gmail API, Anthropic Claude Sonnet 4.5 (via Emergent LLM Key)

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
- Onboarding tour (resized to compact)
- Auth bypass - app is fully public, no login required

### Journey Page Command Center (Feb 2026)
The Journey page is now the central hub of the app with:
1. **Inline Email Composer** - Send/reply to coaches with AI draft buttons (intro, follow-up, thank you, interest update)
2. **Quick Status Controls** - Change recruiting status, reply status, priority from header dropdowns
3. **Coach Contact Panel** - View/add/edit/delete coaches inline (replaced Quick Stats)
4. **Follow-up Scheduler** - Set reminder dates and next actions
5. **Log Interaction** - Quick-add phone calls, texts, camp meetings, notes to timeline
6. **AI Next Steps** - Generate AI summary with actionable "Draft Email" button
7. **School Info Card** - Division, conference, region, mascot from knowledge base
8. **Interest Meter** - Track athlete interest (1-10) and school interest (1-10) visually
9. **Key Dates** - Upcoming events and follow-up deadlines shown inline

## Completed (This Session - Feb 2026)
- [x] Auth bypass: Backend mock user, frontend direct routing, no login screen
- [x] Tour popup resized to compact (340px)
- [x] Journey page rebuilt as command center with all 9 features
- [x] Backend: Added athlete_interest and school_interest fields to Program model
- [x] All tests passing: 19/19 backend, 100% frontend

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
