# Feature Specification: Aggregate Threaded Pipe Import

**Feature Branch**: `027-aggregate-threaded-pipe-import`
**Created**: 2025-11-14
**Last Updated**: 2025-11-14 (Refined after /speckit.analyze findings)
**Status**: Draft
**Input**: User description: "the plan to edit the import of threaded piping"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Import Threaded Pipe as Aggregate Quantity (Priority: P1)

When a project manager imports a material takeoff CSV containing threaded piping, the system creates a single component record representing the total linear footage for each unique drawing+commodity+size combination, rather than creating individual component instances.

**Why this priority**: Core functionality that changes the fundamental import behavior for threaded piping. Without this, the feature cannot work.

**Independent Test**: Can be fully tested by importing a CSV with threaded pipe rows and verifying one component is created per unique drawing+commodity+size (regardless of quantity) and delivers accurate linear footage tracking.

**Acceptance Scenarios**:

1. **Given** a CSV with one threaded pipe row (Drawing: P-001, Commodity: PIPE-SCH40, Size: 1", QTY: 100), **When** user imports the CSV, **Then** system creates ONE component with `identity_key.pipe_id = "P001-1-PIPE-SCH40-AGG"` and `attributes.total_linear_feet = 100`

2. **Given** a CSV with multiple threaded pipe rows with different identities, **When** user imports the CSV, **Then** system creates one aggregate component per unique drawing+commodity+size combination

3. **Given** a CSV with non-threaded-pipe components (valves, instruments), **When** user imports the CSV, **Then** those components continue to use existing quantity explosion logic (discrete instances)

---

### User Story 2 - Sum Quantities for Duplicate Identities (Priority: P1)

When multiple CSV rows have the same drawing+commodity+size for threaded pipe, the system combines them into a single component with total linear footage equal to the sum of all quantities.

**Why this priority**: Critical for handling re-imports and CSVs with duplicate rows. Prevents data corruption and ensures accurate quantity tracking.

**Independent Test**: Can be tested by importing a CSV with duplicate threaded pipe identities and verifying quantities are summed (not overwritten or creating duplicate components).

**Acceptance Scenarios**:

1. **Given** a CSV with two rows (P-001, PIPE-SCH40, 1", QTY: 50 each), **When** user imports the CSV, **Then** system creates ONE component with `total_linear_feet = 100` and `line_numbers = ["101", "102"]`

2. **Given** an existing aggregate threaded pipe component with 50 LF and Fabricate milestone at 50 LF complete, **When** user imports a CSV adding 50 LF for the same identity, **Then** system updates `total_linear_feet` to 100 and preserves existing absolute LF milestone values (Fabricate remains 50 LF, not 100 LF)

3. **Given** an existing component with milestone progress (e.g., Fabricate_LF: 50), **When** quantity is updated via re-import from 50 LF to 100 LF, **Then** absolute milestone values are preserved (still 50 LF fabricated) and user receives a warning: "Milestone values preserved. Review progress for updated quantities." The displayed percentage automatically recalculates to 50% (50 LF / 100 LF).

---

### User Story 3 - Display Aggregate Linear Footage in Component Table (Priority: P2)

When users view threaded pipe components in the drawing table, they see the total linear footage and contributing line numbers displayed (e.g., "101 +2 more (100 LF)") to understand the quantity being tracked and its sources.

**Why this priority**: Essential for user clarity - without this, users cannot distinguish aggregate components from discrete instances, understand what the quantity represents, or trace which line numbers contributed.

**Independent Test**: Can be tested by viewing imported aggregate threaded pipe components in the component table and verifying the line number list and LF suffix appear correctly.

**Acceptance Scenarios**:

1. **Given** an aggregate threaded pipe component with 100 LF from line numbers ["101", "205", "301"], **When** user views the component in the drawing table, **Then** line number column displays "101 +2 more (100 LF)" format

2. **Given** user hovers over "101 +2 more" text, **When** tooltip appears, **Then** tooltip displays full list: "Line numbers: 101, 205, 301"

3. **Given** an aggregate threaded pipe with single line number ["101"], **When** user views the component, **Then** line number column displays "101 (100 LF)" without "+X more" suffix

4. **Given** a non-aggregate component (valve, instrument, or legacy discrete threaded pipe), **When** user views the component, **Then** line number displays without LF suffix (existing behavior)

5. **Given** an aggregate component missing `total_linear_feet` attribute, **When** user views the component, **Then** system falls back to displaying `original_qty` value

---

### User Story 4 - Show Linear Feet on Milestone Input (Priority: P2)

When users update partial milestone percentages for aggregate threaded pipe, they see helper text showing the linear footage complete (e.g., "75 LF of 100 LF") to understand the absolute quantity represented by the percentage.

**Why this priority**: Improves user experience by clarifying that milestone percentages represent linear footage, not just abstract progress. Helps prevent data entry errors.

**Independent Test**: Can be tested by editing milestone percentages for aggregate threaded pipe and verifying helper text displays correctly without changing input mechanism.

**Acceptance Scenarios**:

1. **Given** an aggregate threaded pipe with 100 LF total and Fabricate_LF: 75, **When** user views the Fabricate milestone input, **Then** input displays calculated percentage 75% and helper text shows "75 LF of 100 LF" below the input

2. **Given** user enters 50% in the Fabricate milestone input, **When** input loses focus or user presses Enter, **Then** system stores Fabricate_LF: 50 (absolute value) and helper text updates to "50 LF of 100 LF"

3. **Given** a non-aggregate component, **When** user edits milestone percentages, **Then** no helper text appears (existing behavior)

4. **Given** user updates milestone percentage from 75% to 50%, **When** value changes, **Then** helper text updates in real-time from "75 LF of 100 LF" to "50 LF of 100 LF"

---

### Edge Cases

- What happens when a CSV contains both aggregate threaded pipe (pipe_id with -AGG suffix) and legacy discrete instances (pipe_id with -001, -002 suffixes) for the same drawing+commodity+size?
  - **Handling**: Both can coexist. Uniqueness constraint allows both since pipe_id values are different (e.g., "P001-1-PIPE-SCH40-AGG" vs "P001-1-PIPE-SCH40-001"). UI shows both until users manually consolidate.

- What happens when re-import adds quantity to a component that already has milestone progress?
  - **Handling**: Preserve existing absolute milestone values (Fabricate_LF, Install_LF, etc.) and display warning toast: "Milestone values preserved. Review progress for updated quantities." Displayed percentages automatically recalculate based on new total (e.g., 50 LF / 100 LF = 50%). User must manually update absolute LF values if needed.

- What happens when CSV contains QTY ≤ 0 for threaded pipe?
  - **Handling**: Skip row with validation error. Do not create component or allow negative total_linear_feet.

- What happens when existing threaded pipe component is missing `total_linear_feet` attribute?
  - **Handling**: Frontend falls back to `attributes.original_qty` for display. Optional data migration can backfill from `original_qty`.

- What happens when importing threaded pipe with same identity (drawing+commodity+size) but different line numbers?
  - **Handling**: Both rows combine into one aggregate component. The `line_numbers` array stores all contributing line numbers (e.g., ["101", "205", "301"]). Display shows first line number with "+X more" suffix if multiple.

- What happens when CSV validator detects duplicate threaded pipe identities?
  - **Handling**: Validator allows duplicates specifically for threaded_pipe type (does not fail validation). Import logic in Edge Function handles summing quantities and merging line_numbers arrays.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST create single aggregate component for threaded_pipe type during CSV import (one component per unique drawing+commodity+size combination)

- **FR-002**: System MUST store milestone progress as absolute linear feet in dedicated fields (`current_milestones.Fabricate_LF`, `current_milestones.Install_LF`, etc.) for aggregate threaded pipe components, not as percentages

- **FR-003**: System MUST use identity key structure `{pipe_id: "${drawing}-${size}-${commodity}-AGG"}` for aggregate threaded pipe components, consistent with existing production schema (e.g., "P001-1-PIPE-SCH40-AGG")

- **FR-004**: System MUST sum quantities when multiple CSV rows match the same threaded pipe identity (drawing+commodity+size)

- **FR-005**: System MUST preserve existing absolute milestone values (Fabricate_LF, Install_LF, etc.) when updating total_linear_feet via re-import

- **FR-006**: System MUST display aggregate threaded pipe components with line number list and "(X LF)" suffix in component table (format: "101 +2 more (100 LF)" or "101 (100 LF)" for single line)

- **FR-007**: System MUST show helper text "{linearFeet} LF of {totalLF} LF" below percentage inputs for aggregate threaded pipe milestone updates

- **FR-008**: System MUST continue using quantity explosion logic for all non-threaded-pipe component types (existing behavior unchanged)

- **FR-009**: System MUST reject CSV rows with QTY ≤ 0 for threaded pipe with validation error

- **FR-010**: System MUST display warning toast when re-import updates quantity: "Milestone values preserved. Review progress for updated quantities."

- **FR-011**: System MUST calculate displayed milestone percentages as `Math.round((milestone_LF / total_linear_feet) * 100)` for UI display purposes (reverse calculation from absolute LF storage)

- **FR-012**: System MUST fall back to `attributes.original_qty` if `total_linear_feet` is missing for legacy components

- **FR-013**: CSV validator MUST allow duplicate identity keys specifically for threaded_pipe type to enable quantity summing during import (relaxes standard duplicate rejection logic)

- **FR-014**: System MUST store all contributing line numbers in `attributes.line_numbers` array when multiple CSV rows combine into one aggregate component

### Key Entities

- **Aggregate Threaded Pipe Component**: A component record representing the total linear footage of threaded piping for a specific drawing+commodity+size combination. Key attributes:
  - `component_type`: Always "threaded_pipe"
  - `identity_key.pipe_id`: Aggregate format `"${drawing}-${size}-${commodity}-AGG"` (e.g., "P001-1-PIPE-SCH40-AGG")
  - `attributes.total_linear_feet`: Total linear feet tracked (numeric)
  - `attributes.line_numbers`: Array of contributing line numbers (e.g., ["101", "205", "301"])
  - `current_milestones`: Absolute linear feet complete per milestone (e.g., `{Fabricate_LF: 75, Install_LF: 50, ...}`)
  - UI displays percentages calculated as `(milestone_LF / total_linear_feet) * 100`

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: CSV import with 100 LF threaded pipe creates exactly 1 component (not 100 discrete instances)

- **SC-002**: Re-importing the same threaded pipe identity sums quantities correctly without creating duplicate components

- **SC-003**: Users can view total linear footage and contributing line numbers for threaded pipe components directly in the component table without opening detail view

- **SC-004**: Users can understand milestone progress in absolute linear feet (e.g., "75 LF of 100 LF fabricated") while maintaining existing percentage input mechanism

- **SC-005**: Non-threaded-pipe components continue to work with existing import logic without any breaking changes

- **SC-006**: All tests pass with ≥70% code coverage per project constitution requirements

- **SC-007**: Milestone data remains accurate after re-imports (absolute LF values preserved, percentages recalculated correctly)

## Assumptions

- Milestone storage model: Absolute linear feet stored in database (`Fabricate_LF: 50`), percentages calculated for UI display (`50 LF / 100 LF = 50%`)

- Identity uniqueness: Drawing+commodity+size combination uniquely identifies threaded pipe runs via pipe_id format `"${drawing}-${size}-${commodity}-AGG"`

- Legacy data handling: Existing discrete threaded pipe components (if any) use different pipe_id format (`-001`, `-002` suffixes) and can coexist with new aggregate model (`-AGG` suffix)

- Display format: Line number list with "+X more" suffix and "(X LF)" provides sufficient clarity without expandable detail view

- Input mechanism: Users continue to enter percentages (0-100) in milestone inputs; system converts to absolute LF for storage, helper text provides context

- Progress calculation: Existing `calculate_component_percent` trigger function requires migration update to handle new milestone storage schema (absolute LF instead of percentages)

- CSV validator: Duplicate detection logic must be relaxed specifically for threaded_pipe type to allow quantity summing

## Dependencies

- **Feature 009**: CSV Material Takeoff Import - Base import infrastructure and transaction logic
- **Feature 025**: Threaded Pipe Inline Milestone Input - UI components for percentage input that will be enhanced
- **Database**: Supabase Edge Function (`/supabase/functions/import-takeoff/`) requires modification
- **Frontend**: ComponentRow and PartialMilestoneInput components require enhancement
- **Migration**: Database migration required to convert milestone storage from percentages to absolute LF for threaded_pipe

## Out of Scope

- Migration/consolidation of existing discrete threaded pipe components to aggregate model (manual re-import required if desired)
- Separate linear feet input fields (users continue entering percentages, system stores as absolute LF)
- Expandable detail view showing footage per milestone
- Automatic milestone value adjustment when quantity changes (user must manually review)
- New component type creation (reuses existing "threaded_pipe" type)

## Migration Requirements

**Migration 00097**: Threaded Pipe Aggregate Model

**Purpose**: Convert threaded_pipe milestone storage from percentages to absolute linear feet, add line_numbers array support

**Actions**:
1. Add `line_numbers` JSONB array to components.attributes for threaded_pipe
2. Migrate existing threaded_pipe components:
   - Convert `current_milestones.Fabricate` (percentage 0-1) → `current_milestones.Fabricate_LF` (absolute LF = percentage * total_linear_feet)
   - Convert `current_milestones.Install` → `current_milestones.Install_LF`
   - Convert `current_milestones.Erect` → `current_milestones.Erect_LF`
   - Convert `current_milestones.Connect` → `current_milestones.Connect_LF`
   - Convert `current_milestones.Support` → `current_milestones.Support_LF`
   - Discrete milestones (Punch, Test, Restore) remain boolean
3. Backfill `line_numbers` from `attributes.line_number` (convert single value to array)
4. Update `calculate_component_percent` trigger to calculate weighted average from absolute LF values for threaded_pipe:
   - Read Fabricate_LF, Install_LF, etc.
   - Calculate percentages: `(milestone_LF / total_linear_feet) * weight`
   - Sum weighted percentages for total percent_complete

**Rollback**: Reverse calculation (absolute LF → percentage) if migration needs to be reverted
