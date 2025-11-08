# Feature Specification: Flexible CSV Import

**Feature Branch**: `024-flexible-csv-import`
**Created**: 2025-11-03
**Status**: Draft
**Input**: User description: "Flexible CSV Import Implementation Plan - Enhance component import system to support flexible CSV formats with auto-detection, metadata auto-creation, and preview capability. Uses client-side parsing + server-side import architecture."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Upload CSV with Non-Standard Column Names (Priority: P1)

As a project manager, I want to upload CSV files with different column naming conventions (e.g., "DRAWINGS" instead of "DRAWING") so that I don't have to manually edit files to match exact column names before importing.

**Why this priority**: This is the core value proposition - eliminating manual CSV preprocessing. Without this, users must continue editing files, defeating the purpose of flexibility.

**Independent Test**: Can be fully tested by uploading a CSV with "DRAWINGS" column (instead of "DRAWING") and verifying components are created correctly. Delivers immediate value by eliminating manual file editing.

**Acceptance Scenarios**:

1. **Given** a CSV file with "DRAWINGS" column header, **When** user uploads the file, **Then** system auto-detects "DRAWINGS" maps to "DRAWING" field
2. **Given** a CSV with "Cmdty Code" column (case variation), **When** system parses file, **Then** system maps it to "CMDTY CODE" field with 95% confidence
3. **Given** a CSV with "Item #" column (unmapped), **When** system processes file, **Then** system stores value in component attributes without error
4. **Given** a CSV missing required "DRAWING" column, **When** user uploads file, **Then** system shows validation error before import

---

### User Story 2 - Preview Import Before Execution (Priority: P1)

As a project manager, I want to see a preview of what will be imported (column mappings, sample data, validation results) before committing the import so that I can catch errors early and avoid costly rollbacks.

**Why this priority**: Tied with P1 because preview is essential for confident use of flexible imports. Without preview, users fear data corruption from incorrect mappings.

**Independent Test**: Can be fully tested by uploading a CSV and verifying preview shows correct mappings, sample rows, validation warnings, and component counts. Delivers value by building user confidence and catching errors before data changes.

**Acceptance Scenarios**:

1. **Given** a CSV file uploaded, **When** system parses file, **Then** preview displays within 3 seconds showing file summary (name, size, row counts)
2. **Given** preview is displayed, **When** user views column mappings section, **Then** system shows each detected mapping with confidence percentage (100%, 95%, 85%)
3. **Given** preview shows validation results, **When** CSV contains 12 Gasket rows (unsupported type), **Then** system displays warning "12 rows skipped: Unsupported component type 'Gasket'" with affected row numbers
4. **Given** preview displays sample data, **When** user views sample table, **Then** system shows first 10 valid rows with only mapped columns
5. **Given** preview is complete, **When** user clicks "Confirm Import", **Then** system proceeds to server-side import with displayed data

---

### User Story 3 - Auto-Create Metadata from CSV (Priority: P2)

As a project manager, I want the system to automatically create Area, System, and Test Package records from CSV data so that I don't have to manually pre-create metadata before importing components.

**Why this priority**: High value but depends on P1 working correctly. Reduces import preparation time significantly but isn't blocking for basic import functionality.

**Independent Test**: Can be fully tested by uploading a CSV containing Area="B-68" and System="HC-05" where System doesn't exist yet, and verifying System record is created and linked to imported components. Delivers value by eliminating metadata pre-creation step.

**Acceptance Scenarios**:

1. **Given** CSV contains Area="B-68" that exists in database, **When** preview displays metadata analysis, **Then** system shows "Areas: B-68 (existing)" with green checkmark
2. **Given** CSV contains System="HC-05" that doesn't exist, **When** preview displays metadata analysis, **Then** system shows "Systems: HC-05 (will create)" with yellow badge
3. **Given** user confirms import with new System="HC-05", **When** server processes import, **Then** system creates System record and links all components to new System ID
4. **Given** metadata creation fails during import, **When** transaction rolls back, **Then** system returns error and no components or metadata are created (all-or-nothing)
5. **Given** CSV has empty System column for some rows, **When** import processes, **Then** those components are created without System link (null System ID)

---

### User Story 4 - Handle Drawing Sheets as Separate Entities (Priority: P3)

As a project manager, I want drawing sheets (e.g., "P-91010_1 01of01", "P-91010_1 02of02") treated as separate drawings so that components are organized by their actual sheet location.

**Why this priority**: Important for accurate organization but not blocking for initial import capability. Users can work around this by manually editing CSVs if needed.

**Independent Test**: Can be fully tested by uploading CSV with "P-91010_1 01of01" and "P-91010_1 02of02" and verifying two separate drawing records are created. Delivers value by maintaining sheet-level organization from source data.

**Acceptance Scenarios**:

