# Tasks: Dashboard Recent Activity Feed

**Input**: Design documents from `/specs/018-activity-feed/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: NOT explicitly requested in the specification, so test tasks are NOT included. Focus is on implementation only.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and database structure

- [X] T001 Create migration file `supabase/migrations/00053_create_recent_activity_view.sql` with view DDL
- [X] T002 [P] Export ActivityItem interface from `specs/018-activity-feed/contracts/activity-item.contract.test.tsx` to `src/types/activity.ts`
- [X] T003 [P] Configure TanStack Query stale time (30 seconds) for activity queries in `src/hooks/useDashboardMetrics.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core database infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Create PostgreSQL view `vw_recent_activity` with user initials calculation and description formatting in `supabase/migrations/00053_create_recent_activity_view.sql`
- [X] T005 Apply migration to remote database using `npx supabase db push --linked` and verify view exists via Supabase Dashboard SQL Editor

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View Recent Milestone Updates (Priority: P1) 🎯 MVP

**Goal**: Display the last 10 milestone updates on the dashboard, filtered by selected project, in reverse chronological order

**Independent Test**: Update a component milestone via Components page and verify it appears in the dashboard activity feed within 3 seconds with complete details (who, what, when, which component, which drawing)

### Implementation for User Story 1

- [X] T006 [P] [US1] Implement useAuditLog hook query in `src/hooks/useDashboardMetrics.ts` to fetch from vw_recent_activity with project_id filter and LIMIT 10
- [X] T007 [P] [US1] Add TanStack Query configuration with query key `['projects', projectId, 'recent-activity']` and staleTime 30 seconds in `src/hooks/useDashboardMetrics.ts`
- [X] T008 [US1] Transform view data to ActivityItem[] format in `src/hooks/useDashboardMetrics.ts` (depends on T006, T007)
- [X] T009 [US1] Update DashboardPage.tsx to use real useAuditLog data (replace stub) and pass to ActivityFeed component

**Checkpoint**: At this point, User Story 1 should be fully functional - dashboard shows last 10 activities for selected project

---

## Phase 4: User Story 2 - Understand Activity Context (Priority: P1)

**Goal**: Display each activity with full details (who made the change, which milestone, previous value, which component, and which drawing) so users understand complete context

**Independent Test**: Create various types of milestone updates (discrete checkboxes, partial percentages, different component types) and verify each displays with complete, formatted descriptions including user name, milestone, component identity, and drawing number

### Implementation for User Story 2

- [X] T010 [P] [US2] Implement component identity formatting CASE statement for all 11 component types in `supabase/migrations/00055_fix_component_identity_formatting.sql` (spool, field_weld, support, valve, fitting, flange, instrument, tubing, hose, misc_component, threaded_pipe) - Uses commodity_code + size for Class-B components (valve, fitting, flange, instrument, support)
- [X] T011 [P] [US2] Implement description template with milestone action formatting (complete vs. partial percentage with previous value) in `supabase/migrations/00055_fix_component_identity_formatting.sql` - Handles "complete", "to X%", and "(was Y%)" patterns
- [X] T012 [US2] Add drawing number display logic with "(no drawing assigned)" fallback in `supabase/migrations/00055_fix_component_identity_formatting.sql` - Uses drawing_no_raw from drawings table (depends on T010, T011)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - activities display with complete formatted context

---

## Phase 5: User Story 3 - See Historical Activities (Priority: P2)

**Goal**: Display activities from existing milestone data (not just new updates) so users have immediate visibility into recent team work when the feature is deployed

**Independent Test**: Deploy the feature to a project with existing milestone_events data and verify the feed is populated immediately with the last 10 activities

### Implementation for User Story 3

- [X] T013 [US3] Verify view queries existing milestone_events table directly without backfill logic by running query via Supabase Dashboard SQL Editor
- [X] T014 [US3] Test view returns historical data by querying vw_recent_activity for project with existing milestone_events (validate via `query_view.mjs` script from quickstart.md)

**Checkpoint**: All user stories 1-3 should now be independently functional - feed shows historical + new activities

---

## Phase 6: User Story 4 - Identify Team Members (Priority: P3)

**Goal**: Display user initials in the activity feed so users can quickly identify who made each change without reading full names

**Independent Test**: Verify initials are correctly calculated from user full names (e.g., "John Smith" → "JS", "Madonna" → "M") and from email addresses when full_name is not set, and displayed in the avatar circle

### Implementation for User Story 4

- [X] T015 [US4] Implement user_initials calculation using LATERAL unnest + string_agg pattern with email fallback in `supabase/migrations/00061_update_user_initials_calculation.sql`
- [X] T016 [US4] Verify ActivityFeed component displays user_initials in avatar circles (component already exists, no changes needed - validation only)

