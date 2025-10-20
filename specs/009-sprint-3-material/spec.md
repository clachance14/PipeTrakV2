# Feature Specification: Material Takeoff Import Pipeline

**Feature Branch**: `009-sprint-3-material`
**Created**: 2025-10-17
**Status**: Draft
**Input**: User description: "Sprint 3: Material Takeoff Import Pipeline - Import CSV with quantity explosion, drawing auto-creation, and component tracking for 6 types"

---

## User Scenarios & Testing

### Primary User Story

A Project Manager or Project Controls person receives a material takeoff CSV file from the engineering team containing all components from fully-engineered IFC (Issued For Construction) drawing packages. The CSV lists material line items by drawing with quantities (e.g., "DRAIN-1 has 2 flanges, 1 blind flange, 1 valve").

The Project Manager uploads this CSV file to PipeTrak. The system processes each row, creates or links drawings automatically, and explodes quantities into discrete trackable components. For example, a row with "4 valves" becomes 4 separate valve components (VBALU-SECBFLR00M-006-001, -002, -003, -004), each with its own milestone tracking. After import, foremen can immediately begin tracking progress on all components (Receive, Install, Test, etc.).

The system validates the CSV during import, rejecting files with errors and providing downloadable error reports showing exactly which rows and columns have issues (e.g., "Row 15, column 'DRAWING', reason: Required field missing").

### Acceptance Scenarios

#### CSV Upload & Parsing
1. **Given** a Project Manager with project access, **When** they drag-and-drop a valid CSV file (TAKEOFF - 6031.csv format), **Then** the system parses the file and displays a preview of components to be created
2. **Given** a Project Manager uploads a CSV with 78 rows, **When** processing completes, **Then** the system creates approximately 200+ discrete components (after quantity explosion) in under 5 seconds
3. **Given** a CSV file with missing required columns (e.g., no DRAWING column), **When** the user uploads it, **Then** the system rejects the file immediately with error "Missing required column: DRAWING"

#### Quantity Explosion
4. **Given** a CSV row with TYPE=Valve, QTY=4, CMDTY CODE=VBALU-SECBFLR00M-006, **When** the import processes this row, **Then** the system creates 4 discrete valve components with identity keys: VBALU-SECBFLR00M-006-001, VBALU-SECBFLR00M-006-002, VBALU-SECBFLR00M-006-003, VBALU-SECBFLR00M-006-004
5. **Given** a CSV row with TYPE=Support, QTY=3, CMDTY CODE=G4G-1412-05AA-001-6-6, **When** the import processes this row, **Then** the system creates 3 discrete support components with sequential identity keys
6. **Given** a CSV row with TYPE=Instrument, QTY=1, CMDTY CODE=ME-55402, **When** the import processes this row, **Then** the system creates 1 instrument component with identity key "ME-55402" (instrument tag, no suffix)

#### Component Type Mapping
7. **Given** a CSV with TYPE column values: Valve, Instrument, Support, Pipe, Fitting, Flange, **When** the import processes the file, **Then** the system maps each to the corresponding component_type and assigns the correct progress template
8. **Given** a CSV row with TYPE=Pipe, **When** the component is created, **Then** the system assigns the "Pipe" progress template (Receive 50% → Install 50%)
9. **Given** a CSV row with TYPE=Fitting, **When** the component is created, **Then** the system assigns the "Fitting" progress template (Receive 50% → Install 50%)
10. **Given** a CSV row with TYPE=Flange, **When** the component is created, **Then** the system assigns the "Flange" progress template (Receive 50% → Install 50%)

#### Drawing Normalization & Auto-Creation
11. **Given** a CSV row with DRAWING="P-001", **When** the import processes the row, **Then** the system normalizes to "P001" and creates/links the drawing
12. **Given** a CSV row with DRAWING=" DRAIN-1 " (with spaces), **When** the import processes the row, **Then** the system normalizes to "DRAIN1" and removes leading/trailing spaces
13. **Given** a CSV with DRAWING="P-55501" and this drawing does not exist in the database, **When** the import processes the file, **Then** the system auto-creates the drawing with drawing_norm="P55501" and raw_drawing_no="P-55501"
14. **Given** a CSV with DRAWING="P-55501" and this drawing already exists in the database, **When** the import processes the file, **Then** the system links components to the existing drawing_id without creating a duplicate

