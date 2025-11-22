# Tasks: Advanced Report Generation with Component-Based PDF Library

**Input**: Design documents from `/specs/029-react-pdf-reports/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/pdf-components.ts, quickstart.md

**Tests**: This feature includes comprehensive test coverage per project constitution. Tests follow TDD workflow (Red-Green-Refactor).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Single project: `src/`, `tests/` at repository root
- Paths use `@/*` alias for `src/*`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and component library foundation

- [X] T001 Install @react-pdf/renderer dependency: `npm install @react-pdf/renderer@4.3.1`
- [X] T002 [P] Create PDF component directory structure: `src/components/pdf/{layout,tables,reports,styles}/`
- [X] T003 [P] Create barrel export file for PDF components: `src/components/pdf/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core PDF styling and reusable components that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Create shared PDF styles in `src/components/pdf/styles/commonStyles.ts` (colors: slate-700 header, typography scale, layout patterns)
- [X] T005 [P] Create BrandedHeader component in `src/components/pdf/layout/BrandedHeader.tsx` (logo, title, project name, dimension, date)
- [X] T006 [P] Create ReportFooter component in `src/components/pdf/layout/ReportFooter.tsx` (page numbers, company info)
- [X] T007 Create PageLayout component in `src/components/pdf/layout/PageLayout.tsx` (combines header + content + footer with size/orientation props)
- [X] T008 [P] Create TableHeader component in `src/components/pdf/tables/TableHeader.tsx` (header row with column definitions)
- [X] T009 [P] Create TableRow component in `src/components/pdf/tables/TableRow.tsx` (data row with formatting by column type)
- [X] T010 Create Table component in `src/components/pdf/tables/Table.tsx` (combines header + rows + grand total)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Export Enhanced Field Weld Report (Priority: P1) 🎯 MVP

**Goal**: Generate professional PDF reports with company branding and consistent formatting for all field weld dimensions

**Independent Test**: Select a field weld report dimension (area/system/test_package/welder), click "Export PDF (Enhanced)", and verify that a branded PDF downloads with proper formatting, company logo (if provided), and all data displayed correctly. Text is selectable. Multi-page reports have repeated headers and page numbers.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T011 [P] [US1] Unit test for BrandedHeader component in `src/components/pdf/layout/BrandedHeader.test.tsx` (mocked @react-pdf/renderer, verify props render)
- [X] T012 [P] [US1] Unit test for ReportFooter component in `src/components/pdf/layout/ReportFooter.test.tsx` (verify page number rendering)
- [X] T013 [P] [US1] Unit test for PageLayout component in `src/components/pdf/layout/PageLayout.test.tsx` (verify composition)
- [X] T014 [P] [US1] Unit test for Table component in `src/components/pdf/tables/Table.test.tsx` (verify column widths, formatting, grand total styling)
- [X] T015 [P] [US1] Unit test for FieldWeldReportPDF component in `src/components/pdf/reports/FieldWeldReportPDF.test.tsx` (verify all dimensions render correctly)
- [X] T016 [US1] Integration test for PDF generation in `tests/integration/pdf/FieldWeldReportPDF.test.tsx` (real @react-pdf/renderer, generate blob, verify size <500KB, verify PDF mime type)
- [X] T017 [US1] Integration test for all dimensions in `tests/integration/pdf/FieldWeldReportPDF.test.tsx` (area, system, test_package, welder - verify column counts)

### Implementation for User Story 1

- [X] T018 [US1] Create FieldWeldReportPDF component in `src/components/pdf/reports/FieldWeldReportPDF.tsx` (Document with Page, uses BrandedHeader, Table, ReportFooter)
- [X] T019 [US1] Implement data transformation utilities in `src/lib/pdfUtils.ts` (transform FieldWeldReportData to TableProps, format percentages, numbers, decimals, handle nulls)
- [X] T020 [US1] Create useFieldWeldPDFExport hook in `src/hooks/useFieldWeldPDFExport.ts` (lazy load @react-pdf/renderer, manage isGenerating state, handle errors, trigger download)
- [X] T021 [US1] Implement filename generation utility in `src/lib/pdfUtils.ts` (sanitizeFilename, formatDateForFilename, construct pattern: `[project]_field_weld_[dimension]_[YYYY-MM-DD].pdf`)
- [X] T022 [US1] Handle multi-page reports with repeated headers in `src/components/pdf/reports/FieldWeldReportPDF.tsx` (if >50 rows, split into multiple <Page> components)
- [X] T023 [US1] Handle empty data edge case in `src/components/pdf/reports/FieldWeldReportPDF.tsx` (show "No data available" message)
- [X] T024 [US1] Handle special characters in text fields in `src/lib/pdfUtils.ts` (escape for PDF rendering)
- [X] T025 [US1] Implement text wrapping/truncation for long names in `src/components/pdf/tables/TableRow.tsx` (maintain table structure)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. PDFs can be generated programmatically via the hook.

---

## Phase 4: User Story 2 - Preview Report Before Saving (Priority: P2)

**Goal**: Provide loading indicators and success/error feedback during PDF generation

**Independent Test**: Trigger PDF generation and observe that a loading spinner appears, the button is disabled during generation, and a success toast notification appears when complete. Error toast appears if generation fails.

### Tests for User Story 2

- [X] T026 [P] [US2] Integration test for useFieldWeldPDFExport hook in `tests/integration/pdf/useFieldWeldPDFExport.test.tsx` (verify isGenerating state transitions, error handling, real PDF generation)
- [X] T027 [US2] Integration test for loading states in `tests/integration/pdf/useFieldWeldPDFExport.test.tsx` (verify button disabled during generation, toast notifications)

### Implementation for User Story 2

- [X] T028 [US2] Add export button to ReportsPage in `src/pages/ReportsPage.tsx` (desktop only: `hidden lg:flex`, Button component, onClick handler)
- [X] T029 [US2] Integrate useFieldWeldPDFExport hook in `src/pages/ReportsPage.tsx` (destructure generatePDF, isGenerating, error)
- [X] T030 [US2] Add loading indicator to button in `src/pages/ReportsPage.tsx` (conditional text: "Generating..." vs "Export PDF (Enhanced)", disable when isGenerating)
- [X] T031 [US2] Add success toast notification in `src/pages/ReportsPage.tsx` (toast.success after successful PDF generation)
- [X] T032 [US2] Add error toast notification in `src/pages/ReportsPage.tsx` (toast.error with actionable message on generation failure)
- [X] T033 [US2] Prevent multiple simultaneous exports in `src/hooks/useFieldWeldPDFExport.ts` (check isGenerating before starting new generation)
- [X] T034 [US2] Handle long generation times in `src/hooks/useFieldWeldPDFExport.ts` (loading state persists, no timeout for user)
- [X] T035 [US2] Handle browser download blocking in `src/hooks/useFieldWeldPDFExport.tsx` (catch download errors, show toast instructing user to check permissions)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. Users have full UX feedback during PDF generation.

---

## Phase 5: User Story 3 - Compare Export Quality (Priority: P3)

**Goal**: Provide both classic jsPDF export and new enhanced export for comparison

**Independent Test**: Verify that two separate export buttons exist ("Export PDF (Classic)" and "Export PDF (Enhanced)"), both work independently, and produce PDFs with different characteristics (one programmatic, one component-based).

### Tests for User Story 3

- [X] T036 [P] [US3] Integration test for dual export buttons in `tests/integration/reports/pdfExport.test.tsx` (verify both buttons exist in component structure, desktop-only constraint)
- [X] T037 [US3] Integration test for button behavior in `tests/integration/reports/pdfExport.test.tsx` (verify button structure, loading states, accessibility)

### Implementation for User Story 3

- [X] T038 [US3] Add "Export PDF (Enhanced)" button label in `src/pages/ReportsPage.tsx` (distinguish from classic button)
- [X] T039 [US3] Ensure classic "Export PDF" button remains functional in `src/pages/ReportsPage.tsx` (rename to "Export PDF (Classic)" for clarity)
- [X] T040 [US3] Group both export buttons in flexbox container in `src/pages/ReportsPage.tsx` (`hidden lg:flex gap-2`)
- [X] T041 [US3] Test both exports produce valid PDFs in `tests/integration/reports/dualPdfExport.test.tsx` (acceptance test scenario with real PDF generation)

**Checkpoint**: All user stories should now be independently functional. Users can compare classic vs enhanced PDF quality.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T042 [P] Update CLAUDE.md with PDF component patterns in `CLAUDE.md` (document component library location, lazy loading pattern, testing approach)
- [X] T043 [P] Add JSDoc comments to PDF components in `src/components/pdf/**/*.tsx` (document props, usage examples)
- [X] T044 [P] Add JSDoc comments to hook in `src/hooks/useFieldWeldPDFExport.tsx` (document return type, error handling)
- [X] T045 Verify quickstart.md accuracy by following guide in `specs/029-react-pdf-reports/quickstart.md` (ensure all examples work)
- [ ] T046 [P] Add unit tests for pdfUtils in `src/lib/pdfUtils.test.ts` (sanitizeFilename, formatDateForFilename, data transformations)
- [ ] T047 Run full test suite and verify coverage targets: `npm test -- --coverage` (≥70% overall, ≥80% lib, ≥60% components)
- [ ] T048 Test PDFs in multiple desktop browsers: Chrome, Firefox, Safari, Edge (verify rendering, text selection, page breaks)
- [ ] T049 Verify PDF file sizes for typical reports: 10 rows, 50 rows, 100 rows (ensure <500KB for 10-50 rows)
- [ ] T050 Performance test: Generate 100-row PDF and verify <5 seconds in `tests/integration/reports/pdfExport.test.tsx`
- [ ] T051 Verify desktop-only constraint: Test at 1023px and 1024px widths (buttons hidden <1024px, visible ≥1024px)
- [ ] T052 Code cleanup: Remove any unused imports, console.logs, commented code
- [X] T053 Update PROJECT-STATUS.md with Feature 029 completion status

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories - Delivers standalone PDF generation
- **User Story 2 (P2)**: Can start after US1 implementation complete - Adds UX feedback to existing PDF generation
- **User Story 3 (P3)**: Can start after US2 complete - Adds comparison button to existing export functionality

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD workflow)
- Tests marked [P] can run in parallel
- Implementation tasks follow dependencies (utilities before components, hooks before UI)
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- All tests for a user story marked [P] can run in parallel
- Models/utilities within a story marked [P] can run in parallel
- User Stories 1, 2, 3 have sequential dependencies (US2 depends on US1 UI integration, US3 depends on US2 button placement)

---

## Parallel Example: User Story 1

```bash
# Launch all unit tests for User Story 1 together:
Task: "Unit test for BrandedHeader component in src/components/pdf/layout/BrandedHeader.test.tsx"
Task: "Unit test for ReportFooter component in src/components/pdf/layout/ReportFooter.test.tsx"
Task: "Unit test for PageLayout component in src/components/pdf/layout/PageLayout.test.tsx"
Task: "Unit test for Table component in src/components/pdf/tables/Table.test.tsx"
Task: "Unit test for FieldWeldReportPDF component in src/components/pdf/reports/FieldWeldReportPDF.test.tsx"

