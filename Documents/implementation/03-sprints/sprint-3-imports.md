7.4 Sprint 3: Import Pipeline (Week 4)

Duration: 5 days
Team: 2 Full-stack Developers

GOALS:
- Implement Excel/CSV import for components
- Implement drawing normalization + auto-creation
- Implement similar drawing detection
- Implement fail-fast validation with row-level errors

TASKS (TDD ORDER - Tests First):

**Phase 1: Write Unit Tests for Normalization Logic (MUST FAIL initially)**
□ Write unit tests for drawing normalization:
  - Test: "P-001" normalizes to "P001"
  - Test: " p-0001 " (with spaces) normalizes to "P001"
  - Test: "P--0-0-1" (multiple separators) normalizes to "P001"
  - Test: Preserves valid formats without leading zeros
  - Test: Handles edge cases (null, empty string)

**Phase 2: Write Integration Tests for Import Edge Function (MUST FAIL initially)**
□ Write integration tests for import-components Edge Function:
  - Test: Valid 100-row file imports successfully
  - Test: Duplicate spool_id (Class-A) rejects entire file with error report
  - Test: Missing required field returns row-level error (row 5, column "spool_id", reason "Required")
  - Test: Invalid data type returns row-level error
  - Test: Auto-creates missing drawings (verify drawing created in DB)
  - Test: Similarity detection creates needs_review for "P-001" vs "P-0001"
  - Test: Import creates audit_log entries for all new components
  - Test: RLS enforcement: User in org A cannot import into org B project
  - Test: Transaction rollback on validation failure (partial import rejected)
□ Write performance tests for import:
  - Test: 1k row import completes in <60s
  - Test: 10k row import completes in <5min

**Phase 3: Write Component Tests (MUST FAIL initially)**
□ Write tests for ImportPage component:
  - Test: File upload drag-and-drop triggers import
  - Test: Template download links are functional
  - Test: Error report displays row-level errors in table
  - Test: Error report CSV downloadable
  - Test: Shows progress indicator during import
□ Write tests for similar drawing review UI:
  - Test: Shows new drawing vs top 3 matches
  - Test: Approve button confirms new drawing
  - Test: Reject button merges into existing drawing

**Phase 4: Implement Features (Tests Should Now Pass)**
□ Create Excel template (download from UI):
  - Spool template: spool_id, drawing_no, spec, size, material, area, system
  - Field Weld template: weld_number, drawing_no
  - Support template: drawing_no, commodity_code, size, quantity
□ Build ImportPage:
  - File upload (drag-and-drop)
  - Template download links
  - Error report display
□ Implement Edge Function: import-components
  - Parse Excel/CSV (use SheetJS)
  - Validate required fields
  - Normalize drawing numbers (UPPERCASE, trim, collapse separators, strip leading zeros)
  - Check for duplicates:
    - Class-A: Reject file if duplicate
    - Class-B: Calculate delta, create Needs Review
  - Auto-create drawings if missing
  - Detect similar drawings (>85% similarity):
    - Call detect_similar_drawings() stored procedure
    - Create Needs Review: SIMILAR_DRAWING
  - Stage components in temp table
  - Validate RLS (user has permission)
  - Commit transaction on success
  - Return error report if validation fails
□ Implement error report download (CSV with row, field, reason)
□ Build similar drawing review UI:
  - Show new drawing vs top 3 matches
  - Approve (confirm new) or Reject (merge into existing)

DELIVERABLES:
✅ Import page functional
✅ Excel templates downloadable
✅ Import succeeds for valid files
✅ Import fails fast with row-level errors for invalid files
✅ Similar drawing detection working
✅ Import edge function has ≥80% test coverage
✅ All import integration tests passing

ACCEPTANCE CRITERIA:
- Import 1k components in <60s (verified in performance tests)
- Duplicate spool_id rejects entire file (verified in tests)
- Similar drawing "P-001" vs "P-0001" creates Needs Review (verified in tests)
- Error report CSV downloadable
- All import tests pass including performance benchmarks

CONSTITUTION COMPLIANCE (v1.0.0):
- ✅ I. Type Safety First: Type-safe normalization functions, no `as` assertions
- ✅ II. Component-Driven: ImportPage component composable, single responsibility
- ✅ III. Testing Discipline: Unit tests for normalization, integration tests for Edge Function
- ✅ IV. Supabase Integration: Import Edge Function uses RLS, transaction rollback on failure
- ✅ V. Specify Workflow: Tests written before implementation (TDD phases 1-4)

──────────────────────────────────────────────────────────────────────────────
