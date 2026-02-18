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
10. Complete UX/UI overhaul of Recruiting Journey page

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn/UI, Lucide React
- Backend: FastAPI, Pydantic, MongoDB
- Auth: Cookie-based sessions + Emergent Google OAuth
- 3rd Party: Gmail API, Anthropic Claude (Emergent LLM Key), react-joyride, Stripe, Resend

## User Personas
- **Parents**: Primary users managing their child's volleyball recruiting
- **Admin**: App administrators managing users, universities, subscriptions

## Test Accounts
- Pro User: pro@test.com / password
- Premium User: premium@test.com / password
- Empty Board User: emptytest@test.com / password

## What's Implemented (Complete)
- Full recruiting board with 5-stage funnel
- Journey Page complete redesign with 7 features
- Progress Rail cascade fill logic
- Stage click/undo toggle behavior
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
- Personal Notes Sidebar per school
- Font Upgrade to Plus Jakarta Sans
- Stage Log Modal for progress rail
- Automated Follow-up System (2-14 day reminders)
- Enhanced Getting Started Checklist with dynamic steps
- Public Athlete Profile Redesign
- University Logos across all pages
- Light Theme Implementation
- Inline Gmail Connection on Intro Page
- Split-Screen Profile Editor
- Google OAuth Login Fix
- Coach Watch Badge on Journey Page
- Guided Tour Fix
- First Reply Celebration Feature
- Dashboard Redesign with 6 sections
- My Schools Empty State Redesign

## What's Implemented (Recent — Feb 18, 2026 Session 4)

### Investor Demo Walkthrough (Interactive HTML)
Created a polished, 8-slide interactive HTML walkthrough at `/investor-walkthrough.html` for investor presentations. Features:
- **Slide 1**: Problem statement — 500K+ players, ~4% make a roster, 0 tools built for families
- **Slide 2**: Personalized onboarding questionnaire (mock UI)
- **Slide 3**: AI-powered school discovery with spotlight hero and grid cards (mock UI)
- **Slide 4**: Recruiting board command center with kanban columns (mock UI)
- **Slide 5**: Per-school journey tracking with progress rail, What's Next, and timeline (mock UI)
- **Slide 6**: Smart follow-up system with AI-drafted emails (mock UI)
- **Slide 7**: Commitment celebration with confetti and stats
- **Slide 8**: Business model — pricing tiers (Free/Pro/Premium), TAM metrics, live demo CTA
- Navigation: Arrow keys, spacebar auto-play, touch swipe, clickable dots, progress bar
- URL: `{app-url}/investor-walkthrough.html`

**New File:** `/app/frontend/public/investor-walkthrough.html`

## What's Implemented (Recent — Feb 18, 2026 Session 3)

### Find Schools Page Complete Redesign (6 Apple-Inspired UX Features)
Complete rewrite of the Find Schools (UniversityKnowledgeBase) page with 6 major UX improvements:

1. **Spotlight Hero Recommendation**: Top match displayed as a large cinematic hero card (dark visual panel + details panel) with school name, 96% match score, "Why this school?" AI snippet, coach info, and prominent CTA. Below it, a horizontal scrollable carousel of remaining AI matches with mini-cards showing logos and scores.

2. **Horizontal Filter Pills**: Replaced the sidebar filter dropdowns with horizontal scrolling pill buttons. Division pills (D1/D2/D3/NAIA/JUCO) are color-coded (emerald/blue/violet/orange/yellow). Region and Conference pills follow with vertical dividers. Active filters glow with their division color. Reclaimed ~250px horizontal space.

3. **Quick Look Card Expansion**: Clicking any grid card expands it inline (spans full grid width) to reveal: coaching staff with avatars, "Why This School?" AI snippet, match reason tags, and Add to Board/Website/Close buttons. No page navigation needed. Clicking X or another card collapses it.

4. **Compact Grid View with List Toggle**: Grid/List toggle button in the search bar. Grid view (default) shows 3-column logo-forward visual cards with hover-lift animation and pink accent line on hover. List view preserves the original detailed row layout with coach info.

5. **Smart Buckets Preset Filters**: One-tap contextual quick-access buttons above results: "All Schools", "Dream Schools (D1)" with count, "Strong Match (80%+)" with count, "Close to Home", "Strong Academics" with count. Active bucket has pink background with shadow. These help parents who don't know what filters to pick.

6. **Sticky Search + Active Filter Summary**: Search bar sticks to top on scroll with glassmorphism blur effect (backdrop-filter: blur(20px)). Active filters shown as dismissible chips below the search bar with color-coding matching the filter type. "Clear all" resets everything.

**Bug Fixes in this session:**
- Fixed UCLA name mismatch between programs collection and knowledge base preventing "On Your Board" status
- Fixed region filter regex matching partial strings (e.g., "West" was returning "Midwest" results)

**New Files:**
- `/app/frontend/src/components/FindSchools/SpotlightHero.js` — Hero recommendation + carousel
- `/app/frontend/src/components/FindSchools/SchoolGridCard.js` — Grid card with Quick Look expansion
- `/app/frontend/src/pages/UniversityKnowledgeBase.js` — Complete rewrite with all 6 features
- `/app/mockups/find_schools_redesign.html` — Interactive HTML mockup (approved by user)

## Code Architecture
```
/app/frontend/src/
├── components/
│   ├── FindSchools/
│   │   ├── SpotlightHero.js          # NEW: Hero recommendation + carousel
│   │   └── SchoolGridCard.js         # NEW: Grid card with Quick Look expansion
│   ├── Layout/
│   │   ├── Layout.js
│   │   └── Tour.js
│   ├── Profile/
│   │   └── ProfilePreview.js
│   └── UniversityLogo.js
├── pages/
│   ├── Dashboard.js
│   ├── UniversityKnowledgeBase.js    # REWRITTEN: All 6 UX features
│   ├── RecruitingBoard.js
│   ├── pipeline/
│   │   └── EmptyBoardState.js
│   ├── Auth/
│   │   └── GoogleLoginHandler.js
│   ├── Journey/
│   │   └── JourneyPage.js
│   └── Profile/
│       └── ProfilePage.js
└── App.js

/app/backend/routes/
├── knowledge.py                      # MODIFIED: Fixed region filter regex
├── programs.py
└── athlete_profile.py
```

## P0 Backlog
- Separate Girls/Boys Volleyball data and features

## P1 Backlog
- Advanced UX improvements from Apple designer review (e.g., "Today" hero card on dashboard)
- Camp/Tournament ROI tracker
- Email templates & bulk outreach
- JourneyPage.js refactor (component too complex)
- ProfilePage.js decomposition into smaller sub-components
- PublicSchedule.js decomposition (500+ lines)

## P2 Backlog (Future)
- Tiered Celebrations (5th, 10th reply milestones, dream school replies)
- App Naming
- Multi-sport capability
- Family Collaboration Roles (read-only Parent/Viewer role)
