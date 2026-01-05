# Feature Specification: Bulk Receive Selection Mode

**Feature Branch**: `034-bulk-receive-selection`
**Created**: 2025-12-12
**Status**: Draft
**Input**: Add a two-mode Components table interaction: default browse mode where rows open the detail modal, and an explicit selection mode (toggle in a persistent sticky bar) enabling full-row multi-select with shift-range selection and a bulk "Mark Received" milestone action.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse Components with Quick Details Access (Priority: P1)

A Project Manager or Field User browses the Components table to review component details. In the default browse mode, clicking any row immediately opens the component's detail modal, providing fast access to view information without extra clicks or buttons.

**Why this priority**: This is the most frequent interaction - users spend most of their time browsing and reviewing individual components. Fast detail access is essential for daily workflows.

**Independent Test**: Can be fully tested by clicking any component row and verifying the detail modal opens. Delivers immediate value by reducing clicks needed to view component information.

**Acceptance Scenarios**:

1. **Given** I am on the Components page in browse mode (default), **When** I click on any component row, **Then** the component detail modal opens showing that component's information
2. **Given** I am on the Components page in browse mode, **When** I look at the table, **Then** I do not see any checkboxes or selection indicators
3. **Given** I am on the Components page in browse mode, **When** I look at the table rows, **Then** I do not see any Actions button/column (details are accessed via row click)

---

### User Story 2 - Enter Selection Mode for Bulk Operations (Priority: P1)

A Project Manager needs to mark multiple components as received. They toggle into Selection Mode using a clearly visible switch in a persistent bar, which enables checkboxes and changes row click behavior to selection instead of opening details.

**Why this priority**: This is the gateway to all bulk operations. Without a clear way to enter selection mode, users cannot perform any bulk actions.

**Independent Test**: Can be fully tested by toggling the Selection Mode switch on/off and verifying the UI changes appropriately. Delivers value by clearly separating browse and selection behaviors.

**Acceptance Scenarios**:

1. **Given** I am on the Components page, **When** the page loads, **Then** I see a persistent selection bar (always visible, even with 0 selections)
2. **Given** the selection bar is visible, **When** Selection Mode is OFF (default), **Then** I see a toggle/switch to enable Selection Mode
3. **Given** Selection Mode is OFF, **When** I toggle Selection Mode ON, **Then** checkboxes appear on all component rows
4. **Given** Selection Mode is ON with components selected, **When** I toggle Selection Mode OFF, **Then** all selections are cleared and checkboxes are hidden
5. **Given** Selection Mode is ON, **When** I look at the table header, **Then** I see a "Select All" checkbox option

---

### User Story 3 - Select Multiple Components Individually (Priority: P2)

A Field User in Selection Mode clicks on individual component rows to select them for a bulk action. Each click toggles that row's selection state without affecting other selections.

**Why this priority**: Individual selection is the foundation for bulk actions. While not as critical as the mode toggle itself, it's required before any bulk operation can occur.

**Independent Test**: Can be fully tested by entering Selection Mode, clicking multiple rows, and verifying each toggles independently. Delivers value by enabling precise multi-selection.

**Acceptance Scenarios**:

1. **Given** Selection Mode is ON, **When** I click on an unselected component row, **Then** that row becomes selected (visually indicated)
2. **Given** Selection Mode is ON with a selected row, **When** I click on that selected row again, **Then** the row becomes unselected
3. **Given** Selection Mode is ON with multiple rows selected, **When** I look at the selection bar, **Then** I see a count showing "N selected"
4. **Given** Selection Mode is ON with rows selected, **When** I click "Clear" in the selection bar, **Then** all selections are removed and count shows "0 selected"

---

### User Story 4 - Select Range of Components with Shift+Click (Priority: P2)

A Project Manager needs to select a large contiguous range of components efficiently. They click one row as an anchor, then Shift+click another row to select the entire range between them inclusive.

**Why this priority**: Range selection dramatically improves efficiency when dealing with many components. Essential for usability but builds on individual selection.

**Independent Test**: Can be fully tested by clicking one row, then Shift+clicking another row several positions away, and verifying the entire range is selected. Delivers significant time savings for large selections.

**Acceptance Scenarios**:

1. **Given** Selection Mode is ON, **When** I click row 5 (setting anchor), then Shift+click row 10, **Then** rows 5 through 10 (inclusive) are all selected
2. **Given** Selection Mode is ON, **When** I click row 10, then Shift+click row 5, **Then** rows 5 through 10 (inclusive) are all selected (works in both directions)
3. **Given** I have rows 5-10 selected via range, **When** I click row 15 (new anchor), then Shift+click row 20, **Then** rows 5-10 remain selected AND rows 15-20 are added to selection
4. **Given** Selection Mode is ON, **When** I perform a range select, **Then** the selection count updates immediately to reflect all newly selected rows

---

### User Story 5 - Bulk Mark Components as Received (Priority: P1)

A Project Manager has selected multiple components and wants to mark them all as "Received" in a single action. They click the "Mark Received" button, which updates all eligible selected components to the Receive milestone.

**Why this priority**: This is the primary business value of the feature - enabling bulk milestone updates instead of tedious one-by-one clicking.

**Independent Test**: Can be fully tested by selecting multiple components, clicking Mark Received, and verifying milestone status updates. Delivers core business value of bulk operations.

**Acceptance Scenarios**:

