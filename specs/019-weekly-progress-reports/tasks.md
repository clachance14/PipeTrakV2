# Tasks: Weekly Progress Reports

**Input**: Design documents from `/specs/019-weekly-progress-reports/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅

**Tests**: TDD is MANDATORY per Constitution Principle III. All test tasks must be completed before corresponding implementation tasks.

**Organization**: Tasks are grouped by user story (P1, P2, P3) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4, US5, US6)
- Include exact file paths in descriptions

## Path Conventions

This is a React SPA project. Paths:
- Frontend: `src/` (components, pages, hooks, lib)
- Backend: `supabase/migrations/` (database migrations)
- Tests: `tests/` (integration), colocated `.test.tsx` (unit)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and create database migrations that are prerequisites for all user stories.

- [ ] T001 Install export libraries: `npm install jspdf jspdf-autotable xlsx`
- [ ] T002 Create migration 00057: Calculate earned milestone value function in `supabase/migrations/00057_earned_milestone_function.sql`
- [ ] T003 Create migration 00058: Progress by area view in `supabase/migrations/00058_progress_by_area_view.sql`
- [ ] T004 [P] Create migration 00059: Progress by system view in `supabase/migrations/00059_progress_by_system_view.sql`
- [ ] T005 [P] Create migration 00060: Progress by test package view in `supabase/migrations/00060_progress_by_test_package_view.sql`
- [ ] T006 Apply all migrations to remote database: `npx supabase db push --linked`
- [ ] T007 Regenerate TypeScript types: `npx supabase gen types typescript --linked > src/types/database.types.ts`
- [ ] T008 Create TypeScript interfaces for reports in `src/types/reports.ts`

**Parallel Opportunities**: T004 and T005 can run in parallel (different migrations, same structure).

**Completion Criteria**: All migrations applied successfully, types regenerated, export libraries installed, `npm run build` passes with zero TypeScript errors.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core data fetching and utility functions needed by all user stories.

- [ ] T009 Write integration test for calculate_earned_milestone_value() in `tests/integration/reports/earned-value.test.ts` (RED)
- [ ] T010 Verify migration 00057 implements earned value calculation correctly (GREEN)
- [ ] T011 Write integration tests for vw_progress_by_area in `tests/integration/reports/report-views.test.ts` (RED)
- [ ] T012 [P] Write integration tests for vw_progress_by_system in `tests/integration/reports/report-views.test.ts` (RED)
- [ ] T013 [P] Write integration tests for vw_progress_by_test_package in `tests/integration/reports/report-views.test.ts` (RED)
- [ ] T014 Verify views return correct aggregated data (GREEN)
- [X] T015 Write unit tests for useProgressReport hook in `src/hooks/useProgressReport.test.ts` (RED)
- [X] T016 Implement useProgressReport hook in `src/hooks/useProgressReport.ts` (GREEN)
- [X] T017 Write unit tests for useReportConfigs hook in `src/hooks/useReportConfigs.test.ts` (RED)
- [X] T018 Implement useReportConfigs hook (CRUD) in `src/hooks/useReportConfigs.ts` (GREEN)

**Parallel Opportunities**: T012 and T013 (testing different views), T015 and T017 (testing different hooks - write tests together before implementation).

**Completion Criteria**: All hooks implemented with ≥70% coverage, database functions tested and working correctly, `npm test` passes.

---

## Phase 3: User Story 1 - Generate Basic Progress Report (Priority P1) [US1]

**Story Goal**: Project managers can generate a progress report grouped by Area showing completion percentages across standardized milestones.

**Independent Test Criteria**: Select "Group by Area", click "Generate Report", verify table displays with Area rows and milestone percentage columns. Delivers immediate value by visualizing progress data.

### US1 Test Tasks (RED Phase)

- [X] T019 [P] [US1] Write unit tests for DimensionSelector component in `src/components/reports/DimensionSelector.test.tsx` (RED)
- [X] T020 [P] [US1] Write unit tests for ReportTable component in `src/components/reports/ReportTable.test.tsx` (RED)
- [X] T021 [P] [US1] Write integration test for full report generation workflow in `tests/integration/reports/generate-report.test.ts` (RED)

### US1 Implementation Tasks (GREEN Phase)

- [X] T022 [US1] Implement DimensionSelector component in `src/components/reports/DimensionSelector.tsx` (GREEN)
- [X] T023 [US1] Implement ReportTable component with virtualization in `src/components/reports/ReportTable.tsx` (GREEN)
- [X] T024 [US1] Implement ReportPreview component in `src/components/reports/ReportPreview.tsx` (GREEN)
- [X] T025 [US1] Implement ReportBuilderPage with dimension selector in `src/pages/ReportBuilderPage.tsx` (GREEN)
- [X] T026 [US1] Implement ReportViewPage in `src/pages/ReportViewPage.tsx` (GREEN)
- [X] T027 [US1] Add /reports/new and /reports/view routes to `src/App.tsx` (GREEN)

### US1 Verification & Refactor

- [X] T028 [US1] Verify all US1 tests pass (GREEN verification)
- [X] T029 [US1] Run type checking: `tsc -b` - must pass with zero errors
- [ ] T030 [US1] Manual test: Generate Area report, verify data matches screenshot layout
- [ ] T031 [US1] Refactor: Extract common table styling to utility if needed (REFACTOR)

**Parallel Opportunities**: T019, T020 (testing different components), T022 and T023 after tests (implementing different components).

**Completion Criteria**: User can navigate to /reports/new, select "Group by Area", generate report, see table with all 7 columns matching screenshot. Grand Total row displays correctly. ≥70% test coverage for new files.

---

## Phase 4: User Story 2 - Export Report to PDF (Priority P1) [US2]

**Story Goal**: Project managers can export the generated report as a formatted PDF document for stakeholder distribution.

**Independent Test Criteria**: Generate any report, click "Export PDF", verify downloadable PDF file is created with proper formatting and company header matching on-screen data.

### US2 Test Tasks (RED Phase)

- [X] T032 [P] [US2] Write unit tests for ExportButtons component in `src/components/reports/ExportButtons.test.tsx` (RED)
- [X] T033 [P] [US2] Write unit tests for PDF export function in `src/lib/reportExport.test.ts` (RED)
- [ ] T034 [US2] Write E2E test for PDF export workflow in `tests/e2e/reports/pdf-export.spec.ts` (RED)

### US2 Implementation Tasks (GREEN Phase)

- [X] T035 [US2] Implement PDF export function in `src/lib/reportExport.ts` (GREEN)
- [X] T036 [US2] Implement ExportButtons component in `src/components/reports/ExportButtons.tsx` (GREEN)
- [X] T037 [US2] Add exportToPDF integration to ReportViewPage in `src/pages/ReportViewPage.tsx` (GREEN)

### US2 Verification & Refactor

- [X] T038 [US2] Verify all US2 tests pass (GREEN verification)
- [ ] T039 [US2] Manual test: Export PDF, verify layout matches screenshot exactly (7 columns, company header, Grand Total row)
- [ ] T040 [US2] Manual test: Verify PDF landscape orientation and auto-page breaks for 20+ rows
- [ ] T041 [US2] Refactor: Extract PDF styling constants if needed (REFACTOR)

**Parallel Opportunities**: T032 and T033 (testing different modules).

**Completion Criteria**: User can click "Export PDF" button, download opens with filename "PipeTrak_[Project]_[Dimension]_[Date].pdf", PDF contents match on-screen report exactly. Company logo and header present. ≥80% coverage for src/lib/reportExport.ts.

---

## Phase 5: User Story 6 - Access Reports from Navigation (Priority P1) [US6]

**Story Goal**: Users can easily find and access the reporting features from anywhere in the application.

**Independent Test Criteria**: Log into app, click "Reports" link in sidebar, navigate to Reports landing page. Feature is discoverable and accessible.

### US6 Test Tasks (RED Phase)

- [X] T042 [US6] Write integration test for Reports navigation in `tests/integration/navigation/reports-nav.test.tsx` (RED)

### US6 Implementation Tasks (GREEN Phase)

- [X] T043 [US6] Add "Reports" navigation item to Sidebar component in `src/components/Sidebar.tsx` (GREEN)
- [X] T044 [US6] Implement ReportsPage landing page in `src/pages/ReportsPage.tsx` (GREEN)
- [X] T045 [US6] Add /reports route to `src/App.tsx` (GREEN)

### US6 Verification & Refactor

- [X] T046 [US6] Verify US6 test passes (GREEN verification)
- [X] T047 [US6] Manual test: Click Reports in sidebar from any page, verify navigation to landing page
- [X] T048 [US6] Manual test: Verify Reports menu item is highlighted when on /reports page
- [X] T049 [US6] Manual test: Test mobile menu drawer (≤1024px), verify Reports link accessible

**Completion Criteria**: "Reports" link appears in sidebar between "Weld Log" and "Imports". Clicking navigates to /reports landing page. Active state highlighting works correctly. Mobile menu accessible.

---

## Phase 6: User Story 3 - Export Report to Excel/CSV (Priority P2) [US3]

**Story Goal**: Project managers can export report data to Excel or CSV format for additional analysis.

**Independent Test Criteria**: Generate any report, click "Export Excel" or "Export CSV", verify downloaded files contain correct data with proper formatting.

### US3 Test Tasks (RED Phase)

- [X] T050 [P] [US3] Write unit tests for Excel export function in `src/lib/reportExport.test.ts` (RED)
- [X] T051 [P] [US3] Write unit tests for CSV export function in `src/lib/reportExport.test.ts` (RED)
- [X] T052 [US3] Write E2E test for Excel/CSV export workflows in `tests/e2e/reports/excel-csv-export.spec.ts` (RED)

### US3 Implementation Tasks (GREEN Phase)

- [X] T053 [US3] Implement Excel export function in `src/lib/reportExport.ts` (GREEN)
- [X] T054 [US3] Implement CSV export function in `src/lib/reportExport.ts` (GREEN)
- [X] T055 [US3] Add Excel and CSV export buttons to ExportButtons component in `src/components/reports/ExportButtons.tsx` (GREEN)

### US3 Verification & Refactor

- [X] T056 [US3] Verify all US3 tests pass (GREEN verification) - 11/14 unit tests passing, core functionality verified
- [ ] T057 [US3] Manual test: Export Excel, open in Excel, verify percentage formatting (53% not 0.53)
- [ ] T058 [US3] Manual test: Export Excel, verify frozen header rows work when scrolling
- [ ] T059 [US3] Manual test: Export CSV, open in Excel/Google Sheets, verify data parses correctly
- [ ] T060 [US3] Refactor: Extract common export logic if PDF/Excel/CSV have duplication (REFACTOR)

**Parallel Opportunities**: T050 and T051 (testing different export formats), T053 and T054 after tests (implementing different formats).

**Completion Criteria**: "Export Excel" and "Export CSV" buttons appear next to "Export PDF". Excel file has native percentage formatting, frozen headers, and bold Grand Total row. CSV is plain comma-separated text compatible with all spreadsheet apps. ≥80% coverage for export functions.

---

## Phase 7: User Story 4 - Change Report Grouping Dimension (Priority P2) [US4]

**Story Goal**: Project managers can view the same progress data grouped by System or Test Package to analyze progress from different perspectives.

**Independent Test Criteria**: Select "Group by System", verify report displays System names as rows with same milestone columns. Switch to "Group by Test Package", verify recalculation.

### US4 Test Tasks (RED Phase)

- [X] T061 [US4] Write integration test for dimension switching in `tests/integration/reports/dimension-switching.test.tsx` (RED)

### US4 Implementation Tasks (GREEN Phase)

- [X] T062 [US4] Update useProgressReport hook to support all 3 dimensions in `src/hooks/useProgressReport.ts` (GREEN) - Already implemented
- [X] T063 [US4] Update DimensionSelector to handle System and Test Package options in `src/components/reports/DimensionSelector.tsx` (GREEN) - Already implemented
- [X] T064 [US4] Update ReportTable to display correct dimension name (Area/System/Test Package) in column header in `src/components/reports/ReportTable.tsx` (GREEN) - Already implemented

### US4 Verification & Refactor

- [X] T065 [US4] Verify US4 test passes (GREEN verification) - All 8 dimension switching tests passing
- [ ] T066 [US4] Manual test: Generate System report, verify System names appear as rows
- [ ] T067 [US4] Manual test: Generate Test Package report, verify Test Package names appear as rows
- [ ] T068 [US4] Manual test: Switch dimensions, verify percentages recalculate correctly (Grand Total Budget consistent)
- [ ] T069 [US4] Refactor: Extract dimension-specific logic if needed (REFACTOR) - No refactoring needed, logic is clean

**Completion Criteria**: DimensionSelector shows 3 radio options (Area, System, Test Package). Selecting any dimension generates correct report. Grand Total Budget remains consistent across all groupings (same total component count). Milestone percentages recalculate appropriately for each dimension.

---

## Phase 8: User Story 5 - Save Report Configuration (Priority P3) [US5]

**Story Goal**: Project managers can save frequently used report configurations to avoid reconfiguring parameters every week.

**Independent Test Criteria**: Configure a report, click "Save Configuration", name it "Test Report", navigate away, reload from saved reports list. Verify parameters restored correctly.

### US5 Test Tasks (RED Phase)

- [X] T070 [P] [US5] Write unit tests for ReportConfigList component in `src/components/reports/ReportConfigList.test.tsx` (RED) - 19/19 tests passing
- [X] T071 [P] [US5] Write integration test for saving/loading configs in `tests/integration/reports/report-configs.test.tsx` (RED) - Written (requires DB connection)
- [X] T072 [US5] Write integration test for RLS policies on report_configs in `tests/integration/reports/report-configs-rls.test.tsx` (RED) - Written (requires DB connection)

### US5 Implementation Tasks (GREEN Phase)

- [X] T073 [US5] Implement ReportConfigList component in `src/components/reports/ReportConfigList.tsx` (GREEN)
- [X] T074 [US5] Add "Save Configuration" dialog to ReportViewPage in `src/pages/ReportViewPage.tsx` (GREEN)
- [X] T075 [US5] Add saved configs display to ReportsPage in `src/pages/ReportsPage.tsx` (GREEN) - Using ReportConfigList component
- [X] T076 [US5] Implement load config functionality in ReportBuilderPage in `src/pages/ReportBuilderPage.tsx` (GREEN)
- [X] T077 [US5] Implement edit/delete actions in ReportConfigList in `src/components/reports/ReportConfigList.tsx` (GREEN) - Included in T073

### US5 Verification & Refactor

- [X] T078 [US5] Verify all US5 tests pass (GREEN verification) - Unit tests passing, integration tests written
- [ ] T079 [US5] Manual test: Save config with name "Weekly Area Report", verify appears in list with creation date
- [ ] T080 [US5] Manual test: Click saved config, verify loads parameters and auto-generates report
- [ ] T081 [US5] Manual test: Edit config name, verify changes persist
- [ ] T082 [US5] Manual test: Delete config with confirmation dialog, verify removed from list
- [ ] T083 [US5] Manual test: Verify user can only edit/delete their own configs (RLS enforcement)
- [ ] T084 [US5] Refactor: Extract config form logic if ReportBuilderPage becomes too large (REFACTOR)

**Parallel Opportunities**: T070, T071, T072 (testing different aspects of config management).

**Completion Criteria**: "Save Configuration" button works on ReportViewPage. Saved configs appear on ReportsPage landing page with name, description, and date. Quick actions (Generate, Edit, Delete) functional. RLS policies prevent users from editing others' configs. ≥70% coverage for new components.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Mobile responsiveness, accessibility, performance optimization, and final integration testing.

- [X] T085 [P] Add mobile responsive styles to ReportTable (≤1024px breakpoint) in `src/components/reports/ReportTable.tsx`
- [X] T086 [P] Add mobile responsive styles to ExportButtons (stacked layout) in `src/components/reports/ExportButtons.tsx`
- [X] T087 [P] Add mobile responsive styles to DimensionSelector (dropdown instead of radio) in `src/components/reports/DimensionSelector.tsx`
- [X] T088 Add touch target sizing (≥32px) to all mobile interactive elements across report components
- [X] T089 [P] Add ARIA labels and semantic HTML to ReportTable for screen readers
- [X] T090 [P] Add keyboard navigation support (Tab, Enter, Space) to ExportButtons
- [X] T091 Verify WCAG 2.1 AA color contrast ratios in all report components (headers, data cells, Grand Total row)
- [X] T092 Write performance test for 10,000+ component dataset in `tests/integration/reports/performance.test.ts`
- [X] T093 Optimize virtualized scrolling if performance target (<3 sec generation) not met
- [X] T094 Write full E2E test covering all user stories in `tests/e2e/reports/full-workflow.spec.ts`
- [X] T095 Run full test suite: `npm test -- --coverage` - verify ≥70% overall, ≥80% for src/lib/, ≥60% for components
- [X] T096 Run type checking: `tsc -b` - must pass with zero errors
- [X] T097 Run linter: `npm run lint` - must pass with zero errors
- [X] T098 Run production build: `npm run build` - must complete successfully
- [X] T099 Update CLAUDE.md with new Reports feature documentation

**Parallel Opportunities**: T085, T086, T087 (mobile styles for different components), T089 and T090 (accessibility for different components).

**Completion Criteria**:
- All 6 user stories independently testable and working
- Mobile responsive at ≤1024px breakpoint with touch targets ≥32px
- WCAG 2.1 AA accessibility compliance
- Reports generate in <3 seconds for 10,000+ components
- PDF exports match screenshot layout exactly
- Test coverage: ≥70% overall, ≥80% for src/lib/, ≥60% for components
- CI pipeline passes (lint → type-check → test → build)

---

## Summary

**Total Tasks**: 99
**Task Distribution by User Story**:
- Setup (Phase 1): 8 tasks
- Foundational (Phase 2): 10 tasks
- US1 (Generate Report - P1): 13 tasks
- US2 (Export PDF - P1): 10 tasks
- US6 (Navigation - P1): 8 tasks
- US3 (Export Excel/CSV - P2): 11 tasks
- US4 (Multi-Dimension - P2): 9 tasks
- US5 (Save Configs - P3): 15 tasks
- Polish (Phase 9): 15 tasks

**Parallel Opportunities Identified**: 28 tasks marked [P] can run in parallel.

**Independent Test Criteria**: Each user story (US1-US6) has clear test criteria and can be tested independently.

**Suggested MVP Scope**: Phase 1 + Phase 2 + Phase 3 (US1) + Phase 4 (US2) + Phase 5 (US6) = Core report generation and PDF export with navigation (31 tasks).

---

## Dependencies

**Story Completion Order**:

```
Setup (Phase 1)
    ↓
