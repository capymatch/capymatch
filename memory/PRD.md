# Volleyball Recruiting CRM - PRD

## Original Problem Statement
Build a Volleyball Recruiting CRM application to help athletes manage their college recruiting process. The app tracks schools, coaches, communications, and recruiting pipeline status.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn/UI, port 3000
- **Backend**: FastAPI + Motor (async MongoDB), port 8001
- **Database**: MongoDB
- **Integrations**: Gmail API, Anthropic Claude Sonnet 4.5 (via Emergent LLM Key), React Joyride
- **Auth**: Fully public (no login), single tenant (`tenant_public_default`)

## Core Features (Implemented)
1. **Recruiting Journey Page** - Central command center per school
   - Interactive timeline, status controls, action bar (log interaction, send email)
   - Coach panel, interest meters, key dates, follow-up scheduler
   - AI Insights (positioned in timeline header, top-right) - generates AI-powered summaries
2. **Recruiting Board** - Pipeline overview dashboard
   - 6 streamlined columns, color-coded due dates, status filtering
   - University names link to Journey pages
3. **Notification System** - Clickable alerts with routing to relevant pages
   - Coach replies, follow-ups, weekly recruiting summary
4. **Gmail Integration** - Send/receive emails, AI draft generation
5. **Public Athlete Profile** - Shareable profile page
6. **Onboarding Tour** - Guided walkthrough via React Joyride
7. **Landing Page** - Professional marketing page

## What's Been Implemented
- Full auth removal (public app)
- Journey page command center (9 features)
- Recruiting board overhaul (simplified columns, color-coded dates, status filter)
- Clickable notifications with routing
- Weekly Recruiting Summary
- Mock data seeding & data migration
- UI cleanups (tour shrink, removed obsolete elements)
- **Feb 13, 2026**: Moved AI Insights from sidebar to Timeline header (top-right)

## Backlog
### P1
- App Naming: "Vollura" taken, pending user decision

### P2
- **Recruiting Intelligence**: School Match Score, NCAA Timeline, Camp/Tournament ROI
- **Outreach Power-Ups**: Email Templates, Bulk Outreach

### P3
- **Family Collaboration**: Parent/Guardian read-only dashboard

## Refactoring Needs
- `RecruitingJourney.js` and `RecruitingBoard.js` are large; consider breaking into sub-components
