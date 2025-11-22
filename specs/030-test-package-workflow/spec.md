# Feature Specification: Test Package Lifecycle Workflow

**Feature Branch**: `030-test-package-workflow`
**Created**: 2025-11-21
**Status**: Draft
**Input**: User description: "Transform test packages from basic containers into full lifecycle-tracked entities with: minimal creation (name + test type + selections), certificate form before testing (all test parameters), sequential workflow stages (7 acceptance stages with sign-offs), and flexible drawing/component assignment"

## Clarifications

### Session 2025-11-21

- Q: Should test package workflows support mobile/tablet, or desktop-only? → A: Desktop-only - no mobile or tablet support for creating/editing test packages
- Q: What are the system performance and scale targets? → A: Medium scale - up to 500 packages per project, up to 50 concurrent users, 2-second response time target
- Q: Who can provide sign-offs on workflow stages? → A: Role-based with QC users only initially - client users not yet implemented, so QC can provide all sign-offs (including client and MFG sign-offs) until client user roles are added
- Q: What format should certificate numbers use? → A: Auto-generated sequential per project - human-readable format like "PKG-001", "PKG-002" scoped to each project
- Q: What happens when a package is deleted? → A: Package deletion allowed - frees components for reassignment. Important: individual components can only belong to ONE test package at a time (uniqueness constraint)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Quick Package Creation with Drawing Assignment (Priority: P1)

A Project Manager needs to quickly create a test package for piping that's ready for hydrostatic testing. They select a package name, choose "Hydrostatic" as the test type, and assign all drawings from Area 100 to the package. The system automatically includes all components from those drawings in the package.

**Why this priority**: This is the foundational workflow that makes test packages usable. Without the ability to create packages and assign content, no other features can function. This delivers immediate value by replacing manual tracking.

**Independent Test**: Can be fully tested by creating a package, selecting drawings, and verifying that all components from those drawings are associated with the package. Delivers value by enabling organized test package creation.

**Acceptance Scenarios**:

1. **Given** I am logged in as a PM on the Packages page, **When** I click "Create Package", enter name "Hydro Package 1", select test type "Hydrostatic", and choose 3 drawings from Area 100, **Then** the package is created with all components from those 3 drawings automatically assigned
2. **Given** I am creating a package with drawing selection, **When** I select a drawing that has 50 components across 3 areas, **Then** I see a preview showing "50 components will be inherited from 1 drawing"
3. **Given** I am creating a package, **When** I enter a name that already exists for this project, **Then** I see an error "Package name must be unique" and cannot submit
4. **Given** I am creating a package, **When** I do not select any drawings or components, **Then** the Create button is disabled and I see a message "Select at least one drawing or component"

---

### User Story 2 - Flexible Component Assignment Override (Priority: P2)

A QC Inspector discovers that Drawing A-101 has components split between two test packages. They need to create Package A with only specific components from Drawing A-101, overriding the normal inheritance behavior where all components would be included.

**Why this priority**: While drawing-level assignment handles 80% of cases, the ability to cherry-pick individual components is critical for complex scenarios like split packages or components with different test requirements. This prevents workarounds and manual tracking.

**Independent Test**: Can be tested by creating a package, switching to component selection mode, and selecting individual components from multiple drawings. Delivers value by handling edge cases that drawing-level assignment cannot.

**Acceptance Scenarios**:

1. **Given** I am creating a package, **When** I switch to the "Select Components" tab instead of "Select Drawings", **Then** I see a filterable list of all components in the project with checkboxes
2. **Given** I am on the component selection tab, **When** I filter by Area "100" and System "Fire Water", **Then** I only see components matching both criteria
3. **Given** I am creating a package with component selection, **When** I select 15 individual components from 3 different drawings, **Then** the package is created with only those 15 components directly assigned (not inherited)
4. **Given** I am creating a package, **When** I try to select both drawings AND individual components, **Then** I see a warning "Choose either drawing assignment OR component assignment, not both" and must clear one selection type

