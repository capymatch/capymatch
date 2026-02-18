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

## What's Implemented (Recent — Feb 18, 2026)
- **Public Athlete Profile Redesign (Complete)**: Full UX/UI overhaul of the public-facing profile page (/s/:shortId):
  - Side-by-side hero: photo left with accent line, cinematic name treatment right
  - Typography: Barlow Condensed 800 uppercase for name, DM Sans for body
  - Dark theme (#08080c) with pink/coral accent (#e8456b) and radial glow
  - Icon-led Quick Facts row (Height, Weight, GPA, Dominant hand)
  - Bento stat grid for Athletic Measurables (Approach Touch highlighted)
  - Elevated Club Coach card with avatar, title, email/call icon buttons
  - Custom video thumbnail with play overlay → YouTube iframe on click
  - "Where to See Me Play" calendar-style event cards with type badges
  - Sticky mobile CTA bar (Email, Call, Hudl) with backdrop blur
  - Share button (clipboard copy) + "Copy link" on video
  - Responsive: centers on mobile, side-by-side on desktop

- **University Logos (Complete)**: Added university logos across all pages using icon.horse API (high-quality Apple Touch Icons):
  - Knowledge Base: Logos in both "Recommended for You" cards and main university card list
  - Dashboard: Logos in Today's Actions (ActionRow) and School Spotlight cards
  - My Schools/Recruiting Board: Logos on all school cards
  - Onboarding (EmptyBoardState): Logos on suggested school cards
  - Cascading fallback: icon.horse (primary, high-res) -> Google Favicon (secondary) -> gradient initials
  - Shared component: `/app/frontend/src/components/UniversityLogo.js`
  - Backend: `domain` field added to `/api/suggested-schools` and `/api/knowledge-base/add-to-board`
  - Data cleanup: Fixed 200+ university domains (auto-generated gibberish -> real .edu domains)

- **Light Theme Implementation (Complete)**: Full Apple-inspired light theme across the entire app:
  - Sidebar: White background with pink accent on active nav item (was hardcoded crimson gradient)
  - Header: Glassmorphism blur effect with semi-transparent background
  - CSS Variables: Added sidebar-specific tokens (--t-sidebar-bg, --t-sidebar-brand-text, --t-nav-text, --t-nav-text-hover, --t-card-shadow, etc.)
  - Apple palette: Warm gray (#f5f5f7) page bg, white cards, dark charcoal text (#1d1d1f)
  - Fixed NotesSidebar hardcoded #141820 → var(--t-surface)
  - Dark mode fully preserved — gradient sidebar returns when switching back
  - Theme toggle works in Settings (Dark/Light/System)

- **Inline Gmail Connection on Intro Page (Complete)**: Gmail connection now embedded directly in the EmptyBoardState onboarding flow (Step 2) instead of redirecting to Settings.

- **Note-saving Checklist (Verified Fixed)**: NotesSidebar onNoteChange callback properly updates notesCount.

## What's Implemented (Recent — Feb 17, 2026)
- **Dashboard Redesign (Complete)**: Full redesign with 6 new sections:
  1. Greeting + Quick Pulse (4 contextual stats)
  2. Today's Actions (split: Follow-ups Due + Needs First Outreach)
  3. School Spotlight (horizontal scroll cards with next-step nudges)
  4. Pipeline Snapshot (vertical bar chart with division legend)
  5. Recent Activity (timeline feed)
  6. Upcoming Events (date-box layout)

- **My Schools Empty State Redesign (Complete)**: Rich empty state replacing the old "No schools" card:
  1. Progress strip (Create Profile → Add Schools → Email Coaches → Track Replies)
  2. Personalized welcome hero with athlete name
  3. Three action path cards (AI Recommendations, Browse by Division, Search by Location)
  4. AI-suggested school cards with match scores and "Add to Board" buttons
  5. Ghost board preview showing future pipeline columns
  6. Social proof strip

- **Google OAuth Fix (Complete)**: Fixed session_id reading from URL hash fragment (was incorrectly reading from query params). Added proper error handling and logging.

## Code Architecture
```
/app/frontend/src/pages/
├── Dashboard.js                    # Redesigned dashboard
├── RecruitingBoard.js              # My Schools board (imports EmptyBoardState)
├── pipeline/
│   └── EmptyBoardState.js          # NEW: Rich empty state component
└── RecruitingJourney/              # Journey page (complex, needs refactor)

/app/frontend/src/App.js            # OAuth callback fixed (hash fragment)
/app/frontend/src/pages/LoginPage.js # Google redirect URL updated
```

## What's Implemented (Recent — Feb 18, 2026 Session 2)
- **Split-Screen Profile Editor (Complete)**: Full WYSIWYG-style profile editor:
  - Left panel: Edit form with collapsible sections, auto-save, completeness ring, photo upload, share card
  - Right panel: Live preview matching the public profile design (PublicSchedule.js) — updates in real-time as user types
  - Desktop: Side-by-side layout
  - Mobile: Edit/Preview toggle buttons
  - Both panels scroll together
  - New component: `/app/frontend/src/components/ProfilePreview.js`

- **Coach Watch Badge on Journey Page (Complete)**: Added coaching staff health indicator (Option A) to the Coach Panel:
  - Green "Staff Stable" badge when no alerts exist for the school
  - Amber "Staff Change" badge with inline alert details when a coach change is detected  
  - Fetches from `/api/ai/coach-watch/alert/{university_name}` endpoint
  - Shows alert type (new coach, departure, staff change), summary, and detection date

- **Guided Tour Fix (Complete)**: Fixed tour feature:
  - Tour now triggers only after user adds their first school (not on every first visit)
  - Fixed 4 mismatched tour step targets (nav-pipeline→nav-my schools, nav-inbox→nav-my inbox, nav-schools→nav-find schools, nav-outreach ai→nav-ai-features-toggle)
  - Added auto-skip logic for missing DOM elements
  - Updated Settings > Replay Tour button to work with new flag system
  - Tour trigger added to EmptyBoardState and UniversityKnowledgeBase school addition flows

- **First Reply Celebration Feature (Complete)**: End-to-end celebration for first coach reply:
  - Backend: GET /api/first-reply-celebration (checks status), POST /api/first-reply-celebration/dismiss
  - Frontend: `/app/frontend/src/components/FirstReplyCelebration.js` modal with animations
  - Integrated into Dashboard.js

## P0 Backlog
- Separate Girls/Boys Volleyball data and features

## P1 Backlog
- Advanced UX improvements from Apple designer review (e.g., "Today" hero card on dashboard)
- Camp/Tournament ROI tracker
- Email templates & bulk outreach
- RecruitingJourney.js refactor (component too complex)
- ProfilePage.js decomposition into smaller sub-components
- PublicSchedule.js decomposition (500+ lines)

## P2 Backlog (Future)
- Tiered Celebrations (5th, 10th reply milestones, dream school replies)
- App Naming
- Multi-sport capability
- Family Collaboration Roles (read-only Parent/Viewer role)
