# Tasks: Flexible CSV Import

**Input**: Design documents from `/specs/024-flexible-csv-import/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Following TDD workflow per Constitution Principle III - tests written before implementation

**Organization**: Tasks grouped by user story to enable independent implementation and testing

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app structure**: `src/` at repository root
- **Tests**: Colocated `*.test.ts` and `tests/integration/`
- **Edge Functions**: `supabase/functions/import-takeoff/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and copy TypeScript contracts to source

- [X] T001 Install Papa Parse dependencies: `npm install papaparse` and `npm install --save-dev @types/papaparse`
- [X] T002 [P] Copy TypeScript contracts from specs/024-flexible-csv-import/contracts/ to src/types/csv-import.types.ts (consolidate all contract files into single import)
- [X] T003 [P] Create test data directory and sample CSV files in test-data/flexible-import-test.csv per quickstart.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core CSV utilities that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Verify existing CSV utilities exist: src/lib/csv/normalize-drawing.ts, src/lib/csv/normalize-size.ts, src/lib/csv/generate-identity-key.ts
- [X] T005 [P] Create types export file src/lib/csv/types.ts that re-exports from src/types/csv-import.types.ts for path consistency

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Upload CSV with Non-Standard Column Names (Priority: P1) 🎯 MVP

**Goal**: Auto-detect column mappings (DRAWINGS→DRAWING, Cmdty Code→CMDTY CODE) with confidence scoring

**Independent Test**: Upload CSV with "DRAWINGS" column and verify components created correctly

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T006 [P] [US1] Unit test for column-mapper.ts in src/lib/csv/column-mapper.test.ts (test three-tier matching: exact, case-insensitive, synonym)
- [ ] T007 [P] [US1] Integration test for column mapping flow in tests/integration/flexible-import-column-mapping.test.ts

### Implementation for User Story 1

- [X] T008 [US1] Implement column mapping engine in src/lib/csv/column-mapper.ts (three-tier algorithm: exact→case-insensitive→synonym, return ColumnMapping[] with confidence scores)
- [X] T009 [US1] Add synonym map for common variations (DRAWINGS, Cmdty Code, etc.) using COLUMN_SYNONYMS from contracts
- [X] T010 [US1] Implement required field detection (DRAWING, TYPE, QTY, CMDTY CODE) and missing field reporting

**Checkpoint**: Column mapping works independently - CSV columns map to expected fields with confidence percentages

---

## Phase 4: User Story 1 + User Story 2 - Client-Side Validation & Preview (Priority: P1)

**Goal**: Parse CSV client-side, validate rows (three categories: valid/skipped/error), display preview UI

**Independent Test**: Upload CSV and verify preview shows mappings, validation results, sample data within 3 seconds

### Tests for Validation

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T011 [P] [US1] Unit test for csv-validator.ts in src/lib/csv/csv-validator.test.ts (test required fields, component types, QTY validation, duplicate detection)
- [ ] T012 [P] [US2] Integration test for preview generation in tests/integration/flexible-import-preview.test.ts

### Implementation for Validation

- [X] T013 [P] [US1] Implement CSV validation engine in src/lib/csv/csv-validator.ts (validate required fields non-empty, TYPE in valid list, QTY integer ≥0)
- [X] T014 [US1] Implement three-category validation logic (valid/skipped/error) per ValidationResult interface
- [X] T015 [US1] Implement identity key generation for duplicate detection (reuse generate-identity-key.ts with SIZE normalization)
- [X] T016 [US1] Implement ParsedRow creation with normalization (drawing, size, type lowercase) and unmapped field storage

### Tests for Preview UI Components

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T017 [P] [US2] Component test for ColumnMappingDisplay.tsx in src/components/ColumnMappingDisplay.test.tsx
- [X] T018 [P] [US2] Component test for ValidationResults.tsx in src/components/ValidationResults.test.tsx
- [X] T019 [P] [US2] Component test for ImportPreview.tsx in src/components/ImportPreview.test.tsx

### Implementation for Preview UI

- [X] T020 [P] [US2] Create ColumnMappingDisplay component in src/components/ColumnMappingDisplay.tsx (display mappings with confidence %, unmapped columns, missing required fields)
- [X] T021 [P] [US2] Create ValidationResults component in src/components/ValidationResults.tsx (display valid/skipped/error counts, grouped by category, show row numbers)
- [X] T022 [US2] Create ImportPreview component in src/components/ImportPreview.tsx (orchestrate file summary, column mappings, validation results, sample data table, component counts, Cancel/Confirm actions)
- [X] T023 [US2] Implement Papa Parse integration in ImportPreview (parse CSV on file upload, handle errors, enforce 5MB/10k row limits)
- [X] T024 [US2] Implement preview state generation (consolidate column mappings, validation results, sample data into ImportPreviewState)
- [X] T025 [US2] Implement sample data table rendering (first 10 valid rows, only mapped columns, responsive design)