---

### User Story 3 - Certificate Form Completion Before Testing (Priority: P3)

A QC Manager needs to fill out the formal Pipe Testing Acceptance Certificate before the package can begin the testing workflow. They open an existing package, enter test parameters (pressure: 1125 PSIG, media: Condensate, temperature: Ambient), client details (DOW, spec: HC-05), and save the certificate.

**Why this priority**: The certificate form is required for regulatory compliance and client sign-off, but it doesn't need to be filled during package creation. Users can create packages quickly and defer certificate details until ready to test. This priority allows P1/P2 stories to deliver value independently.

**Independent Test**: Can be tested by opening an existing package (created via P1), filling out the certificate form with all required fields, and saving. Delivers value by formalizing test parameters and meeting compliance requirements.

**Acceptance Scenarios**:

1. **Given** I have a package with no certificate filled out, **When** I click "Complete Certificate" and enter test pressure (1125 PSIG), test media (Condensate), temperature (Ambient), client (DOW), and specification (HC-05), **Then** the certificate is saved and the package status shows "Certificate Complete"
2. **Given** I am filling out a certificate, **When** I select test type "Other" from the dropdown, **Then** a text field appears asking me to specify the test type
3. **Given** I am filling out a certificate, **When** I click "Save as Draft" without filling required fields (test pressure, media, temperature), **Then** the draft is saved with partial data and I can return later
4. **Given** I am filling out a certificate, **When** I click "Submit & Begin Testing" without required fields, **Then** I see validation errors highlighting missing fields and cannot proceed
5. **Given** I have filled out a certificate, **When** I view the package detail page, **Then** I see a read-only summary of the certificate with an "Edit" button

---

### User Story 4 - Sequential Workflow Stage Completion with Sign-Offs (Priority: P4)

A Field QC Inspector is tracking a package through the testing process. They complete the Pre-Hydro stage by entering the field walk-down inspector name and marking NDE as complete. The system then allows them to proceed to the Test Acceptance stage, where they enter test gauge numbers, calibration dates, and time held. Each stage requires QC and client sign-offs before moving to the next.

**Why this priority**: Sequential workflow enforcement is critical for quality assurance and audit trails, but it builds on the foundation of package creation (P1) and certificate completion (P3). Without packages and certificates, there's nothing to track through stages.

**Independent Test**: Can be tested by opening a package with a completed certificate, completing the Pre-Hydro stage with all required sign-offs, and verifying that the Test Acceptance stage becomes available. Delivers value by enforcing quality gates and providing audit trails.

**Acceptance Scenarios**:

1. **Given** I have a package with certificate completed, **When** I view the Workflow tab, **Then** I see a vertical stepper showing 7 stages: Pre-Hydro (available), Test Acceptance (locked), Drain/Flush (locked), Post-Hydro (locked), Coatings (locked), Insulation (locked), Final Acceptance (locked)
2. **Given** I am on the Pre-Hydro stage, **When** I click the stage, enter field walk-down inspector "John Smith", mark NDE Complete as "Yes", and provide ICS QC Rep signature and date, **Then** the stage status changes to "Completed" and Test Acceptance stage becomes available
3. **Given** I have completed Pre-Hydro, **When** I try to complete Post-Hydro without completing Test Acceptance and Drain/Flush, **Then** the Post-Hydro stage remains locked and shows "Complete previous stages first"
4. **Given** I am completing a stage, **When** I click "Skip Stage" and provide a reason "Insulation not required per client spec", **Then** the stage is marked "Skipped" with the reason recorded and the next stage becomes available
5. **Given** I am viewing a completed stage, **When** I click on it, **Then** I see a read-only summary of all sign-offs, dates, and stage-specific data with an audit trail showing who completed it and when
6. **Given** I am completing the Final Acceptance stage, **When** I provide both ICS QC Rep and Client sign-offs with dates, **Then** the package status changes to "Final Acceptance Complete" and the package is marked as fully approved
7. **Given** I am completing a stage, **When** I try to submit without required fields (e.g., Test Acceptance without test gauge calibration dates), **Then** I see validation errors and cannot mark the stage complete

