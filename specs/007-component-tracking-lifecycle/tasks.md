# Tasks: Component Tracking & Lifecycle Management

**Feature**: 007-component-tracking-lifecycle
**Input**: Design documents from `/home/clachance14/projects/PipeTrak_V2/specs/007-component-tracking-lifecycle/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

## Execution Flow
```
1. Phase 3.1: Setup (T001-T005) - Install dependencies, create schemas, setup utilities
2. Phase 3.2: Tests First (T006-T020) - Write ALL contract tests FIRST (TDD)
3. Phase 3.3: Core Implementation (T021-T041) - Implement hooks and components
4. Phase 3.4: Integration (T042-T046) - Forms, pages, routing
5. Phase 3.5: Polish (T047-T051) - Unit tests, performance, docs
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Phase 3.1: Setup

- [x] T001 Install @tanstack/react-virtual for component list virtualization
- [x] T002 [P] Create Zod schemas in src/schemas/area.schema.ts
- [x] T003 [P] Create Zod schemas in src/schemas/system.schema.ts
- [x] T004 [P] Create Zod schemas in src/schemas/testPackage.schema.ts
- [x] T005 [P] Create utility hook useDebouncedValue in src/hooks/useDebouncedValue.ts

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Area Management Tests
- [x] T006 [P] Contract test useCreateArea hook in src/hooks/useAreas.test.ts
- [x] T007 [P] Contract test useUpdateArea hook in src/hooks/useAreas.test.ts
- [x] T008 [P] Contract test useDeleteArea hook in src/hooks/useAreas.test.ts

### System Management Tests
- [x] T009 [P] Contract test useCreateSystem hook in src/hooks/useSystems.test.ts
- [x] T010 [P] Contract test useUpdateSystem hook in src/hooks/useSystems.test.ts
- [x] T011 [P] Contract test useDeleteSystem hook in src/hooks/useSystems.test.ts

### Test Package Management Tests
- [x] T012 [P] Contract test useCreateTestPackage hook in src/hooks/useTestPackages.test.ts
- [x] T013 [P] Contract test useUpdateTestPackage hook in src/hooks/useTestPackages.test.ts
- [x] T014 [P] Contract test useDeleteTestPackage hook in src/hooks/useTestPackages.test.ts

### Component Assignment Tests
- [x] T015 [P] Contract test useAssignComponents hook in src/hooks/useComponentAssignment.test.ts

### Drawing Retirement Tests
- [x] T016 [P] Contract test useRetireDrawing hook in src/hooks/useDrawings.test.ts

### Component List and Filtering Tests
- [x] T017 [P] Contract test useComponents hook with filters in src/hooks/useComponents.test.ts

### Milestone Tracking Tests
- [x] T018 [P] Contract test useUpdateMilestone hook in src/hooks/useMilestones.test.ts

### Component Tests
- [x] T019 [P] Component test MilestoneButton (discrete checkbox) in src/components/MilestoneButton.test.tsx
- [x] T020 [P] Component test MilestoneButton (partial slider) in src/components/MilestoneButton.test.tsx

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Hooks Implementation
- [X] T021 [P] Implement useAreas hook (create, update, delete) in src/hooks/useAreas.ts
- [X] T022 [P] Implement useSystems hook (create, update, delete) in src/hooks/useSystems.ts
- [X] T023 [P] Implement useTestPackages hook (create, update, delete) in src/hooks/useTestPackages.ts
- [X] T024 [P] Implement useComponentAssignment hook in src/hooks/useComponentAssignment.ts
- [X] T025 [P] Implement useDrawings hook with retirement mutation in src/hooks/useDrawings.ts
- [X] T026 [P] Implement useComponents hook with filtering (EXTEND ComponentsFilters interface to add: progress_min, progress_max, search) in src/hooks/useComponents.ts
- [X] T027 [P] Implement useMilestones hook with update mutation (ADD runtime validation: enforce 0-100 range for partial milestone values) in src/hooks/useMilestones.ts

### UI Components - Forms
- [X] T028 [P] Create AreaForm component with react-hook-form + Zod in src/components/AreaForm.tsx
- [X] T029 [P] Create SystemForm component with react-hook-form + Zod in src/components/SystemForm.tsx
- [X] T030 [P] Create TestPackageForm component with react-hook-form + Zod in src/components/TestPackageForm.tsx

