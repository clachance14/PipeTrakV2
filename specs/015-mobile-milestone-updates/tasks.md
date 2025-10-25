# Tasks: Mobile Milestone Updates

**Input**: Design documents from `/home/clachance14/projects/PipeTrak_V2/specs/015-mobile-milestone-updates/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story. Tests written first (TDD), implementation follows.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4, FOUND)
- Include exact file paths in descriptions

## Path Conventions

This is a **single project** (React SPA frontend):
- Source: `src/` at repository root
- Tests: `tests/` at repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Test mocking infrastructure required by all contract tests

- [X] T001 [P] Setup localStorage mock in tests/setup/localStorage.mock.ts (exported for all test files)
- [X] T002 [P] Setup navigator.onLine mock in tests/setup/networkStatus.mock.ts (with goOffline/goOnline helpers)
- [X] T003 [P] Setup window.innerWidth mock in tests/setup/viewport.mock.ts (with mockViewport helper)
- [X] T004 [P] Setup crypto.randomUUID mock in tests/setup/crypto.mock.ts (for deterministic test IDs)

**Checkpoint**: Test mocks ready - contract tests can now be written

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core utilities that ALL user stories depend on - MUST be complete before any user story can begin

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests for Foundation (Write FIRST, ensure they FAIL)

- [X] T005 [P] [FOUND] Contract tests C001-C015 in tests/contract/offline-queue.contract.test.ts (15 tests: enqueue, dequeue, 50-entry limit, retry increment, localStorage operations)
- [X] T006 [P] [FOUND] Contract tests C036-C060 in tests/contract/sync-behavior.contract.test.ts (25 tests: network detection, sync orchestration, exponential backoff, server-wins conflict resolution)
- [X] T007 [P] [FOUND] Contract tests C016-C035 in tests/contract/responsive-ui.contract.test.ts (20 tests: viewport detection, touch targets, mobile/desktop UI switching)

### Implementation for Foundation

- [X] T008 [P] [FOUND] Implement offline queue operations in src/lib/offline-queue.ts (initQueue, saveQueue, enqueueUpdate, dequeueUpdate, incrementRetry - make T005 tests pass)
- [X] T009 [P] [FOUND] Implement sync manager in src/lib/sync-manager.ts (syncQueue with exponential backoff, server-wins handling - make T006 tests pass)
- [X] T010 [P] [FOUND] Implement responsive utilities in src/lib/responsive-utils.ts (viewport detection helpers, touch target validation - make T007 tests pass)
- [X] T011 [P] [FOUND] Create useOfflineQueue hook in src/hooks/useOfflineQueue.ts (wraps offline-queue.ts with React state)
- [X] T012 [P] [FOUND] Create useNetworkStatus hook in src/hooks/useNetworkStatus.ts (navigator.onLine wrapper with online/offline event listeners)
- [X] T013 [P] [FOUND] Create useSyncQueue hook in src/hooks/useSyncQueue.ts (wraps sync-manager.ts, triggers on network online event)
- [X] T014 [P] [FOUND] Create useMobileDetection hook in src/hooks/useMobileDetection.ts (viewport ≤1024px detection with resize listener)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Update Milestones from Mobile Device (Priority: P1) 🎯 MVP

**Goal**: Enable foremen to update component milestones from phones/tablets with touch-friendly UI

**Independent Test**: Open drawings page on mobile viewport (375px), tap drawing row to expand, tap discrete milestone checkbox → toggles instantly, tap partial milestone → full-screen modal opens with slider

### Tests for User Story 1 (Write FIRST, ensure they FAIL)

- [X] T015 [US1] Integration test for mobile milestone update journey in tests/integration/mobile-milestone-update.test.tsx (User Story 1 acceptance scenarios 1-5: expand drawing, tap checkbox, open slider modal, save value, verify progress recalculation)

### Implementation for User Story 1

- [X] T016 [US1] Create MobilePartialMilestoneEditor component in src/components/drawing-table/MobilePartialMilestoneEditor.tsx (full-screen Radix Dialog with large slider, Save/Cancel buttons with 44px height)
- [X] T017 [US1] Adapt ComponentRow for mobile in src/components/drawing-table/ComponentRow.tsx (increase checkbox hit area to 44px, conditionally render MobilePartialMilestoneEditor on mobile viewports, integrate useOfflineQueue hook for offline queueing)
- [X] T018 [US1] Adapt DrawingRow for mobile in src/components/drawing-table/DrawingRow.tsx (increase tap target to 44px for expansion toggle, simplify progress display on mobile: "47%" instead of "47% Complete")
- [X] T019 [US1] Adapt DrawingTable for mobile in src/components/drawing-table/DrawingTable.tsx (reduce virtualization overscan from 10 to 5 rows on mobile, increase row height 60px → 64px for touch targets)
- [X] T020 [US1] Wrap DrawingComponentTablePage with mobile detection in src/pages/DrawingComponentTablePage.tsx (add useMobileDetection hook, pass isMobile prop to child components, conditionally render mobile vs desktop layouts)

**Checkpoint**: User Story 1 complete - foremen can update milestones on mobile devices with touch-friendly UI

---

## Phase 4: User Story 2 - Navigate and Search on Mobile (Priority: P1)

**Goal**: Enable foremen to find specific drawings and components on mobile with search and filters

**Independent Test**: Open drawings page on mobile, tap search input and type "P-001" → list filters with 500ms debounce, tap status filter and select "In Progress" → only 1-99% drawings shown, tap hamburger menu → sidebar slides in

### Tests for User Story 2 (Write FIRST, ensure they FAIL)

- [ ] T021 [US2] Integration test for mobile search and filter journey in tests/integration/mobile-search-filter.test.tsx (User Story 2 acceptance scenarios 1-5: search with debounce, status filter, hamburger menu, collapse all, vertical filter stack)

### Implementation for User Story 2

- [ ] T022 [P] [US2] Adapt DrawingSearchInput for mobile in src/components/drawing-table/DrawingSearchInput.tsx (increase debounce from 300ms to 500ms on mobile viewports, full-width input with 44px min-height)
- [ ] T023 [P] [US2] Adapt StatusFilterDropdown for mobile in src/components/drawing-table/StatusFilterDropdown.tsx (full-width dropdown, 44px trigger height, large touch-friendly options)
- [ ] T024 [P] [US2] Adapt CollapseAllButton for mobile in src/components/drawing-table/CollapseAllButton.tsx (44px height, adequate width for text + padding ≥120px)
- [ ] T025 [US2] Create mobile filter layout wrapper in src/components/drawing-table/MobileFilterStack.tsx (vertical flex-col stack with gap-4, renders DrawingSearchInput, StatusFilterDropdown, CollapseAllButton)
- [ ] T026 [US2] Adapt Layout component for hamburger menu in src/components/Layout.tsx (conditionally render hamburger menu icon on mobile with 44px tap target, sidebar hidden by default on mobile, slide-in overlay on hamburger tap)
- [ ] T027 [US2] Integrate MobileFilterStack in DrawingComponentTablePage (replace horizontal filters with MobileFilterStack when isMobile === true)

**Checkpoint**: User Story 2 complete - foremen can efficiently search and filter on mobile despite small screens

---

## Phase 5: User Story 3 - Work Offline with Automatic Sync (Priority: P2)

**Goal**: Enable foremen to update milestones offline with automatic queue sync when connection returns

**Independent Test**: Enable offline mode (DevTools → Network → Offline), update 3 milestones → verify "3 updates pending" badge, go online → verify auto-sync starts, verify badge shows green checkmark, verify badge disappears after sync

### Tests for User Story 3 (Write FIRST, ensure they FAIL)

- [ ] T028 [US3] Integration test for offline sync journey in tests/integration/offline-sync.test.tsx (User Story 3 acceptance scenarios 1-5: queue offline updates, show pending badge, auto-sync on reconnect, show success indicator, handle sync failures with retry)

### Implementation for User Story 3

- [ ] T029 [US3] Create OfflineQueueBadge component in src/components/OfflineQueueBadge.tsx (persistent header badge showing "X updates pending", green checkmark on success, red warning on error, "Tap to retry" action)
- [ ] T030 [US3] Integrate OfflineQueueBadge in Layout component src/components/Layout.tsx (add badge to header, pass queue count from useOfflineQueue hook, wire up manual retry action)
- [ ] T031 [US3] Add sync orchestration to DrawingComponentTablePage in src/pages/DrawingComponentTablePage.tsx (call useSyncQueue hook, trigger sync on 'online' event, handle sync result with toast notifications)
- [ ] T032 [US3] Wrap useUpdateMilestone hook with offline queueing in src/hooks/useUpdateMilestone.ts (check useNetworkStatus, if offline → enqueue to localStorage instead of mutation, if online → execute mutation directly)

**Checkpoint**: User Story 3 complete - foremen can work offline with automatic sync, resilient to connectivity issues

---

## Phase 6: User Story 4 - View Progress on Mobile (Priority: P2)

**Goal**: Enable foremen to view component and drawing-level progress on mobile for situational awareness

**Independent Test**: Open drawings page on mobile, observe progress bars and percentages at drawing and component levels, verify data matches desktop, verify real-time updates when other users make changes

### Tests for User Story 4 (Write FIRST, ensure they FAIL)

- [ ] T033 [US4] Integration test for mobile progress view in tests/integration/mobile-progress-view.test.tsx (User Story 4 acceptance scenarios 1-4: view drawing progress bar, view component progress, tap progress for breakdown, verify real-time cache invalidation)

### Implementation for User Story 4

- [ ] T034 [US4] Add progress breakdown tooltip/popover in src/components/drawing-table/ProgressBreakdown.tsx (tap progress bar → show modal with milestone breakdown, weight contribution to total percentage, close on backdrop tap)
- [ ] T035 [US4] Integrate ProgressBreakdown in DrawingRow src/components/drawing-table/DrawingRow.tsx (make progress bar tappable on mobile with 44px tap target, open ProgressBreakdown modal on tap)
- [ ] T036 [US4] Verify TanStack Query cache invalidation in DrawingComponentTablePage src/pages/DrawingComponentTablePage.tsx (ensure ['drawings-with-progress'] and ['components'] queries invalidate after milestone updates, verify optimistic updates work on mobile)

**Checkpoint**: User Story 4 complete - all user stories independently functional, full mobile milestone feature delivered

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements, validation, and cleanup

- [ ] T037 [P] Add double-tap zoom prevention in src/index.css (add `touch-action: manipulation` to interactive elements: buttons, checkboxes, sliders)
- [ ] T038 [P] Add accessibility labels and roles in all mobile components (ensure screen reader compatibility: aria-label, aria-expanded, role="button", role="checkbox", role="slider")
- [ ] T039 [P] Verify touch target sizes across all components (run assertTouchTarget helper from quickstart.md on all interactive elements, ensure ≥44px)
- [ ] T040 [P] Add performance monitoring in DrawingComponentTablePage (add performance.mark and performance.measure for page load time, log warning if >3s on mobile)
- [ ] T041 [P] Add error boundary for mobile components (wrap mobile-specific components with error boundary, graceful fallback to desktop UI on error)
- [ ] T042 Verify TypeScript strict mode compliance across all new files (run `tsc -b`, ensure no type errors, no `as` assertions except where explicitly justified)
- [ ] T043 Run full test suite and verify coverage (run `npm test -- --coverage`, verify ≥70% overall, ≥80% for src/lib/*, ≥60% for src/components/*)
- [ ] T044 Run quickstart.md validation (manually test all 5 scenarios from quickstart.md: mobile milestone update, search/filter, offline sync, retry logic, server-wins conflict)
- [ ] T045 Update CLAUDE.md with mobile feature documentation (add section documenting mobile UI patterns, offline queue behavior, testing mobile viewports)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-6)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 US1 → P1 US2 → P2 US3 → P2 US4)
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories ✅ MVP
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories (integrates with US1 in DrawingComponentTablePage)
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Integrates with US1 (wraps useUpdateMilestone) but independently testable
- **User Story 4 (P2)**: Can start after Foundational (Phase 2) - Uses US1 components but independently testable

### Within Each User Story

1. Tests MUST be written and FAIL before implementation
2. Contract tests before integration tests
3. Foundation utilities before user story work
4. Core components before page integration
5. Story complete before moving to next priority

### Parallel Opportunities

**Setup (Phase 1)** - All 4 tasks can run in parallel:
```bash
Task: "Setup localStorage mock in tests/setup/localStorage.mock.ts"
Task: "Setup navigator.onLine mock in tests/setup/networkStatus.mock.ts"
Task: "Setup window.innerWidth mock in tests/setup/viewport.mock.ts"
Task: "Setup crypto.randomUUID mock in tests/setup/crypto.mock.ts"
```

**Foundational Tests (Phase 2)** - All 3 contract test files can run in parallel:
```bash
Task: "Contract tests C001-C015 in tests/contract/offline-queue.contract.test.ts"
Task: "Contract tests C036-C060 in tests/contract/sync-behavior.contract.test.ts"
Task: "Contract tests C016-C035 in tests/contract/responsive-ui.contract.test.ts"
```

**Foundational Implementation (Phase 2)** - After tests written, implementations can run in parallel:
```bash
Task: "Implement offline queue operations in src/lib/offline-queue.ts"
Task: "Implement sync manager in src/lib/sync-manager.ts"
Task: "Implement responsive utilities in src/lib/responsive-utils.ts"
```

Then hooks (all depend on lib/* but can run in parallel):
```bash
Task: "Create useOfflineQueue hook in src/hooks/useOfflineQueue.ts"
Task: "Create useNetworkStatus hook in src/hooks/useNetworkStatus.ts"
Task: "Create useSyncQueue hook in src/hooks/useSyncQueue.ts"
Task: "Create useMobileDetection hook in src/hooks/useMobileDetection.ts"
```

**User Story 2 Component Adaptations** - T022-T024 can run in parallel (different files):
```bash
Task: "Adapt DrawingSearchInput for mobile in src/components/drawing-table/DrawingSearchInput.tsx"
Task: "Adapt StatusFilterDropdown for mobile in src/components/drawing-table/StatusFilterDropdown.tsx"
Task: "Adapt CollapseAllButton for mobile in src/components/drawing-table/CollapseAllButton.tsx"
```

**Polish (Phase 7)** - T037-T041 can run in parallel (different concerns):
```bash
Task: "Add double-tap zoom prevention in src/index.css"
Task: "Add accessibility labels and roles in all mobile components"
Task: "Verify touch target sizes across all components"
Task: "Add performance monitoring in DrawingComponentTablePage"
Task: "Add error boundary for mobile components"
```

**Once Foundation complete, ALL user stories can start in parallel** (if team capacity allows):
```bash
# Team member 1:
Task: "Phase 3: User Story 1 - Update Milestones from Mobile Device"