---

### Edge Cases

- What happens when a user tries to assign the same drawing to multiple test packages? **Expected**: System allows this (drawings can be in multiple packages), but individual components from that drawing can only belong to ONE test package at a time
- What happens when a user tries to assign a component that's already in another test package? **Expected**: Validation error prevents assignment - component must be removed from existing package first
- What happens when a drawing is deleted after being assigned to a package? **Expected**: Package retains component assignments via direct foreign keys; inheritance breaks but existing assignments remain
- What happens when a user tries to create a package with a duplicate name in the same project? **Expected**: Validation error prevents creation
- What happens when a user completes a workflow stage but later needs to edit sign-off details (e.g., wrong date entered)? **Expected**: Completed stages can be edited to correct errors. All edits should be logged in an audit trail showing who made the change and when
- What happens when a package has no components assigned (empty package)? **Expected**: Warning shown during creation but allowed (user may add components later)
- What happens when a user tries to mark a stage as "Skipped" without providing a reason? **Expected**: Validation error prevents skipping - a reason text is required to document why the stage is not applicable
- What happens when multiple users try to complete the same workflow stage simultaneously? **Expected**: Last write wins; optimistic locking prevents data loss but doesn't prevent overwrites

## Requirements *(mandatory)*

### Functional Requirements

**Package Creation:**
- **FR-001**: System MUST allow users to create a test package with name and test type selection (Sensitive Leak Test, Pneumatic Test, Alternative Leak Test, In-service Test, Hydrostatic Test, Other)
- **FR-002**: System MUST validate that package names are unique within a project
- **FR-003**: System MUST provide two assignment modes: drawing-based (inherit all components from selected drawings) OR component-based (select individual components)
- **FR-004**: System MUST prevent users from mixing drawing-based and component-based assignment in a single package creation flow
- **FR-005**: System MUST require at least one drawing OR one component to be selected before package creation

**Drawing Assignment:**
- **FR-006**: Users MUST be able to multi-select drawings with search and filter capabilities
- **FR-007**: System MUST automatically assign all components from selected drawings to the package via inheritance
- **FR-008**: System MUST show a preview of how many components will be inherited from selected drawings before creation

**Component Assignment:**
- **FR-009**: Users MUST be able to multi-select individual components with filter capabilities (area, system, component type)
- **FR-010**: System MUST support direct component assignment that overrides drawing-level inheritance
- **FR-011**: System MUST clearly distinguish between directly assigned components and inherited components in the UI
- **FR-012**: System MUST enforce component uniqueness - individual components can only belong to ONE test package at a time
- **FR-013**: System MUST validate during assignment that components are not already assigned to another test package and show validation error if conflict detected

**Certificate Form:**
- **FR-014**: System MUST allow users to fill out a certificate form for a package with fields: test type, client, client specification, line number, test pressure (value + unit), test media, temperature (value + unit)
- **FR-015**: System MUST support "Save as Draft" for partial certificate data and "Submit & Begin Testing" for complete certificates
- **FR-016**: System MUST validate required fields (test pressure, test media, temperature) when submitting a complete certificate
- **FR-017**: System MUST auto-populate certificate form with package name and test type from creation data
- **FR-018**: System MUST auto-generate a unique certificate number for each package using sequential format (PKG-001, PKG-002, etc.) scoped per project

