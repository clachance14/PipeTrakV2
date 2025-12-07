# Tasks: Timeline Report Filter

**Input**: Design documents from `/specs/033-timeline-report-filter/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Phase 9 includes 13 test tasks (unit, component, integration, acceptance) per Constitution requirements.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create shared types and store extensions needed by all user stories

- [ ] T001 [P] Add delta report types (ReportDateRange, DateRangePreset, ProgressDeltaRow, ProgressDeltaGrandTotal, ManhourDeltaRow, ManhourDeltaGrandTotal) to `src/types/reports.ts`
- [ ] T002 [P] Add DATE_RANGE_PRESET_LABELS constant to `src/types/reports.ts`
- [ ] T003 Extend useReportPreferencesStore with dateRange state, setDateRangePreset, setCustomDateRange, resetDateRange in `src/stores/useReportPreferencesStore.ts`. Ensure persist middleware includes dateRange for session persistence.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database RPC functions that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Create migration with get_progress_delta_by_dimension RPC function in `supabase/migrations/YYYYMMDDHHMMSS_create_progress_delta_rpc.sql`
- [ ] T005 Add get_field_weld_delta_by_dimension RPC function to same migration file
- [ ] T006 Push migration using `./db-push.sh`
- [ ] T007 Regenerate TypeScript types with `supabase gen types typescript --linked > src/types/database.types.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View Weekly Progress Delta for Component Progress (Priority: P1) 🎯 MVP

**Goal**: Executives can select "Last 7 Days" on Component Progress tab and see delta values showing percentage points gained, not cumulative totals

**Independent Test**: Select "Last 7 Days" on Component Progress tab, verify delta values appear with +/- indicators and only areas with activity show

### Implementation for User Story 1

- [ ] T008 [P] [US1] Create DateRangeFilter component with Select dropdown and preset options in `src/components/reports/DateRangeFilter.tsx`
- [ ] T009 [P] [US1] Create resolveDateRange utility function (converts preset to start/end dates) in `src/hooks/useProgressDeltaReport.ts`
- [ ] T010 [US1] Implement useProgressDeltaReport hook calling get_progress_delta_by_dimension RPC in `src/hooks/useProgressDeltaReport.ts`. Filter out rows where componentsWithActivity === 0 before returning.
- [ ] T011 [US1] Create DeltaReportTable component with signed percentage formatting in `src/components/reports/DeltaReportTable.tsx`. Use green text for positive deltas (+), red text for negative deltas (-), neutral for zero.
- [ ] T012 [US1] Create NoActivityFound empty state component in `src/components/reports/NoActivityFound.tsx`
- [ ] T013 [US1] Integrate DateRangeFilter into ReportPreview header in `src/components/reports/ReportPreview.tsx`
- [ ] T014 [US1] Add conditional rendering: isDeltaMode ? DeltaReportTable : existing table in `src/components/reports/ReportPreview.tsx`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - View Monthly Progress Delta for Field Welds (Priority: P1)

**Goal**: Project managers can select "Last 30 Days" on Field Welds tab and see delta values for Fitup/Weld Complete/Accepted milestones

**Independent Test**: Select "Last 30 Days" on Field Welds tab, verify delta values appear for weld milestones and only active dimensions show

### Implementation for User Story 2

- [ ] T015 [P] [US2] Add FieldWeldDeltaRow and FieldWeldDeltaGrandTotal types to `src/types/reports.ts`
- [ ] T016 [P] [US2] Create useFieldWeldDeltaReport hook calling get_field_weld_delta_by_dimension RPC in `src/hooks/useFieldWeldDeltaReport.ts`. Filter out rows where weldsWithActivity === 0 before returning.
- [ ] T017 [US2] Create FieldWeldDeltaReportTable component with count deltas and percentage formatting in `src/components/reports/FieldWeldDeltaReportTable.tsx`
- [ ] T018 [US2] Integrate DateRangeFilter into FieldWeldReportPreview header in `src/components/reports/FieldWeldReportPreview.tsx`
- [ ] T019 [US2] Add conditional rendering: isDeltaMode ? FieldWeldDeltaReportTable : existing table in `src/components/reports/FieldWeldReportPreview.tsx`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - View Progress Delta by Manhours (Priority: P2)

