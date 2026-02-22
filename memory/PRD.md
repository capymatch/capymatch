# Volleyball Recruiting CRM — PRD

## Original Problem Statement
Public-facing Volleyball Recruiting CRM — decision-support system for student-athletes via three-stage intelligence pipeline. Branded as "CapyMatch" with Apple-style design aesthetic.

## Intelligence Pipeline — COMPLETE
All 5 micro-agents built, tested, and wired. No cards on old heuristic logic.

| Agent | Labels | Endpoint |
|-------|--------|----------|
| School Insight | AI-generated | `POST /api/intelligence/school-insight/{id}` |
| Timeline | Unknown / Fills Early / Standard / Late | `POST /api/intelligence/timeline/{id}` |
| Roster/Stability | Unknown / Open / Limited / Tight + Stability | `POST /api/intelligence/roster/{id}` |
| Scholarship | Mix of Partial and Full / Typically Partial / Walk-On Pathways Common / Unknown | `POST /api/intelligence/scholarship/{id}` |
| NIL Readiness | Established NIL Support / Emerging NIL Support / NIL Information Limited | `POST /api/intelligence/nil/{id}` |

### Timeline Intelligence Guardrails (Feb 2026)
- **Minimum Evidence Threshold**: AI only fires with >= 3 commit timing data points across cycles. Thin data → "Unknown"
- **AI Output Constraints**: Must reference evidence, no absolutes, no invented reasoning
- **Heuristic Separation**: Division-level estimates clearly labeled as "Division Estimate" with "EST." badge
  - Heuristic labels renamed: "Typically Fills Early", "Standard Window", "Later Opportunities Likely"
  - All include `is_estimate: true` flag and division-level disclaimer tooltips
  - Risk badge renamed: "Timeline Awareness" (was "Timeline Risk")
- **Non-Negotiable**: Intelligence never guesses. "Unknown" is the correct answer when data is missing/insufficient.
- **email_received** interactions treated as coach replies in signal computation

## Demo Account — COMPLETE
- **Email**: demo@capymatch.com / **Password**: demo2026
- **Athlete**: Emma Mitchell (Junior OH, A5 Volleyball, GA)
- **Schools**: 10 (Committed, Offer Received, Active Conversation x3, Camp Attended, Some Interest, Contacted, Not Contacted x2)
- **Dashboard**: Personalized greeting ("Good afternoon, Emma"), 63% response rate, pipeline chart, follow-ups, events

## Completed Work
- UI/Branding overhaul to CapyMatch (logo, sidebar, landing page)
- Celebration cards with capybara mascot
- Demo account creation and full audit (Feb 2026)
- Dashboard bug fixes: greeting, response rate, pipeline statuses, activity feed (Feb 2026)
- Timeline Intelligence guardrails: min evidence threshold, heuristic separation, estimate labeling (Feb 2026)
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
