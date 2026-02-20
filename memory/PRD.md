# Volleyball Recruiting CRM - Product Requirements

## Original Problem Statement
A public-facing Volleyball Recruiting CRM application for athletes and parents to manage the college recruiting process.

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
1-24. [See previous PRD entries]
25. Private SAT/ACT scores — editable, hidden from coaches/public endpoints
26. **Tier-based academic match scoring** — honest, parent-safe scores with reach labels
27. **Find Schools page** — Hero card shows #1 match; grid shows top 5 with scores, all others without (Feb 20, 2026)
28. **My Schools page** — "Top matches for you" grid ONLY in onboarding view; non-empty board has no suggestions section (Feb 20, 2026)

## Pending Issues
- **P2**: NCAA Timeline colors (on hold)
- **P2**: Monitor Bulk Questionnaire Discovery Job

## Upcoming Tasks
1. Separate Girls/Boys Volleyball data (P0)
2. Camp/Tournament ROI tracker (P1)
3. Email templates & bulk outreach (P1)

## Future/Backlog
- Marketing Website, Tiered Celebrations, App Naming, Multi-sport, Family Roles, Mobile App