1. **Given** Selection Mode is ON with components selected, **When** I look at the selection bar, **Then** I see a "Mark Received" button
2. **Given** I have selected 5 components that are not yet received, **When** I click "Mark Received", **Then** all 5 components are updated to "Received" status
3. **Given** I have selected 3 components where 1 is already received, **When** I click "Mark Received", **Then** only the 2 non-received components are updated (already received is skipped)
4. **Given** the bulk receive operation completes, **When** I view the results, **Then** I see a summary showing counts: attempted, updated, skipped (already received), and failed (if any)
5. **Given** Selection Mode is ON with 0 components selected, **When** I look at the selection bar, **Then** the "Mark Received" button is disabled or hidden

---

### User Story 6 - Confirmation for Large Bulk Operations (Priority: P3)

A Project Manager has selected more than 10 components and clicks "Mark Received". Before executing, the system shows a confirmation dialog to prevent accidental mass updates.

**Why this priority**: This is a safety guardrail that prevents mistakes. Important but not blocking core functionality.

**Independent Test**: Can be fully tested by selecting >10 components, clicking Mark Received, and verifying confirmation appears. Delivers value by preventing accidental bulk changes.

**Acceptance Scenarios**:

1. **Given** I have exactly 10 or fewer components selected, **When** I click "Mark Received", **Then** the action executes immediately without confirmation
2. **Given** I have more than 10 components selected (e.g., 15), **When** I click "Mark Received", **Then** I see a confirmation dialog showing "Mark 15 components as Received?"
3. **Given** the confirmation dialog is showing, **When** I click "Cancel", **Then** no changes are made and I return to the selection state
4. **Given** the confirmation dialog is showing, **When** I click "Confirm", **Then** the bulk receive operation executes

---

### Edge Cases

- What happens when a component is already marked as Received? It is skipped (not updated again) and counted in the "skipped" summary.
- What happens if the network fails during bulk operation? Partial updates may occur; the summary shows which succeeded and which failed. Users can retry failed items.
- What happens if a user selects all components on the page? The operation processes all selected items; confirmation required if >10.
- What happens when switching pages/filters during selection mode? Selections are cleared when page content changes to prevent confusion about what's selected.
- How does Select All behave? It selects all currently visible/filtered components on the page.
- What happens if a row is clicked while a bulk operation is in progress? The operation continues; the UI should indicate loading state and prevent additional actions until complete.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide two distinct interaction modes for the Components table: Browse Mode (default) and Selection Mode
- **FR-002**: System MUST hide all checkboxes and selection UI when in Browse Mode
- **FR-003**: System MUST open the component detail modal when a row is clicked in Browse Mode
- **FR-004**: System MUST show a persistent selection bar that is always visible on the Components page
- **FR-005**: System MUST provide a toggle control in the selection bar to switch between Browse and Selection modes
- **FR-006**: System MUST clear all selections when switching from Selection Mode to Browse Mode
- **FR-007**: System MUST display checkboxes for each row when in Selection Mode
- **FR-008**: System MUST toggle row selection when a row is clicked in Selection Mode (not open details)
- **FR-009**: System MUST support Shift+click for range selection, selecting all rows between the anchor row and clicked row inclusive
- **FR-010**: System MUST display a count of selected items in the selection bar
- **FR-011**: System MUST provide a "Clear" action to deselect all selected components
- **FR-012**: System MUST provide a "Mark Received" action for bulk updating the Receive milestone
- **FR-013**: System MUST skip components that are already marked as Received when performing bulk receive
- **FR-014**: System MUST show a confirmation dialog before bulk operations affecting more than 10 components
- **FR-015**: System MUST display a summary of bulk operation results (attempted, updated, skipped, failed counts)
- **FR-016**: System MUST remove the per-row Actions button/column from the Components table
- **FR-017**: System MUST provide a "Select All" option to select all visible components when in Selection Mode

### Key Entities

- **Component**: The primary entity being selected and acted upon. Has a current milestone state including "Receive" status.
- **Milestone**: Specifically the "Receive" milestone, which can be set to indicate a component has been received (value: 100 = received, 0 = not received).
- **Selection State**: Tracks which components are currently selected, maintained only during Selection Mode.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can access component details with a single click (in Browse Mode), reducing clicks by 50% compared to using an Actions button
- **SC-002**: Users can select and mark 50+ components as Received in under 30 seconds using Shift+click range selection
- **SC-003**: Bulk receive operation processes all selected components with a clear success/failure summary visible to the user
- **SC-004**: Zero accidental bulk updates due to confirmation dialog for operations affecting >10 components
- **SC-005**: Users report clear understanding of current mode (browse vs selection) through visual indicators
- **SC-006**: All bulk operations complete without errors under normal network conditions

## Spec Completion Checklist *(Constitution v2.0.0)*

**Documentation Completeness:**
- [x] All user flows documented (mobile AND desktop where applicable)
- [x] All acceptance criteria written in testable "Given/When/Then" format
- [x] All edge cases listed with expected behavior

**Validation:**
- [x] No unresolved questions remain in `/clarify`
- [x] All dependencies on other features or systems listed explicitly

**Constitution Note:** Incomplete specs lead to vague plans and implementation churn. Exit criteria prevent premature planning.

## Assumptions

- The existing `update_component_milestone` RPC supports the Receive milestone and accepts a value of 100 to mark as received
- The component detail modal already exists and can be triggered programmatically
- The Components table already has infrastructure for row selection (checkboxes, selection state) that can be conditionally shown/hidden
- Mobile users can use the same selection mode; touch events work like clicks for selection
- The persistent selection bar does not interfere with existing table scrolling or sticky headers
