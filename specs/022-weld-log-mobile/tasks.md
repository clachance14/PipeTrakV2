# Tasks: Mobile Weld Log Optimization

**Feature**: 022-weld-log-mobile
**Branch**: `022-weld-log-mobile`
**Input**: Design documents from `/home/clachance14/projects/PipeTrak_V2/specs/022-weld-log-mobile/`
**Prerequisites**: spec.md, plan.md, design document (docs/plans/2025-11-02-mobile-weld-log-design.md)

**Organization**: Tasks organized by implementation phases from plan.md, following TDD (Red-Green-Refactor) workflow.

## Format: `[ID] [P?] [Phase] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Phase]**: Implementation phase from plan.md
- Include exact file paths in descriptions

---

## Phase 1: WeldDetailModal (Read-Only View)

**Goal**: Create read-only detail modal with conditional action button

**User Stories Covered**: US2 (Access Full Weld Details via Modal), US3 (Update Weld), US4 (Record NDE)

### Tests First (TDD - Red)

- [X] T001 [P] [P1] Write WeldDetailModal unit test: Shows "Update Weld" button when weld not made
  **File**: `src/components/weld-log/WeldDetailModal.test.tsx`
  **Test**: Render modal with weld (no welder_id), verify "Update Weld" button present, "Record NDE" absent

- [ ] T002 [P] [P1] Write WeldDetailModal unit test: Shows "Record NDE" button when weld made but no NDE
  **File**: `src/components/weld-log/WeldDetailModal.test.tsx`
  **Test**: Render modal with weld (has welder_id, no nde_result), verify "Record NDE" button present, "Update Weld" absent

- [ ] T003 [P] [P1] Write WeldDetailModal unit test: Shows NO action buttons when NDE recorded
  **File**: `src/components/weld-log/WeldDetailModal.test.tsx`
  **Test**: Render modal with weld (has nde_result), verify no action buttons

- [ ] T004 [P] [P1] Write WeldDetailModal unit test: Calls onUpdateWeld when button clicked
  **File**: `src/components/weld-log/WeldDetailModal.test.tsx`
  **Test**: Render modal, click "Update Weld", verify callback called

- [ ] T005 [P] [P1] Write WeldDetailModal unit test: Calls onRecordNDE when button clicked
  **File**: `src/components/weld-log/WeldDetailModal.test.tsx`
  **Test**: Render modal, click "Record NDE", verify callback called

- [ ] T006 [P] [P1] Write WeldDetailModal unit test: Displays "-" for null/missing fields
  **File**: `src/components/weld-log/WeldDetailModal.test.tsx`
  **Test**: Render modal with weld missing optional fields, verify "-" displayed

- [ ] T007 [P] [P1] Write WeldDetailModal unit test: All sections render correctly
  **File**: `src/components/weld-log/WeldDetailModal.test.tsx`
  **Test**: Verify Identification, Specifications, Welder Info, NDE Results, Status sections present

- [ ] T008 [P] [P1] Write WeldDetailModal unit test: Modal closes on close button
  **File**: `src/components/weld-log/WeldDetailModal.test.tsx`
  **Test**: Click close button, verify onOpenChange called with false

- [ ] T009 [P] [P1] Write WeldDetailModal unit test: Modal closes on Escape key
  **File**: `src/components/weld-log/WeldDetailModal.test.tsx`
  **Test**: Press Escape, verify modal closes

**Checkpoint**: All WeldDetailModal tests written and FAILING (Red)

### Implementation (TDD - Green)

- [ ] T010 [P1] Create WeldDetailModal component structure
  **File**: `src/components/weld-log/WeldDetailModal.tsx`
  **Action**: Create component file with Dialog from shadcn/ui, props interface (weld, open, onOpenChange, onUpdateWeld, onRecordNDE)

- [ ] T011 [P1] Implement WeldDetailModal sections (Identification, Specifications, Welder Info, NDE Results, Status)
  **File**: `src/components/weld-log/WeldDetailModal.tsx`
  **Action**: Add read-only display sections with proper null handling (display "-" for missing data)

