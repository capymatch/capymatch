# Volleyball Recruiting CRM - Product Requirements Document

## Original Problem Statement
Public-facing Volleyball Recruiting CRM with:
- Dynamic Recruiting Board with custom grouping
- University Knowledge Base management
- Mobile-friendly design
- Full-app visual redesign (dark theme with pink/coral accents)
- Collapsible sidebar
- Admin Area (users, university data, subscriptions)
- Subscription Engine with tier-based feature gating (Basic, Pro, Premium)
- Stripe integration for payments
- AI-powered features for Pro/Premium tiers

## Tech Stack
- **Frontend**: React, react-router-dom, Tailwind CSS, Shadcn/UI, axios
- **Backend**: FastAPI, Pydantic, bcrypt
- **Database**: MongoDB (via motor)
- **Auth**: Session-based (cookie) with Google OAuth + email/password login
- **3rd Party**: Gmail API, Anthropic Claude Sonnet 4.5 (Emergent LLM Key), lucide-react, Stripe, Resend

## Architecture
- Backend: /app/backend/server.py (FastAPI main), routes/ directory
- Frontend: /app/frontend/src/ with pages/, components/, lib/
- Subscription gating: backend/subscriptions.py + frontend lib/subscription.js

## Authentication System (Feb 2026)
- Real session-based auth replacing the previous static user bypass
- **Google OAuth**: Redirect to Emergent Auth, session exchange via `/api/auth/session`
- **Email/Password**: Register (`/api/auth/register`) and login (`/api/auth/login`)
- Password hashing with bcrypt, session cookies (7-day expiry)
- Login page shows both options with toggle between Sign In / Sign Up
- Route protection: unauthenticated users redirected to `/login`
- Logout via profile dropdown clears session cookie
- New users redirected to onboarding quiz after registration

## Completed Features
1. Dynamic Recruiting Board with grouping (action_required, upcoming, in_progress, closed)
2. University Knowledge Base with CRUD, search, filters
3. Mobile-responsive dark-themed UI
4. Collapsible sidebar
5. Admin Area: User management, university data CRUD, subscription management
6. Subscription Engine: Feature gating for Basic/Pro/Premium tiers
7. Admin subscription management with audit logs
8. AI Features (Pro/Premium): AI Assistant, Outreach Insights, Highlight Reel Creator
9. Calendar, events, follow-ups, Gmail integration
10. Athlete profile and onboarding quiz
11. Match scores and suggested schools

