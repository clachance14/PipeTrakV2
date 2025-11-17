# Feature Specification: Add Unplanned Field Welds

**Feature Branch**: `028-add-unplanned-welds`
**Created**: 2025-11-17
**Status**: Draft
**Input**: User description: "Add ability to create unplanned field welds to the weld log"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create Single Unplanned Weld (Priority: P1)

A foreman discovers during construction walkdown that a weld not shown on any drawing needs to be made. They need to add this weld to the weld log immediately so it can be tracked, assigned to a welder, and inspected.

**Why this priority**: This is the core functionality. Without it, unplanned welds cannot be tracked at all, forcing workarounds like creating one-row CSV files or manual database entries.

**Independent Test**: Can be fully tested by logging in as a foreman, clicking "Add Weld", filling the minimal form (drawing, weld type, size, spec), and verifying the new weld appears in the weld log table with a unique weld number.

**Acceptance Scenarios**:

1. **Given** a foreman is viewing the weld log page, **When** they click "Add Weld", **Then** a dialog opens with a pre-generated weld number
2. **Given** the add weld dialog is open, **When** the foreman selects a drawing, weld type, size, and spec, **Then** the submit button becomes enabled
3. **Given** the foreman submits a valid weld form, **When** the weld is created successfully, **Then** the dialog closes, a success message appears, and the new weld appears in the weld log table
4. **Given** a weld is created, **When** viewing the weld in the table, **Then** it shows the assigned weld number, selected drawing, and entered specifications
5. **Given** a weld is created from a specific drawing, **When** viewing the weld details, **Then** it inherits the drawing's area, system, and test package metadata

---

### User Story 2 - Add Context Notes for Unplanned Welds (Priority: P2)

A PM needs to document why an unplanned weld was created (field change, client request, design modification) to maintain an audit trail and justify the change during project reviews.

**Why this priority**: Important for project documentation and audit compliance, but not blocking the core ability to track the weld itself. Can be added later if the initial implementation doesn't support it.

**Independent Test**: Can be tested by creating a weld with notes entered, then verifying the notes are saved and visible when viewing weld details.

**Acceptance Scenarios**:

1. **Given** the add weld dialog is open, **When** the user enters text in the notes field, **Then** the notes are saved with the weld record
2. **Given** a weld was created with notes, **When** viewing the weld details, **Then** the notes are displayed
3. **Given** the add weld dialog is open, **When** the user leaves notes blank, **Then** the weld is still created successfully (notes are optional)

---

### User Story 3 - Smart Drawing Search (Priority: P2)

A foreman creating an unplanned weld needs to quickly find the relevant drawing from hundreds of drawings in the project by typing part of the drawing number or title.

**Why this priority**: Improves user experience significantly but not blocking for MVP. Users could still scroll through a dropdown of all drawings, just slower.

**Independent Test**: Can be tested by opening the add weld dialog, typing a partial drawing number or title, and verifying that matching drawings appear in the dropdown.

**Acceptance Scenarios**:

1. **Given** the add weld dialog is open, **When** the user types into the drawing field, **Then** the dropdown filters to show only drawings matching the input (by number or title)
2. **Given** the user has typed a partial drawing number, **When** matching drawings appear, **Then** both the drawing number and title are visible in the results
3. **Given** the user selects a drawing from the filtered results, **When** the selection is made, **Then** the drawing field populates and metadata preview updates

---

### Edge Cases

- What happens when a user cancels the dialog after the weld number has been generated?
  - Generated number is abandoned (not reserved), allowing the same number to be used for the next weld creation attempt
- How does system handle duplicate weld numbers if two users create welds simultaneously?
  - Database transaction validates uniqueness; if conflict occurs, system generates a new number and retries
- What happens when the selected drawing is deleted between opening the dialog and submitting?
  - Form validation detects the missing drawing and shows an error: "Selected drawing no longer exists"
- How does system handle users who don't have permission trying to create a weld?
  - "Add Weld" button is hidden for users without permission (Viewer, Welder roles); if role changes mid-session and they somehow trigger creation, the database function rejects with permission error
- What happens when a user enters a spec that doesn't exist in the database?
  - Spec field is a dropdown showing only valid specs from the database, preventing invalid entries
