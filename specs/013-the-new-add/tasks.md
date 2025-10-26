# Tasks: Add New Project

**Input**: Design documents from `/specs/013-the-new-add/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/README.md, quickstart.md

## Execution Flow (main)
```
1. Load plan.md from feature directory ✓
   → Tech stack: React 18, TypeScript 5, React Router v7, TanStack Query v5
   → Structure: Single-page web app (src/, tests/)
2. Load optional design documents ✓
   → data-model.md: No new entities (uses existing projects table)
   → contracts/: 6 component behavior contracts
   → research.md: Dropdown implementation, form validation strategy
3. Generate tasks by category:
   → Setup: Routing configuration
   → Tests: 6 contract tests (all parallel)
   → Core: 1 new page, 2 modified components
   → Integration: Full user flow test
   → Polish: Manual validation, final review
4. Apply task rules:
   → Contract tests = different aspects = mark [P]
   → Implementation = shared context = sequential
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001-T013)
6. Generate dependency graph (below)
7. Create parallel execution examples (below)
8. Validate task completeness:
   → All 6 contracts have tests ✓
   → All 3 components have implementation tasks ✓
   → Integration test covers user flow ✓
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Project type**: Single-page web application (React SPA)
- **Source**: `src/` at repository root
- **Tests**: `tests/` at repository root (contract tests colocated with implementation)

## Phase 3.1: Setup
- [x] T001 Add /projects/new route to App.tsx with ProtectedRoute wrapper

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

- [x] T002 [P] Contract test for dropdown navigation in src/components/Layout.test.tsx
  - Test: Dropdown includes "➕ Add New Project" option
  - Test: Selecting option navigates to /projects/new
  - Test: Navigation does not change selectedProjectId
  - Reference: contracts/README.md Contract 1

- [x] T003 [P] Contract test for form validation in src/pages/CreateProjectPage.test.tsx
  - Test: Empty name field shows error
  - Test: Empty description field shows error
  - Test: Whitespace-only name shows error
  - Test: Whitespace-only description shows error
  - Reference: contracts/README.md Contract 2

- [x] T004 [P] Contract test for successful creation in src/pages/CreateProjectPage.test.tsx
  - Test: Valid submission calls createProject mutation
  - Test: Success triggers setSelectedProjectId with new project ID
  - Test: Success navigates to home page (/)
  - Reference: contracts/README.md Contract 3

- [x] T005 [P] Contract test for failed creation in src/pages/CreateProjectPage.test.tsx
  - Test: Error shows toast notification
  - Test: Error keeps user on form page
  - Test: Error preserves form data
  - Test: Error does not call setSelectedProjectId or navigate
  - Reference: contracts/README.md Contract 4

- [x] T006 [P] Contract test for cancel navigation in src/pages/CreateProjectPage.test.tsx
  - Test: Cancel button navigates to home without calling createProject
  - Test: Form data is discarded
  - Reference: contracts/README.md Contract 5

- [x] T007 [P] Contract test for loading state in src/pages/CreateProjectPage.test.tsx
  - Test: Submit button disabled when isPending is true
  - Reference: contracts/README.md Contract 6

## Phase 3.3: Core Implementation (ONLY after tests are failing)
- [x] T008 Create CreateProjectPage component in src/pages/CreateProjectPage.tsx
  - Implement form with name and description inputs
  - Client-side validation (trim whitespace, required fields)
  - useCreateProject mutation integration
  - Success: setSelectedProjectId + navigate('/')
  - Error: toast.error + stay on page
  - Cancel button navigates to home
  - Loading state disables submit button
  - Reference: research.md decisions 2, 3, 4, 5

- [x] T009 Modify Layout component in src/components/Layout.tsx
  - Add <option value="__new__">➕ Add New Project</option> to dropdown
  - Add onChange handler to detect "__new__" selection
  - Navigate to /projects/new when selected
  - Do NOT call setSelectedProjectId for "__new__" option
  - Reference: research.md decision 1

- [x] T010 Modify App component in src/App.tsx
  - Add route: <Route path="/projects/new" element={<ProtectedRoute><CreateProjectPage /></ProtectedRoute>} />
  - Verify Sonner Toaster component is rendered (for error notifications)

## Phase 3.4: Integration
- [x] T011 Integration test for full user flow in tests/integration/add-project-flow.test.tsx
  - Test: Open dropdown → select "Add New Project" → form appears
  - Test: Fill form → submit → project created → home page shown
  - Test: Verify new project appears in dropdown as selected
  - Reference: quickstart.md Scenarios 1, 2, 5, 6

## Phase 3.5: Polish
- [x] T012 Run manual validation from specs/013-the-new-add/quickstart.md
  - Execute all 10 test scenarios in browser
  - Verify accessibility (keyboard navigation, screen readers)
  - Test responsive design (mobile viewport)
  - Check for console errors
  - Record results in task notes

