# Feature Specification: Editable Milestone Weight Templates

**Feature Branch**: `026-editable-milestone-templates`
**Created**: 2025-11-10
**Status**: Draft
**Input**: User description: "Enable admins and project managers to edit milestone weight percentages for each component type within their project"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View and Clone System Templates (Priority: P1)

A project manager opens the Milestone Templates settings page for their existing project that currently uses hardcoded system templates. They see a banner prompting them to clone templates for customization. They click "Clone Templates" and the system creates project-specific copies of all milestone templates. The page refreshes showing 11 component type cards (Field Weld, Spool, Valve, Support, etc.) with milestone counts and Edit buttons.

**Why this priority**: This is foundational—users must have project-specific templates before they can edit weights. Without this, no customization is possible.

**Independent Test**: Can be fully tested by navigating to Project Settings → Milestone Templates, clicking "Clone Templates", and verifying that 55 template rows are created (11 component types × ~5 milestones each). Delivers value by enabling future customization while preserving current calculations.

**Acceptance Scenarios**:

1. **Given** a project using system templates, **When** the user navigates to Milestone Templates settings, **Then** they see a banner "This project uses system templates. Clone to customize?" with a "Clone Templates" button
2. **Given** the user clicks "Clone Templates", **When** cloning completes, **Then** the banner disappears and 11 component type cards are displayed with Edit buttons enabled
3. **Given** a new project is created, **When** the user first visits Milestone Templates settings, **Then** templates are already cloned (no banner shown) and all component type cards are immediately editable

---

### User Story 2 - Edit Milestone Weights with Validation (Priority: P2)

A project manager clicks "Edit" on the Field Weld component type card. A modal opens showing all 5 milestones (Fit-Up, Weld Made, Punch, Test, Restore) with their current weight percentages in numeric input fields. Visual progress bars next to each input show relative weight distribution. The total weight is displayed at the bottom in real-time. The user adjusts "Weld Made" from 60% to 70% and "Test" from 15% to 5%. The total updates to 100% with a green checkmark. The user clicks "Save Changes" and the modal closes. When they reopen the editor, the new weights are reflected.

**Why this priority**: This is the core editing workflow. Without the ability to modify weights, the feature provides no value. However, it depends on P1 (having project templates to edit).

**Independent Test**: Can be fully tested by editing any component type's weights, ensuring validation works (total must equal 100%), saving changes, and verifying persistence. Delivers immediate value by allowing customization of progress calculations.

**Acceptance Scenarios**:

1. **Given** the user opens the weight editor for a component type, **When** the modal displays, **Then** all current milestone weights are shown as numeric inputs (0-100) with visual progress bars
2. **Given** the user adjusts weights, **When** the total equals 100%, **Then** a green checkmark appears, the "Save Changes" button is enabled, and the modal can be closed successfully
3. **Given** the user adjusts weights, **When** the total does not equal 100%, **Then** a red X appears with the actual total displayed, the "Save Changes" button is disabled, and an error message indicates "Weights must sum to 100%"
4. **Given** the user enters an invalid value (<0 or >100), **When** they blur the input, **Then** the input shows a red border and an error toast appears
5. **Given** the user saves valid changes, **When** they reopen the editor, **Then** the new weights are displayed correctly

---

### User Story 3 - Apply Weight Changes to Existing Components (Priority: P3)

A project manager edits milestone weights for the Valve component type. Before saving, they see a message "⚠️ This affects 234 existing components" with a checkbox labeled "Apply to existing components". They check the checkbox and click "Save Changes". The system recalculates progress percentages for all 234 existing valve components based on the new weights. A success message confirms "234 components recalculated". The project manager can also choose to uncheck the box, preserving historical calculations while applying new weights only to future components.

**Why this priority**: This provides flexibility for retroactive updates but is optional behavior. Users can derive value from editing templates without applying changes retroactively (P2 delivers core value). This is an enhancement for consistency management.

**Independent Test**: Can be fully tested by editing weights, toggling the "Apply to existing components" checkbox, saving, and verifying that existing component progress percentages either update or remain unchanged accordingly. Delivers value by allowing users to enforce consistent rules across historical data when needed.

**Acceptance Scenarios**:

1. **Given** the user opens the weight editor for a component type, **When** the modal displays, **Then** it shows the affected component count (e.g., "This affects 234 existing components") and a checkbox "Apply to existing components" (unchecked by default)
2. **Given** the user checks "Apply to existing components" and saves, **When** the recalculation completes, **Then** all existing components of that type show updated progress percentages reflecting the new weights
3. **Given** the user unchecks "Apply to existing components" and saves, **When** the save completes, **Then** existing components retain their previous progress percentages and only new milestone updates use the new weights
4. **Given** a component type with zero existing components, **When** the user saves weight changes, **Then** the system allows the save without errors (no recalculation needed)

---

### User Story 4 - View Audit Trail of Template Changes (Priority: P4)

A project manager opens the Milestone Templates settings page and sees "Last modified by John Doe on 2025-11-09 at 3:42 PM" beneath each component type card. They click a "View History" button (future enhancement) to see a log of all weight changes: who changed them, when, old vs. new values, whether changes were applied to existing components, and how many components were affected. This provides accountability and helps debug unexpected progress percentage changes.

**Why this priority**: This is an audit/transparency feature that enhances trust and debugging but isn't required for core functionality. Users can edit and apply templates without viewing history (P1-P3 deliver complete workflow).

**Independent Test**: Can be fully tested by making multiple template edits, then viewing the audit log and verifying that all changes are recorded with correct metadata (user, timestamp, old/new values, affected count). Delivers value by providing accountability and debugging insights.

**Acceptance Scenarios**:

1. **Given** a user saves template changes, **When** the save completes, **Then** a record is logged in the audit table with: user ID, timestamp, old weights, new weights, whether changes were applied to existing components, and affected component count
2. **Given** a user views a component type card, **When** the card displays, **Then** it shows "Last modified by [User Name] on [Date] at [Time]" (if applicable)
3. **Given** a user views the audit history (future UI enhancement), **When** they review the log, **Then** they see a chronological list of all template changes with full metadata

---

### Edge Cases

- **Concurrent edits**: Two users edit the same component type's weights simultaneously. The second user to save sees an error: "Templates were modified by another user. Refresh and try again." (optimistic locking via `updated_at` timestamp check).
- **Zero-weight milestones**: User sets one milestone to 0% weight. System allows this as long as at least one milestone has weight > 0 and total equals 100%. (Supports optional milestones like "Repair" which may not apply to all components.)
- **Permission enforcement**: A field engineer (without admin/project_manager role) attempts to access the Milestone Templates page. The navigation link is hidden in the UI. If they manually navigate to the URL, the backend RLS policies deny access with "permission denied" error.
- **Network errors during save**: User clicks "Save Changes" but the network request fails. The modal shows an error toast "Failed to save changes. Please try again." with a "Retry" button. User edits are preserved in the modal state.
- **Large project recalculation**: User applies weight changes to a component type with 5,000 existing components. The recalculation takes 2-3 seconds. A loading spinner is displayed with progress indicator. The modal remains open until completion, then shows success message.
- **Project without cloned templates**: Existing project has no rows in `project_progress_templates`. Banner displays "This project uses system templates. Clone to customize?" User clicks "Clone Templates" and the system copies all 55 rows from `progress_templates`. If cloning fails (e.g., database error), user sees error toast and banner remains.
- **Invalid data submission**: User attempts to save weights that sum to 95%. Client validation prevents submission (Save button disabled). If client validation is bypassed (e.g., via API manipulation), server-side constraint rejects with error "Milestone weights must sum to 100 for component type [X]".
- **Deletion protection**: User attempts to delete a milestone template row directly via database. System prevents deletion to maintain referential integrity (components depend on milestones existing). Only weight/order modifications are allowed via UI.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow admins and project managers to view all 11 component types with their milestone counts on a Milestone Templates settings page
- **FR-002**: System MUST display a "Clone Templates" banner with action button for existing projects that have no project-specific templates
- **FR-003**: System MUST automatically clone system templates to project-specific templates when a new project is created
- **FR-004**: System MUST allow manual cloning of system templates for existing projects via a "Clone Templates" button
- **FR-005**: System MUST create exactly 55 template rows (one per milestone across 11 component types) when cloning templates
- **FR-006**: System MUST provide an Edit button on each component type card to open a weight editing modal
- **FR-007**: System MUST display all milestones for a component type with numeric input fields (0-100) for weight percentages
- **FR-008**: System MUST show visual progress bars next to each weight input to illustrate relative distribution
- **FR-009**: System MUST calculate and display the total weight percentage in real-time as users adjust individual weights
- **FR-010**: System MUST validate that milestone weights sum to exactly 100% before allowing save
- **FR-011**: System MUST disable the "Save Changes" button and display an error when total weight does not equal 100%
- **FR-012**: System MUST show a red border and error toast when a user enters an invalid weight (<0 or >100)
- **FR-013**: System MUST display the count of existing components that would be affected by weight changes
- **FR-014**: System MUST provide a checkbox "Apply to existing components" (unchecked by default) to control retroactive application
- **FR-015**: System MUST recalculate progress percentages for all existing components of a given type when "Apply to existing components" is checked and changes are saved
- **FR-016**: System MUST preserve existing component progress percentages when "Apply to existing components" is unchecked
- **FR-017**: System MUST log all template changes to an audit table with: user, timestamp, old weights, new weights, retroactive flag, and affected component count
- **FR-018**: System MUST display "Last modified by [User] on [Date] at [Time]" on component type cards
- **FR-019**: System MUST enforce permissions at both UI (hide navigation/buttons) and database (RLS policies) levels, restricting editing to admins and project managers
- **FR-020**: System MUST allow project members with read-only access to view templates but not edit them
- **FR-021**: System MUST fall back to system templates when calculating component progress if no project templates exist
- **FR-022**: System MUST allow zero-weight milestones as long as at least one milestone has weight > 0 and total equals 100%
- **FR-023**: System MUST validate weights sum to 100% at both client (before submission) and server (on save) levels
- **FR-024**: System MUST handle concurrent edits by checking `updated_at` timestamp and rejecting saves if templates were modified since the modal opened
- **FR-025**: System MUST preserve user edits in the modal if a network error occurs and provide a "Retry" button
- **FR-026**: System MUST display a loading spinner with progress indicator during recalculation of large component sets (>1000 components)