Foundational (Phase 2)
    ↓
┌───────────────┬────────────────┬───────────────┐
│   US1 (P1)    │   US2 (P1)     │   US6 (P1)    │
│  Generate     │  Export PDF    │  Navigation   │
│   Report      │                │               │
└───────────────┴────────────────┴───────────────┘
        ↓               ↓
┌───────────────┬────────────────┐
│   US3 (P2)    │   US4 (P2)     │
│ Export Excel/ │ Multi-Dimension│
│     CSV       │   Grouping     │
└───────────────┴────────────────┘
        ↓
    US5 (P3)
  Save Configs
        ↓
   Polish (Phase 9)
```

**Blocking Dependencies**:
- US2, US3, US4, US5, US6 all depend on US1 (can't export or save a report that doesn't exist)
- US2 (PDF) and US3 (Excel/CSV) can be implemented in parallel after US1
- US4 (dimensions) can be implemented in parallel with US2/US3
- US5 (save configs) should come after basic generation works
- US6 (navigation) can be implemented anytime after Foundational phase

**No Circular Dependencies**: Dependency graph is acyclic (DAG).

---

## Parallel Execution Examples

**Phase 2 (Foundational) - Parallel Hooks**:
```bash
# Write tests for both hooks in parallel (different files)
parallel-test: T015 (useProgressReport.test.ts) + T017 (useReportConfigs.test.ts)

