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
17. External API for school data (College Scorecard)
18. Coach contact scraping from university websites
19. Email preview/confirmation before sending
20. "Find Schools" page redesign
21. Dedicated single-school detail page
22. Recruiting Questionnaire URL auto-discovery on School Info pages

## What's Been Implemented
- **School Info Page**: Card-based layout with stats, coach cards, and scorecard data
- **Find Schools Redesign**: Dark-themed UI with smart chips, filters, grid/list views
- **Global Color Palette**: Pink replaced with teal/navy palette across entire app
- **School Info Page Redesign**: Card-based stat sections, Key Statistics hero row
- **Subscription Pricing Redesign**: 3-card layout (Starter/Pro/Premium)
- **Recruiting Questionnaire URL Discovery** (Feb 2026): Background bulk job pre-fetching for 1000+ schools
- **App-Wide Dark Mode**: Unified CSS variables, sidebar fix, button contrast fixes
- **Performance**: Parallel API fetches, cached questionnaire data
- **RecruitingJourney.js Refactoring** (Feb 20, 2026): Extracted 15 components into `/components/journey/` — reduced from 1561 to 428 lines. All modals (Email, Log, Reply, Follow-up, Coach), helper components, and constants extracted. 100% test pass rate.
- **Onboarding Quiz Overhaul** (Feb 20, 2026): Multi-select Position/Division, GPA/ACT/SAT inputs, updated matching algorithms.
- **Inbound Coach Contact Detection** (Feb 20, 2026): Background task (every 2hrs) scans Gmail for emails from .edu domains, matches against Knowledge Base, auto-adds schools to pipeline with coach entry + interaction log + notification. Dashboard celebration card "A Coach Found You!" with View/Dismiss. Manual scan endpoint available.
- **Security & Privacy Overhaul** (Feb 20, 2026): Gmail consent modal with recruiting email suggestion, inbound scanning toggle, Gmail token encryption at rest (Fernet), data export (GDPR/CCPA), account deletion, Privacy Policy page with parent-friendly language.
- **Sent Email Auto-Logging** (Feb 20, 2026): Background scanner (every 2hrs) checks Gmail Sent folder for emails to known coaches, auto-logs them as interactions in the journey timeline. Also updates school status from "Not Contacted" to "Contacted". Manual scan endpoint available.

## Key Architecture
- Frontend: React + Tailwind + shadcn/ui
- Backend: FastAPI + MongoDB
- Auth: Emergent-managed Google Auth + JWT
- AI: Claude Sonnet 4.5 via Emergent LLM Key
- External: College Scorecard API, DuckDuckGo Search, BeautifulSoup/lxml scraping
- Security: Fernet encryption for Gmail tokens, bcrypt for passwords, HTTPS

## Component Structure
```
/components/journey/
├── constants.js          (RAIL_STAGES, PULSE_CONFIG, CONV_CONFIG, etc.)
├── ProgressRail.js       (Stage dots with animated fill)
├── PulseIndicator.js     (Hot/Warm/Neutral status)
├── GettingStartedChecklist.js (5-step onboarding)
├── CommittedHero.js      (Celebration card)
├── CelebrationHero.js    (Coach reply celebration)
├── NextStepCard.js       (Rule-based suggestions)
├── ConversationBubble.js (Timeline chat bubbles)
├── AtAGlanceCard.js      (Right sidebar stats)
├── StageLogModal.js      (Stage transition notes)
├── FloatingActionBar.js  (Bottom action buttons)
├── CoachForm.js          (Add/edit coach modal)
├── LogInteractionForm.js (Log interaction modal)
├── EmailComposer.js      (Email send modal)
├── FollowUpScheduler.js  (Schedule follow-up modal)
├── MarkAsRepliedModal.js (Mark coach reply modal)
└── index.js              (Barrel exports)
```

## Known Issues
- NCAA Timeline page colors unresolved (user paused)

## Upcoming Tasks (P1)
- Separate Girls/Boys volleyball data
- Camp/Tournament ROI tracker
- Email templates & bulk outreach

## Future/Backlog (P2)
- Build Marketing Website
- Tiered Celebrations
- App Naming
- Multi-sport capability
- Family Collaboration Roles (read-only parent/viewer)
- Inbound Coach Contact Flow enhancements (non-.edu matching, notification preferences)