# After foundational components are built, implement utilities in parallel:
Task: "Implement data transformation utilities in src/lib/pdfUtils.ts"
Task: "Implement filename generation utility in src/lib/pdfUtils.ts" (same file, but independent functions)
```

---

## Parallel Example: Foundational Phase

```bash
# Launch all layout components together:
Task: "Create BrandedHeader component in src/components/pdf/layout/BrandedHeader.tsx"
Task: "Create ReportFooter component in src/components/pdf/layout/ReportFooter.tsx"

# Launch all table components together:
Task: "Create TableHeader component in src/components/pdf/tables/TableHeader.tsx"
Task: "Create TableRow component in src/components/pdf/tables/TableRow.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T010) - CRITICAL - blocks all stories
3. Complete Phase 3: User Story 1 (T011-T025)
4. **STOP and VALIDATE**: Test User Story 1 independently
   - Generate PDF for all 4 dimensions
   - Verify text selectable
   - Verify multi-page reports work
   - Verify file size <500KB
   - Verify generation time <5s
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready (PDF component library usable)
2. Add User Story 1 → Test independently → Deploy/Demo (MVP! - Core PDF generation works)
3. Add User Story 2 → Test independently → Deploy/Demo (Enhanced UX with loading states and toasts)
4. Add User Story 3 → Test independently → Deploy/Demo (Comparison feature for user feedback)
5. Each story adds value without breaking previous stories