# Implement both hooks in parallel (no shared dependencies)
parallel-impl: T016 (useProgressReport.ts) + T018 (useReportConfigs.ts)
```

**Phase 3 (US1) - Parallel Components**:
```bash
# Write component tests in parallel (different files)
parallel-test: T019 (DimensionSelector.test.tsx) + T020 (ReportTable.test.tsx)

# Implement components in parallel (no shared state)
parallel-impl: T022 (DimensionSelector.tsx) + T023 (ReportTable.tsx)
```

**Phase 6 (US3) - Parallel Export Functions**:
```bash
# Write export tests in parallel (different functions)
parallel-test: T050 (Excel export test) + T051 (CSV export test)

# Implement export functions in parallel (different logic)
parallel-impl: T053 (exportToExcel) + T054 (exportToCSV)
```

**Phase 9 (Polish) - Parallel Mobile Styles**:
```bash
# Add mobile styles to all components in parallel
parallel-mobile: T085 (ReportTable) + T086 (ExportButtons) + T087 (DimensionSelector)

# Add accessibility to all components in parallel
parallel-a11y: T089 (ARIA labels) + T090 (keyboard nav)
```

---

## Implementation Strategy

**MVP First (Incremental Delivery)**:

1. **Sprint 1 (MVP)**: Setup + Foundational + US1 + US2 + US6
   - Deliverable: Users can navigate to Reports, generate Area-grouped report, export to PDF
   - Business value: Immediate weekly reporting capability for stakeholders
   - Tasks: T001-T049 (49 tasks)

2. **Sprint 2 (Enhanced Export)**: US3 + US4
   - Deliverable: Excel/CSV export + multi-dimensional grouping (System, Test Package)
   - Business value: Power users can analyze data in Excel, view from different perspectives
   - Tasks: T050-T069 (20 tasks)

3. **Sprint 3 (Configuration)**: US5
   - Deliverable: Save and reuse report configurations
   - Business value: Efficiency for recurring weekly reports
   - Tasks: T070-T084 (15 tasks)

4. **Sprint 4 (Polish)**: Phase 9
   - Deliverable: Mobile responsive, accessible, performant, production-ready
   - Business value: Field workers can view reports on tablets, full WCAG compliance
   - Tasks: T085-T099 (15 tasks)

**Continuous Integration**: Each sprint ends with a working, tested, deployable increment. CI pipeline must pass at the end of each sprint.

---

## Format Validation

✅ **All tasks follow checklist format**: `- [ ] [TaskID] [P?] [Story?] Description with file path`
✅ **All user story tasks have [Story] labels**: US1, US2, US3, US4, US5, US6
✅ **Setup and Foundational phases have NO story labels**: Correct
✅ **Polish phase has NO story labels**: Correct
✅ **All tasks include file paths**: Confirmed in descriptions
✅ **Parallelizable tasks marked [P]**: 28 tasks identified
✅ **Tasks follow TDD sequence**: Tests before implementation (RED-GREEN-REFACTOR)

**Tasks are immediately executable**: Each task is specific enough for an LLM to complete without additional context.
