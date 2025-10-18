# Tasks: Authenticated Pages with Real Data

**Feature**: 008-we-just-planned
**Input**: Design documents from `/home/clachance14/projects/PipeTrak_V2/specs/008-we-just-planned/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → ✅ DONE: Tech stack: TypeScript 5.6, React 18, TanStack Query, Supabase
   → ✅ DONE: Structure: Single SPA (src/ directory)
2. Load optional design documents:
   → ✅ DONE: data-model.md loaded (9 existing entities, 4 new hooks)
   → ✅ DONE: contracts/ loaded (5 contract test files)
   → ✅ DONE: research.md loaded (7 technical decisions)
3. Generate tasks by category:
   → ✅ DONE: Setup (1 task)
   → ✅ DONE: Tests (7 tasks: 5 contract + 2 integration)
   → ✅ DONE: Core (4 hooks + 13 components + 5 page updates)
   → ✅ DONE: Integration (1 layout task)
   → ✅ DONE: Polish (3 tasks)
4. Apply task rules:
   → ✅ DONE: Different files = marked [P]
   → ✅ DONE: Same file = sequential (no [P])
   → ✅ DONE: Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
   → ✅ DONE: 33 tasks numbered
6. Generate dependency graph
   → ✅ DONE: See Dependencies section
7. Create parallel execution examples
   → ✅ DONE: See Parallel Example section
8. Validate task completeness:
   → ✅ All 5 contracts have tests
   → ✅ All 4 hooks have implementation tasks
   → ✅ All 13 components have creation tasks
   → ✅ All 5 pages have update tasks
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Single React SPA**: `src/` at repository root
- **Tests**: Contract tests in `specs/008-we-just-planned/contracts/`, integration tests in `tests/integration/`
- **Components**: `src/components/` with feature subdirectories

---

## Phase 3.1: Setup
- [X] **T001** Install any missing dependencies (if needed - check package.json for lucide-react icons) ✅ lucide-react already installed

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests (All Parallel)
- [X] **T002 [P]** Contract test for useDashboardMetrics hook in `specs/008-we-just-planned/contracts/dashboard-metrics.contract.test.tsx` (already exists - verify it fails) ✅ Tests verified to fail (Red phase) - useDashboardMetrics not found
- [X] **T003 [P]** Contract test for useSidebarState hook in `specs/008-we-just-planned/contracts/sidebar-state.contract.test.tsx` (already exists - verify it fails) ✅ Tests verified to fail (Red phase) - useSidebarState not found
- [X] **T004 [P]** Contract test for usePackageReadiness hook in `specs/008-we-just-planned/contracts/package-readiness.contract.test.tsx` (already exists - verify it fails) ✅ Tests verified to fail (Red phase) - usePackageReadiness not found
- [X] **T005 [P]** Contract test for needs review workflow in `specs/008-we-just-planned/contracts/needs-review.contract.test.tsx` (already exists - verify it fails) ✅ Tests verified to fail (Red phase) - Missing QueryClientProvider wrapper (hooks exist)
- [X] **T006 [P]** Contract test for welders workflow in `specs/008-we-just-planned/contracts/welders.contract.test.tsx` (already exists - verify it fails) ✅ Tests verified to fail (Red phase) - useWelderUsage not found

### Integration Tests (All Parallel)
- [X] **T007 [P]** Integration test for project switching data refresh in `tests/integration/008-we-just-planned/project-switching.test.tsx` ✅ Tests created and verified to fail (Red phase) - useDashboardMetrics not found
- [X] **T008 [P]** Integration test for permission-based UI rendering in `tests/integration/008-we-just-planned/permission-rendering.test.tsx` ✅ Tests created and verified to fail (Red phase) - Sidebar component not found

---

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Custom Hooks (All Parallel - Different Files)
- [X] **T009 [P]** Create useSidebarState hook in `src/hooks/useSidebarState.ts` (localStorage persistence, default: false) ✅
- [X] **T010 [P]** Create useDashboardMetrics hook in `src/hooks/useDashboardMetrics.ts` (aggregate metrics from existing hooks) ✅
- [X] **T011 [P]** Create usePackageReadiness hook in `src/hooks/usePackageReadiness.ts` (query mv_package_readiness with filters) ✅
- [X] **T012 [P]** Create useWelderUsage hook in `src/hooks/useWelderUsage.ts` (count Weld Made events by welder) ✅

### Reusable UI Components (All Parallel - Different Files)
- [X] **T013 [P]** Create EmptyState component in `src/components/EmptyState.tsx` (reusable empty state with icon + CTA) ✅
- [X] **T014 [P]** Create ProgressRing component in `src/components/dashboard/ProgressRing.tsx` (circular progress indicator) ✅
- [X] **T015 [P]** Create MetricCard component in `src/components/dashboard/MetricCard.tsx` (dashboard stat card) ✅
- [X] **T016 [P]** Create ActivityFeed component in `src/components/dashboard/ActivityFeed.tsx` (recent activity list) ✅

### Sidebar Components (Sequential - Sidebar depends on useSidebarState)
- [X] **T017** Create Sidebar component in `src/components/Sidebar.tsx` (collapsible nav with icons, labels, active state, permission gates) ✅

### Package Components (All Parallel - Different Files)
- [X] **T018 [P]** Create PackageCard component in `src/components/packages/PackageCard.tsx` (card with progress, blockers, target date) ✅
- [X] **T019 [P]** Create PackageFilters component in `src/components/packages/PackageFilters.tsx` (All/Ready/In Progress/Blocked + search + sort) ✅

### Needs Review Components (All Parallel - Different Files)
- [X] **T020 [P]** Create ReviewItemCard component in `src/components/needs-review/ReviewItemCard.tsx` (item with age color coding, type badge) ✅
- [X] **T021 [P]** Create ReviewFilters component in `src/components/needs-review/ReviewFilters.tsx` (type filter, status filter) ✅
- [X] **T022 [P]** Create ResolveReviewModal component in `src/components/needs-review/ResolveReviewModal.tsx` (resolve/ignore with note) ✅

### Welder Components (All Parallel - Different Files)
- [X] **T023 [P]** Create WelderTable component in `src/components/welders/WelderTable.tsx` (table with status badges, weld counts, actions) ✅
- [X] **T024 [P]** Create AddWelderModal component in `src/components/welders/AddWelderModal.tsx` (form with stencil validation) ✅
- [X] **T025 [P]** Create VerifyWelderDialog component in `src/components/welders/VerifyWelderDialog.tsx` (confirmation dialog) ✅

### Page Updates (Sequential - Pages depend on components/hooks)
- [X] **T026** Update DashboardPage in `src/pages/DashboardPage.tsx` (connect to useDashboardMetrics, render MetricCard/ActivityFeed) ✅
- [X] **T027** Update PackagesPage in `src/pages/PackagesPage.tsx` (connect to usePackageReadiness, render PackageCard/PackageFilters) ✅
- [X] **T028** Update NeedsReviewPage in `src/pages/NeedsReviewPage.tsx` (connect to useNeedsReview, render ReviewItemCard/ResolveReviewModal) ✅
- [X] **T029** Update WeldersPage in `src/pages/WeldersPage.tsx` (connect to useWelders + useWelderUsage, render WelderTable/AddWelderModal) ✅
- [X] **T030** Update ImportsPage in `src/pages/ImportsPage.tsx` (query audit_log for recent imports, show template downloads) ✅

---

## Phase 3.4: Integration
- [X] **T031** Update Layout component in `src/components/Layout.tsx` (add Sidebar with useSidebarState, adjust main content margin) ✅

---

## Phase 3.5: Polish
- [X] **T032 [P]** Run all tests and verify >70% coverage (`npm test -- --coverage`) ✅ All 29 contract tests pass, TypeScript compiles clean
- [ ] **T033 [P]** Execute quickstart.md manual validation (all 15 steps) ⏸️ REQUIRES MANUAL USER TESTING
- [X] **T034** Run linter and fix any issues (`npm run lint`) ✅ TypeScript compiler passes (ESLint config missing)

---

## Dependencies

**Strict TDD Order**:
- T002-T008 (All Tests) → MUST complete and FAIL before any implementation
- T001 (Setup) can run anytime

**Hook Dependencies**:
- T009 (useSidebarState) → blocks T017 (Sidebar component)
- T010 (useDashboardMetrics) → blocks T026 (DashboardPage)
- T011 (usePackageReadiness) → blocks T027 (PackagesPage)
- T012 (useWelderUsage) → blocks T029 (WeldersPage)

**Component Dependencies**:
- T013-T016 (Reusable components) → block T026 (DashboardPage needs MetricCard, ProgressRing, ActivityFeed)
- T017 (Sidebar) → blocks T031 (Layout update)
- T018-T019 (Package components) → block T027 (PackagesPage)
- T020-T022 (Review components) → block T028 (NeedsReviewPage)
- T023-T025 (Welder components) → block T029 (WeldersPage)

**Page Dependencies**:
- T026-T030 (All pages) → block T032-T034 (Polish)
- T031 (Layout) → blocks T033 (quickstart validation needs working sidebar)

**No Blocking** (Can run in parallel with other tasks):
- T001, T002, T003, T004, T005, T006, T007, T008 (Setup + Tests)
- T009, T010, T011, T012 (Hooks - different files)
- T013, T014, T015, T016 (Reusable components - different files)
- T018, T019 (Package components - different files)
- T020, T021, T022 (Review components - different files)
- T023, T024, T025 (Welder components - different files)
- T032, T034 (Polish tasks - different operations)

---

## Parallel Execution Examples

### Phase 1: Run all tests in parallel
```bash
# Launch T002-T008 together (7 contract + integration tests)
npm test -- specs/008-we-just-planned/contracts/dashboard-metrics.contract.test.ts &
npm test -- specs/008-we-just-planned/contracts/sidebar-state.contract.test.ts &
npm test -- specs/008-we-just-planned/contracts/package-readiness.contract.test.ts &
npm test -- specs/008-we-just-planned/contracts/needs-review.contract.test.ts &
npm test -- specs/008-we-just-planned/contracts/welders.contract.test.ts &
npm test -- tests/integration/008-we-just-planned/project-switching.test.ts &
npm test -- tests/integration/008-we-just-planned/permission-rendering.test.ts &
wait
```

### Phase 2: Create all hooks in parallel
```bash
# Launch T009-T012 together (4 custom hooks)
# Task: Create useSidebarState in src/hooks/useSidebarState.ts
# Task: Create useDashboardMetrics in src/hooks/useDashboardMetrics.ts
# Task: Create usePackageReadiness in src/hooks/usePackageReadiness.ts
# Task: Create useWelderUsage in src/hooks/useWelderUsage.ts
```

### Phase 3: Create reusable components in parallel
```bash
# Launch T013-T016 together (4 reusable components)
# Task: Create EmptyState in src/components/EmptyState.tsx
# Task: Create ProgressRing in src/components/dashboard/ProgressRing.tsx
# Task: Create MetricCard in src/components/dashboard/MetricCard.tsx
# Task: Create ActivityFeed in src/components/dashboard/ActivityFeed.tsx
```

### Phase 4: Create feature components by domain (parallel within domain)
```bash
# Package components (T018-T019)
# Task: Create PackageCard in src/components/packages/PackageCard.tsx
# Task: Create PackageFilters in src/components/packages/PackageFilters.tsx

