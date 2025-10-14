# Tasks: Complete User Data Storage During Signup

**Feature**: 003-plan-complete-user
**Input**: Design documents from `/home/clachance14/projects/PipeTrak_V2/specs/003-plan-complete-user/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

## Execution Flow
```
1. Load plan.md from feature directory ✓
   → Tech stack: TypeScript 5.7, React 18.3, Supabase, TanStack Query, Vitest
   → Structure: Single SPA (src/, tests/, supabase/migrations/)
2. Load design documents ✓
   → data-model.md: Schema changes (terms_accepted_at, terms_version columns)
   → contracts/: 2 contract test files (registration, profile-retrieval)
   → research.md: Trigger function pattern, backfill strategy
   → quickstart.md: 5 manual test scenarios
3. Generate tasks by category ✓
   → Setup: Migration file creation
   → Tests: Contract tests (TDD)
   → Core: Trigger function, RLS policies
   → Integration: Registration code updates, type regeneration
   → Polish: Integration tests, manual verification
4. Task rules applied ✓
   → Contract tests marked [P] (different files)
   → Migration steps sequential (same file)
   → Tests before implementation (TDD)
5. Tasks numbered T001-T013 ✓
6. Dependencies documented ✓
7. Parallel execution examples included ✓
8. Validation complete ✓
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- File paths are absolute from repository root

## Phase 3.1: Setup & Migration Creation

- [X] **T001**: Create migration file `supabase/migrations/00004_auto_create_user_profile.sql` with header comments documenting feature number, purpose, and requirements addressed (FR-001 through FR-010)

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

Contract tests already exist at:
- `specs/003-plan-complete-user/contracts/registration.test.ts`
- `specs/003-plan-complete-user/contracts/profile-retrieval.test.ts`

- [X] **T002 [P]**: Run contract test for registration flow in `specs/003-plan-complete-user/contracts/registration.test.ts` and verify it FAILS (expected: terms_accepted_at and terms_version fields do not exist yet)

- [X] **T003 [P]**: Run contract test for profile retrieval in `specs/003-plan-complete-user/contracts/profile-retrieval.test.ts` and verify it FAILS (expected: columns not found)

## Phase 3.3: Database Schema Implementation (ONLY after tests are failing)

- [X] **T004**: Add schema changes to `supabase/migrations/00004_auto_create_user_profile.sql`:
  - ALTER TABLE public.users ADD COLUMN terms_accepted_at TIMESTAMPTZ NULL
  - ALTER TABLE public.users ADD COLUMN terms_version TEXT NULL DEFAULT 'v1.0'
  - CREATE INDEX users_terms_version_idx ON public.users(terms_version) WHERE terms_version IS NOT NULL
  - CREATE INDEX users_terms_accepted_at_idx ON public.users(terms_accepted_at) WHERE terms_accepted_at IS NOT NULL
  - Add COMMENT ON COLUMN for documentation

- [X] **T005**: Create trigger function `public.handle_new_user()` in `supabase/migrations/00004_auto_create_user_profile.sql`:
  - SECURITY DEFINER with SET search_path = public
  - Extract metadata: raw_user_meta_data->>'full_name', raw_user_meta_data->>'terms_accepted_at', raw_user_meta_data->>'terms_version'
  - INSERT INTO public.users with all fields (id, email, full_name, terms_accepted_at, terms_version, created_at, updated_at)
  - RETURN NEW

- [X] **T006**: Attach trigger to auth.users in `supabase/migrations/00004_auto_create_user_profile.sql`:
  - DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users
  - CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user()

- [X] **T007**: Add backfill SQL to `supabase/migrations/00004_auto_create_user_profile.sql`:
  - INSERT INTO public.users ... SELECT FROM auth.users LEFT JOIN public.users WHERE public.users.id IS NULL
  - Use ON CONFLICT (id) DO NOTHING for idempotency
  - Handle legacy users with NULL full_name and terms_accepted_at

## Phase 3.4: Frontend Integration

- [X] **T008**: Update registration code in `src/lib/auth.ts` to pass terms acceptance metadata:
  - Add terms_accepted_at: new Date().toISOString() to supabase.auth.signUp() options.data
  - Add terms_version: 'v1.0' to options.data
  - Ensure full_name is passed via options.data

- [X] **T009**: Apply migration locally:
  - Run `supabase db reset` or `supabase migration up`
  - Verify migration applies without errors
  - Check migration status with `supabase migration list`

- [X] **T010**: Regenerate TypeScript types from updated schema:
  - Run `npx supabase gen types typescript --linked > src/types/database.types.ts`
  - Verify terms_accepted_at and terms_version appear in Users type definition
  - Run `tsc -b` to ensure no type errors

## Phase 3.5: Verification & Testing

- [X] **T011 [P]**: Re-run contract test for registration flow in `specs/003-plan-complete-user/contracts/registration.test.ts` and verify it PASSES (all assertions about terms fields should succeed)

