# Feature Specification: Drawing-Centered Component Progress Table

**Feature Branch**: `010-let-s-spec`
**Created**: 2025-10-19
**Status**: Draft
**Input**: User description: "Let's spec out the drawing table"

> **📝 IMPLEMENTATION NOTE**: This specification was designed and implemented with slider-based milestone editors for partial milestones. The implementation evolved in **Feature 025** (2025-11-07) to use inline percentage input boxes instead of slider-based popover editors. Current implementation uses direct numeric input for faster, more mobile-friendly updates.

## Execution Flow (main)
```
1. Parse user description from Input
   → Feature: Unified table for drawings and components with inline progress updates
2. Extract key concepts from description
   → Actors: Foreman, QC Inspector, Project Manager
   → Actions: View drawings, expand to see components, update milestones inline
   → Data: Drawings, Components, Milestones, Progress Percentages
   → Constraints: Minimal clicks, drawing-centered workflow, opportunistic updates
3. For each unclear aspect:
   → [RESOLVED via planning session: Expandable rows, inline checkboxes, no bulk updates]
4. Fill User Scenarios & Testing section
   → Primary flow: Expand drawing → Update milestone → See progress update
5. Generate Functional Requirements
   → 35 functional requirements identified (FR-001 to FR-035)
6. Identify Key Entities
   → Drawing rows, Component rows, Milestone controls, Progress summaries
7. Run Review Checklist
   → No [NEEDS CLARIFICATION] markers
   → No implementation details (UI library names avoided)
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## User Scenarios & Testing

### Primary User Story
**As a foreman**, I need to update component progress while working in the field so that project managers can track completion status in real-time. My workflow is opportunistic—I jump between drawings based on what's getting done (material deliveries, crew availability, site conditions). I need to see all drawings at a glance, expand the one I'm working on, and update milestones with minimal clicks.

### Acceptance Scenarios

#### Scenario 1: View Drawing Progress Summary
1. **Given** I am on the components page
2. **When** I view the table
3. **Then** I see a list of all drawings with:
   - Drawing number
   - Drawing title
   - Progress summary showing completed vs. total components (e.g., "15/23")
   - Average progress percentage (e.g., "65%")
   - Total component count

#### Scenario 2: Expand Drawing to See Components
1. **Given** I am viewing the drawing list
2. **When** I click on a drawing row
3. **Then** the drawing expands to reveal all components beneath it
4. **And** components are indented to show hierarchy
5. **And** I see each component's identity, type, and individual milestones

#### Scenario 3: Update Discrete Milestone (Checkbox)
1. **Given** a drawing is expanded showing components
2. **When** I click a milestone checkbox for a component
3. **Then** the checkbox toggles immediately (checked/unchecked)
4. **And** the component's progress percentage updates automatically
5. **And** the drawing's progress summary updates to reflect the change
6. **And** the milestone event is recorded with timestamp and my user ID

#### Scenario 4: Update Partial Milestone (Percentage)
1. **Given** a drawing is expanded showing a component with partial milestones
2. **When** I click on a percentage value (e.g., "75%")
3. **Then** an inline editor appears allowing me to adjust the percentage
4. **When** I set a new value (0-100%)
5. **Then** the component's progress percentage recalculates
6. **And** the drawing's progress summary updates

#### Scenario 5: Collapse Drawing
1. **Given** a drawing is expanded
2. **When** I click the drawing row again
3. **Then** the component list collapses
4. **And** I can expand a different drawing to work on next

#### Scenario 6: Navigate Between Multiple Drawings
1. **Given** I have multiple drawings expanded
2. **When** I scroll through the table
3. **Then** I can see components from multiple drawings simultaneously
4. **And** each drawing's components remain grouped beneath their parent drawing

#### Scenario 7: Search for Specific Drawing
1. **Given** I am on the components page
2. **When** I type a drawing number in the search box (e.g., "P-001")
3. **Then** the table filters to show only matching drawings
4. **And** I can expand the filtered drawing to see its components

#### Scenario 8: Filter by Progress Status
1. **Given** I want to focus on incomplete work
2. **When** I select "In Progress" from the filter dropdown
3. **Then** the table shows only drawings that are partially complete (>0% and <100%)

### Edge Cases

#### Drawing with No Components
- **What happens when** a drawing exists but has no components assigned?
  - **Expected**: Drawing row displays "0 items" and cannot be expanded (no expand icon shown)

#### Component with Different Milestone Templates
- **How does the system handle** components of different types under the same drawing (e.g., valves with 5 milestones, instruments with 3 milestones)?
  - **Expected**: Each component row shows only its template-specific milestones. Column headers adapt to show all unique milestones present in the expanded view.

#### Simultaneous Updates
- **What happens when** two users update the same component's milestone at the same time?
  - **Expected**: Last write wins. The second user sees their update reflected. Both updates are recorded in the audit trail with timestamps.

#### Offline Updates
- **How does the system handle** milestone updates when the user loses internet connection?
  - **Expected**: Update attempt fails with clear error message: "Unable to save. Check your connection." User can retry when connection is restored.

#### Large Drawings (100+ Components)
- **What happens when** a drawing contains 100+ components?
  - **Expected**: All components load when drawing is expanded. Table remains performant with smooth scrolling. No pagination within a single drawing.

#### Invalid Percentage Input
- **What happens when** a user enters an invalid percentage (e.g., 150%, -10%, "abc")?
  - **Expected**: Input validation prevents saving values outside 0-100 range. Non-numeric input is rejected with error message.

#### Drawing with All Components Complete
- **How does the system handle** a drawing where all components are 100% complete?
  - **Expected**: Drawing row shows "23/23 • 100%" with visual indicator (e.g., green highlight). Drawing can still be expanded to view completed components.

---

## Requirements

### Functional Requirements

#### Display Requirements
- **FR-001**: System MUST display all project drawings in a table with columns: expand/collapse icon, drawing number, drawing title, progress summary, and component count
- **FR-002**: System MUST show drawing progress summary as "completed/total • average%" format (e.g., "15/23 • 65%")
- **FR-003**: System MUST calculate "completed" count as components with 100% progress
- **FR-004**: System MUST calculate "average%" as the mean of all component progress percentages for that drawing
- **FR-005**: System MUST visually distinguish drawing rows from component rows using indentation, background color, and font weight
- **FR-006**: System MUST display an expand/collapse icon on drawing rows that indicates current state (collapsed/expanded)

#### Interaction Requirements
- **FR-007**: Users MUST be able to expand a drawing by clicking anywhere on the drawing row
- **FR-008**: Users MUST be able to collapse an expanded drawing by clicking the drawing row again
- **FR-009**: System MUST allow multiple drawings to be expanded simultaneously
- **FR-010**: System MUST load component data only when a drawing is expanded (lazy loading)

#### Component Display Requirements
- **FR-011**: Expanded drawings MUST display all components as child rows beneath the parent drawing row
- **FR-012**: Component rows MUST show: identity key, component type, milestone controls (inline), and progress percentage
- **FR-013**: System MUST display discrete milestones as checkboxes that can be toggled directly in the table
- **FR-014**: System MUST display partial milestones as percentage values that open an inline editor when clicked
- **FR-015**: Each milestone column header MUST show the milestone name and weight (e.g., "Receive (10%)")

#### Milestone Update Requirements
- **FR-016**: Users MUST be able to toggle discrete milestones with a single click on the checkbox
- **FR-017**: System MUST immediately update the component's progress percentage when a milestone is changed
- **FR-018**: System MUST immediately update the drawing's progress summary when any component milestone is changed
- **FR-019**: System MUST record all milestone changes in the audit trail with: user ID, timestamp, milestone name, previous value, and new value
- **FR-020**: Partial milestone editor MUST allow input from 0% to 100% in 5% increments
- **FR-021**: Partial milestone editor MUST validate input and reject values outside the 0-100 range

#### Performance Requirements
- **FR-022**: System MUST render drawing list within 2 seconds for projects with up to 500 drawings
- **FR-023**: System MUST load and display components within 1 second when a drawing is expanded (for drawings with up to 200 components)
- **FR-024**: System MUST provide visual feedback (loading indicator) while components are loading

#### Search and Filter Requirements
- **FR-025**: Users MUST be able to search drawings by drawing number (partial match)
- **FR-026**: Users MUST be able to filter drawings by progress status: "Not Started" (0%), "In Progress" (>0% and <100%), "Complete" (100%)
- **FR-027**: Search and filter operations MUST update the visible drawing list without collapsing currently expanded drawings

#### Navigation and State Requirements
- **FR-028**: System MUST persist which drawings are expanded in the browser URL
- **FR-029**: System MUST restore expanded state when users navigate back to the page or share the URL
- **FR-030**: Users MUST be able to collapse all drawings with a single action (e.g., "Collapse All" button)

#### Permission Requirements
- **FR-031**: System MUST disable milestone controls for users without "can_update_milestones" permission
- **FR-032**: Users with read-only access MUST be able to view all data but MUST NOT be able to modify milestones

#### Responsive Requirements
- **FR-033**: On desktop screens (≥1024px), system MUST display all milestone columns inline
- **FR-034**: On tablet screens (768-1023px), system MUST show only the 3 most critical milestones with a "More" button to access remaining milestones
- **FR-035**: On mobile screens (<768px), system MUST show drawing list only without inline component expansion

### Key Entities

#### Drawing Row
Represents a single drawing in the project with aggregated progress metrics:
- **Drawing Number**: Unique normalized identifier (e.g., "P-001")
- **Drawing Title**: Optional descriptive name (e.g., "Main Process Line")
- **Progress Summary**: Completed component count, total component count, average progress percentage
- **Component Count**: Total number of components assigned to this drawing
- **Expansion State**: Boolean indicating whether components are currently visible
- **Relationships**: Has many components

#### Component Row
Represents a single physical component within a drawing:
- **Identity Key**: Type-specific unique identifier (e.g., "VBALU-001 2\" (1)")
- **Component Type**: Category of component (valve, fitting, flange, pipe, etc.)
- **Progress Percentage**: Calculated completion percentage (0.00-100.00)
- **Current Milestones**: State of all milestones for this component's template
- **Parent Drawing**: The drawing this component belongs to
- **Relationships**: Belongs to one drawing, has one progress template, has many milestone events

#### Milestone Control
Interactive UI element for updating a single milestone:
- **Milestone Name**: Display name (e.g., "Receive", "Install")
- **Milestone Weight**: Percentage weight in overall progress calculation (e.g., 10%, 60%)
- **Milestone Type**: Discrete (boolean) or Partial (percentage)
- **Current Value**: Boolean true/false for discrete, 0-100 for partial
- **Editable**: Based on user permissions

#### Progress Summary
Aggregated metrics displayed at the drawing level:
- **Completed Count**: Number of components at 100% progress
- **Total Count**: Total number of components in the drawing
- **Average Percentage**: Mean of all component progress percentages
- **Display Format**: "15/23 • 65%" (completed/total • average%)

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

### Assumptions
1. Database schema already exists with `drawings`, `components`, `milestone_events`, and `mv_drawing_progress` materialized view
2. User authentication and permission system already implemented
3. Component progress templates already defined in database
4. Milestone calculation triggers already in place

### Dependencies
1. Existing drawing and component data in database
2. User role-based permissions (read-only vs. can_update_milestones)
3. Materialized view `mv_drawing_progress` for performant drawing summaries

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (and resolved via planning session)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---

## Success Metrics

### User Efficiency
- **Target**: Foreman can update 10 components per minute (average 6 seconds per component)
- **Measurement**: Time from expanding drawing to completing milestone update

### Click Reduction
- **Target**: 50% reduction in clicks compared to modal-based workflow
- **Current (modal)**: 3 clicks (row click → modal opens → checkbox → close)
- **Target (inline)**: 2 clicks (expand drawing → checkbox)

### System Performance
- **Target**: Drawing expansion <1 second for 95% of drawings
- **Target**: Milestone update confirmation <500ms

### User Adoption
- **Target**: 80% of foreman users prefer inline table over previous interface within 2 weeks of rollout
- **Measurement**: User feedback survey and usage analytics

---

## Out of Scope

The following are explicitly NOT part of this feature:
1. **Bulk milestone updates**: No checkbox selection or "mark all as complete" functionality
2. **Component creation or deletion**: Table is read-only for component inventory
3. **Drawing creation or retirement**: Managed in separate drawings management page
4. **Mobile app native views**: Mobile <768px shows simplified view, full feature requires desktop/tablet
5. **Offline sync**: Requires active internet connection for updates
6. **Custom milestone templates**: Uses existing progress templates only
7. **Component re-assignment**: Moving components between drawings not supported in this table
8. **Export/reporting**: No CSV export or printable reports from this view

---
