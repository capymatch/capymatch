# Volleyball Recruiting CRM - Product Requirements

## Original Problem Statement
A public-facing Volleyball Recruiting CRM for athletes and parents. Core goal: data-driven insights to navigate college recruiting, responding to NCAA rule changes.

## Architecture
- **Frontend**: React (port 3000), Shadcn/UI components
- **Backend**: FastAPI (port 8001), MongoDB, APScheduler
- **Auth**: Emergent-managed Google Auth + JWT sessions
- **AI**: Claude Sonnet 4.5 via Emergent LLM Key
- **Intelligence Pipeline**: 3-stage system (Schema Mapper → Payload Builder → Intelligence Runtime)

## Key Credentials
- Pro User: `pro@test.com` / `password`
- Google Auth User: `douglas@yeslms.com` / `password` (Premium)

## Intelligence Pipeline (v1 — Feb 22, 2026)

### Stage 1: Schema Mapper
- `POST /api/admin/run-schema-mapper` — Introspects MongoDB, produces Agent Input Contract
- `GET /api/admin/agent-contract` — Retrieves stored contract
- Tracks 51 fields across 3 collections with coverage stats
- Stored in `intelligence_contracts` collection

### Stage 2: Payload Builder
- `build_payload(db, program_id, tenant_id, debug=False)` in `/app/backend/intelligence/payload_builder.py`
- Produces minimal source-aware JSON (~619 tokens default, ~710 debug)
- Structured test scores: `{ avg, min, max, unit }`
- Source IDs: `internal_db:university_knowledge_base`, `user_input:athlete_profile`, `user_input:program`
- `data_quality` ratings per section, `known_unknowns` in parent-safe language
- `fields_populated` only included when quality != "high" or debug=true

### Stage 3: Intelligence Runtime
- `POST /api/intelligence/school-insight/{program_id}` — "Why This School / Why Not" card
- 24hr cache in `intelligence_cache` collection (`?force=true` to bypass)
- Returns: 3 strengths, 3 concerns, unknowns, summary
- Each item has: `based_on`, `citations`, `evidence` (strong|partial), `severity` (concerns only)
- `insufficient_data` status when school/academics quality is "unknown"
- Unknowns derived deterministically from `payload.known_unknowns` only

### Cards on Intelligence Pipeline
- **SchoolInsight ("Why This School / Why Not")** — LIVE on pipeline
- **Recruiting Timeline** — Planned (Stage 3 v2)
- **Roster Reality / Commitment Stability** — Planned (Stage 3 v2)

### Cards on Heuristic Logic (unchanged)
- Scholarship Structure
- NIL Readiness

## Completed Features
1-43. [See CHANGELOG.md for full history]
44. Journey Header Card Redesign (Feb 21, 2026)
45. NIL Readiness Card Redesign (Feb 21, 2026)
46. SchoolInsightCard Redesign (Feb 21, 2026)
47. **Intelligence Pipeline Stages 1-3** (Feb 22, 2026)
    - Stage 1: Schema Mapper with field coverage tracking
    - Stage 2: Payload Builder with normalized types, source proofs, data_quality, known_unknowns
    - Stage 3: School Insight micro-agent with Claude, strict source-aware reasoning, caching
    - Frontend wired to new `/api/intelligence/school-insight` endpoint

## File Structure
```
backend/intelligence/
├── __init__.py
├── schema_mapper.py          # Stage 1
├── payload_builder.py        # Stage 2
├── orchestrator.py           # Stage 3 router
├── contracts/
│   └── agent_input_contract.json
└── agents/
    ├── __init__.py
    └── school_insight.py     # "Why This School / Why Not" agent
```

## Upcoming Tasks
1. Stage 3 v2: Timeline + Roster/Stability micro-agents
2. Separate Girls/Boys Volleyball data
3. Email templates & bulk outreach

## Future/Backlog
- Camp/Tournament ROI tracker, Marketing Website, Tiered Celebrations, App Naming, Multi-sport, Family Roles, Mobile App
- NCAA Timeline colors fix (P2)
- Refactor athlete_profile.py into services directory
