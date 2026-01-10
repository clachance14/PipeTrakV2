# Feature Specification: Revise Pipe Component Milestones

**Feature Branch**: `035-revise-pipe-milestones`
**Created**: 2026-01-10
**Status**: Draft
**Input**: User description: "Revise pipe component type milestones from 2-stage discrete workflow (Receive/Install) to 7-stage hybrid workflow (Receive, Erect, Connect, Support, Punch, Test, Restore) with partial completion support for the first four milestones"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Track Pipe Progress with Granular Milestones (Priority: P1)

As a project manager or field supervisor, I want to track pipe components through a detailed 7-stage workflow so that I can monitor installation progress with greater precision and identify bottlenecks in specific phases of pipe installation.

**Why this priority**: This is the core value proposition. Without granular milestone tracking, the feature has no purpose. The current 2-milestone system (Receive/Install) obscures where pipe components are in the installation lifecycle.

**Independent Test**: Can be fully tested by creating a new pipe component and verifying that 7 milestone inputs appear with correct labels, weights, and input types (percentage vs checkbox).

**Acceptance Scenarios**:

1. **Given** a project with pipe components, **When** I view a pipe component's milestone section, **Then** I see 7 milestones displayed in order: Receive, Erect, Connect, Support, Punch, Test, Restore.

2. **Given** a pipe component with all milestones at 0%, **When** I set Receive to 100% and Erect to 50%, **Then** the component shows 20% overall progress (5% + 15%).

3. **Given** a pipe component, **When** I view the first four milestones (Receive, Erect, Connect, Support), **Then** I can enter percentage values from 0-100%.

4. **Given** a pipe component, **When** I view the last three milestones (Punch, Test, Restore), **Then** I see checkboxes for complete/incomplete status.

---

### User Story 2 - View Pipe Milestone Weights in Settings (Priority: P2)

As a project manager, I want to view the milestone weights for the pipe component type in the Rules of Credit settings so that I understand how progress is calculated and can verify the configuration.

**Why this priority**: Supports transparency and allows PMs to understand the new weighting. Lower priority because the weights are pre-configured and viewing is optional.

**Independent Test**: Can be tested by navigating to Settings > Rules of Credit > Milestones and verifying pipe type displays 7 milestones with correct weights.

**Acceptance Scenarios**:

1. **Given** I am on the Milestone Templates settings page, **When** I view the Pipe component type card, **Then** I see 7 milestones listed with their weights: Receive (5%), Erect (30%), Connect (30%), Support (20%), Punch (5%), Test (5%), Restore (5%).

2. **Given** I am on the Milestone Templates settings page, **When** I view the Pipe component type, **Then** the workflow type shows as "hybrid" indicating mixed percentage/discrete milestones.

---

### User Story 3 - Clone Pipe Template for Project Customization (Priority: P3)

As a project manager, I want to clone the system pipe template to my project so that I can customize milestone weights for project-specific requirements while preserving the 7-milestone structure.

**Why this priority**: Advanced use case for projects needing custom weights. Most projects will use the default weights.

**Independent Test**: Can be tested by cloning the pipe template to a project and modifying weights, then verifying new pipe components use the customized weights.

**Acceptance Scenarios**:

1. **Given** I am on the Milestone Templates settings page, **When** I clone the Pipe template to my project, **Then** a project-specific template is created with all 7 milestones and their default weights.

2. **Given** a cloned pipe template, **When** I adjust milestone weights (keeping total at 100%), **Then** newly created pipe components use my custom weights for progress calculation.

---

### Edge Cases

- What happens when a pipe component has no milestones set? The component shows 0% progress.
- What happens when a partial milestone (Receive/Erect/Connect/Support) is set above 100%? The system caps values at 100%.
- What happens when a partial milestone is set to a negative value? The system enforces minimum of 0%.
- How does the system handle existing pipe components in test projects? They can be ignored or deleted - no production pipe components exist.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a pipe component template with exactly 7 milestones in this order: Receive, Erect, Connect, Support, Punch, Test, Restore.

- **FR-002**: System MUST assign the following weights to pipe milestones: Receive (5%), Erect (30%), Connect (30%), Support (20%), Punch (5%), Test (5%), Restore (5%) - totaling 100%.

- **FR-003**: System MUST support partial completion (0-100%) for the first four milestones: Receive, Erect, Connect, Support.

- **FR-004**: System MUST support discrete completion (complete/incomplete) for the last three milestones: Punch, Test, Restore.

- **FR-005**: System MUST classify the pipe template as "hybrid" workflow type to indicate mixed partial/discrete milestones.

- **FR-006**: System MUST calculate pipe component progress using weighted formula: SUM(milestone_value x weight) / 100.

- **FR-007**: System MUST display pipe milestones in the Settings UI (Rules of Credit > Milestones) with correct weights and workflow type.

- **FR-008**: System MUST allow project-level template cloning to enable per-project weight customization.

### Key Entities

- **Progress Template (Pipe v2)**: System-level definition of the 7-milestone hybrid workflow for pipe components, including milestone names, weights, order, and partial/discrete flags.

- **Component Milestones**: The current progress state of a pipe component, storing percentage values (0-100) for partial milestones and boolean values (0/1) for discrete milestones.

- **Project Progress Template**: Optional project-level override of system template weights, enabling per-project customization.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view and update 7 distinct milestones for any pipe component within 30 seconds.

- **SC-002**: Progress calculations are accurate to within 0.01% of expected weighted values.

- **SC-003**: The pipe template appears correctly in Settings UI with all 7 milestones and weights visible.

- **SC-004**: New pipe components automatically use the 7-milestone template with correct initial values (all at 0).

- **SC-005**: Partial milestone inputs accept and display percentage values from 0-100 with 1% precision.

## Assumptions

- No production pipe components currently exist in the system (confirmed by user).
- Test project data can be ignored during migration.
- Existing progress calculation functions already support hybrid workflows.
- The Settings UI (MilestoneTemplatesPage) is template-driven and will automatically display new milestones.
- No frontend code changes are required beyond the database template update.

## Dependencies

- Existing progress_templates table structure supports versioned templates.
- Existing calculate_component_percent() function supports hybrid workflows.
- Existing Settings UI reads milestones dynamically from templates.

## Spec Completion Checklist *(Constitution v2.0.0)*

**Documentation Completeness:**
- [x] All user flows documented (mobile AND desktop where applicable)
- [x] All acceptance criteria written in testable "Given/When/Then" format
- [x] All edge cases listed with expected behavior

**Validation:**
- [x] No unresolved questions remain in `/clarify` (or clarifications marked as deferred with justification)
- [x] All dependencies on other features or systems listed explicitly

**Constitution Note:** Incomplete specs lead to vague plans and implementation churn. Exit criteria prevent premature planning.
