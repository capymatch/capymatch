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
- Kanban-style recruiting pipeline with status filtering and due date color coding
- Gmail integration (send/receive emails)
- Calendar for events
- Athlete profile with Hudl link + public-facing page
- Automated email status updates (Contacted/Awaiting Reply/Reply Received)
- Background task polling Gmail for coach replies
- Notification system with smart routing to Journey page
- Onboarding tour (compact)
- Auth bypass - app is fully public

### Journey Page Command Center (Feb 2026)
1. **Inline Email Composer** with AI draft buttons
2. **Quick Status Controls** - change status/reply/priority from header
3. **Coach Contact Panel** - view/add/edit/delete coaches
4. **Follow-up Scheduler** - set dates and next actions
5. **Log Interaction** - quick-add to timeline
6. **AI Insights** - summary with actionable buttons
7. **Interest Meter** - athlete + school interest (1-10)
8. **Key Dates** - upcoming events and follow-up deadlines

### Pipeline Board (Feb 2026)
- Clean 6-column layout: University, Div, Status, Reply, Due Date, Priority
- Status filter funnel with "All" button - click to show only one category
- Due date color coding: red=past due, orange=within 14 days, white=normal
- University name links directly to Journey page
- Synced statuses: Camp Attended, Applied, Offer Received, Committed, Not Interested

### Notifications (Feb 2026)
- Click notification → redirects to school's Journey page (via program_id)
- Fallback routing: inbox for coach replies, pipeline for follow-ups, analytics for profile views

## Completed (This Session - Feb 2026)
- [x] Auth bypass
- [x] Tour popup resized
- [x] Journey page rebuilt as command center (8 features)
- [x] School Info card removed from Journey
- [x] Pipeline cleanup: removed 3 columns, added status filter + due date colors
- [x] Notification smart routing to Journey page
- [x] Fixed datetime comparison bug in journey endpoint
- [x] Mock data seeded for 6 programs
- [x] All tests passing: 24/24 backend, 100% frontend (iteration_14)

## Backlog
### P1
- App naming (user needs to decide)

### P2 - Recruiting Intelligence
- School Match Score
- Recruiting Timeline (NCAA dates/deadlines)
- Camp/Tournament ROI tracking

### P2 - Outreach Power-Ups
- Email Templates (pre-built, auto-filling)
- Bulk Outreach (personalized emails to multiple coaches)

### P3 - Family Collaboration
- Parent/Guardian read-only dashboard access
