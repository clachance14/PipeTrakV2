# Feature Specification: Component Metadata Editing from Drawings View

**Feature Branch**: `020-component-metadata-editing`
**Created**: 2025-10-28
**Status**: Draft
**Input**: User description: "I want to create a feature based on this plan '/home/clachance14/projects/PipeTrak_V2/docs/plans/2025-10-28-component-metadata-editing-design.md'"

## Clarifications

### Session 2025-10-29

- Q: How should milestone history be sourced for display in the component modal? → A: Query milestone events table with component_id filter (normalized, separate table)
- Q: What is the distribution of the 1000 metadata entities mentioned in SC-009? → A: 1000 of each type (3000 total metadata entities)
- Q: What mechanism should detect concurrent updates when another user modifies the component? → A: Version field (optimistic locking) - increment on each update, compare on save
- Q: What happens to newly created metadata entries when the user clicks Cancel on the modal? → A: New metadata persists (committed immediately on creation), component assignment cancelled
- Q: How should large dropdowns (1000+ options) remain usable for metadata selection? → A: Searchable combobox with virtualization (filter-as-you-type, only render visible items)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View and Edit Component Metadata (Priority: P1)

As a project manager, I need to click on any component in the drawings table and edit its Area, System, and Test Package assignments so that I can correct metadata after CSV import or reassign components that span multiple organizational groupings.

**Why this priority**: Core functionality that enables metadata correction, which directly impacts progress reporting accuracy and project organization. Without this, users cannot fix misassigned components after bulk import.

**Independent Test**: Can be fully tested by clicking a component row, modifying one or more metadata fields in the modal, saving, and verifying the table updates. Delivers immediate value for metadata correction.

**Acceptance Scenarios**:

1. **Given** I am logged in as an Admin or Manager, **When** I click on a component row in the drawings table, **Then** a modal opens showing the component's current Area, System, and Test Package assignments in editable searchable combobox fields
2. **Given** the metadata edit modal is open, **When** I type to search or select a different Area from the combobox, **Then** the Area field updates to show my selection
3. **Given** I am selecting metadata from a project with 1000+ entries in a category, **When** I type a search term in the combobox, **Then** the dropdown filters to show only matching options and renders instantly without lag
4. **Given** I have changed one or more metadata fields, **When** I click Save, **Then** the modal closes and the component row in the table immediately reflects the new metadata values
5. **Given** I have made changes to metadata fields, **When** I click Cancel, **Then** the modal closes without saving and the table shows the original values
6. **Given** I am viewing a component with metadata assignments, **When** I reload the page after saving changes, **Then** the updated metadata persists and displays correctly

---

### User Story 2 - Create New Metadata Entries (Priority: P2)

As a project manager, I need to create new Areas, Systems, or Test Packages directly from the metadata edit modal when the one I need doesn't exist yet, so that I can assign components without leaving my current workflow.

**Why this priority**: Streamlines the workflow by eliminating context switching. Users can correct metadata and create new organizational groupings in a single interaction.

**Independent Test**: Can be tested by opening the metadata modal, selecting "Create new..." in any dropdown, entering a name, and verifying it's created and auto-selected. Works independently of editing existing metadata.

**Acceptance Scenarios**:

1. **Given** the metadata edit modal is open, **When** I click on the Area dropdown and select "Create new Area...", **Then** the dropdown changes to show an inline input field with Create and Cancel buttons
2. **Given** I am in the "Create new Area" inline mode, **When** I type a unique area name and click Create (or press Enter), **Then** the new area is created and automatically selected in the Area dropdown
3. **Given** I am creating a new area, **When** I type a name that already exists in the project, **Then** an error message displays saying "Area '[name]' already exists" and the create action is prevented
4. **Given** I am in the "Create new Area" inline mode, **When** I click Cancel or press Escape, **Then** the dropdown returns to showing the existing options without creating anything
5. **Given** I have just created a new Area, **When** I open another component's metadata modal in the same session, **Then** the newly created Area appears in the dropdown options
6. **Given** I have created a new Area and selected it, **When** I click Cancel on the modal without saving, **Then** the new Area persists in the database for future use but is not assigned to the component