### Sequential Strategy (Recommended for this feature)

User Stories 2 and 3 depend on User Story 1's UI integration:

1. Complete Setup + Foundational together
2. Complete User Story 1 (PDF generation works programmatically)
3. Complete User Story 2 (Adds button, loading states, toasts to ReportsPage)
4. Complete User Story 3 (Adds second button for comparison)

This feature is best implemented sequentially due to UI dependencies, though foundational components can be parallelized.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (TDD workflow)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Desktop-only constraint: All export buttons use `hidden lg:flex` Tailwind classes
- Lazy loading: @react-pdf/renderer imported dynamically in hook, not at module top-level
- Zero bundle impact: Library only loads when user clicks export button
- Type safety: All components use TypeScript strict mode with interfaces from contracts/pdf-components.ts
- Testing: Three-tier strategy (unit with mocked renderer, integration with real renderer, acceptance tests)
- Performance: <5s generation for 100 rows, <500KB file size for 10-50 rows
- Avoid: Importing @react-pdf/renderer at module top-level (breaks lazy loading), using Tailwind classes in PDF components (not supported), forgetting desktop-only constraint

---

## Task Summary

- **Total Tasks**: 53
- **Phase 1 (Setup)**: 3 tasks
- **Phase 2 (Foundational)**: 7 tasks
- **Phase 3 (User Story 1 - MVP)**: 15 tasks (7 tests + 8 implementation)
- **Phase 4 (User Story 2)**: 10 tasks (2 tests + 8 implementation)
- **Phase 5 (User Story 3)**: 4 tasks (2 tests + 2 implementation)
- **Phase 6 (Polish)**: 12 tasks

