# Recruiting HQ - Product Requirements Document

## Original Problem Statement
Build a Volleyball Recruiting CRM for athletes to track schools, email coaches via Gmail integration, and manage their path to playing college ball. The app includes AI-powered features, a public shareable profile, and comprehensive recruiting pipeline management.

## User Personas
- **Primary**: High school volleyball athletes (and their families) navigating the college recruiting process
- **Secondary**: Club coaches helping athletes with recruiting

## Core Features (Implemented)

### Authentication & User Management
- Google OAuth 2.0 sign-in
- Tenant-based data isolation

### Dashboard
- AI-powered widgets (Smart Follow-Up Reminders, Coach Activity Tracking)
- Key stats overview
- Upcoming events display
- Onboarding checklist for new users

### Athlete Profile
- Personal info (name, grad year, position, height, weight, jersey)
- Physical stats (reach, touch, wingspan, GPA)
- Team & location info
- Media links (Hudl Profile, YouTube highlights, bio)
- Contact info (athlete + club coach)
- Photo upload

### Public Profile Page
- Shareable URL: `/s/<id>`
- Displays athlete info, stats, events
- YouTube video embedding
- Hudl Profile button
- Contact buttons (email, phone)

### Recruiting Pipeline (Kanban Board)
- School/program tracking
- Stage management (Researching → Contacted → Responded → Visited → Applied → Committed)
- Coach contact management
- Notes and activity logging

### Gmail Integration
- Native Gmail connection via OAuth
- Send/receive recruiting emails
- AI-powered email drafts (Claude Sonnet 4.5)
- Email tracking and history

### Calendar/Events
- Event management (Camps, Showcases, Tournaments, Visits, etc.)
- Date/time/location tracking
- Public schedule sharing

### Onboarding Experience
- Guided tour (react-joyride) for first-time users
- Dashboard checklist tracking setup completion
- "Replay Tour" option in Settings

### Landing Page
- Professional marketing page at root URL
- Feature highlights
- Google sign-in CTA

## Tech Stack
- **Frontend**: React, Tailwind CSS, react-router-dom, lucide-react, react-joyride
- **Backend**: Python, FastAPI, Motor (async MongoDB)
- **Database**: MongoDB
- **Integrations**: Google OAuth 2.0, Gmail API, Anthropic Claude Sonnet 4.5

## Architecture
```
/app
├── backend/
│   ├── server.py          # FastAPI app entry point
│   ├── routes/            # Modular endpoint files
│   │   ├── ai.py
│   │   ├── auth_routes.py
│   │   ├── dashboard.py
│   │   ├── events.py
│   │   ├── gmail.py
│   │   ├── knowledge.py
│   │   ├── profile.py
│   │   └── programs.py
│   └── shared/            # Shared utilities
│       ├── auth.py
│       └── database.py
├── frontend/
│   └── src/
│       ├── App.js
│       ├── components/
│       │   ├── OnboardingChecklist.js
│       │   ├── Tour.js
│       │   └── layout/Layout.js
│       └── pages/
│           ├── LandingPage.js
│           ├── Dashboard.js
│           ├── ProfilePage.js
│           ├── PublicSchedule.js
│           ├── RecruitingBoard.js
│           └── ...
```

## Pending Tasks

### P1 - High Priority
- **App Naming**: Need unique name (Vollura is taken)

### P2 - Medium Priority
- **School Match Score**: Rate schools based on athlete preferences
- **Recruiting Timeline**: Visual guide to NCAA dates/deadlines
- **Camp/Tournament ROI**: Track which events lead to coach interactions
- **Email Templates**: Pre-built templates for recruiting scenarios
- **Bulk Outreach**: Send personalized emails to multiple coaches

### P3 - Lower Priority
- **Parent/Guardian Access**: Read-only dashboard for families

## Changelog

### 2025-02-12
- Added Hudl Profile Link field to athlete profile
- Field displays on public profile as orange button

### Previous Session
- Created professional landing page
- Implemented onboarding tour and checklist
- Refactored backend into modular routes structure
- Added dynamic page titles to header
- Fixed YouTube embed blocking issues
- Shortened public profile URL to `/s/<id>`
- Multiple UI spacing adjustments

## API Endpoints

### Profile
- `GET /api/athlete-profile` - Get athlete profile
- `PUT /api/athlete-profile` - Update athlete profile
- `POST /api/athlete-profile/photo` - Upload photo
- `GET /api/public/schedule/{tenant_id}` - Public profile data
- `GET /api/profile-views` - View tracking stats
- `GET /api/share-link` - Get shareable link

### Programs/Schools
- `GET /api/programs` - List tracked schools
- `POST /api/programs` - Add school
- `PUT /api/programs/{id}` - Update school
- `DELETE /api/programs/{id}` - Remove school

### Gmail
- `GET /api/gmail/status` - Connection status
- `POST /api/gmail/connect` - Initiate OAuth
- `GET /api/gmail/callback` - OAuth callback
- `GET /api/gmail/threads` - List email threads
- `POST /api/gmail/send` - Send email

### Events
- `GET /api/events` - List events
- `POST /api/events` - Create event
- `PUT /api/events/{id}` - Update event
- `DELETE /api/events/{id}` - Delete event

### AI
- `POST /api/ai/draft-email` - Generate email draft
- `GET /api/reminders` - Get smart follow-up reminders
- `GET /api/dashboard` - Dashboard with AI insights
