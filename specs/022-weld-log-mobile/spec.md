# Feature Specification: Mobile Weld Log Optimization

**Feature Branch**: `022-weld-log-mobile`
**Created**: 2025-11-02
**Status**: In Progress
**Design**: See `docs/plans/2025-11-02-mobile-weld-log-design.md`

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Simplified Weld Log on Mobile (Priority: P0)

As a field supervisor using a mobile device, I need to view the weld log with only essential information (Weld ID, Drawing Number, Date Welded) so that I can quickly scan welds without horizontal scrolling and easily navigate the list on a small screen.

**Why this priority**: This is the foundational requirement that makes the weld log usable on mobile devices. Without this, the current 10-column table is completely unusable on mobile (requires horizontal scrolling, tiny text, poor UX). This delivers immediate value by making the weld log accessible to field users.

**Independent Test**: Can be fully tested by opening the weld log page on a mobile device (≤1024px width), verifying only 3 columns display, and confirming no horizontal scrolling occurs.

**Acceptance Scenarios**:

1. **Given** I am on a mobile device (screen width ≤1024px), **When** I navigate to the weld log page, **Then** I see a table with exactly 3 columns: Weld ID, Drawing Number, and Date Welded
2. **Given** I am viewing the mobile weld log, **When** I scroll vertically through the list, **Then** I can view all welds without any horizontal scrolling
3. **Given** I am on a desktop device (screen width >1024px), **When** I navigate to the weld log page, **Then** I see the existing 10-column table unchanged
4. **Given** I am viewing the mobile weld log, **When** I tap on a Drawing Number, **Then** I am navigated to the drawing detail page (existing behavior preserved)

---

### User Story 2 - Access Full Weld Details via Modal (Priority: P1)

As a field supervisor on mobile, I need to tap on a weld row to view all weld information in a detail modal so that I can see complete weld specifications, NDE results, and metadata without switching pages or horizontal scrolling, and access action buttons (Update Weld, Record NDE) based on the weld's current state.

**Why this priority**: After P0 provides basic mobile access, users need to view full weld details AND perform actions. This is P1 because it's the primary entry point for all weld updates on mobile.

**Independent Test**: Can be fully tested by tapping any weld row on mobile, verifying the modal opens with all 10 fields of weld information displayed in a single scrollable view, and that the correct action button appears based on weld state.

**Acceptance Scenarios**:

1. **Given** I am viewing the mobile weld log, **When** I tap anywhere on a weld row, **Then** a detail modal opens showing all weld information in a read-only view
2. **Given** the weld detail modal is open, **When** I view the modal content, **Then** I see all weld details organized in logical sections: identification, specifications, welder info, NDE results, metadata, status and progress
3. **Given** the weld detail modal is open for a weld that has NOT been made, **When** I view the action buttons, **Then** I see an "Update Weld" button
4. **Given** the weld detail modal is open for a weld that HAS been made but NDE not recorded, **When** I view the action buttons, **Then** I see a "Record NDE" button
5. **Given** the weld detail modal is open for a weld that has NDE recorded, **When** I view the action buttons, **Then** I see NO action buttons (workflow complete)
6. **Given** the weld detail modal is open, **When** I tap the close button or backdrop, **Then** the modal closes and I return to the weld log table
7. **Given** the weld detail modal is open, **When** I press the Escape key, **Then** the modal closes
8. **Given** a weld has null/missing data (e.g., no welder assigned, no NDE date), **When** I view the detail modal, **Then** empty fields display "-" instead of blank or error states
9. **Given** I am viewing the mobile weld log, **When** I tap on the Drawing Number link within a row, **Then** the drawing detail page opens (modal does NOT open)

---

### User Story 3 - Update Field Weld Milestones from Mobile (Priority: P2)

As a foreman on mobile, I need to update field weld milestones (Fit-Up, Weld Made) from the weld detail modal so that I can track weld progress in the field without returning to the drawing table on desktop, with the same milestone interception pattern that triggers welder assignment when Weld Made is checked.

**Why this priority**: This is P2 because it depends on P0 and P1 (simplified table + detail modal). It provides a **new location** for milestone updates that already exist on the drawing table, giving field users quick access to update welds without navigating through the drawing hierarchy.

