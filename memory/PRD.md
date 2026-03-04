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

### Campus Diversity Data Scrape & Display (Mar 4, 2026)
- Scraped campus diversity data from productiverecruit.com for all 12 pipeline schools
- 9 demographic categories per school: American Indian/Alaska Native, Asian, Black, Hispanic/Latino, Native Hawaiian/Pacific Islander, Non Resident, Two or more, Unknown, White
- Each category shows Student % and Faculty % with color-coded progress bars
- Displayed on SchoolInfoPage below Financial section
- Scraper script: `backend/scripts/scrape_diversity.py`
- Frontend: `frontend/src/pages/SchoolInfoPage.js`

### YouTube URL Data Audit & Fix (Mar 4, 2026)
- Audited all 455 YouTube URLs in knowledge base
- Fixed 16 wrong channels (pointing to wrong schools: CollegeSquash, Yahoo Sports, SEC, TV stations, etc.)
- Fixed 7 duplicate URL issues (unrelated schools sharing the same channel URL)
- Total: 23 schools corrected. 5 remaining duplicates are same-named schools (low priority)
- Schools fixed: Franklin & Marshall, Tufts, LIU, LSU, Schreiner, MSOE, North Central, North Park, Dominican (IL & NY), Ouachita Baptist, Pacific, Covenant, Harding, Fairfield, SUNY Maritime, Virginia State, Illinois State, UW-Eau Claire, UNO, Bridgewater State, Anderson SC, Wheaton MA

### Twitter Quick Links & YouTube Data Fix (Mar 4, 2026)
- Added "Follow on X" section to Social Spotlight — horizontally scrollable cards linking to each school's Twitter/X profile (no API key needed)
- Fixed YouTube URLs for 9 schools (Stanford, Penn State, Texas, Florida, Georgia Tech, Johns Hopkins, Tampa, Emory, ACU) — feed went from 1 school/7 videos to 5 schools/20 videos
- Fixed Alabama A&M Twitter URL (was pointing to Marquette)
- Backend endpoint: GET /api/social-spotlight/social-links
- Files: `backend/routes/youtube_feed.py`, `frontend/src/pages/SocialSpotlight.js`

### "New This Week" Badge (Mar 4, 2026)
- Auto-tags videos published within last 7 days with teal "NEW" badge on thumbnail
- Appears on both regular video cards (top-right) and trending cards (top-right)
- Pure frontend logic — no backend changes needed
- File: `frontend/src/pages/SocialSpotlight.js` (isNewThisWeek helper)

### Trending Section Enhancement (Mar 4, 2026)
- "Trending" row at top of Social Spotlight showing top 3 most-viewed videos
- Backend fetches YouTube view counts via statistics API (batched, max 50/call)
- Rank badges (#1, #2, #3) and view count badges on each card
- Minimum 100 views threshold to qualify for trending
- Trending hides when filtering by specific school, reappears on "All Schools"
- File: `backend/routes/youtube_feed.py` (enrich_view_counts), `frontend/src/pages/SocialSpotlight.js` (TrendingSection)

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
