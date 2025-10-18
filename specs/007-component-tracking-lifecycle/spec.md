# Feature Specification: Component Tracking & Lifecycle Management

**Feature Branch**: `007-component-tracking-lifecycle`
**Created**: 2025-10-16
**Status**: Draft
**Input**: User description: "Component Tracking & Lifecycle Management"

---

## User Scenarios & Testing

### Primary User Story

A Project Controls person or Project Manager sets up the organizational structure for a construction project in PipeTrak by creating areas (physical zones like "Area 100", "B-68"), systems (process systems like "HVAC-01", "Process Water"), and test packages. Components and drawings are imported from fully-engineered IFC (Issued For Construction) drawing packages via bulk import (Feature 008 - not part of this feature). After import, the Project Controls person assigns components to areas, systems, and test packages as needed.

A foreman arrives at the construction site with the project already loaded in PipeTrak. All components from the IFC drawings are already in the system. The foreman's crew installs components throughout the day. As work progresses, the foreman views the component list (filtering by area, system, or drawing), selects components, and updates milestone progress by clicking milestone buttons (Receive, Fabricate, Install, Connect, Punch, Test, Restore, etc.). The system automatically calculates and displays real-time progress percentages based on weighted milestone completion. The foreman can see which components are complete, in progress, or not started.

### Acceptance Scenarios

#### Admin: Area & System Management
1. **Given** a Project Controls person with project access, **When** they navigate to project setup, **Then** they can create areas with unique names (e.g., "Area 100", "B-68")
2. **Given** an existing area, **When** an admin tries to create a duplicate area name within the same project, **Then** the system prevents creation and shows a validation error
3. **Given** a Project Controls person with project access, **When** they create a system (e.g., "HVAC-01", "HC-05"), **Then** the system is available for assignment to components
4. **Given** an area with assigned components, **When** an admin attempts to delete the area, **Then** the system warns that components will be unassigned (area_id → NULL)
5. **Given** a Project Controls person, **When** they edit an area name, **Then** all components assigned to that area reflect the updated name

#### Admin: Test Package Management
6. **Given** a Project Manager with project access, **When** they create a test package with name "TP-2025-001" and target date "2025-12-15", **Then** the test package is available for component assignment
7. **Given** an existing test package, **When** an admin assigns 50 components to it, **Then** those components show the test package assignment in the component list

#### Admin: Component Assignment
8. **Given** imported components without area/system assignments, **When** a Project Controls person bulk-assigns them to "Area 100" and "HVAC-01", **Then** the assignments are stored and components are filterable by those values
9. **Given** a component assigned to Area 100, **When** an admin reassigns it to Area 200, **Then** the component's area_id updates and filtering reflects the change

#### Admin: Drawing Retirement
10. **Given** a drawing "P-001-Rev-A" with components assigned, **When** an admin retires the drawing with reason "Superseded by Rev-B", **Then** the drawing is marked retired but components retain their drawing reference
11. **Given** a retired drawing, **When** viewing the drawing list, **Then** retired drawings are visually indicated or filtered out by default

#### Foreman: Component List & Filtering
12. **Given** a foreman with project access, **When** they view the components page, **Then** they see a table with columns: Identity, Type, Drawing, Area, System, Package, Progress %, Last Updated
13. **Given** a project with 500 components, **When** a foreman filters by area "Area 100", **Then** only components in Area 100 are displayed
14. **Given** the component list, **When** a foreman filters by component type "Spool" and progress "≥50%", **Then** only spools with 50%+ completion are shown
15. **Given** the component list, **When** a foreman searches for identity "SP-001", **Then** the matching component is displayed
16. **Given** the component list, **When** a foreman filters by system "HVAC-01", **Then** only components assigned to HVAC-01 are shown

#### Foreman: Milestone Tracking
17. **Given** a Spool component with 0% complete, **When** a foreman clicks the "Receive" milestone button (weight 5%), **Then** the milestone toggles to complete and percent_complete updates to 5.00%
18. **Given** a Spool with "Receive" complete (5%), **When** a foreman clicks "Erect" (weight 40%), **Then** percent_complete updates to 45.00%
19. **Given** a Spool with "Receive" and "Erect" complete (45%), **When** a foreman un-clicks "Receive" (rollback), **Then** percent_complete updates to 40.00%
20. **Given** a Field Weld component, **When** a foreman completes "Weld Made" milestone (60% weight), **Then** the system prompts for welder stencil and stores it in milestone metadata
21. **Given** a Threaded Pipe component (hybrid workflow), **When** a foreman updates "Fabricate" milestone to 85%, **Then** the system calculates weighted contribution (16% × 0.85 = 13.6%) and updates percent_complete accordingly
22. **Given** a foreman completes "Test" milestone before "Install", **When** the milestone is saved, **Then** the system allows completion but logs the event with timestamp (out-of-sequence allowed)

