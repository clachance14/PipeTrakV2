# Feature Specification: Drawing & Component Metadata Assignment UI

**Feature Branch**: `011-the-drawing-component`
**Created**: 2025-10-21
**Status**: Draft
**Input**: User description: "The Drawing & Component Metadata Assignment UI"

## Execution Flow (main)
```
1. Parse user description from Input
   → Feature: UI for assigning Areas, Systems, and Test Packages to drawings and components
2. Extract key concepts from description
   → Actors: Project Managers, Project Controls, Foremen
   → Actions: Assign metadata to drawings, inherit to components, override component values
   → Data: Drawings, Components, Areas, Systems, Test Packages
   → Constraints: Preserve existing component assignments, support bulk operations
3. For each unclear aspect:
   → [RESOLVED via user clarification: inheritance behavior, UI patterns, bulk operations]
4. Fill User Scenarios & Testing section
   → Primary flows: inline edit, bulk assign, inheritance, override, description editing
5. Generate Functional Requirements
   → 58 functional requirements identified (FR-001 to FR-058)
6. Identify Key Entities
   → Drawings with metadata, Components with inheritance tracking
7. Run Review Checklist
   → No [NEEDS CLARIFICATION] markers
   → No implementation details
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

As a **Project Controls person**, I need to assign organizational metadata (Areas, Systems, and Test Packages) to entire drawings so that all unassigned components on those drawings automatically inherit the assignments. When I import a new batch of drawings with hundreds of components, I want to quickly categorize them by assigning metadata at the drawing level rather than individually updating each component.

As a **Project Manager**, I need the flexibility to override inherited assignments for specific components when field conditions require it. For example, a valve might be physically installed in a different area than the rest of its drawing, so I need to change just that component's area assignment while leaving others inherited from the drawing.

### Acceptance Scenarios

#### Scenario 1: Inline Edit Single Drawing
1. **Given** I am viewing the drawing table with 50 drawings
2. **When** I hover over the "Area" column for drawing P-001
3. **Then** I see a small pencil icon appear
4. **When** I click the pencil icon
5. **Then** a dialog opens showing "Assign Metadata to Drawing: P-001"
6. **When** I select "Area 100" from the Area dropdown and click "Assign Metadata"
7. **Then** the dialog closes and I see a success message showing "12 components inherited Area 100, 11 components kept existing assignments"
8. **And** the drawing row now displays "Area 100" in the Area column
9. **And** when I expand the drawing, I see 12 component rows with gray "(inherited)" badges next to Area 100

#### Scenario 2: Bulk Assign Multiple Drawings
1. **Given** I am viewing the drawing table
2. **When** I click the "Select Mode" toggle button
3. **Then** checkboxes appear on the left side of each drawing row
4. **When** I select 5 drawings by clicking their checkboxes
5. **Then** a bulk actions toolbar appears at the top showing "5 drawings selected"
6. **When** I click "Assign Metadata" in the toolbar
7. **Then** a dialog opens showing the list of 5 selected drawings
8. **When** I select "HVAC-01" from the System dropdown and leave Area as "No change"
9. **And** I click "Assign to 5 Drawings"
10. **Then** the system updates all 5 drawings with System = HVAC-01
11. **And** unassigned components on those drawings inherit System = HVAC-01
12. **And** I see a success toast with the total inheritance summary

#### Scenario 3: Component Inherits from Drawing
1. **Given** drawing P-001 has Area = Area 100, System = HVAC-01, Test Package = TP-2025-001
2. **And** component VBALU-001 on P-001 has no area, system, or package assigned
3. **When** I expand drawing P-001 and view the component row
4. **Then** I see VBALU-001 displaying:
   - "Area 100 (inherited)" with a gray badge
   - "HVAC-01 (inherited)" with a gray badge
   - "TP-2025-001 (inherited)" with a gray badge
5. **When** I hover over the "(inherited)" badge
6. **Then** I see a tooltip: "From drawing P-001"

#### Scenario 4: Override Component Assignment
1. **Given** component VBALU-001 currently inherits Area 100 from drawing P-001
2. **When** I click the pencil icon on the component row
3. **Then** the component assignment dialog opens showing:
   - Area dropdown with "Area 100 (inherited from drawing)" pre-selected
   - A warning: "Changing these values will override the drawing's assignments for this component only"
4. **When** I select "Area 200" from the dropdown
5. **And** I click "Update Component"
6. **Then** the component's Area changes to Area 200
7. **And** the badge changes from gray "(inherited)" to blue "(assigned)"
8. **And** when I hover, the tooltip shows "Manually assigned"

#### Scenario 5: Clear Component Assignments
1. **Given** component ME-55402 has manually assigned Area = Area 200, System = HC-05
2. **When** I open the component assignment dialog
3. **And** I check the box "Clear all assignments (set to None)"
4. **And** I click "Update Component"
5. **Then** the component's Area, System, and Test Package are all set to NULL
6. **And** if the drawing has assignments, the component will inherit them (showing gray badges)
7. **And** if the drawing has no assignments, the component shows "—" in those columns

#### Scenario 6: Bulk Assignment with "No Change" Option
1. **Given** I have selected 10 drawings in select mode
2. **And** drawing P-001 has Area = Area 100, drawing P-002 has Area = Area 200
3. **When** I open the bulk assignment dialog
4. **And** I set System = HVAC-01 and leave Area = "No change" and Package = "No change"
5. **And** I click "Assign to 10 Drawings"
6. **Then** all 10 drawings get System = HVAC-01
7. **And** P-001 keeps Area = Area 100, P-002 keeps Area = Area 200 (no change)
8. **And** unassigned components on those drawings inherit System = HVAC-01

#### Scenario 7: Drawing with No Components
1. **Given** drawing P-999 exists but has no components assigned to it
2. **When** I assign Area = Area 100 to P-999
3. **Then** the drawing's area_id is updated to Area 100
4. **And** no components are affected (inheritance summary shows "0 components inherited")
5. **And** the drawing row displays "Area 100" and "0 items"

#### Scenario 8: Drawing with All Components Already Assigned
1. **Given** drawing P-005 has 15 components, all with manually assigned areas
2. **When** I assign Area = Area 100 to drawing P-005
3. **Then** the drawing's area_id is updated to Area 100
4. **And** all 15 components keep their existing area assignments (no override)
5. **And** inheritance summary shows "0 components inherited, 15 components kept existing assignments"

#### Scenario 9: Edit Metadata Description Inline
1. **Given** I am a project manager viewing the drawing assignment dialog
2. **And** I open the Area dropdown to select an area for drawing P-001
3. **When** I hover over "Area 100" in the dropdown list
4. **Then** I see the area name "Area 100" on the first line
5. **And** I see the description "North wing - Level 2" in smaller gray text on the second line
6. **And** I see a small pencil icon [✎] on the right side of the option
7. **When** I click the pencil icon
8. **Then** a quick-edit popover opens with the title "Edit Description: Area 100"
9. **And** I see a text input field pre-filled with "North wing - Level 2"
10. **And** I see a character counter showing "20/100 characters"
11. **When** I change the description to "North processing unit - Level 2"
12. **And** I click "Save"
13. **Then** the popover closes
14. **And** the dropdown refreshes showing the updated description
15. **And** I see a success toast: "Area 100 description updated"
16. **And** the change is logged in the audit trail
17. **When** I later open the Areas management page (Feature 007)
18. **Then** I see the updated description there as well

### Edge Cases

#### Mixed Component Assignments
- **What happens when** a drawing has 10 components: 5 unassigned, 3 with Area 100, 2 with Area 200, and I assign the drawing to Area 300?
  - **Expected**: Drawing gets Area 300. The 5 unassigned components inherit Area 300. The 3 with Area 100 and 2 with Area 200 keep their existing assignments. Inheritance summary: "5 components inherited Area 300, 5 components kept existing assignments."

#### Partial Field Updates
- **What happens when** I bulk-assign System = HVAC-01 to 20 drawings using "No change" for Area and Package?
  - **Expected**: Only the system_id field is updated for all 20 drawings. Components inherit system_id only if they have system_id IS NULL. Existing area_id and test_package_id values are untouched for both drawings and components.

#### Concurrent Updates
- **What happens when** two users assign different areas to the same drawing simultaneously?
  - **Expected**: Database transaction isolation ensures last write wins. Both updates are recorded in audit log with timestamps. The final state reflects whichever update completed last. No data corruption occurs.

#### Component Assignment After Drawing Assignment
- **What happens when** a drawing has Area = Area 100, a component inherits it, then I manually change the component to Area 200?
  - **Expected**: Component's area_id is explicitly set to Area 200. The badge changes from gray "(inherited)" to blue "(assigned)". If I later clear the component's assignment (set to NULL), it will re-inherit Area 100 from the drawing.

#### Re-assignment of Drawing
- **What happens when** a drawing has Area = Area 100, 10 components inherited it, then I change the drawing to Area 200?
  - **Expected**: The 10 components that currently show Area 100 as inherited will NOT automatically update to Area 200. Inheritance only happens during the initial assignment when component values are NULL. To propagate the new value, components must first be cleared (set to NULL), then they will inherit Area 200.

#### Clear Drawing Assignment
- **What happens when** I set a drawing's Area to "None" (NULL)?
  - **Expected**: The drawing's area_id is set to NULL. Components that inherited the previous value keep it (they are explicitly assigned during inheritance). Future components added to the drawing will have no area to inherit unless manually assigned.

#### Bulk Select Limit
- **What happens when** I try to select 100 drawings for bulk assignment?
  - **Expected**: The system allows selection but shows a warning: "You've selected 100 drawings. Bulk operations are limited to 50 drawings at a time for performance. Please reduce your selection." The "Assign Metadata" button is disabled until selection count ≤ 50.

#### Permission Denied
- **What happens when** a user without admin/project manager permissions tries to assign drawing metadata?
  - **Expected**: The inline edit pencil icons are hidden. The "Select Mode" button is disabled or hidden. If the user somehow accesses the dialog (e.g., via URL manipulation), the database RLS policy rejects the update with error: "Permission denied."

#### Component Without Drawing
- **What happens when** a component exists with drawing_id IS NULL (orphaned component)?
  - **Expected**: The component cannot inherit any metadata from a drawing. It must be manually assigned. In the component list, it shows "—" for all metadata fields. The component can still be assigned via the component assignment dialog.

---

## Requirements

### Functional Requirements

#### Drawing Assignment UI
- **FR-001**: Users with admin or project manager permissions MUST be able to assign Area, System, and Test Package to drawings
- **FR-002**: System MUST provide inline edit functionality via a pencil icon that appears on hover for each metadata column in drawing rows
- **FR-003**: Clicking the inline edit pencil icon MUST open a dialog for assigning metadata to that single drawing
- **FR-004**: System MUST display the drawing number and title in the assignment dialog header
- **FR-005**: Assignment dialog MUST provide three dropdown selectors for Area, System, and Test Package
- **FR-006**: Each dropdown MUST show options: "No change" (for bulk only), "None" (clear assignment), and all available entities from the project

#### Bulk Assignment
- **FR-007**: System MUST provide a "Select Mode" toggle that enables multi-select functionality for drawings
- **FR-008**: When Select Mode is active, system MUST display checkboxes on the left side of each drawing row
- **FR-009**: System MUST provide a "Select All" checkbox in the table header that selects all visible drawings
- **FR-010**: System MUST display a bulk actions toolbar when one or more drawings are selected
- **FR-011**: Bulk actions toolbar MUST show the count of selected drawings (e.g., "5 drawings selected")
- **FR-012**: Bulk actions toolbar MUST provide an "Assign Metadata" button and a "Clear Selection" button
- **FR-013**: Clicking "Assign Metadata" in bulk mode MUST open the assignment dialog showing a list of selected drawings (up to first 10 listed)
- **FR-014**: Bulk assignment dialog MUST limit operations to 50 drawings maximum for performance reasons
- **FR-015**: Bulk assignment dialog MUST provide "No change" as the default option for each dropdown
- **FR-016**: "No change" option MUST preserve existing values when bulk-assigning (only update the fields explicitly changed)

#### Selection State Management
- **FR-017**: System MUST persist selected drawing IDs in the browser URL using query parameter format (e.g., `?selected=uuid1,uuid2`)
- **FR-018**: System MUST restore selection state when user navigates back to the page or refreshes
- **FR-019**: System MUST clear selection when user disables Select Mode
- **FR-020**: System MUST deselect individual drawings when user unchecks their checkboxes

#### Inheritance Behavior
- **FR-021**: When a drawing is assigned Area/System/Test Package, system MUST identify all components on that drawing where the corresponding field is NULL
- **FR-022**: System MUST automatically update those NULL component fields with the drawing's values (inheritance)
- **FR-023**: System MUST NOT override existing component assignments during drawing assignment (preserve manually assigned values)
- **FR-024**: System MUST execute inheritance as an atomic database transaction (all-or-nothing)
- **FR-025**: System MUST return an inheritance summary showing: drawing updated, count of components inherited, count of components kept existing assignments

#### Component Display - Inheritance Indicators
- **FR-026**: Component rows MUST visually distinguish inherited values from manually assigned values
- **FR-027**: Inherited values MUST display with a gray badge labeled "(inherited)"
- **FR-028**: Manually assigned values MUST display with a blue badge labeled "(assigned)"
- **FR-029**: System MUST provide tooltips on hover: "From drawing [drawing_no]" for inherited, "Manually assigned" for assigned
- **FR-030**: System MUST determine inheritance by comparing component value with drawing value (if equal and drawing has value, it's inherited)

#### Component Assignment Override
- **FR-031**: Users MUST be able to override inherited values by clicking a pencil icon on the component row
- **FR-032**: Component assignment dialog MUST show current values with notation "(inherited from drawing)" if applicable
- **FR-033**: Component assignment dialog MUST display a warning: "Changing these values will override the drawing's assignments for this component only"
- **FR-034**: Component assignment dialog MUST provide a checkbox: "Clear all assignments (set to None)"
- **FR-035**: When "Clear all assignments" is checked, system MUST set area_id, system_id, and test_package_id to NULL for that component
- **FR-036**: After clearing a component's assignments, if the drawing has values, system MUST re-apply inheritance (component displays inherited badges again)

#### Feedback and Notifications
- **FR-037**: System MUST display a success toast notification after successful drawing assignment
- **FR-038**: Success toast MUST show: drawing number, field(s) changed, inheritance summary (X inherited, Y kept existing)
- **FR-039**: System MUST display error toast if assignment fails with clear error message (e.g., "Permission denied", "Database error")
- **FR-040**: System MUST show loading indicators during assignment operations

#### Data Integrity
- **FR-041**: System MUST validate that selected Area/System/Test Package exists in the same project as the drawing
- **FR-042**: System MUST enforce referential integrity (foreign key constraints) for area_id, system_id, test_package_id
- **FR-043**: System MUST allow NULL values for area_id, system_id, test_package_id (optional fields)
- **FR-044**: System MUST create audit log entries for all drawing and component metadata assignments

#### Performance
- **FR-045**: Single drawing assignment MUST complete within 1 second for drawings with up to 200 components
- **FR-046**: Bulk assignment of 50 drawings MUST complete within 10 seconds
- **FR-047**: System MUST provide optimistic UI updates (immediate visual feedback before server confirmation)
- **FR-048**: System MUST rollback optimistic updates if server operation fails

#### Metadata Descriptions
- **FR-049**: Areas, systems, and test packages MUST support an optional description field (max 100 characters)
- **FR-050**: Dropdown selectors MUST display descriptions below the option name in smaller gray text
- **FR-051**: System MUST truncate descriptions longer than 50 characters with "..." in dropdown display
- **FR-052**: Dropdown options MUST show a pencil icon [✎] for users with admin or project manager permissions
- **FR-053**: Clicking the pencil icon MUST open a quick-edit popover for updating the description
- **FR-054**: Quick-edit popover MUST show current description, character counter (X/100), and Save/Cancel buttons
- **FR-055**: Description updates MUST refresh the dropdown immediately without closing it
- **FR-056**: Description changes MUST be logged in the audit trail with user_id and timestamp
- **FR-057**: Dropdown search/filter MUST match against both name AND description text
- **FR-058**: If no description exists, system MUST display option name only (single line, no empty space)

### Key Entities

#### Drawing with Metadata
Represents a construction drawing that has been assigned organizational categorization:
- **Drawing Number**: Unique normalized identifier (e.g., "P-001")
- **Drawing Title**: Optional descriptive name
- **Area Assignment**: Optional reference to a physical area (e.g., "Area 100", "B-68")
- **System Assignment**: Optional reference to a functional system (e.g., "HVAC-01", "Process Water")
- **Test Package Assignment**: Optional reference to a test package (e.g., "TP-2025-001")
- **Component Count**: Number of components on this drawing
- **Inheritance Cascade**: When assigned, unassigned components automatically receive these values

#### Component with Inheritance Tracking
Represents a trackable item that can inherit metadata from its parent drawing or have manually assigned values:
- **Identity Key**: Unique identifier (commodity code, size, sequence)
- **Drawing Reference**: Link to parent drawing
- **Area Assignment**: Inherited from drawing OR manually assigned
- **System Assignment**: Inherited from drawing OR manually assigned
- **Test Package Assignment**: Inherited from drawing OR manually assigned
- **Assignment Source**: Indicator of whether each field is inherited or manually assigned
- **Override Capability**: User can change inherited values to manual assignments at any time

#### Metadata Entities (Existing)
Already implemented in Feature 007, enhanced with descriptions in Feature 011:
- **Area**: Physical zone within project
  - Name: "Area 100", "B-68" (required, unique within project)
  - Description: "North wing - Level 2" (optional, max 100 chars)
  - Purpose: Help users differentiate similar areas
- **System**: Functional system
  - Name: "HVAC-01", "Process Water" (required, unique within project)
  - Description: "Cooling water distribution" (optional, max 100 chars)
  - Purpose: Clarify system boundaries and function
- **Test Package**: Grouping for turnover readiness
  - Name: "TP-2025-001" (required, unique within project)
  - Description: "Q1 2025 mechanical completion" (optional, max 100 chars)
  - Purpose: Document package scope and timeline

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain (all resolved via user clarification)
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable (timing requirements, inheritance counts)
- [x] Scope is clearly bounded (drawing and component assignment only, no creation of areas/systems/packages)
- [x] Dependencies and assumptions identified (Feature 007 complete, database schema exists)

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted (assignment, inheritance, bulk operations, override)
- [x] Ambiguities marked (then resolved via user Q&A)
- [x] User scenarios defined (9 acceptance scenarios + 9 edge cases)
- [x] Requirements generated (58 functional requirements)
- [x] Entities identified (Drawing with metadata, Component with inheritance tracking, Metadata entities with descriptions)
- [x] Review checklist passed

---

## Dependencies & Assumptions

### Dependencies
- Feature 007 (Component Tracking & Lifecycle Management) MUST be complete
  - Areas, systems, and test_packages tables exist with RLS policies
  - Areas, systems, and test_packages tables MUST have description column (VARCHAR(100), nullable)
  - Drawings table has area_id, system_id, test_package_id columns (Migration 00022)
  - Components table has the same metadata columns
  - Feature 007 management pages MUST support editing description field
- Existing hooks MUST be functional:
  - useAreas(projectId) - fetch all areas (including description)
  - useSystems(projectId) - fetch all systems (including description)
  - useTestPackages(projectId) - fetch all test packages (including description)
  - useDrawingsWithProgress(projectId) - fetch drawings with joined metadata
- Permission system MUST enforce can_manage_team or admin/owner/project_manager roles
- URL state management MUST support query parameters (?selected=uuid1,uuid2)

### Assumptions
- Users understand the concept of inheritance (components automatically get drawing values)
- Project Controls/Managers have appropriate permissions (can_manage_team)
- Areas, systems, and test packages are already created (this feature does NOT create them)
- Drawings and components are already imported (this feature does NOT import them)
- Database supports atomic transactions for inheritance operations
- Up to 50 drawings can be bulk-assigned within performance limits (<10s)
- Most projects have <500 drawings (performance target for list rendering)
- Descriptions are optional (UI gracefully handles missing/null values with single-line display)

### Out of Scope
- Creating new Areas, Systems, or Test Packages (Feature 007 already provides this)
- Importing drawings or components (Feature 009 CSV import already provides this)
- Changing drawing numbers, titles, or other drawing attributes
- Deleting or retiring drawings
- Bulk component assignment (this feature focuses on drawing-level assignment)
- Mobile app implementation (responsive web only, desktop-first)
- Automatic re-inheritance when drawing metadata changes (components keep old values)

---

## Success Criteria

This feature is considered complete when:

1. **Inline Edit**: Users can click pencil icon on drawing row to assign metadata to single drawing
2. **Bulk Assignment**: Users can select multiple drawings (up to 50) and bulk-assign metadata via dialog
3. **Inheritance**: When drawing assigned, unassigned components automatically inherit values (verified in database)
4. **Preservation**: Components with existing assignments keep their values (no unintended overwrites)
5. **Visual Indicators**: Component rows show gray "(inherited)" vs blue "(assigned)" badges with tooltips
6. **Override**: Users can change individual component assignments via component dialog, overriding inheritance
7. **Clear Assignments**: Users can clear component assignments (set to NULL), allowing re-inheritance
8. **State Persistence**: Selected drawings persist in URL, restored on page refresh
9. **Permissions**: Only admin/project manager/project controls users can assign metadata (enforced by RLS)
10. **Performance**: Single drawing assignment <1s, bulk 50 drawings <10s
11. **Audit Trail**: All assignments recorded in audit_log table with user_id and timestamp
12. **Feedback**: Success toasts show inheritance summary (X inherited, Y kept existing)
13. **Error Handling**: Failed operations show clear error messages with retry option
14. **Test Coverage**: ≥70% overall, ≥80% for new hooks, ≥60% for UI components
15. **Integration Tests**: All 9 acceptance scenarios pass automated testing (including Scenario 9: description editing)
16. **Description Display**: Dropdown options show descriptions below names in gray text (truncated at 50 chars with "...")
17. **Description Editing**: Users can edit descriptions inline from dropdowns via pencil icon (admin/PM only)
18. **Description Search**: Dropdown search matches both name and description text

---
