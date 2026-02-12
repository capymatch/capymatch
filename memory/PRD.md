# Volleyball Recruiting CRM - Product Requirements Document

## Original Problem Statement
Build a Volleyball Recruiting CRM with native Gmail integration for managing college volleyball recruiting. The app allows tracking programs, coaches, interactions, and email communications in one place.

## Core Architecture
- **Frontend**: React + Tailwind CSS + Shadcn/UI, port 3000
- **Backend**: FastAPI (Python) + MongoDB (Motor async driver), port 8001
- **Auth**: Google OAuth via Emergent-managed auth
- **Email**: Gmail API via separate Google OAuth 2.0 flow
- **Theme**: Purple gradient, dark/light mode support

## What's Been Implemented

### Completed (Pre-existing)
- Full UI/UX redesign with purple gradient theme (light/dark mode)
- Dashboard with stats, pipeline funnel, recent activity, schools requiring action
- Pipeline (Kanban-style) recruiting board
- Calendar page
- Settings page (theme toggles, profile, notifications, privacy)
- Google OAuth user authentication
- Programs/Coaches/Interactions CRUD
- University Knowledge Base with seed data
- Follow-ups management
- Placeholder pages for Inbox, Tasks, Schools, Analytics

### Completed - Feb 12, 2026: Gmail Integration Phase 1 + 2
- **Gmail OAuth 2.0 Authentication**: Separate OAuth flow for Gmail API access
  - `/api/gmail/connect` - Initiates Google OAuth flow
  - `/api/gmail/callback` - Handles OAuth callback, stores tokens
  - `/api/gmail/status` - Check connection status
  - `/api/gmail/disconnect` - Disconnect Gmail account
- **Email Syncing (Inbound)**: Live Gmail API integration
  - `/api/gmail/emails` - List emails with pagination & search
  - `/api/gmail/emails/{id}` - Get full email content with body parsing
  - `/api/gmail/threads/{thread_id}` - Get full email thread/conversation
- **Email Sending (Outbound)**:
  - `/api/gmail/send` - Compose and send new emails
  - `/api/gmail/reply` - Reply to emails preserving threads
  - `/api/gmail/emails/{id}/toggle-read` - Mark read/unread
- **Frontend Inbox Page**: Full email client UI
  - Email list with sender avatars, unread indicators, date formatting
  - Threaded conversation view
  - Compose new email modal
  - Reply functionality
  - Search emails
  - Pagination (load more)
  - "Connect Gmail" prompt for disconnected state
- **Settings Gmail Section**: Connect/disconnect Gmail in settings page
- **Token Management**: Auto-refresh expired tokens, secure storage in MongoDB

### Completed - Feb 12, 2026: Calendar Events Feature
- **Backend Events API**: Full CRUD at `/api/events` (create/read/update/delete)
  - Event fields: title, type, location, dates, times, linked school, notes
  - Event types: Camp, Showcase, Tournament, Visit, Tryout, Meeting, Deadline, Other
- **Frontend Calendar Update**: Complete rebuild with event management
  - "Add Event" button + modal form with all fields
  - Events display on calendar grid with color-coded types
  - Click day to see detail panel + add event for that date
  - Edit/delete events from modal
  - Upcoming events sidebar
  - Event type legend
- **Testing**: Backend 92%, Frontend 100% — `/app/test_reports/iteration_6.json`

### Completed - Feb 12, 2026: UI Improvements
- Simplified pipeline funnel to compact single-line strip
- Lightened dark theme (backgrounds raised ~10% lightness)
- Brighter stage title colors for dark mode
- Larger section titles and funnel text

## Database Collections
- `users` - User accounts
- `user_sessions` - Auth sessions
- `tenants` - Multi-tenant support
- `programs` - Recruiting programs
- `coaches` - Coach contacts
- `interactions` - Communication log
- `university_knowledge_base` - University directory
- `gmail_tokens` - Gmail OAuth tokens per user
- `gmail_oauth_states` - OAuth state verification (ephemeral)

## Key Files
- `/app/backend/server.py` - Main FastAPI server with CRM routes
- `/app/backend/gmail_routes.py` - Gmail OAuth and email routes
- `/app/frontend/src/pages/Inbox.js` - Full email inbox UI
- `/app/frontend/src/pages/SettingsPage.js` - Settings with Gmail connection
- `/app/frontend/src/pages/Dashboard.js` - Dashboard
- `/app/frontend/src/pages/RecruitingBoard.js` - Pipeline view
- `/app/frontend/src/components/Layout.js` - Sidebar layout
- `/app/frontend/src/App.js` - Router
- `/app/frontend/src/lib/api.js` - API client

## Environment Variables
### Backend (.env)
- `MONGO_URL` - MongoDB connection string
- `DB_NAME` - Database name
- `CORS_ORIGINS` - CORS configuration
- `GMAIL_CLIENT_ID` - Google OAuth client ID
- `GMAIL_CLIENT_SECRET` - Google OAuth client secret
- `GMAIL_REDIRECT_URI` - OAuth callback URL

### Frontend (.env)
- `REACT_APP_BACKEND_URL` - Backend API URL

## Prioritized Backlog

### P0 - In Progress
- [x] Gmail Integration Phase 1: Authentication & Setup
- [x] Gmail Integration Phase 2: Email Syncing (Inbound) + Sending

### P1 - Next
- Gmail Integration Phase 3: UI Enhancements
  - Associate emails with schools/coaches in pipeline
  - Email history within program detail views
  - Unread count badges in sidebar
- Gmail Push Notifications (Pub/Sub watch for real-time sync)

### P2 - Future
- Gmail Integration Phase 4: Templates
  - Email template library for recruiting emails
  - Template variables (coach name, school, etc.)
- Gmail Integration Phase 5: Automation
  - Detect coach replies to update recruiting status
  - No-reply reminders
  - Smart next-action suggestions
- Build out Tasks page functionality
- Build out Schools page functionality
- Build out Analytics page with charts/graphs