# Team member 2:
Task: "Phase 4: User Story 2 - Navigate and Search on Mobile"

# Team member 3:
Task: "Phase 5: User Story 3 - Work Offline with Automatic Sync"

# Team member 4:
Task: "Phase 6: User Story 4 - View Progress on Mobile"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only - Both P1)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T014) - CRITICAL, blocks everything
3. Complete Phase 3: User Story 1 (T015-T020) - Core mobile milestone updates
4. Complete Phase 4: User Story 2 (T021-T027) - Mobile search/navigation
5. **STOP and VALIDATE**: Test User Stories 1 & 2 independently
6. Deploy/demo MVP (basic mobile milestone feature with search)

### Full Feature Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → MVP Milestone 1
3. Add User Story 2 → Test independently → MVP Milestone 2 (deploy at this point)
4. Add User Story 3 → Test independently → Enhanced Feature (offline support)
5. Add User Story 4 → Test independently → Complete Feature (progress viewing)
6. Complete Polish → Production Ready

### Parallel Team Strategy

With 4 developers (after Foundation complete):

1. Team completes Setup (Phase 1) + Foundational (Phase 2) together
2. Once Foundational is done:
   - **Developer A**: User Story 1 (T015-T020) - 6 tasks
   - **Developer B**: User Story 2 (T021-T027) - 7 tasks
   - **Developer C**: User Story 3 (T028-T032) - 5 tasks
   - **Developer D**: User Story 4 (T033-T036) - 4 tasks