### Integration for ImportsPage

- [X] T026 [US2] Integrate ImportPreview into src/pages/ImportsPage.tsx (replace direct import with preview→confirm flow, handle file selection, show preview, on confirm proceed to import)

**Checkpoint**: User Stories 1 & 2 complete - CSV upload → preview with mappings & validation → user reviews before import

---

## Phase 5: User Story 3 - Auto-Create Metadata from CSV (Priority: P2)

**Goal**: Check metadata existence, show "existing" vs "will create" in preview, auto-create during import

**Independent Test**: Upload CSV with non-existent System="HC-05" and verify System record created and linked to components

### Tests for Metadata Discovery

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T027 [P] [US3] Unit test for metadata-analyzer.ts in src/lib/csv/metadata-analyzer.test.ts (test unique value extraction, existence check mocking) - 16 tests passing
- [X] T028 [P] [US3] Integration test for metadata discovery in tests/integration/flexible-import-metadata.test.ts (mock Supabase batch queries) - 11 tests passing

### Implementation for Metadata Discovery (Client-Side)

- [X] T029 [P] [US3] Implement metadata analyzer in src/lib/csv/metadata-analyzer.ts (extract unique Area/System/Test Package values from ParsedRow[]) - extractUniqueMetadata() implemented
- [X] T030 [US3] Implement metadata existence check using Supabase batch query (batch query with .in() clause for each metadata type, respect RLS filtering by project_id) - checkMetadataExistence() implemented
- [X] T031 [US3] Categorize metadata as existing vs will-create (MetadataDiscovery[] with exists boolean and recordId) - analyzeMetadata() implemented with full MetadataDiscoveryResult
- [X] T032 [US3] Integrate metadata discovery into ImportPreview component (display metadata analysis section with green checkmarks for existing, yellow badges for will-create) - UI already present (lines 150-248)

### Tests for Metadata Upsert (Server-Side)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T033 [P] [US3] Integration test for metadata creation during import in tests/integration/flexible-import-metadata-server.test.ts (mock transaction, verify upsert logic) - 11 tests passing

### Implementation for Metadata Upsert (Edge Function)

- [X] T034 [US3] Modify Edge Function payload acceptance in supabase/functions/import-takeoff/index.ts (accept ImportPayload JSON instead of raw CSV, extract metadata.areas/systems/testPackages) - index.ts fully rewritten for JSON payload
- [X] T035 [US3] Implement metadata upsert logic in supabase/functions/import-takeoff/transaction-v2.ts (batch upsert Areas before components, upsert with ignoreDuplicates, return IDs) - upsertMetadata() implemented
- [X] T036 [US3] Implement metadata lookup map generation (build Map<name, id> for areas, systems, testPackages after upsert) - lookupMaps generated in upsertMetadata()
- [X] T037 [US3] Link components to metadata via foreign keys (set area_id, system_id, test_package_id using lookup maps, handle null for empty CSV values) - processImportV2() links via foreign keys
- [X] T038 [US3] Update ImportResult response to include metadataCreated counts - metadataCreated returned in ImportResult

**Checkpoint**: User Story 3 complete ✅ - Metadata auto-created during import, preview shows existence status

---

## Phase 6: User Story 4 - Handle Drawing Sheets as Separate Entities (Priority: P3) ✅ COMPLETE

**Goal**: Treat "P-91010_1 01of01" and "P-91010_1 02of02" as separate drawing records (no sheet stripping)

**Independent Test**: Upload CSV with sheet indicators and verify two separate drawing records created

### Tests for Drawing Sheet Handling

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T039 [P] [US4] Integration test for drawing sheet handling in tests/integration/flexible-import-drawing-sheets.test.ts (verify no sheet stripping, separate drawing records) - 15 tests passing

### Implementation for Drawing Sheet Handling

- [X] T040 [US4] Verify existing normalize-drawing.ts preserves sheet indicators (uppercase, collapse spaces, but NO stripping of "01of01" patterns) - VERIFIED, working correctly
- [X] T041 [US4] Verify Edge Function drawing processing treats sheets as full drawing name (upsert with full normalized name including sheets) - VERIFIED, will use full normalized names
- [X] T042 [US4] Add integration test validation that "P-91010_1 01of01" and "P-91010_1 02of02" create distinct drawing records - VERIFIED in T039 tests

**Checkpoint**: User Story 4 complete - Drawing sheets handled as separate entities ✅

---

## Phase 7: User Story 5 - Skip Unsupported Component Types with Warnings (Priority: P3) ✅ COMPLETE