#### Foreman: Component Detail View
23. **Given** a foreman clicks on a component row in the list, **When** the detail view opens, **Then** they see all milestones with visual indicators (checked/unchecked), component attributes, and milestone event history
24. **Given** a component detail view, **When** a foreman toggles a milestone, **Then** the percent_complete updates in real-time without page reload

#### Permissions & Access
25. **Given** a foreman with "can_update_milestones" permission, **When** they view a component, **Then** milestone buttons are clickable
26. **Given** a viewer role (no can_update_milestones permission), **When** they view a component, **Then** milestone buttons are read-only (disabled)
27. **Given** an admin with "can_manage_team" permission, **When** they access project setup, **Then** they can create/edit/delete areas, systems, and test packages

### Edge Cases

- **What happens when an admin deletes a system that has 200 components assigned?** The components' system_id is set to NULL, components remain in project, and admin sees a warning before deletion confirming the unassignment
- **How does the system handle concurrent milestone updates by multiple foremen?** The system supports concurrent updates via database transactions; last write wins, but all milestone events are logged with user_id and timestamp for audit trail
- **What happens when a milestone is completed out of sequence (e.g., Test before Install)?** The system allows completion (field reality may differ from ideal sequence) and logs the milestone event with timestamp. No blocking, audit trail preserved
- **How does the system handle partial percentage milestones with invalid values (e.g., 105%)?** Validation enforces 0-100 range for partial milestones, shows error "Percentage must be between 0 and 100"
- **What happens when filtering the component list with no matches?** System displays "No components found" message with option to clear filters
- **How does the system handle components imported without area/system assignments?** Components display as "Unassigned" in area/system columns, admin can assign them post-import via component detail view or bulk assignment UI

---

## Requirements

### Functional Requirements

#### Admin: Area & System Setup
- **FR-001**: Project Controls users MUST be able to create areas with unique names within a project
- **FR-002**: Project Controls users MUST be able to create systems with unique names within a project
- **FR-003**: ~~System MUST prevent duplicate area names within the same project~~ (CONSOLIDATED into FR-039)
- **FR-004**: ~~System MUST prevent duplicate system names within the same project~~ (CONSOLIDATED into FR-039)
- **FR-005**: Admin users MUST be able to edit area and system names and descriptions
- **FR-006**: System MUST allow deletion of areas/systems with warning if components are assigned
- **FR-007**: When area/system is deleted, system MUST set component area_id/system_id to NULL (unassign, not cascade delete)

#### Admin: Test Package Management
- **FR-008**: Project Manager users MUST be able to create test packages with name, description, and target date
- **FR-009**: System MUST allow editing of test package details
- **FR-010**: System MUST prevent duplicate test package names within a project
- **FR-011**: System MUST allow deletion of test packages with warning if components are assigned

#### Admin: Component Assignment
- **FR-012**: Admin users MUST be able to assign/reassign components to areas, systems, and test packages
- **FR-013**: System MUST allow NULL values for area_id, system_id, test_package_id (components can be unassigned)
- **FR-014**: System MUST validate that assigned area/system/test package exists in the project

#### Admin: Drawing Management
- **FR-015**: Admin users MUST be able to retire drawings with a required retirement reason
- **FR-016**: System MUST mark retired drawings as is_retired=true
- **FR-017**: Retired drawings MUST remain in system but be visually indicated or filtered by default
- **FR-018**: Components assigned to retired drawings MUST retain their drawing reference (no cascade delete)

#### Foreman: Component List & Filtering
- **FR-019**: Foremen MUST be able to view a filterable/searchable list of all components in a project
- **FR-020**: Component list MUST display: identity, type, drawing number, area, system, test package, progress %, last updated timestamp
- **FR-021**: System MUST support filtering components by: area, system, type, progress range, test package, drawing
- **FR-022**: System MUST support searching components by identity key (partial match, case-insensitive)
- **FR-023**: Component list MUST load <2 seconds for projects with up to 10,000 components (NFR-001)
- **FR-024**: System MUST virtualize component list for projects >1,000 components using @tanstack/react-virtual (per research.md decision - renders only visible DOM elements for performance)

