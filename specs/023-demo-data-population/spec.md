# Feature Specification: Demo Project Data Population

**Feature Branch**: `023-demo-data-population`
**Created**: 2025-11-02
**Status**: Draft
**Input**: User description: "Let's write a spec for the demo user data"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Instant Demo Access with Skeleton Structure (Priority: P1)

A potential customer visits the PipeTrak homepage and clicks "Try Demo Project". Within 2 seconds, they are redirected to a dashboard showing a complete project structure (areas, systems, test packages, and welders) ready for exploration, even though the detailed component data is still loading in the background.

**Why this priority**: This is the critical path for converting prospects to demo users. Immediate access prevents abandonment due to loading delays and creates a positive first impression.

**Independent Test**: Can be fully tested by completing demo signup and verifying dashboard access shows skeleton structure (5 areas, 5 systems, 10 packages, 4 welders) within 2 seconds, delivering immediate value even before components load.

**Acceptance Scenarios**:

1. **Given** a visitor on the homepage, **When** they submit the demo signup form, **Then** they are redirected to the dashboard within 2 seconds showing project structure
2. **Given** the skeleton has been created, **When** the user navigates to areas/systems/packages pages, **Then** they see the complete organizational structure immediately
3. **Given** the user is on the dashboard, **When** components are still loading, **Then** they see empty tables with proper structure (no errors or broken UI)

---

### User Story 2 - Realistic Industrial Component Dataset (Priority: P2)

A demo user explores the Components page and sees a realistic industrial construction project with 200 components distributed across spools, valves, supports, flanges, and instruments. Each component has authentic commodity codes, proper area/system assignments, and realistic milestone progress showing an active construction project.

**Why this priority**: This showcases the core value proposition of PipeTrak - managing real-world construction complexity. Without realistic data, prospects cannot evaluate the product's actual capabilities.

**Independent Test**: Can be fully tested by verifying the Components page displays 200 components with correct type distribution (40 spools, 80 supports, 50 valves, 20 flanges, 10 instruments), authentic commodity codes from production projects, and realistic milestone states within 45 seconds of signup.

**Acceptance Scenarios**:

1. **Given** demo skeleton is created, **When** background population completes, **Then** components page shows exactly 200 components with correct type distribution
2. **Given** components are populated, **When** user filters by component type, **Then** they see authentic commodity codes and descriptions matching production data patterns
3. **Given** components have milestone data, **When** user views progress, **Then** they see realistic progression (95% received, 60-70% installed, 25-30% punch, 0% tested/restored)
4. **Given** components are linked to drawings, **When** user views a drawing, **Then** they see appropriate components grouped together (realistic variety: 5-20 components per drawing)

---

### User Story 3 - Field Weld Workflow Demonstration (Priority: P2)

A demo user navigates to the Weld Log page and sees approximately 120 field welds distributed across the 20 drawings. They observe a realistic work-in-progress state where some welds have assigned welders (showing completed work) while others are unassigned (showing pending workflow). The milestone states demonstrate proper sequencing (Fit-Up → Weld Made → Punch).

**Why this priority**: Field weld tracking is a differentiating feature of PipeTrak. Prospects need to see realistic weld data to understand the product's welding workflow capabilities.

**Independent Test**: Can be fully tested by verifying Weld Log displays ~120 field welds (all butt or socket, carbon steel), ~65% have "Weld Made" complete with welder assignments, and milestone progression follows proper sequence.

**Acceptance Scenarios**:

1. **Given** field welds are populated, **When** user views the Weld Log, **Then** they see approximately 120 welds linked to drawings (not components)
2. **Given** welds have milestone states, **When** user filters by completion status, **Then** they see ~90% at Fit-Up, ~65% at Weld Made with welder assignments, ~25% at Punch
3. **Given** welds have welder assignments, **When** user views weld details, **Then** assigned welds show welder stamp (JD-123, SM-456, TR-789, or KL-012) and date within past 30 days
4. **Given** welds are in progress, **When** user views the data, **Then** they see 0% tested or restored (active construction, not ready for testing)

---

### User Story 4 - Multi-Dimensional Project Organization (Priority: P3)