3. Stories complete and integrate independently
4. Team regroups for Polish (Phase 7)

---

## Testing Strategy

### Contract Tests (60 total)

- **Offline Queue** (15 tests): C001-C015 in tests/contract/offline-queue.contract.test.ts
- **Responsive UI** (20 tests): C016-C035 in tests/contract/responsive-ui.contract.test.ts
- **Sync Behavior** (25 tests): C036-C060 in tests/contract/sync-behavior.contract.test.ts

### Integration Tests (4 suites)

- **User Story 1**: tests/integration/mobile-milestone-update.test.tsx (5 acceptance scenarios)
- **User Story 2**: tests/integration/mobile-search-filter.test.tsx (5 acceptance scenarios)
- **User Story 3**: tests/integration/offline-sync.test.tsx (5 acceptance scenarios)
- **User Story 4**: tests/integration/mobile-progress-view.test.tsx (4 acceptance scenarios)

### Coverage Targets

- **Overall**: ≥70% (lines, functions, branches, statements)
- **src/lib/\*\***: ≥80% (utilities & business logic)
- **src/components/\*\***: ≥60% (UI components)
- **src/hooks/\*\***: ≥70% (custom hooks)

### TDD Workflow

1. Write test (Red phase)
2. Run test → verify it fails
3. Implement minimal code (Green phase)
4. Run test → verify it passes
5. Refactor while keeping tests green
6. Commit tests + implementation together

---

## Notes

- **[P] tasks** = different files, no dependencies, can run in parallel
- **[Story] label** maps task to specific user story for traceability
- Each user story should be independently completable and testable
- **Tests first**: Verify tests fail before implementing (TDD mandatory per Constitution III)
- **Commit strategy**: Per-task or logical groups, include test + implementation together
- **Checkpoints**: Stop at any checkpoint to validate story independently
- **Mobile testing**: Use Chrome DevTools device toolbar (375px for mobile, 768px for tablet, 1440px for desktop)
- **Offline testing**: Use DevTools Network tab → check "Offline" to test queue behavior
- **localStorage inspection**: DevTools → Application → Local Storage → pipetrak:offline-queue

---

**Total Tasks**: 45 (T001-T045)
**Estimated Time**: 3-5 days (based on 60 contract tests + 4 integration suites + responsive UI adaptation)
**MVP Tasks**: T001-T027 (Setup + Foundation + US1 + US2 = 27 tasks)
**Constitution Compliance**: ✅ TDD workflow, TypeScript strict mode, no database changes, reuses existing hooks
