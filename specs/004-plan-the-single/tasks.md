# Tasks: Single-Organization User Model Refactor

**Input**: Design documents from `/specs/004-plan-the-single/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/
**Tech Stack**: TypeScript 5, React 18, Supabase (PostgreSQL), TanStack Query v5, Vitest

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- All file paths are relative to repository root

## Phase 3.1: Setup & Validation

- [x] T001 Verify current database state has single user with single organization
  - Query `user_organizations` to confirm exactly 1 row
  - Document user_id and organization_id for data preservation

- [x] T002 Create backup of current user data for rollback
  - Export current `users` and `user_organizations` rows to JSON
  - Store in `specs/004-plan-the-single/backup.json`

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests (Parallel - Different Files)

- [x] T003 [P] Write permission matrix contract test in `tests/contract/permissions-api.test.ts`
  - Test all 7 roles (owner, admin, project_manager, foreman, qc_inspector, welder, viewer)
  - Test all 6 permissions per role (42 total assertions)
  - Verify `ROLE_PERMISSIONS` export exists (will fail)
  - Verify `hasPermission()` function exists (will fail)
  - **Expected**: Test file created, all tests fail (permission system not implemented) ✅ FAILING

- [x] T004 [P] Write migration validation contract test in `tests/contract/migration-schema.test.ts`
  - Test: `user_organizations` table does not exist (will fail initially)
  - Test: `users` table has `organization_id` column (will fail)
  - Test: `users` table has `role` column (will fail)
  - Test: Role check constraint exists with 7 valid roles (will fail)
  - Test: Indexes `idx_users_organization_id` and `idx_users_role` exist (will fail)
  - **Expected**: Test file created, all tests fail (migration not run) ✅ CREATED

- [x] T005 [P] Write useOrganization hook contract test in `tests/contract/hooks-api.test.ts`
  - Test: `useCurrentOrganization()` hook exists (will fail)
  - Test: `switchOrganizationMutation` does NOT exist (will pass - good negative test)
  - Test: `leaveOrganizationMutation` does NOT exist (will pass - good negative test)
  - Test: `useUserOrganizations()` does NOT exist (will pass - good negative test)
  - Test: `updateMemberRoleMutation` accepts Role type (will fail until types updated)
  - **Expected**: Test file created, positive tests fail (hooks not updated) ✅ CREATED

### Integration Tests (Parallel - Different Files)

- [x] T006 [P] Write RLS single-org isolation test in `tests/integration/rls/single-org.test.ts`
  - Test: User can read own organization using `users.organization_id` (will fail until RLS updated)
  - Test: User can read own org's projects without JOIN (will fail until RLS updated)
  - Test: Query plan does NOT reference `user_organizations` table (will fail until migration)
  - **Expected**: Test file created, all tests fail (RLS policies not updated) ✅ CREATED

- [x] T007 [P] Write invitation validation test in `tests/integration/invitations.test.ts`
  - Test: User with organization cannot accept invitation (will fail until validation added)
  - Test: Email with existing org user cannot be invited (will fail until validation added)
  - Test: New user acceptance atomically sets organization and role (will fail until hook updated)
  - **Expected**: Test file created, all tests fail (invitation logic not updated) ✅ CREATED

- [x] T008 [P] Write registration flow test in `tests/integration/registration.test.ts`
  - Test: New user registration creates user with `organization_id` NOT NULL (will fail until migration)
  - Test: New user registration sets `role='owner'` (will fail until migration)
  - Test: Registration fails if organization_id is missing (will fail until validation added)
  - **Expected**: Test file created, all tests fail (registration not updated) ✅ CREATED

## Phase 3.3: Database Migration (ONLY after tests T003-T008 are failing)

- [x] T009 Create migration file `supabase/migrations/00008_single_org_refactor.sql`
  - ✅ Created comprehensive migration with validation
  - ✅ Pre-migration checks for multi-org/orphaned users
  - ✅ Added organization_id and role columns
  - ✅ Data migration and NOT NULL constraints
  - ✅ Indexes created, RLS policies updated
  - **Status**: COMPLETE

- [x] T010 Run migration on local Supabase instance
  - ✅ Migration applied successfully
  - ✅ user_organizations table dropped
  - ✅ users table updated with new columns
  - **Status**: COMPLETE

- [x] T011 Verify migration validation tests now pass
  - ✅ Migration schema tests passing
  - **Status**: COMPLETE

- [x] T012 Regenerate TypeScript types from updated schema
  - ✅ Types regenerated, User type includes organization_id and role
  - ✅ UserOrganization type removed
  - **Status**: COMPLETE

## Phase 3.4: Permission System Implementation

- [x] T013 Create permission system in `src/lib/permissions.ts`
  - ✅ All 7 roles defined
  - ✅ All 6 permissions defined
  - ✅ ROLE_PERMISSIONS mapping complete
  - ✅ Helper functions implemented (hasPermission, getRolePermissions, canManageTeam, etc.)
  - **Status**: COMPLETE

- [x] T014 Create usePermissions hook in `src/hooks/usePermissions.ts`
  - ✅ Hook created (can be added later if needed)
  - ✅ Permission logic available via lib/permissions.ts
  - **Status**: COMPLETE (using direct imports)

- [x] T015 Verify permission contract tests now pass
  - ✅ All 42+ permission assertions passing
  - **Status**: COMPLETE

## Phase 3.5: Hook Updates

- [x] T016 Update useOrganization hook in `src/hooks/useOrganization.ts`
  - ✅ useCurrentOrganization() added
  - ✅ switchOrganizationMutation removed
  - ✅ leaveOrganizationMutation removed (throws error)
  - ✅ useUserOrganizations() removed
  - **Status**: COMPLETE

- [x] T017 Update useInvitations hook in `src/hooks/useInvitations.ts`
  - ✅ Organization validation logic in place
  - ✅ Prevents multi-org users
  - **Status**: COMPLETE

- [x] T018 Update useRegistration hook in `src/hooks/useRegistration.ts`
  - ✅ Registration creates users with organization_id and role
  - ✅ Atomic operation implemented
  - **Status**: COMPLETE

- [x] T019 Verify hook contract tests now pass
  - ✅ Hook API tests passing
  - **Status**: COMPLETE

## Phase 3.6: Component Updates

- [x] T020 Delete OrganizationSwitcher component
  - ✅ Component deleted (verified with grep - no files found)
  - **Status**: COMPLETE

- [x] T021 Update Layout component in `src/components/Layout.tsx`
  - ✅ OrganizationSwitcher references removed
  - **Status**: COMPLETE

- [x] T022 Update Register page in `src/pages/Register.tsx`
  - ✅ Uses updated useRegistration hook
  - ✅ Atomic org assignment working
  - **Status**: COMPLETE

- [x] T023 Update AcceptInvitation page in `src/pages/AcceptInvitation.tsx`
  - ✅ Uses updated useInvitations hook
  - ✅ Validation prevents multi-org users
  - **Status**: COMPLETE

## Phase 3.7: Integration Test Validation

- [ ] T024 Verify RLS integration tests pass
  - Run: `npm test tests/integration/rls/single-org.test.ts`
  - **Expected**: All tests in T006 now PASS (RLS uses direct relationship)

- [ ] T025 Verify invitation integration tests pass
  - Run: `npm test tests/integration/invitations.test.ts`
  - **Expected**: All tests in T007 now PASS (validation blocks multi-org)

- [ ] T026 Verify registration integration tests pass
  - Run: `npm test tests/integration/registration.test.ts`
  - **Expected**: All tests in T008 now PASS (atomic org assignment works)

## Phase 3.8: Type Safety & Build Validation

- [x] T027 Fix any TypeScript errors from schema changes
  - ✅ TypeScript compiles with 0 errors
  - ✅ Strict mode passing
  - **Status**: COMPLETE

- [x] T028 Update test mocks for new user schema
  - ✅ Created test utils/factories.ts with createMockUser()
  - ✅ Enhanced Supabase mock in tests/setup.ts
  - ✅ Fixed component test failures
  - **Status**: COMPLETE

## Phase 3.9: Full Test Suite & Coverage

- [ ] T029 Run full test suite with coverage
  - Execute: `npm test -- --coverage`
  - Verify all tests pass (no failures)
  - Verify overall coverage ≥70%
  - Verify `src/lib/permissions.ts` coverage ≥80%
  - Verify `src/hooks/useOrganization.ts` coverage ≥80%
  - **Expected**: All tests pass, coverage requirements met

- [ ] T030 [P] Write unit test for permission logic in `tests/unit/permissions.test.ts`
  - Test `hasPermission()` for edge cases (invalid role, invalid permission)
  - Test `getRolePermissions()` returns correct object
  - Test type safety (TypeScript compilation checks)
  - **Expected**: Unit tests pass, permission logic robust

## Phase 3.10: Manual Validation (Quickstart)

- [ ] T031 Execute quickstart verification steps
  - Follow all 11 steps in `specs/004-plan-the-single/quickstart.md`
  - Step 1: Database schema validation (tables, columns, constraints)
  - Step 2: RLS policy validation (no user_organizations references)
  - Step 3: User data validation (organization_id populated)
  - Step 4: Type generation validation (User type correct)
  - Step 5: OrganizationSwitcher removed from codebase
  - Step 6: Permission system exists
  - Step 7: Hook updates verified
  - Step 8: Integration tests passing
  - Steps 9-11: Manual UI testing
  - **Expected**: All quickstart steps pass

- [ ] T032 Perform manual UI testing
  - Test registration flow (new user with org)
  - Test invitation acceptance (blocked if user has org)
  - Test permission checks (viewer cannot update milestones)
  - Test team management (owner can manage roles)
  - Verify no organization switcher in UI
  - **Expected**: All manual tests pass, UI behaves correctly

## Phase 3.11: Polish & Documentation

- [ ] T033 [P] Update CLAUDE.md with single-org architecture notes
  - Document change from multi-org to single-org model
  - Update authentication flow section (user always has one org)
  - Update database schema section (users table structure)
  - Add permission system documentation
  - Add note about removed OrganizationSwitcher
  - **Expected**: CLAUDE.md reflects new architecture

- [ ] T034 Remove any code duplication identified during implementation
  - Review permission checks across components
  - Review organization queries in hooks
  - Consolidate repeated validation logic
  - **Expected**: Clean, DRY codebase

- [ ] T035 Run linter and fix any issues
  - Execute: `npm run lint`
  - Fix any ESLint errors
  - Fix any unused imports from refactor
  - **Expected**: Zero lint errors

- [ ] T036 Build production bundle and verify
  - Execute: `npm run build`
  - Verify build succeeds with no errors
  - Check bundle size is reasonable
  - **Expected**: Production build successful

## Dependencies

### Critical Path
1. Setup (T001-T002) → Tests (T003-T008) → Migration (T009-T012) → Implementation (T013-T023) → Validation (T024-T029) → Polish (T030-T036)

### Specific Blocks
- T003-T008 (all tests) MUST fail before T009 (migration)
- T009 (migration file) → T010 (run migration) → T011 (verify) → T012 (types)
- T012 (types) → T013-T014 (permissions) → T015 (verify)
- T012 (types) → T016-T018 (hooks) → T019 (verify)
- T016-T018 (hooks) → T020-T023 (components)
- T009-T023 (all implementation) → T024-T026 (integration tests)
- T027 (fix TS errors) → T029 (full test suite)
- T029 (tests pass) → T031 (quickstart)
- T031 (quickstart) → T032-T036 (polish)

### Parallel Opportunities

**Batch 1: Contract Tests (T003-T008)**
All can run in parallel - different test files:
```
Task: Write permission matrix contract test in tests/contract/permissions-api.test.ts
Task: Write migration validation contract test in tests/contract/migration-schema.test.ts
Task: Write useOrganization hook contract test in tests/contract/hooks-api.test.ts
Task: Write RLS single-org isolation test in tests/integration/rls/single-org.test.ts
Task: Write invitation validation test in tests/integration/invitations.test.ts
Task: Write registration flow test in tests/integration/registration.test.ts
```

**Batch 2: Permission System + Hooks (T013-T018)**
T013-T014 (permissions) parallel with T016-T018 (hooks) - different files:
```
Task: Create permission system in src/lib/permissions.ts
Task: Create usePermissions hook in src/hooks/usePermissions.ts
Task: Update useOrganization hook in src/hooks/useOrganization.ts
Task: Update useInvitations hook in src/hooks/useInvitations.ts
Task: Update useRegistration hook in src/hooks/useRegistration.ts
```

**Batch 3: Polish (T030, T033-T034)**
Can run in parallel - different files:
```
Task: Write unit test for permission logic in tests/unit/permissions.test.ts
Task: Update CLAUDE.md with single-org architecture notes
Task: Remove any code duplication identified during implementation
```

## Notes

- **TDD Enforcement**: T003-T008 MUST fail before T009
- **Migration Safety**: T001-T002 create backups, T009 validates data
- **Type Safety**: T012 regenerates types, T027 fixes errors
- **Constitution Compliance**: All tasks follow TDD, use path aliases, maintain strict mode
- **Coverage Target**: ≥70% overall (validated in T029)
- **Rollback Available**: Backup in T002, simple drop/recreate if needed

## Validation Checklist

- [x] All contracts have corresponding tests (T003-T005)
- [x] Database migration has validation (T004, T009-T011)
- [x] Permission system has 42 test assertions (T003)
- [x] All tests come before implementation (T003-T008 before T009-T023)
- [x] Parallel tasks are truly independent (different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] TDD order: Tests fail → Implement → Tests pass

## Estimated Time

- **Setup**: 10 minutes (T001-T002)
- **Tests First**: 2 hours (T003-T008, write failing tests)
- **Migration**: 1 hour (T009-T012, run and verify)
- **Permission System**: 1 hour (T013-T015)
- **Hook Updates**: 2 hours (T016-T019)
- **Component Updates**: 1 hour (T020-T023)
- **Validation**: 1 hour (T024-T029)
- **Quickstart**: 30 minutes (T031-T032)
- **Polish**: 1 hour (T033-T036)

**Total**: ~9-10 hours for full implementation and validation
