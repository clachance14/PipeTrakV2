# Tasks: Add Unplanned Field Welds

**Input**: Design documents from `/specs/028-add-unplanned-welds/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/, quickstart.md

**Tests**: This feature follows TDD (Test-Driven Development) per Constitution Principle III. All test tasks are REQUIRED.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

React SPA + Supabase backend structure:
- Frontend: `src/components/`, `src/hooks/`, `src/pages/`, `src/lib/`
- Backend: `supabase/migrations/`
- Tests: `tests/integration/`, `tests/acceptance/`, colocated `*.test.tsx`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and type generation

- [ ] T001 Verify TypeScript strict mode configuration in tsconfig.app.json
- [ ] T002 Verify Supabase client configuration in src/lib/supabase.ts
- [ ] T003 [P] Verify TanStack Query setup in src/main.tsx

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema and permission infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Write failing RPC test for permission checks in tests/integration/rls/create-unplanned-weld.test.ts
- [ ] T005 Write failing RPC test for duplicate weld number rejection in tests/integration/rls/create-unplanned-weld.test.ts
- [ ] T006 [P] Write failing RPC test for metadata inheritance in tests/integration/rls/create-unplanned-weld.test.ts
- [ ] T007 [P] Write failing RPC test for atomic transaction rollback in tests/integration/rls/create-unplanned-weld.test.ts
- [ ] T008 Create migration file supabase/migrations/NNNN_create_unplanned_weld_rpc.sql
- [ ] T009 Add notes column to field_welds table in migration (ALTER TABLE field_welds ADD COLUMN notes TEXT)
- [ ] T010 Implement create_unplanned_weld() RPC function with SECURITY DEFINER in migration
- [ ] T011 Add RPC permission grants and documentation in migration
- [ ] T012 Apply migration with ./db-push.sh
- [ ] T013 Regenerate TypeScript types: supabase gen types typescript --linked > src/types/database.types.ts
- [ ] T014 Verify all RPC tests pass (T004-T007)
- [ ] T015 Add canCreateFieldWeld() permission utility to src/lib/permissions.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Create Single Unplanned Weld (Priority: P1) 🎯 MVP

**Goal**: Enable foremen to create individual unplanned welds from Weld Log page with minimal required fields (drawing, weld type, size, spec)

**Independent Test**: Log in as foreman, click "Add Weld", fill required fields (drawing, type, size, spec), verify new weld appears in table with unique weld number

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T016 [P] [US1] Write failing hook test for successful mutation in src/hooks/useCreateUnplannedWeld.test.ts
- [ ] T017 [P] [US1] Write failing hook test for loading/error states in src/hooks/useCreateUnplannedWeld.test.ts
- [ ] T018 [P] [US1] Write failing hook test for query invalidation in src/hooks/useCreateUnplannedWeld.test.ts
- [ ] T019 [P] [US1] Write failing component test for dialog rendering with pre-filled weld number in src/components/field-welds/CreateUnplannedWeldDialog.test.tsx
- [ ] T020 [P] [US1] Write failing component test for form validation (submit disabled until required fields) in src/components/field-welds/CreateUnplannedWeldDialog.test.tsx
- [ ] T021 [P] [US1] Write failing component test for success/error handling in src/components/field-welds/CreateUnplannedWeldDialog.test.tsx
- [ ] T022 [P] [US1] Write failing component test for mobile accessibility (≥44px touch targets) in src/components/field-welds/CreateUnplannedWeldDialog.test.tsx
- [ ] T023 [US1] Write failing acceptance test for full user flow in tests/acceptance/create-unplanned-weld.test.ts

### Implementation for User Story 1

- [ ] T024 [US1] Implement useCreateUnplannedWeld hook in src/hooks/useCreateUnplannedWeld.ts (TanStack Query mutation, RPC call, query invalidation)
- [ ] T025 [US1] Create CreateUnplannedWeldDialog component in src/components/field-welds/CreateUnplannedWeldDialog.tsx (Shadcn Dialog with form fields)
- [ ] T026 [US1] Add weld number auto-generation logic to CreateUnplannedWeldDialog
- [ ] T027 [US1] Add form validation logic (required: drawing, weld type, size, spec) to CreateUnplannedWeldDialog
- [ ] T028 [US1] Add submit handler with useCreateUnplannedWeld hook to CreateUnplannedWeldDialog
- [ ] T029 [US1] Add success toast and dialog close logic to CreateUnplannedWeldDialog
- [ ] T030 [US1] Add error handling and display to CreateUnplannedWeldDialog
- [ ] T031 [US1] Add "Add Weld" button to src/pages/WeldLogPage.tsx (permission check with canCreateFieldWeld)
- [ ] T032 [US1] Render CreateUnplannedWeldDialog in WeldLogPage with projectId prop
- [ ] T033 [US1] Verify all User Story 1 tests pass (T016-T023)
- [ ] T034 [US1] Test on mobile device (verify ≥44px touch targets, responsive layout)

**Checkpoint**: At this point, User Story 1 should be fully functional - users can create unplanned welds with required fields only

---

## Phase 4: User Story 2 - Add Context Notes for Unplanned Welds (Priority: P2)

**Goal**: Enable PMs to document why an unplanned weld was created (field change, client request) for audit trail

**Independent Test**: Create a weld with notes entered, verify notes are saved and visible when viewing weld details

### Tests for User Story 2

- [ ] T035 [P] [US2] Write failing component test for notes field in CreateUnplannedWeldDialog.test.tsx
- [ ] T036 [P] [US2] Write failing component test for notes field optional validation in CreateUnplannedWeldDialog.test.tsx
- [ ] T037 [US2] Write failing integration test for notes persistence in tests/integration/rls/create-unplanned-weld.test.ts

### Implementation for User Story 2

- [ ] T038 [US2] Add notes textarea field to CreateUnplannedWeldDialog (optional, 3-4 rows)
- [ ] T039 [US2] Pass notes value to useCreateUnplannedWeld mutation in CreateUnplannedWeldDialog
- [ ] T040 [US2] Verify notes display in WeldDetailModal (if exists, or skip if not implemented yet)
- [ ] T041 [US2] Verify all User Story 2 tests pass (T035-T037)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - users can create welds with or without notes

---

## Phase 5: User Story 3 - Smart Drawing Search (Priority: P2)

**Goal**: Enable users to quickly find the correct drawing from hundreds of drawings by typing part of drawing number or title

**Independent Test**: Open dialog, type partial drawing number or title, verify matching drawings appear in dropdown with both number and title visible

### Tests for User Story 3

- [ ] T042 [P] [US3] Write failing component test for drawing search/filter in CreateUnplannedWeldDialog.test.tsx
- [ ] T043 [P] [US3] Write failing component test for drawing search matching number and title in CreateUnplannedWeldDialog.test.tsx
- [ ] T044 [US3] Write failing component test for drawing selection updates form in CreateUnplannedWeldDialog.test.tsx

### Implementation for User Story 3

- [ ] T045 [US3] Add drawing search state (searchTerm) to CreateUnplannedWeldDialog
- [ ] T046 [US3] Implement client-side drawing filter logic (matches drawing_number and title) in CreateUnplannedWeldDialog
- [ ] T047 [US3] Replace static drawing select with searchable Combobox in CreateUnplannedWeldDialog
- [ ] T048 [US3] Display both drawing number and title in search results in CreateUnplannedWeldDialog
- [ ] T049 [US3] Verify all User Story 3 tests pass (T042-T044)
- [ ] T050 [US3] Test with project containing 100+ drawings (performance validation)

**Checkpoint**: All user stories should now be independently functional - complete feature with notes and smart search

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final validation

- [ ] T051 [P] Run full test suite with coverage: npm test -- --coverage
- [ ] T052 [P] Verify coverage targets met (≥70% overall, ≥80% hooks, ≥60% components)
- [ ] T053 [P] Run type check: tsc -b
- [ ] T054 [P] Run linter: npm run lint
- [ ] T055 Test permission enforcement (Viewer and Welder roles cannot see "Add Weld" button)
- [ ] T056 Test race condition handling (two users create welds simultaneously)
- [ ] T057 Test edge cases from spec (cancel dialog, drawing deleted, invalid spec)
- [ ] T058 [P] Update KNOWLEDGE-BASE.md with unplanned weld creation pattern
- [ ] T059 [P] Update PROJECT-STATUS.md with Feature 028 completion
- [ ] T060 Code review using /coderabbit command
- [ ] T061 Create pull request with feature summary

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (US1 → US2 → US3)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Builds on US1 dialog component but independently testable
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Enhances US1 drawing selection but independently testable

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD)
- Hook before dialog component
- Dialog component before WeldLogPage integration
- Core implementation before integration tests
- Story complete before moving to next priority

### Parallel Opportunities

- **Phase 1**: All tasks marked [P] (T003)
- **Phase 2 Tests**: T006-T007 can run in parallel
- **Phase 3 Tests**: T016-T022 can run in parallel (all dialog/hook tests)
- **Phase 4 Tests**: T035-T036 can run in parallel
- **Phase 5 Tests**: T042-T043 can run in parallel
- **Phase 6 Polish**: T051-T054 and T058-T059 can run in parallel
- **Across Stories**: Once Phase 2 completes, US1, US2, US3 can all start in parallel by different developers

---

## Parallel Example: User Story 1 Tests

```bash
# Launch all User Story 1 tests together (must all FAIL before implementation):
Task T016: "Write failing hook test for successful mutation in src/hooks/useCreateUnplannedWeld.test.ts"
Task T017: "Write failing hook test for loading/error states in src/hooks/useCreateUnplannedWeld.test.ts"
Task T018: "Write failing hook test for query invalidation in src/hooks/useCreateUnplannedWeld.test.ts"
Task T019: "Write failing component test for dialog rendering with pre-filled weld number in src/components/field-welds/CreateUnplannedWeldDialog.test.tsx"
Task T020: "Write failing component test for form validation in src/components/field-welds/CreateUnplannedWeldDialog.test.tsx"
Task T021: "Write failing component test for success/error handling in src/components/field-welds/CreateUnplannedWeldDialog.test.tsx"
Task T022: "Write failing component test for mobile accessibility in src/components/field-welds/CreateUnplannedWeldDialog.test.tsx"
```

---

## Parallel Example: Phase 6 Polish

```bash
# Launch independent polish tasks together:
Task T051: "Run full test suite with coverage: npm test -- --coverage"
Task T053: "Run type check: tsc -b"
Task T054: "Run linter: npm run lint"
Task T058: "Update KNOWLEDGE-BASE.md with unplanned weld creation pattern"
Task T059: "Update PROJECT-STATUS.md with Feature 028 completion"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T015) - CRITICAL, blocks all stories
3. Complete Phase 3: User Story 1 (T016-T034)
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready - users can create unplanned welds with required fields

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready (T001-T015)
2. Add User Story 1 → Test independently → Deploy/Demo (T016-T034) - MVP!
3. Add User Story 2 → Test independently → Deploy/Demo (T035-T041) - Adds notes
4. Add User Story 3 → Test independently → Deploy/Demo (T042-T050) - Adds smart search
5. Polish → Final validation → Production (T051-T061)

