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

## Bug Fixes
- **P0 Fix (Feb 2026)**: Subscription gate failure on plan downgrade. Root cause: `/api/knowledge-base/add-to-board` endpoint had NO subscription enforcement. Fixed by adding `enforce_school_limit()`. Also fixed frontend error display for subscription limit errors and added periodic subscription state refresh.

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

## Upcoming Tasks (P1)
- None currently queued

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

## Subscription Tiers
- **Basic** ($0): 5 schools, no AI, basic features
- **Pro** ($19): 25 schools, 10 AI drafts/mo, Gmail, insights, analytics — "Most Popular"
- **Premium** ($39): Unlimited schools & AI, all features — "Best Value"
- **UpgradeModal redesign (Feb 2026)**: Professional dark glass-morphic design with recommended tier scaled up and glowing. Dynamic badge placement (next tier above current gets spotlight). Stripe Checkout integration on CTA buttons.

## Test Reports
- /app/test_reports/iteration_27.json (P0 bug fix verification - 100% pass)