#### Foreman: Milestone Tracking
- **FR-025**: Users with "can_update_milestones" permission MUST be able to toggle milestone completion
- **FR-026**: System MUST recalculate percent_complete automatically when milestones change using weighted formula from progress template
- **FR-027**: System MUST support discrete milestones (boolean: complete/incomplete)
- **FR-028**: System MUST support partial percentage milestones (0-100) for hybrid workflows (e.g., Threaded Pipe)
- **FR-029**: System MUST validate partial milestone percentages (0-100 range)
- **FR-030**: System MUST record milestone events with user_id, timestamp, action ∈ {complete, rollback, update}, value, previous_value. Action values: 'complete' (false→true or 0→>0), 'rollback' (true→false or >0→0), 'update' (partial % change)
- **FR-031**: System MUST update component last_updated_at and last_updated_by when milestones change
- **FR-032**: Users MUST be able to rollback milestones (un-click completed milestone)
- **FR-033**: System MUST allow out-of-sequence milestone completion (no dependency enforcement, but audit trail preserved)

#### Foreman: Component Detail View
- **FR-034**: Foremen MUST be able to view component detail page showing all milestones, attributes, and milestone event history
- **FR-035**: Component detail view MUST show milestone completion status with visual indicators (checked/unchecked or progress bar for hybrid)
- **FR-036**: Component detail view MUST show real-time percent_complete calculation
- **FR-037**: Component detail view MUST display all component attributes (spec, material, size, etc.) from JSONB attributes field
- **FR-038**: Component detail view MUST show milestone event history with user, timestamp, action, and value

#### Validation & Data Integrity
- **FR-039**: System MUST enforce unique constraint on area/system/test package names within a project (prevents duplicate names via database unique indexes idx_areas_project_name, idx_systems_project_name, idx_test_packages_project_name)
- **FR-040**: System MUST enforce referential integrity (drawing_id, area_id, system_id, test_package_id must exist or be NULL)
- **FR-041**: System MUST use database triggers to auto-calculate percent_complete on milestone changes (calculate_component_percent function from Sprint 1)
- **FR-042**: System MUST prevent negative or >100 percent_complete values

#### Permissions
- **FR-043**: Only users with "can_update_milestones" permission MUST be able to modify component milestones
- **FR-044**: All users with project access MUST be able to view components (read-only for users without can_update_milestones)
- **FR-045**: Only users with admin/owner/project_manager roles MUST be able to create/edit/delete areas, systems, test packages
- **FR-046**: System MUST enforce Row Level Security policies based on organization membership (multi-tenant isolation)

### Non-Functional Requirements

- **NFR-001**: Component list page MUST load <2 seconds for projects with up to 10,000 components
- **NFR-002**: Milestone toggle MUST provide visual feedback within 200ms
- **NFR-003**: Percent_complete calculation MUST complete within 100ms for single component updates
- **NFR-004**: System MUST support concurrent milestone updates by multiple foremen without data loss (database transaction isolation)
- **NFR-005**: Component list filtering MUST return results within 500ms
- **NFR-006**: Mobile responsiveness: Component list and milestone buttons MUST be usable on tablets (landscape mode, minimum 768px width)
- **NFR-007**: Component detail view MUST render all milestones without pagination (max 15 milestones per component type)

### Key Entities

- **Area**: Represents a physical zone within a construction project (e.g., "Area 100", "B-68"). Contains name (unique per project), description, project reference. Created by Project Controls, used to organize components geographically.

- **System**: Represents a process or functional system (e.g., "HVAC-01", "Process Water", "HC-05"). Contains name (unique per project), description, project reference. Created by Project Controls, used to organize components by functional group.

- **Drawing**: Represents a construction drawing document imported from IFC package. Contains drawing number (normalized for matching), raw drawing number (as entered), title, revision, retirement status and reason. Drawings are project-scoped, imported via Feature 008. Admin can retire drawings post-import.

- **Component**: Represents a trackable construction item (pipe spool, valve, support, weld, instrument, etc.) imported from IFC drawings. Contains identity key (type-specific unique identifier), component type, drawing reference, optional area/system/test package assignments, progress template reference, current milestone states (JSONB), calculated percent complete, attributes (JSONB for flexible metadata), audit fields (created_by, last_updated_by, timestamps). Foremen update milestone progress.

- **Progress Template**: Defines the milestone workflow for a component type. Contains component type, version, workflow type (discrete/quantity/hybrid), and milestones configuration (array of milestone objects with name, weight, order, optional flags). Templates created in Sprint 1, referenced by components. Read-only in this feature.

- **Milestone Event**: Audit trail record for milestone changes. Contains component reference, milestone name, action (complete/rollback/update), value (for partial %), previous value, user reference, timestamp, and optional metadata (e.g., welder stencil for "Weld Made" milestone). Created automatically when foreman toggles milestone.

- **Test Package**: Represents a group of components scheduled for testing together. Contains name (unique per project), description, target date, project reference. Created by Project Manager, components assigned post-import.

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
- [x] Success criteria are measurable (NFR timing requirements, validation rules)
- [x] Scope is clearly bounded (NO manual component creation, NO drawing import, NO bulk import)
- [x] Dependencies identified (Sprint 1 database foundation complete, Feature 008 for import)

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted (areas, systems, test packages, component viewing, milestone tracking)
- [x] Ambiguities marked (none - workflow clarified: admin setup + foreman tracking)
- [x] User scenarios defined (27 acceptance scenarios + 6 edge cases)
- [x] Requirements generated (46 functional, 7 non-functional)
- [x] Entities identified (7 key entities with relationships)
- [x] Review checklist passed

---

## Dependencies & Assumptions

### Dependencies
- Sprint 1 database foundation complete (14 tables, RLS policies, triggers, calculate_component_percent function)
- TanStack Query hooks implemented (useDrawings, useComponents, useAreas, useSystems, useTestPackages)
- Permission system functional (can_update_milestones permission enforced via RLS)
- ProjectContext provides current project_id
- AuthContext provides current user_id

### Assumptions
- **Components are imported via Feature 008 (bulk import), NOT manually created in Feature 007**
- **Drawings are imported via Feature 008, Feature 007 only provides retirement UI**
- Users understand their project's milestone workflows (Receive → Erect → Connect → Test → Restore varies by type)
- Field personnel (foremen) have "can_update_milestones" permission assigned by admins
- Project Controls/Managers have admin roles with "can_manage_team" permission
- Test packages exist in project or are created by admin before component assignment
- Component types match progress template types (spool, field_weld, support, valve, instrument, etc.) from Sprint 1

### Out of Scope (Explicitly Deferred)

**Deferred to Feature 008 (Import Workflows):**
- Bulk component import from IFC takeoff spreadsheets
- Bulk drawing import
- Weld log import
- Component creation (manual entry - rare edge case, if needed at all)
- Drawing creation (manual entry)

**Deferred to Future Features:**
- Welder verification workflow UI (Feature 009)
- Field weld inspection (QC) workflow (Feature 010)
- Needs Review dashboard and resolution (Feature 011)
- Test package readiness dashboard (Feature 012)
- Drawing progress dashboard (Feature 012)
- Audit log viewer (Feature 013)
- Bulk component assignment UI (nice-to-have, can be manual in Feature 007)

**Post-MVP:**
- Mobile app (native iOS/Android)
- Offline mode
- Automated drawing import from CAD systems
- Component duplication/cloning

---

## Success Criteria

This feature is considered complete when:

1. **Admin Setup**: Project Controls can create, edit, and delete areas, systems, and test packages with proper validation
2. **Component Assignment**: Admins can assign/reassign components to areas, systems, test packages post-import
3. **Drawing Retirement**: Admins can retire drawings with reasons, retired drawings visually indicated
4. **Component List**: Foremen can view, filter, and search components with <2s load time for 10k components
5. **Milestone Tracking**: Foremen can toggle milestones (discrete and partial %) and see real-time percent_complete updates
6. **Component Detail**: Foremen can view component details with all milestones, attributes, and event history
7. **Permissions**: RLS policies enforce can_update_milestones and admin permissions correctly
8. **Data Integrity**: Referential integrity maintained, percent_complete auto-calculated, concurrent updates handled
9. **Test Coverage**: ≥70% overall coverage, ≥80% for hooks, ≥60% for UI components
10. **Validation**: All 27 acceptance scenarios pass manual testing
11. **Performance**: All NFR timing requirements met (<2s list load, <200ms milestone toggle, <100ms calculation, <500ms filtering)

---