**Independent Test**: Can be fully tested by opening a weld detail modal on mobile, tapping "Update Weld", checking milestone checkboxes, verifying that checking "Weld Made" triggers the welder assignment dialog (not a direct milestone update).

**Acceptance Scenarios**:

1. **Given** the weld detail modal is open for a weld not yet made, **When** I tap the "Update Weld" button, **Then** the UpdateWeldDialog opens with checkboxes for Fit-Up and Weld Made milestones
2. **Given** the UpdateWeldDialog is open, **When** I check only the Fit-Up checkbox and save, **Then** the Fit-Up milestone is updated directly via useUpdateMilestone hook, the dialog closes, and the detail modal refreshes
3. **Given** the UpdateWeldDialog is open, **When** I check the Weld Made checkbox for the first time and save, **Then** the UpdateWeldDialog AND WeldDetailModal close, and the WelderAssignDialog opens (milestone interception)
4. **Given** the WelderAssignDialog is open after Weld Made interception, **When** I assign a welder and date, **Then** the system atomically updates: field_welds.welder_id, field_welds.date_welded, Fit-Up milestone (30%), and Weld Made milestone (70%)
5. **Given** I have saved a welder assignment, **When** the dialog closes, **Then** I return to the weld log table and the table refreshes with updated data
6. **Given** the UpdateWeldDialog is open, **When** I uncheck a previously checked milestone and save, **Then** the milestone is updated directly (no interception)

---

### User Story 4 - Record NDE Results from Mobile Detail Modal (Priority: P3)

As a quality inspector on mobile, I need to record NDE results from the weld detail modal so that I can update weld inspection data immediately after completing field inspections without returning to desktop.

**Why this priority**: This is P3 because it depends on P0, P1, and P2 (simplified table + detail modal + milestone updates). It completes the mobile weld workflow by adding NDE recording capability.

**Independent Test**: Can be fully tested by opening a weld detail modal for a completed weld on mobile, tapping "Record NDE", entering NDE data (type, result, date, notes), saving, and verifying the weld log reflects the updated NDE result.

**Acceptance Scenarios**:

1. **Given** the weld detail modal is open for a weld that has been made, **When** I tap the "Record NDE" button, **Then** the WeldDetailModal closes and the NDEResultDialog opens (reusing existing component)
2. **Given** I have entered NDE information in the dialog, **When** I save the NDE result, **Then** the dialog closes and I return to the weld log table with updated NDE data
3. **Given** I save an NDE result, **When** I reopen the weld detail modal, **Then** the updated NDE information is displayed and NO action buttons appear (workflow complete)
4. **Given** the weld does not require NDE (nde_required = false), **When** I view the detail modal, **Then** the "Record NDE" button does not appear

---

### Edge Cases

- **What happens when a weld has no drawing number (orphaned weld)?** Display "-" in the Drawing Number column and disable the drawing link.
- **What happens when a user taps rapidly on multiple weld rows?** Prevent modal opening if already open (debounce or disabled state).
- **What happens when the device orientation changes (portrait ↔ landscape) while the detail modal is open?** Modal remains open and re-renders responsively.
- **How does the table handle very long weld IDs or drawing numbers on small screens?** Text truncates with ellipsis (...) and shows full text in detail modal.
- **What happens when network fails during NDE save or welder assignment?** Show error toast, keep modal open, allow retry (existing error handling pattern).
- **What happens when a weld has repair history (multiple repair welds)?** Detail modal shows original weld ID and repair relationship (if applicable).
- **How does sorting work on mobile vs desktop?** Sorting functionality remains identical - column headers clickable on both views.
- **What happens if user unchecks Weld Made after it was already checked?** UpdateWeldDialog allows unchecking (no interception), but this should be rare as useAssignWelder typically marks the milestone complete permanently.
- **What happens when 3 modals are stacked (WeldDetailModal → UpdateWeldDialog → WelderAssignDialog)?** Per user requirement, when WelderAssignDialog opens, both parent modals (UpdateWeldDialog and WeldDetailModal) automatically close (return to table on completion).

## Requirements *(mandatory)*

### Functional Requirements