### Key Entities *(include if feature involves data)*

- **Project Progress Template**: Represents a milestone weight configuration for a specific component type within a project. Attributes include: project ID, component type (e.g., "Field Weld"), milestone name (e.g., "Weld Made"), weight percentage (0-100), milestone order, is_partial flag, requires_welder flag, created timestamp, updated timestamp. Unique constraint on (project_id, component_type, milestone_name).
- **Template Change Audit**: Represents a historical record of template modifications. Attributes include: project ID, component type, user who made the change, old weights (JSONB), new weights (JSONB), whether changes were applied to existing components (boolean), affected component count, timestamp. Provides accountability and debugging trail.
- **Component**: Existing entity representing a physical pipe component. Progress percentage is recalculated based on current milestones and project template weights. Each component belongs to a project and has a component type that determines which template applies.
- **Milestone**: Conceptual entity representing a work stage (e.g., "Fit-Up", "Weld Made"). Milestones are defined in templates and referenced in component milestone tracking. Each milestone has a weight that determines its contribution to overall progress.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Admins and project managers can complete template cloning and weight customization for a component type in under 2 minutes (from opening settings page to saving changes)
- **SC-002**: System prevents invalid template configurations (weights summing to ≠100%) from being saved 100% of the time via dual client/server validation
- **SC-003**: Weight change recalculation for projects with 1,000 components completes in under 3 seconds
- **SC-004**: Template editing functionality is accessible only to users with admin or project_manager roles, enforced at both UI and database levels with zero permission bypasses
- **SC-005**: All template modifications are recorded in the audit log with 100% completeness (no missing user, timestamp, or weight change data)
- **SC-006**: Projects using custom templates (vs. system defaults) reach 30% adoption within 60 days of feature launch
- **SC-007**: Zero bug reports related to progress calculation discrepancies after template weight changes are applied
- **SC-008**: User satisfaction survey shows ≥85% of admins/project managers find the template editing interface intuitive and efficient
- **SC-009**: Component progress percentages remain accurate within ±0.1% when templates are applied retroactively (no floating-point precision errors)
- **SC-010**: System maintains full backward compatibility—existing projects without cloned templates continue calculating progress using system templates with zero disruption

### Assumptions

- Users have basic understanding of milestone-based progress tracking and what weight percentages represent
- Desktop viewport (>1024px) is standard for admin/project manager workflows; mobile optimization is not required for this administrative feature
- Component types and milestone definitions are relatively stable; frequent additions/removals of component types are not expected
- Project managers have authority to modify progress calculation rules within their projects without requiring approval from other stakeholders
- Network latency for saving template changes is <500ms under normal conditions
- Projects typically have between 100-10,000 components, with recalculation performance target set for 1,000 components
- Users understand that changing weights may affect reported progress percentages and will communicate changes to their teams accordingly
