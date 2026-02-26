# CapyMatch PRD

## Original Problem Statement
Public-facing Volleyball Recruiting CRM ("CapyMatch") — a decision-support system for student-athletes providing data-driven insights for college recruiting. Features a three-stage AI pipeline for source-aware intelligence.

## User Personas
- **Student Athletes**: Navigate college recruiting with data-driven insights
- **Admin (Douglas)**: Manages platform, reviews contributions, monitors analytics

## Core Requirements
1. Dynamic Recruiting Board
2. University Knowledge Base (1053 schools)
3. Mobile-friendly responsive design
4. Admin Area with analytics
5. Subscription Engine with Stripe
6. AI-powered suggestions
7. Gmail integration (read-only scan + send emails)
8. Follow-up automation system
9. School detail pages with intelligence cards

## Architecture
- **Frontend**: React + TailwindCSS + Shadcn/UI (lazy-loaded pages)
- **Backend**: FastAPI + MongoDB (Motor async)
- **Auth**: Emergent-managed Google OAuth + email/password
- **AI**: Claude via Emergent LLM Key
- **Payments**: Stripe
- **Email**: Resend (password reset), Gmail API (user emails)

## Credentials
- **Demo User**: demo@capymatch.com / demo2026
- **Admin User**: douglas@yeslms.com (Google auth, also demo2026 in preview)

## What's Implemented (as of Feb 26, 2026)
- Full recruiting board with stages, signals, next-step suggestions
- Gmail integration (read-only + send, import history)
- AI intelligence cards with source-aware reasoning
- Stripe subscription (Free/Pro/Premium)
- Admin dashboard (users, contributions, import analytics)
- School detail pages with match scores, risk badges, timelines
- Knowledge base with 1053 schools (server-side pagination)
- Onboarding questionnaire with matching
- Delete account functionality
- Performance optimizations (40+ indexes, lazy loading, batch queries)

## Pending Issues
- NCAA Timeline colors (P2, recurring)
- Dead questionnaire links (P2)

## Backlog (P2/Future)
- Full NIL transaction platform
- Separate Girls/Boys volleyball data
- Email templates & bulk outreach
- Camp/Tournament ROI tracker
- Family Collaboration Roles