**Parallel Opportunities**:
- Setup: 2 of 3 tasks can run in parallel
- Foundational: 5 of 7 tasks can run in parallel
- US1 Tests: 5 of 7 tests can run in parallel
- US1 Implementation: Some utilities can be parallelized
- US2 Tests: 2 tests can run in parallel
- US3 Tests: 2 tests can run in parallel
- Polish: 5 of 12 tasks can run in parallel

**Suggested MVP Scope**: Phase 1 (Setup) + Phase 2 (Foundational) + Phase 3 (User Story 1)
- Delivers: Professional PDF generation with branding, all dimensions, multi-page support, text selection
- 25 tasks total for MVP
- Estimated effort: 2-3 days for single developer following TDD workflow

**Independent Test Criteria**:
- **US1**: Generate PDF for area/system/test_package/welder, verify branded header, formatted table, selectable text, multi-page with headers/page numbers, file size <500KB, generation <5s
- **US2**: Verify loading spinner on button, button disabled during generation, success toast on completion, error toast on failure
- **US3**: Verify two buttons exist ("Classic" and "Enhanced"), both produce valid PDFs with different formatting characteristics

**Format Validation**: All 53 tasks follow required checklist format:
- ✅ Checkbox `- [ ]`
- ✅ Task ID (T001-T053)
- ✅ [P] marker for parallel tasks
- ✅ [Story] label for user story tasks (US1, US2, US3)
- ✅ Clear description with exact file path
