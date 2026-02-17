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
10. Complete UX/UI overhaul of Recruiting Journey page (7-point mockup)

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn/UI, Lucide React
- Backend: FastAPI, Pydantic, MongoDB
- Auth: Cookie-based sessions (session_token)
- 3rd Party: Gmail API, Anthropic Claude (Emergent LLM Key), react-joyride, Stripe, Resend

## User Personas
- **Parents**: Primary users managing their child's volleyball recruiting
- **Admin**: App administrators managing users, universities, subscriptions

## Test Accounts
- Pro User: pro@test.com / password
- Premium User: premium@test.com / password

## What's Implemented (Completed)
- Full recruiting board with 5-stage funnel (overdue, needs_outreach, waiting_on_reply, in_conversation, archived)
- Journey Page complete redesign with 7 features:
  1. Visual Progress Rail with pulse indicator (FIXED Feb 17, 2026)
  2. Getting Started Checklist
  3. Conversation-style Timeline
  4. At a Glance contextual sidebar
  5. Celebration state for coach replies
  6. Floating Action Bar
  7. School Comparison page (/compare)
- Progress Rail cascade fill logic (backend)
- Stage click/undo toggle behavior
- **campus_visit, offer, committed stages are MANUAL ONLY** — not auto-detected from interactions (fixed Feb 17, 2026)
- Stage label "Replied" renamed to "In Conversation" (Feb 17, 2026)
- **Rule-based "What's Next?" card** — contextual follow-up suggestions based on latest activity (camp, call, email, visit, showcase). Dismissible. Hides when celebration hero or getting started checklist shows. (Feb 17, 2026)
- **Camp milestone** in timeline with 🏋️ emoji and "[University] Camp" title (Feb 17, 2026)
- Log interaction dropdown updated: "Camp Meeting" → "Camp" (Feb 17, 2026)
- Coach CRUD, Interaction logging, Follow-up scheduling
- Email composer with AI drafts (Premium)
- Mark as Replied flow
- Admin dashboard, user management, university management
- Subscription engine with feature gating
- NCAA Timeline, Analytics, Calendar pages
- Coach Watch (web scraping), Highlight Advisor

## What's Implemented (Recent — Feb 17, 2026)
- **"Committed" Hero Card**: Celebratory card with trophy icon, confetti animation, gold shimmer, school name display. Shows at top of Journey page when journey_stage="committed". Takes priority over all other hero cards (Getting Started, Celebration). Toggleable via Progress Rail click.
- **Collapsible Journey Details**: When committed, Timeline + At a Glance are hidden by default with "View full journey" toggle.
- **Personal Notes Sidebar**: Collapsible right sidebar per school. Features: create, pin/unpin, edit, delete notes. Panel slides from right edge with note count badge. Stored in `notes` collection.
- **Font Upgrade**: Switched from Lora serif + DM Sans to Plus Jakarta Sans across the entire app.
- **At a Glance Spacing**: Tuned section gaps in the sidebar to 14px for balanced readability.
- **Stage Log Modal**: Clicking a progress rail stage now opens a modal requiring users to log what happened. Entry is saved to the timeline.

## P0 Backlog
- Separate Girls/Boys Volleyball data and features

## P1 Backlog
- Camp/Tournament ROI tracker
- Email templates & bulk outreach

## P2 Backlog (Future)
- App Naming
- Multi-sport capability
- Family Collaboration Roles (read-only Parent/Viewer role)

## Key Architecture Decisions
- Progress Rail uses percentage-based track positioning (halfStep = 100/(2*TOTAL)) for precise dot-line alignment
- Backend cascade fill: manual journey_stage fills all stages up to that point
- Active stage = last consecutively completed stage (always gap-free)
- Journey_stage stored as single string in programs collection