- [x] T013 Final code review and cleanup
  - Verify all tests passing (npm test)
  - Verify TypeScript compilation (tsc -b)
  - Remove any console.log statements
  - Verify code follows Constitution v1.0.1 principles
  - Update CLAUDE.md with new feature context (if needed)

## Dependencies
```
T001 (Setup)
  ↓
T002-T007 (Contract Tests - PARALLEL, MUST FAIL)
  ↓
T008-T010 (Implementation - SEQUENTIAL)
  ↓
T011 (Integration Test)
  ↓
T012-T013 (Polish - PARALLEL)
```

### Critical Path
1. T001 blocks T002-T007 (route must exist for tests to reference it)
2. T002-T007 MUST be completed and failing before T008-T010
3. T008 blocks T009, T010 (CreateProjectPage imported by App.tsx)
4. T010 blocks T011 (route must be configured for integration test)
5. T011 blocks T012, T013 (integration must pass before manual validation)

### Parallel Opportunities
- **T002-T007**: All contract tests can be written simultaneously (different test aspects)
- **T012-T013**: Manual validation and code review can happen in parallel

## Parallel Example
```bash
# Launch T002-T007 together (after T001 complete):
# Task 1: Dropdown navigation test
# Task 2: Form validation test
# Task 3: Successful creation test
# Task 4: Failed creation test
# Task 5: Cancel navigation test
# Task 6: Loading state test

# All tests should FAIL initially (TDD Red phase)
```

## Notes
- [P] tasks = different files or test aspects, no dependencies
- Verify tests fail before implementing (Red-Green-Refactor)
- Commit after each task or logical group
- This is a UI-only feature - no database migrations or backend changes
- All backend interaction uses existing useCreateProject() hook
- Form uses React state for validation (no form library needed for 2 fields)

## Task Generation Rules
*Applied during main() execution*

1. **From Contracts**:
   - Each of 6 contracts → contract test task [P] ✓
   - Contracts are component behaviors (not API endpoints)

2. **From Data Model**:
   - No new entities (uses existing projects table)
   - No migration tasks needed ✓

3. **From User Stories (quickstart.md)**:
   - 10 scenarios → 1 integration test covering full flow ✓
   - Manual validation task for quickstart execution ✓

4. **Ordering**:
   - Setup → Tests → Implementation → Integration → Polish ✓
   - Dependencies enforced via sequential ordering ✓

## Validation Checklist
*GATE: Checked by main() before returning*

- [x] All contracts have corresponding tests (6 contracts → 6 test tasks T002-T007)
- [x] All components have implementation tasks (CreateProjectPage, Layout, App → T008-T010)
- [x] All tests come before implementation (T002-T007 before T008-T010)
- [x] Parallel tasks truly independent (T002-T007 test different aspects)
- [x] Each task specifies exact file path (src/pages/CreateProjectPage.tsx, etc.)
- [x] No task modifies same file as another [P] task (contract tests are in separate describe blocks)

## Test Coverage Expectations

### Unit/Component Tests (T002-T007)
- **Target**: ≥70% overall coverage
- **CreateProjectPage**: ≥60% (UI component)
- **Layout**: ≥60% (dropdown logic added)

### Integration Test (T011)
- **Scope**: Full user journey from dropdown → form → creation → home
- **Mocking**: Mock useCreateProject, useNavigate, useProject hooks
- **Environment**: jsdom (Vitest configured)

### Manual Testing (T012)
- **Scope**: 10 quickstart scenarios
- **Environment**: Real browser (http://localhost:5173)
- **Focus**: Accessibility, responsive design, edge cases

## Implementation Notes

### Key Files Modified
1. **src/components/Layout.tsx** (T009)
   - Add dropdown option with value "__new__"
   - Conditional navigation logic

2. **src/pages/CreateProjectPage.tsx** (T008 - NEW)
   - Form state: name, description
   - Validation state: errors object
   - Hooks: useCreateProject, useProject, useNavigate, useAuth
   - Submit handler with validation
   - Cancel handler

3. **src/App.tsx** (T010)
   - Import CreateProjectPage
   - Add route configuration

### No Changes Required
- `src/hooks/useProjects.ts` (useCreateProject already exists)
- `src/contexts/ProjectContext.tsx` (setSelectedProjectId already exists)
- `supabase/migrations/` (no database changes)
- `src/types/database.types.ts` (no new types needed)

### Testing Dependencies
- Vitest (existing)
- Testing Library (existing)
- Mock hooks: useCreateProject, useNavigate, useProject, useAuth

---

**Status**: ✅ Tasks generated and ready for execution via /implement or manual TDD workflow
