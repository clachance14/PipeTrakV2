# Feature Specification: Timeline Report Filter

**Feature Branch**: `033-timeline-report-filter`
**Created**: 2025-12-05
**Status**: Draft
**Input**: User description: "Add a date range filter to Component Progress and Field Weld reports showing progress delta (progress gained) during a selected timeframe. When users select a date range like Last 7 Days, the report shows delta values instead of current totals. Applies to Component Progress (Count, Manhours, MH%) and Field Welds (Area, System, Test Package, Welder dimensions). Only shows dimensions with activity in the period."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Weekly Progress Delta for Component Progress (Priority: P1)

An executive or project manager wants to see how much progress was gained in the last 7 days for Component Progress. They select "Last 7 Days" from the date range filter and see delta values showing the percentage points gained during that week, not cumulative totals. For example, if Area A went from 50% to 60% complete, the report shows "+10%" (the delta), not "60%".

**Why this priority**: This is the primary use case - executives need to report weekly progress to stakeholders. Without this, they must manually calculate deltas from multiple reports.

**Independent Test**: Can be fully tested by selecting a date range preset on the Component Progress tab and verifying delta values appear with positive/negative indicators.

**Acceptance Scenarios**:

1. **Given** I am on the Reports page Component Progress tab, **When** I click the date range filter and select "Last 7 Days", **Then** the report title changes to "Progress Delta", column values show signed percentages (+/-), and only areas/systems with activity appear.

2. **Given** a date range filter is active showing delta values, **When** I select "All Time", **Then** the report reverts to showing cumulative totals (existing behavior) with all dimensions visible.

3. **Given** I select "Last 7 Days" and Area A had milestones completed that increased progress by 15%, **When** I view the report, **Then** Area A shows "+15%" for the delta column.

4. **Given** I select "Last 7 Days" and Area B had a milestone rolled back reducing progress by 5%, **When** I view the report, **Then** Area B shows "-5%" displayed in a visually distinct negative style.

---

### User Story 2 - View Monthly Progress Delta for Field Welds (Priority: P1)

A project manager wants to see field weld progress gained in the last 30 days. They select "Last 30 Days" from the date range filter on the Field Welds tab and see delta values for Fit-up, Weld Complete, and Accepted milestones.

**Why this priority**: Field welds are critical deliverables tracked separately. Executives need periodic progress reports for both component types.

**Independent Test**: Can be fully tested by selecting a date range on Field Welds tab and verifying delta values for weld milestones appear.

**Acceptance Scenarios**:

1. **Given** I am on the Reports page Field Welds tab, **When** I click the date range filter and select "Last 30 Days", **Then** the report shows delta values for field weld milestones grouped by my selected dimension.

2. **Given** I select "Last 30 Days" on Field Welds tab with dimension "Welder", **When** viewing the report, **Then** I see each welder's delta progress with only welders who had activity appearing.

3. **Given** the Field Welds tab has "Last 30 Days" selected, **When** I switch dimensions from "Area" to "System", **Then** the delta report updates to show system-grouped deltas.

---

### User Story 3 - View Progress Delta by Manhours (Priority: P2)

A project manager wants to see manhours earned during a specific period. They select a date range and switch to "Manhour" view mode to see how many manhours were earned during the period, not just percentage changes.

**Why this priority**: Manhour tracking is essential for earned value reporting and cost analysis, but percentage view is more commonly used for quick status checks.

**Independent Test**: Can be tested by selecting a date range, switching to Manhour view, and verifying earned manhour deltas appear.

**Acceptance Scenarios**:

1. **Given** I have "Last 7 Days" selected on Component Progress, **When** I switch view mode from "Count" to "Manhour", **Then** the report shows manhour delta values (e.g., "+45 MH earned") instead of percentage deltas.

2. **Given** I have "Last 7 Days" selected and am in "MH %" view mode, **When** I view the report, **Then** I see the percentage of manhour budget that was earned during the period (e.g., "+2.5% of MH budget earned").

---

### User Story 4 - Use Custom Date Range (Priority: P2)

An executive needs a report for a specific reporting period (e.g., Nov 1-15). They select "Custom" from the date range filter, enter start and end dates, and see progress delta for that exact period.

**Why this priority**: Custom ranges are needed for specific reporting periods, but preset options cover most common use cases.

**Independent Test**: Can be tested by selecting Custom, entering dates, and verifying delta report shows data only for events in that range.

**Acceptance Scenarios**:

