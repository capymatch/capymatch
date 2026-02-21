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
39. **Source-Aware AI School Insight ("Why This School")** (Feb 21, 2026) — AI-powered analysis card on Journey page. Top 3 reasons and Top 2 risks for each school, with source attribution (IPEDS, School Site, Program Data). Confidence scoring (High/Medium/Limited) based on data coverage and freshness. Expandable section shows confidence factors, data sources, and disclaimers. 24-hour cache with refresh button. Backend: `POST /api/ai/school-insight/{program_id}`, `DELETE /api/ai/school-insight/{program_id}/cache`. Frontend: `SchoolInsightCard.js`. Uses Claude Sonnet 4.5 via Emergent LLM Key with structured prompt ensuring no hallucination and source-backed claims.
40. **Trust & Safety UI Features** (Feb 21, 2026) — 4 transparency features for AI intelligence cards:
    - **Data Confidence Indicator**: High/Medium/Limited badge on all 5 intelligence cards (Timeline, Roster, Scholarship, NIL, SchoolInsight). Computed from GPA quality, SAT, admission rate, ACT availability. Backend: `_compute_data_confidence()` in `athlete_profile.py`.
    - **Academic Data Completeness Flag**: Warning banner when academic data is missing (e.g. "Limited academic data — missing SAT"). Renders above intelligence cards on Journey page.
    - **Source Freshness Awareness**: `last_updated` timestamp in API responses from scraped data timestamps.
    - **"This May Change" Microcopy**: Gentle disclaimer at bottom of every intelligence card: "Recruiting data changes frequently. Verify details directly with the school's coaching staff."
    - Frontend: `TrustIndicators.js` (DataConfidenceBadge, AcademicCompletenessFlag, ThisMayChangeCopy components).
41. **Comprehensive School Data Scraping** (Feb 21, 2026) — Extended ProductiveRecruit scraper to extract ALL academic data + school logos for 1,053 universities:
    - **SAT**: 770 schools (73.1%) — up from near 0
    - **ACT**: 747 schools (70.9%) — up from near 0
    - **Logos**: 961 schools (91.3%) — NEW
    - **Acceptance Rate**: 919 schools (87.3%) — significant improvement
    - **Graduation Rate**: ~1,040 schools (98.8%) — NEW
    - Also scrapes: retention rate, student-faculty ratio, avg annual cost, median earnings, student size, school type
    - Backend: `scripts/scrape_school_data.py`, admin endpoints `POST /api/admin/scrape-school-data` and `GET /api/admin/scrape-school-data/status`
42. **School Logos Integration** (Feb 21, 2026) — University logos now display across the entire app:
    - Enhanced `UniversityLogo.js` component with new `logoUrl` prop and improved fallback chain (scraped logo → icon.horse → Google favicons → initials)
    - Integrated into: Find Schools grid cards, My Schools board cards, Journey page header
    - Backend: `logo_url` field now returned from `/api/match-scores`, `/api/suggested-schools`, `/api/programs`

## Data Reliability Improvements (Feb 21, 2026)
- **Fuzzy KB Matching**: Multi-strategy lookup (exact → domain → normalized text) resolves 90% of name mismatches (e.g., "BYU" → "Brigham Young University", "Tampa University" → "University of Tampa"). Shared logic in `athlete_profile.py` used by match-scores, risk-badges, and AI insight endpoints.
- **Real GPA Data**: Scraped 1,016 real GPAs (96.5%) from ProductiveRecruit.com using Playwright browser automation (handles Cloudflare). Two-pass approach: (1) collect real slugs from 51 state index pages, (2) match to KB and scrape individual school pages. Remaining 30 schools use calibrated estimates, 7 have no GPA.
- **Monthly GPA Refresh Job**: Background task in server.py runs every 30 days. Admin endpoints: `GET /api/admin/gpa-status` (coverage stats), `POST /api/admin/refresh-gpa` (trigger manual refresh). Script at `backend/scripts/scrape_gpa.py`.

## Pending Issues
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
1. Commitment Stability Index (P1)
2. Separate Girls/Boys Volleyball data (P1)
3. Camp/Tournament ROI tracker (P1)
4. Email templates & bulk outreach (P1)

## Future/Backlog
- Marketing Website, Tiered Celebrations, App Naming, Multi-sport, Family Roles, Mobile App