#### Attributes Storage
15. **Given** a CSV row with SPEC=ES-03, DESCRIPTION="Blind Flg...", SIZE=2, CMDTY CODE=FBLAG2DFA2351215, Comments="N/A", **When** the component is created, **Then** the system stores these values in the attributes JSONB field: {"spec": "ES-03", "description": "Blind Flg...", "size": "2", "cmdty_code": "FBLAG2DFA2351215", "comments": "N/A", "original_qty": 1}
16. **Given** a CSV row with empty Comments column, **When** the component is created, **Then** the system stores "comments": "" in attributes (empty string, not null)

#### Validation & Error Handling
17. **Given** a CSV with a row missing the required DRAWING column, **When** the import validates the file, **Then** the system rejects the entire file with error report: "Row 5, column 'DRAWING', reason: Required field missing"
18. **Given** a CSV with a row where QTY is not a number (e.g., QTY="ABC"), **When** the import validates the file, **Then** the system rejects with error: "Row 12, column 'QTY', reason: Invalid data type (expected number)"
19. **Given** a CSV with duplicate identity keys (e.g., two rows would create VBALU-SECBFLR00M-006-001), **When** the import validates the file, **Then** the system rejects the entire file with error report listing the conflicting identity keys
20. **Given** a user in organization A uploading a CSV for a project in organization B, **When** the import validates permissions, **Then** the system rejects with error "Unauthorized: You do not have access to this project"

#### Error Report Download
21. **Given** a CSV file that fails validation with 3 errors, **When** the import completes, **Then** the system displays the error report on screen and provides a "Download Error Report (CSV)" button
22. **Given** an error report CSV is downloaded, **When** the user opens it, **Then** the file contains columns: Row, Column, Reason with one row per validation error

#### Performance & Transaction Safety
23. **Given** a CSV with 78 rows creating ~200 components, **When** the import processes, **Then** the system completes in under 5 seconds
24. **Given** a CSV with 1,000 rows creating ~3,000 components, **When** the import processes, **Then** the system completes in under 60 seconds
25. **Given** a CSV that passes validation for 99 rows but fails on row 100 (duplicate identity key), **When** the import processes, **Then** the system rolls back the entire transaction and creates zero components (all-or-nothing)

### Edge Cases

- **What happens when a CSV row has QTY=0?** System skips the row with warning in import summary: "Skipped 1 row (QTY=0)"
- **How does the system handle very large QTY values (e.g., QTY=100 bolts)?** System explodes into 100 discrete components as designed. Performance impact noted if QTY >50 (consider manual review).
- **What happens when CMDTY CODE is empty?** System rejects row with error: "Row X, column 'CMDTY CODE', reason: Required for identity key generation"
- **What happens when TYPE column has an unrecognized value (e.g., "Equipment")?** System rejects with error: "Row X, column 'TYPE', reason: Invalid component type. Expected: Valve, Instrument, Support, Pipe, Fitting, Flange"
- **How does the system handle CSV files with different column order?** System uses column headers to map fields (order-independent). If headers don't match expected names, system rejects with "Unknown column: [name]"
- **What happens when two CSV rows have the same DRAWING but different normalizations (e.g., "P-001" and "P001")?** Both normalize to "P001" and link to the same drawing (drawing normalization ensures uniqueness)
- **What happens if the user uploads a 10MB CSV with 50,000 rows?** System rejects with error "File too large. Maximum 10,000 rows or 5MB" (reasonable import limit)

---

## Requirements

### Functional Requirements

