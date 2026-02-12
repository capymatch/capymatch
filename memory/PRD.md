# Volleyball Recruiting CRM (Families) - PRD

## Original Problem Statement
Build a production-ready web app called "Volleyball Recruiting CRM (Families)" with Recruiting Board (5 grouped sections), University Knowledge Base (D1/D2/D3), Dashboard, Needs Follow-Up page, Program Detail page. Multi-tenant SaaS with strict tenant isolation. Server-side automation rules for status changes.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB (motor async driver)
- **Auth**: Emergent-managed Google OAuth
- **Theming**: CSS variables with class-based dark mode (default: dark)

## User Personas
- **Volleyball Athlete Families**: Primary users tracking college recruiting process
- **Athletes**: High school volleyball players managing program outreach

## Core Requirements
- Multi-tenant isolation (tenant_id derived server-side from logged-in user)
- 5-section Recruiting Board grouped by recruiting_status
- University Knowledge Base (45 seeded programs across D1/D2/D3)
- Dashboard with stats and recent activity
- Needs Follow-Up page for overdue action items
- Program Detail with coaches and interaction timeline management
- Server-side automation rules
- Dark/Light theme toggle with persistence

## What's Been Implemented (Feb 12, 2026)

### Backend (server.py)
- Auth: session exchange, /auth/me, logout
- Programs: full CRUD with tenant isolation
- Coaches: full CRUD with tenant isolation
- Interactions: create/list with tenant isolation
- Knowledge Base: list with filters, add-to-board
- Dashboard: stats endpoint
- Follow-ups: list overdue, mark-sent with auto-interaction creation
- Automation rules: status→contact date, reply→priority, contact→next_action_due
- Seed data: 45 universities (20 D1, 10 D2, 15 D3)

### Frontend
- Login page with Google OAuth
- Dashboard with stat cards, board breakdown, recent activity
- Recruiting Board with 5 collapsible sections, inline editing, search/filters
- University Knowledge Base with division tabs, search, add-to-board
- Needs Follow-Up with overdue list and mark-sent action
- Program Detail with full edit, coaches management, interaction timeline
- **Dark/Light Theme System**:
  - Theme toggle button in header (sun/moon icons)
  - CSS variables for all colors (index.css)
  - ThemeProvider context (lib/theme.js)
  - localStorage persistence
  - All pages and dialogs support both themes

## Prioritized Backlog

### P0 (Done)
- [x] Auth flow (Google OAuth)
- [x] Recruiting Board with 5 sections
- [x] University Knowledge Base
- [x] Dashboard
- [x] Needs Follow-Up
- [x] Program Detail
- [x] CRUD for Programs, Coaches, Interactions
- [x] Automation rules
- [x] Seed data
- [x] Dark/Light theme toggle

### P1 (Next)
- [ ] Bulk actions (select multiple programs, update status)
- [ ] Export data to CSV
- [ ] Email notifications for due follow-ups
- [ ] Settings page for athlete name/preferences

### P2 (Future)
- [ ] Calendar view for follow-up scheduling
- [ ] Mobile-responsive optimization
- [ ] Activity log/audit trail
- [ ] Sharing/collaboration between family members
