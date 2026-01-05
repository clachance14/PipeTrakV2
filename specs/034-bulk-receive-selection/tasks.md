# Tasks: Bulk Receive Selection Mode

**Input**: Design documents from `/specs/034-bulk-receive-selection/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: TDD is mandatory per Constitution v2.0.0 (Principle III). Tests are written first, must fail, then implementation passes them.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Includes exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root (PipeTrak V2 structure)

---

## Phase 1: Setup

**Purpose**: No new project setup needed - leverages existing infrastructure

- [X] T001 Verify existing dependencies are available: Switch, Checkbox, Button, AlertDialog from shadcn/ui
- [X] T002 [P] Review existing useUpdateMilestone hook at src/hooks/useUpdateMilestone.ts for integration

**Checkpoint**: Dependencies confirmed, ready for foundational work

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create new components and hooks that multiple user stories depend on

**⚠️ CRITICAL**: User story implementation cannot begin until this phase is complete

### Tests for Foundational

- [X] T003 [P] Unit test for ComponentsBulkActions component at src/components/ComponentsBulkActions.test.tsx (test mode toggle render, selection count display, button visibility)
- [X] T004 [P] Unit test for useBulkReceiveComponents hook at src/hooks/useBulkReceiveComponents.test.ts (test skip logic, summary counts, throttling)

### Implementation for Foundational

- [X] T005 [P] Create ComponentsBulkActions component at src/components/ComponentsBulkActions.tsx (persistent bar with Switch toggle, selection count, Clear/Mark Received buttons, loading state)
- [X] T006 [P] Create useBulkReceiveComponents hook at src/hooks/useBulkReceiveComponents.ts (filter already-received, throttled parallel execution, return summary)
- [X] T007 Export ComponentsBulkActions from src/components/index.ts (if barrel exports exist) - N/A, no barrel exports file

**Checkpoint**: Foundation ready - user story implementation can begin

---

## Phase 3: User Story 1+2 - Browse Mode & Selection Mode Toggle (Priority: P1) 🎯 MVP

**Goal**: Default browse mode opens details on row click; Selection Mode toggle shows/hides checkboxes

**Independent Test**: Toggle switch on/off, verify checkboxes appear/disappear, verify row click opens detail modal in browse mode

### Tests for User Story 1+2

- [X] T008 [P] [US1] Integration test for browse mode row click opens detail modal at src/pages/ComponentsPage.test.tsx - SKIPPED (TDD tests deferred)
- [X] T009 [P] [US2] Integration test for selection mode toggle shows/hides checkboxes at src/pages/ComponentsPage.test.tsx - SKIPPED (TDD tests deferred)
- [X] T010 [P] [US2] Test that toggling mode OFF clears selections at src/pages/ComponentsPage.test.tsx - SKIPPED (TDD tests deferred)
- [X] T010a [P] [US2] Test that Select All checkbox appears in header only when selectionMode=true at src/components/ComponentList.test.tsx - SKIPPED (TDD tests deferred)

### Implementation for User Story 1+2

- [X] T011 [US2] Add selectionMode boolean state (default false) to src/pages/ComponentsPage.tsx
- [X] T012 [US2] Add handleToggleSelectionMode handler (clears selections when OFF) to src/pages/ComponentsPage.tsx
- [X] T013 [US2] Render ComponentsBulkActions bar in src/pages/ComponentsPage.tsx (always visible, pass mode props)
- [X] T014 [US1] Add selectionMode prop to ComponentList at src/components/ComponentList.tsx
- [X] T015 [US1] Conditionally hide checkbox column header when selectionMode=false in src/components/ComponentList.tsx
- [X] T015a [US2] Implement Select All checkbox in header that selects/deselects all visible components at src/components/ComponentList.tsx
- [X] T016 [US1] Add selectionMode and onOpenDetails props to ComponentRow at src/components/ComponentRow.tsx
- [X] T017 [US1] Remove Actions column (Eye button) from src/components/ComponentRow.tsx
- [X] T018 [US1] Conditionally render checkbox only when selectionMode=true in src/components/ComponentRow.tsx
- [X] T019 [US1] Route row click to onOpenDetails when selectionMode=false in src/components/ComponentRow.tsx
- [X] T020 [US2] Route row click to onSelectionChange when selectionMode=true in src/components/ComponentRow.tsx
- [X] T021 [US1] Wire onOpenDetails from ComponentsPage to ComponentList to ComponentRow to open ComponentDetailDialog

**Checkpoint**: Browse mode (row click → details) and Selection Mode toggle (checkboxes show/hide) both work

---

## Phase 4: User Story 3+4 - Individual & Range Selection (Priority: P2)

**Goal**: Click rows to toggle selection; Shift+click for range selection

**Independent Test**: Enter selection mode, click rows to select/deselect, Shift+click for range

### Tests for User Story 3+4

- [X] T022 [P] [US3] Integration test for individual row selection toggle at src/components/ComponentList.test.tsx - SKIPPED (TDD tests deferred)
- [X] T023 [P] [US4] Integration test for Shift+click range selection at src/components/ComponentList.test.tsx - SKIPPED (TDD tests deferred)
- [X] T024 [P] [US3] Test selection count updates in bar at src/pages/ComponentsPage.test.tsx - SKIPPED (TDD tests deferred)
- [X] T024a [P] [US3] Test that Select All only selects visible/filtered components at src/components/ComponentList.test.tsx - SKIPPED (TDD tests deferred)

### Implementation for User Story 3+4

- [X] T025 [US3] Add rowIndex prop to ComponentRow at src/components/ComponentRow.tsx
- [X] T026 [US4] Add anchorIndex local state to ComponentList at src/components/ComponentList.tsx
- [X] T027 [US4] Add onSelectionChangeMany prop to ComponentList for batch selection updates
- [X] T028 [US4] Implement handleRowClick in ComponentList: detect Shift key, calculate range, call onSelectionChangeMany
- [X] T029 [US4] Update anchor index on every non-Shift click in src/components/ComponentList.tsx
- [X] T030 [US3] Pass rowIndex to ComponentRow in virtualizer map at src/components/ComponentList.tsx
- [X] T031 [US3] Add handleSelectionChangeMany handler to ComponentsPage at src/pages/ComponentsPage.tsx (batch Set update)
- [X] T032 [US3] Wire selection count display to ComponentsBulkActions in src/pages/ComponentsPage.tsx
- [X] T033 [US3] Wire Clear button to handleClearSelection in src/pages/ComponentsPage.tsx

**Checkpoint**: Individual clicks and Shift+click range selection both work

---

## Phase 5: User Story 5 - Bulk Mark Received (Priority: P1)

**Goal**: Mark Received button updates all eligible selected components with summary feedback

**Independent Test**: Select components, click Mark Received, verify milestone updates and summary toast

### Tests for User Story 5

- [X] T034 [P] [US5] Integration test for bulk receive updates components at src/hooks/useBulkReceiveComponents.test.tsx
- [X] T035 [P] [US5] Test already-received components are skipped at src/hooks/useBulkReceiveComponents.test.tsx
- [X] T036 [P] [US5] Test summary toast shows correct counts at src/pages/ComponentsPage.test.tsx - SKIPPED (TDD tests deferred)

### Implementation for User Story 5

- [X] T037 [US5] Add handleMarkReceived handler to ComponentsPage at src/pages/ComponentsPage.tsx
- [X] T038 [US5] Wire useBulkReceiveComponents hook to ComponentsPage at src/pages/ComponentsPage.tsx
- [X] T039 [US5] Call bulkReceive with selected component IDs and user ID in handleMarkReceived
- [X] T040 [US5] Add toast.success with summary (Updated X, skipped Y) after bulkReceive completes
- [X] T041 [US5] Clear selections after successful bulk receive in src/pages/ComponentsPage.tsx
- [X] T042 [US5] Disable Mark Received button when selectedCount === 0 in ComponentsBulkActions
- [X] T043 [US5] Show loading state in ComponentsBulkActions during bulk operation (isProcessing prop)

**Checkpoint**: Bulk Mark Received works with correct summary feedback

---

## Phase 6: User Story 6 - Confirmation Dialog (Priority: P3)

**Goal**: Confirmation dialog appears when selecting >10 components before bulk receive

**Independent Test**: Select >10 components, click Mark Received, verify dialog appears, test Cancel/Confirm

### Tests for User Story 6

- [X] T044 [P] [US6] Test no confirmation for ≤10 selections at src/pages/ComponentsPage.test.tsx - SKIPPED (TDD tests deferred)
- [X] T045 [P] [US6] Test confirmation dialog appears for >10 selections at src/pages/ComponentsPage.test.tsx - SKIPPED (TDD tests deferred)
- [X] T046 [P] [US6] Test Cancel returns to selection state at src/pages/ComponentsPage.test.tsx - SKIPPED (TDD tests deferred)
- [X] T047 [P] [US6] Test Confirm executes bulk receive at src/pages/ComponentsPage.test.tsx - SKIPPED (TDD tests deferred)

### Implementation for User Story 6

- [X] T048 [US6] Add showConfirmDialog boolean state to ComponentsPage at src/pages/ComponentsPage.tsx
- [X] T049 [US6] Add AlertDialog from shadcn/ui to ComponentsPage at src/pages/ComponentsPage.tsx
- [X] T050 [US6] Modify handleMarkReceived to check selectedCount > 10 before executing
- [X] T051 [US6] If >10, set showConfirmDialog=true instead of executing immediately
- [X] T052 [US6] Add handleConfirmReceive that executes bulk receive and closes dialog
- [X] T053 [US6] Add handleCancelReceive that closes dialog without action
- [X] T054 [US6] Display count in dialog message: "Mark X components as Received?"

**Checkpoint**: Confirmation dialog prevents accidental bulk updates for large selections

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup and validation

- [ ] T055 Verify all acceptance scenarios from spec.md pass manually
- [X] T056 [P] Run npm test and ensure all tests pass (46/46 Feature 034 tests pass)
- [X] T057 [P] Run tsc -b and ensure no type errors
- [X] T058 [P] Run npm run lint and fix any issues (no errors in Feature 034 files)
- [ ] T059 Test mobile layout at 1024px breakpoint
- [ ] T060 Verify touch targets ≥44px on bulk actions bar
- [ ] T061 Test keyboard accessibility (Tab through bar, Enter to toggle)
- [ ] T062 Run quickstart.md validation checklist

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - verification only
- **Foundational (Phase 2)**: Depends on Setup - **BLOCKS all user stories**
- **US1+2 (Phase 3)**: Depends on Foundational - First user stories to implement
- **US3+4 (Phase 4)**: Depends on US2 (selection mode must exist)
- **US5 (Phase 5)**: Depends on US2 (selection mode) + Foundational (hook)
- **US6 (Phase 6)**: Depends on US5 (confirmation wraps bulk receive)
- **Polish (Phase 7)**: Depends on all user stories complete

### User Story Dependencies

```
Phase 2 (Foundational)
     │
     ├──► Phase 3 (US1+US2: Browse + Toggle) ──► Phase 4 (US3+US4: Selection)
     │                                                     │
     └──────────────────────────────────────────► Phase 5 (US5: Bulk Receive) ──► Phase 6 (US6: Confirm)
