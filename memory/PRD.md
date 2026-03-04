# CapyMatch - Volleyball Recruiting CRM

## Original Problem Statement
Build a comprehensive volleyball recruiting CRM platform for student-athletes. The platform helps athletes track their recruiting pipeline, manage communications with coaches, and stay informed about schools they're interested in.

## Core Requirements
1. **Persistent Database**: MongoDB Atlas for data persistence across deployments (DONE)
2. **Social Media Integration**: Display social media activity for schools and coaches (DONE)
3. **UI/UX Improvements**: Continuously refine UI based on user feedback (IN PROGRESS)
4. **Data Accuracy**: Ensure all data shown is correct and relevant (IN PROGRESS)
5. **Manual Email Logging**: Allow non-Gmail users to manually log emails (UPCOMING)
6. **Camp Data Integration**: Add university camp info to knowledge base (UPCOMING)
7. **Microsoft Outlook/365 Import**: Email import for Outlook users (BACKLOG)

## Architecture
- **Frontend**: React (CRA) with Tailwind CSS, Shadcn/UI components
- **Backend**: FastAPI (Python) 
- **Database**: MongoDB Atlas (persistent)
- **3rd Party**: YouTube Data API v3, Stripe, Anthropic Claude, Google APIs, Resend

## What's Been Implemented

### Social Spotlight Page (Redesigned - Mar 4, 2026)
- Complete UI redesign from cluttered sidebar layout to clean Apple-like design
- Horizontal scrollable school pill filters replacing left sidebar
- Full-width 3-column video grid with generous spacing
- School click filtering (click school pill → filter feed, click again → show all)
- Video count badges on school pills
- Women's Only toggle and Refresh controls
- Gated content overlay for basic tier users
- HTML entity decoding for YouTube titles
- Empty state with clear filters button
- File: `frontend/src/pages/SocialSpotlight.js`

### Previous Features (Complete)
- YouTube API live feed integration (backend: `backend/routes/youtube_feed.py`)
- Data enrichment - 98.5% social media coverage
- Social icons on Hero Card (My Schools page)
- Feature gating UI for premium content
- Advanced video filtering (women's volleyball only, no beach, recency fallback)
- Full auth system (Google OAuth + email/password)
- Recruiting pipeline board with drag-and-drop
- Journey tracking per school
- Gmail import
- AI features (Engagement AI, Highlight AI, AI Advisor)
- Calendar, Analytics, School Info pages
- Stripe billing integration
- Admin dashboard

## Prioritized Backlog

### P1 - Upcoming
- Manual Email Logging UI for non-Gmail users
- Camp Data Integration (add camp_url to knowledge base)
- Add Twitter/X to Live Feed for off-season content

### P2 - Future
- Fix Alabama A&M YouTube URL (data integrity, production-only issue)
- Microsoft Outlook/365 Import
- Full NIL transaction/payment platform
- Separate Girls/Boys Volleyball data models
- Email templates & bulk outreach
- Redesign "Find Schools" page

## Key Endpoints
- `GET /api/social-spotlight/feed` - YouTube videos for user's pipeline schools
- `POST /api/social-spotlight/feed/refresh` - Force cache clear
- `GET /api/programs` - User's recruiting pipeline

## Test Credentials
- Demo: `demo@capymatch.com` / `demo2026`
