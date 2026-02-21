# Volleyball Recruiting CRM - Product Requirements

## Original Problem Statement
A public-facing Volleyball Recruiting CRM application for athletes and parents to manage the college recruiting process. The core goal is to provide data-driven insights to navigate the complexities of college recruiting, responding to recent NCAA rule changes.

## Architecture
- **Frontend**: React (port 3000), Shadcn/UI components
- **Backend**: FastAPI (port 8001), MongoDB, APScheduler
- **Auth**: Emergent-managed Google Auth + JWT sessions
- **Integrations**: College Scorecard API, Gmail API, Anthropic Claude, Stripe, Resend

## Key Credentials
- Pro User: `pro@test.com` / `password`
- Google Auth User: `douglas@yeslms.com` / `password` (Premium)

## Match Scoring Algorithm (v3 — Feb 20, 2026)
**Weights**: Division 20%, Region 20%, Priorities 20%, **Academic Fit 40%**
**Academic Fit**: Tier-based scoring with geometric mean (one weak metric drags all down)
- **Tiers**: Strong Fit (1.0), Good Fit (0.85), Slight Reach (0.5), Reach (0.2), High Reach (0.05)
- **Benchmarks**: D1 SAT ~1150/ACT ~25/GPA ~3.2; D2 SAT ~1050/ACT ~22/GPA ~2.9
- **Geo mean**: Prevents one strong metric from masking a weak one
- **UI**: Color-coded badges (green/amber/red), contextual language, disclaimer text

## Completed Features
1-43. [See previous PRD entries — Trust & Safety, Data Scraping, Logos, Commitment Stability, etc.]
44. **Journey Header Card Redesign** (Feb 21, 2026) — Redesigned the top dark card on the Recruiting Journey page to match user-provided mockup:
    - Circular back button, school logo + name on top row
    - "Active/Inactive" green pill toggle on top-right with Compare button
    - Metadata row: Pulse indicator (Neutral/Hot/Warm), Division tag, Match % badge, Conference/Events text
    - Dark-themed inline risk badge pills (purple=Timeline Risk, green=Funding Dependent, gray=Roster Tight, orange=Academic Reach) - clickable to open Risk Explainer Drawer
    - Progress rail timeline (Added → Outreach → Talking → Visit → Offer → Committed)
    - My Notes floating tab on right edge, Academic data completeness alert below header
    - Fixed hydration warning (p→div) in RecruitingBoard.js

## Pending Issues
- **P2**: NCAA Timeline colors (on hold)
- **P1**: Refactor duplicated matching algorithm (athlete_profile.py + knowledge.py)

## Upcoming Tasks
1. Separate Girls/Boys Volleyball data (P1)
2. Email templates & bulk outreach (P1)
3. Camp/Tournament ROI tracker (P1)

## Future/Backlog
- Marketing Website, Tiered Celebrations, App Naming, Multi-sport, Family Roles, Mobile App

## Refactoring Needed
- Break up monolithic `athlete_profile.py` into services directory
