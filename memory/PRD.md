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
- **Backend**: FastAPI, Pydantic
- **Database**: MongoDB (via motor)
- **Auth**: Mocked (static user bypass)
- **3rd Party**: Gmail API, Anthropic Claude Sonnet 4.5 (Emergent LLM Key), React Joyride, lucide-react

## Architecture
- Backend: /app/backend/server.py (FastAPI main), routes/ directory
- Frontend: /app/frontend/src/ with pages/, components/, lib/
- Subscription gating: backend/subscriptions.py + frontend lib/subscription.js

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

## Subscription Tiers
- **Basic** ($0): 5 schools, no AI, basic features
- **Pro** ($19): 25 schools, 10 AI drafts/mo, Gmail, insights, analytics
- **Premium** ($39): Unlimited schools & AI, all features

## Test Reports
- /app/test_reports/iteration_27.json (P0 bug fix verification - 100% pass)