**Goal**: Skip Gasket rows (and other unsupported types) with clear warnings, proceed with valid rows only

**Independent Test**: Upload CSV with 12 Gasket rows and 156 valid rows, verify preview shows "12 skipped" and import creates 156 components

### Tests for Type Filtering

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T043 [P] [US5] Integration test for unsupported type handling in tests/integration/flexible-import-type-filtering.test.ts (upload CSV with Gasket rows, verify skipped count, verify valid rows imported) - 18 tests passing

### Implementation for Type Filtering

- [X] T044 [US5] Verify csv-validator.ts categorizes unsupported types as "skipped" with reason "Unsupported component type: Gasket" (already implemented in T014, validate behavior) - VERIFIED, working correctly
- [X] T045 [US5] Verify ValidationResults component displays skipped rows grouped by category "unsupported_type" with row numbers - VERIFIED, component supports this
- [X] T046 [US5] Verify Edge Function receives only valid rows (client filters out skipped rows before sending ImportPayload) - VERIFIED, getValidRows() filters correctly

**Checkpoint**: User Story 5 complete - Unsupported types skipped gracefully, valid rows imported ✅

---

## Phase 8: Edge Function Integration & Transaction Safety

**Purpose**: Complete Edge Function modifications for JSON payload handling and transaction atomicity

### Tests for Edge Function

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T047 [P] Integration test for Edge Function transaction rollback in tests/integration/flexible-import-transaction.test.ts (test metadata failure → rollback, component failure → rollback metadata, duplicate key → error response)
- [X] T048 [P] Contract test for ImportPayload/ImportResult types in tests/contract/csv-import-contracts.test.ts (validate client-side identity key generation matches server-side)

### Implementation for Edge Function

- [X] T049 Modify Edge Function index.ts to accept structured JSON ImportPayload (replace CSV file upload with JSON body parsing, validate payload structure)
- [X] T050 Implement payload size check (return error if payload > 5.5MB)
- [X] T051 Update transaction.ts to use payload.rows directly (skip CSV parsing, rows already normalized and validated client-side)
- [X] T052 Implement server-side validation as final check (re-validate required fields, component types, identity keys vs database, defense-in-depth)
- [X] T053 Maintain batch insert logic (1000 components per batch using existing pattern)
- [X] T054 Update error response format to include ErrorDetail[] (row numbers, issues, drawing context)
- [X] T055 Test transaction rollback on metadata/component failure (all-or-nothing semantics)

**Checkpoint**: Edge Function complete - Accepts JSON, validates, creates metadata, inserts components, returns detailed results

---

## Phase 9: Performance Optimization & Polish

**Purpose**: Ensure performance targets met, improve UX

- [ ] T056 [P] Implement lazy rendering for preview sections (column mappings, metadata analysis expandable, defer expensive DOM operations)
- [ ] T057 [P] Add progressive yielding for validation if needed (every 100 rows, yield to UI thread to prevent blocking)
- [ ] T058 [P] Optimize sample data rendering (React.memo for sub-components, virtualization if needed for large tables)
- [ ] T059 [P] Add loading states and progress indicators (parsing, validation, metadata check, import execution)
- [ ] T060 [P] Implement client-side payload size warning (show warning before import if approaching 5.5MB limit)
- [ ] T061 Test preview display time with 1,000-row CSV (target <3 seconds)
- [ ] T062 Test import execution time with 1,000-row CSV (target <60 seconds)
- [ ] T063 [P] Add error boundary for preview component (graceful failure on parsing errors)
- [ ] T064 [P] Improve accessibility (ARIA labels, keyboard navigation, screen reader support per WCAG 2.1 AA)

---

## Phase 10: Documentation & Validation

**Purpose**: Document feature, validate completeness

- [ ] T065 [P] Run test suite and verify ≥80% coverage for src/lib/csv/ utilities
- [ ] T066 [P] Run test suite and verify ≥60% coverage for src/components/ UI components
- [ ] T067 [P] Run test suite and verify ≥70% overall coverage
- [ ] T068 [P] Validate against quickstart.md test scenarios (upload Dark Knight CSV, verify 156 components, 14 skipped)
- [ ] T069 [P] Test edge cases from spec.md (duplicate columns, malformed CSV, exceeds limits, missing required fields)
- [ ] T070 [P] Update CLAUDE.md Active Technologies section with Papa Parse and flexible import feature
- [ ] T071 Create implementation notes document in specs/024-flexible-csv-import/IMPLEMENTATION-NOTES.md (document learnings, gotchas, performance notes)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 (Phase 3): Column mapping - no story dependencies
  - US1+US2 (Phase 4): Validation & Preview - extends US1, adds preview UI
  - US3 (Phase 5): Metadata auto-creation - can start after Foundational
  - US4 (Phase 6): Drawing sheets - can start after Foundational
  - US5 (Phase 7): Type filtering - depends on validation logic from Phase 4
- **Edge Function Integration (Phase 8)**: Depends on US1+US2 (needs ImportPayload structure)
- **Performance & Polish (Phase 9)**: Depends on core features complete (Phase 3-8)
- **Documentation (Phase 10)**: Depends on all features complete

### User Story Dependencies

- **User Story 1 (P1)**: Column mapping - independent, can start after Foundational
- **User Story 2 (P1)**: Preview UI - extends US1, needs column mapping complete
- **User Story 3 (P2)**: Metadata auto-creation - independent of US1/US2 for client-side discovery, integrates with preview
- **User Story 4 (P3)**: Drawing sheets - independent, verifies existing normalization behavior
- **User Story 5 (P3)**: Type filtering - depends on validation logic from US1+US2

### Within Each Phase

- Tests MUST be written and FAIL before implementation (TDD workflow)
- Unit tests can run in parallel (marked [P])
- Utilities before UI components
- Client-side before server-side
- Core implementation before integration

### Parallel Opportunities

**Phase 1 (Setup)**: All 3 tasks can run in parallel
**Phase 2 (Foundational)**: T005 can run parallel with T004
**Phase 3 (US1 Tests)**: T006, T007 can run in parallel
**Phase 4 (US1+US2 Tests)**: T011, T012, T017, T018, T019 can all run in parallel
**Phase 4 (US1+US2 Implementation)**: T013, T020, T021 can run in parallel (different files)
**Phase 5 (US3 Tests)**: T027, T028, T033 can run in parallel
**Phase 5 (US3 Implementation)**: T029, T032 can run in parallel
**Phase 6 (US4)**: T040, T041 can run in parallel (validation tasks)
**Phase 7 (US5)**: T044, T045, T046 can run in parallel (validation tasks)
**Phase 8 (Edge Function Tests)**: T047, T048 can run in parallel
**Phase 9 (Performance)**: T056, T057, T058, T059, T060, T063, T064 can all run in parallel
**Phase 10 (Documentation)**: T065, T066, T067, T068, T069, T070 can all run in parallel

---

## Parallel Example: User Story 1 Tests

```bash
# Launch all tests for User Story 1 together:
Task: "Unit test for column-mapper.ts in src/lib/csv/column-mapper.test.ts"
Task: "Integration test for column mapping flow in tests/integration/flexible-import-column-mapping.test.ts"

# Both tests can run in parallel (different files, no dependencies)
```

## Parallel Example: User Story 2 UI Components

```bash
# Launch all component tests for User Story 2 together:
Task: "Component test for ColumnMappingDisplay.tsx in src/components/ColumnMappingDisplay.test.tsx"
Task: "Component test for ValidationResults.tsx in src/components/ValidationResults.test.tsx"
Task: "Component test for ImportPreview.tsx in src/components/ImportPreview.test.tsx"

# All three tests can run in parallel (different files, no dependencies)
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only)

1. Complete Phase 1: Setup (install Papa Parse, copy contracts)
2. Complete Phase 2: Foundational (verify existing CSV utilities)
3. Complete Phase 3: User Story 1 (column mapping)
4. Complete Phase 4: User Story 1 + User Story 2 (validation & preview)
5. **STOP and VALIDATE**: Test column mapping and preview independently
6. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 + 2 (column mapping & preview) → Test independently → Deploy/Demo (MVP!)
3. Add User Story 3 (metadata auto-creation) → Test independently → Deploy/Demo
4. Add User Story 4 (drawing sheets) → Test independently → Deploy/Demo
5. Add User Story 5 (type filtering) → Test independently → Deploy/Demo
6. Add Edge Function integration → Test end-to-end → Deploy/Demo
7. Add Performance & Polish → Final validation → Production release

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 + 2 (column mapping & preview)
   - Developer B: User Story 3 (metadata discovery client-side)
   - Developer C: User Story 4 + 5 (drawing sheets & type filtering)
3. After core features:
   - Developer A: Edge Function integration
   - Developer B: Performance optimization
   - Developer C: Documentation & validation

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (Red-Green-Refactor)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Phase 4 combines US1+US2 because preview (US2) requires validation which builds on column mapping (US1)
- Papa Parse handles CSV parsing, no need for manual implementation
- Existing CSV utilities (normalize-drawing, normalize-size, generate-identity-key) reused from Feature 009
- TDD workflow mandatory per Constitution Principle III
- Target coverage: ≥80% utilities, ≥60% components, ≥70% overall