**Mobile Table (≤1024px)**
- **FR-001**: System MUST display a simplified 3-column table (Weld ID, Drawing Number, Date Welded) when viewed on devices with screen width ≤1024px
- **FR-002**: System MUST prevent horizontal scrolling on mobile weld log table regardless of content length
- **FR-003**: System MUST make entire weld row tappable on mobile to open the detail modal (≥44px touch target)
- **FR-004**: Weld detail modal MUST NOT open when user taps the Drawing Number link (link navigation takes precedence via `stopPropagation`)

**Desktop Table (>1024px)**
- **FR-005**: System MUST display the existing 10-column table unchanged when viewed on devices with screen width >1024px
- **FR-006**: Desktop view MUST retain all existing functionality including inline action buttons (Assign Welder, Record NDE)

**WeldDetailModal (Read-Only View)**
- **FR-007**: System MUST open a weld detail modal when a user taps a weld row on mobile (screen width ≤1024px)
- **FR-008**: Weld detail modal MUST display all weld information in a single scrollable view with these sections: identification (weld ID, drawing, component), specifications (type, size, schedule, base metal, spec), welder info (assigned welder, date welded), NDE results (required, type, result, date, notes), metadata (area, system, test package), status and progress
- **FR-009**: System MUST display "-" for null or missing weld data fields in the detail modal
- **FR-010**: Weld detail modal MUST close when user taps close button, backdrop, or presses Escape key

**WeldDetailModal Action Buttons (Conditional)**
- **FR-011**: Weld detail modal MUST show "Update Weld" button when weld has NOT been made (no welder_id or date_welded)
- **FR-012**: Weld detail modal MUST show "Record NDE" button when weld HAS been made (welder_id AND date_welded present) but NDE NOT recorded (no nde_result)
- **FR-013**: Weld detail modal MUST show NO action buttons when weld has been made AND NDE has been recorded (workflow complete)

**UpdateWeldDialog (Milestone Editing)**
- **FR-014**: System MUST open UpdateWeldDialog when user taps "Update Weld" button in WeldDetailModal
- **FR-015**: UpdateWeldDialog MUST display checkboxes for Fit-Up and Weld Made milestones with current state reflected
- **FR-016**: UpdateWeldDialog MUST show current progress percentage and progress bar
- **FR-017**: UpdateWeldDialog MUST update milestones directly via useUpdateMilestone hook when Fit-Up only is changed
- **FR-018**: UpdateWeldDialog MUST intercept when Weld Made is checked for the FIRST TIME (defined as: current value in `component.current_milestones['Weld Made']` is `false`, `0`, or `null`) and trigger welder assignment dialog instead of direct milestone update (matches DrawingComponentTablePage pattern)
- **FR-019**: UpdateWeldDialog MUST allow unchecking milestones (no interception, direct update)

**Modal Closure Behavior**
- **FR-020**: System MUST close parent modals (UpdateWeldDialog AND WeldDetailModal) when child modal WelderAssignDialog opens
- **FR-021**: System MUST close WeldDetailModal when NDEResultDialog opens
- **FR-022**: System MUST return user to weld log table after WelderAssignDialog or NDEResultDialog completes successfully

**Welder Assignment (Reused Pattern)**
- **FR-023**: System MUST open WelderAssignDialog (existing component) when Weld Made is checked for first time in UpdateWeldDialog
- **FR-024**: WelderAssignDialog MUST use existing useAssignWelder hook which atomically updates: field_welds.welder_id, field_welds.date_welded, Fit-Up milestone (30%), Weld Made milestone (70%)

**NDE Recording (Reused Pattern)**
- **FR-025**: System MUST open NDEResultDialog (existing component) when "Record NDE" button is tapped in WeldDetailModal
- **FR-026**: NDEResultDialog MUST use existing useRecordNDE hook

**Data Refresh**
- **FR-027**: System MUST automatically refresh weld log table after successful mutations (welder assignment, NDE recording, milestone updates) via TanStack Query invalidation of `['field-welds']` query key

**Accessibility (WCAG 2.1 AA)**
- **FR-029**: Mobile weld row touch targets MUST be at least 44px in height
- **FR-030**: Weld detail modal action buttons (Update Weld, Record NDE, Close) MUST have touch targets at least 44px
- **FR-031**: UpdateWeldDialog checkboxes MUST have effective touch targets of at least 44px (including labels)
- **FR-032**: Mobile table rows MUST support keyboard navigation (Tab, Enter key)
- **FR-033**: All modals MUST trap focus and support Escape key to close
- **FR-034**: All interactive elements MUST have ARIA labels for screen readers

