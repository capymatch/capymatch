# CapyMatch PRD

## Original Problem Statement
CapyMatch is a public-facing Volleyball Recruiting CRM evolving into a sophisticated decision-support system for student-athletes. The core goal is to provide data-driven insights to navigate the complexities of college recruiting, featuring a three-stage AI pipeline to generate reliable, source-aware intelligence for UI cards.

## Core Architecture
- **Frontend**: React (CRA) + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python) + MongoDB (Motor async)
- **Auth**: Bearer token (localStorage). Backend checks Authorization header first, then cookie fallback.
- **Integrations**: Stripe (payments), Resend (email), Claude AI (intelligence cards), Emergent-managed Google Auth, Google Gmail APIs

## Domain Setup
- **Landing**: `capymatch.com` -> readdy.ai marketing site
- **App**: `app.capymatch.com` -> Emergent-hosted CRM app

## What's Been Implemented

### Completed Features
1. AI-powered school matching & intelligence cards (Claude via Emergent LLM Key)
2. Multi-stage recruiting pipeline with expandable cards
3. Full Stripe subscription system (Pro/Premium tiers, checkout, webhooks, billing page)
4. Emergent-managed Google Auth + email/password login
5. University Knowledge Base with scraped real data + background refresh jobs
6. Trust & Safety UI features (source-aware AI reasoning)
7. Commitment Stability Index, Match Risk Badges, Timeline Intelligence, Roster Reality, Scholarship Composition, NIL Readiness
8. Data contribution feature ("Improve this card")
9. School detail pages (/school/:domain)
10. Recruiting Journey page (complete UX/UI overhaul)
11. Hero card for commitments
12. Login/signup redesign (Notion-style)
13. Admin area with user management + contribution review dashboard
14. Per-school notes via NotesSidebar
15. Athlete profile management (name/email updates)
16. Pre-launch system audit completed
17. Pipeline UI Redesign -- Rich expandable cards, progress ring, hero card
18. Bearer token auth for cross-domain support
19. Full PWA Implementation (installable on mobile)
20. Questionnaire Tracking
21. Follow-Up Reminder Hero Cards (overdue + upcoming)
22. Gmail attachment downloads
23. Gmail History Import (complete):
    - Backend: Domain mapper, header scanner, rule engine, idempotent APIs
    - Frontend: Full GmailImportModal with 4 states (consent/scanning/preview/done)
    - Enrichment: Auto-creates coaches from KB + discovered emails, sets domain
    - UX polish: Verified School badges, coach verification labels, explanatory text for unmapped rows, Add Manually flow, unmapped domain logging, defensive KB checks

## How Gmail Import Works
1. **Scan**: Reads email headers only (From, To, Subject, Date) — never message bodies
2. **Classify**: Matches .edu domains against Knowledge Base
3. **Aggregate**: Groups by school, tracks thread counts, email addresses, and subjects
4. **Preview**: Shows Verified Matches, Needs Review, and Ignored groups
5. **Confirm**: Creates programs + coaches, sets domain. Only KB-matched schools can be imported.
6. **Timeline**: Journey page auto-fetches Gmail conversations via discovered coach emails

### Key Safety Features
- Only KB-matched schools are importable (disabled checkboxes + defensive backend check)
- Unmapped domains logged for future KB improvements
- Coach deduplication prevents duplicates across KB and discovered emails
- Idempotent confirm endpoint prevents duplicate pipeline entries

## Key DB Schema
- `programs`: includes `domain`, `imported_at`, `import_run_id`
- `coaches`: Auto-created for imported schools from KB + discovered emails
- `import_runs`: { run_id, status, suggestions (with discovered_emails, kb_coach_emails, verified_coach_count), unmapped_domains }
- `school_domain_aliases`: { domain, school_id, source, confidence }

## Pending Issues
- **P2**: NCAA Timeline colors (recurring cosmetic)
- **P2**: Dead links for school recruiting questionnaires

## Prioritized Backlog

### P2
- Full NIL transaction/payment platform
- Separate Girls/Boys Volleyball data models
- Email templates & bulk outreach functionality
- Camp/Tournament ROI tracker
- Family Collaboration Roles
- Fix dead links for school recruiting questionnaires
- Re-run bulk discovery scraper for questionnaire URLs

### Refactoring
- Consolidate overlapping AccountPage / SettingsPage
- Consider migrating from university_name key to stable school_id

## Credentials
- **Demo User**: demo@capymatch.com / demo2026
- **Admin User**: douglas@yeslms.com (Google auth)

## 3rd Party Integrations
- Stripe (payments), Resend (forgot password emails), Claude AI via Emergent LLM Key, Emergent-managed Google Auth, Google Gmail APIs, tldextract