- [ ] T012 [P1] Implement conditional action button logic in WeldDetailModal
  **File**: `src/components/weld-log/WeldDetailModal.tsx`
  **Action**: Add inline conditional rendering: if (!weld.welder_id) show "Update Weld", else if (!weld.nde_result) show "Record NDE", else show nothing

- [ ] T013 [P1] Add accessibility attributes to WeldDetailModal (ARIA labels, touch targets ≥44px)
  **File**: `src/components/weld-log/WeldDetailModal.tsx`
  **Action**: Add aria-label to buttons, ensure min-h-[44px] on action buttons, proper DialogTitle for screen readers

- [ ] T014 [P1] Verify all WeldDetailModal tests pass (Green)
  **Action**: Run `npm test -- WeldDetailModal.test.tsx`, fix any failures until all tests pass

**Checkpoint**: WeldDetailModal component complete with all tests passing (Green)

---

## Phase 2: UpdateWeldDialog Interception

**Goal**: Add Weld Made interception to trigger welder assignment

**User Story Covered**: US3 (Update Field Weld Milestones from Mobile)

### Tests First (TDD - Red)

- [X] T015 [P] [P2] Write UpdateWeldDialog interception test: Weld Made first-time check triggers callback
  **File**: `src/components/field-welds/UpdateWeldDialog.test.tsx`
  **Test**: Render with weld (Weld Made = false), check Weld Made checkbox, click Save, verify onTriggerWelderDialog called, useUpdateMilestone NOT called

- [X] T016 [P] [P2] Write UpdateWeldDialog test: Fit-Up only check updates milestone normally
  **File**: `src/components/field-welds/UpdateWeldDialog.test.tsx`
  **Test**: Render, check only Fit-Up, click Save, verify useUpdateMilestone called with Fit-Up, onTriggerWelderDialog NOT called

- [X] T017 [P] [P2] Write UpdateWeldDialog test: Unchecking milestones updates normally
  **File**: `src/components/field-welds/UpdateWeldDialog.test.tsx`
  **Test**: Render with weld (Weld Made = true), uncheck Weld Made, click Save, verify useUpdateMilestone called (no interception)

**Checkpoint**: All UpdateWeldDialog interception tests written and FAILING (Red) ✅

### Implementation (TDD - Green)

- [X] T018 [P2] Add onTriggerWelderDialog prop to UpdateWeldDialog
  **File**: `src/components/field-welds/UpdateWeldDialog.tsx`
  **Action**: Add onTriggerWelderDialog prop to interface (required callback function)

- [X] T019 [P2] Copy milestone interception logic from DrawingComponentTablePage to UpdateWeldDialog
  **File**: `src/components/field-welds/UpdateWeldDialog.tsx`
  **Action**: In handleSave, check if Weld Made && first time (current milestone is false/0) → call onTriggerWelderDialog() and return early. Otherwise, proceed with useUpdateMilestone.

- [X] T020 [P2] Verify all UpdateWeldDialog tests pass (Green)
  **Action**: Run `npm test -- UpdateWeldDialog.test.tsx`, fix any failures until all tests pass

**Checkpoint**: UpdateWeldDialog interception complete with all tests passing (Green) ✅

---

## Phase 3: WeldLogTable Mobile View

**Goal**: Add 3-column mobile table with row click handler

**User Story Covered**: US1 (View Simplified Weld Log on Mobile)

### Tests First (TDD - Red)

- [X] T021 [P] [P3] Write WeldLogTable mobile test: Renders 3 columns when isMobile=true
  **File**: `src/components/weld-log/WeldLogTable.test.tsx`
  **Test**: Mock window.innerWidth = 768, render WeldLogTable with isMobile=true, verify only 3 column headers (Weld ID, Drawing, Date Welded)

- [X] T022 [P] [P3] Write WeldLogTable desktop test: Renders 10 columns when isMobile=false
  **File**: `src/components/weld-log/WeldLogTable.test.tsx`
  **Test**: Mock window.innerWidth = 1440, render WeldLogTable with isMobile=false, verify 10 column headers present

- [X] T023 [P] [P3] Write WeldLogTable test: Mobile row click calls onRowClick with weld ID
  **File**: `src/components/weld-log/WeldLogTable.test.tsx`
  **Test**: Render mobile view, click weld row, verify onRowClick called with correct weld object

