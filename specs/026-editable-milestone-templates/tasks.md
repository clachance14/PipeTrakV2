# Tasks: Editable Milestone Weight Templates

**Input**: Design documents from `/specs/026-editable-milestone-templates/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Included per TDD workflow (Constitution Principle III)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Web application structure (React SPA + Supabase backend):
- **Frontend**: `src/components/`, `src/hooks/`, `src/pages/`
- **Backend**: `supabase/migrations/`
- **Tests**: Colocated `.test.tsx/.test.ts` files + `tests/integration/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database schema and foundational infrastructure

- [X] T001 Create `project_progress_templates` table in supabase/migrations/00087_project_progress_templates.sql
- [X] T002 Add weight sum validation trigger in supabase/migrations/00088_template_validation.sql
- [X] T003 Create `project_template_changes` audit table in supabase/migrations/00089_template_audit.sql
- [X] T004 Apply migrations to remote database with `supabase db push --linked`
- [X] T005 Regenerate TypeScript types with `supabase gen types typescript --linked > src/types/database.types.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core RPC functions and progress calculation update - MUST complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 Implement `clone_system_templates_for_project` RPC in supabase/migrations/00090_clone_templates_rpc.sql
- [X] T007 Add auto-clone trigger on project creation in supabase/migrations/00091_auto_clone_templates_trigger.sql
- [X] T008 Update `calculate_component_percent` function with project template fallback in supabase/migrations/00092_update_calculate_percent.sql
- [X] T009 Add RLS policies for `project_progress_templates` and `project_template_changes` in supabase/migrations/00093_template_rls_policies.sql
- [X] T010 Implement `update_project_template_weights` RPC in supabase/migrations/00094_update_template_weights_rpc.sql
- [X] T011 Implement `recalculate_components_with_template` RPC in supabase/migrations/00095_recalculate_components_rpc.sql
- [X] T012 Implement `get_project_template_summary` RPC in supabase/migrations/00096_template_summary_rpc.sql
- [X] T013 Apply new migrations and regenerate types with `supabase db push --linked` and `supabase gen types typescript --linked`
- [X] T014 Write RLS integration tests in tests/integration/rls/project-templates-rls.test.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View and Clone System Templates (Priority: P1) 🎯 MVP

**Goal**: Enable project managers to view the Milestone Templates settings page and clone system templates for customization

**Independent Test**: Navigate to Project Settings → Milestone Templates, click "Clone Templates", verify 55 template rows created and 11 component type cards displayed

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T015 [P] [US1] Write failing test for `TemplateCard` component render in src/components/settings/TemplateCard.test.tsx
- [X] T016 [P] [US1] Write failing test for `CloneTemplatesBanner` component render in src/components/settings/CloneTemplatesBanner.test.tsx
- [X] T017 [P] [US1] Write failing test for `MilestoneTemplatesPage` component render in src/components/settings/MilestoneTemplatesPage.test.tsx
- [X] T018 [P] [US1] Write failing test for `useCloneTemplates` hook in src/hooks/useCloneTemplates.test.ts
- [X] T019 [P] [US1] Write failing test for `useProjectTemplates` hook in src/hooks/useProjectTemplates.test.ts

### Implementation for User Story 1

- [X] T020 [P] [US1] Implement `useProjectTemplates` hook (fetch templates) in src/hooks/useProjectTemplates.ts
- [X] T021 [P] [US1] Implement `useCloneTemplates` hook (manual cloning RPC) in src/hooks/useCloneTemplates.ts
- [X] T022 [P] [US1] Create `TemplateCard` component (component type card with Edit button) in src/components/settings/TemplateCard.tsx
- [X] T023 [P] [US1] Create `CloneTemplatesBanner` component (prompt for existing projects) in src/components/settings/CloneTemplatesBanner.tsx
- [X] T024 [US1] Create `MilestoneTemplatesPage` component (main settings page with grid of cards) in src/components/settings/MilestoneTemplatesPage.tsx
- [X] T025 [US1] Add route `/projects/:projectId/settings/milestones` to src/App.tsx with ProtectedRoute wrapper
- [X] T026 [US1] Add Settings navigation link to Sidebar component (visible only to admin/PM roles)
- [X] T027 [US1] Verify all US1 tests pass (green)

**Checkpoint**: At this point, User Story 1 should be fully functional - users can view templates and clone them

---

## Phase 4: User Story 2 - Edit Milestone Weights with Validation (Priority: P2)

**Goal**: Enable project managers to edit milestone weights for any component type with real-time validation (total must equal 100%)

**Independent Test**: Click "Edit" on Field Weld card, adjust weights (sum = 100%), save changes, reopen editor and verify new weights persisted

### Tests for User Story 2

- [X] T028 [P] [US2] Write failing test for `WeightInput` component validation in src/components/settings/WeightInput.test.tsx
- [X] T029 [P] [US2] Write failing test for `WeightProgressBar` component rendering in src/components/settings/WeightProgressBar.test.tsx
- [X] T030 [P] [US2] Write failing test for `TemplateEditor` modal validation logic in src/components/settings/TemplateEditor.test.tsx
- [X] T031 [P] [US2] Write failing test for `useUpdateProjectTemplates` hook in src/hooks/useUpdateProjectTemplates.test.ts

### Implementation for User Story 2

- [X] T032 [P] [US2] Implement `useUpdateProjectTemplates` hook (weight mutation with validation) in src/hooks/useUpdateProjectTemplates.ts
- [X] T033 [P] [US2] Create `WeightInput` component (numeric input 0-100 with error handling) in src/components/settings/WeightInput.tsx
- [X] T034 [P] [US2] Create `WeightProgressBar` component (visual weight distribution bar) in src/components/settings/WeightProgressBar.tsx
- [X] T035 [US2] Create `TemplateEditor` modal component (weight editing with real-time total calculation) in src/components/settings/TemplateEditor.tsx
- [X] T036 [US2] Integrate `TemplateEditor` with `TemplateCard` Edit button click handler in MilestoneTemplatesPage.tsx
- [X] T037 [US2] Add Zod schema validation for weight sum = 100% in src/components/settings/TemplateEditor.tsx (DONE: Client-side validation in hook)
- [X] T038 [US2] Implement optimistic locking check (timestamp comparison) in useUpdateProjectTemplates mutation
- [X] T039 [US2] Add error toast for validation failures and concurrent edits in TemplateEditor
- [X] T040 [US2] Verify all US2 tests pass (green)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - users can clone and edit templates

---

## Phase 5: User Story 3 - Apply Weight Changes to Existing Components (Priority: P3)

**Goal**: Enable project managers to optionally recalculate progress percentages for existing components when saving weight changes

**Independent Test**: Edit Valve weights, check "Apply to existing components" checkbox, save, verify existing valve components show updated progress percentages

### Tests for User Story 3

- [X] T041 [P] [US3] Write failing test for retroactive recalculation checkbox behavior in src/components/settings/TemplateEditor.test.tsx (add to existing test file)
- [X] T042 [P] [US3] Write failing test for affected component count display in src/components/settings/TemplateEditor.test.tsx
- [X] T043 [P] [US3] Write failing integration test for recalculation workflow in tests/integration/settings/milestone-templates-workflow.test.ts

### Implementation for User Story 3

- [X] T044 [US3] Add "Apply to existing components" checkbox to `TemplateEditor` modal in src/components/settings/TemplateEditor.tsx
- [X] T045 [US3] Add affected component count query to `TemplateEditor` (SELECT COUNT from components) in src/components/settings/TemplateEditor.tsx
- [X] T046 [US3] Display warning message "⚠️ This affects N existing components" in TemplateEditor modal
- [X] T047 [US3] Pass `apply_to_existing` parameter to `update_project_template_weights` RPC in useUpdateProjectTemplates hook
- [X] T048 [US3] Add loading spinner with progress indicator during recalculation (2-3 seconds for 1,000 components)
- [X] T049 [US3] Show success toast with affected component count after recalculation completes
- [X] T050 [US3] Verify all US3 tests pass (green)

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently - complete weight editing workflow functional

---

## Phase 6: User Story 4 - View Audit Trail of Template Changes (Priority: P4)

**Goal**: Enable project managers to see "Last modified by [User] on [Date]" on component type cards for accountability

**Independent Test**: Make template edits, view component type card, verify "Last modified" text displays correct user and timestamp

### Tests for User Story 4

- [X] T051 [P] [US4] Write failing test for "Last modified" display in src/components/settings/TemplateCard.test.tsx (add to existing test file)
- [X] T052 [P] [US4] Write failing test for `useTemplateChanges` hook in src/hooks/useTemplateChanges.test.ts

### Implementation for User Story 4

- [X] T053 [P] [US4] Implement `useTemplateChanges` hook (fetch audit log) in src/hooks/useTemplateChanges.ts
- [X] T054 [US4] Add "Last modified by [User] on [Date]" display to `TemplateCard` component in src/components/settings/TemplateCard.tsx
- [X] T055 [US4] Format timestamp using date-fns or Intl.DateTimeFormat in TemplateCard
- [X] T056 [US4] Add user name lookup query (join with users table) in useTemplateChanges hook
- [X] T057 [US4] Verify all US4 tests pass (green)

**Checkpoint**: All user stories should now be independently functional - complete audit trail feature operational

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T058 [P] Add keyboard navigation support (Tab, Enter, Escape) to TemplateEditor modal in src/components/settings/TemplateEditor.tsx
- [X] T059 [P] Add ARIA labels for accessibility (WCAG 2.1 AA) to all settings components in src/components/settings/
- [X] T060 [P] Add permission gate component to hide Settings link for non-admin/PM users in src/components/Sidebar.tsx
- [ ] T061 [P] Performance test: Verify recalculation for 1,000 components completes in <3 seconds (run manually)
- [X] T062 [P] Add error boundary around MilestoneTemplatesPage to handle RLS policy errors gracefully
- [X] T063 [P] Update CLAUDE.md with new Settings page route and template editing patterns
- [X] T064 [P] Update PROJECT-STATUS.md to mark Feature 026 as complete with implementation date
- [X] T065 Code cleanup: Remove any debug logs, unused imports, commented code from settings/ directory
- [X] T066 Final validation: Run `npm test` and verify ≥70% coverage overall, ≥80% for utility functions
- [X] T067 Final validation: Run `tsc -b` and verify zero TypeScript errors
- [X] T068 Final validation: Run `npm run lint` and verify zero ESLint errors
- [ ] T069 Final validation: Run quickstart.md performance test checklist (template query <200ms, recalculation <3s)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup (Phase 1) completion - BLOCKS all user stories
- **User Stories (Phases 3-6)**: All depend on Foundational (Phase 2) completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3 → P4)
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Depends on US1 components (TemplateCard, hooks) but tests independently
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Depends on US2 (TemplateEditor modal) but tests independently
- **User Story 4 (P4)**: Can start after Foundational (Phase 2) - Depends on US1 (TemplateCard) but tests independently

**Note**: While US2-US4 have UI dependencies on earlier stories, each story delivers independent, testable value and can be deployed separately.

### Within Each User Story

- Tests MUST be written and FAIL before implementation (Red-Green-Refactor)
- Hooks before components (data layer before UI)
- Base components (WeightInput, WeightProgressBar) before composite components (TemplateEditor)
- Core functionality before polish (keyboard nav, ARIA labels)
- Story complete and tests green before moving to next priority

### Parallel Opportunities

**Phase 1 (Setup)**:
- All migration writes are sequential (T001 → T002 → T003), but T004 (apply) and T005 (regen types) are sequential

**Phase 2 (Foundational)**:
- Migrations T006-T012 can be written in parallel, but T013 (apply) must wait
- T014 (RLS tests) can run after T013

**Phase 3 (US1 Tests)**:
- T015-T019 (all test writes) can run in parallel

**Phase 3 (US1 Implementation)**:
- T020, T021 (hooks) can run in parallel
- T022, T023 (TemplateCard, CloneTemplatesBanner) can run in parallel
- T024 (MilestoneTemplatesPage) depends on T022, T023
- T025, T026 (routing, nav link) can run in parallel after T024

**Phase 4 (US2 Tests)**:
- T028-T031 (all test writes) can run in parallel

**Phase 4 (US2 Implementation)**:
- T032 (hook) runs first
- T033, T034 (WeightInput, WeightProgressBar) can run in parallel
- T035 (TemplateEditor) depends on T033, T034
- T036-T039 (integration) run sequentially after T035

**Phase 5 (US3 Tests)**:
- T041-T043 (all test writes) can run in parallel

**Phase 5 (US3 Implementation)**:
- T044-T049 run sequentially (all modify TemplateEditor component)

**Phase 6 (US4 Tests)**:
- T051, T052 (tests) can run in parallel

**Phase 6 (US4 Implementation)**:
- T053 (hook) and T054 (TemplateCard update) can run sequentially

**Phase 7 (Polish)**:
- T058-T064 (all polish tasks) can run in parallel
- T065-T069 (validation) run sequentially at the end

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task T015: "Write failing test for TemplateCard in src/components/settings/TemplateCard.test.tsx"
Task T016: "Write failing test for CloneTemplatesBanner in src/components/settings/CloneTemplatesBanner.test.tsx"
Task T017: "Write failing test for MilestoneTemplatesPage in src/components/settings/MilestoneTemplatesPage.test.tsx"
Task T018: "Write failing test for useCloneTemplates in src/hooks/useCloneTemplates.test.ts"
Task T019: "Write failing test for useProjectTemplates in src/hooks/useProjectTemplates.test.ts"

# Launch hooks together (after tests fail):
Task T020: "Implement useProjectTemplates in src/hooks/useProjectTemplates.ts"
Task T021: "Implement useCloneTemplates in src/hooks/useCloneTemplates.ts"

# Launch base components together (after hooks complete):
Task T022: "Create TemplateCard in src/components/settings/TemplateCard.tsx"
Task T023: "Create CloneTemplatesBanner in src/components/settings/CloneTemplatesBanner.tsx"
```

