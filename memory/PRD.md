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

## Intelligence Pipeline (v2 — Feb 22, 2026)

### Stage 1: Schema Mapper
- `POST /api/admin/run-schema-mapper` — Introspects MongoDB, produces Agent Input Contract
- Tracks 51 fields across 3 collections with coverage stats

### Stage 2: Payload Builder
- `build_payload(db, program_id, tenant_id, debug=False)` — ~619 tokens default
- Structured test scores, source proofs, data_quality, known_unknowns

### Stage 3: Intelligence Runtime — Micro-Agents

#### School Insight ("Why This School / Why Not") — LIVE
- `POST /api/intelligence/school-insight/{program_id}`
- 3 strengths, 3 concerns (with based_on, citations, evidence, severity)
- AI-powered via Claude, 24hr cache, insufficient_data handling

#### Timeline Intelligence — LIVE (Phase A)
- `POST /api/intelligence/timeline/{program_id}`
- Labels: Fills Early | Standard Timeline | Late Opportunities | Unknown
- Currently deterministic ("Unknown") — no commit timing data in DB
- Surfaces recruiting position (status, interactions, days on board)
- Includes ui mapping for existing TimelineStatusCard component
- next_action derived from recruiting status
- generated_by: "deterministic" | "ai"
- AI path ready for when real timeline signals are added

#### Roster Reality / Commitment Stability — PLANNED (Phase B)
- Range-only openings; never single numbers; never "full"

### V2 Guardrails (non-negotiable)
1. No web browsing or external calls for intelligence outputs
2. No inference when core inputs missing — explicit Unknown states
3. Section-level citations/evidence for every claim
4. Avoid absolute language for timeline/roster
5. Data freshness influences confidence/evidence and tone

## File Structure
```
backend/intelligence/
├── schema_mapper.py          # Stage 1
├── payload_builder.py        # Stage 2
├── orchestrator.py           # Stage 3 router
├── contracts/
│   └── agent_input_contract.json
└── agents/
    ├── school_insight.py     # "Why This School / Why Not"
    └── timeline.py           # "Timeline Intelligence"
```

## Cards on Heuristic Logic (unchanged)
- Scholarship Structure
- NIL Readiness

## Upcoming Tasks
1. **Phase B**: Roster Reality / Commitment Stability micro-agent
2. Separate Girls/Boys Volleyball data
3. Email templates & bulk outreach

## Future/Backlog
- Camp/Tournament ROI tracker, Marketing Website, NCAA Timeline colors
- Refactor athlete_profile.py into services directory
