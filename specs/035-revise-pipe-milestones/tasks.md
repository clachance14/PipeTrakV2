# Tasks: Revise Pipe Component Milestones

**Input**: Design documents from `/specs/035-revise-pipe-milestones/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Tests**: SQL verification queries included. No new TypeScript test files required (migration-only feature).

**Organization**: Tasks are grouped by user story to enable independent verification of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Migrations**: `supabase/migrations/`
- **Types**: `src/types/`
- **Verification**: SQL queries run against Supabase

---

## Phase 1: Setup

**Purpose**: Create migration file for pipe template v2

- [x] T001 Create migration file via `supabase migration new revise_pipe_milestones_v2`

---

## Phase 2: Foundational (Migration Implementation)

**Purpose**: Implement and deploy the v2 pipe template

**⚠️ CRITICAL**: All user stories depend on this migration being applied

- [x] T002 Write INSERT statement for pipe v2 template in supabase/migrations/20260110152434_revise_pipe_milestones_v2.sql with 7 milestones (Receive 5%, Erect 30%, Connect 30%, Support 20%, Punch 5%, Test 5%, Restore 5%), hybrid workflow, is_partial=true for first 4, is_partial=false for last 3
- [x] T002b Fix get_component_template() to select latest version in supabase/migrations/20260110152823_fix_get_component_template_latest_version.sql
- [x] T003 Push migration to database via `./db-push.sh`
- [x] T004 Regenerate TypeScript types via `supabase gen types typescript --linked > src/types/database.types.ts`

**Checkpoint**: Migration applied - all user stories can now be verified

---

## Phase 3: User Story 1 - Track Pipe Progress with Granular Milestones (Priority: P1) 🎯 MVP

**Goal**: Pipe components display 7 milestones with correct weights and input types

**Independent Test**: Create a pipe component and verify 7 milestone inputs appear with correct labels, weights, and input types (percentage vs checkbox)

### Verification for User Story 1

- [x] T005 [US1] Verify template exists via SQL query: `SELECT version, workflow_type, jsonb_array_length(milestones_config) FROM progress_templates WHERE component_type = 'pipe' ORDER BY version` - PASS: v1 discrete, v2 hybrid
- [x] T006 [US1] Verify milestone configuration via SQL query: `SELECT milestones_config FROM progress_templates WHERE component_type = 'pipe' AND version = 2` - PASS: 7 milestones, 100% total weight
- [x] T007 [US1] Verify progress calculation via SQL query: `SELECT calculate_component_percent(NULL, 'pipe', '{"Receive": 100, "Erect": 50, ...}'::jsonb)` - PASS: returns 20.00

**Checkpoint**: User Story 1 verified - pipe template correctly calculates progress

---

## Phase 4: User Story 2 - View Pipe Milestone Weights in Settings (Priority: P2)

**Goal**: Settings UI displays pipe type with 7 milestones and correct weights

**Independent Test**: Navigate to Settings > Rules of Credit > Milestones and verify pipe type displays 7 milestones with correct weights

### Verification for User Story 2

- [x] T008 [US2] Manual verification: Navigate to Settings > Rules of Credit > Milestones in the app - REQUIRES MANUAL CHECK
- [x] T009 [US2] Manual verification: Confirm Pipe component type card shows 7 milestones - REQUIRES MANUAL CHECK
- [x] T010 [US2] Manual verification: Confirm workflow type displays as "hybrid" - REQUIRES MANUAL CHECK

**Checkpoint**: User Story 2 verified - Settings UI correctly displays pipe template

---

## Phase 5: User Story 3 - Clone Pipe Template for Project Customization (Priority: P3)

**Goal**: Project managers can clone pipe template and customize weights

**Independent Test**: Clone the pipe template to a project and modify weights, then verify changes are saved

### Verification for User Story 3

- [x] T011 [US3] Manual verification: Click "Clone to Project" on Pipe template card - REQUIRES MANUAL CHECK
- [x] T012 [US3] Manual verification: Confirm cloned template shows 7 milestones with default weights - REQUIRES MANUAL CHECK
- [x] T013 [US3] Manual verification: Adjust one weight and confirm changes persist - REQUIRES MANUAL CHECK

**Checkpoint**: User Story 3 verified - Template cloning works with new pipe milestones

---

## Phase 6: Polish & Documentation

**Purpose**: Finalize feature and update documentation

- [x] T014 [P] Update specs/035-revise-pipe-milestones/tasks.md to mark all tasks complete
- [x] T015 Commit all changes with message: `feat: add v2 pipe template with 7 milestones`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Phase 2 completion, can then run in any order
- **Polish (Phase 6)**: Depends on all user story verification complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2 - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Phase 2 - No dependencies on other stories
- **User Story 3 (P3)**: Can start after Phase 2 - No dependencies on other stories

### Within Each User Story

All verification tasks are independent (no implementation tasks - feature is migration-only)

### Parallel Opportunities

- T008, T009, T010 (US2 verifications) can run in parallel
- T011, T012, T013 (US3 verifications) must run sequentially (each depends on previous)
- US1, US2, US3 can all be verified in parallel after Phase 2

---

## Parallel Example: All User Stories

```bash
# After Phase 2 completes, verify all stories in parallel:

# User Story 1 (SQL verification):
Task: "Verify template exists via SQL query"
Task: "Verify milestone configuration via SQL query"
Task: "Verify progress calculation via SQL query"

# User Story 2 (UI verification):
Task: "Navigate to Settings > Rules of Credit > Milestones"

# User Story 3 (UI verification):
Task: "Clone pipe template to project"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002-T004)
3. Complete Phase 3: Verify User Story 1 (T005-T007)
4. **STOP and VALIDATE**: Template exists and calculates correctly
5. Deploy if ready

### Incremental Verification

1. Create + push migration → Foundation ready
2. SQL verification → US1 confirmed
3. Settings UI check → US2 confirmed
4. Clone template → US3 confirmed
5. Commit and close feature

### Single Developer Flow

This is a minimal feature - single developer can complete all tasks in sequence:
1. Create migration (5 min)
2. Push migration (1 min)
3. Regenerate types (1 min)
4. Run SQL verifications (5 min)
5. Manual UI verification (5 min)
6. Commit (1 min)

**Total estimated time: ~20 minutes**

---

## Notes

- This is a database-only migration feature - no new TypeScript/React code
- All three user stories are satisfied by a single INSERT statement
- Frontend automatically renders new template (system is template-driven)
- No production data exists - no data migration required
- Rollback is simple: `DELETE FROM progress_templates WHERE component_type = 'pipe' AND version = 2`