1. **Given** CSV has rows with "P-91010_1 01of01" and "P-91010_1 02of02", **When** system processes drawings, **Then** system creates two separate drawing records
2. **Given** drawing "P-91010_1 01of01" already exists, **When** system processes same drawing again, **Then** system reuses existing drawing record (no duplicate)
3. **Given** component on "P-91010_1 01of01", **When** component is created, **Then** component links to "P-91010_1 01of01" drawing (not "P-91010_1")

---

### User Story 5 - Skip Unsupported Component Types with Warnings (Priority: P3)

As a project manager, I want the system to skip rows with unsupported component types (like "Gasket") and show clear warnings so that valid components still import successfully without manual CSV editing.

**Why this priority**: Nice-to-have quality of life improvement. Not critical because users can pre-filter CSVs or this can be added later without breaking existing functionality.

**Independent Test**: Can be fully tested by uploading CSV with 12 Gasket rows and 156 valid rows, and verifying preview shows "12 rows skipped" warning and import creates 156 components. Delivers value by eliminating manual filtering step.

**Acceptance Scenarios**:

1. **Given** CSV contains 12 rows with TYPE="Gasket" (unsupported), **When** system validates file, **Then** preview shows "12 rows skipped: Unsupported component type 'Gasket'" with affected row numbers (3, 11, 23, 39, 40, 48, 53, ...)
2. **Given** validation categorizes rows as valid/skipped, **When** preview displays validation summary, **Then** system shows "156 valid rows, 14 rows skipped, 0 errors"
3. **Given** user confirms import with skipped rows, **When** server processes import, **Then** system creates only 156 valid components (Gasket rows not sent to server)

---

### Edge Cases

- **What happens when CSV has duplicate column names?** System uses first occurrence and ignores duplicates, shows warning in preview
- **What happens when multiple columns map to same required field?** System flags as ambiguous mapping error, blocks import until user resolves
- **What happens when CSV exceeds 10,000 rows?** System rejects file with error: "File exceeds maximum 10,000 rows"
- **What happens when CSV file is malformed (invalid encoding, inconsistent columns)?** System shows parsing error with specific issue, doesn't proceed to preview
- **What happens when metadata creation succeeds but component insertion fails?** Transaction rolls back all changes including metadata (all-or-nothing)
- **What happens when user navigates away during import?** Import continues on server (Edge Function), user can return to see final result
- **What happens when same identity key exists in CSV and database?** System detects duplicate during validation, shows error with specific row numbers and drawing names
- **What happens when drawing normalization results in collision?** System treats as same drawing (e.g., "P  -  001" and "P-001" both normalize to "P - 001"), uses existing drawing record

## Requirements *(mandatory)*

### Functional Requirements

#### Column Mapping
- **FR-001**: System MUST auto-detect column mappings using three-tier matching: exact match (100% confidence), case-insensitive match (95% confidence), partial match with synonyms (85% confidence)
- **FR-002**: System MUST support required field variations: DRAWING/DRAWINGS, TYPE, QTY, CMDTY CODE/Commodity Code/Cmdty Code
- **FR-003**: System MUST support optional metadata fields: Area, System, Test Package (case-insensitive)
- **FR-004**: System MUST store unmapped columns in component `attributes` JSONB field (e.g., "Item #" → `attributes.item_number`)
- **FR-005**: System MUST reject import if any required field (DRAWING, TYPE, QTY, CMDTY CODE) cannot be mapped

#### Validation
- **FR-006**: System MUST validate required fields are non-empty (DRAWING, TYPE, QTY, CMDTY CODE)
- **FR-007**: System MUST validate component TYPE is one of 11 supported types: Spool, Field_Weld, Valve, Instrument, Support, Pipe, Fitting, Flange, Tubing, Hose, Misc_Component, Threaded_Pipe (case-insensitive)
- **FR-008**: System MUST validate QTY is numeric integer ≥ 0
- **FR-009**: System MUST categorize rows as: valid (will import), skipped (invalid type or zero quantity), error (missing required field or duplicate identity key)
- **FR-010**: System MUST detect duplicate identity keys within CSV file and show error with affected row numbers
- **FR-011**: System MUST maintain all-or-nothing transaction semantics (any validation error on server rolls back entire import)

#### Metadata Processing
- **FR-012**: System MUST extract unique Area, System, Test Package values from CSV during preview
- **FR-013**: System MUST check which metadata values already exist in database and categorize as "existing" or "will create"
- **FR-014**: System MUST auto-create Area, System, Test Package records during import if they don't exist (within same transaction as component creation)
- **FR-015**: System MUST link components to metadata via foreign keys (area_id, system_id, test_package_id)
- **FR-016**: System MUST handle empty/null metadata columns by creating components without metadata links

