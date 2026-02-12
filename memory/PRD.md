# Volleyball Recruiting CRM - PRD

## Original Problem Statement
Build a "Family Recruiting CRM" application for tracking student-athlete recruitment with universities.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB (motor async driver)
- **Auth**: Emergent-managed Google OAuth
- **Theming**: CSS variables with class-based dark/light mode

## Core Features Implemented

### Navigation & Layout
- Left sidebar navigation with: Dashboard, Pipeline, Calendar, Inbox, Tasks, Schools, Analytics, Settings
- Top header with search and notifications
- User profile section in sidebar
- Full light/dark theme support

### Dashboard
- Stats cards (Active Schools, Offers Received, Follow-ups Due)
- Recruiting Pipeline progress bars
- Recent Activity section
- Schools Requiring Action list
- Quick stats by Division and Priority
- Clean design without icons in stat cards

### Pipeline (Recruiting Board)
- Kanban-style funnel view (5 columns: Not Contacted, Contacted, Active, Offers, Closed)
- Color-coded section headers (no icons, colored text)
- Collapsible sections with program counts
- Inline editing for program fields
- Quick Add row for each section
- Search and filter functionality
- Dividers between sections

### Calendar Page
- Monthly calendar view with navigation
- Events displayed on calendar days
- Upcoming follow-ups sidebar
- This Month stats
- Event type legend
- Theme-aware styling

### Knowledge Base (Schools)
- University cards with filters
- Division, Region, Conference filters
- Add to Board functionality
- Search functionality

### Tasks (Follow-ups)
- List of programs requiring follow-up
- Mark as sent functionality
- Priority indicators

### Settings
- Theme selection (Dark/Light/System)
- Profile section
- Notifications toggles
- Privacy & Data Export

### Placeholder Pages
- Inbox (coming soon)
- Analytics (coming soon)

## What's Been Completed (Feb 12, 2026)

### Session Updates
1. ✅ Implemented dark/light theme toggle system
2. ✅ Created new Dashboard design matching reference image
3. ✅ Added left sidebar navigation
4. ✅ Created Calendar page
5. ✅ Added Calendar, Dashboard links to sidebar
6. ✅ Removed icons from Dashboard stat cards
7. ✅ Removed icons from Pipeline funnel cards
8. ✅ Added colored text to Pipeline section headers
9. ✅ Added divider lines between sections
10. ✅ Added theme settings to Settings page
11. ✅ Fixed light theme support across all pages
12. ✅ Removed "Volleyball Recruiting 2028" from header
13. ✅ Removed Add School button from Dashboard

## Tech Stack
- React 18
- Tailwind CSS with CSS variables for theming
- Shadcn/UI components
- FastAPI backend
- MongoDB database
- Google OAuth authentication

## CSS Theme Variables
- `--t-bg`: Background color
- `--t-surface`: Card/surface background
- `--t-surface-alt`: Alternative surface color
- `--t-border`: Border color
- `--t-text`: Primary text color
- `--t-text-secondary`: Secondary text
- `--t-text-muted`: Muted text
- `--t-sidebar-bg`: Sidebar background
- `--t-header-bg`: Header background

## Backlog

### P1 (Next)
- [ ] Bulk actions for programs
- [ ] Export data to CSV
- [ ] Email notifications for due follow-ups
- [ ] Functional Inbox page

### P2 (Future)
- [ ] Analytics dashboard with charts
- [ ] Mobile-responsive optimization
- [ ] Activity log/audit trail
- [ ] Sharing/collaboration between family members
