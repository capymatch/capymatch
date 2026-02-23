# Volleyball Recruiting CRM — PRD

## Original Problem Statement
Public-facing Volleyball Recruiting CRM — decision-support system for student-athletes via three-stage intelligence pipeline. Branded as "CapyMatch" with Apple-style design aesthetic.

## Intelligence Pipeline — COMPLETE
All 5 micro-agents built, tested, and wired. Three-stage architecture: Schema Mapper -> Payload Builder -> Intelligence Runtime.

| Agent | Labels | Endpoint |
|-------|--------|----------|
| School Insight | AI-generated | `POST /api/intelligence/school-insight/{id}` |
| Timeline | Unknown / Fills Early / Standard / Late | `POST /api/intelligence/timeline/{id}` |
| Roster/Stability | Unknown / Open / Limited / Tight + Stability | `POST /api/intelligence/roster/{id}` |
| Scholarship | Mix of Partial and Full / Typically Partial / Walk-On Pathways Common / Unknown | `POST /api/intelligence/scholarship/{id}` |
| NIL Readiness | Established NIL Support / Emerging NIL Support / NIL Information Limited | `POST /api/intelligence/nil/{id}` |

## Page Architecture
- **Dashboard** (/board) — Overview with pipeline, actions, activity feed
- **My Schools** (/pipeline) — Pipeline board with status grouping
- **Journey** (/journey/:programId) — Relationship management
- **School Detail** (/school/:domain) — Research hub with intelligence cards
- **Find Schools** (/knowledge-base) — Discovery with 1,053 universities
- **Calendar** — Events and upcoming items
- **Billing** (/billing) — Subscription management, billing history, cancel/reactivate

## Subscription & Payments — COMPLETE (Feb 23, 2026)
### Stripe Integration
- **Checkout**: `POST /api/stripe/checkout` creates Stripe Checkout sessions
- **Status**: `GET /api/stripe/checkout/status/{session_id}` polls payment status with auto-upgrade
- **Webhook**: `POST /api/webhook/stripe` processes completed payments as backup
- **Billing**: `GET /api/stripe/billing-history` returns transactions and subscription info
- **Cancel**: `POST /api/stripe/cancel` end-of-period cancellation (30-day grace)
- **Reactivate**: `POST /api/stripe/reactivate` undo pending cancellation
- **Library**: `emergentintegrations.payments.stripe.checkout` with `sk_test_emergent`

### Billing Page (Feb 23, 2026)
- Accessible from top-right profile dropdown ("Billing" link)
- Current Plan card with tier icon, price, and cancel option
- Billing History table with date, plan, amount, status, transaction ID
- Cancel flow: confirmation dialog -> end-of-period cancellation with 30-day grace
- Cancellation notice with expiry date and "Keep my plan" reactivation button
- Tested: 8/8 backend + all frontend flows passed (iteration_98)

### Subscription Tiers
| Tier | Price | Schools | AI Drafts | Key Features |
|------|-------|---------|-----------|-------------|
| Starter | Free | 5 | 0 | Basic pipeline, profile, search |
| Pro | $29/mo | 25 | 10/mo | Follow-ups, AI next steps, drafts |
| Premium | $49/mo | Unlimited | Unlimited | Coach watch, analytics, insights |

## Pre-Launch Audit (Feb 22, 2026) — CONDITIONAL GO
- 18/18 API endpoints healthy
- Security: Tenant isolation, bcrypt passwords, httponly secure cookies
- AI guardrails enforced across all intelligence agents

## Demo Account
- **Email**: demo@capymatch.com / **Password**: demo2026
- **Tier**: Premium
- **Athlete**: Emma Mitchell (Junior OH, A5 Volleyball, GA)

## Test Credentials
- **Demo**: demo@capymatch.com / demo2026
- **Google Auth**: douglas@yeslms.com
- **Stripe Test**: stripetest@test.com / Test1234! (basic tier)

## Prioritized Backlog
### P1
- Admin dashboard for contribution review/verification
- Protect demo account for production (read-only or removal)

### P2
- NCAA Timeline colors (cosmetic, recurring)
- Add rate limiting to API endpoints
- Consolidate AccountPage and SettingsPage overlapping content

### P2+
- Girls/Boys Volleyball separation
- Email templates & bulk outreach
- Camp/Tournament ROI tracker
- NIL transaction/payment platform
- Family Collaboration Roles
- Dev/staging environment setup