#### Preview Display
- **FR-017**: System MUST display preview within 3 seconds for files up to 1,000 rows
- **FR-018**: Preview MUST show file summary: filename, file size, total rows, valid rows, skipped rows
- **FR-019**: Preview MUST show column mappings with confidence percentages and indication of ignored columns
- **FR-020**: Preview MUST show metadata analysis: unique values categorized as existing or will-create
- **FR-021**: Preview MUST show validation results: warnings (skipped rows with reasons) and errors (would block import)
- **FR-022**: Preview MUST show sample data table with first 10 valid rows using only mapped columns
- **FR-023**: Preview MUST show component counts by type (Spools: X, Valves: Y, etc.)
- **FR-024**: Preview MUST provide Cancel (return to upload) and Confirm Import actions

#### Import Execution
- **FR-025**: System MUST accept structured JSON payload from client (not raw CSV) containing parsed rows and column mappings
- **FR-026**: System MUST process drawings: normalize using existing logic, create if new, fetch if exists, treat sheet indicators as part of drawing name (no stripping)
- **FR-027**: System MUST apply quantity explosion for QTY > 1 (create multiple components with sequential identity keys)
- **FR-028**: System MUST generate SIZE-aware identity keys using existing normalization logic
- **FR-029**: System MUST assign progress template based on component type using existing logic
- **FR-030**: System MUST batch insert components (1,000 per batch) for performance
- **FR-031**: System MUST complete import of 1,000-row CSV in under 60 seconds
- **FR-032**: System MUST return detailed results: components created count, drawings created/updated counts, metadata created counts, components by type, duration in milliseconds

### Key Entities

- **CSV Column Mapping**: Represents detected relationship between CSV column header and expected field name, includes confidence percentage (100%, 95%, 85%)
- **Validation Result**: Categorization of each CSV row as valid, skipped (with reason: unsupported type, zero quantity, missing optional field), or error (with reason: missing required field, duplicate identity key)
- **Metadata Discovery**: Collection of unique Area, System, Test Package values from CSV with categorization as existing (in database) or will-create (new record needed)
- **Import Preview State**: Aggregation of column mappings, validation results, metadata discovery, sample data, and component counts for user review before import execution
- **Import Transaction**: Server-side processing unit that creates metadata records, processes drawings, generates components with identity keys, and links to metadata - all within single atomic transaction

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: User's Dark Knight CSV (170 rows, 14 Gasket rows) imports successfully with 156 valid components created and 14 rows skipped with clear warnings
- **SC-002**: HC-05 System record is auto-created during import and all 156 components are correctly linked to System via foreign key
- **SC-003**: Preview displays in under 3 seconds for CSV files up to 1,000 rows
- **SC-004**: Import completes in under 60 seconds for 1,000-row CSV files (existing performance target maintained)
- **SC-005**: Column mapping detects "DRAWINGS" → "DRAWING" with 95% confidence and successfully imports components
- **SC-006**: Preview shows correct sample data (first 10 valid rows) and validation results match actual import outcome
- **SC-007**: Drawing sheets "P-91010_1 01of01" and "P-91010_1 02of02" are created as two separate drawing records
- **SC-008**: All tests pass with ≥70% overall coverage (≥80% for CSV utilities in src/lib/csv/, ≥60% for UI components)

### Assumptions

- Papa Parse library is suitable for client-side CSV parsing (proven, widely-used library)
- Existing normalization logic (drawing, size, identity key generation) remains unchanged
- Existing 11 component types list is sufficient (Gasket and other types can be skipped for now)
- Users have modern browsers with JavaScript enabled (required for client-side parsing)
- CSV files follow RFC 4180 standard (quoted fields, comma-separated, CRLF line endings)
- Metadata (Area, System, Test Package) names are globally unique within project (existing database constraint)
- Current file size limit (5MB) and row limit (10,000) remain acceptable
- Supabase Edge Function payload limits (6MB) accommodate structured JSON from 10,000-row CSVs
- All-or-nothing transaction semantics are acceptable (no partial imports required)
- Preview accuracy depends on client-side validation matching server-side validation exactly (requires shared validation logic or contract testing)

## Out of Scope

- Manual column mapping UI (user cannot override auto-detected mappings in initial release)
- Saved mapping templates (cannot save and reuse mappings for future imports)
- Update existing components (import always creates new components, never updates)
- Dry-run mode separate from preview (preview serves as dry-run)
- Undo/rollback after successful import (would require audit trail and reverse operations)
- Progress bar during server-side import (Edge Function returns single final response)
- Import history details (existing UI shows recent imports but no detailed history)
- CSV template download (users must know expected format)
- Project-specific component type configuration (hardcoded 11 types only)
- Configurable validation rules per project (global rules only)
- Batch import of multiple CSV files simultaneously (single file per import session)
- Advanced duplicate resolution strategies (beyond detect and error)
- Client-side duplicate detection against existing database components (server-side only)
