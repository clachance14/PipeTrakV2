# Feature Specification: Field Weld QC Module

**Feature Branch**: `014-add-comprehensive-field`
**Created**: 2025-10-22
**Status**: Draft
**Input**: User description: "Add comprehensive field weld tracking to PipeTrak V2, replacing Excel-based weld logs with integrated QC workflow. Field welds become a first-class component type with dedicated tracking for welder assignment, NDE inspection, and repair management."

## Execution Flow (main)
```
1. Parse user description from Input
   → Feature request: Replace Excel weld logs with integrated system
2. Extract key concepts from description
   → Actors: Foremen, QC inspectors, Project managers, Welders (passive)
   → Actions: Import welds, assign welders, record inspections, manage repairs
   → Data: Field welds, welders, NDE results, repair history
   → Constraints: Must integrate with existing component tracking
3. For each unclear aspect:
   → All clarified through brainstorming session
4. Fill User Scenarios & Testing section
   → Primary flows: Import → Assign → Inspect → Accept/Reject
5. Generate Functional Requirements
   → 45 testable requirements covering full lifecycle
6. Identify Key Entities
   → Field welds, Welders, NDE inspections, Repair relationships
7. Run Review Checklist
   → No implementation details included
   → All requirements testable
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## Clarifications

### Session 2025-10-22

- Q: How should field welds be uniquely identified within a drawing? → A: Use Weld ID Number from CSV as permanent identity (stored, displayed, referenced in repairs)
- Q: What are the maximum scale limits for field weld data? → A: Small projects: Max 5,000 welds per project, 100 welds per drawing, 50 welders
- Q: What audit trail requirements apply to field weld QC records? → A: Basic logging: Track who/when for changes, allow corrections, standard retention
- Q: How should the system handle concurrent updates to the same field weld? → A: Last write wins: No conflict detection, most recent save overwrites previous changes
- Q: What are the performance targets for field weld UI operations? → A: Standard web: Milestone update <2s, drawing table load <3s, search <1s

---

## User Scenarios & Testing

### Primary User Story

**Project Manager Sarah** needs to track all field welds for a pipeline construction project. Currently, her team maintains a 3.1MB Excel spreadsheet with thousands of welds, which becomes outdated as soon as it's distributed to the field. She wants foremen to update weld progress in real-time from tablets, QC inspectors to record inspection results immediately, and project managers to see accurate weld completion percentages rolled up to drawings, packages, and systems.

### Acceptance Scenarios

#### Scenario 1: Bulk Import Existing Welds
1. **Given** a project with no field welds tracked yet, **When** project manager uploads WELD LOG.csv with 2000 weld records, **Then** system creates 2000 field weld components, assigns them to correct drawings, creates welder records for unique stencils, and sets initial progress based on existing data (welds with completion dates start at 95%, welds with NDE PASS start at 100%).

#### Scenario 2: Foreman Assigns Welder to Completed Weld
2. **Given** a field weld at 30% (Fit-up complete), **When** foreman marks "Weld Complete" milestone, **Then** system prompts for welder selection and weld date, updates weld to 95% complete, and records welder assignment with timestamp.

#### Scenario 3: QC Inspector Records Passing NDE
3. **Given** a field weld at 95% (Weld Complete), **When** QC inspector records NDE result as PASS with type RT and date, **Then** system marks "Accepted" milestone complete, updates weld to 100%, sets status to "accepted", and updates drawing/package progress calculations.

#### Scenario 4: QC Inspector Records Failing NDE and Creates Repair
4. **Given** a field weld at 95% awaiting NDE, **When** QC inspector records NDE result as FAIL, **Then** system marks original weld as 100% with status "rejected" (so it doesn't show as work remaining), prompts to create repair weld, generates new weld component with link to original, and starts repair at 30% (Fit-up auto-completed).

#### Scenario 5: View Weld Progress in Drawing Table
5. **Given** a drawing with 50 components (pipes, valves, welds), **When** user filters to show only field welds, **Then** system displays weld-specific columns (Welder, Date Welded, NDE Status), shows status badges (accepted=green, rejected=red/grayed, active=blue), and allows inline milestone updates.

#### Scenario 6: Manage Welder Registry
6. **Given** a project with 15 welders, **When** foreman views welder page, **Then** system displays table with stencil and name, allows adding new welders via simple form, and makes welders immediately available for assignment without verification workflow.

#### Scenario 7: QC Inspector Views All Project Welds in Weld Log
7. **Given** a project with 2000 field welds across 50 drawings, **When** QC inspector navigates to /weld-log, **Then** system displays flat table with all field welds (not grouped by drawing), showing core QC columns (Weld ID, Drawing, Welder, Date Welded, Type, Size, NDE Result, Status, Progress), with filters for drawing/welder/status/package/system, global search box, sortable columns, and inline action buttons (Assign Welder, Record NDE).

### Edge Cases

#### Data Import Edge Cases
- **Empty required fields**: What happens when CSV has weld with no Drawing Number?
  - System skips row, adds to error report with specific message, continues processing remaining rows.
- **Invalid weld type**: What happens when CSV has weld type "XYZ" not in (BW, SW, FW, TW)?
  - System skips row, reports invalid weld type, continues processing.
- **Duplicate weld ID**: What happens when CSV has two welds with same Weld ID Number on the same drawing?
  - System skips duplicate, reports error with row numbers, keeps first occurrence. Note: Same weld ID allowed on different drawings.
- **Non-existent drawing**: What happens when CSV references drawing "P-99999" not in system?
  - System skips row, reports missing drawing, continues processing.
- **New welder stencil**: What happens when CSV has welder stencil not in welders table?
  - System auto-creates welder record with stencil and name from CSV, marks as unverified for future use.

#### Workflow Edge Cases
- **Marking milestone without welder**: What happens when foreman tries to mark "Weld Complete" but doesn't select welder?
  - System requires welder selection before allowing milestone completion (validation error).
- **NDE on non-required weld**: What happens when QC tries to record NDE on weld with nde_required=false?
  - System allows recording (weld may not require NDE initially but gets flagged later), updates result normally.
- **Multiple repairs**: What happens when repair weld also fails NDE?
  - System allows creating repair of repair, maintains chain via original_weld_id linkage, shows repair history (Weld 42 → Repair 42.1 → Repair 42.2).
- **Progress rollup with rejected welds**: How does rejected weld at 100% affect drawing progress?
  - Rejected weld contributes 100% to drawing (completed, though rejected), repair weld shows as new work item (0-100% separate contribution).

#### Permissions Edge Cases
- **Viewer tries to assign welder**: What happens when user with viewer role tries to assign welder?
  - System denies action, shows permission error toast.
- **Foreman tries to record NDE**: What happens when foreman tries to record NDE result?
  - System restricts NDE recording to QC inspectors only, shows permission error.

#### Data Integrity Edge Cases
- **Deleting assigned welder**: What happens when project manager deletes welder who has 50 welds assigned?
  - System prevents deletion (foreign key constraint), shows error message "Cannot delete welder with assigned welds".
- **Deleting drawing with welds**: What happens when user deletes drawing that has 20 field welds?
  - System cascades deletion to all components (including field welds) on that drawing, shows confirmation warning with count.
- **Concurrent updates**: What happens when two users update the same field weld simultaneously (e.g., foreman assigns welder while QC records NDE)?
  - System uses last write wins strategy. Most recent save overwrites previous changes without conflict detection. Both changes logged in audit trail with timestamps.

---

## Requirements

### Functional Requirements

#### Weld Data Management
- **FR-001**: System MUST store field welds as components with type "field_weld" alongside other component types (pipes, valves, fittings).
- **FR-001a**: System MUST use Weld ID Number as permanent unique identifier for field welds (stored, displayed in UI, used in repair references).
- **FR-001b**: System MUST enforce uniqueness of Weld ID Number within each drawing (same weld number allowed on different drawings).
- **FR-002**: System MUST track weld-specific properties: weld type (BW/SW/FW/TW), weld size, schedule, base metal, spec.
- **FR-003**: System MUST track welder assignment: welder ID, weld date.
- **FR-004**: System MUST track NDE inspection data: required flag, NDE type (RT/UT/PT/MT), result (PASS/FAIL/PENDING), date, notes.
- **FR-005**: System MUST track weld status: active (default), accepted (NDE passed), rejected (NDE failed).
- **FR-006**: System MUST link repair welds to original failed weld via parent-child relationship.
- **FR-007**: System MUST compute is_repair flag automatically (true if linked to original weld, false otherwise).

#### Progress Tracking
- **FR-008**: System MUST define 3-milestone progress template for field welds: Fit-up (30%), Weld Complete (65%), Accepted (5%).
- **FR-009**: System MUST require welder assignment when marking "Weld Complete" milestone.
- **FR-010**: System MUST automatically mark "Accepted" milestone when NDE result is PASS.
- **FR-011**: System MUST set weld to 100% complete and status "rejected" when NDE result is FAIL.
- **FR-012**: System MUST auto-complete "Fit-up" milestone (30%) for repair welds upon creation.
- **FR-013**: System MUST include field weld progress in drawing/package/system rollup calculations.

#### Welder Registry
- **FR-014**: System MUST maintain project-scoped welder registry with stencil (unique identifier) and name.
- **FR-015**: System MUST normalize welder stencils to uppercase and trim whitespace.
- **FR-016**: System MUST validate welder stencils against pattern [A-Z0-9-]{2,12}.
- **FR-017**: System MUST prevent duplicate welder stencils within same project.
- **FR-018**: System MUST allow adding welders manually via form (stencil + name).
- **FR-019**: System MUST make welders immediately available for assignment (no verification workflow in initial release).

#### CSV Import
- **FR-020**: System MUST support bulk field weld import via CSV file upload.
- **FR-021**: System MUST require CSV columns: Weld ID Number, Drawing / Isometric Number, Weld Type.
- **FR-022**: System MUST support optional CSV columns: SPEC, Weld Size, Schedule, Base Metal, X-RAY %, Welder Stencil, Date Welded, Type of NDE Performed, NDE Result, Comments.
- **FR-023**: System MUST normalize drawing numbers from CSV to match existing drawing normalization logic.
- **FR-024**: System MUST validate each CSV row: required fields present, valid weld type, valid NDE result, drawing exists.
- **FR-025**: System MUST skip invalid rows and report errors with row numbers and specific messages.
- **FR-026**: System MUST auto-create welders for stencils not in registry.
- **FR-027**: System MUST set initial progress based on CSV data: Date Welded present → 95%, NDE Result PASS → 100%, otherwise 0%.
- **FR-028**: System MUST process CSV imports atomically (all-or-nothing transaction).
- **FR-029**: System MUST generate downloadable error report CSV for failed imports.
- **FR-030**: System MUST validate maximum file size of 5MB for CSV uploads.

#### UI Integration
- **FR-031**: System MUST display field welds in existing drawing table alongside other components.
- **FR-032**: System MUST provide "Field Weld" filter option in component type filter dropdown.
- **FR-033**: System MUST show weld-specific columns: Welder, Date Welded, NDE Status, Status Badge.
- **FR-034**: System MUST display status badges: Active (blue), Accepted (green), Rejected (red with grayed-out styling).
- **FR-035**: System MUST show "Assign Welder" dialog when foreman marks "Weld Complete" milestone.
- **FR-036**: System MUST show "Record NDE" dialog when QC inspector updates NDE result.
- **FR-037**: System MUST show "Create Repair" dialog automatically when NDE result is FAIL.
- **FR-038**: System MUST show repair history: link from weld to original + all repairs in chain.
- **FR-039**: System MUST provide "/welders" page with table of welders (stencil, name) and "Add Welder" button.
- **FR-040**: System MUST add "Welders" to main navigation menu (visible to users with welder management permission).

#### Permissions
- **FR-041**: System MUST allow all team members to view field welds and welders.
- **FR-042**: System MUST restrict field weld creation/import to foremen, QC inspectors, and admins.
- **FR-043**: System MUST restrict welder assignment to foremen and project managers.
- **FR-044**: System MUST restrict NDE result recording to QC inspectors only.
- **FR-045**: System MUST restrict welder management (create/edit) to users with can_manage_team permission.

#### Scalability
- **FR-046**: System MUST support up to 5,000 field welds per project without performance degradation.
- **FR-047**: System MUST support up to 100 field welds per drawing without UI performance issues.
- **FR-048**: System MUST support up to 50 welders per project in welder registry.

#### Performance
- **FR-049**: System MUST complete milestone updates (checkbox toggle or partial value change) in under 2 seconds.
- **FR-050**: System MUST load drawing table with up to 100 field welds in under 3 seconds.
- **FR-051**: System MUST return field weld search results in under 1 second.
- **FR-052**: System MUST complete CSV import of 2000 welds in under 30 seconds.

#### Audit & Data Integrity
- **FR-053**: System MUST log all welder assignments with user ID and timestamp.
- **FR-054**: System MUST log all NDE result recordings with user ID and timestamp.
- **FR-055**: System MUST log all milestone completions with user ID and timestamp.
- **FR-056**: System MUST allow authorized users to correct erroneous NDE results or welder assignments (corrections logged as new events).
- **FR-057**: System MUST retain field weld records and audit logs per standard project retention policy (no special regulatory retention period required).
- **FR-058**: System MUST use last write wins strategy for concurrent updates (no optimistic locking or conflict detection in initial release).

#### Weld Log Page
- **FR-059**: System MUST provide dedicated weld log page at route /weld-log accessible to all team members.
- **FR-060**: System MUST display all field welds in flat table format (not grouped by drawing).
- **FR-061**: System MUST show core QC columns: Weld ID, Drawing Number, Welder (Stencil + Name), Date Welded, Weld Type, Size, NDE Type + Result, Status Badge, Progress %.
- **FR-062**: System MUST support filtering by Drawing, Welder, Status (All/Active/Accepted/Rejected), Test Package, and System.
- **FR-063**: System MUST support global search across Weld ID, Drawing Number, and Welder Stencil (case-insensitive, partial match, debounced 300ms).
- **FR-064**: System MUST support column sorting (click header to toggle ascending/descending).
- **FR-065**: System MUST default sort to Date Welded descending (newest first).
- **FR-066**: System MUST combine all filters with AND logic and persist in URL query parameters.
- **FR-067**: System MUST show inline action buttons: "Assign Welder" (foremen/project managers only, active welds), "Record NDE" (QC inspectors only, welds with assigned welders).
- **FR-068**: System MUST reuse existing dialogs (WelderAssignDialog, NDEResultDialog, CreateRepairWeldDialog, RepairHistoryDialog) for inline actions.
- **FR-069**: System MUST add "Weld Log" navigation item visible to all team members, positioned after "Welders" in main menu.

### Key Entities

- **Field Weld**: Represents a physical weld joint between piping components. Uniquely identified by Weld ID Number (e.g., "W-001", "42", "P-101-W-5") scoped to drawing. Extends component entity with weld-specific properties (weld type, size, schedule, base metal, spec). Linked to exactly one component record. Contains welder assignment, NDE inspection data, and status (active/accepted/rejected). Links to original weld via weld_id if this is a repair.

- **Welder**: Represents a certified welder assigned to the project. Identified by unique stencil (2-12 character alphanumeric code) and name. Scoped to project (different projects can have same stencil for different welders). Available for assignment to field welds. No verification workflow in initial release (future: certification tracking).

- **Weld Inspection**: Implicit entity captured as properties on field weld record. Includes NDE type (RT/UT/PT/MT radiographic/ultrasonic/penetrant/magnetic testing), result (PASS/FAIL/PENDING), date, and notes. Determines final weld status (accepted vs rejected).

- **Repair Relationship**: Linkage between failed weld and repair weld(s). Original weld marked rejected and set to 100% (doesn't show as work remaining). Repair weld created as new component with link back to original. Supports chains (repair of repair). Used for audit trail and repair history views.

- **Weld Log View**: Aggregate UI entity that combines data from field_welds, components, welders, and drawings tables. Provides flat table view of all field welds in project for QC inspector workflow. Includes filtering, sorting, and search capabilities. Displays core QC tracking columns and supports inline actions for welder assignment and NDE recording.

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
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (none - all clarified via brainstorming)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---

## Success Criteria

1. **Excel Elimination**: Project teams no longer maintain separate Excel WELD LOG.xlsx files. All weld tracking happens in PipeTrak.

2. **Real-time Updates**: Foremen update weld progress from field (tablets/phones) immediately upon completion. No end-of-day batch updates.

3. **QC Visibility**: QC inspectors can filter field welds by NDE status (pending/pass/fail), record results on-site, and trigger repair workflows instantly.

4. **Accurate Progress**: Field weld completion percentages roll up correctly to drawings, packages, and systems. Rejected welds don't inflate "work remaining" metrics.

5. **Import Performance**: 2000-weld CSV import completes in under 30 seconds with detailed error reporting for any invalid rows.

6. **Repair Tracking**: Failed welds and their repair chain are clearly linked and visible in weld history views.

---

## Assumptions & Dependencies

### Assumptions
- Projects already have drawings imported before importing field welds (welds must reference existing drawings).
- Welder stencils in CSV match stencils used in field (normalization handles minor variations like case/whitespace).
- NDE requirements determined by engineering specs (not calculated by system - boolean flag only).
- Package-level activities (hydro test, turnover) tracked separately (not at individual weld level).
- Initial release targets small-to-medium projects (≤5,000 welds, ≤100 welds per drawing, ≤50 welders). Larger projects may require additional optimization in future releases.
- Concurrent updates to same field weld are rare (small team sizes, geographic/shift separation). Last write wins acceptable for initial release; optimistic locking can be added if conflicts become frequent.

### Dependencies
- Existing component tracking system (field welds extend this foundation).
- Drawing normalization logic (must match for CSV import to link correctly).
- Progress template system (field weld template follows same discrete milestone pattern).
- Metadata assignment (field welds inherit area/system/package from drawings).
- Permission system (foreman, QC inspector, project manager roles defined).
- Audit logging system (milestone_events table tracks who/when for all changes).

---

## Out of Scope (For Initial Release)

- Welder certification tracking and expiration management.
- Automated NDE requirement calculation based on pipe spec/diameter.
- Photo/document attachments for weld inspections.
- Integration with third-party NDT vendor systems.
- WPS (Welding Procedure Specification) management and linkage.
- PWHT (Post-Weld Heat Treatment) tracking.
- PMI (Positive Material Identification) tracking.
- Hydro test tracking at weld level (tracked at package level instead).
- Client turnover tracking at weld level (tracked at package level instead).
- X-ray film management and shot number tracking.
- Welder productivity reports and analytics.
- Automated notifications for NDE failures or pending inspections.