#### CSV Structure & Parsing
- **FR-001**: System MUST accept CSV files with the following columns: DRAWING, SPEC, TYPE, DESCRIPTION, SIZE, QTY, CMDTY CODE, Comments
- **FR-002**: System MUST ignore the SM/OTSM column if present (not imported to PipeTrak)
- **FR-003**: System MUST parse CSV files using column headers (order-independent)
- **FR-004**: System MUST validate that all required columns exist: DRAWING, TYPE, QTY, CMDTY CODE
- **FR-005**: System MUST allow optional columns: SPEC, DESCRIPTION, SIZE, Comments (empty values permitted)

#### Quantity Explosion
- **FR-006**: System MUST explode quantities into discrete components for ALL component types (Valve, Instrument, Support, Pipe, Fitting, Flange)
- **FR-007**: System MUST generate identity keys using the pattern: {CMDTY_CODE}-{001..QTY} for Valve, Support, Pipe, Fitting, Flange
- **FR-008**: System MUST use the CMDTY CODE value directly as the identity key for Instrument components (no sequential suffix)
- **FR-009**: System MUST use zero-padded 3-digit suffixes (e.g., 001, 002, ..., 099, 100) for sequential identity keys
- **FR-010**: System MUST skip rows where QTY=0 and log a warning in the import summary

#### Component Type Mapping
- **FR-011**: System MUST map CSV TYPE column to component_type using exact case-insensitive match: Valve → Valve, Instrument → Instrument, Support → Support, Pipe → Pipe, Fitting → Fitting, Flange → Flange
- **FR-012**: System MUST assign the "Valve" progress template to components with TYPE=Valve (existing template from Sprint 1)
- **FR-013**: System MUST assign the "Instrument" progress template to components with TYPE=Instrument (existing template from Sprint 1)
- **FR-014**: System MUST assign the "Support" progress template to components with TYPE=Support (existing template from Sprint 1)
- **FR-015**: System MUST assign the "Pipe" progress template to components with TYPE=Pipe (new template: Receive 50%, Install 50%)
- **FR-016**: System MUST assign the "Fitting" progress template to components with TYPE=Fitting (new template: Receive 50%, Install 50%)
- **FR-017**: System MUST assign the "Flange" progress template to components with TYPE=Flange (new template: Receive 50%, Install 50%)
- **FR-018**: System MUST reject rows with unrecognized TYPE values (not in the list of 6 valid types)

#### Drawing Normalization & Auto-Creation
- **FR-019**: System MUST normalize drawing numbers by: converting to uppercase, trimming whitespace, removing hyphens and separators, stripping leading zeros
- **FR-020**: Normalization examples: "P-001" → "P001", " DRAIN-1 " → "DRAIN1", "p--0-0-1" → "P1"
- **FR-021**: System MUST auto-create drawing records if the normalized drawing number does not exist in the project
- **FR-022**: Auto-created drawings MUST store both drawing_norm (normalized) and raw_drawing_no (original from CSV)
- **FR-023**: System MUST link components to existing drawings when normalized drawing number matches (no duplicates)
- **FR-024**: System MUST set is_retired=false for all auto-created drawings

#### Attributes Storage
- **FR-025**: System MUST store CSV data in component attributes JSONB field with keys: spec, description, size, cmdty_code, comments, original_qty
- **FR-026**: System MUST store the original QTY value (from CSV) in attributes.original_qty for audit purposes
- **FR-027**: System MUST store empty strings for missing optional fields (not null values)
- **FR-028**: SPEC column value MUST be stored in attributes.spec as metadata only (does not affect progress template selection)

#### Validation & Error Handling
- **FR-029**: System MUST validate that required columns exist before processing any rows
- **FR-030**: System MUST validate that QTY column contains numeric values (integers ≥0)
- **FR-031**: System MUST validate that DRAWING column is not empty for each row
- **FR-032**: System MUST validate that CMDTY CODE column is not empty for each row
- **FR-033**: System MUST validate that TYPE column contains one of the 6 valid component types
- **FR-034**: System MUST detect duplicate identity keys within the same import file and reject the entire file
- **FR-035**: System MUST detect duplicate identity keys against existing components in the project and reject the entire file
- **FR-036**: System MUST enforce Row Level Security (RLS) policies to prevent users from importing into projects they don't have access to
- **FR-037**: System MUST provide row-level and column-level error reporting for validation failures

