# Volleyball Recruiting CRM - Product Requirements

## Original Problem Statement
A public-facing Volleyball Recruiting CRM application for athletes and parents to manage the college recruiting process. Features include a recruiting board, university knowledge base, match scoring, email automation, admin area, subscription engine, and AI-powered guidance.

## Architecture
- **Frontend**: React (port 3000), Shadcn/UI components, dark theme with teal/navy palette
- **Backend**: FastAPI (port 8001), MongoDB, APScheduler for background tasks
- **Auth**: Emergent-managed Google Auth + JWT sessions
- **Integrations**: College Scorecard API, Gmail API (encrypted tokens), Anthropic Claude, Stripe, Resend, DuckDuckGo Search

## Key Credentials
- Pro User: `pro@test.com` / `password`
- Google Auth User: `douglas@yeslms.com` / `password` (Premium)
- College Scorecard API Key: in `backend/.env`

## Completed Features
1. Dynamic Recruiting Board with custom grouping
2. University Knowledge Base (1053 schools)
3. Mobile-friendly responsive design
4. Full-app dark theme visual redesign
5. Admin Area (User, University, Subscription, Integration management)
6. Subscription Engine with feature gating (Starter, Pro, Premium)
7. AI-powered "Next Step" suggestions
8. Recruiting Journey page with 6-stage progress rail
9. Rule-based "What's Next?" prompts
10. Email with file attachments
11. Commitment celebration hero card
12. Private per-school notes
13. Automated follow-up system
14. Dashboard redesigned for daily actions
15. College Scorecard API integration
16. Coach contact scraping
17. Email preview/confirmation
18. Find Schools page with match scoring (differentiated 44%-99%)
19. Dedicated school detail page
20. Onboarding questionnaire and matching logic
21. Automated inbound email logging (Gmail scanning)
22. Automated sent email logging
23. Security & Privacy overhaul (encryption, consent, data controls)
24. Product tour (backend-stored, one-time)
25. **Private SAT/ACT scores** — editable on Profile page, used for match scoring, hidden from coaches and public endpoints

## Recently Fixed (Feb 20, 2026)
- **P0 FIXED**: "Find Schools" no matches bug — division stored as list caused crash
- **P1 FIXED**: ProgressRail stage key mismatch between backend/frontend
- **IMPROVED**: Match scoring — weighted 100-point algorithm with academic data, scores range 44%-99%
- **ADDED**: Private SAT/ACT fields on Profile page with coach-visibility controls

## Pending Issues
- **P2**: NCAA Timeline colors unresolved (on hold unless requested)

## In Progress Tasks
- Monitor Bulk Questionnaire Discovery Job status

## Upcoming Tasks (Priority Order)
1. Separate Girls/Boys Volleyball data (P0)
2. Camp/Tournament ROI tracker (P1)
3. Email templates & bulk outreach (P1)

## Future/Backlog
- Build Marketing Website (P2)
- Tiered Celebrations (P2)
- App Naming (P2)
- Multi-sport capability (P2)
- Family Collaboration Roles (P2)
- Mobile App (P2)

## Refactoring Needed
- Rename `inbound_contacts.py` to `email_processing.py`
