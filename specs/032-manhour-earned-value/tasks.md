# Tasks: Manhour Earned Value Tracking (Simplified)

**Input**: Design documents from `/specs/032-manhour-earned-value/`
**Prerequisites**: plan.md ✓, spec.md ✓, data-model.md ✓, contracts/ ✓
**Updated**: 2025-12-04 (Simplified design - fewer migrations, no views, computed earned value)

**Tests**: Included as per TDD requirements in constitution

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Database Foundation)

**Purpose**: Database schema changes and core utilities

- [X] T001 Create migration to add manhour columns to components table in supabase/migrations/YYYYMMDDHHMMSS_add_manhour_columns.sql
- [X] T002 Create migration for project_manhour_budgets table with RLS and single-active trigger in supabase/migrations/YYYYMMDDHHMMSS_create_manhour_budgets.sql
- [X] T003 Push migrations using ./db-push.sh and verify success
- [X] T004 Regenerate TypeScript types: supabase gen types typescript --linked > src/types/database.types.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core utilities and permission helpers that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

### Unit Tests for Foundation

- [X] T005 [P] Write tests for SIZE parsing utility in src/lib/manhour/parse-size.test.ts
- [X] T006 [P] Write tests for weight calculation utility in src/lib/manhour/calculate-weight.test.ts

### Implementation

- [X] T007 [P] Implement SIZE parsing utility in src/lib/manhour/parse-size.ts (handle integers, fractions, reducers, NOSIZE, HALF)
- [X] T008 [P] Implement weight calculation utility in src/lib/manhour/calculate-weight.ts (diameter^1.5 formula, threaded pipe, reducers, fixed fallback)
- [X] T009 Implement permission helper in src/lib/permissions/manhour-permissions.ts (canViewManhours, canEditBudget based on role)

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Create Project Manhour Budget (Priority: P1) MVP

**Goal**: Project managers can create a manhour budget and see distribution results

**Independent Test**: Create a budget, verify system distributes manhours to all components with summary showing components processed, manhours allocated, and warnings

### Tests for User Story 1

- [ ] T010 [P] [US1] Write integration test for budget creation RPC in tests/integration/manhour/budget-creation.test.ts

### Database for User Story 1

- [X] T011 [US1] Create migration for create_manhour_budget RPC (SECURITY DEFINER with role check, calculates weights, distributes manhours) in supabase/migrations/YYYYMMDDHHMMSS_manhour_create_budget_rpc.sql
- [X] T012 [US1] Push migration and verify RPC works via test script

### Frontend Hooks for User Story 1

- [X] T013 [P] [US1] Implement useManhourBudget hook in src/hooks/useManhourBudget.ts (fetch active budget)
- [X] T014 [P] [US1] Implement useCreateManhourBudget mutation hook in src/hooks/useManhourBudget.ts (create budget via RPC)

### UI Components for User Story 1

- [X] T015 [US1] Create BudgetCreateForm component in src/components/settings/manhour-budget/BudgetCreateForm.tsx (form for total MH, reason, effective date)
- [X] T016 [US1] Create DistributionResults component in src/components/settings/manhour-budget/DistributionResults.tsx (show components processed, warnings)
- [X] T017 [US1] Create ManhourBudgetPage settings tab in src/components/settings/manhour-budget/ManhourBudgetPage.tsx
- [X] T018 [US1] Add "Manhour Budget" card to SettingsIndexPage in src/pages/SettingsIndexPage.tsx
- [X] T019 [US1] Add route for /projects/:projectId/settings/manhours in App.tsx

**Checkpoint**: User Story 1 complete - can create budget and see distribution results

---

## Phase 4: User Story 2 - View Earned Manhours Dashboard (Priority: P1) MVP

**Goal**: Project managers can see manhour summary widget on Dashboard showing budgeted, earned, remaining, and % complete

**Independent Test**: View Dashboard with active budget, verify widget displays all metrics; view without budget, verify "Configure Budget" prompt; view as Foreman, verify widget hidden

### Tests for User Story 2

- [ ] T020 [P] [US2] Write component test for ManhourSummaryWidget in src/components/dashboard/ManhourSummaryWidget.test.tsx

### Frontend Hooks for User Story 2

- [X] T021 [US2] Implement useProjectManhours hook in src/hooks/useProjectManhours.ts (fetch project summary with computed earned value)

### UI Components for User Story 2

