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

## Completed Features
1-43. [See previous PRD entries — Trust & Safety, Data Scraping, Logos, Commitment Stability, etc.]
44. **Journey Header Card Redesign** (Feb 21, 2026) — Circular back button, school logo + name, Active/Inactive pill, metadata row, dark-themed risk badge pills, refined progress rail.
45. **NIL Readiness Card Redesign** (Feb 21, 2026) — Redesigned to match user mockup:
    - Money bag emoji + "NIL Readiness" title with timeline pill (e.g. "Fills Early") on right
    - Status banner with colored dot (Program-backed/Emerging support/Limited availability)
    - Two-column layout: "What This Involves" (green checkmarks) | "What This Means for You" (paragraph)
    - Context tags (NCAA D1 · Equivalency Era · Roster Limit: 18)
    - Disclaimer + Data confidence footer with tooltip
    - Backend enriched with new fields: status_label, involves, meaning, context_tags

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