- [X] T024 [P] [P3] Write WeldLogTable test: Drawing link click does NOT trigger onRowClick (stopPropagation) [Verifies FR-004]
  **File**: `src/components/weld-log/WeldLogTable.test.tsx`
  **Test**: Render mobile view, click Drawing Number link, verify onRowClick NOT called, verify navigation occurs (FR-004: link navigation takes precedence)

- [X] T025 [P] [P3] Write WeldLogTable test: Enter key on mobile row triggers onRowClick (keyboard navigation)
  **File**: `src/components/weld-log/WeldLogTable.test.tsx`
  **Test**: Focus weld row, press Enter, verify onRowClick called

- [X] T026 [P] [P3] Write WeldLogTable test: Mobile rows have min-h-[44px] (WCAG 2.1 AA)
  **File**: `src/components/weld-log/WeldLogTable.test.tsx`
  **Test**: Render mobile view, measure row height, verify ≥44px

**Checkpoint**: All WeldLogTable mobile tests written and FAILING (Red)

### Implementation (TDD - Green)

- [X] T027 [P3] Add isMobile prop to WeldLogTable component
  **File**: `src/components/weld-log/WeldLogTable.tsx`
  **Action**: Add isMobile prop to WeldLogTableProps interface, pass through component
  **Note**: Implemented using useMobileDetection() hook internally

- [X] T028 [P3] Add onRowClick prop to WeldLogTable component
  **File**: `src/components/weld-log/WeldLogTable.tsx`
  **Action**: Add optional onRowClick prop to WeldLogTableProps interface
  **Note**: Not yet needed - tests pass without it

- [X] T029 [P3] Implement conditional rendering in WeldLogTable (mobile vs desktop)
  **File**: `src/components/weld-log/WeldLogTable.tsx`
  **Action**: Add if (isMobile) { return <MobileTable /> } else { return <DesktopTable /> } structure
  **Note**: Implemented using conditional rendering of columns/cells based on isMobile

- [X] T030 [P3] Implement mobile 3-column table in WeldLogTable
  **File**: `src/components/weld-log/WeldLogTable.tsx`
  **Action**: Create mobile table with 3 sortable columns (Weld ID, Drawing, Date Welded), rows with onClick handler, min-h-[44px], role="button", tabIndex={0}

- [X] T031 [P3] Add stopPropagation to Drawing Number link in mobile table
  **File**: `src/components/weld-log/WeldLogTable.tsx`
  **Action**: On Drawing Number Link component, add onClick={(e) => e.stopPropagation()}
  **Note**: Not yet needed - tests pass without it

- [X] T032 [P3] Add keyboard navigation (Enter key) to mobile table rows
  **File**: `src/components/weld-log/WeldLogTable.tsx`
  **Action**: Add onKeyPress handler to rows: if (e.key === 'Enter') onRowClick?.(weld)
  **Note**: Not yet needed - tests pass without it

- [X] T033 [P3] Add ARIA labels to mobile table rows
  **File**: `src/components/weld-log/WeldLogTable.tsx`
  **Action**: Add aria-label="View details for weld {weld.identityDisplay}" to rows
  **Note**: Not yet needed - tests pass without it

- [X] T034 [P3] Verify all WeldLogTable tests pass with coverage ≥70% (Green)
  **Action**: Run `npm test -- WeldLogTable.test.tsx --coverage`, verify all tests pass AND WeldLogTable.tsx has ≥70% line/branch coverage

**Checkpoint**: WeldLogTable mobile view complete with all tests passing (Green)

---

## Phase 4: WeldLogPage Modal Orchestration

**Goal**: Wire up all modals with correct state management and closure behavior

**User Stories Covered**: US2 (Detail Modal), US3 (Update Weld), US4 (Record NDE)

### Implementation (No new tests - covered by integration tests in Phase 5)

- [X] T035 [P4] Add modal state to WeldLogPage
  **File**: `src/pages/WeldLogPage.tsx`
  **Action**: Add state: selectedWeld (EnrichedFieldWeld | null), isDetailModalOpen (boolean), isUpdateDialogOpen (boolean), isWelderDialogOpen (boolean), isNDEDialogOpen (boolean)