---

### User Story 3 - Clear Metadata Assignments (Priority: P3)

As a project manager, I need to remove Area, System, or Test Package assignments from components when they were assigned incorrectly, so that components can return to an unassigned state until proper assignments are determined.

**Why this priority**: Supports data quality by allowing users to explicitly clear incorrect assignments rather than leaving bad data. Lower priority because reassigning to correct values (P1) is more common.

**Independent Test**: Can be tested by selecting the "(None)" option in any metadata dropdown, saving, and verifying the field is cleared in the table. Delivers value for removing incorrect assignments.

**Acceptance Scenarios**:

1. **Given** a component has an Area assignment, **When** I open the metadata modal and select "(None)" from the Area dropdown, **Then** the Area field shows "(None)" as selected
2. **Given** I have selected "(None)" for one or more metadata fields, **When** I click Save, **Then** the modal closes and the component row shows empty/blank values for the cleared fields
3. **Given** a component has all three metadata fields assigned, **When** I clear all three by selecting "(None)" for each and save, **Then** the component displays with no Area, System, or Test Package in the table

---

### User Story 4 - View-Only Access for Non-Admin Users (Priority: P2)

As a field user (non-admin role), I need to view component metadata and milestone history in a modal when I click on component rows, but without the ability to edit, so that I can see detailed information without risk of accidental changes.

**Why this priority**: Ensures appropriate permission controls while maintaining transparency. Field users need to see component details but shouldn't modify organizational metadata.

**Independent Test**: Can be tested by logging in as a Field User role, clicking a component row, and verifying the modal shows milestone history and metadata in read-only format without edit controls.

**Acceptance Scenarios**:

1. **Given** I am logged in as a Field User, **When** I click on a component row in the drawings table, **Then** a modal opens showing the component's current metadata values and milestone history
2. **Given** I am a Field User viewing the component modal, **When** I examine the metadata section, **Then** I see the current Area, System, and Test Package displayed as static text (not editable dropdowns)
3. **Given** I am a Field User viewing the component modal, **When** I view the milestone history section, **Then** I can see all milestone events in read-only format
4. **Given** I am a Field User viewing the component modal, **When** I look for Save/Edit buttons, **Then** no editing controls are visible

---

### Edge Cases

- What happens when two users try to edit the same component's metadata simultaneously?
  - Second user to save sees an error: "Component was updated by another user. Please refresh." Data refetches to show current state.

- How does the system handle network failures during save?
  - Optimistic update shows change immediately, but if server request fails, the change reverts and an error toast appears: "Failed to save changes. Retry?" with retry button.

- What happens if an Area/System/Test Package is deleted while a user has the modal open?
  - On save, validation error occurs. User sees toast: "Selected metadata no longer exists. Please refresh and try again."

- How does the system prevent creating duplicate metadata with different casing or whitespace?
  - Client-side validation trims whitespace and performs case-insensitive comparison before allowing creation. Shows error: "Area 'north wing' already exists (matches 'North Wing')".

- What happens when a user opens the modal, switches to another tab, then returns hours later to save?
  - On save, the system checks for conflicts. If data changed, shows error and refetches: "Component was updated. Please review current values and try again."

- How does keyboard navigation work when multiple comboboxes are open?
  - Only one combobox dropdown is open at a time. Tab key closes current dropdown and moves to next field. Escape closes dropdown without selecting.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow Admin and Manager users to click on any component row in the drawings table to open a metadata edit modal