- [X] T022 [US2] Create ManhourSummaryWidget in src/components/dashboard/ManhourSummaryWidget.tsx (budgeted, earned, remaining, % complete)
- [X] T023 [US2] Add ManhourSummaryWidget to DashboardPage (conditionally rendered for authorized users)
- [X] T024 [US2] Add "Configure Budget" prompt state when no budget exists
- [X] T025 [US2] Add loading skeleton state for widget

**Checkpoint**: User Story 2 complete - Dashboard shows manhour summary for authorized users

---

## Phase 5: User Story 3 - Automatic Earned Value (Priority: P1) MVP

**Goal**: Earned manhours are always current via computed value

**Independent Test**: Complete a milestone on a component, verify earned_manhours (computed) reflects the change immediately

**Implementation Note**: Earned value is computed on the fly as `budgeted_manhours × percent_complete / 100`. No database changes needed for this user story - it's handled by the hooks in US2.

- [ ] T026 [US3] Verify useProjectManhours hook computes earned value correctly from percent_complete
- [ ] T027 [US3] Add unit test for earned value computation formula in src/hooks/useProjectManhours.test.ts

**Checkpoint**: User Story 3 complete - Earned value is always current (computed on the fly)

---

## Phase 6: User Story 4 - Revise Budget for Change Orders (Priority: P2)

**Goal**: Project managers can create revised budget versions with full audit history

**Independent Test**: Create v2 budget with new manhours, verify v1 archived, budgeted_manhours recalculated on all components

### Tests for User Story 4

- [ ] T028 [P] [US4] Write integration test for budget versioning in tests/integration/manhour/budget-versioning.test.ts

### Frontend Hooks for User Story 4

- [ ] T029 [US4] Add useBudgetVersionHistory hook in src/hooks/useManhourBudget.ts (fetch all versions for project)

### UI Components for User Story 4

- [ ] T030 [US4] Create BudgetVersionHistory component in src/components/settings/manhour-budget/BudgetVersionHistory.tsx (list all versions with amounts, reasons, dates, active status)
- [ ] T031 [US4] Add version history section to ManhourBudgetPage

**Checkpoint**: User Story 4 complete - Budget versioning with audit history working

---

## Phase 7: User Story 5 - View Manhours by Reporting Dimension (Priority: P2)

**Goal**: Project managers can see manhours aggregated by Area, System, Test Package, or Drawing

**Independent Test**: Generate report grouped by Area, verify budgeted, earned, remaining, % complete shown for each area

### Tests for User Story 5

- [ ] T032 [P] [US5] Write integration test for aggregation queries in tests/integration/manhour/aggregation.test.ts

### Frontend Implementation for User Story 5

- [ ] T033 [US5] Add manhour columns to existing reports queries (SUM of budgeted, computed earned)
- [ ] T034 [US5] Update Reports page to display manhour columns when grouped by dimension
- [ ] T035 [US5] Add ManhourSummaryWidget to Reports page header area (for authorized users)
- [ ] T035a [US5] Add "Added Components" report filter/view showing post-baseline components (created_at > budget.effective_date)

**Checkpoint**: User Story 5 complete - Reports show manhours by dimension + Added Components view

---

## Phase 8: User Story 6 - View Component-Level Manhours (Priority: P2)

**Goal**: Project managers can see manhour details for individual components in the detail modal

**Independent Test**: Open component detail modal, verify manhour section shows budgeted, earned (computed), % complete, and weight

### Tests for User Story 6

- [ ] T036 [P] [US6] Write component test for manhour section in ComponentDetailView.test.tsx

### UI Components for User Story 6

- [ ] T037 [US6] Create ComponentManhourSection component in src/components/component-detail/ComponentManhourSection.tsx (budgeted, earned, % complete, weight)
- [ ] T038 [US6] Add ComponentManhourSection to ComponentDetailView Overview tab (conditionally for authorized users)

**Checkpoint**: User Story 6 complete - Component modal shows manhour details

---

## Phase 9: User Story 7 - Export Manhour Reports (Priority: P3)

**Goal**: Project managers can export manhour reports to PDF, Excel, and CSV

**Independent Test**: Export progress report to each format, verify manhour columns included for authorized users; export as unauthorized user, verify columns excluded

### Tests for User Story 7

- [ ] T039 [P] [US7] Write integration test for export column handling in tests/integration/manhour/export.test.ts

### Implementation for User Story 7