**Goal**: Project managers can switch to Manhour view and see earned manhour deltas instead of percentage deltas

**Independent Test**: Select date range, switch to Manhour view, verify manhour delta values appear

### Implementation for User Story 3

- [ ] T020 [P] [US3] Create ManhourDeltaReportTable component with manhour formatting (+45 MH) in `src/components/reports/ManhourDeltaReportTable.tsx`. Handle components with zero manhour budget gracefully (display 0, not NaN/error).
- [ ] T021 [P] [US3] Create ManhourPercentDeltaReportTable component with MH% formatting in `src/components/reports/ManhourPercentDeltaReportTable.tsx`
- [ ] T022 [US3] Update ReportPreview to switch delta table based on viewMode (count/manhour/mhpct) in `src/components/reports/ReportPreview.tsx`

**Checkpoint**: User Stories 1, 2, AND 3 should all work independently

---

## Phase 6: User Story 4 - Use Custom Date Range (Priority: P2)

**Goal**: Executives can select "Custom" and enter specific start/end dates for precise reporting periods

**Independent Test**: Select Custom, enter valid dates, verify delta report shows only events in that range

### Implementation for User Story 4

- [ ] T023 [US4] Add DateRangePicker subcomponent with start/end date inputs to `src/components/reports/DateRangeFilter.tsx`
- [ ] T024 [US4] Add custom date validation (endDate >= startDate) to DateRangeFilter
- [ ] T025 [US4] Add clear button (X) to reset to "All Time" in DateRangeFilter

**Checkpoint**: User Stories 1, 2, 3, AND 4 should all work independently

---

## Phase 7: User Story 5 - View Year-to-Date Progress Summary (Priority: P3)

**Goal**: Executives can select "YTD" and see all progress since January 1st

**Independent Test**: Select YTD preset, verify date range covers Jan 1 to today

### Implementation for User Story 5

- [ ] T026 [US5] Verify YTD preset: confirm resolveDateRange returns Jan 1 to today, and DateRangeFilter includes YTD in preset dropdown options

**Checkpoint**: All user stories should now be independently functional

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T028 [P] Add aria-labels and keyboard navigation to DateRangeFilter for accessibility
- [ ] T028b Verify date range filter state persists when switching between Component Progress and Field Welds tabs
- [ ] T029 [P] Ensure mobile responsiveness for DateRangeFilter (44px touch targets, ≤1024px breakpoint)
- [ ] T030 Verify grand total calculations use weighted averages for percentages, sums for manhours
- [ ] T031 Run quickstart.md validation - test all date presets and view modes

---

## Phase 9: Testing (Constitution Compliance)

**Purpose**: TDD compliance per Constitution Principles III and IX

### Unit Tests

- [ ] T032 [P] [Test] Write unit tests for resolveDateRange utility (all presets + custom) in `src/hooks/useProgressDeltaReport.test.ts`
- [ ] T033 [P] [Test] Write unit tests for delta row filtering logic (zero activity removal) in `src/hooks/useProgressDeltaReport.test.ts`
- [ ] T034 [P] [Test] Write unit tests for useFieldWeldDeltaReport hook in `src/hooks/useFieldWeldDeltaReport.test.ts`

### Component Tests

- [ ] T035 [P] [Test] Write component tests for DateRangeFilter (preset selection, custom date inputs, validation) in `src/components/reports/DateRangeFilter.test.tsx`
- [ ] T036 [P] [Test] Write component tests for DeltaReportTable (positive/negative styling, formatting) in `src/components/reports/DeltaReportTable.test.tsx`
- [ ] T037 [P] [Test] Write component tests for NoActivityFound empty state in `src/components/reports/NoActivityFound.test.tsx`