- **FR-002**: System MUST display a modal showing the component's current Area, System, and Test Package assignments when a component row is clicked
- **FR-003**: System MUST provide searchable comboboxes with virtualization for editing Area, System, and Test Package assignments in the modal
- **FR-003a**: System MUST implement filter-as-you-type functionality that filters dropdown options based on user input
- **FR-003b**: System MUST use virtualization to render only visible dropdown items (preventing DOM bloat with 1000+ options)
- **FR-004**: System MUST populate each dropdown with all existing metadata options for the current project, sorted alphabetically
- **FR-005**: System MUST include a "(None)" option in each dropdown to allow clearing metadata assignments
- **FR-006**: System MUST include a "Create new..." option at the bottom of each dropdown to enable inline metadata creation
- **FR-007**: System MUST validate that new metadata names are unique (case-insensitive, trimmed) before creation
- **FR-008**: System MUST prevent creation of metadata entries with empty or whitespace-only names
- **FR-008a**: System MUST commit new metadata entries (Areas, Systems, Test Packages) to the database immediately upon creation, independent of component assignment
- **FR-009**: System MUST save metadata changes when the user clicks Save, updating the component record in the database
- **FR-010**: System MUST update the table row immediately upon save using optimistic updates for perceived performance
- **FR-011**: System MUST cancel changes and close the modal without saving when the user clicks Cancel
- **FR-012**: System MUST detect concurrent updates using optimistic locking (version field comparison) and show an error if another user modified the component during editing
- **FR-013**: System MUST display milestone history below the metadata edit form in read-only format
- **FR-013a**: System MUST query milestone events from the milestone_events table filtered by component_id, sorted by timestamp descending
- **FR-014**: System MUST show a view-only modal (no edit form) for non-admin users (Field User role)
- **FR-015**: System MUST enforce Row Level Security policies to prevent unauthorized metadata updates
- **FR-016**: System MUST revert optimistic updates and show error messages if server validation fails
- **FR-017**: System MUST support keyboard navigation (Tab, Enter, Escape, Arrow keys) for all modal interactions
- **FR-018**: System MUST trap focus within the modal and return focus to the component row on close

### Key Entities *(include if feature involves data)*

- **Component**: Represents a physical pipe component with identity (Drawing Number, Component Identity) and metadata assignments (Area, System, Test Package). Metadata fields are nullable and can be updated independently. Includes a version field (integer) that increments on each update to enable optimistic locking for concurrent edit detection.

- **Area**: Represents a physical or logical area of the construction site (e.g., "North Wing", "Area-2"). Components are assigned to Areas for organizational grouping and progress reporting.

- **System**: Represents a functional system (e.g., "Drain System", "HVAC"). Components are assigned to Systems for engineering and maintenance organization.

- **Test Package**: Represents a testing group used to organize commissioning and testing activities (e.g., "TP-11", "TP-12"). Components are assigned to Test Packages for test coordination and progress tracking.

- **Milestone Event**: Represents a milestone state change for a component (e.g., "Received", "Installed"). Stored in a normalized milestone_events table with component_id foreign key. Queried and displayed in read-only milestone history within the modal, sorted by timestamp descending.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Admin users can click a component row and see the metadata modal open in under 200 milliseconds
- **SC-002**: Metadata changes save and the table updates in under 1 second (including optimistic update feedback)
- **SC-003**: Users can complete a metadata reassignment task (open modal, change field, save) in under 15 seconds
- **SC-004**: 100% of component metadata edits by authorized users persist correctly across page reloads
- **SC-005**: Users can create new metadata entries and use them in assignments without leaving the modal workflow
- **SC-006**: Concurrent edit conflicts are detected and reported to users 100% of the time, preventing data loss
- **SC-007**: All modal interactions are fully accessible via keyboard navigation (Tab, Enter, Escape, Arrow keys)
- **SC-008**: Non-admin users cannot modify metadata (enforced by both UI controls and server-side RLS policies)
- **SC-009**: The feature maintains responsive performance with projects containing up to 1000 Areas, 1000 Systems, and 1000 Test Packages (3000 total metadata entities)
- **SC-010**: Duplicate metadata creation attempts are prevented 100% of the time with clear error messages