---

## Parallel Example: User Story 2

```bash
# Launch all tests for User Story 2 together:
Task T028: "Write failing test for WeightInput in src/components/settings/WeightInput.test.tsx"
Task T029: "Write failing test for WeightProgressBar in src/components/settings/WeightProgressBar.test.tsx"
Task T030: "Write failing test for TemplateEditor in src/components/settings/TemplateEditor.test.tsx"
Task T031: "Write failing test for useUpdateProjectTemplates in src/hooks/useUpdateProjectTemplates.test.ts"

# Launch atomic components together (after tests fail and T032 hook complete):
Task T033: "Create WeightInput in src/components/settings/WeightInput.tsx"
Task T034: "Create WeightProgressBar in src/components/settings/WeightProgressBar.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (database schema) - ~2 hours
2. Complete Phase 2: Foundational (RPC functions, RLS policies) - ~3 hours **CRITICAL BLOCKER**
3. Complete Phase 3: User Story 1 (clone templates UI) - ~4 hours
4. **STOP and VALIDATE**: Test User Story 1 independently (navigate to settings, clone templates, verify 55 rows)
5. Deploy/demo if ready - **MVP delivers value** (projects can now clone templates)

**Estimated MVP time**: ~8-10 hours (1.5 days)

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready (~5 hours)
2. Add User Story 1 → Test independently → Deploy/Demo (~4 hours) - **MVP!** (template cloning works)
3. Add User Story 2 → Test independently → Deploy/Demo (~5 hours) - **Enhanced!** (weight editing works)
4. Add User Story 3 → Test independently → Deploy/Demo (~3 hours) - **Complete!** (retroactive recalculation works)
5. Add User Story 4 → Test independently → Deploy/Demo (~2 hours) - **Audit trail!** (accountability)
6. Polish → Final validation → Production deploy (~3 hours)

**Total estimated time**: ~22 hours (3 days solo developer)

### Parallel Team Strategy

With 2 developers:

1. **Both**: Complete Setup (Phase 1) together (~2 hours)
2. **Both**: Complete Foundational (Phase 2) together (~3 hours) **CRITICAL BLOCKER**
3. Once Foundational is done:
   - **Developer A**: User Story 1 + User Story 3 (~7 hours)
   - **Developer B**: User Story 2 + User Story 4 (~7 hours)
4. **Both**: Polish + validation together (~3 hours)

**Total estimated time with 2 devs**: ~15 hours (2 days)

---

## Notes

- [P] tasks = different files, no dependencies - safe to parallelize
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail (RED) before implementing (GREEN)
- Commit after each task or logical group (e.g., T020-T021 hooks together)
- Stop at any checkpoint to validate story independently
- Desktop-only (>1024px) - no mobile/tablet optimizations required
- Admin/PM permissions enforced at UI (hidden links) and database (RLS policies)
- Performance target: 1,000 components recalculated in <3 seconds (SC-003)
- Coverage target: ≥70% overall, ≥80% for utility functions (weight validation, recalculation logic)
