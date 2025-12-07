# Feature Specification: Manhour Earned Value Tracking

**Feature Branch**: `032-manhour-earned-value`
**Created**: 2025-12-04
**Updated**: 2025-12-04 (Simplified design - columns on components table, computed earned value)
**Status**: Draft

**Input**: User description: "Add manhour budget tracking and earned value calculations to PipeTrak V2. Project managers enter total budgeted manhours, system auto-distributes to components based on size, and earned manhours update automatically as milestones complete."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create Project Manhour Budget (Priority: P1)

As a Project Manager, Owner, or Admin, I need to enter the total budgeted manhours for my project so the system can track earned value as work progresses.

**Why this priority**: This is the foundational capability - without a budget, no earned value tracking can occur. All other features depend on this being in place first.

**Independent Test**: Can be fully tested by creating a budget and verifying the system distributes manhours to all components, delivering immediate visibility into per-component allocations.

**Acceptance Scenarios**:

1. **Given** I am an Owner, Admin, or PM viewing project settings, **When** I navigate to the Manhour Budget tab, **Then** I see an option to create a new budget version.

2. **Given** no manhour budget exists for the project, **When** I click "Create New Budget Version", **Then** I see a form to enter total budgeted manhours, revision reason, and effective date.

3. **Given** I submit a valid budget (e.g., 1,250 MH with reason "Original estimate"), **When** the system processes the request, **Then** manhours are automatically distributed to all non-retired components based on their size.

4. **Given** budget distribution completes, **When** I view the results, **Then** I see a summary showing total components processed, total manhours allocated, and any validation warnings (e.g., components without size data).

---

### User Story 2 - View Earned Manhours Dashboard (Priority: P1)

As a Project Manager, Owner, or Admin, I need to see a dashboard summary of my project's manhour progress so I can track earned value at a glance.

**Why this priority**: Visibility into earned value is the core value proposition - users need immediate feedback on project progress in manhour terms.

**Independent Test**: Can be fully tested by viewing the dashboard widget after budget creation, verifying it shows budgeted, earned, and remaining manhours with progress percentage.

**Acceptance Scenarios**:

1. **Given** a project has an active manhour budget, **When** I view the Dashboard or Reports page, **Then** I see a Manhour Summary widget showing total budget, earned manhours, remaining manhours, and percent complete.

2. **Given** a project has no manhour budget configured, **When** I view the Dashboard, **Then** I see a prompt to "Configure Budget" with a link to project settings.

3. **Given** I am a Foreman, QC Inspector, Welder, or Viewer, **When** I view the Dashboard, **Then** I do not see the Manhour Summary widget (financial data is restricted).

---

### User Story 3 - Automatic Earned Value Updates (Priority: P1)

As a field worker completing milestones, I need earned manhours to update automatically so Project Managers see real-time progress without manual intervention.

**Why this priority**: Automatic updates eliminate manual data entry and ensure reports are always current, which is essential for accurate project tracking.

**Independent Test**: Can be fully tested by completing a milestone on a component and verifying the earned manhours update immediately without user action.

**Acceptance Scenarios**:

1. **Given** a component has 10 budgeted manhours and "Weld Made" milestone has 60% weight, **When** a field worker marks "Weld Made" complete, **Then** the component's earned manhours increases by 6.0 MH automatically.

2. **Given** a component has a partial milestone (e.g., "Fabricate" at 50% complete with 16% weight), **When** the milestone value changes, **Then** earned manhours update proportionally (e.g., 10 MH × 0.16 × 0.50 = 0.8 MH).

3. **Given** a component belongs to a project without an active budget, **When** milestones are updated, **Then** no error occurs (system gracefully ignores manhour calculations).

**Implementation Note**: Earned value is computed on the fly as `budgeted_manhours × percent_complete / 100`. No database triggers or stored earned_manhours column needed.

---

### User Story 4 - Revise Budget for Change Orders (Priority: P2)

As a Project Manager, Owner, or Admin, I need to create revised budget versions when change orders occur so I can track manhour changes over time with full audit history.

