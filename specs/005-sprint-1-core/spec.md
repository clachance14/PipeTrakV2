# Feature Specification: Sprint 1 - Core Foundation Database Expansion

**Feature Branch**: `005-sprint-1-core`
**Created**: 2025-10-14
**Status**: Draft
**Input**: User description: "Sprint 1: Core Foundation - Database Expansion (4 to 14 tables)"

## Execution Flow (main)
```
1. Parse user description from Input
   → Feature: Expand database from 4 to 14 tables for pipe tracking
2. Extract key concepts from description
   → Actors: Project managers, QC inspectors, welders, admins
   → Actions: Track components, manage drawings, record milestones, verify welders
   → Data: Components, drawings, areas, systems, test packages, progress templates, milestone events, welders, needs review items, audit logs
   → Constraints: Multi-tenant isolation, 1M+ component capacity, <100ms query performance
3. Unclear aspects marked with [NEEDS CLARIFICATION]
4. User Scenarios & Testing section filled
5. Functional Requirements generated (all testable)
6. Key Entities identified
7. Review Checklist status tracked below
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
As a project manager at a brownfield construction company, I need to track thousands of pipe components (spools, field welds, valves, supports, etc.) through their construction milestones (receive, install, test, etc.) so that I can monitor project progress, identify blockers, and generate readiness reports for test packages. Each component must have its progress calculated as a percentage based on which milestones are complete, and the system must prevent users from viewing components belonging to other organizations.

### Acceptance Scenarios

#### Data Management
1. **Given** an active project, **When** a user imports a takeoff spreadsheet with 500 components, **Then** the system creates drawings with normalized numbers, creates all components with their identity keys, and links them to the project
2. **Given** multiple components on the same drawing, **When** a user groups them by drawing number, **Then** the system shows all components for that drawing with their individual progress percentages
3. **Given** a component of type "spool", **When** the system applies the spool progress template, **Then** the component receives 6 milestones (Receive 5%, Erect 40%, Connect 40%, Punch 5%, Test 5%, Restore 5%)

#### Progress Tracking
4. **Given** a spool component at 0% complete, **When** a user marks "Receive" and "Erect" complete, **Then** the system calculates 45% progress (5% + 40%)
5. **Given** a threaded pipe component using hybrid workflow, **When** a user marks "Fabricate" at 75% complete, **Then** the system calculates 12% overall progress (16% × 0.75)
6. **Given** a field weld component, **When** a user marks "Weld Made" complete and assigns welder "JD42", **Then** the system records a milestone event with welder metadata

#### Multi-Tenant Isolation
7. **Given** two organizations (Org A and Org B) each with projects, **When** a user from Org A queries components, **Then** the system returns only Org A's components and blocks access to Org B's data
8. **Given** a user with "viewer" role, **When** they attempt to update a milestone, **Then** the system denies the action (permission check enforced at data layer)

#### Drawing Management
9. **Given** existing drawings in a project, **When** a user imports a new drawing "P-001", **Then** the system normalizes it (uppercase, trim, de-zero) and detects if similar drawings exist (e.g., "P-0001" with 92% similarity)
10. **Given** a drawing marked as retired, **When** similarity detection runs, **Then** the system excludes retired drawings from results

#### Exception Handling
11. **Given** a component with milestone dependencies, **When** a user tries to mark "Test" complete before "Install", **Then** the system creates a "needs review" item with type "out_of_sequence"
12. **Given** a welder used on 7 field welds, **When** the welder has status "unverified", **Then** the system creates a "needs review" item with type "verify_welder"

#### Assignment Management
13. **Given** components without area/system/test package assignments, **When** users view unassigned components, **Then** the system shows them with assignment fields as "Unassigned"
14. **Given** a test package with 50 components, **When** the system calculates readiness, **Then** it shows total component count, completed count, average percent complete, and blocker count

#### Audit Trail
15. **Given** any milestone update, **When** the action completes, **Then** the system records an audit log entry with user, timestamp, old value, new value, and optional reason
16. **Given** a bulk update of 100 components, **When** the operation completes, **Then** the system creates 100 milestone event records and 1 audit log entry for the bulk action

#### Data Validation
17. **Given** an import with invalid welder stencil "john@123", **When** system validates, **Then** import fails with error "Invalid stencil format: must be uppercase alphanumeric A-Z0-9- only, 2-12 characters"
18. **Given** a progress template with milestone weights totaling 97%, **When** system validates template, **Then** template creation fails with error "Milestone weights must total exactly 100% (current: 97%)"

### Edge Cases
- What happens when a component's progress template is updated to a new version? [NEEDS CLARIFICATION: Template versioning and migration strategy]
- What happens when a drawing number collision occurs during import? System must halt import and surface error report before any writes
- What happens when a user deletes a project with 10,000 components? System uses CASCADE delete, ensuring all related components, milestone events, and needs review items are also deleted
- What happens when materialized views are stale during high-frequency updates? System refreshes every 60 seconds; users may see slightly outdated dashboard data (acceptable trade-off for performance)
- What happens when two users simultaneously update the same component's milestone? Database uses row-level locking; second user's update overwrites first (last-write-wins)
- What happens when a welder is deleted but has historical milestone events referencing them? System uses soft delete (is_retired flag) to preserve audit trail integrity
- What happens when a component references a deleted progress template? System prevents template deletion if components reference it (foreign key constraint with ON DELETE RESTRICT prevents orphaned components)

---

## Requirements

### Functional Requirements

#### Core Data Model
- **FR-001**: System MUST store drawings with raw and normalized drawing numbers to enable exact and fuzzy matching
- **FR-002**: System MUST normalize drawing numbers by converting to uppercase, trimming whitespace, collapsing separators, and removing leading zeros from numeric segments
- **FR-003**: System MUST support 11 component types: spool, field_weld, support, valve, fitting, flange, instrument, tubing, hose, misc_component, threaded_pipe
- **FR-004**: System MUST store component identity using flexible JSON structure to accommodate type-specific identity keys (e.g., spool_id, weld_number, commodity_code+size+seq)
- **FR-005**: System MUST enforce unique component identity within a project and component type (allowing same identity across different projects or types)
- **FR-006**: System MUST support soft delete on components and drawings using is_retired flag to preserve referential integrity

#### Progress Templates
- **FR-007**: System MUST define progress templates for each component type with milestone names, weights (totaling 100%), and workflow type (discrete, quantity, or hybrid)
- **FR-008**: System MUST version progress templates to allow future template changes without breaking existing components
- **FR-009**: System MUST support discrete milestones (boolean complete/incomplete) for standard workflows
- **FR-010**: System MUST support partial percentage milestones (0-100%) for hybrid workflows like threaded pipe
- **FR-011**: System MUST calculate component percent complete as weighted sum of milestone states based on the assigned template

#### Milestone Tracking
- **FR-012**: System MUST automatically recalculate component percent_complete whenever current_milestones changes
- **FR-013**: System MUST record every milestone change in milestone_events table with user, timestamp, action (complete/rollback/update), and optional metadata
- **FR-014**: System MUST support welder assignment metadata on "Weld Made" milestone for field weld components
- **FR-015**: System MUST preserve old value when milestone is updated or rolled back (for audit purposes)

#### Assignment Management
- **FR-016**: System MUST allow components to be assigned to area, system, and test package (all optional)
- **FR-017**: System MUST allow area, system, and test package names to be captured during import even if formal entities don't exist yet (stored in attributes JSON)
- **FR-018**: System MUST support creating area, system, and test package entities per project with unique names within project scope

#### Welder Registry
- **FR-019**: System MUST maintain welder registry per project with name, stencil (raw), and normalized stencil (uppercase, trimmed)
- **FR-020**: System MUST enforce unique normalized stencil within a project
- **FR-021**: System MUST track welder status as "unverified" or "verified" with verification timestamp and user
- **FR-022**: System MUST auto-create welder records when weld log import references a new stencil

#### Exception Handling
- **FR-023**: System MUST create needs review items for: out-of-sequence milestones, rollbacks, quantity deltas, drawing changes, similar drawing detection, and welder verification threshold
- **FR-024**: System MUST track needs review status as pending, resolved, or ignored with resolution timestamp, user, and note
- **FR-025**: System MUST store exception-specific metadata in JSON payload (e.g., prerequisite milestone for out-of-sequence, old/new counts for delta)
- **FR-026**: System MUST allow users with can_resolve_reviews permission to resolve or ignore needs review items

#### Multi-Tenant Isolation
- **FR-027**: System MUST enforce row-level security policies ensuring users can only access data within their organization
- **FR-028**: System MUST filter projects, drawings, components, milestone events, welders, and needs review items by user's organization_id
- **FR-029**: System MUST deny reads and writes to data outside user's organization without exception (even for super_admin)

#### Audit Trail
- **FR-030**: System MUST record audit log entries for: milestone updates, rollbacks, imports, needs review resolutions, and bulk updates
- **FR-031**: System MUST capture action type, entity type, entity ID, user, timestamp, old value, new value, and optional reason in audit logs
- **FR-032**: System MUST retain audit logs indefinitely while project is active (archive when project archived, never delete)

#### Performance & Scale
- **FR-033**: System MUST support at least 1 million components with query performance target of p90 <100ms for single component lookup
- **FR-034**: System MUST provide materialized views for test package readiness and drawing progress to achieve p95 <50ms dashboard queries
- **FR-035**: System MUST refresh materialized views automatically every 60 seconds
- **FR-036**: System MUST allow manual materialized view refresh after bulk import or update operations

#### Drawing Similarity Detection
- **FR-037**: System MUST detect similar drawing numbers using trigram similarity algorithm with fixed threshold of 85% for MVP (future: per-project configuration via projects.settings JSONB)
- **FR-038**: System MUST exclude retired drawings from similarity detection results
- **FR-039**: System MUST return up to 3 most similar drawings ordered by similarity score descending
- **FR-040**: System MUST create needs review item when similar drawing detected during import (type "similar_drawing" with matches array)

#### Data Validation
- **FR-041**: System MUST validate component identity_key structure matches component type schema (reject malformed or missing required fields)
- **FR-042**: System MUST validate progress template milestone weights total exactly 100% (reject templates with incorrect totals)
- **FR-043**: System MUST validate welder stencil format against regex `[A-Z0-9-]{2,12}` (uppercase alphanumeric with hyphens, 2-12 characters)
- **FR-044**: System MUST validate drawing numbers are non-empty after normalization (reject blank or whitespace-only drawing numbers)
- **FR-045**: System MUST enforce maximum text field lengths: drawing_no_raw (255 chars), component attributes (10KB JSON), milestone event metadata (5KB JSON)
- **FR-046**: System MUST validate percent_complete remains between 0.00 and 100.00 (reject out-of-range values from calculation errors)

#### Permission Integration
- **FR-047**: System MUST enforce permission checks from Feature 004 permission matrix:
  - `can_update_milestones`: Required to modify component.current_milestones
  - `can_import_weld_log`: Required to create field_weld components via import
  - `can_manage_welders`: Required to verify welders (status change unverified → verified)
  - `can_resolve_reviews`: Required to resolve or ignore needs_review items
  - `can_view_dashboards`: Required to access materialized views (mv_package_readiness, mv_drawing_progress)
  - All 7 roles from Feature 004 apply: owner, admin, project_manager, foreman, qc_inspector, welder, viewer

#### Error Handling & Recovery
- **FR-048**: System MUST handle stored procedure failures gracefully: if calculate_component_percent() fails, log error and preserve previous percent_complete value (no component corruption)
- **FR-049**: System MUST handle materialized view refresh failures: if refresh fails, log error, retry after 60 seconds, and serve stale data until successful refresh
- **FR-050**: System MUST validate progress_template_id exists before creating component (reject components with invalid template references via foreign key constraint)

#### Concurrency & Configuration
- **FR-051**: System MUST handle concurrent milestone updates using row-level locking: last write wins, no optimistic locking or version tracking required for MVP
- **FR-052**: System MUST retain all audit_log and milestone_events records when project.is_archived = true (no automatic deletion, manual export/archival process for closed projects)

#### Field Weld Quality Control
- **FR-053**: System MUST maintain field_weld_inspections table with detailed QC tracking for each field weld component (separate lifecycle from construction milestones)
- **FR-054**: System MUST support foreman workflow: when marking "Weld Made" milestone complete, foreman selects welder from dropdown which creates/updates field_weld_inspections row
- **FR-055**: System MUST enforce unique weld_id_number within project scope using NUMERIC(10,2) format to support repair tracking (42.0, 42.1, 42.2)
- **FR-056**: System MUST support weld repair tracking: repairs create new field_weld_inspections rows with parent_weld_id reference and incremented decimal weld_id_number (e.g., 42.1 for first repair)
- **FR-057**: System MUST allow QC inspectors to manually flag welds for x-ray inspection (no automatic logic, pure manual selection with flagged_for_xray boolean)
- **FR-058**: System MUST track weld turnover to client with turned_over_to_client flag and turnover_date
- **FR-059**: System MUST require welder_id when creating field_weld_inspections row (cannot create weld inspection without assigned welder)
- **FR-060**: System MUST enforce RLS policies on field_weld_inspections table filtering by project.organization_id (multi-tenant isolation)

### Key Entities

- **Drawing**: Represents a construction drawing with raw and normalized numbers, title, revision, and retirement status. Multiple components reference a single drawing. Normalized format enables fuzzy matching for detecting similar drawings during import.

- **Area**: Physical area grouping for components (e.g., "B-68", "Tank Farm"). Project-specific with unique names. Components can be assigned to one area or remain unassigned.

- **System**: System grouping for components (e.g., "HC-05" hydraulic, "E-200" electrical). Project-specific with unique names. Components can be assigned to one system or remain unassigned.

- **Test Package**: Collection of components that must be ready for testing by a target date. Contains name, description, and target date. Materialized view provides cached readiness metrics (total count, completed count, average %, blocker count).

- **Progress Template**: Defines milestone workflow for a component type. Contains component type, version, workflow type (discrete/quantity/hybrid), and milestones configuration JSON (array of milestone objects with name, weight, order, and optional flags like is_partial or requires_welder). Versioned to allow future changes without breaking existing components.

- **Component**: Core entity representing a physical pipe component. Contains identity key (flexible JSON), component type, progress template reference, current milestones state (JSON), cached percent complete, optional assignments (area, system, test package, drawing), attributes (flexible JSON for type-specific data), audit fields (created/updated by/at), and soft delete flag. Supports 11 component types with ~1M row capacity.

- **Milestone Event**: Audit record of milestone state changes. Contains component reference, milestone name, action (complete/rollback/update), value (for partial %), previous value, user, timestamp, and metadata (JSON for welder info, etc.). Provides full audit trail for milestone changes.

- **Welder**: Registry of welders per project. Contains name, raw stencil, normalized stencil (unique), status (unverified/verified), created/verified timestamps and users. Auto-created during weld log import. Requires manual verification after threshold usage (e.g., 5+ welds).

- **Field Weld Inspection**: Quality control tracking for field welds beyond construction milestones. Contains component reference, weld_id_number (supports repairs with decimals: 42.0, 42.1, 42.2), welder assignment (set by foreman), parent_weld_id for repair chain tracking, QC data (hydro test, PMI, PWHT, NDE, x-ray flagging), turnover status, and audit fields. Separate table from components enables distinct QC workflow lifecycle with detailed tracking of test results, client turnover, and weld repair history.

- **Needs Review**: Exception queue for items requiring human review. Contains project/component references, type (out_of_sequence, rollback, delta_quantity, drawing_change, similar_drawing, verify_welder), status (pending/resolved/ignored), payload (JSON with type-specific details), created/resolved timestamps and users, and resolution note. Ensures data quality issues are surfaced and tracked.

- **Audit Log**: Comprehensive audit trail for compliance. Contains project reference, user, action type, entity type/ID, old value, new value, reason (optional), and timestamp. Retained indefinitely. Supports regulatory compliance and forensic analysis.

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain (1 marker: template versioning migration)
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

### Known Clarification Needed
- **Template Versioning Migration**: When a progress template is updated to v2, should existing components using v1 be automatically migrated, remain on v1 until manually upgraded, or show a warning? Assumption for Sprint 1: Components remain on their original template version indefinitely; future versions allow new components to use updated workflow.

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (1 item: template versioning)
- [x] User scenarios defined (18 acceptance scenarios, 7 edge cases)
- [x] Requirements generated (60 functional requirements, all testable)
- [x] Entities identified (11 entities with relationships)
- [ ] Review checklist passed (pending clarification resolution)

---

## Success Criteria

Sprint 1 is complete when:
1. All 11 new tables exist with indexes and RLS policies
2. 11 progress templates are seeded with validated milestone weights (each template totals exactly 100%)
3. Component percent complete auto-calculates when milestones change (tested with stored procedure tests)
4. Field weld QC tracking workflow operational (foreman assigns welder, QC tracks hydro/PMI/PWHT, repair chain tracking with decimal weld IDs)
5. Users can only view/modify data in their own organization (RLS integration tests passing)
6. Drawing similarity detection finds matches above 85% threshold and excludes retired drawings
7. Materialized views refresh every 60 seconds and provide <50ms query performance
8. All database tests achieve ≥80% coverage for business logic
9. Overall test coverage remains ≥70%
10. TypeScript compiles with 0 errors
11. CI pipeline passes (lint, type-check, test, build)

## Dependencies & Assumptions

**Dependencies:**
- Feature 004 (single-org user model) must be complete - provides permission system (7 roles, 6 permissions)
- PostgreSQL 15+ with pg_trgm extension available for similarity detection
- Supabase project provisioned with sufficient storage for 1M+ components (~500MB table + 200MB indexes)
- **Import pipeline implementation deferred to Sprint 2** - Sprint 1 provides database foundation only; data entry via Supabase Studio or API calls for testing

**Assumptions:**
- Components use flexible JSONB identity keys instead of rigid column structure (enables 11 types without schema changes)
- Materialized views refresh every 60 seconds is acceptable latency for dashboard queries (real-time not required)
- Last-write-wins conflict resolution is acceptable for concurrent milestone updates (no complex CRDT or operational transforms needed)
- Audit logs retained indefinitely while project active (no automatic purging, manual archival process for closed projects)
- Template versioning migration deferred to future sprint (v1 templates sufficient for MVP)
- Drawing similarity threshold fixed at 85% for MVP (per-project configuration deferred to Sprint 3)
- Excel/CSV import validation and error reporting deferred to Sprint 2 (Sprint 1 focuses on database schema and core business logic only)

---

**Spec Status**: ✅ Ready for Planning (1 minor clarification can be resolved during planning phase)
