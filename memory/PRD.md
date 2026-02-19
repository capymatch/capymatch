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
23. Recruiting Questionnaire URL auto-discovery on School Info pages

## What's Been Implemented
- **School Info Page**: Card-based layout with stats, coach cards, and scorecard data
- **Find Schools Redesign**: Dark-themed UI with smart chips, filters, grid/list views
- **School Sorting**: By match percentage descending
- **Global Color Palette**: Pink replaced with teal/navy palette across entire light theme
- **NCAA Timeline Color Fix**: Centralized COLORS system with mid-tone palette
- **School Info Page Redesign**: Card-based stat sections, Key Statistics hero row, teal accent coaching staff cards
- **Subscription Pricing Redesign**: 3-card layout (Starter/Pro/Premium)
- **Recruiting Questionnaire URL Discovery** (Feb 2026): Auto-discovers volleyball recruiting questionnaire URLs via DuckDuckGo search with scoring system. Caches results in DB. Displays "Fill out questionnaire" link on SchoolInfoPage. Supports school domains and 3rd-party platforms (armssoftware.com, fieldlevel.com, etc.)

## Key Architecture
- Frontend: React + Tailwind + shadcn/ui
- Backend: FastAPI + MongoDB
- Auth: Emergent-managed Google Auth + JWT
- AI: Claude Sonnet 4.5 via Emergent LLM Key
- External: College Scorecard API, DuckDuckGo Search, BeautifulSoup/lxml scraping

## Known Issues
- NCAA Timeline page colors unresolved (user paused, P1)
- Pipeline Tour tooltip disappears on off-screen elements (P2, VERIFICATION PENDING)

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
