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

### Recruiting Journey Page (Redesigned Feb 13, 2026)
- **Next Step Hero Card** — Smart contextual action at top. Dynamically shows:
  - Overdue follow-ups (urgent orange styling)
  - Upcoming follow-ups with days countdown
  - Status-based suggestions (intro email, follow-up, log interaction)
  - One-click CTA + Snooze option
- **Timeline** — Full left column with Log Interaction / Send Email in header
- **AI Insights** — Top of sidebar with purple gradient, Generate button, expandable summary with highlights, suggested actions, and Draft Email
- **Sidebar order**: AI Insights → Coaches → Interest Level → Key Dates → Schedule Follow-up
- Status controls (recruiting status, reply status, priority)
- Coach panel (add/edit/delete)
- Interest meters (athlete & school)
- Follow-up scheduler

### Other Features
- **Recruiting Board** — Pipeline overview with 6 columns, color-coded due dates, status filtering
- **Notification System** — Clickable alerts with routing, weekly summary
- **Gmail Integration** — Send/receive emails, AI draft generation
- **Public Athlete Profile** — Shareable profile page
- **Onboarding Tour** — Guided walkthrough via React Joyride
- **Landing Page** — Professional marketing page

## What's Been Implemented
- Full auth removal (public app)
- Journey page command center (original 9 features)
- **Feb 13, 2026**: Journey page redesign — Next Step Hero, Timeline with header actions, AI Insights in sidebar, full layout overhaul
- Recruiting board overhaul
- Clickable notifications with routing
- Weekly Recruiting Summary
- Mock data seeding & data migration
- UI cleanups

## Backlog
### P1
- App Naming: "Vollura" taken, pending user decision

### P2
- **Recruiting Intelligence**: School Match Score, NCAA Timeline, Camp/Tournament ROI
- **Outreach Power-Ups**: Email Templates, Bulk Outreach

### P3
- **Family Collaboration**: Parent/Guardian read-only dashboard