- [ ] T040 [US7] Update PDF export to include manhour columns (conditional on permissions)
- [ ] T041 [US7] Update Excel export to include manhour columns
- [ ] T042 [US7] Update CSV export to include manhour columns
- [ ] T043 [US7] Add permission check to exclude manhour data for unauthorized users

**Checkpoint**: User Story 7 complete - Exports include manhour columns for authorized users

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Final integration, cleanup, and validation

- [ ] T044 Run all tests and ensure >70% coverage
- [ ] T045 Verify mobile responsiveness (1024px breakpoint) for all new components
- [ ] T046 Verify touch targets ≥44px on all new interactive elements
- [ ] T047 Code cleanup and remove any unused imports
- [ ] T048 Performance test: Budget distribution <30s for 5k components using scripts/benchmark-distribution.mjs
- [ ] T049 [P] Create benchmark script scripts/benchmark-distribution.mjs

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (migrations pushed) - BLOCKS all user stories
- **User Story 1-3 (Phase 3-5)**: P1 priority - implement in order, all depend on Foundational
- **User Story 4-6 (Phase 6-8)**: P2 priority - can start after P1 stories complete
- **User Story 7 (Phase 9)**: P3 priority - can start after P2 stories complete
- **Polish (Phase 10)**: Depends on all desired features being complete

### User Story Dependencies

| Story | Depends On | Can Parallelize With |
|-------|------------|----------------------|
| US1 (Budget Creation) | Foundational | - |
| US2 (Dashboard Widget) | US1 (needs budget to exist) | - |
| US3 (Earned Value) | US2 (uses same hooks) | - |
| US4 (Budget Versioning) | US1 | US5, US6 |
| US5 (Reports by Dimension) | US1 | US4, US6 |
| US6 (Component Detail) | US1 | US4, US5 |
| US7 (Export) | US5 (needs reports integration) | - |

### Within Each User Story

1. Write tests FIRST (must FAIL before implementation)
2. Database migrations before frontend
3. Hooks before UI components
4. Push migrations after writing SQL
5. Story complete before moving to next priority

### Parallel Opportunities per Phase

**Phase 2 (Foundational):**
```
T005 + T006 (tests in parallel)
T007 + T008 + T009 (utilities in parallel)
```

**Phase 3 (US1):**
```
T013 + T014 (hooks in parallel)
```

---

## Implementation Strategy

### MVP First (User Stories 1-3 Only)

1. Complete Phase 1: Setup (migrations)
2. Complete Phase 2: Foundational (utilities)
3. Complete Phase 3: User Story 1 (budget creation)
4. Complete Phase 4: User Story 2 (dashboard widget)
5. Complete Phase 5: User Story 3 (verify earned value computation)
6. **STOP and VALIDATE**: Test all P1 stories independently
7. Deploy if ready - MVP complete!

### Incremental Delivery After MVP

1. Add User Story 4 (versioning) → Test → Deploy
2. Add User Story 5 (reports) → Test → Deploy
3. Add User Story 6 (component detail) → Test → Deploy
4. Add User Story 7 (export) → Test → Deploy

---

## Summary

| Metric | Value |
|--------|-------|
| Total Tasks | 50 |
| Setup Tasks | 4 |
| Foundational Tasks | 5 |
| US1 Tasks (P1) | 10 |
| US2 Tasks (P1) | 6 |
| US3 Tasks (P1) | 2 |
| US4 Tasks (P2) | 4 |
| US5 Tasks (P2) | 5 |
| US6 Tasks (P2) | 3 |
| US7 Tasks (P3) | 5 |
| Polish Tasks | 6 |
| Parallel Opportunities | 12 tasks marked [P] |
| MVP Scope | Phases 1-5 (27 tasks) |

---

## What Was Removed (from original tasks.md)

| Original Task | Reason Removed |
|---------------|----------------|
| Views migration (T004) | No pre-built views - dynamic queries instead |
| Earned value RPC (T033-T035) | Computed on the fly - no RPC needed |
| Dimension-specific hooks (T044-T047) | Not needed - aggregations via existing queries |
| component_manhours table | Replaced with columns on components table |
| 7 POST-MVP advanced tasks | Deferred to future release |

**Task count reduced from 75 → 50** (33% fewer tasks)

---

## Notes

- [P] tasks = different files, no dependencies within phase
- [Story] label maps task to specific user story for traceability
- Each user story independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Use `./db-push.sh` for migrations (not `supabase db push --linked`)
- Wait 2+ seconds between creating migrations to avoid timestamp collision