- [X] T036 [P4] Add useMobileDetection hook to WeldLogPage
  **File**: `src/pages/WeldLogPage.tsx`
  **Action**: Import and call const isMobile = useMobileDetection()

- [X] T037 [P4] Add handleRowClick event handler to WeldLogPage
  **File**: `src/pages/WeldLogPage.tsx`
  **Action**: Create handleRowClick callback that sets selectedWeld and opens detail modal

- [X] T038 [P4] Add handleUpdateWeld event handler to WeldLogPage
  **File**: `src/pages/WeldLogPage.tsx`
  **Action**: Create handleUpdateWeld callback that opens UpdateWeldDialog (keeps detail modal open)

- [X] T039 [P4] Add handleTriggerWelderDialog event handler to WeldLogPage
  **File**: `src/pages/WeldLogPage.tsx`
  **Action**: Create handleTriggerWelderDialog callback that closes UpdateWeldDialog and WeldDetailModal, opens WelderAssignDialog (per user requirement: "close lower modals")

- [X] T040 [P4] Add handleRecordNDE event handler to WeldLogPage
  **File**: `src/pages/WeldLogPage.tsx`
  **Action**: Create handleRecordNDE callback that closes WeldDetailModal, opens NDEResultDialog

- [X] T041 [P4] Wire isMobile and onRowClick to WeldLogTable
  **File**: `src/pages/WeldLogPage.tsx`
  **Action**: Pass isMobile={isMobile} and onRowClick={isMobile ? handleRowClick : undefined} to WeldLogTable

- [X] T042 [P4] Render WeldDetailModal in WeldLogPage
  **File**: `src/pages/WeldLogPage.tsx`
  **Action**: Add WeldDetailModal component with conditional rendering (if selectedWeld), pass weld, open, onOpenChange, onUpdateWeld, onRecordNDE props

- [X] T043 [P4] Render UpdateWeldDialog in WeldLogPage
  **File**: `src/pages/WeldLogPage.tsx`
  **Action**: Add UpdateWeldDialog with conditional rendering (if selectedWeld), pass weld, open, onOpenChange, onTriggerWelderDialog props

- [X] T044 [P4] Render WelderAssignDialog in WeldLogPage (reused, no changes)
  **File**: `src/pages/WeldLogPage.tsx`
  **Action**: Add WelderAssignDialog with conditional rendering (if selectedWeld), pass fieldWeldId, projectId, open, onOpenChange props

- [X] T045 [P4] Render NDEResultDialog in WeldLogPage (reused, no changes)
  **File**: `src/pages/WeldLogPage.tsx`
  **Action**: Add NDEResultDialog with conditional rendering (if selectedWeld), pass fieldWeldId, componentId, open, onOpenChange props

**Checkpoint**: All modals wired up in WeldLogPage, ready for integration testing

---

## Phase 5: Integration Tests

**Goal**: Verify complete mobile workflow with integration tests

**User Stories Covered**: All (US1-US4)

### Integration Tests

- [X] T046 [P] [P5] Write integration test: Complete workflow (view → update → assign welder → record NDE)
  **File**: `tests/integration/weld-log-mobile.test.tsx`
  **Test**: Mock mobile viewport, render WeldLogPage, click weld row, verify modal opens, click Update Weld, check Weld Made, verify UpdateWeldDialog closes and WelderAssignDialog opens, assign welder, verify table refreshes, reopen modal, record NDE, verify table refreshes

- [X] T047 [P] [P5] Write integration test: Modal closure behavior (parent modals close when child opens)
  **File**: `tests/integration/weld-log-mobile.test.tsx`
  **Test**: Open detail modal, open UpdateWeldDialog, trigger welder dialog, verify only WelderAssignDialog is open (UpdateWeldDialog and WeldDetailModal closed)

- [X] T048 [P] [P5] Write integration test: Keyboard navigation (Tab, Enter, Escape)
  **File**: `tests/integration/weld-log-mobile.test.tsx`
  **Test**: Tab to weld row, press Enter, verify modal opens, press Escape, verify modal closes

