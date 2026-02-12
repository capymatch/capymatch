# Volleyball Recruiting CRM - PRD

## Original Problem Statement
Build a Volleyball Recruiting CRM with:
- Gmail integration for sending, receiving, and tracking recruiting emails
- Calendar feature for managing events (tournaments, camps, showcases)
- Public shareable athlete profile page with bio, stats, contact info, and event schedule
- Dashboard with at-a-glance stats and clickable pipeline navigation
- Professional UI/UX with dark/light theme support

## Core Architecture
- **Frontend**: React + Tailwind CSS + Shadcn/UI, react-router-dom
- **Backend**: Python FastAPI + MongoDB (motor)
- **Auth**: Google OAuth 2.0 (Emergent-managed)
- **Gmail**: Google Gmail API via OAuth 2.0

## What's Been Implemented

### Completed Features
- **User Auth**: Google OAuth login with session management
- **Dashboard**: Stats cards, recruiting pipeline funnel (clickable), recent activity, schools requiring action, upcoming events table
- **Pipeline/Recruiting Board**: Kanban-style board with 5 stages, inline editing, filters, quick-add
- **Calendar**: Monthly calendar with event CRUD (tournaments, camps, showcases, etc.)
- **Settings**: Athlete profile management (bio, photo, physical stats), Gmail connection, theme selector
- **Public Athlete Profile**: Shareable page at `/schedule/:tenantId` with profile + event schedule
- **Gmail Integration (Full)**: OAuth connect/disconnect, email listing, thread view, compose, reply, search, toggle read/unread
- **Inbox UI**: Email list with search, threaded conversation view, compose modal, reply functionality
- **Clickable Dashboard Stats**: Pipeline funnel bars navigate to `/pipeline#section-key` with smooth scroll
- **University Knowledge Base**: Searchable DB of volleyball programs
- **Follow-Ups**: Task tracking for follow-up actions
- **Data Seeding**: Auto-seed knowledge base on startup

### Key API Endpoints
- `/api/auth/session`, `/api/auth/me`, `/api/auth/logout`
- `/api/programs` (CRUD), `/api/coaches` (CRUD), `/api/interactions` (CRUD)
- `/api/events` (CRUD), `/api/dashboard`, `/api/follow-ups`
- `/api/athlete-profile` (GET/PUT), `/api/athlete-profile/photo`
- `/api/public/schedule/{tenant_id}`
- `/api/gmail/connect`, `/api/gmail/callback`, `/api/gmail/status`, `/api/gmail/disconnect`
- `/api/gmail/emails`, `/api/gmail/emails/{id}`, `/api/gmail/threads/{id}`
- `/api/gmail/send`, `/api/gmail/reply`, `/api/gmail/emails/{id}/toggle-read`

## Prioritized Backlog

### P1 - Next Up
- Recruiting Automation: Auto-include athlete schedule link in outreach emails
- Location-based suggestions: "You're attending a tournament near Purdue. Email their coach?"

### P2 - Refactoring
- Break down `SettingsPage.js` into smaller components (AthleteProfileForm, PhysicalInfoForm, etc.)
- Move event/profile CRUD from `server.py` into separate route files
- Add Analytics page content

### P3 - Future
- Email templates for recruiting outreach
- Bulk email sending
- Coach contact import/export
- Mobile-responsive improvements
