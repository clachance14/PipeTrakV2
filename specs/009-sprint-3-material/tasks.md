# Tasks: Sprint 3 Material Management & Progress Tracking

**Feature**: 009-sprint-3-material
**Input**: Design documents from `/home/clachance14/projects/PipeTrak_V2/specs/009-sprint-3-material/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

## Execution Flow

This feature implements a CSV-based material takeoff import system that processes construction component line items, explodes quantities into discrete trackable components, auto-creates drawings, and validates data with comprehensive error reporting.

**Tech Stack**: TypeScript 5.3 (strict mode), React 18, Supabase Edge Functions (Deno), PapaParse (CSV parsing), react-dropzone (file upload), Zod (validation)

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

---

## Phase 3.1: Setup & Dependencies

- [ ] T001 Install frontend dependencies: `npm install react-dropzone zod`
- [ ] T002 Create database migration file: `supabase/migrations/00016_add_pipe_fitting_flange_templates.sql`
- [ ] T003 Apply migration and verify progress templates created: `supabase db reset`
- [ ] T004 Initialize Supabase Edge Function: `supabase functions new import-takeoff`

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests (All Parallel)
- [ ] T005 [P] Copy contract test: `specs/009-sprint-3-material/contracts/drawing-normalization.contract.test.tsx` → `tests/contract/import/drawing-normalization.contract.test.tsx`
- [ ] T006 [P] Copy contract test: `specs/009-sprint-3-material/contracts/quantity-explosion.contract.test.tsx` → `tests/contract/import/quantity-explosion.contract.test.tsx`
- [ ] T007 [P] Copy contract test: `specs/009-sprint-3-material/contracts/validation.contract.test.tsx` → `tests/contract/import/validation.contract.test.tsx`
- [ ] T008 [P] Copy contract test: `specs/009-sprint-3-material/contracts/import-takeoff.contract.test.tsx` → `tests/contract/import/import-takeoff.contract.test.tsx`

### Integration Tests (All Parallel)
- [ ] T009 [P] Create integration test for CSV upload workflow: `tests/integration/009-material-import/csv-upload-workflow.test.tsx`
- [ ] T010 [P] Create integration test for error reporting: `tests/integration/009-material-import/error-reporting.test.tsx`

### Verify Tests Fail
- [ ] T011 Run all contract tests and verify they fail: `npm test -- tests/contract/import/`
- [ ] T012 Run all integration tests and verify they fail: `npm test -- tests/integration/009-material-import/`

---

## Phase 3.3: Core Implementation - Utility Functions (ONLY after tests are failing)

**These utilities are used by the Edge Function and can be implemented in parallel**

### CSV Utilities (All Parallel)
- [ ] T013 [P] Implement drawing normalization utility: `src/lib/csv/normalize-drawing.ts`
- [ ] T014 [P] Implement identity key generation utility: `src/lib/csv/generate-identity-key.ts`
- [ ] T015 [P] Implement quantity explosion logic: `src/lib/csv/explode-quantity.ts`
- [ ] T016 [P] Implement CSV validation utility with UTF-8 encoding detection: `src/lib/csv/validate-csv.ts`

### Zod Schemas (Parallel)
- [ ] T017 [P] Create Zod schemas for import validation: `src/schemas/import.ts`

### Verify Utility Tests Pass
- [ ] T018 Run contract tests for utilities and verify they pass: `npm test -- tests/contract/import/drawing-normalization.contract.test.tsx tests/contract/import/quantity-explosion.contract.test.tsx tests/contract/import/validation.contract.test.tsx`

---

## Phase 3.4: Backend Implementation - Supabase Edge Function

**These tasks must be sequential as they build on each other**

### Edge Function Core
- [ ] T019 Implement CSV parser with PapaParse: `supabase/functions/import-takeoff/parser.ts`
- [ ] T020 Implement server-side validation with UTF-8 encoding check: `supabase/functions/import-takeoff/validator.ts`
- [ ] T021 Implement PostgreSQL transaction logic: `supabase/functions/import-takeoff/transaction.ts`
- [ ] T022 Implement main Edge Function handler: `supabase/functions/import-takeoff/index.ts`

### Edge Function Configuration
- [ ] T023 Create Deno import map for PapaParse dependency: `supabase/functions/import-takeoff/import_map.json`
- [ ] T024 Deploy Edge Function locally: `supabase functions serve import-takeoff`
- [ ] T025 Test Edge Function with curl: verify 200 response for valid CSV, 400 for invalid CSV

### Verify Edge Function Tests Pass
- [ ] T026 Run contract test for import-takeoff Edge Function: `npm test -- tests/contract/import/import-takeoff.contract.test.tsx`

---

## Phase 3.5: Frontend Implementation - UI Components

**These components can be implemented in parallel**

### React Components (All Parallel)
- [ ] T027 [P] Implement import page with drag-and-drop upload and import summary display (shows components created, rows processed, rows skipped with warnings): `src/components/ImportPage.tsx`
- [ ] T028 [P] Implement upload progress indicator: `src/components/ImportProgress.tsx`
- [ ] T029 [P] Implement error report download button: `src/components/ErrorReportDownload.tsx`

### Custom Hooks
- [ ] T030 Implement useImport TanStack Query mutation hook: `src/hooks/useImport.ts`

### Routing Updates
- [ ] T031 Update ImportsPage to show import UI: `src/pages/ImportsPage.tsx`
- [ ] T032 Verify /imports route exists in App.tsx (should already exist)

### CSV Template Download (FR-050)
- [ ] T048 [P] Implement CSV template download button in ImportPage: generates properly formatted CSV template with 3 example rows (Valve, Instrument, Pipe) demonstrating valid data formats

---

## Phase 3.6: Integration & End-to-End Testing

**These tasks verify the full import workflow**

- [ ] T033 Run integration test for CSV upload workflow: `npm test -- tests/integration/009-material-import/csv-upload-workflow.test.tsx`
- [ ] T034 Run integration test for error reporting: `npm test -- tests/integration/009-material-import/error-reporting.test.tsx`
- [ ] T035 Test with real data: Upload TAKEOFF - 6031.csv and verify ~203 components created
- [ ] T036 Verify drawings auto-created with normalization (DRAIN-1 → DRAIN1)
- [ ] T037 Verify progress templates assigned correctly (Pipe, Fitting, Flange)
- [ ] T038 Test error reporting: upload invalid CSV and download error report
- [ ] T039 Test transaction rollback: verify zero components created after error
- [ ] T040 Measure performance: verify 78-row CSV imports in <5 seconds

---

## Phase 3.7: Polish & Documentation

- [ ] T041 [P] Run all tests and verify ≥70% overall coverage: `npm test -- --coverage`
- [ ] T042 [P] Run type check and verify no errors: `tsc -b`
- [ ] T043 [P] Run linter and fix any issues: `npm run lint`
- [ ] T044 Update CLAUDE.md with import context (add CSV import section)
- [ ] T045 Update PROJECT-STATUS.md with Feature 009 completion status
- [ ] T046 Remove any unused imports or dead code from implementation
- [ ] T047 Verify quickstart.md steps work end-to-end: complete all 10 verification steps

---

## Terminology Standards

**CMDTY CODE Naming Convention**:
- Use `"CMDTY CODE"` (with space) when referencing CSV column headers in parsing/validation
- Use `cmdty_code` (snake_case) in all TypeScript code (variables, object keys, database attributes)
- Example: `csvRow["CMDTY CODE"]` → `attributes.cmdty_code`

---

## Dependencies

### Phase Dependencies
- T001-T004 (Setup) → T005-T012 (Tests)
- T005-T012 (Tests) → T013-T018 (Utilities)
- T013-T018 (Utilities) → T019-T026 (Edge Function)
- T019-T026 (Edge Function) → T027-T032 (Frontend)
- T027-T032 (Frontend) → T033-T040 (Integration)
- T033-T040 (Integration) → T041-T047 (Polish)

### Task-Level Dependencies
- T002 blocks T003 (migration must exist before applying)
- T003 blocks T025 (progress templates needed for import)
- T013-T016 block T019-T021 (utilities used by Edge Function)
- T017 blocks T020 (schemas used by validator)
- T019-T021 block T022 (parser/validator/transaction used by main handler)
- T022 blocks T023-T025 (main handler must exist before deploy)
- T030 blocks T027 (hook used by ImportPage)
- T027-T029 block T031 (components used by ImportsPage)
- T048 is independent (can run parallel with T027-T032)

---

## Parallel Execution Examples

### Contract Tests (Phase 3.2)
Launch T005-T008 together:
```typescript
// All 4 contract test files can be copied in parallel
Task: "Copy drawing-normalization contract test"
Task: "Copy quantity-explosion contract test"
Task: "Copy validation contract test"
Task: "Copy import-takeoff contract test"
```

### Utility Implementations (Phase 3.3)
Launch T013-T016 together:
```typescript
// All 4 utility functions can be implemented in parallel (different files)
Task: "Implement normalize-drawing.ts"
Task: "Implement generate-identity-key.ts"
Task: "Implement explode-quantity.ts"
Task: "Implement validate-csv.ts"
```

### UI Components (Phase 3.5)
Launch T027-T029 and T048 together:
```typescript
// All 4 UI components/features can be implemented in parallel (different files)
Task: "Implement ImportPage.tsx"
Task: "Implement ImportProgress.tsx"
Task: "Implement ErrorReportDownload.tsx"
Task: "Implement CSV template download button"
```

### Polish (Phase 3.7)
Launch T041-T043 together:
```typescript
// Tests, type checking, and linting can run in parallel
Task: "Run tests with coverage"
Task: "Run type check"
Task: "Run linter"
```

---

## Validation Checklist

**GATE: Verify before marking feature complete**

- [x] All contracts have corresponding tests (4 contracts → 4 contract tests)
- [x] All utilities have contract tests (normalize-drawing, generate-identity-key, explode-quantity, validate-csv)
- [x] All tests come before implementation (Phase 3.2 → Phase 3.3)
- [x] Parallel tasks truly independent (no shared file modifications)
- [x] Each task specifies exact file path
- [x] TDD workflow enforced (T011-T012 verify tests fail before implementation)
- [x] Integration tests cover spec acceptance scenarios (CSV upload, error reporting)
- [x] Performance requirements verified (T040: <5s for 78 rows)
- [x] Real data test included (T035: TAKEOFF - 6031.csv)
- [x] Transaction safety verified (T039: rollback on error)

---

## Notes

- **TDD Enforcement**: T011-T012 are critical gates - DO NOT proceed to Phase 3.3 until tests fail
- **Parallel Execution**: 16 tasks marked [P] can run concurrently (33% parallelizable)
- **File Size Limit**: Edge Function enforces 5MB limit (client-side validation recommended)
- **Row Limit**: Edge Function enforces 10,000 rows (server-side check only)
- **Security**: Edge Function validates RLS before processing (user must have project access)
- **Performance Target**: 78-row CSV in <5s, 1,000-row CSV in <60s
- **Commit Strategy**: Commit after each phase completion (not individual tasks)
- **Coverage Target**: ≥70% overall, ≥80% for `src/lib/csv/**`
- **Terminology**: Use `"CMDTY CODE"` for CSV headers, `cmdty_code` for code variables (see Terminology Standards section)

---

**Tasks Complete**: 48 tasks generated across 7 phases. Ready for /implement execution.

*Generated from Constitution v1.0.0 - See `.specify/memory/constitution.md`*