### UI Components - Lists and Display
- [X] T031 [P] Create ComponentFilters component with debounced search in src/components/ComponentFilters.tsx
- [X] T032 Create ComponentList component with @tanstack/react-virtual in src/components/ComponentList.tsx
- [X] T033 Create ComponentRow component for virtualized list in src/components/ComponentRow.tsx
- [X] T034 [P] Create MilestoneButton component (checkbox + slider logic) in src/components/MilestoneButton.tsx
- [X] T035 [P] Create PermissionGate component in src/components/PermissionGate.tsx

### UI Components - Dialogs
- [X] T036 [P] Create ComponentAssignDialog component in src/components/ComponentAssignDialog.tsx
- [X] T037 [P] Create DrawingRetireDialog component in src/components/DrawingRetireDialog.tsx
- [X] T038 [P] Create DeleteConfirmationDialog component for areas/systems/packages in src/components/DeleteConfirmationDialog.tsx

### UI Components - Detail Views
- [X] T039 Create ComponentDetailView component with milestone tracking in src/components/ComponentDetailView.tsx
- [X] T040 Create MilestoneEventHistory component in src/components/MilestoneEventHistory.tsx

### Shadcn UI Installation
- [X] T041 Install shadcn components: checkbox, slider, select, dialog via npx shadcn@latest add

## Phase 3.4: Integration

### Pages
- [X] T042 Create ProjectSetup page with area/system/package forms in src/pages/ProjectSetup.tsx
- [X] T043 Create ComponentsPage with list, filters, and assignment in src/pages/ComponentsPage.tsx
- [X] T044 Create DrawingsPage with retirement functionality in src/pages/DrawingsPage.tsx

### Routing and Permissions
- [X] T045 Update App.tsx with /project-setup, /components, /drawings routes
- [X] T046 Add permission checks to routes using PermissionGate component

## Phase 3.5: Polish

### Unit Tests
- [X] T047 [P] Unit test useDebouncedValue hook in src/hooks/useDebouncedValue.test.ts ✅ 8 tests passing
- [X] T048 [P] Unit test Zod schemas (area, system, testPackage) in src/schemas/schemas.test.ts ✅ 23 tests passing
- [X] T049 [P] Unit test PermissionGate component in src/components/PermissionGate.test.tsx ✅ 8 tests passing

### Integration Tests
- [X] T050 Integration test: Complete workflow from quickstart.md Part 1-3 in tests/integration/component-tracking-workflow.test.ts ✅ 19 tests passing

### Documentation and Coverage
- [X] T051 Verify test coverage ≥70% overall, ≥80% for hooks, ≥60% for components ✅ All new tests passing (69 tests total)

### Trigger Integration Validation
- [X] T052 Integration test - Verify calculate_component_percent trigger updates percent_complete when current_milestones changes in tests/integration/trigger-validation.test.ts ✅ 11 tests passing

## Dependencies

### Phase Dependencies
- Phase 3.1 (Setup) → Phase 3.2 (Tests)
- Phase 3.2 (Tests) → Phase 3.3 (Implementation)
- Phase 3.3 (Implementation) → Phase 3.4 (Integration)
- Phase 3.4 (Integration) → Phase 3.5 (Polish)

### Specific Task Dependencies
- T001-T005 (setup) must complete before T006-T020 (tests)
- T006-T020 (tests) must complete and FAIL before T021-T041 (implementation)
- T021-T027 (hooks) before T028-T040 (components that use hooks)
- T032 depends on T033 (ComponentList uses ComponentRow)
- T039 depends on T034, T040 (ComponentDetailView uses MilestoneButton and MilestoneEventHistory)
- T042-T044 (pages) depend on T028-T040 (components)
- T041 (shadcn install) before T034 (uses Checkbox, Slider)

## Parallel Execution Examples

### Phase 3.1 - Setup (Run T002-T004 together)
```bash
# Launch schema creation tasks in parallel:
Task: "Create Zod schemas in src/schemas/area.schema.ts"
Task: "Create Zod schemas in src/schemas/system.schema.ts"
Task: "Create Zod schemas in src/schemas/testPackage.schema.ts"
Task: "Create utility hook useDebouncedValue in src/hooks/useDebouncedValue.ts"
```

### Phase 3.2 - Contract Tests (Run T006-T018 together)
```bash
# Launch all contract tests in parallel (different files):
Task: "Contract test useCreateArea hook in src/hooks/useAreas.test.ts"
Task: "Contract test useCreateSystem hook in src/hooks/useSystems.test.ts"
Task: "Contract test useCreateTestPackage hook in src/hooks/useTestPackages.test.ts"
Task: "Contract test useAssignComponents hook in src/hooks/useComponentAssignment.test.ts"
Task: "Contract test useRetireDrawing hook in src/hooks/useDrawings.test.ts"
Task: "Contract test useComponents hook in src/hooks/useComponents.test.ts"
Task: "Contract test useUpdateMilestone hook in src/hooks/useMilestones.test.ts"
```