**Why this priority**: Change orders are common in construction projects, but the system can function without this for initial tracking. Historical versioning adds compliance and audit value.

**Independent Test**: Can be fully tested by creating a second budget version and verifying the previous version is archived while manhours are redistributed under the new budget.

**Acceptance Scenarios**:

1. **Given** a project has an active budget (v1), **When** I create a new budget version with increased manhours, **Then** the previous budget is marked inactive and the new budget becomes active.

2. **Given** I create budget v2 with reason "Change order #CO-042", **When** distribution completes, **Then** component budgeted_manhours are recalculated and earned values reflect the new allocations.

3. **Given** I view the Manhour Budget tab, **When** multiple budget versions exist, **Then** I see a version history showing all budgets with their amounts, reasons, effective dates, and active status.

---

### User Story 5 - View Manhours by Reporting Dimension (Priority: P2)

As a Project Manager, Owner, or Admin, I need to see manhours aggregated by Area, System, Test Package, or Drawing so I can identify which parts of the project are ahead or behind schedule.

**Why this priority**: Aggregated reporting enables management decisions but requires the core budget and tracking to be in place first.

**Independent Test**: Can be fully tested by generating a report grouped by Area and verifying it shows budgeted, earned, and remaining manhours for each area.

**Acceptance Scenarios**:

1. **Given** a project has an active budget with components assigned to areas, **When** I view the Reports page and select "Group by Area", **Then** I see each area with its component count, budgeted MH, earned MH, remaining MH, and percent complete.

2. **Given** I select "Group by System", **When** the report loads, **Then** I see manhours aggregated by system instead of area.

3. **Given** I select "Group by Test Package", **When** the report loads, **Then** I see manhours aggregated by test package.

4. **Given** I select "Group by Drawing", **When** the report loads, **Then** I see manhours aggregated by drawing.

**Implementation Note**: Aggregations are computed dynamically via SQL SUM() on component queries, not via pre-built database views.

---

### User Story 6 - View Component-Level Manhours (Priority: P2)

As a Project Manager, Owner, or Admin, I need to see manhour details for individual components so I can drill down into specific items.

**Why this priority**: Component-level detail supports troubleshooting and verification but is secondary to aggregate project views.

**Independent Test**: Can be fully tested by opening a component detail modal and verifying the manhour section shows budgeted, earned, and weight value.

**Acceptance Scenarios**:

1. **Given** I am authorized to view financial data and a component has manhour data, **When** I view the component detail modal's Overview tab, **Then** I see budgeted manhours, earned manhours (computed), percent complete, and weight value.

2. **Given** I am a Foreman or Welder, **When** I view the component detail modal, **Then** the manhour section is not visible.

---

### User Story 7 - Export Manhour Reports (Priority: P3)

As a Project Manager, Owner, or Admin, I need to export manhour reports to PDF, Excel, or CSV so I can share progress with stakeholders outside the system.

**Why this priority**: Export is a convenience feature that adds value but is not required for core tracking functionality.

**Independent Test**: Can be fully tested by exporting a manhour report to each format and verifying the exported file contains manhour columns.

**Acceptance Scenarios**:

1. **Given** I am viewing a progress report with manhour columns, **When** I click "Export to PDF", **Then** the PDF includes manhour columns (Budgeted MH, Earned MH, Remaining MH, % Complete).

2. **Given** I click "Export to Excel", **When** the file downloads, **Then** it includes manhour data in a worksheet.

3. **Given** I click "Export to CSV", **When** the file downloads, **Then** it includes manhour fields.

4. **Given** I am not authorized to view financial data, **When** I export a report, **Then** manhour columns are not included in the export.

---

### Edge Cases

