# Tasks: Demo Project Data Population

**Feature**: 023-demo-data-population
**Input**: Design documents from `/specs/023-demo-data-population/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[X]**: Completed task
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: TypeScript type definitions and test infrastructure

- [X] T001 [P] Create TypeScript types file at `src/types/demo-seed.types.ts` using contract from `specs/023-demo-data-population/contracts/seed-data-schema.ts`
- [ ] T002 [P] Setup test fixtures directory at `tests/fixtures/demo-data/` for test data

**Checkpoint**: Type system ready for seed data and function signatures

---

## Phase 2: Database Migration (SQL Function)

**Purpose**: Create database function for skeleton creation

- [X] T003 Create SQL migration file at `supabase/migrations/[TIMESTAMP]_create_demo_skeleton_function.sql` using contract from `specs/023-demo-data-population/contracts/create-demo-skeleton.sql`
- [X] T004 Apply migration to remote database using `npx supabase db push --linked`
- [X] T005 Verify function exists with `SELECT routine_name FROM information_schema.routines WHERE routine_name = 'create_demo_skeleton'`

**Checkpoint**: Database function deployed and ready to use

---

## Phase 3: Seed Data Generation

**Purpose**: Create declarative seed data file with 200 components, 20 drawings, 120 welds

- [X] T006 Create seed data file at `supabase/functions/populate-demo-data/seed-data.ts` with skeleton structure (areas, systems, packages, welders)
- [X] T007 Add 20 drawings to seed data (distributed across 5 areas, 5 systems) using data from `data-model.md`
- [X] T008 [P] Add 40 spools to seed data with identity keys (spool_id pattern)
- [X] T009 [P] Add 80 supports to seed data with identity keys (drawing_norm + commodity + size + seq)
- [X] T010 [P] Add 50 valves to seed data with identity keys (drawing_norm + commodity + size + seq)
- [X] T011 [P] Add 20 flanges to seed data with identity keys (drawing_norm + commodity + size + seq)
- [X] T012 [P] Add 10 instruments to seed data with identity keys (drawing_norm + commodity + size + seq)
- [X] T013 Add 120 field welds to seed data (3 per spool, distributed across drawings)
- [X] T014 Add 200 component milestone states (realistic progression per `research.md`: 95% receive, 70% install/erect, 30% punch, 0% test/restore)
- [X] T015 Add 120 weld milestone states (fit_up progression)
- [X] T016 Add 78 welder assignments (65% of welds with "Weld Made" = true, evenly distributed across 4 welders)

**Checkpoint**: Seed data file complete with all 200 components, 20 drawings, 120 welds

---

## Phase 4: Contract Tests (Seed Data Validation)

**Purpose**: Validate seed data structure before implementation

**NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T017 [P] Create contract test at `tests/contract/seed-data-structure.test.ts` validating seed data has exactly 200 components
- [X] T018 [P] Add test validating component distribution (40 spools, 80 supports, 50 valves, 20 flanges, 10 instruments)
- [X] T019 [P] Add test validating all natural key references are valid (drawing numbers exist, area/system/package names exist)
- [X] T020 [P] Add test validating milestone dependencies (can't install without receive, etc.)
- [X] T021 [P] Add test validating welder assignments only for "Weld Made" = true
- [X] T022 [P] Add test validating weld distribution (3 per spool, ~120 total)

**Checkpoint**: Seed data validation tests passing

---

## Phase 5: Edge Function Implementation (populate-demo-data)

**Purpose**: Implement bulk population Edge Function handler

- [X] T023 Create Edge Function handler at `supabase/functions/populate-demo-data/index.ts` with request/response types from contract
- [X] T024 Create insertion logic file at `supabase/functions/populate-demo-data/insertion-logic.ts` with natural key lookup functions
- [X] T025 Implement fetching skeleton entities (areas, systems, packages, welders) and building lookup maps
- [X] T026 Implement bulk drawing insertion with resolved area/system FKs, capture drawing IDs
- [X] T027 Implement bulk component insertion with resolved drawing/area/system/package FKs, capture component IDs
- [X] T028 Implement bulk field weld insertion with resolved drawing FKs, capture weld IDs
- [X] T029 Implement component milestone updates using lookup maps
- [X] T030 Implement weld milestone updates using lookup maps
- [X] T031 Implement welder assignment updates (only for welds with "Weld Made" = true)
- [X] T032 Add idempotency checks (ON CONFLICT DO NOTHING or WHERE NOT EXISTS)
- [X] T033 Add execution time tracking and return counts in response
- [X] T034 Add error handling and logging for debugging

**Checkpoint**: Edge Function implementation complete

---

## Phase 6: Integration Tests (populate-demo-data Edge Function)

**Purpose**: Test bulk population function behavior

- [X] T035 [P] Create integration test at `tests/integration/demo-bulk-population.test.ts` testing happy path (empty project → full population)
- [X] T036 [P] Add test validating exactly 20 drawings created
- [X] T037 [P] Add test validating exactly 200 components created with correct distribution
- [X] T038 [P] Add test validating ~120 field welds created
- [X] T039 [P] Add test validating execution time <45 seconds
- [X] T040 [P] Add test validating all foreign keys resolved correctly (0 orphaned records)
- [X] T041 [P] Add test validating welder assignments match "Weld Made" state (~65% of welds)

**Checkpoint**: Edge Function tests passing

---

## Phase 7: SQL Function Integration Tests

**Purpose**: Test skeleton function behavior

- [X] T042 [P] Create integration test at `tests/integration/demo-skeleton-creation.test.ts` testing skeleton creates exactly 5 areas
- [X] T043 [P] Add test validating exactly 5 systems created
- [X] T044 [P] Add test validating exactly 10 test packages created
- [X] T045 [P] Add test validating exactly 4 welders created
- [X] T046 [P] Add test validating function completes in <2 seconds
- [X] T047 [P] Add test validating function is idempotent (safe to retry)

**Checkpoint**: SQL function tests passing

---

## Phase 8: Idempotency Tests

**Purpose**: Test retry scenarios without duplicates

- [X] T048 [P] Create idempotency test at `tests/integration/demo-idempotency.test.ts` testing skeleton function retry creates no duplicates
- [X] T049 [P] Add test validating population function retry creates no duplicates
- [X] T050 [P] Add test validating partial population + retry completes full dataset
- [X] T051 [P] Add test validating error recovery scenarios

**Checkpoint**: Idempotency guarantees verified

---

## Phase 9: Integration with demo-signup

**Purpose**: Modify existing demo-signup function to use skeleton + population

- [X] T052 Modify `supabase/functions/demo-signup/index.ts` to call `create_demo_skeleton` RPC after project creation
- [X] T053 Add async invocation of `populate-demo-data` Edge Function after skeleton creation (fire-and-forget pattern)
- [X] T054 Add error handling for skeleton creation failures
- [X] T055 Add logging for population invocation status

**Checkpoint**: Demo signup flow integrated with population

---

## Phase 10: End-to-End Tests

**Purpose**: Test complete demo signup flow

- [ ] T056 Create E2E test at `tests/e2e/demo-signup-flow.spec.ts` testing user redirected to dashboard within 2 seconds
- [ ] T057 Add test validating skeleton structure visible immediately (5 areas, 5 systems, 10 packages, 4 welders)
- [ ] T058 Add test validating components/drawings populate within 45 seconds
- [ ] T059 Add test validating user can filter/search populated data

**Checkpoint**: Full user journey verified

---

## Phase 11: Performance Optimization & Monitoring

**Purpose**: Ensure performance targets met

- [ ] T060 [P] Add execution time logging to Edge Function with breakdown by entity type
- [ ] T061 [P] Add database query performance monitoring for bulk inserts
- [ ] T062 [P] Verify bulk insert performance meets targets (<2s drawings, <10s components, <5s welds)

**Checkpoint**: Performance targets met

---

## Phase 12: Documentation & Deployment

**Purpose**: Deploy and document

- [ ] T063 Deploy Edge Function to staging using `supabase functions deploy populate-demo-data --project-ref <staging>`
- [ ] T064 Test on staging environment using quickstart.md verification checklist
- [ ] T065 Deploy to production using `supabase functions deploy populate-demo-data --project-ref <production>`
- [ ] T066 [P] Update CLAUDE.md with feature completion status
- [ ] T067 [P] Update PROJECT-STATUS.md with demo population details

**Checkpoint**: Feature deployed to production

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Database Migration (Phase 2)**: Depends on Setup completion (types needed)
- **Seed Data (Phase 3)**: Depends on Setup (uses types from T001)
- **Contract Tests (Phase 4)**: Depends on Seed Data (Phase 3 complete)
- **Edge Function (Phase 5)**: Depends on Seed Data + Database Migration
- **Integration Tests (Phases 6-8)**: Depend on Edge Function implementation
- **demo-signup Integration (Phase 9)**: Depends on Edge Function + SQL function working
- **E2E Tests (Phase 10)**: Depend on demo-signup integration complete
- **Performance (Phase 11)**: Can run in parallel with testing phases
- **Deployment (Phase 12)**: Depends on all tests passing

### Parallel Opportunities

**Phase 1** - All tasks marked [P] can run in parallel:
- T001, T002

**Phase 3** - Component generation tasks can run in parallel:
- T008, T009, T010, T011, T012 (different component types)

**Phase 4** - All contract tests can run in parallel:
- T017, T018, T019, T020, T021, T022

**Phase 6** - All integration tests can run in parallel:
- T035, T036, T037, T038, T039, T040, T041

**Phase 7** - All SQL function tests can run in parallel:
- T042, T043, T044, T045, T046, T047

**Phase 8** - All idempotency tests can run in parallel:
- T048, T049, T050, T051

**Phase 11** - All performance monitoring tasks can run in parallel:
- T060, T061, T062

**Phase 12** - Documentation tasks can run in parallel:
- T066, T067

---

## Parallel Execution Examples

### Phase 3: Seed Data Generation (Components)

Launch all component type tasks together:

```bash
# These tasks work on different sections of seed-data.ts and can run in parallel
Task: "Add 40 spools to seed data with identity keys"
Task: "Add 80 supports to seed data with identity keys"
Task: "Add 50 valves to seed data with identity keys"
Task: "Add 20 flanges to seed data with identity keys"
Task: "Add 10 instruments to seed data with identity keys"
```

### Phase 4: Contract Tests

Launch all validation tests together:

```bash
# These tests validate different aspects of seed data structure
Task: "Create contract test validating 200 components"
Task: "Add test validating component distribution"
Task: "Add test validating natural key references"
Task: "Add test validating milestone dependencies"
Task: "Add test validating welder assignments"
Task: "Add test validating weld distribution"
```

---

## Implementation Strategy

### TDD Approach (Test-First)

1. **Phase 1-2**: Setup types and database function
2. **Phase 3**: Generate seed data file
3. **Phase 4**: Write contract tests FIRST, watch them FAIL
4. **Phase 5**: Implement Edge Function, tests should PASS
5. **Phase 6-8**: Write integration/idempotency tests FIRST, watch them FAIL
6. **Phase 9**: Integrate with demo-signup, tests should PASS
7. **Phase 10**: Write E2E tests, verify full flow

### Incremental Validation

**After Phase 3**: Seed data structure validated by contract tests
**After Phase 5**: Edge Function working, bulk population verified
**After Phase 7**: SQL function working, skeleton verified
**After Phase 9**: End-to-end flow operational
**After Phase 12**: Production deployment complete

---

## Verification Checklist (from quickstart.md)

After running full implementation, verify:

- [ ] Skeleton created in <2 seconds
- [ ] 5 areas created (Pipe Rack, ISBL, Containment Area, Water Process, Cooling Tower)
- [ ] 5 systems created (Air, Nitrogen, Steam, Process, Condensate)
- [ ] 10 test packages created (TP-01 through TP-10)
- [ ] 4 welders created (JD-123, SM-456, TR-789, KL-012)
- [ ] 20 drawings created
- [ ] 200 components created (40 spools, 80 supports, 50 valves, 20 flanges, 10 instruments)
- [ ] ~120 field welds created (3 per spool)
- [ ] ~78 welder assignments (65% of welds)
- [ ] All milestone states realistic (95% received, 70% installed, 30% punch, 0% test/restore)
- [ ] All foreign keys valid (0 orphaned records)
- [ ] Retry creates no duplicates
- [ ] Full population completes in <45 seconds

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- Tests written FIRST (TDD approach per Constitution Principle III)
- Seed data file ~2,500-3,000 lines (200 components + 120 welds + milestones + assignments)
- Natural key strategy enables declarative seed data (no hardcoded UUIDs)
- Idempotency critical for retry safety (ON CONFLICT DO NOTHING)
- Performance targets: <2s skeleton, <45s full population
- All existing tables (no schema changes except SQL function)