A demo user navigates through different project views (by Area, by System, by Test Package) and sees components and drawings properly distributed across 5 areas (Pipe Rack, ISBL, Containment Area, Water Process, Cooling Tower), 5 systems (Air, Nitrogen, Steam, Process, Condensate), and 10 test packages (TP-01 through TP-10).

**Why this priority**: This demonstrates PipeTrak's organizational capabilities but is less critical than showing the actual component data and workflow states.

**Independent Test**: Can be fully tested by filtering/grouping components by area, system, and package, verifying proper distribution and no orphaned data.

**Acceptance Scenarios**:

1. **Given** components are assigned to areas, **When** user filters by area, **Then** they see components distributed across all 5 areas
2. **Given** components are assigned to systems, **When** user groups by system, **Then** they see components distributed across all 5 systems
3. **Given** components are assigned to packages, **When** user filters by test package, **Then** they see components distributed across all 10 packages (TP-01 through TP-10)
4. **Given** drawings have area/system metadata, **When** user views drawings, **Then** each drawing shows proper area and system assignment

---

### Edge Cases

- What happens when background population fails after skeleton creation? (User has empty project with structure, can manually import data)
- How does the system handle slow network conditions during background population? (Progressive loading continues, user sees data appear incrementally)
- What happens if a user navigates to a page while components are still loading? (Empty tables with proper headers, no errors, data appears when ready)
- How does the system prevent duplicate demo data if population is retried? (Idempotent checks before insertion)
- What happens if the Edge Function times out during skeleton creation? (Error shown to user, no account created, can retry)

## Requirements *(mandatory)*

### Functional Requirements

**Skeleton Creation (Synchronous)**

- **FR-001**: System MUST create demo project skeleton (areas, systems, packages, welders) within 2 seconds of signup submission
- **FR-002**: System MUST create exactly 5 areas: Pipe Rack, ISBL, Containment Area, Water Process, Cooling Tower
- **FR-003**: System MUST create exactly 5 systems: Air, Nitrogen, Steam, Process, Condensate
- **FR-004**: System MUST create exactly 10 test packages named TP-01 through TP-10
- **FR-005**: System MUST create exactly 4 welders with stamps JD-123, SM-456, TR-789, KL-012 and realistic names
- **FR-006**: System MUST grant user immediate dashboard access after skeleton creation completes
- **FR-007**: System MUST invoke background population process asynchronously after skeleton creation

**Component Population (Asynchronous)**

- **FR-008**: System MUST populate exactly 200 components with distribution: 40 spools, 80 supports, 50 valves, 20 flanges, 10 instruments
- **FR-009**: System MUST assign 2 supports per spool (80 supports for 40 spools)
- **FR-010**: System MUST use authentic commodity codes sourced from existing production projects
- **FR-011**: System MUST assign each component to an area, system, and test package
- **FR-012**: System MUST create components with proper identity keys matching their component type
- **FR-013**: System MUST complete component population within 45 seconds

**Drawing Population**

- **FR-014**: System MUST create exactly 20 drawings with realistic variety (5-20 components per drawing)
- **FR-015**: System MUST distribute drawings across all 5 areas and 5 systems
- **FR-016**: System MUST use naming pattern ISO-{AREA}-{SEQ} for drawing numbers
- **FR-017**: System MUST link components to drawings via drawing_id foreign key

**Field Weld Population**

- **FR-018**: System MUST create approximately 120 field welds (3 welds per spool)
- **FR-019**: System MUST link field welds to drawings (NOT to component records)
- **FR-020**: System MUST create only butt welds and socket welds, all with carbon steel material
- **FR-021**: System MUST assign welders ONLY to welds where "Weld Made" milestone is true
- **FR-022**: System MUST assign welders to approximately 65% of field welds (those with "Weld Made" complete)
- **FR-023**: System MUST distribute welder assignments evenly across the 4 welders
- **FR-024**: System MUST assign weld dates within the past 30 days for completed welds

**Milestone Progression**