- What happens when required fields are missing?
  - Submit button remains disabled until all required fields (drawing, weld type, size, spec) have values

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an "Add Weld" button on the weld log page visible only to users with permission (Owner, Admin, PM, Foreman, QC Inspector)
- **FR-002**: System MUST auto-generate a unique weld number when the "Add Weld" button is clicked
- **FR-003**: System MUST require selection of a drawing when creating an unplanned weld
- **FR-004**: System MUST provide a searchable/filterable drawing selector that matches on drawing number and title
- **FR-005**: System MUST require selection of weld type (BW, SW, FW, TW) when creating an unplanned weld
- **FR-006**: System MUST require entry of weld size when creating an unplanned weld
- **FR-007**: System MUST require selection of a valid spec from existing project specs when creating an unplanned weld
- **FR-008**: System MUST allow optional entry of schedule and base metal specifications
- **FR-009**: System MUST allow optional entry of notes explaining why the unplanned weld was created
- **FR-010**: System MUST inherit area, system, and test package metadata from the selected drawing
- **FR-011**: System MUST create both a component record and field_weld record atomically (both succeed or both fail)
- **FR-012**: System MUST validate weld number uniqueness within the project before creating the weld
- **FR-013**: System MUST prevent submission of the form until all required fields are filled
- **FR-014**: System MUST show a success notification and refresh the weld log table after successful creation
- **FR-015**: System MUST show an error message if weld creation fails
- **FR-016**: System MUST display the newly created weld in the weld log table immediately after creation
- **FR-017**: Generated weld numbers MUST be read-only in the creation dialog (not editable by user)
- **FR-018**: System MUST NOT include NDE required field in the creation flow (QC determines this later)
- **FR-019**: System MUST meet mobile accessibility requirements (touch targets ≥44px, responsive layout)
- **FR-020**: System MUST validate user permissions at both UI level (button visibility) and database level (function execution)

### Key Entities

- **Field Weld**: Represents a weld joint tracked in the system
  - Has a unique weld number within the project
  - Links to a drawing (required)
  - Has specifications (type, size, spec required; schedule, base_metal, notes optional)
  - Inherits metadata (area, system, test_package) from the drawing
  - Created by a specific user with timestamp
  - Has milestone progress tracking (Fit-up, Weld Complete, Accepted)

- **Component**: Parent entity for all trackable items including field welds
  - Every field weld has exactly one component record
  - Stores the identity key (weld number)
  - Stores progress template reference
  - Stores inherited metadata (area_id, system_id, test_package_id)
  - Stores milestone completion state and percent complete

- **Drawing**: Engineering drawing document that welds reference
  - Has a drawing number and title
  - Has metadata (area, system, test package) that welds inherit
  - Used as the organizational unit for weld numbers

- **Spec**: Weld specification code from project standards
  - Represents valid welding specifications for the project
  - Must be selected from existing specs (not free text)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users with appropriate permissions can create an unplanned weld in under 60 seconds from clicking "Add Weld" to seeing it in the table
- **SC-002**: 100% of created unplanned welds have unique weld numbers within their project (no duplicates)
- **SC-003**: 100% of created unplanned welds correctly inherit metadata (area, system, test package) from their selected drawing
- **SC-004**: Users can find and select the correct drawing in under 10 seconds using the smart search feature
- **SC-005**: Zero orphaned records created (every successful creation must create both component and field_weld, or neither)
- **SC-006**: Mobile users can complete the weld creation flow with touch targets meeting WCAG 2.1 AA standards (≥44px)
- **SC-007**: Users without permission (Viewer, Welder) cannot access weld creation functionality (button hidden and backend rejects attempts)
- **SC-008**: 95% of weld creation attempts complete successfully on first try without validation errors (excluding intentional user cancellation)

## Spec Completion Checklist *(Constitution v2.0.0)*

**Documentation Completeness:**
- [x] All user flows documented (mobile AND desktop where applicable)
- [x] All acceptance criteria written in testable "Given/When/Then" format
- [x] All edge cases listed with expected behavior

**Validation:**
- [x] No unresolved questions remain in `/clarify` (or clarifications marked as deferred with justification)
- [x] All dependencies on other features or systems listed explicitly

**Constitution Note:** Incomplete specs lead to vague plans and implementation churn. Exit criteria prevent premature planning.