#### Error Reporting
- **FR-038**: System MUST generate an error report CSV with columns: Row, Column, Reason
- **FR-039**: Error report MUST include all validation errors discovered during processing
- **FR-040**: System MUST provide a "Download Error Report (CSV)" button when validation fails
- **FR-041**: System MUST display a summary message: "Import failed: X errors found. Download error report for details."

#### Transaction Safety & Performance
- **FR-042**: System MUST use database transactions to ensure all-or-nothing imports (if any row fails, rollback entire import)
- **FR-043**: System MUST complete imports of 78-row CSV files (creating ~200 components) in under 5 seconds
- **FR-044**: System MUST complete imports of 1,000-row CSV files (creating ~3,000 components) in under 60 seconds
- **FR-045**: System MUST reject CSV files larger than 10,000 rows or 5MB
- **FR-046**: System MUST create all components with project_id, organization_id, created_by, and created_at populated
- **FR-047**: System MUST initialize all components with percent_complete=0.00 and current_milestones={} (empty JSONB object)

#### Import UI
- **FR-048**: Users with project access MUST be able to access the Import page
- **FR-049**: Import page MUST provide drag-and-drop file upload functionality
- **FR-050**: Import page MUST provide a "Download CSV Template" button that generates a properly formatted template file with 3 example rows demonstrating valid data formats (one each for Valve, Instrument, and Pipe component types)
- **FR-051**: System MUST display upload progress indicator during file upload (0% to 100% based on bytes transferred)
- **FR-052**: System MUST display import summary after completion: "Successfully imported X components from Y rows. Z rows skipped."
- **FR-053**: System MUST refresh the components table after successful import to show newly created components

### Non-Functional Requirements

- **NFR-001**: Import processing MUST complete in under 5 seconds for 78-row CSV files
- **NFR-002**: Import processing MUST complete in under 60 seconds for 1,000-row CSV files
- **NFR-003**: System MUST enforce file size limit of 5MB or 10,000 rows (whichever is smaller)
- **NFR-004**: All database operations MUST use transactions with rollback on failure
- **NFR-005**: Error messages MUST be specific and actionable (e.g., "Row 15, column 'QTY', reason: Expected number, got 'ABC'")
- **NFR-006**: CSV template download MUST include 3 example rows demonstrating valid data formats for different component types (Valve with QTY>1, Instrument with QTY=1, Pipe)
- **NFR-007**: Import functionality MUST respect existing RLS policies (multi-tenant isolation)
- **NFR-008**: CSV files MUST use UTF-8 encoding (system rejects non-UTF-8 files with clear error message)

### Key Entities

- **Material Takeoff CSV Row**: Represents a single line item from engineering material takeoff. Contains drawing reference, component type, description, size, quantity, commodity code, spec, and comments. Each row may create multiple discrete components based on quantity.

- **Component (expanded)**: Now supports 6 component types: Valve, Instrument, Support, Pipe (NEW), Fitting (NEW), Flange (NEW). Identity key generated from commodity code + sequential suffix (except instruments use tag directly). Attributes JSONB stores all CSV metadata (spec, description, size, cmdty_code, comments, original_qty).

- **Progress Template (3 new templates)**: Defines milestone workflow for new component types. Pipe, Fitting, and Flange templates each have 2 milestones: Receive (weight 50%) and Install (weight 50%). Discrete workflow (boolean completion, not partial %).

- **Drawing (auto-created)**: Represents construction drawing document. May be auto-created during import if not found in database. Contains drawing_norm (normalized for matching: "P001"), raw_drawing_no (original from CSV: "P-001"), title (empty for auto-created), revision (empty), is_retired (false). Project-scoped.

- **Error Report**: Generated when import validation fails. Contains row number, column name, and reason for each validation error. Downloadable as CSV with 3 columns: Row, Column, Reason. Helps users fix data quality issues in source CSV.

---

## Dependencies & Assumptions