**Checkpoint**: All user stories should now be independently functional - activities show user initials

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T017 [P] Add Supabase Realtime subscription to milestone_events INSERTs in `src/hooks/useDashboardMetrics.ts` with query invalidation and cleanup
- [ ] T018 [P] Add performance validation script `performance_test.mjs` to verify view queries complete in <100ms per quickstart.md
- [X] T019 [P] Add empty state handling for "No recent activity" message when activities array is empty in `src/components/dashboard/ActivityFeed.tsx` (verify component handles this)
- [ ] T020 [P] Run quickstart.md validation: verify migration applied, view queryable, dev server starts, real-time updates appear within 3 seconds

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001 migration file created) - BLOCKS all user stories
- **User Stories (Phases 3-6)**: All depend on Foundational phase completion (view must exist)
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P1 → P2 → P3)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Works with US1 but independently testable (different SQL vs. hook code)
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Validates existing functionality (query behavior)
- **User Story 4 (P3)**: Can start after Foundational (Phase 2) - Validates existing functionality (initials display)

### Within Each User Story

- US1: Models before services before integration (T006-T007 parallel, then T008, then T009)
- US2: All SQL formatting tasks can be done together in same migration (T010-T011 parallel, then T012)
- US3: Query test before data validation (T013 before T014)
- US4: SQL calculation before UI verification (T015 before T016)

### Parallel Opportunities

- **Setup (Phase 1)**: T002 and T003 can run in parallel (different files)
- **Foundational (Phase 2)**: Sequential (view before verify)
- **User Story 1**: T006 and T007 can run in parallel (different concerns in same file)
- **User Story 2**: T010 and T011 can run in parallel (different sections in same SQL file)
- **User Story 3**: Sequential (query before validation)
- **User Story 4**: Sequential (calculation before display validation)
- **Polish (Phase 7)**: All 4 tasks can run in parallel (different files/concerns)

**Cross-Story Parallel**: After Phase 2, US1 and US2 can be worked on simultaneously by different developers (hook vs. SQL)

---

## Parallel Example: User Story 1

```bash
# Launch parallel tasks for User Story 1:
Task: "Implement useAuditLog hook query in src/hooks/useDashboardMetrics.ts to fetch from vw_recent_activity with project_id filter and LIMIT 10"
Task: "Add TanStack Query configuration with query key ['projects', projectId, 'recent-activity'] and staleTime 30 seconds in src/hooks/useDashboardMetrics.ts"

# Then sequential:
Task: "Transform view data to ActivityItem[] format in src/hooks/useDashboardMetrics.ts"
Task: "Update DashboardPage.tsx to use real useAuditLog data"
```

---

## Parallel Example: User Story 2

```bash
# Launch parallel tasks for User Story 2 (same SQL file, different sections):
Task: "Implement component identity formatting CASE statement for all 11 component types in supabase/migrations/00050_create_recent_activity_view.sql"
Task: "Implement description template with milestone action formatting in supabase/migrations/00050_create_recent_activity_view.sql"

# Then sequential:
Task: "Add drawing number display logic with fallback in supabase/migrations/00050_create_recent_activity_view.sql"
```

---

## Implementation Strategy

### MVP First (User Stories 1-2 Only)

1. Complete Phase 1: Setup (3 tasks)
2. Complete Phase 2: Foundational (2 tasks) - **CRITICAL BLOCKER**
3. Complete Phase 3: User Story 1 (4 tasks)
4. Complete Phase 4: User Story 2 (3 tasks)
5. **STOP and VALIDATE**: Test User Stories 1-2 independently
6. Deploy/demo if ready

**Why US1 + US2 for MVP**: Both are P1 priority and work together to provide complete activity feed with full context. US1 shows activities, US2 makes them understandable.

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (basic activity list)
3. Add User Story 2 → Test independently → Deploy/Demo (activities with full context) **← MVP**
4. Add User Story 3 → Test independently → Deploy/Demo (historical data)
5. Add User Story 4 → Test independently → Deploy/Demo (user initials)
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With 2 developers after Foundational phase completes:

**Developer A: Frontend (User Story 1)**
- T006-T009: Hook implementation and UI integration

**Developer B: Backend (User Story 2)**
- T010-T012: SQL view formatting logic

Then both can tackle US3 and US4 in parallel since they're validation/verification tasks.

---

## Notes

- [P] tasks = different files or different sections, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **No test tasks included** - tests not explicitly requested in specification
- View uses `drawing_no_raw` column (NOT `drawing_number` which doesn't exist)
- Real-time subscription invalidates query on all milestone_events INSERTs (simpler than per-project filtering)
- TanStack Query 30-second stale time prevents refetch storms
- View inherits RLS from base tables (milestone_events, components, users, drawings)