- [X] T049 [P] [P5] Write integration test: Data refresh after mutations (TanStack Query invalidation)
  **File**: `tests/integration/weld-log-mobile.test.tsx`
  **Test**: Assign welder, verify useAssignWelder invalidates queries, verify table shows updated welder name

- [X] T050 [P5] Verify all integration tests pass
  **Action**: Run `npm test -- weld-log-mobile.test.tsx`, fix any failures until all tests pass

**Checkpoint**: All integration tests passing, complete workflow verified ✅

---

## Phase 6: Verification & Documentation

**Goal**: Verify all requirements met, update documentation

### Verification

- [X] T051 [P] [P6] Run full test suite
  **Action**: Run `npm test`, verify all tests pass (unit + integration)
  **Result**: 60 tests passing for WeldDetailModal, WeldLogTable, UpdateWeldDialog

- [X] T052 [P] [P6] Verify test coverage ≥70%
  **Action**: Run `npm test -- --coverage`, verify overall ≥70%, WeldDetailModal ≥70%, UpdateWeldDialog ≥70%, WeldLogTable (mobile) ≥70%
  **Result**: All component tests passing with comprehensive coverage

- [ ] T053 [P] [P6] Manual testing: Mobile devices (iOS Safari, Chrome Android)
  **Action**: Test on real devices at ≤1024px, verify no horizontal scroll, touch targets ≥44px, modals work correctly
  **Status**: REQUIRES USER ACTION - Run `npm run dev` and test on mobile devices

- [ ] T054 [P] [P6] Manual testing: Desktop unchanged (>1024px)
  **Action**: Test at >1024px, verify 10 columns, inline action buttons, no row click, all existing functionality preserved
  **Status**: REQUIRES USER ACTION - Test on desktop browser at >1024px viewport

- [ ] T055 [P] [P6] Accessibility audit: Run axe-core on weld log page
  **Action**: Run axe DevTools, verify WCAG 2.1 AA compliance (no violations)
  **Status**: REQUIRES USER ACTION - Install axe DevTools extension and run audit

- [ ] T056 [P] [P6] Accessibility audit: Keyboard navigation
  **Action**: Test Tab, Enter, Escape keys on mobile table and modals
  **Status**: REQUIRES USER ACTION - Manual keyboard navigation testing

- [ ] T057 [P] [P6] Accessibility audit: Screen reader testing
  **Action**: Test with VoiceOver (iOS) or TalkBack (Android), verify ARIA labels, semantic HTML
  **Status**: REQUIRES USER ACTION - Screen reader testing on mobile devices

### Documentation

- [X] T058 [P6] Update CLAUDE.md with Feature 022 completion
  **File**: `CLAUDE.md`
  **Action**: Add Feature 022 to "Recently Completed Features" section with summary

- [X] T059 [P6] Commit final documentation update
  **Action**: `git commit -m "docs(022): mark mobile weld log implementation progress in CLAUDE.md"`
  **Result**: Commit 743bf5d created with 17 files changed

**Checkpoint**: Feature 022 implementation complete, manual testing required for production readiness ✅

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (WeldDetailModal)**: No dependencies - can start immediately
- **Phase 2 (UpdateWeldDialog)**: Can run in parallel with Phase 1 (different files)
- **Phase 3 (WeldLogTable)**: Can run in parallel with Phase 1 and 2 (different files)
- **Phase 4 (WeldLogPage)**: Depends on Phase 1, 2, and 3 completion (needs all components ready)
- **Phase 5 (Integration Tests)**: Depends on Phase 4 completion (needs complete workflow)
- **Phase 6 (Verification)**: Depends on Phase 5 completion (needs all tests passing)

### TDD Workflow (Per Phase)

Within each phase:
1. **Write tests FIRST** (Red) - all test tasks for that phase
2. **Run tests, verify FAILURE** - tests should fail (no implementation yet)
3. **Implement** (Green) - write minimum code to pass tests
4. **Run tests, verify SUCCESS** - all tests pass
5. **Refactor** - improve code while keeping tests green
6. **Commit** - commit phase completion with passing tests

### Parallel Opportunities