## Login Page Light Theme (Feb 2026)
- Redesigned login page from dark theme to clean light theme
- White card on light gray (#f8f9fb) background
- All text, inputs, dividers updated to light-mode colors
- Pink CTA gradient button preserved as accent

## Bug Fixes
- **P0 Fix (Feb 2026)**: Subscription gate failure on plan downgrade. Root cause: `/api/knowledge-base/add-to-board` endpoint had NO subscription enforcement. Fixed by adding `enforce_school_limit()`. Also fixed frontend error display for subscription limit errors and added periodic subscription state refresh.
- **P0 Fix (Feb 2026)**: "Connect your Gmail" checklist step was shown to Basic plan users who don't have Gmail access. Fixed by conditionally rendering the Gmail onboarding step only when `subscription.tier !== 'basic'` in `Dashboard.js`. The step dynamically appears when a user upgrades.

## Real-Time Notifications (Feb 2026)
- WebSocket endpoint `/api/ws/{tenant_id}` for real-time push events
- When admin changes a user's plan, a WebSocket message is broadcast instantly
- Frontend shows a toast notification + persistent banner (green for upgrades, amber for downgrades)
- Subscription context auto-refreshes on plan change events
- Auto-reconnect on WebSocket disconnect (5s delay)

## Stripe Integration (Feb 2026)
- Self-serve subscription upgrades via Stripe Checkout
- `POST /api/stripe/checkout` creates checkout sessions for Pro ($19/mo) or Premium ($39/mo)
- `GET /api/stripe/checkout/status/{session_id}` polls payment status
- `POST /api/webhook/stripe` handles Stripe webhook events
- On successful payment, plan auto-upgrades + WebSocket notification sent
- Payment transactions stored in `payment_transactions` collection
- Frontend: UpgradeModal buttons redirect to Stripe, PaymentSuccess page polls for confirmation

## Admin Integrations Management (Feb 2026)
- New `/admin/integrations` page to manage all connected services
- Gmail card: shows OAuth status, connected users, disconnect option
- Stripe card: masked key display, TEST/LIVE badge, transaction stats, key update form
- AI card: provider info, masked key, monthly/total usage stats
- Backend: `GET /api/admin/integrations`, `PUT /api/admin/integrations/stripe`, `DELETE /api/admin/integrations/gmail/{user_id}`

## Product Tour (Feb 2026)
- Custom-built tour component (`Tour.js`) replacing `react-joyride`
- Dark-themed tooltip with pink/coral accent dots and buttons
- 9-step tour covering: Dashboard, Pipeline, Calendar, Inbox, Schools, AI Tools, Profile
- Spotlight cutout with animated pink border highlights the active UI element
- Semi-transparent overlay (40% opacity) keeps underlying UI visible for context
- Progress dots + step counter for orientation
- Skip/Back/Next navigation with localStorage persistence

## Account Page (Feb 2026)
- New `/account` route accessible from profile dropdown
- **Subscription card** moved from Dashboard to Account page (plan name, pricing, upgrade button, usage bars)
- **Change Password** form with current/new/confirm fields and backend validation
- **Danger Zone** with account deletion placeholder
- Backend: `POST /api/auth/change-password` endpoint with bcrypt verification

## Upcoming Tasks (P0)
- Migrate to persistent MongoDB database (currently mocked in-memory)

## Future/Backlog
- App naming (user deciding)
- Add more coach data to university database
- Camp/Tournament ROI tracker
- Email templates & bulk outreach
- Family Collaboration (read-only parent dashboard)

## Key Endpoints
- POST /api/knowledge-base/add-to-board - Add school from KB (enforces subscription limits)
- POST /api/programs - Add school directly (enforces subscription limits)
- GET /api/subscription - Current user's plan and usage
- PUT /api/admin/subscriptions/{user_id} - Admin plan change with audit log
- POST /api/ai/assistant, /api/ai/outreach-insights, /api/ai/highlight-reel - AI features

## Team Collaboration (Feb 2026)
- Multi-user collaboration with tier-based limits: Basic=1 user, Pro=2 users, Premium=unlimited
- **Owner**: Creates account, manages billing/subscription, invites/removes members
- **Member**: Full access to all recruiting features (pipeline, schools, AI, etc.) but cannot manage billing or team
- Invite by email, accept/decline flow, leave team option for members
- Team section in Settings page shows members, pending invitations, invite form
- **Contextual instructions**: Collapsible "How team collaboration works" guide in Team section explaining owner/member roles, how to invite, and what members can do
- **Basic Plan upgrade card**: Friendly explanation for Basic users about upgrading to invite collaborators
- **InvitationBanner**: Shows on dashboard with expandable "What does this mean?" section explaining shared data, feature access, and data safety
- Backend: `/api/team/*` endpoints with subscription enforcement
- DB collections: `team_members`, `team_invitations`

## Email Notifications — Resend Integration (Feb 2026)
- **Provider**: Resend (transactional email API)
- **Welcome Email**: Sent on registration with getting-started steps and plan info
- **Invitation Email**: Sent when team owner invites a member with CTA to sign in
- **Admin Controls**: Toggle email types on/off, update API key from Admin Integrations page
- **Fire-and-forget**: Emails sent via `asyncio.create_task` so they don't block API responses
- **Settings**: Stored in `db.email_settings` collection, checked before each send
- **Note**: In testing mode, Resend only delivers to verified email addresses

## Subscription Tiers (Renamed Feb 2026)
- **Starter** ($0, formerly Basic): 5 schools, no AI, basic features
- **Active Recruit** ($19, formerly Pro): 25 schools, 10 AI drafts/mo, Gmail, insights, analytics — "Most Popular"
- **Commit Ready** ($39, formerly Premium): Unlimited schools & AI, all features — "Best Value"
- **UpgradeModal redesign (Feb 2026)**: Professional dark glass-morphic design with recommended tier scaled up and glowing. Dynamic badge placement (next tier above current gets spotlight). Stripe Checkout integration on CTA buttons. Theme-aware (light/dark), responsive, uses React Portal.

## Completed (Feb 15, 2026)
- Removed redundant "Analytics" sidebar link (merged into Dashboard)
- Removed "Tasks" feature from sidebar, header icon, and route
- Renamed "Outreach AI" to "Engagement AI" / "Engagement Analysis" across sidebar and page
- Cleaned up mock data (removed invalid "Social Media" interaction type)
- **Coach Watch (Premium)**: AI-powered coaching staff monitoring
  - Scans news for coaching changes at pipeline schools via DuckDuckGo + Claude AI
  - Displays color-coded alerts (red/yellow/green) on Engagement AI page
  - Warning banners on Journey page for affected schools
  - Bell notifications for red/yellow alerts
  - Gated to Premium tier only
- **Schools Page Upgrade Prompt (Starter tier)**: Added a banner on the Knowledge Base/Schools page for Starter users informing them they see up to 3 school matches and can upgrade for unlimited matches. Links to /account page for self-serve upgrade.

## Completed (Feb 15, 2026 - Session 2)
- **Subscription Tier Rename**: Basic→Starter, Pro→Active Recruit, Premium→Commit Ready across entire stack
- **Upgrade Modal Refactor**: Theme-aware, responsive, React Portal for z-index, new tier names
- **Gated Content Upsell**: UpgradeBenefitsPage replaces toast notifications for premium pages
- **Journey Page Granular Locking**: Starter users can access Journey page; premium features locked per-feature:
  - Next Step Hero section: UNLOCKED (visible to all users)
  - Send Email button in Next Step Hero: LOCKED for Starter (disabled, gray, lock icon)
  - Timeline Email button: LOCKED for Starter
  - AI Insights sidebar: LOCKED for Starter
  - Follow-up Scheduler: LOCKED for Starter
  - Coach management (Add Coach): LOCKED for Starter
  - Log Interaction: UNLOCKED for all users
- **Schools Page Upgrade Banner**: Added for Starter users on Knowledge Base page
- **Sidebar Upgrade Indicators**: Replaced text badges with star icons for premium features

## Upcoming Tasks
- **P1**: Fix UI spacing on Engagement Analysis page (OutreachAnalysis.js) — recurring issue

## Future/Backlog
- Add more coach data to university database
- Camp/Tournament ROI tracker
- Email templates & bulk outreach
- App naming (blocked on user decision — "Vollura" was taken)
- Family Collaboration (read-only parent/viewer role)

## AI Next Step Suggestions (Feb 2026)
- **Premium-only** AI feature integrated into the existing Next Step Hero card on the Journey page
- Uses Claude Sonnet 4.5 to analyze athlete's timeline, communication history, and engagement signals
- Returns a single, actionable "Next Step" recommendation personalized by:
  - NCAA division (D1/D2/D3 with division-specific recruiting advice)
  - Journey stage (Targeting → Contacted → Engaged → Evaluating → Visit → Offer → Closed)
  - Communication history (last contact date, method, coach response status)
  - Engagement signals (upcoming camps, coach watch alerts, tournaments)
  - Timeline constraints (NCAA contact windows)
- Response includes: next_step text, reasoning, urgency level (high/medium/low), action_type
- **UI**: Purple-themed AI card overlays the default Next Step card when activated
  - "AI Suggest" button for Premium users (Sparkles icon)
  - Urgency badge (color-coded: red=high, amber=medium, green=low)
  - Contextual action button (Compose Email, Log Call, etc.)
  - Dismiss (X) to return to default view, Refresh to regenerate
- **Pro users**: See "Upgrade to Premium" teaser instead of AI Suggest button
- **Backend endpoint**: POST /api/ai/next-step (Premium-only, enforced via enforce_ai_limit)

## Completed (Feb 16, 2026)
- **CSS Cleanup - RecruitingBoard.js**: Replaced inline `style` object with Tailwind `flex flex-col gap-5` on groups container. Replaced hardcoded `rgba(255,255,255,0.04)` border with theme variable `var(--t-border)` for consistency.
- **Dead Code Removal - constants.js**: Removed unused `STATUS_GROUPS` and `DIVISION_COLORS` exports (replaced by `BOARD_GROUPS` in RecruitingBoard.js and local division color maps).
- **AI Features Premium-Only**: Moved ALL AI features to Commit Ready (premium) tier only:
  - Backend: Pro tier `ai_drafts_per_month=0`, `recruiting_insights=False`; all AI endpoints (draft-email, assistant, outreach-analysis, highlight-advice, coach-watch) now return 403 for non-premium users
  - Frontend: Engagement AI & Highlight AI pages show "Commit Ready Feature" upgrade page for Pro users
  - AI Advisor sidebar button opens upgrade modal for non-premium users
  - Account page feature list updated: all AI features show COMMIT READY badges for non-premium tiers
  - Sidebar star icons shown on all 3 AI nav items (Engagement AI, Highlight AI, AI Advisor) for Starter + Pro users
- **Journey Page AI Gating Fix**: Fixed bug where Pro users saw upgrade modal on Journey load and AI features appeared unlocked after closing:
  - Changed recruiting-insights fetch from `!isBasic` to `isPremium` (prevents 403 trigger)
  - AI Recruiting Insights sidebar locked for non-premium users with "Upgrade to Commit Ready" text
  - Coach Watch teaser shown for all non-premium users (was Starter only)
  - LockedOverlay component now supports `premiumOnly` prop for context-aware upgrade text
  - Log interactions, follow-up reminders, coaches, and match scores remain unlocked for Pro users (non-AI features)
- **Email Gating Fix (Feb 16, 2026)**: Fixed bug where Pro users couldn't send manual emails (email button was incorrectly locked):
  - Reverted the incorrect lock that blocked email buttons for Pro users
  - EmailComposer now accepts `isPremium` prop to gate ONLY AI draft buttons
  - Pro users: email composer opens with To/Subject/Body/Send all functional; AI draft buttons replaced by "AI email drafts require Commit Ready" locked notice
  - Premium users: full email composer with all 4 AI draft buttons (intro, follow_up, thank_you, interest_update) visible
  - Timeline "Email" button remains active for Pro users (only disabled for Starter)
  - Inbox ComposeModal AI Draft button gated for non-premium users (shows lock icon)
  - Suppressed duplicate "Failed to generate draft" error toast on subscription_limit 403 errors (UpgradeModal handles it)
  - Test verification: 12/12 frontend tests passed (iteration_37.json)

## Test Reports
- /app/test_reports/iteration_27.json (P0 bug fix verification - 100% pass)
- /app/test_reports/iteration_37.json (Email gating fix - 12/12 tests passed)
- /app/test_reports/iteration_35.json (Tier differentiation - 100% pass, 12 backend + 8 frontend)
- /app/test_reports/iteration_36.json (Premium-only AI gating - 14/14 backend, 8/9 frontend + 1 fix applied)
