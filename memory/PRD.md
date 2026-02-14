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
- **Next Step Hero Card** — Smart contextual action at top with:
  - Overdue follow-ups (urgent orange styling)
  - Upcoming follow-ups with days countdown
  - Status-based suggestions (intro email, follow-up, log interaction)
  - One-click CTA + Snooze option
  - **Data-driven insight tip** — rotating insights computed from MongoDB (best day, response time, best outreach type, follow-up rate)
- **Timeline** — Full left column with Log Interaction / Send Email in header
- **AI Insights** — Top of sidebar with purple gradient, Generate button, expandable summary
- **Sidebar order**: AI Insights → Coaches → Interest Level → Key Dates → Schedule Follow-up
- Status controls, coach panel, interest meters, follow-up scheduler

### Data-Driven Recruiting Insights (Feb 14, 2026)
- Backend endpoint `/api/recruiting-insights` aggregates interaction data
- Computes: best day to contact, avg response time, most effective outreach type, follow-up success rate, activity streak
- Displayed as rotating tip in Next Step Hero card — zero AI cost

### Other Features
- Recruiting Board — Pipeline overview with 6 columns, color-coded due dates, status filtering
- Notification System — Clickable alerts with routing, weekly summary
- Gmail Integration — Send/receive emails, AI draft generation
- Public Athlete Profile, Onboarding Tour, Landing Page

## Backlog
### P1
- App Naming: "Vollura" taken, pending user decision

### P2
- Recruiting Intelligence: School Match Score, NCAA Timeline, Camp/Tournament ROI
- Outreach Power-Ups: Email Templates, Bulk Outreach

### P3
- Family Collaboration: Parent/Guardian read-only dashboard