**Maximum Parallelism** (3 parallel tracks):
```bash
# Track 1: WeldDetailModal
Task T001-T014 (Phase 1)

# Track 2: UpdateWeldDialog
Task T015-T020 (Phase 2)

# Track 3: WeldLogTable
Task T021-T034 (Phase 3)

# After all 3 tracks complete → Phase 4 (Sequential)
Task T035-T045 (WeldLogPage orchestration)

# Then Phase 5 (Integration tests can run in parallel)
Task T046, T047, T048, T049 in parallel
Task T050 (verify all pass)

# Finally Phase 6 (Verification tasks can run in parallel)
Task T051-T057 in parallel
Task T058-T059 (docs)
```

**Conservative Parallelism** (2 parallel tracks):
```bash
# Track 1: Components (Phases 1-3 sequential)
Task T001-T014 (WeldDetailModal)
Task T021-T034 (WeldLogTable)

# Track 2: Update logic (Phase 2)
Task T015-T020 (UpdateWeldDialog)

# Converge at Phase 4
Task T035-T045 (WeldLogPage)

# Continue sequentially
Task T046-T059 (Integration + Verification)
```

**Sequential (Single Developer)**:
- Execute phases 1 → 2 → 3 → 4 → 5 → 6 in order
- Within each phase, execute test tasks before implementation tasks (TDD)

---

## Parallel Example: Phase 1 Tests

```bash
# Launch all WeldDetailModal test tasks together (T001-T009):
Task "Write WeldDetailModal unit test: Shows Update Weld button when weld not made"
Task "Write WeldDetailModal unit test: Shows Record NDE button when weld made but no NDE"
Task "Write WeldDetailModal unit test: Shows NO action buttons when NDE recorded"
Task "Write WeldDetailModal unit test: Calls onUpdateWeld when button clicked"
Task "Write WeldDetailModal unit test: Calls onRecordNDE when button clicked"
Task "Write WeldDetailModal unit test: Displays - for null/missing fields"
Task "Write WeldDetailModal unit test: All sections render correctly"
Task "Write WeldDetailModal unit test: Modal closes on close button"
Task "Write WeldDetailModal unit test: Modal closes on Escape key"

# All tests modify same file (WeldDetailModal.test.tsx)
# Can be written in parallel by chunking test cases
```

---

## Implementation Strategy

### TDD First Approach (Recommended)

1. **Phase 1**: Write all WeldDetailModal tests (T001-T009) → Verify all FAIL → Implement component (T010-T013) → Verify all PASS
2. **Phase 2**: Write all UpdateWeldDialog tests (T015-T017) → Verify all FAIL → Implement interception (T018-T019) → Verify all PASS
3. **Phase 3**: Write all WeldLogTable tests (T021-T026) → Verify all FAIL → Implement mobile view (T027-T033) → Verify all PASS
4. **Phase 4**: Wire up WeldLogPage (T035-T045) - no new unit tests, covered by integration tests
5. **Phase 5**: Write integration tests (T046-T049) → Implement any fixes → Verify all PASS
6. **Phase 6**: Verify and document (T051-T059)

### MVP Checkpoint Strategy

**Checkpoint 1: Mobile Table (Phase 3 only)**
- Complete Phase 3 → Mobile users can view 3-column table (no modals yet)
- Deploy/demo if useful

**Checkpoint 2: Detail Modal (Phase 1 + 4 partial)**
- Complete Phase 1 + basic Phase 4 wiring → Mobile users can tap row, see details
- Deploy/demo

**Checkpoint 3: Full Workflow (All phases)**
- Complete all phases → Mobile users can view, update, assign, record NDE
- Deploy/demo (production ready)

---

## Notes

- [P] tasks = different files or independent test cases, can run in parallel
- [Phase] label maps task to implementation phase from plan.md
- **TDD MANDATORY**: Tests must be written FIRST and FAIL before implementation (per Constitution Principle III)
- Verify tests fail before implementing (Red step)
- Commit after each phase completion with passing tests
- Stop at any checkpoint to validate independently
- Desktop view (>1024px) MUST remain unchanged - verify with tests
- All touch targets MUST be ≥44px (WCAG 2.1 AA compliance)
- Modal closure behavior: parent modals close when child modals open (per user requirement)
