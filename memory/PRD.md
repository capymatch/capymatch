# Volleyball Recruiting CRM - Product Requirements

## Original Problem Statement
A public-facing Volleyball Recruiting CRM application for athletes and parents to manage the college recruiting process.

## Architecture
- **Frontend**: React (port 3000), Shadcn/UI components
- **Backend**: FastAPI (port 8001), MongoDB, APScheduler
- **Auth**: Emergent-managed Google Auth + JWT sessions
- **Integrations**: College Scorecard API, Gmail API, Anthropic Claude, Stripe, Resend

## Key Credentials
- Pro User: `pro@test.com` / `password`
- Google Auth User: `douglas@yeslms.com` / `password` (Premium)

## Match Scoring Algorithm (v3 — Feb 20, 2026)
**Weights**: Division 20%, Region 20%, Priorities 20%, **Academic Fit 40%**
**Academic Fit**: Tier-based scoring with geometric mean (one weak metric drags all down)
- **Tiers**: Strong Fit (1.0), Good Fit (0.85), Slight Reach (0.5), Reach (0.2), High Reach (0.05)
- **Benchmarks**: D1 SAT ~1150/ACT ~25/GPA ~3.2; D2 SAT ~1050/ACT ~22/GPA ~2.9
- **Geo mean**: Prevents one strong metric from masking a weak one
- **UI**: Color-coded badges (green/amber/red), contextual language, disclaimer text

## Completed Features
1-24. [See previous PRD entries]
25. Private SAT/ACT scores — editable, hidden from coaches/public endpoints
26. **Tier-based academic match scoring** — honest, parent-safe scores with reach labels
27. **Find Schools page** — Hero card shows #1 match; grid shows top 5 with scores, all others without (Feb 20, 2026)
28. **My Schools page** — "Top matches for you" grid ONLY in onboarding view; non-empty board has no suggestions section (Feb 20, 2026)
29. **Onboarding profile flow** — "Continue to My Schools" banner on profile page when from onboarding; gentle gate modal when navigating away with incomplete profile (Feb 20, 2026)
30. **Matching algorithm GPA fallback** — When SAT/ACT missing, uses GPA only for academic scoring; when ALL academic data missing, skips academic weight entirely so scores aren't artificially penalized (Feb 20, 2026)
31. **Bulk school enrichment** — Background job scrapes average incoming GPA for all 1,053 schools via DuckDuckGo search + regex extraction; also backfills College Scorecard data (SAT, admission rate, etc.) (Feb 20, 2026)
32. **GPA-aware matching** — Algorithm now prefers school's published avg_gpa for direct GPA comparison over admission-rate inference (Feb 20, 2026)
33. **NCAA Match Risk Badges** (Feb 21, 2026) — 4 badge types: Academic Reach, Roster Tight, Timeline Risk, Funding Dependent. Displayed as parent-safe colored pills on Find Schools cards (max 2 + overflow) and Journey page (all badges). Clickable badges open Risk Explainer Drawer with contextual copy. Empty state shows "No major risks identified". Backend: `_compute_risk_badges()` in `athlete_profile.py`, integrated into `/api/match-scores`, `/api/suggested-schools`, `/api/risk-badges/{program_id}`. Frontend: `RiskBadges.js` component library.
34. **Gmail consent modal in onboarding** (Feb 21, 2026) — Connect Gmail step in onboarding pipeline now shows the same privacy consent modal as Settings page before initiating OAuth.

35. **Recruiting Timeline Intelligence** (Feb 21, 2026) — 3 statuses: Filling Early (amber), Standard (blue), Late Opportunities (green). Compact label on Find Schools cards, full Status Card on Journey page with explanation, guidance, and "How this is determined" tooltip. Logic: D1 ≤2 years = filling_early, D2 ≤1 year = filling_early, D1 ≤4 / D2 ≤3 = standard, else = late. Backend: `_compute_timeline_status()`, integrated into all match endpoints. Frontend: `TimelineIntelligence.js`.
36. **Roster Spot Reality** (Feb 21, 2026) — 3 statuses: Open (green), Limited (amber), Tight (muted rose). Compact label on Find Schools cards, full Reality Card on Journey page with estimated openings range, explanation, guidance, and "How this is estimated" tooltip. Logic: D1 ≤1yr = tight/1-3 spots, D1 ≤2yr = limited/2-4, D1 else = open/3-5. D2 ≤1yr = limited/2-4, D2 ≤2yr = limited/2-5, else = open/3-6. D3/NAIA = open/3-6. Backend: `_compute_roster_outlook()`. Frontend: `RosterOutlook.js`.
37. **Scholarship Structure** (Feb 21, 2026) — 3 types: Typically Partial (D1 non-power/D2/NAIA), Mix of Partial and Full (D1 power conf with NIL context), Walk-On Pathways Common (D3). Neutral slate accent, no dollar amounts. Optional NIL Environment sub-line for power conferences. Backend: `_compute_scholarship_structure()`. Frontend: `ScholarshipStructure.js`. Journey page card order: Timeline → Roster → Scholarship.
38. **NIL Readiness** (Feb 21, 2026) — 3 statuses: NIL-Friendly (blue, D1 power conferences), NIL-Limited (slate, D1 non-power/D2/NAIA), NIL Information Limited (light slate, D3). Guidance bullets in "What this means for you" section. No dollar amounts, no rankings. Backend: `_compute_nil_readiness()`. Frontend: `NilReadiness.js`. Full decision stack: Timeline → Roster → Scholarship → NIL.

## Pending Issues
- **P1**: Monitor Bulk University Data Enrichment Job (verify completion)
- **P2**: NCAA Timeline colors (on hold)
- **P1**: Refactor duplicated matching algorithm (athlete_profile.py + knowledge.py)

## Recently Fixed
- **P0 Bug Fix (Feb 20, 2026)**: "Complete your profile" Journey checklist step not updating — field name mismatch `grad_year` vs `graduation_year` in `RecruitingJourney.js` line 66
- **Bug Fix (Feb 21, 2026)**: Gmail OAuth in preview iframe — reverted all `window.open`/`window.top` hacks; the issue was `redirect_uri_mismatch` in Google Console (not an iframe issue)

## NCAA Risk Badge System
- **Academic Reach**: Triggered when match algorithm returns "Reach" or "High Reach" in reasons
- **Roster Tight**: D1 programs (18-player roster cap)
- **Timeline Risk**: D1/D2 programs when athlete graduation year is within 2 years
- **Funding Dependent**: D2/NAIA/D3 programs (equivalency scholarships / no athletic aid)

## Upcoming Tasks
1. Separate Girls/Boys Volleyball data (P0)
2. Camp/Tournament ROI tracker (P1)
3. Email templates & bulk outreach (P1)

## Future/Backlog
- Marketing Website, Tiered Celebrations, App Naming, Multi-sport, Family Roles, Mobile App