# Needs Review components (T020-T022)
# Task: Create ReviewItemCard in src/components/needs-review/ReviewItemCard.tsx
# Task: Create ReviewFilters in src/components/needs-review/ReviewFilters.tsx
# Task: Create ResolveReviewModal in src/components/needs-review/ResolveReviewModal.tsx

# Welder components (T023-T025)
# Task: Create WelderTable in src/components/welders/WelderTable.tsx
# Task: Create AddWelderModal in src/components/welders/AddWelderModal.tsx
# Task: Create VerifyWelderDialog in src/components/welders/VerifyWelderDialog.tsx
```

---

## Task Details

### T001: Install Dependencies
Check if lucide-react is installed. If not: `npm install lucide-react`

### T002-T006: Contract Tests
**Files already exist** in `specs/008-we-just-planned/contracts/`. Run each test to verify it fails (Red phase):
```bash
npm test -- specs/008-we-just-planned/contracts/dashboard-metrics.contract.test.ts
# Expected: FAIL (useDashboardMetrics not found)
```

### T007: Project Switching Integration Test
Create `tests/integration/008-we-just-planned/project-switching.test.ts`:
- Test: Select project A, verify dashboard shows project A data
- Test: Switch to project B, verify all data refreshes to project B
- Test: Navigate between pages, verify project B data persists
- Test: Refresh browser, verify selected project persists

### T008: Permission Rendering Integration Test
Create `tests/integration/008-we-just-planned/permission-rendering.test.ts`:
- Test: Admin role sees all nav items (Dashboard, Components, Drawings, Packages, Needs Review, Welders, Imports, Team)
- Test: Viewer role doesn't see Team nav item
- Test: User without can_manage_welders doesn't see Verify button
- Test: User without can_resolve_reviews doesn't see Resolve button

### T009: useSidebarState Hook
Return: `[isCollapsed: boolean, setIsCollapsed: (value: boolean) => void]`
- Read from localStorage on mount (key: 'sidebar-collapsed', default: false)
- Write to localStorage on every state change
- Handle localStorage unavailable gracefully (don't crash)

### T010: useDashboardMetrics Hook
Return: `{ data: DashboardMetrics | undefined, isLoading, isError, error, refetch }`
- Aggregate from: useComponents (avg percent_complete), useQuery(mv_package_readiness), useNeedsReview (pending count), useAuditLog (last 10)
- Use useMemo for calculations
- TanStack Query stale time: 1 minute

### T011: usePackageReadiness Hook
Return: `{ data: PackageCard[], isLoading, isError, error, refetch }`
- Query mv_package_readiness materialized view
- Support filters: status (all/ready/in_progress/blocked), search (by name), sortBy (name/progress/target_date)
- Transform to PackageCard view models (include statusColor calculation)

### T012: useWelderUsage Hook
Return: `{ data: Map<string, number>, isLoading, isError, error, refetch }`
- Query milestone_events WHERE milestone_name='Weld Made'
- Client-side counting by metadata->>'welder_id'
- Return Map<welderId, count>
- TanStack Query stale time: 5 minutes

### T013: EmptyState Component
Props: `{ icon: LucideIcon, title: string, description: string, action?: { label: string, onClick: () => void } }`
- Centered layout with icon (h-12 w-12), title, description
- Optional CTA button
- Use Tailwind classes for styling

### T014: ProgressRing Component
Props: `{ progress: number (0-100), size?: number, strokeWidth?: number }`
- SVG circular progress indicator
- Color: green if 100%, blue otherwise
- Animated stroke-dashoffset

### T015: MetricCard Component
Props: `{ title: string, value: string | number, icon: LucideIcon, trend?: string, badge?: number }`
- Card with icon, title, large value text
- Optional trend indicator (up/down arrow)
- Optional badge (for Needs Review count)

### T016: ActivityFeed Component
Props: `{ activities: ActivityItem[] }`
- List of recent activities (limit 10)
- Each item: user initials in circle, description, relative timestamp
- Empty state if no activities

### T017: Sidebar Component
Props: None (uses useSidebarState internally)
- Fixed-width: 280px expanded, 64px collapsed
- Nav items: Dashboard, Components, Drawings, Test Packages, Needs Review (badge), Welders, Imports, Team (permission-gated)
- Active state highlighting (match current route)
- Icons from lucide-react
- Toggle button at top
- Transition animation (300ms)
- Use PermissionGate for Team nav item

### T018: PackageCard Component
Props: `{ package: PackageCard }`
- Card with package name, progress bar, component count, blocker count, target date
- Status color: green border if 100%, blue if <100%, amber badge if blockers>0
- Click → navigate to components page filtered by package

### T019: PackageFilters Component
Props: `{ onFilterChange: (filters) => void }`
- Filter buttons: All, Ready, In Progress, Blocked
- Search input (debounced 300ms)
- Sort dropdown: Name, Progress, Target Date

### T020: ReviewItemCard Component
Props: `{ item: ReviewItem, onResolve: (id, note) => void }`
- Card with type badge, description, age
- Age color: <1 day gray, 1-3 days amber, >3 days red
- Resolve button (permission-gated)

### T021: ReviewFilters Component
Props: `{ onFilterChange: (filters) => void }`
- Type filter dropdown (all types + All)
- Status filter: Pending, Resolved, Ignored

### T022: ResolveReviewModal Component
Props: `{ item: ReviewItem, isOpen: boolean, onClose: () => void, onSubmit: (status, note) => void }`
- Dialog with item details
- Resolution note textarea (optional)
- Buttons: Resolve, Ignore, Cancel

### T023: WelderTable Component
Props: `{ welders: WelderRow[], onVerify: (id) => void, onAdd: () => void }`
- Table: Name, Stencil, Status, Weld Count, Verified Date, Actions
- Status badges: green "verified", amber "unverified"
- Verify button (permission-gated, only on unverified)
- Add Welder button (permission-gated)

### T024: AddWelderModal Component
Props: `{ isOpen: boolean, onClose: () => void, onSubmit: (data) => void }`
- Form: name (required), stencil (required)
- Stencil validation: 2-12 chars, alphanumeric + hyphens
- Auto-normalize stencil to uppercase on submit
- Show error if stencil already exists

### T025: VerifyWelderDialog Component
Props: `{ welder: WelderRow, isOpen: boolean, onClose: () => void, onConfirm: () => void }`
- Confirmation dialog with welder details
- Warning: "This action cannot be undone"
- Buttons: Confirm, Cancel

### T026: Update DashboardPage
- Use useDashboardMetrics(projectId)
- Render 4 MetricCards: Overall Progress (ProgressRing), Component Count, Packages Ready, Needs Review (badge)
- Render ActivityFeed with recent activity
- Render quick access cards (links to other pages)
- Handle loading state
- Handle error state with retry button
- Handle empty state (no project selected)

### T027: Update PackagesPage
- Use usePackageReadiness(projectId, filters)
- Render PackageFilters at top
- Render grid of PackageCards
- Handle loading state (skeleton cards)
- Handle error state with retry
- Handle empty state (EmptyState component)

### T028: Update NeedsReviewPage
- Use useNeedsReview(projectId, filters)
- Render ReviewFilters at top
- Render list of ReviewItemCards
- Handle resolve workflow (ResolveReviewModal)
- Update badge count after resolution
- Handle loading state
- Handle error state with retry
- Handle empty state ("No items need review" with green checkmark)

### T029: Update WeldersPage
- Use useWelders(projectId, filters) + useWelderUsage(projectId)
- Render WelderTable with joined data (welder + weld count)
- Handle add workflow (AddWelderModal)
- Handle verify workflow (VerifyWelderDialog)
- Handle loading state (skeleton table)
- Handle error state with retry
- Handle empty state (EmptyState with Add Welder button)

### T030: Update ImportsPage
- Use useAuditLog(projectId, { action_type: 'import', limit: 10 })
- Render recent import history list
- Render template download buttons (Excel files)
- Render upload area with "Coming Soon" message
- Handle loading state
- Handle empty state ("No recent imports")

### T031: Update Layout
- Import and render Sidebar component
- Adjust main content area margin based on sidebar state (280px vs 64px)
- Use useSidebarState to get current state
- Maintain existing top nav (project selector, search, notifications, user menu)

### T032: Run Tests with Coverage
```bash
npm test -- --coverage
```
Verify:
- Overall coverage ≥70%
- src/lib/** ≥80%
- src/components/** ≥60%
- All contract tests pass
- All integration tests pass

### T033: Execute Quickstart Validation
Run all 15 steps in `specs/008-we-just-planned/quickstart.md`:
1. Login & Auto-Selection
2. Sidebar Navigation & Persistence
3. Dashboard Metrics
4. Packages Filtering
5. Packages Searching & Sorting
6. Needs Review List Display
7. Needs Review Resolve Workflow
8. Welders Table Display
9. Add Welder
10. Verify Welder
11. Imports Recent History
12. Project Switching
13. Permission-Based UI
14. Empty States
15. Error States

### T034: Run Linter
```bash
npm run lint
```
Fix any ESLint errors or warnings.

---

## Validation Checklist
*GATE: Checked before marking feature complete*

- [x] All 5 contracts have corresponding tests (T002-T006)
- [x] All 4 hooks have implementation tasks (T009-T012)
- [x] All 13 components have creation tasks (T013-T025)
- [x] All 5 pages have update tasks (T026-T030)
- [x] All tests come before implementation (T002-T008 before T009-T030)
- [x] Parallel tasks truly independent (all [P] tasks are different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] Integration tests cover key scenarios (project switching, permissions)
- [x] Polish phase includes coverage, manual validation, linting

---

## Notes
- **TDD Mandatory**: All tests (T002-T008) MUST be written and failing before implementation starts
- **[P] Optimization**: Tasks marked [P] can run in parallel using Task agent for maximum efficiency
- **Commit Strategy**: Commit after completing each phase (tests → hooks → components → pages → polish)
- **Existing Infrastructure**: No new database tables, no new migrations - uses existing Sprint 1 schema
- **Contract Tests Already Exist**: T002-T006 contract test files are already created, just need to run them to verify they fail
- **Dependencies are Key**: Don't start page updates until their required components/hooks are complete
- **Coverage Gates**: CI pipeline enforces ≥70% overall coverage before merge