### Dependencies
- Sprint 1 database foundation complete (14 tables including components, drawings, progress_templates)
- TanStack Query hooks: useComponents, useDrawings (for post-import refresh)
- ProjectContext provides current project_id
- AuthContext provides current user_id
- RLS policies enforce organization-level access control
- Supabase Edge Functions enabled for server-side CSV processing

### Assumptions
- Material takeoff CSV files are generated by engineering team (external to PipeTrak)
- CSV format matches TAKEOFF - 6031.csv structure (8 columns)
- Quantity explosion is always desired (no option for quantity-based tracking in this feature)
- Commodity codes (CMDTY CODE column) are unique within a project when combined with sequential suffixes
- Instrument tags (ME-55402, PIT-55406, etc.) are unique identifiers (no duplicates)
- SPEC column is metadata only (does not determine piping subtype FAB/ERW/SMLS/ROC)
- SM/OTSM column is not needed in PipeTrak (ignored if present in CSV)
- Import files are reasonable size (<10,000 rows, <5MB)
- Users upload clean CSV files (UTF-8 encoding, no special formatting)
- Drawings referenced in CSV may or may not already exist in database (auto-creation handles both cases)

### Out of Scope

**Deferred to Future Features:**
- Similar drawing detection (>85% fuzzy match creates Needs Review) - deferred to Sprint 4
- Weld log import (separate CSV format with weld-specific data) - deferred to Sprint 5
- Manual component creation UI (rare edge case) - may not be needed at all
- Bulk component editing post-import (area/system assignment) - handled by Feature 007
- Import history tracking (audit log of imports) - audit_log exists but UI deferred
- Re-import / update existing components - only creates new components in this feature
- CSV export (download components as CSV) - separate export feature

**Post-MVP:**
- Import from other formats (Excel .xlsx, PDF parsing, CAD integration)
- Advanced validation rules (custom business logic per project)
- Import scheduling (automated imports from external systems)
- Import templates with project-specific column mappings

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain (all clarifications resolved in planning session)
- [x] Requirements are testable and unambiguous (specific validation rules, performance targets)
- [x] Success criteria are measurable (import timing, component counts, error reporting)
- [x] Scope is clearly bounded (CSV import only, no export, no similar drawing detection in this feature)
- [x] Dependencies and assumptions identified (Sprint 1 complete, real CSV structure known)

---

## Execution Status

- [x] User description parsed (Sprint 3: Material Takeoff Import Pipeline)
- [x] Key concepts extracted (quantity explosion, 6 component types, drawing auto-creation, validation)
- [x] Ambiguities resolved (identity key rules, component type mapping, SPEC usage, SM/OTSM exclusion)
- [x] User scenarios defined (25 acceptance scenarios + 7 edge cases)
- [x] Requirements generated (53 functional, 7 non-functional)
- [x] Entities identified (5 key entities with relationships)
- [x] Review checklist passed

---

## Success Criteria

This feature is considered complete when:

1. **CSV Upload**: Project Managers can drag-and-drop CSV files matching TAKEOFF - 6031.csv format
2. **Quantity Explosion**: QTY=4 creates 4 discrete components with sequential identity keys (CMDTY_CODE-001, -002, -003, -004)
3. **Component Types**: All 6 component types (Valve, Instrument, Support, Pipe, Fitting, Flange) import correctly with correct progress templates
4. **Drawing Handling**: Drawings auto-created if missing, normalized correctly ("P-001" → "P001"), no duplicates
5. **Attributes Storage**: SPEC, DESCRIPTION, SIZE, CMDTY CODE, Comments stored in attributes JSONB
6. **Validation**: Invalid CSV files rejected with downloadable error report (Row, Column, Reason)
7. **Performance**: 78-row CSV imports in <5s, 1,000-row CSV in <60s
8. **Transaction Safety**: Failed imports rollback completely (zero components created)
9. **Templates**: 3 new progress templates created (Pipe, Fitting, Flange with Receive/Install milestones)
10. **Test Coverage**: ≥70% overall, ≥80% for import logic/validation
11. **Real Data Test**: TAKEOFF - 6031.csv (78 rows) imports successfully creating ~200 components

---