- **FR-025**: System MUST apply realistic milestone progression to all components and welds
- **FR-026**: System MUST ensure NO components or welds reach "Test" or "Restore" milestones (active construction state)
- **FR-027**: System MUST follow proper milestone sequencing for spools: Receive → Erect → Connect → Punch
- **FR-028**: System MUST follow proper milestone sequencing for valves/supports/flanges/instruments: Receive → Install → Punch
- **FR-029**: System MUST follow proper milestone sequencing for field welds: Fit-Up → Weld Made → Punch
- **FR-030**: System MUST apply milestone distribution: ~90-95% received, ~60-70% installed/erected, ~25-30% punch, 0% test/restore
- **FR-031**: System MUST respect milestone dependencies (cannot install without receive, cannot punch without install, etc.)

**Data Integrity**

- **FR-032**: System MUST ensure all component identity keys match their component type schema
- **FR-033**: System MUST ensure all foreign key relationships are valid (drawing_id, area_id, system_id, package_id, welder_id)
- **FR-034**: System MUST make background population idempotent (safe to retry without creating duplicates)
- **FR-035**: System MUST use database-generated UUIDs for all entity IDs
- **FR-036**: System MUST use natural keys (drawing numbers, component tags, weld numbers) for lookup during insertion

**Error Handling**

- **FR-037**: System MUST show error message to user if skeleton creation fails
- **FR-038**: System MUST NOT create user account if skeleton creation fails
- **FR-039**: System MUST allow user to retry signup if skeleton creation fails
- **FR-040**: System MUST leave user with empty project (skeleton only) if background population fails
- **FR-041**: System MUST log errors for debugging if background population fails

### Key Entities

- **Demo Skeleton**: Foundation project structure created synchronously (5 areas, 5 systems, 10 packages, 4 welders) enabling immediate user access
- **Component**: Physical industrial item (spool, valve, support, flange, instrument) with type-specific identity key, commodity code, area/system/package assignments, and milestone states
- **Drawing**: Construction isometric drawing with area/system metadata, linked to 5-20 components
- **Field Weld**: Weld record linked to drawing (not component) with weld type (butt/socket), material (carbon steel), milestone states, and optional welder assignment
- **Welder**: Person who performs welding work, identified by stamp (JD-123, SM-456, TR-789, KL-012) and assigned to completed welds
- **Milestone State**: Progress tracking for component or weld, following type-specific sequencing rules
- **Seed Data File**: Single declarative TypeScript file (~2,500-3,000 lines) containing all demo data definitions with realistic commodity codes and distributions

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Demo users can access dashboard with complete project structure within 2 seconds of signup submission
- **SC-002**: Demo users see full dataset (200 components, 20 drawings, 120 welds) within 45 seconds of signup
- **SC-003**: Components display authentic commodity codes matching production project patterns (verifiable by comparing to existing production data)
- **SC-004**: 100% of components have valid milestone states respecting type-specific sequencing rules
- **SC-005**: 100% of field welds are correctly linked to drawings (not components) with 0 orphaned weld records
- **SC-006**: Approximately 65% of field welds have assigned welders matching the "Weld Made" milestone state
- **SC-007**: 0% of components or welds reach "Test" or "Restore" milestones (active construction validation)
- **SC-008**: Background population process completes successfully 100% of the time without timeout errors
- **SC-009**: Background population process is idempotent (can be retried without creating duplicate data)
- **SC-010**: Demo users can filter/group by area, system, and package with components properly distributed across all categories

## Dependencies

- Existing Feature 021: Public Homepage with demo signup flow
- Existing database schema for components, drawings, field welds, areas, systems, test packages, welders
- Existing progress templates defining milestone sequences for each component type
- Supabase Edge Function infrastructure with async invocation capability
- Production project data for commodity code sourcing

## Assumptions

- Demo projects use the same database schema as production projects (no special demo-only tables)
- Edge Function timeout limit is 10 seconds for synchronous operations
- Background Edge Functions have sufficient execution time for 30-45 second operations
- Existing RLS policies properly isolate demo project data
- Production commodity codes can be reused in demo data without privacy concerns
- Demo cleanup process (7-day retention from Feature 021) handles all populated data
- Users have modern browsers with JavaScript enabled for progressive loading experience
- Natural key lookups (drawing numbers, component tags) are sufficient for establishing relationships during insertion
