# Volleyball Recruiting CRM — PRD

## Original Problem Statement
Public-facing Volleyball Recruiting CRM for parents managing their child's recruiting journey. The app helps track schools, coaches, interactions, and progress through the recruiting pipeline.

## Core Requirements
1. Dynamic Recruiting Board with custom parent-friendly grouping
2. University Knowledge Base
3. Mobile-friendly responsive design
4. Full-app visual redesign (dark theme with pink/coral accents)
5. Admin Area (User, University, Subscription, Integration Management)
6. Subscription Engine with feature gating (Starter, Pro, Premium)
7. Stripe integration for payments
8. AI-powered "Next Step" suggestions
9. Separate data for Girls and Boys volleyball
10. Complete UX/UI overhaul of Recruiting Journey page (7-point mockup)

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn/UI, Lucide React
- Backend: FastAPI, Pydantic, MongoDB
- Auth: Cookie-based sessions (session_token)
- 3rd Party: Gmail API, Anthropic Claude (Emergent LLM Key), react-joyride, Stripe, Resend

## User Personas
- **Parents**: Primary users managing their child's volleyball recruiting
- **Admin**: App administrators managing users, universities, subscriptions

## Test Accounts
- Pro User: pro@test.com / password
- Premium User: premium@test.com / password

## What's Implemented (Completed)
- Full recruiting board with 5-stage funnel (overdue, needs_outreach, waiting_on_reply, in_conversation, archived)
- Journey Page complete redesign with 7 features:
  1. Visual Progress Rail with pulse indicator
  2. Getting Started Checklist
  3. Conversation-style Timeline
  4. At a Glance contextual sidebar
  5. Celebration state for coach replies
  6. Floating Action Bar
  7. School Comparison page (/compare)
- Progress Rail cascade fill logic (backend)
- Stage click/undo toggle behavior
- campus_visit, offer, committed stages are MANUAL ONLY
- Stage label "Replied" renamed to "In Conversation"
- Rule-based "What's Next?" card
- Camp milestone in timeline
- Coach CRUD, Interaction logging, Follow-up scheduling
- Email composer with AI drafts (Premium)
- Mark as Replied flow
- Admin dashboard, user management, university management
- Subscription engine with feature gating
- NCAA Timeline, Analytics, Calendar pages
- Coach Watch (web scraping), Highlight Advisor
- "Committed" Hero Card with confetti animation
- Collapsible Journey Details when committed
- Personal Notes Sidebar per school
- Font Upgrade to Plus Jakarta Sans
- Stage Log Modal for progress rail
- Automated Follow-up System (2-14 day reminders)
- Enhanced Getting Started Checklist with dynamic steps

## What's Implemented (Recent — Feb 17, 2026)
- **Dashboard Redesign (Complete)**: Full redesign with 6 new sections:
  1. **Greeting + Quick Pulse**: Personalized welcome + 4 contextual stats (Schools Tracked, Response Rate, Replies This Week, Awaiting Reply)
  2. **Today's Actions**: Split view — Follow-ups Due (left) + Needs First Outreach (right)
  3. **School Spotlight**: Horizontal scroll cards with next-step nudges + Browse Schools card
  4. **Pipeline Snapshot**: Vertical bar chart with division legend
  5. **Recent Activity**: Timeline feed with color-coded dots and time-ago format
  6. **Upcoming Events**: Compact date-box layout with event type badges
  - Removed: Donut chart, Engagement Summary, fake trend arrows, Profile Views stat

## P0 Backlog
- Separate Girls/Boys Volleyball data and features

## P1 Backlog
- Camp/Tournament ROI tracker
- Email templates & bulk outreach

## P2 Backlog (Future)
- App Naming
- Multi-sport capability
- Family Collaboration Roles (read-only Parent/Viewer role)

## Key Architecture Decisions
- Progress Rail uses percentage-based track positioning
- Backend cascade fill: manual journey_stage fills all stages up to that point
- Active stage = last consecutively completed stage (always gap-free)
- Journey_stage stored as single string in programs collection
- Dashboard fetches from /api/programs, /api/events, /api/interactions, /api/athlete-profile, /api/gmail/status