**Performance**
- **FR-035**: Mobile weld log table MUST render all visible rows in under 2 seconds for datasets up to 1,000 welds (measured from TanStack Query resolution to DOM paint completion via React DevTools Profiler `onRender` callback with `actualDuration` metric)
- **FR-036**: Weld detail modal MUST load and display all content in under 1 second on 3G mobile networks (simulated via Chrome DevTools Network Throttling: "Slow 3G" profile = 400Kbps down, 400Kbps up, 2000ms RTT)

### Key Entities *(include if feature involves data)*

- **Field Weld**: Represents a welded joint in the piping system. Key attributes include weld ID (identity_key), weld type (BW/SW/FW/TW), size, welder assignment, date welded, NDE results (required/type/result/date/notes), status (active/accepted/rejected), repair relationship (original_weld_id, is_repair). Related to Component, Drawing, Welder, and Metadata (Area, System, Test Package).

- **Weld Detail Modal State**: Represents the UI state for the detail modal. Key attributes include selected weld (EnrichedFieldWeld object), modal open/closed state, and child modal states (isUpdateDialogOpen, isWelderDialogOpen, isNDEDialogOpen).

- **Component Milestones**: Field weld components have progress milestones tracked in current_milestones JSONB field. Relevant milestones for field welds: Fit-Up (30%), Weld Made (70%), NDE Complete (if applicable). Milestone updates trigger progress recalculation via database function.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Mobile users can view the weld log without horizontal scrolling on devices with screen width ≤1024px
- **SC-002**: Mobile users can access full weld details within 1 tap (row click → modal opens)
- **SC-003**: Field supervisors can update milestones on mobile using the same interception pattern as DrawingComponentTablePage (Weld Made → welder assignment)
- **SC-004**: Field foremen can assign welders on mobile in under 30 seconds (same as desktop) with automatic table refresh (FR-027)
- **SC-005**: Field inspectors can record NDE on mobile in under 60 seconds (same as desktop) with automatic table refresh (FR-027)
- **SC-006**: Mobile weld log table renders all visible rows in under 2 seconds for datasets up to 1,000 welds
- **SC-007**: Touch targets for weld rows and modal buttons meet WCAG 2.1 AA accessibility standards (≥44px)
- **SC-008**: Desktop weld log functionality remains 100% unchanged (all 10 columns, inline actions, sorting, filtering)
- **SC-009**: Mobile users successfully complete weld lookup tasks on first attempt 90% of the time (no confusion from simplified view)
- **SC-010**: Zero reported issues of accidental modal opening when tapping drawing number links
- **SC-011**: Weld detail modal loads and displays all content in under 1 second on 3G mobile networks
- **SC-012**: Modal closure behavior works correctly (parent modals close when child modals open) in 100% of test cases
- **SC-013**: Milestone interception triggers welder assignment dialog in 100% of first-time Weld Made checks

## Design Reference

Complete design documentation available at:
- **Design Document**: `docs/plans/2025-11-02-mobile-weld-log-design.md`

Key design decisions:
- **Modal Management**: Independent modals with page state (matches DrawingComponentTablePage)
- **Milestone Interception**: Copy pattern from DrawingComponentTablePage.tsx lines 106-147
- **Button Logic**: Inline conditional rendering in WeldDetailModal
- **Mobile Table**: Conditional rendering with `isMobile` prop
- **Modal Closure**: Close parent modals when child modals open (user requirement)

## Notes

**Pattern Consistency**: This feature adds a **new location** for field weld updates (weld log table) that replicates the same milestone update patterns that already exist on the drawing/component table. The milestone interception logic (Weld Made → WelderAssignDialog) ensures consistent behavior across both UI locations.

**Reused Components**: This feature maximizes reuse of existing components (WelderAssignDialog, NDEResultDialog) and hooks (useAssignWelder, useRecordNDE, useUpdateMilestone) to maintain consistency and reduce code duplication.

**Desktop Unchanged**: Per user requirement, desktop view (>1024px) remains 100% unchanged. This is a mobile-only enhancement.
