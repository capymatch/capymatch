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

## Design Principles
- AI determines ONLY the label; all UI copy hardcoded per label
- Honest defaults when no stored signals
- No dollar amounts, no percentages, no guarantees, no ranking
- Questions-to-ask per card (collapsible + copy). NIL questions focus on education/support/compliance
- "Improve this card" nudge on Unknown/Limited states → `pending_verification`

## Demo Account — COMPLETE
- **Email**: demo@capymatch.com / **Password**: demo2026
- **Athlete**: Emma Mitchell (Junior OH, A5 Volleyball, GA)
- **Schools**: 10 (Committed, Offer Received, Active Conversation x3, Camp Attended, Some Interest, Contacted, Not Contacted x2)
- **Timeline**: 30 interactions across all schools, including recent coach replies
- **Dashboard**: Personalized greeting, 63% response rate, pipeline chart, follow-ups, events
- **Notes**: 6 private notes across schools
- **Events**: 3 upcoming (A5 Regional, JVA World Challenge, Penn State Visit)
- **Creation script**: `/app/backend/create_demo.py`

## Completed Work
- UI/Branding overhaul to CapyMatch (logo, sidebar, landing page)
- Celebration cards with capybara mascot
- Conversation timeline with correct left/right alignment
- Demo account creation and full audit
- Dashboard bug fixes (greeting, response rate, pipeline statuses, activity feed)
- MockupPage cleanup (removed temporary page and routes)
- email_received treated as coach reply in signals and UI

## Prioritized Backlog
### P1
- Admin dashboard for contribution review/verification
- Phase E of Intelligence Pipeline (next card TBD by user)

### P2
- NCAA Timeline colors (cosmetic)

### P2+
- Girls/Boys Volleyball separation | Email templates | Camp/Tournament ROI
- NIL transaction/payment platform | Family Collaboration Roles
- Marketing Website | Multi-sport | Mobile App

## Test Credentials
- **Demo**: demo@capymatch.com / demo2026
- **Google Auth**: douglas@yeslms.com
