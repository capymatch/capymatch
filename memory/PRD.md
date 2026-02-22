# Volleyball Recruiting CRM — PRD

## Original Problem Statement
Public-facing Volleyball Recruiting CRM — decision-support system for student-athletes via three-stage intelligence pipeline. Branded as "CapyMatch" with Apple-style design aesthetic.

## Intelligence Pipeline — COMPLETE
All 5 micro-agents built, tested, and wired.

| Agent | Labels | Endpoint |
|-------|--------|----------|
| School Insight | AI-generated | `POST /api/intelligence/school-insight/{id}` |
| Timeline | Unknown / Fills Early / Standard / Late | `POST /api/intelligence/timeline/{id}` |
| Roster/Stability | Unknown / Open / Limited / Tight + Stability | `POST /api/intelligence/roster/{id}` |
| Scholarship | Mix of Partial and Full / Typically Partial / Walk-On Pathways Common / Unknown | `POST /api/intelligence/scholarship/{id}` |
| NIL Readiness | Established NIL Support / Emerging NIL Support / NIL Information Limited | `POST /api/intelligence/nil/{id}` |

### Timeline Intelligence Guardrails (Feb 2026)
- Minimum Evidence Threshold: AI only fires with >= 3 data points
- Heuristic labels renamed to "Division Estimate" with EST. badge
- Risk badge renamed "Timeline Awareness"

### Intelligence Cards Location (Feb 2026)
- **Moved FROM**: RecruitingJourney.js (Journey page)
- **Moved TO**: SchoolInfoPage.js (School Detail page at /school/:domain)
- Journey page now has compact "School Intelligence" link button → navigates to School Detail
- School Intelligence section gated by: on_board && programId && !isBasic
- Demo schools added to university_knowledge_base for /school/:domain routes

## Page Architecture
- **Journey page** (/journey/:programId) = Relationship management (actions, timeline, checklist, follow-ups)
- **School Detail page** (/school/:domain) = Research hub (stats, admissions, financial, intelligence cards)
- **Find Schools** (/find-schools) = Discovery with estimate labels
- **Dashboard** (/board) = Overview with pipeline, actions, activity feed

## Demo Account — COMPLETE
- **Email**: demo@capymatch.com / **Password**: demo2026
- **Tier**: Premium (field: `plan: "premium"` in tenants collection)
- **Athlete**: Emma Mitchell (Junior OH, A5 Volleyball, GA)
- **Schools**: 10 across all recruiting statuses
- **Creation script**: `/app/backend/create_demo.py`

## Completed Work
- UI/Branding overhaul to CapyMatch
- Celebration cards with capybara mascot
- Demo account creation and full audit (Feb 2026)
- Dashboard bug fixes: greeting, response rate, pipeline statuses (Feb 2026)
- Timeline Intelligence guardrails (Feb 2026)
- Intelligence cards moved to School Detail page (Feb 2026)
- Demo schools added to university_knowledge_base (Feb 2026)
- Demo subscription fixed: plan field set to "premium" (Feb 2026)
- MockupPage cleanup, Babel plugin null-safety fix (Feb 2026)

## Prioritized Backlog
### P1
- Admin dashboard for contribution review/verification
- Phase E of Intelligence Pipeline (next card TBD)

### P2
- NCAA Timeline colors (cosmetic)

### P2+
- Girls/Boys Volleyball separation | Email templates | Camp/Tournament ROI
- NIL transaction/payment platform | Family Collaboration Roles

## Test Credentials
- **Demo**: demo@capymatch.com / demo2026
- **Google Auth**: douglas@yeslms.com
