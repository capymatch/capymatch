# Volleyball Recruiting CRM — Product Requirements Document

## Original Problem Statement
Build a public-facing Volleyball Recruiting CRM with dynamic recruiting board, university knowledge base, mobile-friendly design, admin area, subscription engine, and AI-powered recruiting assistance.

## Target Audience
High School Volleyball Athletes & Families

## Core Requirements
1. Dynamic Recruiting Board with custom, parent-friendly grouping
2. University Knowledge Base with logos
3. Mobile-friendly responsive design
4. Full-app visual redesign (dark theme with pink/coral accents)
5. Admin Area (User, University, Subscription, Integration management)
6. Subscription Engine with feature gating (Starter, Pro, Premium)
7. Stripe integration for payments
8. AI-powered "Next Step" suggestions
9. Separate Girls/Boys volleyball data
10. UX/UI overhaul of Recruiting Journey page
11. Rule-based "What's Next?" prompts
12. File attachments for emails
13. Celebratory hero card for commitments
14. Private per-school notes
15. Automated follow-up system
16. Dashboard redesign for daily actions
17. University logos for Knowledge Base

## Tech Stack
- Frontend: React + Tailwind + Shadcn/UI
- Backend: FastAPI + MongoDB
- Auth: Emergent-managed Google Auth, JWT
- AI: Anthropic Claude Sonnet 4.5 (Emergent LLM Key)
- Icons: Lucide React
- Product Tour: react-joyride

## 3rd Party Integrations
- Emergent-managed Google Auth (Gmail API) — WORKING
- Anthropic Claude Sonnet 4.5 (Emergent LLM Key)
- react-joyride (Product Tour)
- lucide-react (Icons)
- Stripe (Payments) — requires User API Key
- Resend (Email Notifications) — requires User API Key
- beautifulsoup4 / lxml (Web Scraping for Coach Watch)
- icon.horse API (University logos)
- Google Favicon API (Fallback logos)

## What's Been Implemented

### Completed Features
- Full Pipeline Page ("My Schools") visual overhaul with Dark + Pink theme
- Dynamic Hero Card on pipeline highlighting most urgent school
- **Journey Card Dark + Pink theme** (Feb 18, 2026) — applied consistent `#1e1e2e` charcoal background with `#e8456b` pink accents to the Journey page header card and progress rail
- Investor Demo HTML Walkthrough (8-slide interactive presentation)
- Multiple UX mockups for iterative design feedback
- Getting Started Checklist for new schools
- Committed Hero celebratory card
- Celebration Hero for coach replies
- Rule-based Next Step cards
- Conversation Timeline with chat bubbles
- At A Glance sidebar
- Floating Action Bar
- Email Composer with AI drafts and file attachments
- Coach management (add/edit/delete)
- Follow-up scheduler
- Mark as Replied flow
- Stage progress rail with manual stage advancement
- Private per-school notes sidebar
- AI Journey Summary (Premium)
- Coach Watch alerts

### Design System
- **Primary accent**: `#e8456b` (pink)
- **Dark card background**: `#1e1e2e` (charcoal)
- **Key cards use Dark + Pink theme**: Pipeline Hero Card, Journey Header Card
- Minimalist palette: charcoal, brand pink, urgent red, success green
- Font: DM Sans (body), Barlow Condensed (headings)

## Prioritized Backlog

### P1 — Upcoming
- Separate Girls/Boys Volleyball data architecture
- Camp/Tournament ROI tracker
- Email templates & bulk outreach

### P2 — Future
- Build Marketing Website
- Tiered Celebrations (milestones beyond first reply)
- App Naming
- Multi-sport capability
- Family Collaboration Roles (read-only Parent/Viewer role)

## Test Accounts
- **Pro User**: `pro@test.com` / `password`
- **Google Auth User (Demo Data)**: `douglas@yeslms.com`

## Key Files
- `/app/frontend/src/pages/RecruitingBoard.js` — Pipeline page (Dark + Pink hero card)
- `/app/frontend/src/pages/RecruitingJourney.js` — Journey page (Dark + Pink header card)
- `/app/frontend/src/pages/Dashboard.js` — Main dashboard
- `/app/frontend/public/` — HTML mockups for design iterations
- `/app/design_guidelines.json` — Design system reference