- [X] **T012 [P]**: Re-run contract test for profile retrieval in `specs/003-plan-complete-user/contracts/profile-retrieval.test.ts` and verify it PASSES (legacy user handling and terms queries work)

- [X] **T013**: Execute manual test scenarios from `specs/003-plan-complete-user/quickstart.md`:
  - Scenario 1: New user registration (verify full profile with terms)
  - Scenario 2: Existing user profile visibility (verify backfill)
  - Scenario 3: Terms acceptance audit (verify queryability)
  - Scenario 4: Data consistency verification (verify referential integrity)
  - Document results and any edge cases discovered

## Phase 3.6: Bug Fix - RLS Infinite Recursion

- [X] **T014**: Created migration `00005_fix_user_organizations_recursion.sql` to fix infinite recursion error:
  - Created `user_is_org_member()` SECURITY DEFINER function to check membership without triggering RLS
  - Replaced recursive "Users can view org members" policy with non-recursive version
  - Updated "Users can view their organizations" policy for consistency
  - Migration ready for deployment

## Phase 3.7: Bug Fix - Missing Organizations INSERT Policy

- [X] **T015**: Created migration `00007_fix_organizations_insert_policy.sql` to fix organization creation during registration:
  - Issue: RLS was blocking organization INSERT because INSERT policy was missing
  - Dropped any conflicting INSERT policies
  - Created "Authenticated users can create organizations" policy with WITH CHECK (true)
  - Policy allows any authenticated user to create organizations during registration
  - Super admins automatically included (they're authenticated too)

## Dependencies

**Critical Path**:
1. T001 (migration file creation)
2. T002-T003 (verify tests fail) [can run in parallel]
3. T004-T007 (implement migration) [sequential - same file]
4. T008 (update registration code)
5. T009 (apply migration)
6. T010 (regenerate types)
7. T011-T012 (verify tests pass) [can run in parallel]
8. T013 (manual verification)

**Blocking Relationships**:
- T002-T003 block T004 (must verify failures before implementation)
- T004-T007 are sequential (all edit same migration file)
- T007 blocks T009 (migration must be complete before applying)
- T009 blocks T010 (types generated from applied schema)
- T010 blocks T011-T012 (types must exist for contract tests to compile)
- T011-T012 block T013 (automated tests before manual verification)

## Parallel Execution Examples

### Phase 3.2: Run both contract tests in parallel
```bash
# Verify both tests fail (expected before implementation)
npm test specs/003-plan-complete-user/contracts/registration.test.ts &
npm test specs/003-plan-complete-user/contracts/profile-retrieval.test.ts &
wait
```

### Phase 3.5: Run both contract tests in parallel
```bash
# Verify both tests pass (expected after implementation)
npm test specs/003-plan-complete-user/contracts/registration.test.ts &
npm test specs/003-plan-complete-user/contracts/profile-retrieval.test.ts &
wait
```

## Notes

- **No new UI components**: This is a backend-focused feature (database trigger + schema changes)
- **Zero downtime**: Migration uses ADD COLUMN IF NOT EXISTS and ON CONFLICT DO NOTHING for safe deployment
- **Idempotent**: All SQL is safe to re-run (backfill uses LEFT JOIN WHERE IS NULL pattern)
- **Legacy handling**: NULL values for terms_accepted_at distinguish pre-feature users
- **TDD enforced**: Contract tests written and verified failing before any implementation
- **Atomic**: Trigger runs in same transaction as auth.users INSERT (all-or-nothing)

## Task Generation Rules Applied

1. **From Contracts**:
   - ✓ registration.test.ts → T002 (contract test task)
   - ✓ profile-retrieval.test.ts → T003 (contract test task)
   - ✓ Both marked [P] (different test files)

2. **From Data Model**:
   - ✓ Schema changes → T004 (ALTER TABLE + indexes)
   - ✓ Trigger function → T005 (CREATE FUNCTION)
   - ✓ Trigger attachment → T006 (CREATE TRIGGER)
   - ✓ Backfill → T007 (INSERT ... SELECT)
   - ✓ All sequential (same migration file)

3. **From Quickstart**:
   - ✓ 5 manual scenarios → T013 (validation task)
   - ✓ Scenario-based verification steps documented

4. **Ordering**:
   - ✓ Setup (T001) → Tests (T002-T003) → Implementation (T004-T007) → Integration (T008-T010) → Verification (T011-T013)
   - ✓ TDD enforced (tests fail before implementation, pass after)

## Validation Checklist

- [x] All contracts have corresponding tests (T002, T003)
- [x] All entities have implementation tasks (public.users schema → T004-T007)
- [x] All tests come before implementation (T002-T003 before T004)
- [x] Parallel tasks truly independent (T002-T003 different files, T011-T012 different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task (T004-T007 sequential)
- [x] Quickstart scenarios mapped to validation task (T013)

---

**Tasks Ready**: 13 tasks generated, dependencies validated, ready for /implement execution
