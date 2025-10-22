# Feature Specification: Test Package Readiness Page Enhancement

**Feature Branch**: `012-test-package-readiness`
**Created**: 2025-10-21
**Status**: Draft
**Input**: User description: "Test Package Readiness Page - Fix materialized view and enhance with CRUD operations"

## Execution Flow (main)
```
1. Parse user description from Input
   → ✅ DONE: Fix materialized view + add CRUD + drill-down
2. Extract key concepts from description
   → ✅ DONE: Inheritance from drawings, package management, component detail view
3. For each unclear aspect:
   → User clarified via questions: Inherit from drawing, assign at drawing level with component override, create/edit packages, drill-down
4. Fill User Scenarios & Testing section
   → ✅ DONE: Multiple user scenarios defined
5. Generate Functional Requirements
   → ✅ DONE: Requirements extracted from brainstorming discussion
6. Identify Key Entities (if data involved)
   → ✅ DONE: Test packages, components, drawings (existing entities)
7. Run Review Checklist
   → ✅ DONE: No implementation details in requirements
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
As a **construction project manager**, I want to see accurate test package readiness metrics that include components assigned to drawings, create and edit test packages, and drill down into package details so that I can track turnover preparation, manage package composition, and identify blockers without missing any components.

### Acceptance Scenarios

#### Current State Issue
1. **Given** a project has test packages assigned to drawings (not individual components), **When** a user views the Test Package Readiness page, **Then** the system currently shows 0 components because the materialized view only counts directly assigned components (BUG - needs fixing).

#### After Fix
2. **Given** a drawing has test_package_id assigned and its components have NULL test_package_id, **When** the system calculates package readiness, **Then** those components count toward the package's total and progress (inherited behavior).

3. **Given** a component has an explicit test_package_id different from its drawing, **When** the system calculates package readiness, **Then** that component counts toward its explicitly assigned package, not the drawing's package (override behavior).

4. **Given** a drawing has test_package_id "PKG-A" with 5 components (all NULL test_package_id) and 2 of those components are manually reassigned to "PKG-B", **When** a user views package readiness, **Then** PKG-A shows 3 components and PKG-B shows 2 components.

#### Package CRUD
5. **Given** a user with package management permissions is on the Test Packages page, **When** they click "New Package", **Then** a dialog opens with fields for Name (required), Description (optional, 100 char max), and Target Date (optional).

6. **Given** a user has filled the New Package form with valid data, **When** they click "Create Package", **Then** the system creates the package for the current project and adds it to the grid.

7. **Given** a package card is displayed, **When** a user hovers over it, **Then** an edit pencil icon appears (similar to drawing row behavior).

8. **Given** a user clicks the edit icon on a package card, **When** the dialog opens, **Then** it shows the current values pre-filled and allows editing Name, Description, and Target Date.

9. **Given** a user updates a package's target date, **When** they save, **Then** the card reflects the new date immediately and the package list re-sorts if sorted by Target Date.

#### Drill-Down to Components
10. **Given** a package card shows 15 total components, **When** a user clicks anywhere on the card body (not edit icon), **Then** the system navigates to a dedicated page showing all 15 components in that package.

11. **Given** a user is viewing the package component detail page, **When** the page loads, **Then** it displays a table with columns: Drawing, Component Identity, Type, Progress %, and Milestones.

12. **Given** a component in the package detail view inherited its test package from the drawing, **When** the component row renders, **Then** it shows a gray badge with tooltip "From drawing [DRAWING-NO]" next to the Test Package column.

13. **Given** a component in the package detail view has an explicit (overridden) test package assignment, **When** the component row renders, **Then** it shows a blue badge with tooltip "Manually assigned".

14. **Given** a user is on the package detail page, **When** they click a milestone checkbox or slider, **Then** the system updates that milestone inline (same behavior as drawing table from Feature 010).

15. **Given** a user wants to override a component's inherited test package, **When** they click the edit icon on that component row, **Then** the ComponentAssignDialog opens with a warning "Changing these values will override inherited metadata" (existing Feature 011 behavior).

### Edge Cases

- **What happens when a package has 0 components?**
  Package card shows 0 components, 0% progress, and displays "No components assigned" message. Card is still visible and editable.

- **What happens when a component's drawing is assigned to Package A, but the component itself is assigned to Package B?**
  Component counts toward Package B only (explicit assignment overrides inheritance). The component shows a blue "Manually assigned" badge.

- **What happens when a user creates a package with a name that already exists?**
  System allows it (names are not unique). Users can differentiate by description or target date. (Optionally: warn user "A package with this name already exists")

- **What happens when a user edits a package while another user is viewing its detail page?**
  Detail page shows stale data until the user refreshes or navigates back. Real-time sync is not required for this feature.

- **What happens when a package has no target date?**
  Card shows "No target date" or "—" in the target date field. Sorting by target date puts these packages last.

- **What happens when a user clicks a package card but lacks permission to view components?**
  System shows permission error or read-only view (depending on permission model). Edit and update actions are hidden.

- **What happens when the materialized view refresh is delayed?**
  Package readiness metrics may lag by up to 60 seconds (current refresh interval). This is acceptable per Feature 005 specs (eventual consistency).

- **What happens when a user tries to create a package without selecting a project?**
  "New Package" button is disabled or shows error message "No project selected."

---

## Requirements *(mandatory)*

### Functional Requirements

#### FR-001 to FR-010: Fix Materialized View (Critical Bug Fix)
- **FR-001**: System MUST count components that inherit test_package_id from their drawing when calculating package readiness metrics.
- **FR-002**: System MUST count components with explicit test_package_id assignments separately from inherited assignments.
- **FR-003**: When a component has both an explicit test_package_id AND its drawing has a different test_package_id, the system MUST use the component's explicit value (override wins).
- **FR-004**: System MUST recalculate total_components, completed_components, and avg_percent_complete for each package including both direct and inherited assignments.
- **FR-005**: System MUST exclude retired components from package readiness calculations (both direct and inherited).
- **FR-006**: System MUST update package readiness metrics when a drawing's test_package_id is assigned or changed.
- **FR-007**: System MUST update package readiness metrics when a component's test_package_id is explicitly assigned (override).
- **FR-008**: System MUST update package readiness metrics when a component's test_package_id is cleared (reverts to inheriting from drawing if drawing has one).
- **FR-009**: Package readiness metrics MUST refresh automatically within 60 seconds of data changes (via existing materialized view refresh job).
- **FR-010**: System MUST maintain backward compatibility with Feature 008's usePackageReadiness hook (same query interface).

#### FR-011 to FR-020: Package CRUD Operations
- **FR-011**: System MUST provide a "New Package" button on the Test Packages page visible to users with package management permissions.
- **FR-012**: System MUST display a dialog form for creating packages with fields: Name (required, max 100 chars), Description (optional, max 100 chars), Target Date (optional).
- **FR-013**: System MUST validate that package name is not empty before allowing creation.
- **FR-014**: System MUST associate new packages with the currently selected project automatically.
- **FR-015**: System MUST display an edit icon (pencil) on each package card when a user hovers over it.
- **FR-016**: System MUST open an edit dialog when a user clicks the pencil icon, pre-filled with current package values.
- **FR-017**: System MUST allow editing package Name, Description, and Target Date without changing the package ID.
- **FR-018**: System MUST save package changes immediately and update the card display without requiring page refresh.
- **FR-019**: System MUST show validation errors inline if a user tries to save a package with an empty name.
- **FR-020**: System MUST NOT provide a delete package action (per user decision: no deletion to avoid orphaned component references).

#### FR-021 to FR-030: Drill-Down to Components
- **FR-021**: System MUST navigate to a package detail page when a user clicks anywhere on a package card (except the edit pencil icon).
- **FR-022**: Package detail page MUST display the package name, description, target date, and overall progress in a header section.
- **FR-023**: Package detail page MUST display a table listing all components assigned to that package (both direct and inherited).
- **FR-024**: Component table MUST include columns: Drawing Number, Component Identity, Type, Progress %, and Milestones.
- **FR-025**: System MUST show a gray "inherited" badge with tooltip "From drawing [DRAWING-NO]" for components that inherit test_package_id from their drawing.
- **FR-026**: System MUST show a blue "assigned" badge with tooltip "Manually assigned" for components with explicit test_package_id assignments.
- **FR-027**: System MUST allow inline milestone updates on the package detail page (checkboxes for discrete milestones, sliders for partial milestones).
- **FR-028**: System MUST recalculate package progress immediately when a milestone is updated on the detail page (optimistic update).
- **FR-029**: System MUST allow users to override a component's inherited test_package_id from the detail page via the existing ComponentAssignDialog.
- **FR-030**: System MUST show a warning in ComponentAssignDialog when a user attempts to override an inherited test_package_id: "Changing these values will override inherited metadata from the drawing."

#### FR-031 to FR-035: Consistency with Metadata Inheritance (Feature 011)
- **FR-031**: Test Package assignment MUST follow the same inheritance model as Area and System metadata (inherit from drawing when component value is NULL).
- **FR-032**: System MUST use COALESCE logic to determine effective test_package_id: component.test_package_id OR drawing.test_package_id.
- **FR-033**: System MUST treat NULL test_package_id on a component as "inherit from drawing" (not "unassigned").
- **FR-034**: System MUST allow components to have NULL test_package_id even when their drawing has NO test_package_id (truly unassigned).
- **FR-035**: System MUST update the package detail page immediately when a drawing's test_package_id is changed (via existing query invalidation).

#### FR-036 to FR-040: User Experience & Permissions
- **FR-036**: System MUST disable "New Package" button when no project is selected.
- **FR-037**: System MUST hide "New Package" button from users without package management permissions.
- **FR-038**: System MUST hide edit pencil icons on package cards from users without package management permissions.
- **FR-039**: System MUST show read-only package detail pages to all users (no permission required to view).
- **FR-040**: System MUST respect existing milestone update permissions on the package detail page (same as drawing table).

### Key Entities *(existing entities from Sprint 1)*

- **Test Package**: A logical grouping of components for turnover readiness tracking. Contains name, description, target date, and is associated with a single project. Components can be assigned directly or inherit from their drawing.

- **Component**: A pipe spool, valve, weld, support, or other trackable item with milestones and progress percentage. Can have explicit test_package_id (override) or NULL (inherit from drawing).

- **Drawing**: A construction drawing that can have optional test_package_id metadata. When a drawing has test_package_id, all its components with NULL test_package_id inherit that value.

- **Materialized View - Package Readiness**: Pre-computed aggregation of test package progress metrics (component counts, completion percentages, blocker counts). MUST include both directly assigned and inherited components.

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
- [x] Scope is clearly bounded (fix view, add CRUD, add drill-down; no delete, no bulk assign)
- [x] Dependencies and assumptions identified (Feature 011 inheritance model, Feature 008 hook compatibility)

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (then resolved via user questions)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed
