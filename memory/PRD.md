# Volleyball Recruiting CRM — PRD

## Original Problem Statement
Public-facing Volleyball Recruiting CRM for families navigating the college recruiting process. Features include a dynamic recruiting board, university knowledge base, mobile-friendly design, dark theme UI, admin area, subscription engine, AI-powered suggestions, and comprehensive school/coach management tools.

## Core Requirements
1. Dynamic Recruiting Board with custom grouping
2. University Knowledge Base with search/filter
3. Mobile-friendly responsive design
4. Dark theme with pink/coral accents
5. Admin Area (User, University, Subscription, Integration management)
6. Subscription Engine (Starter, Pro, Premium) with Stripe
7. AI-powered "Next Step" suggestions (Claude Sonnet 4.5)
8. Separate Girls/Boys volleyball data
9. Recruiting Journey page with modal-based actions
10. Rule-based "What's Next?" prompts
11. File attachments for emails
12. Celebratory hero card for commitments
13. Private per-school notes
14. Automated follow-up system
15. Dashboard redesign for daily actions
16. University logos via icon.horse
17. College Scorecard API integration for school data
18. Coach scraping from university websites
19. Email preview/confirmation before sending
20. Redesigned Find Schools page
21. Dedicated School Info detail page
22. Camp/Tournament ROI tracker
23. Email templates & bulk outreach

## What's Been Implemented
- Full recruiting board/pipeline with drag-and-drop
- University Knowledge Base with 1000+ schools
- Dark theme UI with consistent modal system
- Admin dashboard with user/university/subscription management
- Google OAuth + JWT authentication
- AI Journey Assistant (Claude Sonnet 4.5)
- Email composer with preview/confirmation step
- Coach scraping and contact management
- College Scorecard API integration
- Subscription tiers with feature gating
- Interactive tour for onboarding
- Notes sidebar per school
- Follow-up scheduling system
- Calendar integration
- Analytics page
- **School Info Page** — Dedicated detail page at `/school/:domain` (Feb 2026)
  - Hero header with logo, badges, action buttons
  - Match score ring with reasons
  - Key statistics from scorecard (when available)
  - Coaching staff cards with email links
  - School details table
  - Navigation from Find Schools expanded cards

## Architecture
- **Frontend**: React (CRA) + Tailwind + Shadcn/UI + Lucide icons
- **Backend**: FastAPI + MongoDB (Motor)
- **Auth**: Emergent-managed Google Auth + JWT sessions
- **AI**: Claude Sonnet 4.5 via Emergent LLM Key
- **Integrations**: Stripe, College Scorecard API, DuckDuckGo search, BeautifulSoup scraping

## Key API Endpoints
- `GET /api/knowledge-base` — List all universities
- `GET /api/knowledge-base/school/{domain}` — Single university detail
- `POST /api/knowledge-base/add-to-board` — Add school to user's board
- `GET /api/knowledge-base/filters` — Get filter options
- `GET /api/programs` — User's board schools
- `GET /api/match-scores` — Computed match scores

## Pending Issues
- Pipeline Tour disappears on off-screen elements (P1, fix attempted, awaiting user verification)

## Backlog (Prioritized)
### P1
- Redesign "Find Schools" page (mockup approved at public/mockup-find-schools.html)
- Separate Girls/Boys volleyball data
- Camp/Tournament ROI tracker
- Email templates & bulk outreach

### P2
- Build Marketing Website
- Tiered Celebrations (beyond first reply)
- App Naming
- Multi-sport capability
- Family Collaboration Roles (read-only Parent/Viewer)

## Refactoring Needed
- Extract 5 modals from monolithic RecruitingJourney.js into separate component files

## Test Credentials
- Pro User: pro@test.com / password
- Google Auth: douglas@yeslms.com