Each story adds value without breaking previous stories.

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001-T015)
2. Once Foundational is done:
   - Developer A: User Story 1 (T016-T034)
   - Developer B: User Story 2 (T035-T041) - works on notes feature
   - Developer C: User Story 3 (T042-T050) - works on smart search
3. Stories complete and integrate independently
4. Team converges on Polish (T051-T061)

---

## Task Summary

**Total Tasks**: 61

**Task Count per Phase**:
- Phase 1 (Setup): 3 tasks
- Phase 2 (Foundational): 12 tasks (database + permissions)
- Phase 3 (User Story 1 - MVP): 19 tasks (8 tests + 11 implementation)
- Phase 4 (User Story 2): 7 tasks (3 tests + 4 implementation)
- Phase 5 (User Story 3): 9 tasks (3 tests + 6 implementation)
- Phase 6 (Polish): 11 tasks (validation + documentation)

**Parallel Opportunities**: 16 tasks marked [P] can run in parallel
- Phase 1: 1 task
- Phase 2: 2 tasks
- Phase 3: 7 tasks
- Phase 4: 2 tasks
- Phase 5: 2 tasks
- Phase 6: 5 tasks

**Independent Test Criteria**:
- US1: Create weld with required fields → see in table
- US2: Create weld with notes → verify notes saved
- US3: Search drawings → see filtered results

**Suggested MVP Scope**: Phase 1 + Phase 2 + Phase 3 (User Story 1 only) = T001-T034 (34 tasks)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- **TDD MANDATORY**: Verify tests fail before implementing (Red-Green-Refactor)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Reference quickstart.md for implementation details and common issues
- All file paths are absolute from repository root
