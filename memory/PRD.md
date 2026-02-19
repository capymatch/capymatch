# Volleyball Recruiting CRM — Product Requirements Document

## Original Problem Statement
Public-facing Volleyball Recruiting CRM. Redesign core features, make mobile-friendly, full-app visual redesign, admin area, subscription engine, Apple-inspired UX.

## Core Requirements
1. Dynamic Recruiting Board with custom parent-friendly grouping
2. University Knowledge Base (populated & managed)
3. Mobile-friendly entire app
4. Dark theme + teal/navy palette (light theme)
5. Admin Area: User, University, Subscription, Integration Management
6. Subscription Engine with feature gating (Starter, Pro, Premium)
7. Stripe integration for payments
8. AI-powered "Next Step" suggestions
9. Girls/Boys volleyball data separation
10. Recruiting Journey page UX overhaul
11. Rule-based "What's Next?" prompts
12. File attachments for emails
13. Celebratory "hero card" for athlete commitments
14. Private per-school notes
15. Automated follow-up system
16. Dashboard redesign for daily actions
17. University logos for Knowledge Base
18. External API for school data (College Scorecard)
19. Coach contact scraping from university websites
20. Email preview/confirmation before sending
21. "Find Schools" page redesign
22. Dedicated single-school detail page

## What's Been Implemented
- **School Info Page**: New page with backend endpoint, on-demand College Scorecard API data
- **Find Schools Redesign**: Rebuilt to match cleaner UI mockup
- **School Sorting**: By match percentage descending
- **Global Color Palette**: Pink replaced with teal/navy palette across entire light theme
- **Hybrid Theme**: Dark hero/banner + light content on Find Schools & School Info pages
- **NCAA Timeline Color Fix** (Feb 2026): Replaced washed-out opacity-based colors with solid muted medium-tone palette. Contact=#7ab8b0, Dead=#c09090, Evaluation=#8890b8, Quiet=#c0b080

## Key Architecture
- Frontend: React + Tailwind + shadcn/ui
- Backend: FastAPI + MongoDB
- Auth: Emergent-managed Google Auth + JWT
- AI: Claude Sonnet 4.5 via Emergent LLM Key
- External: College Scorecard API, DuckDuckGo Search, BeautifulSoup/lxml scraping

## Known Issues
- Pipeline Tour tooltip disappears on off-screen elements (P1, VERIFICATION PENDING)

## Upcoming Tasks (P1)
- Refactor RecruitingJourney.js (extract 5 modals)
- Separate Girls/Boys volleyball data
- Camp/Tournament ROI tracker
- Email templates & bulk outreach

## Future/Backlog (P2)
- Build Marketing Website
- Tiered Celebrations
- App Naming
- Multi-sport capability
- Family Collaboration Roles (read-only parent/viewer)