**Workflow Stages:**
- **FR-019**: System MUST track 7 sequential workflow stages: Pre-Hydro Acceptance, Test Acceptance, Drain/Flush Acceptance, Post-Hydro Acceptance, Protective Coatings Acceptance, Insulation Acceptance, Final Package Acceptance
- **FR-020**: System MUST enforce sequential stage completion (stage N+1 cannot be started until stage N is completed or skipped)
- **FR-021**: System MUST allow stages to be marked as "Skipped" and MUST require a reason text documenting why the stage is not applicable
- **FR-022**: System MUST support stage-specific data fields stored flexibly (e.g., Pre-Hydro: field walk-down inspector, NDE complete flag; Test Acceptance: test gauge numbers, calibration dates, time held)
- **FR-023**: System MUST track sign-offs for each stage: ICS QC Rep (name + date), Client Rep (name + date), MFG Rep (name + date) as applicable per stage. Initially, only QC users can provide all sign-off types until client user roles are implemented
- **FR-024**: System MUST record who completed each stage and when (audit trail)
- **FR-025**: System MUST provide a visual stepper showing all 7 stages with status indicators (not started, in progress, completed, skipped)
- **FR-026**: System MUST allow completed stages to be edited and MUST log all edits in an audit trail (who edited, when, what changed)

**Data Persistence:**
- **FR-027**: System MUST persist package metadata: name, description, test type, target date, client, specification, line number
- **FR-028**: System MUST persist test parameters: pressure value/unit, media, temperature value/unit
- **FR-029**: System MUST persist workflow stage data: stage status, sign-off details, stage-specific fields, completion metadata
- **FR-030**: System MUST maintain associations between packages and drawings (for inheritance tracking)
- **FR-031**: System MUST maintain associations between packages and components (both direct and inherited)

**Package Lifecycle:**
- **FR-032**: System MUST allow test packages to be deleted
- **FR-033**: System MUST free all component assignments when a package is deleted, making those components available for assignment to other packages

**Platform Constraints:**
- **FR-034**: System MUST support test package workflows on desktop browsers only (no mobile or tablet support required)

**Performance & Scale:**
- **FR-035**: System MUST support up to 500 test packages per project without performance degradation
- **FR-036**: System MUST handle up to 50 concurrent users accessing test package workflows simultaneously
- **FR-037**: System MUST respond to user actions (page loads, form submissions, data queries) within 2 seconds under normal load

### Key Entities

- **Test Package**: A container representing a group of piping components to be tested together. Attributes include name, test type (Hydrostatic, Pneumatic, etc.), certificate details (client, specification, pressure, media, temperature), and current workflow status.

- **Package Stage**: Represents one step in the 7-stage testing workflow. Attributes include stage name (Pre-Hydro, Test Acceptance, etc.), status (not started, in progress, completed, skipped), sign-off details (QC rep, client rep, MFG rep with dates), stage-specific data (varies by stage), and audit metadata (who completed, when).

- **Drawing Assignment**: Links a drawing to a test package, causing all components on that drawing to be inherited by the package (unless a component has a direct assignment that overrides).

- **Component Assignment**: Links an individual component directly to a test package, overriding any drawing-level inheritance for that component.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Project Managers can create a new test package with drawing/component assignment in under 2 minutes
- **SC-002**: 90% of test packages use drawing-based assignment (proving the inheritance model reduces manual work)
- **SC-003**: QC Inspectors can complete and sign off on a workflow stage in under 5 minutes
- **SC-004**: 100% of workflow stage completions are recorded with audit trail (who, when, what data) for compliance reporting
- **SC-005**: Zero test packages proceed to Final Acceptance without completing all required preceding stages (sequential enforcement works)
- **SC-006**: Certificate completion time reduces from average 20 minutes (manual paper form) to under 10 minutes (digital form with validation)
- **SC-007**: Users successfully complete package creation without errors on first attempt 85% of the time

## Spec Completion Checklist *(Constitution v2.0.0)*

**Documentation Completeness:**
- [ ] All user flows documented (mobile AND desktop where applicable)
- [ ] All acceptance criteria written in testable "Given/When/Then" format
- [ ] All edge cases listed with expected behavior

**Validation:**
- [ ] No unresolved questions remain in `/clarify` (or clarifications marked as deferred with justification)
- [ ] All dependencies on other features or systems listed explicitly

**Constitution Note:** Incomplete specs lead to vague plans and implementation churn. Exit criteria prevent premature planning.
