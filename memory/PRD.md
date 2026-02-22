# Volleyball Recruiting CRM — PRD

## Original Problem Statement
Public-facing Volleyball Recruiting CRM — decision-support system for student-athletes via three-stage intelligence pipeline. Branded as "CapyMatch" with Apple-style design aesthetic.

## Intelligence Pipeline — COMPLETE
All 5 micro-agents built, tested, and wired. Three-stage architecture: Schema Mapper → Payload Builder → Intelligence Runtime.

| Agent | Labels | Endpoint |
|-------|--------|----------|
| School Insight | AI-generated | `POST /api/intelligence/school-insight/{id}` |
| Timeline | Unknown / Fills Early / Standard / Late | `POST /api/intelligence/timeline/{id}` |
| Roster/Stability | Unknown / Open / Limited / Tight + Stability | `POST /api/intelligence/roster/{id}` |
| Scholarship | Mix of Partial and Full / Typically Partial / Walk-On Pathways Common / Unknown | `POST /api/intelligence/scholarship/{id}` |
| NIL Readiness | Established NIL Support / Emerging NIL Support / NIL Information Limited | `POST /api/intelligence/nil/{id}` |

### Intelligence Guardrails
- Min evidence threshold: 3+ data points before AI fires
- Heuristic estimates labeled "Division Estimate (EST.)"
- Timeline Awareness badge (not Timeline Risk)
- All cards: Unknown when data missing, never inferred

### Intelligence Cards Location
- Rendered on School Detail page (/school/:domain)
- Journey page has compact "School Intelligence" link → navigates to School Detail
- Gated by: on_board && programId && !isBasic

## Page Architecture
- **Dashboard** (/board) — Overview with pipeline, actions, activity feed
- **My Schools** (/pipeline) — Pipeline board with status grouping
- **Journey** (/journey/:programId) — Relationship management (actions, timeline, checklist)
- **School Detail** (/school/:domain) — Research hub (stats, intelligence cards)
- **Find Schools** (/find-schools) — Discovery with 1,053 universities
- **Calendar** — Events and upcoming items

## Pre-Launch Audit (Feb 22, 2026) — CONDITIONAL GO
- 18/18 API endpoints healthy
- 10/10 frontend E2E flows pass
- Security: Tenant isolation confirmed, bcrypt passwords, httponly secure cookies
- AI guardrails enforced across all intelligence agents
- Database cleaned: orphaned test records removed
- Branding fully updated to CapyMatch (no Recruiting HQ references)

### Conditions for Full GO
1. Set explicit CORS_ORIGINS in production
2. Configure production Resend domain for emails
3. Add rate limiting before high traffic

## Demo Account
- **Email**: demo@capymatch.com / **Password**: demo2026
- **Tier**: Premium
- **Athlete**: Emma Mitchell (Junior OH, A5 Volleyball, GA)
- **Schools**: 10 across all recruiting statuses

## Bugs Fixed During Audit
1. Onboarding quiz called /match-scores → fixed to /suggested-schools
2. Demo subscription "plan" field missing → added
3. "Recruiting HQ" branding references → updated to CapyMatch
4. Orphaned test data → cleaned up (42 users, 18 tenants, 62 interactions removed)

## Prioritized Backlog
### P1
- Admin dashboard for contribution review/verification
- Phase E of Intelligence Pipeline (next card TBD)

### P2
- NCAA Timeline colors (cosmetic)
- Add rate limiting to API endpoints
- Add database indexes for knowledge_base performance

### P2+
- Girls/Boys Volleyball separation | Email templates | Camp/Tournament ROI
- NIL transaction/payment platform | Family Collaboration Roles

## Test Credentials
- **Demo**: demo@capymatch.com / demo2026
- **Google Auth**: douglas@yeslms.com
