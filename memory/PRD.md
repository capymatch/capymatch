# Volleyball Recruiting CRM — PRD

## Original Problem Statement
Public-facing Volleyball Recruiting CRM — decision-support system for student-athletes via three-stage intelligence pipeline.

## Intelligence Pipeline — COMPLETE
All 5 micro-agents built, tested, and wired. No cards on old heuristic logic.

| Agent | Labels | Endpoint |
|-------|--------|----------|
| School Insight | AI-generated | `POST /api/intelligence/school-insight/{id}` |
| Timeline | Unknown / Fills Early / Standard / Late | `POST /api/intelligence/timeline/{id}` |
| Roster/Stability | Unknown / Open / Limited / Tight + Stability | `POST /api/intelligence/roster/{id}` |
| Scholarship | Mix of Partial and Full / Typically Partial / Walk-On Pathways Common / Unknown | `POST /api/intelligence/scholarship/{id}` |
| NIL Readiness | Established NIL Support / Emerging NIL Support / NIL Information Limited | `POST /api/intelligence/nil/{id}` |

## Design Principles
- AI determines ONLY the label; all UI copy hardcoded per label
- Honest defaults when no stored signals
- No dollar amounts, no percentages, no guarantees, no ranking
- Questions-to-ask per card (collapsible + copy). NIL questions focus on education/support/compliance
- "Improve this card" nudge on Unknown/Limited states → `pending_verification`

## Prioritized Backlog
### P1
- Admin dashboard for contribution review/verification

### P2
- NCAA Timeline colors (cosmetic)

### P2+
- Girls/Boys Volleyball separation | Email templates | Camp/Tournament ROI
- Marketing Website | Multi-sport | Family Roles | Mobile App

## Test Credentials
- **Pro**: pro@test.com / password
- **Google Auth**: douglas@yeslms.com / password