- What happens when a component has no parseable SIZE (e.g., "NOSIZE", empty, or fractional like "1/4")? → System assigns a fixed weight of 0.5 and logs a validation warning.
- What happens when a project has zero non-retired components? → System prevents budget creation with an error message.
- What happens when the sum of component weights is zero? → System prevents distribution with an error message.
- How does the system handle partial milestones (0-100%) vs discrete milestones (true/false)? → Earned value is computed from percent_complete, which already accounts for milestone weights and values.
- What happens when new components are added after budget distribution? → Components with `created_at` after `budget.effective_date` are flagged as "additions", receive `budgeted_manhours = 0`, and are viewable in a dedicated "Added Components" report. They remain at 0 until a new budget version is created.

## Requirements *(mandatory)*

### Functional Requirements

**Budget Management:**
- **FR-001**: System MUST allow Owner, Admin, or PM to create a project manhour budget with total budgeted manhours, revision reason, and effective date.
- **FR-002**: System MUST enforce only one active budget per project at any time.
- **FR-003**: System MUST maintain full version history of all budget revisions with reason and effective date.
- **FR-004**: System MUST allow Owner, Admin, or PM to create new budget versions (previous version automatically archived).

**Manhour Distribution:**
- **FR-005**: System MUST automatically distribute total budgeted manhours to all non-retired components when a budget is created.
- **FR-006**: System MUST calculate component weight using SIZE field from identity key with non-linear scaling (diameter^1.5). For reducers (e.g., "2X4"), use average diameter: `((d1 + d2) / 2)^1.5`.
- **FR-007**: System MUST assign fixed weight (0.5) to components without parseable size and generate validation warning.
- **FR-008**: System MUST handle threaded pipe specially by factoring in linear footage (diameter^1.5 × linear_feet × 0.1).
- **FR-009**: System MUST store the calculated weight value (`manhour_weight`) for each component.

**Earned Value Calculation:**
- **FR-010**: System MUST compute earned manhours as `budgeted_manhours × percent_complete / 100` (always derived, never stored).
- **FR-011**: System MUST gracefully handle components in projects without active budgets (earned = 0 when budgeted = 0).

**Reporting & Aggregation:**
- **FR-012**: System MUST provide aggregated manhour data by Area, System, Test Package, and Drawing via dynamic SQL queries.
- **FR-013**: System MUST calculate and display: budgeted manhours, earned manhours, remaining manhours, and percent complete for each aggregation level.
- **FR-014**: System MUST provide project-level summary showing total budget, allocated, earned, and percent complete.
- **FR-014a**: System MUST provide an "Added Components" report showing components created after the active budget's effective date (post-baseline additions with no manhour allocation).