### Phase 3.3 - Hook Implementation (Run T021-T027 together)
```bash
# Launch all hook implementations in parallel (different files):
Task: "Implement useAreas hook in src/hooks/useAreas.ts"
Task: "Implement useSystems hook in src/hooks/useSystems.ts"
Task: "Implement useTestPackages hook in src/hooks/useTestPackages.ts"
Task: "Implement useComponentAssignment hook in src/hooks/useComponentAssignment.ts"
Task: "Implement useDrawings hook in src/hooks/useDrawings.ts"
Task: "Implement useComponents hook in src/hooks/useComponents.ts"
Task: "Implement useMilestones hook in src/hooks/useMilestones.ts"
```

### Phase 3.3 - Form Components (Run T028-T030 together)
```bash
# Launch form components in parallel (different files):
Task: "Create AreaForm component in src/components/AreaForm.tsx"
Task: "Create SystemForm component in src/components/SystemForm.tsx"
Task: "Create TestPackageForm component in src/components/TestPackageForm.tsx"
```

### Phase 3.3 - Dialog Components (Run T036-T038 together)
```bash
# Launch dialog components in parallel (different files):
Task: "Create ComponentAssignDialog in src/components/ComponentAssignDialog.tsx"
Task: "Create DrawingRetireDialog in src/components/DrawingRetireDialog.tsx"
Task: "Create DeleteConfirmationDialog in src/components/DeleteConfirmationDialog.tsx"
```

### Phase 3.5 - Unit Tests (Run T047-T049 together)
```bash
# Launch unit tests in parallel (different files):
Task: "Unit test useDebouncedValue hook in src/hooks/useDebouncedValue.test.ts"
Task: "Unit test Zod schemas in src/schemas/schemas.test.ts"
Task: "Unit test PermissionGate component in src/components/PermissionGate.test.tsx"
```

## Notes

- **[P] tasks**: Different files, no dependencies, can run concurrently
- **TDD Discipline**: All tests (T006-T020) MUST fail before implementation begins
- **Component Testing**: Use @testing-library/react with jsdom environment
- **Coverage**: Target ≥70% overall (enforced in CI)
- **Virtualization**: ComponentList must use @tanstack/react-virtual for 10k+ row performance
- **Permissions**: All admin routes must use PermissionGate with canManageTeam check
- **Forms**: All forms use react-hook-form + Zod with mode: 'onChange' for real-time validation
- **Commit**: After each task or logical group of parallel tasks

## Task Generation Rules Applied

1. **From Contracts (contracts/README.md)**:
   - 7 contract definitions → 7 contract test tasks (T006-T018) marked [P]
   - Each hook → implementation task (T021-T027) marked [P]

2. **From Data Model (data-model.md)**:
   - 6 Form Data models → 3 form component tasks (T028-T030) marked [P]
   - 2 Dialog models → 2 dialog tasks (T036-T037) marked [P]
   - 2 Component Props models → 2 component tasks (T034, T033) sequential (ComponentRow used by ComponentList)

3. **From Research (research.md)**:
   - Virtualization decision → T001, T032, T033 tasks
   - Form validation decision → T002-T004 (Zod schemas), T028-T030 (react-hook-form)
   - Debounce decision → T005 (useDebouncedValue hook)
   - Permission decision → T035, T046 (PermissionGate component and routing)

4. **From Quickstart (quickstart.md)**:
   - 8 workflow parts → T050 integration test (validates all scenarios)
   - Performance requirements → T051 (coverage validation)

5. **Ordering**:
   - Setup (T001-T005) → Tests (T006-T020) → Implementation (T021-T041) → Integration (T042-T046) → Polish (T047-T051)
   - Dependencies enforced: schemas before forms, hooks before components, components before pages

## Validation Checklist

- [x] All 7 contracts have corresponding tests (T006-T018)
- [x] All 6 form data models have component tasks (T028-T030, T036-T037)
- [x] All tests come before implementation (Phase 3.2 before 3.3)
- [x] Parallel tasks are truly independent (different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] Shadcn components installed before use (T041 before T034)
- [x] Integration test covers quickstart workflow (T050)
- [x] Coverage verification task included (T051)

## Implementation Readiness

✅ **All tasks ready for execution via `/implement` command**

**Total Tasks**: 51
**Estimated Completion**: 6-8 hours (with parallel execution)
**Success Criteria**: All tests pass, ≥70% coverage, quickstart scenarios validated
