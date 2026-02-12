# Recruiting HQ - Complete Documentation

## Table of Contents
1. [Overview](#overview)
2. [Features](#features)
3. [User Guide](#user-guide)
4. [Technical Architecture](#technical-architecture)
5. [Database Schema](#database-schema)
6. [API Reference](#api-reference)
7. [Integrations](#integrations)
8. [Automation Rules](#automation-rules)
9. [Notifications System](#notifications-system)

---

## Overview

**Recruiting HQ** is an AI-powered CRM (Customer Relationship Management) platform designed specifically for volleyball athletes navigating the college recruiting process. It helps athletes track schools, communicate with coaches, manage their recruiting pipeline, and present themselves professionally to college programs.

### Target Users
- High school volleyball athletes (Class of 2025-2030)
- Club volleyball players pursuing college opportunities
- Parents/guardians supporting their athlete's recruiting journey

### Key Value Propositions
- **Centralized Recruiting Hub**: Track all schools, coaches, and communications in one place
- **Native Gmail Integration**: Send and receive coach emails without leaving the app
- **AI-Powered Assistance**: Generate personalized email drafts using AI
- **Smart Automation**: Automatic status updates when you email coaches or receive replies
- **Professional Public Profile**: Shareable profile page with schedule, stats, and highlight videos
- **Intelligent Notifications**: Get alerted when coaches reply or view your profile

---

## Features

### 1. Dashboard
The command center for your recruiting journey.

| Widget | Description |
|--------|-------------|
| **Key Stats** | Total schools tracked, follow-ups due, profile views |
| **Smart Follow-Up Reminders** | AI-powered suggestions for which coaches to contact |
| **Upcoming Events** | Next camps, showcases, and tournaments |
| **Onboarding Checklist** | Setup progress tracker for new users |

### 2. Pipeline (Kanban Board)
Visual recruiting pipeline with drag-and-drop functionality.

**Recruiting Stages:**
| Stage | Description |
|-------|-------------|
| Researching | Schools you're interested in but haven't contacted |
| Contacted | Initial outreach sent |
| Responded | Coach has replied to your communication |
| Visited | Campus visit completed |
| Applied | Application submitted |
| Committed | Verbal or signed commitment |

**Program Card Details:**
- University name, division, conference
- Head coach name and email
- Recruiting status and reply status
- Priority level (Low, Medium, High, Very High)
- Next action due date
- Quick actions (email, view details)

### 3. Inbox (Gmail Integration)
Full email management within the app.

**Capabilities:**
- View all recruiting-related emails (.edu addresses)
- Compose new emails to coaches
- Reply to email threads
- AI-generated email drafts (Introduction, Follow-Up, Thank You, Interest Update)
- Mark emails as read/unread
- Filter by known coaches

**AI Email Types:**
| Type | Use Case |
|------|----------|
| Introduction | First contact with a coach |
| Follow-Up | Check in after no response |
| Thank You | Post-visit or post-conversation |
| Interest Update | Share new achievements or stats |

### 4. Calendar
Event management for recruiting activities.

**Event Types:**
- 🏐 Camp
- ⭐ Showcase
- 🏆 Tournament
- 🏫 Visit (Campus)
- 🎯 Tryout
- 📅 Meeting
- ⏰ Deadline
- 📌 Other

**Features:**
- Monthly/weekly view
- Color-coded event types
- Event details (location, time, description)
- Link events to specific programs

### 5. Schools Database
Pre-loaded database of 40+ D1, D2, and D3 volleyball programs.

**Information Included:**
- University name and mascot
- Division and conference
- Region
- Website link
- One-click "Add to Pipeline"

### 6. Athlete Profile
Comprehensive profile management.

**Profile Sections:**

| Section | Fields |
|---------|--------|
| **Basic Info** | Name, Photo, Graduation Year, Position, Jersey # |
| **Physical Stats** | Height, Weight, Reach, Approach Touch, Block Touch, Wingspan |
| **Academic** | GPA, High School |
| **Team Info** | Club Team, City, State |
| **Media** | Hudl Profile Link, Highlights Video (YouTube), Bio |
| **Contact** | Athlete Email & Phone, Club Coach Name/Email/Phone |

### 7. Public Profile Page
Shareable profile for coaches at `/s/{id}`.

**Displays:**
- Large athlete photo
- Name, position, grad year, height
- Physical stats badges
- Team and location info
- Bio
- Hudl profile button (if provided)
- Embedded YouTube highlights
- Upcoming events schedule
- Contact buttons (Email, Call)
- Club coach contact info

### 8. Analytics
Track engagement and recruiting activity.

**Metrics:**
- Profile views (total, today, this week)
- .edu domain visitors (potential coaches)
- Visitor timeline
- Referrer tracking

### 9. Settings
App configuration and preferences.

**Options:**
- Gmail connection management
- Theme toggle (Dark/Light mode)
- Replay onboarding tour
- Account information

---

## User Guide

### Getting Started

#### Step 1: Sign In
1. Go to the app URL
2. Click "Sign in with Google"
3. Authorize with your Google account

#### Step 2: Complete Onboarding
The guided tour will show you:
- Dashboard overview
- Pipeline for tracking schools
- Calendar for events
- Inbox for coach emails
- Schools database
- Profile settings

#### Step 3: Set Up Your Profile
1. Navigate to **Profile** from the user menu
2. Upload your action photo
3. Fill in all sections:
   - Basic info (name, grad year, position)
   - Physical measurements
   - Academic info
   - Team details
   - Hudl link and highlight video
   - Contact information
4. Click **Save Profile**

#### Step 4: Connect Gmail
1. Go to **Settings**
2. Click **Connect Gmail**
3. Authorize Gmail access
4. You can now send/receive emails from the Inbox

#### Step 5: Add Schools to Pipeline
1. Go to **Schools** database
2. Browse or search for programs
3. Click **Add to Board** on any school
4. Or manually add via Pipeline → **Add School**

### Daily Workflow

1. **Check Dashboard** for:
   - Follow-up reminders
   - Upcoming events
   - New notifications

2. **Review Inbox** for:
   - Coach replies
   - New recruiting emails

3. **Update Pipeline** as:
   - You send emails (auto-updates to "Contacted")
   - Coaches reply (auto-updates to "Reply Received")
   - Status changes occur

4. **Share Your Profile**:
   - Copy your public link from Profile page
   - Include in email signatures
   - Share with coaches

---

## Technical Architecture

### Stack Overview

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                          │
│  React + Tailwind CSS + Shadcn/UI + React Router    │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                    BACKEND                           │
│           FastAPI + Motor (Async MongoDB)           │
└─────────────────────────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │ MongoDB  │  │ Gmail    │  │ Claude   │
    │          │  │ API      │  │ AI       │
    └──────────┘  └──────────┘  └──────────┘
```

### Frontend Structure

```
/app/frontend/src/
├── App.js                 # Router configuration
├── components/
│   ├── Layout.js          # Main app layout with sidebar
│   ├── Tour.js            # Onboarding tour
│   ├── OnboardingChecklist.js
│   └── ui/                # Shadcn components
├── pages/
│   ├── Dashboard.js       # Main dashboard
│   ├── RecruitingBoard.js # Kanban pipeline
│   ├── CalendarPage.js    # Event calendar
│   ├── Inbox.js           # Email management
│   ├── ProfilePage.js     # Athlete profile editor
│   ├── PublicSchedule.js  # Public profile page
│   ├── SettingsPage.js    # App settings
│   ├── Analytics.js       # Profile analytics
│   ├── UniversityKnowledgeBase.js  # Schools DB
│   ├── NeedsFollowUp.js   # Follow-up tasks
│   └── ProgramDetail.js   # School detail view
└── lib/
    ├── api.js             # Axios instance
    └── theme.js           # Theme provider
```

### Backend Structure

```
/app/backend/
├── server.py              # FastAPI app + background tasks
├── database.py            # MongoDB connection
├── auth.py                # Authentication helpers
├── models.py              # Pydantic models
└── routes/
    ├── auth_routes.py     # Google OAuth
    ├── programs.py        # Schools/programs CRUD
    ├── events.py          # Calendar events
    ├── dashboard.py       # Dashboard data
    ├── profile.py         # Athlete profile + public page
    ├── knowledge.py       # University database
    ├── ai.py              # AI email drafts
    ├── gmail.py           # Gmail integration
    └── notifications.py   # Notification system
```

### Background Tasks

| Task | Interval | Purpose |
|------|----------|---------|
| Coach Reply Checker | 10 minutes | Scans Gmail for coach replies, updates statuses, creates notifications |

---

## Database Schema

### Collections

#### `users`
```javascript
{
  user_id: "user_abc123",
  email: "athlete@email.com",
  name: "Clara Gimenes",
  picture: "https://...",
  tenant_id: "tenant_abc123",
  created_at: "2024-01-15T10:30:00Z"
}
```

#### `programs`
```javascript
{
  program_id: "prog_xyz789",
  tenant_id: "tenant_abc123",
  university_name: "Stanford University",
  division: "D1",
  conference: "Pac-12",
  region: "West",
  website: "https://...",
  recruiting_status: "Contacted",  // Researching, Contacted, Responded, Visited, Applied, Committed
  reply_status: "Awaiting Reply",  // No Reply, Awaiting Reply, Reply Received
  priority: "High",                // Low, Medium, High, Very High
  initial_contact_sent: "2024-01-20",
  last_follow_up: "2024-02-01",
  follow_up_days: 14,
  next_action: "Send follow-up email",
  next_action_due: "2024-02-15",
  notes: "Coach mentioned they need a right side...",
  created_at: "2024-01-15T10:30:00Z",
  updated_at: "2024-02-01T14:20:00Z"
}
```

#### `coaches`
```javascript
{
  coach_id: "coach_def456",
  tenant_id: "tenant_abc123",
  program_id: "prog_xyz789",
  university_name: "Stanford University",
  coach_name: "Kevin Hambly",
  role: "Head Coach",  // Head Coach, Assistant Coach, Recruiting Coordinator
  email: "khambly@stanford.edu",
  phone: "(650) 555-1234",
  notes: "Prefers morning calls",
  created_at: "2024-01-15T10:30:00Z"
}
```

#### `interactions`
```javascript
{
  interaction_id: "int_ghi789",
  tenant_id: "tenant_abc123",
  program_id: "prog_xyz789",
  university_name: "Stanford University",
  coach_email: "khambly@stanford.edu",
  date_time: "2024-01-20T09:00:00Z",
  type: "Email",       // Email, Phone Call, Video Call, In-Person, Camp, Visit
  outcome: "Positive", // No Response, Positive, Neutral, Negative
  notes: "Discussed roster needs for 2025",
  message_copy: "Dear Coach Hambly...",
  created_at: "2024-01-20T09:05:00Z"
}
```

#### `events`
```javascript
{
  event_id: "evt_jkl012",
  tenant_id: "tenant_abc123",
  title: "Stanford Volleyball Camp",
  event_type: "Camp",  // Camp, Showcase, Tournament, Visit, Tryout, Meeting, Deadline, Other
  location: "Maples Pavilion, Stanford, CA",
  description: "Elite skills camp with coaching staff",
  start_date: "2024-06-15",
  end_date: "2024-06-17",
  start_time: "09:00",
  end_time: "16:00",
  program_id: "prog_xyz789",
  color: "purple",
  created_at: "2024-01-15T10:30:00Z"
}
```

#### `athlete_profiles`
```javascript
{
  tenant_id: "tenant_abc123",
  athlete_name: "Clara Gimenes",
  photo_url: "data:image/jpeg;base64,...",
  grad_year: "2028",
  position: "Right Side",
  height: "6'0\"",
  weight: "145",
  jersey_number: "14",
  gpa: "3.8",
  high_school: "Hamilton Southeastern HS",
  club_team: "Munciana NighHawks",
  city: "Fishers",
  state: "IN",
  handed: "Right",
  standing_reach: "7'8\"",
  approach_touch: "9'10\"",
  block_touch: "9'4\"",
  wingspan: "6'2\"",
  hudl_profile_url: "https://hudl.com/profile/12345",
  video_link: "https://youtube.com/watch?v=...",
  bio: "Volleyball has become a huge part of who I am...",
  contact_email: "clara@email.com",
  contact_phone: "(317) 555-1234",
  parent_name: "Coach Mike Smith",
  parent_email: "msmith@munciana.com",
  parent_phone: "(317) 555-5678",
  updated_at: "2024-02-01T14:20:00Z"
}
```

#### `notifications`
```javascript
{
  notification_id: "notif_mno345",
  tenant_id: "tenant_abc123",
  type: "coach_reply",  // coach_reply, follow_up_due, profile_view_edu
  title: "Coach Replied!",
  message: "Kevin Hambly from Stanford replied to your email",
  data: {
    program_id: "prog_xyz789",
    university_name: "Stanford University",
    coach_email: "khambly@stanford.edu"
  },
  read: false,
  created_at: "2024-02-01T14:20:00Z"
}
```

#### `profile_views`
```javascript
{
  view_id: "pv_pqr678",
  tenant_id: "tenant_abc123",
  visitor_ip: "171.64.x.x",
  user_agent: "Mozilla/5.0...",
  referer: "https://gostanford.com/...",
  is_edu: true,
  school_hint: "Stanford",
  viewed_at: "2024-02-01T14:20:00Z"
}
```

#### `gmail_tokens`
```javascript
{
  user_id: "user_abc123",
  access_token: "ya29...",
  refresh_token: "1//...",
  expires_at: "2024-02-01T15:20:00Z",
  gmail_email: "athlete@gmail.com",
  connected_at: "2024-01-15T10:30:00Z"
}
```

---

## API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/google` | Initiate Google OAuth |
| GET | `/api/auth/google/callback` | OAuth callback |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/logout` | Log out |

### Programs (Schools)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/programs` | List all programs |
| GET | `/api/programs/{id}` | Get program details |
| POST | `/api/programs` | Add program to pipeline |
| PUT | `/api/programs/{id}` | Update program |
| DELETE | `/api/programs/{id}` | Remove program |

### Coaches

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/coaches` | List all coaches |
| POST | `/api/coaches` | Add coach to program |
| PUT | `/api/coaches/{id}` | Update coach |
| DELETE | `/api/coaches/{id}` | Remove coach |

### Events

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/events` | List all events |
| POST | `/api/events` | Create event |
| PUT | `/api/events/{id}` | Update event |
| DELETE | `/api/events/{id}` | Delete event |

### Profile

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/athlete-profile` | Get athlete profile |
| PUT | `/api/athlete-profile` | Update profile |
| POST | `/api/athlete-profile/photo` | Upload photo |
| GET | `/api/share-link` | Get public profile URL |
| GET | `/api/profile-views` | Get view analytics |

### Public (No Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/public/schedule/{tenant_id}` | Public profile data |

### Gmail

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/gmail/status` | Check connection status |
| GET | `/api/gmail/connect` | Initiate Gmail OAuth |
| GET | `/api/gmail/callback` | Gmail OAuth callback |
| POST | `/api/gmail/disconnect` | Disconnect Gmail |
| GET | `/api/gmail/emails` | List emails |
| GET | `/api/gmail/emails/{id}` | Get email details |
| GET | `/api/gmail/threads/{id}` | Get email thread |
| POST | `/api/gmail/send` | Send email |
| POST | `/api/gmail/reply` | Reply to email |
| POST | `/api/gmail/check-replies` | Manual reply check |

### AI

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/draft-email` | Generate AI email draft |

### Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | Get notifications |
| POST | `/api/notifications/{id}/read` | Mark as read |
| POST | `/api/notifications/read-all` | Mark all read |
| DELETE | `/api/notifications/{id}` | Delete notification |

### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Get dashboard stats |
| GET | `/api/reminders` | Get follow-up reminders |
| GET | `/api/follow-ups` | Get overdue follow-ups |

---

## Integrations

### Google OAuth 2.0
- **Purpose**: User authentication
- **Scopes**: `openid`, `email`, `profile`

### Gmail API
- **Purpose**: Email send/receive functionality
- **Scopes**: 
  - `gmail.readonly`
  - `gmail.modify`
  - `gmail.send`
  - `gmail.labels`
  - `userinfo.email`
  - `userinfo.profile`

### Anthropic Claude (Sonnet 4.5)
- **Purpose**: AI-powered email draft generation
- **Use Cases**:
  - Introduction emails
  - Follow-up emails
  - Thank you notes
  - Interest updates

---

## Automation Rules

### Email Sent to Coach
**Trigger**: User sends email via app to a tracked coach email

**Actions**:
1. If `recruiting_status` = "Researching" → Update to "Contacted"
2. If `reply_status` = "No Reply" → Update to "Awaiting Reply"
3. Set `initial_contact_sent` = today's date
4. Show toast notification confirming update

### Coach Replies
**Trigger**: Background task detects email from tracked coach (every 10 min)

**Actions**:
1. Update `reply_status` to "Reply Received"
2. Set `priority` to "Very High"
3. Create notification: "Coach Replied!"

### Status Change to "Contacted"
**Trigger**: Manual or automatic status change

**Actions**:
1. Set `initial_contact_sent` = today's date
2. Calculate `next_action_due` = contact date + follow_up_days

### Reply Status Changed to "Reply Received"
**Trigger**: Manual or automatic change

**Actions**:
1. Set `priority` to "Very High"

---

## Notifications System

### Notification Types

| Type | Icon | Trigger | Navigation |
|------|------|---------|------------|
| `coach_reply` | 💬 Green | Coach emails detected | → Inbox |
| `follow_up_due` | 🕐 Orange | Dashboard load with overdue tasks | → Tasks |
| `profile_view_edu` | 👁 Blue | .edu visitor views public profile | → Analytics |

### Notification Behaviors

- **Retention**: 7 days
- **Auto-refresh**: Every 60 seconds
- **Badge**: Shows unread count (max "9+")
- **De-duplication**:
  - .edu views: Once per IP per hour
  - Follow-ups: Once per day

### User Actions
- Click notification → Navigate to relevant page + mark as read
- "Mark all read" button
- Individual dismiss

---

## Security & Privacy

### Data Isolation
- All data is tenant-scoped
- Users can only access their own data
- Public profile only shows approved fields

### Authentication
- Google OAuth 2.0 (industry standard)
- Session-based authentication
- Secure token storage

### Gmail Integration
- OAuth 2.0 with refresh tokens
- Tokens encrypted at rest
- User can disconnect at any time
- Only recruiting-related emails accessed (.edu filter)

---

## Support & FAQ

### How do I share my profile with coaches?
1. Go to **Profile** page
2. Copy the **Public Schedule Link**
3. Include in your email signature or share directly

### Why isn't my email status updating?
- Make sure the coach's email in your pipeline matches exactly
- Check that Gmail is connected in Settings
- The background check runs every 10 minutes

### Can coaches see my full pipeline?
No. The public profile only shows:
- Your athlete info and stats
- Upcoming events
- Contact information
- Highlight videos

### How do I get notifications on my phone?
Currently, notifications appear in-app only. Push notifications for mobile may be added in a future update.

---

*Last Updated: February 2025*
*Version: 1.0*