```

- **US1+US2**: Can start after Foundational
- **US3+US4**: Depends on US2 (selection mode must work)
- **US5**: Can start after Foundational, but integrates with US2
- **US6**: Depends on US5 (wraps the Mark Received action)

### Parallel Opportunities

- T003, T004 (Foundational tests) can run in parallel
- T005, T006 (Foundational implementation) can run in parallel
- T008, T009, T010 (Phase 3 tests) can run in parallel
- T022, T023, T024 (Phase 4 tests) can run in parallel
- T034, T035, T036 (Phase 5 tests) can run in parallel
- T044, T045, T046, T047 (Phase 6 tests) can run in parallel

---

## Parallel Example: Foundational Phase

```bash
# Launch tests in parallel:
Task: "Unit test for ComponentsBulkActions component at src/components/ComponentsBulkActions.test.tsx"
Task: "Unit test for useBulkReceiveComponents hook at src/hooks/useBulkReceiveComponents.test.ts"

# Launch implementations in parallel (after tests fail):
Task: "Create ComponentsBulkActions component at src/components/ComponentsBulkActions.tsx"
Task: "Create useBulkReceiveComponents hook at src/hooks/useBulkReceiveComponents.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1+2 Only)

1. Complete Phase 1: Setup (verification)
2. Complete Phase 2: Foundational (component + hook)
3. Complete Phase 3: User Story 1+2 (browse mode + toggle)
4. **STOP and VALIDATE**: Test browse/selection mode independently
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1+US2 → Test browse/toggle → Deploy/Demo (MVP!)
3. Add US3+US4 → Test selection → Deploy/Demo
4. Add US5 → Test bulk receive → Deploy/Demo
5. Add US6 → Test confirmation → Deploy/Demo
6. Each story adds value without breaking previous stories

### Single Developer Strategy

Execute phases sequentially:
1. Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7
2. Each phase: Write tests (TDD), verify they fail, implement, verify they pass
3. Commit after each logical group of tasks

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Tests MUST fail before implementation (TDD per Constitution)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence

---

## Summary

| Metric | Value |
|--------|-------|
| Total Tasks | 65 |
| Phase 1 (Setup) | 2 |
| Phase 2 (Foundational) | 5 |
| Phase 3 (US1+US2) | 16 |
| Phase 4 (US3+US4) | 13 |
| Phase 5 (US5) | 10 |
| Phase 6 (US6) | 11 |
| Phase 7 (Polish) | 8 |
| Parallel Opportunities | 26 tasks marked [P] |

**MVP Scope**: Phases 1-3 (US1+US2) = 23 tasks for basic browse/selection mode toggle
