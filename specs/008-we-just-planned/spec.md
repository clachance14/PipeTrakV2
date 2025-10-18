# Feature Specification: Authenticated Pages with Real Data

**Feature Branch**: `008-we-just-planned`
**Created**: 2025-10-17
**Status**: Draft
**Input**: User description: "We just planned out the pages of the app"

## Execution Flow (main)
```
1. Parse user description from Input
   → ✅ DONE: Planning discussion completed with user
2. Extract key concepts from description
   → ✅ DONE: Sidebar navigation, real data integration, dashboard metrics, page overhaul
3. For each unclear aspect:
   → User clarified via questions: landing page behavior, data sources, page priorities, navigation style
4. Fill User Scenarios & Testing section
   → ✅ DONE: Multiple user scenarios defined
5. Generate Functional Requirements
   → ✅ DONE: Requirements extracted from planning discussion
6. Identify Key Entities (if data involved)
   → ✅ DONE: Existing entities (components, packages, needs_review, welders, etc.)
7. Run Review Checklist
   → ⚠️ Some implementation details removed from original plan
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
As a **construction project manager**, I want to view real-time project metrics and navigate between functional pages so that I can track component progress, manage test packages, resolve flagged issues, and oversee welder activities without seeing placeholder data.

### Acceptance Scenarios

1. **Given** a user has just logged in with access to multiple projects, **When** they land on the home page, **Then** the system automatically selects their first project and displays that project's dashboard with live metrics (overall progress, packages ready, needs review count, recent activity).

2. **Given** a user is viewing the dashboard, **When** they click on a navigation item in the sidebar (e.g., "Test Packages"), **Then** the system navigates to that page and displays real data filtered to the currently selected project.

3. **Given** a user switches to a different project using the project selector dropdown, **When** the project changes, **Then** all page data refreshes to show metrics and content for the newly selected project.

4. **Given** a user is on the Test Packages page, **When** they view the list of packages, **Then** each package card shows actual progress percentage, component count, blocker count, and target date from the database.

5. **Given** a user with appropriate permissions is on the Needs Review page, **When** they click "Resolve" on a flagged item, **Then** a dialog opens allowing them to add a resolution note and mark the item as resolved or ignored.

6. **Given** a user is on the Welders page, **When** they view the welder directory, **Then** each welder shows their name, stencil, verification status, weld count, and verification date (if applicable).

7. **Given** a user with welder management permissions, **When** they click "Verify" on an unverified welder, **Then** the system marks that welder as verified and records who verified them and when.

8. **Given** a user clicks "Add Welder", **When** they submit the form with a valid name and stencil, **Then** the system creates the welder with unverified status and validates that the stencil doesn't already exist.

9. **Given** a user is viewing any page, **When** they click the sidebar toggle button, **Then** the sidebar collapses to show only icons (or expands to show full labels), and this preference persists across page navigation.

10. **Given** a user without appropriate permissions views the sidebar, **When** the navigation renders, **Then** restricted items (e.g., Team management for non-admins) are hidden from view.

### Edge Cases

- **What happens when a user has no projects?**
  System displays a friendly message: "No projects available. Contact your administrator to be assigned to a project."

- **What happens when a project has no components yet?**
  Dashboard shows 0% progress, 0 components, and empty state messages on relevant pages ("No components found" with option to import).

- **What happens when needs review count is 0?**
  Needs Review page shows success message: "No items need review" with a green checkmark. Sidebar badge disappears.

- **What happens when package readiness view has no data?**
  Test Packages page shows empty state: "No test packages found" with a button to create one.

- **What happens when a welder stencil already exists?**
  Add Welder form shows validation error: "Welder stencil already exists in this project" and prevents submission.

- **What happens when a user tries to verify a welder without permission?**
  The "Verify" button is hidden from the UI. If accessed directly, the system rejects the action.

- **What happens when switching projects mid-workflow?**
  System immediately refreshes all displayed data to match the new project context. Any open modals/dialogs remain open but may show different data or close if the entity no longer applies to the new project.

- **What happens when the sidebar is collapsed on mobile?**
  On small screens, the sidebar automatically collapses to icon-only view by default. Users can still expand it temporarily via a hamburger menu button.

- **What happens when dashboard metrics fail to load?**
  System displays error state with retry button: "Failed to load metrics. [Retry]" for each affected card.

---

## Requirements *(mandatory)*

### Functional Requirements

#### Navigation & Layout
- **FR-001**: System MUST provide a collapsible sidebar navigation that shows/hides full labels while keeping icons visible.
- **FR-002**: System MUST persist sidebar expand/collapse state across user sessions.
- **FR-003**: Sidebar MUST highlight the currently active page/route.
- **FR-004**: Sidebar MUST include navigation items for: Dashboard, Components, Drawings, Test Packages, Needs Review, Welders, Imports, and Team (permission-gated).
- **FR-005**: System MUST hide restricted navigation items from users who lack the required permissions.
- **FR-006**: System MUST provide a project selector dropdown that remains visible on all authenticated pages.
- **FR-007**: Project selector MUST display all projects the user has access to.
- **FR-008**: System MUST auto-select the user's first available project when they log in if no project is already selected.

#### Dashboard Page
- **FR-009**: Dashboard MUST display overall project progress as a percentage calculated from all component completion percentages.
- **FR-010**: Dashboard MUST display total component count for the selected project.
- **FR-011**: Dashboard MUST display the count of test packages that are 100% ready for turnover.
- **FR-012**: Dashboard MUST display the count of pending items in the needs review queue with an alert icon.
- **FR-013**: Dashboard MUST display recent activity feed showing recent milestone events or audit log entries (limited to last 10 items).
- **FR-014**: Dashboard MUST show user initials, action description, and timestamp for each activity entry.
- **FR-015**: Dashboard MUST provide quick access cards with links to major functional pages.
- **FR-016**: System MUST refresh dashboard data when the selected project changes.

#### Test Packages Page
- **FR-017**: Test Packages page MUST display all test packages for the selected project in a grid layout.
- **FR-018**: Each package card MUST show: package name, progress percentage, total component count, blocker count, and target date (if set).
- **FR-019**: System MUST visually distinguish packages that are 100% complete, in progress, or blocked.
- **FR-020**: System MUST allow users to filter packages by: All, Ready (100%), In Progress (<100%), or Blocked (blocker count > 0).
- **FR-021**: System MUST allow users to search packages by name.
- **FR-022**: System MUST allow users to sort packages by: Name, Progress, or Target Date.
- **FR-023**: When no packages exist, system MUST show empty state with option to create a test package.
- **FR-024**: Package cards MUST provide a "View Details" action that navigates to a filtered component view.

#### Needs Review Page
- **FR-025**: Needs Review page MUST display all pending flagged items for the selected project by default.
- **FR-026**: Each review item MUST show: type (out of sequence, rollback, delta quantity, drawing change, similar drawing, verify welder), description, and age since creation.
- **FR-027**: System MUST color-code item age: recent (<1 day) as gray, moderate (1-3 days) as amber, old (>3 days) as red.
- **FR-028**: System MUST allow users to filter review items by type and status (Pending, Resolved, Ignored).
- **FR-029**: Users with resolve permissions MUST be able to mark items as "Resolved" or "Ignored".
- **FR-030**: When resolving an item, system MUST allow users to optionally add a resolution note.
- **FR-031**: System MUST record who resolved each item and when.
- **FR-032**: System MUST show the needs review count as a badge on the sidebar navigation item.
- **FR-033**: When no pending items exist, system MUST show success message: "No items need review".

#### Welders Page
- **FR-034**: Welders page MUST display all welders for the selected project in a table format.
- **FR-035**: Each welder row MUST show: name, stencil, verification status (verified/unverified), weld count, and verification date (if applicable).
- **FR-036**: System MUST allow users to filter welders by status: All, Verified, or Unverified.
- **FR-037**: System MUST allow users to search welders by name or stencil.
- **FR-038**: System MUST allow users to sort welders by: Name, Stencil, Weld Count, or Verification Date.
- **FR-039**: Users with welder management permissions MUST be able to add new welders via an "Add Welder" button.
- **FR-040**: When adding a welder, system MUST require name and stencil fields.
- **FR-041**: System MUST normalize welder stencils to uppercase before saving.
- **FR-042**: System MUST validate that stencil format is 2-12 characters (alphanumeric and hyphens only).
- **FR-043**: System MUST prevent duplicate stencils within the same project.
- **FR-044**: New welders MUST start with "unverified" status.
- **FR-045**: Users with welder management permissions MUST be able to verify unverified welders.
- **FR-046**: When verifying a welder, system MUST record who verified them and when.
- **FR-047**: Weld count MUST reflect the number of "Weld Made" milestones associated with that welder.

#### Imports Page
- **FR-048**: Imports page MUST display a file upload area for future import functionality.
- **FR-049**: Imports page MUST display recent import history showing: filename, component count, timestamp, and status.
- **FR-050**: System MUST provide downloadable template files for different import types (spools, field welds, valves/fittings).
- **FR-051**: When no recent imports exist, system MUST show empty state: "No recent imports".

#### Permission-Based Access
- **FR-052**: System MUST hide "Verify" button on welders page from users without welder management permission.
- **FR-053**: System MUST hide "Resolve" button on needs review page from users without resolve reviews permission.
- **FR-054**: System MUST hide "Team" navigation item from users without team management permission.
- **FR-055**: System MUST show read-only state for milestone toggles when users lack update milestones permission.

#### Data Refresh & Real-Time Updates
- **FR-056**: All pages MUST refresh their data when the user switches to a different project.
- **FR-057**: System MUST display loading states while fetching data.
- **FR-058**: System MUST display error states with retry options when data fetching fails.
- **FR-059**: System MUST show user-friendly error messages (not technical stack traces).

### Key Entities *(existing entities from Sprint 1)*

- **Project**: A construction project that contains all components, packages, welders, and other entities. Users select one active project at a time.
- **Component**: A pipe spool, valve, weld, support, or other trackable item with milestones and progress percentage.
- **Test Package**: A logical grouping of components for turnover readiness tracking. Contains multiple components, has a target date, and shows aggregate progress.
- **Needs Review Item**: A flagged exception requiring human review (e.g., out-of-sequence milestone, quantity delta, unverified welder usage). Has a type, status (pending/resolved/ignored), payload with details, and resolution tracking.
- **Welder**: A person authorized to perform welds, with a unique stencil identifier. Tracks verification status, verification date, and associated weld count.
- **Milestone Event**: A historical record of a milestone being completed, rolled back, or updated. Links to component, user who performed action, and timestamp.
- **Audit Log**: System-wide activity log capturing user actions for compliance and troubleshooting.
- **Materialized View - Package Readiness**: Pre-computed aggregation of test package progress metrics (component counts, completion percentages, blocker counts) for fast dashboard queries.
- **Materialized View - Drawing Progress**: Pre-computed aggregation of drawing-level progress metrics for tree navigation.

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain (clarified via user questions)
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded (authentication pages only, no import implementation)
- [x] Dependencies and assumptions identified (existing database schema from Sprint 1)

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted (from planning discussion)
- [x] Ambiguities marked (then resolved via questions)
- [x] User scenarios defined (10 scenarios + 9 edge cases)
- [x] Requirements generated (59 functional requirements)
- [x] Entities identified (9 existing entities)
- [x] Review checklist passed

---

## Dependencies & Assumptions

### Dependencies
- Sprint 1 Core Foundation (Feature 005) MUST be complete - provides database schema, tables, hooks, and materialized views.
- Permission system (7 roles, 6 permissions) MUST be functional for permission-gated UI.
- ProjectContext MUST correctly manage selected project state across routes.
- TanStack Query hooks MUST be available: useComponents, useTestPackages, useNeedsReview, useWelders, useAuditLog, useRefreshDashboards.

### Assumptions
- Database materialized views (mv_package_readiness, mv_drawing_progress) refresh every 60 seconds automatically or can be manually triggered.
- Users will have at least one project assigned; "no projects" is a rare edge case.
- File upload implementation for Imports page is explicitly out of scope for this feature (foundation only).
- Existing Layout component with top navigation (project selector, search, notifications, user menu) remains functional.
- Responsive design targets desktop-first with mobile optimization as secondary priority.

### Out of Scope
- Real-time presence tracking ("Active Users" dashboard card) - deferred to future feature.
- Full file upload implementation on Imports page - placeholder UI only.
- Advanced filtering options (date ranges, custom filters) - basic filters only.
- Export functionality (Excel/PDF reports) - not included.
- Dark mode theme support - not included.
- Mobile-specific app optimization - responsive web only.

---