1. **Given** I select "Custom" from the date range filter, **When** I enter start date "2025-11-01" and end date "2025-11-15" and click Apply, **Then** the report shows progress delta for only milestone events that occurred within those dates.

2. **Given** I am entering custom dates, **When** I enter an end date before the start date, **Then** the Apply button is disabled or an error message appears preventing submission.

3. **Given** I have a custom date range applied, **When** I click the clear button (X), **Then** the filter resets to "All Time" and shows cumulative totals.

---

### User Story 5 - View Year-to-Date Progress Summary (Priority: P3)

An executive preparing an annual review wants to see total progress gained since January 1st. They select "YTD" and see all progress accumulated since the start of the year.

**Why this priority**: Annual reporting is less frequent than weekly/monthly, and can be achieved with custom dates if needed.

**Independent Test**: Can be tested by selecting YTD preset and verifying the date range covers Jan 1 to today.

**Acceptance Scenarios**:

1. **Given** today is December 5, 2025, **When** I select "YTD" from the date range filter, **Then** the report shows progress delta from January 1, 2025 to today.

---

### Edge Cases

- **No activity in selected period**: System shows "No Activity Found" message with an icon, not an empty table.
- **All dimensions have zero activity**: System shows "No Activity Found" instead of empty rows.
- **Rollback events**: Negative deltas are displayed with distinct visual styling (e.g., red text, minus sign).
- **Mixed positive and negative**: Grand total row shows net delta which may be positive, negative, or zero.
- **Components without manhour budgets**: Manhour columns show 0 for these components without errors.
- **Date range with no data in system**: Shows "No Activity Found" message.
- **User switches tabs with filter active**: Date range filter state persists across Component Progress and Field Welds tabs.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to filter progress reports by date range using preset options (All Time, Last 7 Days, Last 30 Days, Last 90 Days, YTD, Custom).
- **FR-002**: System MUST display progress delta values (change during period) when any date range other than "All Time" is selected.
- **FR-003**: System MUST display cumulative totals (existing behavior) when "All Time" is selected.
- **FR-004**: System MUST calculate delta as the sum of (new value - previous value) for all milestone events within the selected date range.
- **FR-005**: System MUST support delta display for Component Progress in all three view modes: Count, Manhour, and Manhour Percent.
- **FR-006**: System MUST support delta display for Field Welds in all four dimensions: Area, System, Test Package, and Welder.
- **FR-007**: System MUST only display dimensions (areas, systems, etc.) that had milestone activity during the selected period.
- **FR-008**: System MUST display negative deltas (rollbacks) with distinct visual styling indicating reduction.
- **FR-009**: System MUST allow users to clear the date filter and return to "All Time" view.
- **FR-010**: System MUST validate custom date ranges to ensure end date is not before start date.
- **FR-011**: System MUST persist the selected date range preference across page navigation within the same session.
- **FR-012**: System MUST display a "No Activity Found" message when no milestone events exist in the selected date range.
- **FR-013**: System MUST calculate and display grand totals for delta reports using weighted averages for percentages and sums for counts/manhours.

### Key Entities

- **Date Range**: Represents the time period for filtering, consisting of a preset type and optional custom start/end dates.
- **Progress Delta**: Represents the change in progress for a dimension during a period, calculated from milestone event history.
- **Milestone Event**: Existing entity tracking milestone changes with timestamps, values, and previous values.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can switch between cumulative and delta report views in under 2 seconds.
- **SC-002**: Delta calculations are accurate to within 0.1% of manual calculations from milestone event data.
- **SC-003**: Reports with date filters load and display within 3 seconds for projects with up to 10,000 milestone events.
- **SC-004**: 100% of milestone events within the selected date range are included in delta calculations.
- **SC-005**: Zero division errors or null value crashes occur when viewing delta reports for any valid date range.
- **SC-006**: Users can identify positive vs negative deltas at a glance through visual differentiation.

## Assumptions

- Milestone events already capture value and previous_value for all milestone changes (verified from existing milestone_events table).
- Existing milestone weight functions can be reused for calculating weighted delta totals.
- The date range filter state can be persisted in browser local storage using existing patterns.
- Field weld milestone events follow the same event structure as component milestone events.

## Spec Completion Checklist *(Constitution v2.0.0)*

**Documentation Completeness:**
- [x] All user flows documented (mobile AND desktop where applicable)
- [x] All acceptance criteria written in testable "Given/When/Then" format
- [x] All edge cases listed with expected behavior

**Validation:**
- [x] No unresolved questions remain in `/clarify` (or clarifications marked as deferred with justification)
- [x] All dependencies on other features or systems listed explicitly
