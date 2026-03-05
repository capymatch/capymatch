# CapyMatch — Product Requirements Document

## Original Problem Statement
CapyMatch is a Volleyball Recruiting CRM designed for non-technical parents to manage their athlete's college recruiting journey. The platform provides school discovery, coach communication, engagement tracking, and pipeline management.

## User Personas
- **Primary**: Non-technical parents managing their child's volleyball recruiting
- **Secondary**: Student athletes tracking their own recruiting progress

## Core Requirements
1. School discovery and knowledge base with D1/D2/D3 programs
2. Coach contact management and communication
3. Gmail integration for email tracking
4. Recruiting pipeline/board for tracking school relationships
5. Journey page for individual school detail and timeline
6. Social media spotlight for school social feeds
7. Engagement tracking (email opens, link clicks)
8. AI-powered features (match scoring, insights)
9. NCAA timeline and calendar integration

## Tech Stack
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB
- **Auth**: Session-based (email/password)
- **Theme**: Light/Dark mode via CSS variables (--t-*)

## What's Been Implemented

### Pipeline Page Redesign (March 5, 2026) ✅
Complete UI overhaul of the Pipeline/My Schools page (`/pipeline`) based on approved mockup v10b:
- **Hero Card**: Journey-style dark (#141422) card showing most urgent school with progress rail, badges (division, match %, sentiment), social icons, and Follow Up/Start Outreach CTA
- **Filter Chips**: All, Outreach, Waiting, In Convo, Committed with counts
- **Collapsible Sections**: Needs Outreach (amber), Waiting on Reply (red), In Conversation (blue), Committed (green)
- **Compact School Cards**: 7-column aligned rows — school identity, progress rail (200px), temperature tag, engagement metrics (views/clicks/contacts), next action, CTA button, arrow chevron
- **Committed Card**: Special green card with check icon and "Verbal Commit" badge
- **Responsive**: Hidden columns on smaller screens
- **View Toggle**: Compact/Expanded modes
- File: `frontend/src/pages/RecruitingBoard.js`

### Previously Completed Features
- Social Spotlight page redesign
- Data enrichment (social media, coaching staff for D1/D2/D3)
- Data quality verification
- Automated data refresh
- Engagement tracking system
- Journey page UI refactor
- Pipeline mockup design process (v1-v10b)

## Prioritized Backlog

### P1 — Upcoming
- **Manual Email Logging**: UI for non-Gmail users to manually log email interactions from Journey page
- **Camp Data Integration**: Add `camp_url` to knowledge base, display university camp info

### P2 — Future/Backlog
- Microsoft Outlook/365 Import
- Full NIL transaction/payment processing platform
- Separate Girls/Boys Volleyball data models
- Email templates & bulk outreach
- Redesign "Find Schools" page
- Fix duplicate YouTube URLs for similarly-named schools

## Key API Endpoints
- `GET /api/programs` — List all pipeline programs
- `GET /api/programs/:id` — Single program with journey_rail
- `GET /api/match-scores` — Match scores for all programs
- `GET /api/engagement/summary` — Engagement data by school
- `POST /api/auth/login` — Login with email/password

## Demo Credentials
- Email: `demo@capymatch.com`
- Password: `demo2026`