### Integration Tests

- [ ] T038 [Test] Write integration test for get_progress_delta_by_dimension RPC in `tests/integration/progress-delta-rpc.test.ts`
- [ ] T039 [Test] Write integration test for get_field_weld_delta_by_dimension RPC in `tests/integration/field-weld-delta-rpc.test.ts`

### Acceptance Tests (1 per User Story)

- [ ] T040 [Test] [US1] Acceptance: Select "Last 7 Days" on Component Progress, verify delta values with +/- indicators appear
- [ ] T041 [Test] [US2] Acceptance: Select "Last 30 Days" on Field Welds, verify delta values for weld milestones appear
- [ ] T042 [Test] [US3] Acceptance: Select date range + Manhour view, verify manhour delta values appear
- [ ] T043 [Test] [US4] Acceptance: Select Custom dates, verify delta report shows only events in range
- [ ] T044 [Test] [US5] Acceptance: Select YTD, verify date range covers Jan 1 to today

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 and US2 can proceed in parallel (both P1 priority, different tabs)
  - US3 depends on US1 (extends Component Progress tab)
  - US4 extends DateRangeFilter (can start after US1 foundation)
  - US5 is minimal (verifies existing functionality)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Independent of US1 (different tab)
- **User Story 3 (P2)**: Depends on US1 DeltaReportTable pattern being established
- **User Story 4 (P2)**: Depends on US1 DateRangeFilter being created
- **User Story 5 (P3)**: Depends on US4 (extends DateRangeFilter with YTD)

### Within Each User Story

- Models/types before hooks
- Hooks before components
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- T001, T002 can run in parallel (both modify types file but different sections)
- T008, T009 can run in parallel (different files)
- T015, T016 can run in parallel (different files)
- T020, T021 can run in parallel (different files)
- T028, T029 can run in parallel (different concerns)

---

## Parallel Example: User Story 1 and User Story 2

```bash
# After Foundational phase, launch US1 and US2 in parallel:
# US1 Agent:
Task: "Create DateRangeFilter component in src/components/reports/DateRangeFilter.tsx"
Task: "Create resolveDateRange utility in src/hooks/useProgressDeltaReport.ts"

# US2 Agent (parallel):
Task: "Add FieldWeldDeltaRow types to src/types/reports.ts"
Task: "Create useFieldWeldDeltaReport hook in src/hooks/useFieldWeldDeltaReport.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (types + store)
2. Complete Phase 2: Foundational (RPC migration)
3. Complete Phase 3: User Story 1 (Component Progress delta)
4. **STOP and VALIDATE**: Select "Last 7 Days" and verify delta values appear
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (Field Welds)
4. Add User Story 3 → Test independently → Deploy/Demo (Manhour view)
5. Add User Story 4 → Test independently → Deploy/Demo (Custom dates)
6. Add User Story 5 → Test independently → Deploy/Demo (YTD)
7. Each story adds value without breaking previous stories

### Suggested MVP Scope

**Just User Story 1**: Component Progress date range filter with preset options (All Time, Last 7 Days, Last 30 Days). This delivers the primary executive use case and validates the RPC + hook + UI pattern.

---

## Summary

- **Total Task Count**: 44
- **Tasks by User Story**:
  - Setup (shared): 3 tasks
  - Foundational: 4 tasks
  - US1 (Component Progress Delta): 7 tasks
  - US2 (Field Weld Delta): 5 tasks
  - US3 (Manhour View): 3 tasks
  - US4 (Custom Date Range): 3 tasks
  - US5 (YTD): 1 task
  - Polish: 5 tasks
  - Testing: 13 tasks
- **Parallel Opportunities**: 16 tasks marked [P]
- **MVP**: User Story 1 alone delivers value

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