**Permissions & Security:**
- **FR-015**: System MUST restrict viewing of manhour data to Owner, Admin, and Project Manager roles only.
- **FR-016**: System MUST restrict creating/editing budgets to Owner, Admin, and Project Manager roles.
- **FR-017**: System MUST enforce organization boundaries (users can only see their organization's manhour data).
- **FR-018**: System MUST hide manhour UI elements from unauthorized users (graceful degradation).

**User Interface:**
- **FR-019**: System MUST display Manhour Summary widget on Dashboard page for authorized users.
- **FR-020**: System MUST display Manhour Summary widget on Reports page for authorized users.
- **FR-021**: System MUST display manhour section in Component Detail modal's Overview tab for authorized users.
- **FR-022**: System MUST provide "Manhour Budget" tab in Project Settings for budget management.
- **FR-023**: System MUST show distribution results after budget creation (components processed, total allocated, warnings).

**Export:**
- **FR-024**: System MUST include manhour columns in PDF, Excel, and CSV exports when user is authorized.
- **FR-025**: System MUST exclude manhour data from exports for unauthorized users.

### POST-MVP Features (Deferred)

The following requirements are deferred to a future release:

- **FR-POST-001**: Manual weight adjustment for individual components
- **FR-POST-002**: Redistribution scope selection (Area, System, Test Package, etc.)
- **FR-POST-003**: Bucket-level manual overrides
- **FR-POST-004**: Material/schedule multipliers (e.g., stainless steel = 1.3x)

### Key Entities

- **Project Manhour Budget**: Represents a versioned budget allocation for a project. Contains total budgeted manhours, version number, revision reason, effective date, active status, and creator reference. Stored in `project_manhour_budgets` table.

- **Component Manhour Data**: Columns on the existing `components` table:
  - `budgeted_manhours` - Manhours allocated to this component
  - `manhour_weight` - Calculated weight value used for proportional distribution

- **Earned Manhours**: Computed value (not stored): `budgeted_manhours × percent_complete / 100`

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Project Managers can create a manhour budget and see distribution results in under 30 seconds for projects with up to 5,000 components.

- **SC-002**: Earned manhours are always current (computed on the fly from percent_complete) - no sync delay.

- **SC-003**: Dashboard widget displays current budget status (budgeted, earned, remaining, % complete) on page load in under 1 second.

- **SC-004**: Users can generate aggregated manhour reports (by Area, System, Test Package, or Drawing) in under 3 seconds.

- **SC-005**: Unauthorized users (Foreman, QC Inspector, Welder, Viewer) never see manhour data in any part of the application.

- **SC-006**: Budget versioning maintains complete audit trail - all historical budget versions remain accessible with their original values, reasons, and dates.

- **SC-007**: System handles projects without manhour budgets gracefully - all existing functionality continues to work without errors or degraded experience.

- **SC-008**: Manhour exports (PDF, Excel, CSV) include all required columns and match the values displayed in the application.

## Clarifications

### Session 2025-12-04

- Q: Can users manually adjust individual component manhour allocations after distribution? → A: Deferred to POST-MVP. For MVP, allocations are calculated automatically based on weight.
- Q: Should we use database views for aggregations? → A: No - use dynamic SQL queries. Aggregations work with any grouping dimension without pre-built views.
- Q: Should earned_manhours be stored or computed? → A: Computed on the fly as `budgeted_manhours × percent_complete / 100`. Always accurate, no sync needed.
- Q: Separate component_manhours table or columns on components? → A: Columns on components table (budgeted_manhours, manhour_weight). Simpler data model.
- Q: What weight should components without parseable SIZE receive? → A: Fixed weight of **0.5** (smaller than a 1" pipe since these are typically accessories/instruments with less work).
- Q: How should reducer sizes like "1X2" or "2X4" be handled? → A: Use **average diameter**: `((d1 + d2) / 2)^1.5`. Example: "2X4" → avg(2,4)=3 → 3^1.5 ≈ 5.2
- Q: How are components added after budget baseline handled? → A: Compare `component.created_at` vs `budget.effective_date`. Components created after baseline are flagged as "additions", receive `budgeted_manhours = 0`, and are viewable in a dedicated "Added Components" report.
- Q: Which report types include manhour columns in exports? → A: All report types that include component data, excluding components flagged as additions (which have no budget).

## Assumptions

- Existing milestone weights in `progress_templates` sum to 100% and accurately represent the proportion of work for each milestone type.
- Component identity_key contains a parseable SIZE field for most component types (valves, fittings, flanges, etc.) in formats like "2", "4", "1X2".
- Threaded pipe components include a `linear_feet` field in their identity_key.
- Components without parseable size (instruments, some spools) can reasonably receive a fixed weight allocation.
- The existing `percent_complete` field on components accurately reflects milestone progress.

## Dependencies

- Existing `progress_templates` table with validated milestone weights.
- Existing component identity_key structure with SIZE field.
- Existing `percent_complete` field on components (maintained by milestone update system).
- Existing Project Settings page structure with tab navigation.
- Existing Dashboard and Reports pages.
- Existing Component Detail modal with Overview tab.
- Existing PDF/Excel/CSV export functionality.

## Spec Completion Checklist *(Constitution v2.0.0)*

**Documentation Completeness:**
- [x] All user flows documented (mobile AND desktop where applicable)
- [x] All acceptance criteria written in testable "Given/When/Then" format
- [x] All edge cases listed with expected behavior

**Validation:**
- [x] No unresolved questions remain in `/clarify` (or clarifications marked as deferred with justification)
- [x] All dependencies on other features or systems listed explicitly

**Constitution Note:** Incomplete specs lead to vague plans and implementation churn. Exit criteria prevent premature planning.
