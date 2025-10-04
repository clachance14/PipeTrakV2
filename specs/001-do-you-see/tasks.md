# Tasks: Sprint 0 Infrastructure Completion

**Input**: Design documents from `/home/clachance14/projects/PipeTrak_V2/specs/001-do-you-see/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/README.md, quickstart.md

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → ✅ Loaded: Sprint 0 Infrastructure Completion plan
   → Extracted: Vite + Vitest + Supabase + GitHub Actions stack
2. Load optional design documents:
   → data-model.md: 4 entities (organizations, users, user_organizations, projects)
   → contracts/: Supabase PostgREST patterns (no custom endpoints)
   → research.md: 4 implementation patterns (CI/CD, Supabase CLI, coverage, mocking)
   → quickstart.md: 11-step verification workflow
3. Generate tasks by category:
   → Setup: Supabase CLI, environment config, directory init
   → Tests: AuthContext (3 tests), ProtectedRoute (2 tests) - TDD RED phase
   → CI/CD: GitHub Actions workflow with 4 steps
   → Database: Migration file with 4 tables + RLS policies
   → Type Generation: Database types from Supabase schema
   → Test Implementation: Mocking + test pass (GREEN phase)
   → Documentation: CLAUDE.md updates
   → Verification: Quickstart execution
4. Apply task rules:
   → TDD order: Tests (Phase 2) before implementation (Phase 5)
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Dependencies: Environment → Schema → Types → Tests Pass
5. Number tasks sequentially (T001-T035)
6. Generate dependency graph (below)
7. Return: SUCCESS (35 tasks ready for execution)
```

## Path Conventions
- **Frontend-only React SPA**: `src/`, `tests/`, `.github/`, `supabase/` at repository root
- All paths shown are absolute from `/home/clachance14/projects/PipeTrak_V2/`

---

## Phase 3.1: Environment Setup

- [x] **T001** Install Supabase CLI globally
  - **Description**: Install Supabase CLI for local development and type generation
  - **Command**: `npm install -g supabase`
  - **Acceptance**: `supabase --version` returns v1.x.x

- [x] **T002** Configure environment variables
  - **Description**: Create `.env` file from `.env.example` with staging Supabase credentials
  - **Files**: `.env` (create from `.env.example`)
  - **Acceptance**: `.env` contains `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` with valid values

- [x] **T003** Initialize Supabase directory
  - **Description**: Run `supabase init` to create local development structure
  - **Command**: `supabase init`
  - **Acceptance**: `supabase/config.toml` file created

- [x] **T004** Link to Supabase staging project
  - **Description**: Connect local CLI to staging project for migrations and type generation
  - **Command**: `supabase link --project-ref <staging-ref>`
  - **Acceptance**: CLI successfully linked, can run `supabase db diff`

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.4
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

- [x] **T005** [P] Configure test mocks in setup file
  - **Description**: Create `tests/setup.ts` with mock Supabase client and vi.mock factory
  - **Files**: `tests/setup.ts` (create new)
  - **Pattern**: Export `mockSupabaseClient` with auth.getSession, auth.onAuthStateChange, auth.signOut mocks
  - **Acceptance**: `vi.mock('@/lib/supabase')` hoisted before imports, factory returns mockSupabaseClient

- [x] **T006** [P] Configure coverage thresholds in Vitest config
  - **Description**: Update `vitest.config.ts` with per-directory coverage thresholds (≥70% overall, ≥80% src/lib/, ≥60% src/components/)
  - **Files**: `vitest.config.ts` (edit existing)
  - **Pattern**: Add `test.coverage.thresholds` with directory-specific overrides, v8 provider
  - **Acceptance**: `npm test -- --coverage` fails with "Coverage threshold not met" (no tests exist yet)

- [x] **T007** [P] Write failing test: AuthContext provides session when authenticated
  - **Description**: Create `src/contexts/AuthContext.test.tsx` with test for authenticated session state
  - **Files**: `src/contexts/AuthContext.test.tsx` (create new)
  - **Pattern**: Mock `getSession` to return session, render `AuthProvider`, assert `useAuth().user` is defined
  - **Acceptance**: Test runs and FAILS (AuthContext not yet mocked correctly)

- [x] **T008** Write failing test: AuthContext provides null when unauthenticated
  - **Description**: Add test to `AuthContext.test.tsx` for unauthenticated state (null session)
  - **Files**: `src/contexts/AuthContext.test.tsx` (edit)
  - **Pattern**: Mock `getSession` to return null, assert `useAuth().user` is null
  - **Acceptance**: Test runs and FAILS (depends on T007 setup)

- [x] **T009** Write failing test: AuthContext calls signOut on logout
  - **Description**: Add test to `AuthContext.test.tsx` verifying signOut method invocation
  - **Files**: `src/contexts/AuthContext.test.tsx` (edit)
  - **Pattern**: Call `useAuth().signOut()`, assert `mockSupabaseClient.auth.signOut` was called
  - **Acceptance**: Test runs and FAILS (signOut mock not configured yet)

- [x] **T010** [P] Write failing test: ProtectedRoute redirects when unauthenticated
  - **Description**: Create `src/components/ProtectedRoute.test.tsx` with redirect test for unauthenticated users
  - **Files**: `src/components/ProtectedRoute.test.tsx` (create new)
  - **Pattern**: Mock `useAuth()` to return null user, render `ProtectedRoute`, assert redirect to `/`
  - **Acceptance**: Test runs and FAILS (ProtectedRoute not rendering correctly)

- [x] **T011** Write failing test: ProtectedRoute renders children when authenticated
  - **Description**: Add test to `ProtectedRoute.test.tsx` for authenticated user rendering children
  - **Files**: `src/components/ProtectedRoute.test.tsx` (edit)
  - **Pattern**: Mock `useAuth()` to return user object, render `ProtectedRoute` with test child, assert child renders
  - **Acceptance**: Test runs and FAILS (depends on T010 setup)

- [x] **T012** Verify all tests fail
  - **Description**: Run `npm test` and confirm all 5 tests are failing (RED phase complete)
  - **Command**: `npm test`
  - **Acceptance**: 5 tests fail with clear error messages, 0 tests pass

---

## Phase 3.3: CI/CD Pipeline

- [x] **T013** [P] Create GitHub Actions workflow file
  - **Description**: Create `.github/workflows/ci.yml` with 4-step pipeline (lint, type-check, test, build)
  - **Files**: `.github/workflows/ci.yml` (create new)
  - **Pattern**: Single `ci` job with checkout, setup-node (cache: npm), npm ci, 4 run steps
  - **Acceptance**: Workflow file valid YAML, triggers on push and pull_request

- [x] **T014** [P] Add npm caching to workflow
  - **Description**: Configure `actions/setup-node@v4` with `cache: 'npm'` for faster installs
  - **Files**: `.github/workflows/ci.yml` (edit)
  - **Pattern**: Add `cache: 'npm'` to setup-node step
  - **Acceptance**: Workflow includes cache configuration (validates in T020)

- [x] **T015** [P] Configure coverage reporting in workflow
  - **Description**: Update test step to run with `--coverage` flag for coverage enforcement
  - **Files**: `.github/workflows/ci.yml` (edit)
  - **Pattern**: Change `npm test` to `npm test -- --coverage`
  - **Acceptance**: Test step includes coverage flag (validates in T020)

---

## Phase 3.4: Database Schema

- [x] **T016** [P] Create migration file with organizations table
  - **Description**: Create `supabase/migrations/00001_initial_schema.sql` with organizations table, RLS enabled, SELECT policy
  - **Files**: `supabase/migrations/00001_initial_schema.sql` (create new)
  - **Schema**: `CREATE TABLE organizations (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`
  - **RLS**: `ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;` + SELECT policy (user can read own org via user_organizations join)
  - **Acceptance**: Migration file contains organizations table definition with RLS

- [x] **T017** Add users table to migration
  - **Description**: Add users table to migration file (extends auth.users with profile data)
  - **Files**: `supabase/migrations/00001_initial_schema.sql` (edit)
  - **Schema**: `CREATE TABLE users (id UUID PRIMARY KEY REFERENCES auth.users(id), email TEXT NOT NULL UNIQUE, full_name TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`
  - **RLS**: ENABLE + SELECT policy (user can read own record via `id = auth.uid()`)
  - **Acceptance**: Migration file contains users table with foreign key to auth.users

- [x] **T018** Add user_organizations junction table to migration
  - **Description**: Add user_organizations table to migration file (many-to-many with role)
  - **Files**: `supabase/migrations/00001_initial_schema.sql` (edit)
  - **Schema**: `CREATE TABLE user_organizations (user_id UUID REFERENCES users(id) ON DELETE CASCADE, organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE, role TEXT NOT NULL DEFAULT 'member', created_at TIMESTAMPTZ DEFAULT NOW(), PRIMARY KEY (user_id, organization_id))`
  - **RLS**: ENABLE + SELECT policy (user can read own memberships via `user_id = auth.uid()`)
  - **Acceptance**: Migration file contains junction table with composite primary key

- [x] **T019** Add projects table to migration
  - **Description**: Add projects table to migration file (org-scoped projects)
  - **Files**: `supabase/migrations/00001_initial_schema.sql` (edit)
  - **Schema**: `CREATE TABLE projects (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, name TEXT NOT NULL, description TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`
  - **RLS**: ENABLE + SELECT policy (user can read projects from own orgs)
  - **Acceptance**: Migration file contains projects table with org foreign key

- [x] **T020** Add indexes to migration
  - **Description**: Add performance indexes for foreign keys
  - **Files**: `supabase/migrations/00001_initial_schema.sql` (edit)
  - **Indexes**: `idx_projects_org_id` on projects(organization_id), `idx_user_organizations_user_id` on user_organizations(user_id), `idx_user_organizations_org_id` on user_organizations(organization_id)
  - **Acceptance**: Migration file contains 3 CREATE INDEX statements

- [x] **T021** Apply migration locally
  - **Description**: Run `supabase db reset` to apply migration to local database
  - **Command**: `supabase db reset`
  - **Acceptance**: Migration applies successfully, `supabase db diff` shows no changes, all 4 tables exist

---

## Phase 3.5: Type Generation (depends on Phase 3.4)

- [x] **T022** Generate TypeScript types from schema
  - **Description**: Run Supabase type generation command to create `src/types/database.types.ts`
  - **Command**: `npx supabase gen types typescript --linked > src/types/database.types.ts`
  - **Acceptance**: File created with `Database` interface containing organizations, users, user_organizations, projects types

- [x] **T023** Verify types compile
  - **Description**: Run TypeScript compiler to verify generated types are valid
  - **Command**: `tsc -b`
  - **Acceptance**: No TypeScript errors, exit code 0

- [x] **T024** Commit generated types to version control
  - **Description**: Stage and commit `src/types/database.types.ts`
  - **Command**: `git add src/types/database.types.ts`
  - **Acceptance**: File tracked in git, ready for commit in final task

---

## Phase 3.6: Tests Pass (GREEN) - TDD (depends on Phase 3.2)

- [x] **T025** Implement AuthContext test mocks
  - **Description**: Update `tests/setup.ts` to configure mock return values for AuthContext tests
  - **Files**: `tests/setup.ts` (edit)
  - **Pattern**: Configure `mockSupabaseClient.auth.getSession` to return configurable session data, `onAuthStateChange` to return subscription mock
  - **Acceptance**: Mocks configured but tests still fail (need to implement correct mock usage in tests)

- [x] **T026** Fix AuthContext tests to pass
  - **Description**: Update `src/contexts/AuthContext.test.tsx` to correctly use mocks and make tests pass
  - **Files**: `src/contexts/AuthContext.test.tsx` (edit)
  - **Pattern**: Use `mockSupabaseClient.auth.getSession.mockResolvedValue(...)` per test, use `renderHook` with `AuthProvider` wrapper
  - **Acceptance**: All 3 AuthContext tests pass (authenticated, unauthenticated, signOut)

- [x] **T027** Implement ProtectedRoute test mocks
  - **Description**: Add mock for `useAuth()` hook in ProtectedRoute tests
  - **Files**: `src/components/ProtectedRoute.test.tsx` (edit)
  - **Pattern**: Mock `@/contexts/AuthContext` to return controllable `useAuth` hook values
  - **Acceptance**: Mocks configured, tests still fail (need to implement correct assertions)

- [x] **T028** Fix ProtectedRoute tests to pass
  - **Description**: Update `src/components/ProtectedRoute.test.tsx` to correctly assert redirect and rendering
  - **Files**: `src/components/ProtectedRoute.test.tsx` (edit)
  - **Pattern**: Use Testing Library `screen` queries, assert redirect with React Router test utilities
  - **Acceptance**: Both ProtectedRoute tests pass (redirect when unauthenticated, render when authenticated)

- [x] **T029** Verify all tests pass
  - **Description**: Run `npm test` and confirm all 5 tests pass (GREEN phase complete)
  - **Command**: `npm test`
  - **Acceptance**: 5 tests pass, 0 tests fail

- [x] **T030** Verify coverage meets thresholds
  - **Description**: Run `npm test -- --coverage` and verify ≥70% overall, ≥80% src/contexts/, ≥60% src/components/
  - **Command**: `npm test -- --coverage`
  - **Acceptance**: Coverage report shows thresholds met, no coverage failures

---

## Phase 3.7: Documentation

- [x] **T031** [P] Update CLAUDE.md with Supabase setup instructions
  - **Description**: Add "Supabase Setup" section to CLAUDE.md with CLI installation, init, link, migration workflow
  - **Files**: `CLAUDE.md` (edit)
  - **Content**: Add steps from quickstart.md (Supabase CLI install, init, link, db reset, type generation)
  - **Acceptance**: CLAUDE.md includes Supabase setup section with 5 steps

- [x] **T032** [P] Update CLAUDE.md with coverage requirements
  - **Description**: Add coverage thresholds to "Testing" section in CLAUDE.md
  - **Files**: `CLAUDE.md` (edit)
  - **Content**: Document ≥70% overall, ≥80% src/lib/, ≥60% src/components/, hotfix bypass policy with `SKIP_COVERAGE=true`
  - **Acceptance**: CLAUDE.md "Testing" section includes coverage requirements

- [x] **T033** [P] Update CLAUDE.md with CI/CD pipeline overview
  - **Description**: Add "CI/CD Pipeline" section to CLAUDE.md with 4-step workflow description
  - **Files**: `CLAUDE.md` (edit)
  - **Content**: Document lint → type-check → test (coverage) → build pipeline, <5 min requirement, fail fast policy
  - **Acceptance**: CLAUDE.md includes CI/CD section with NFR-001 and NFR-004 references

---

## Phase 3.8: Verification (depends on all phases)

- [ ] **T034** Run quickstart verification workflow
  - **Description**: Execute all 11 steps from `quickstart.md` to verify Sprint 0 completion
  - **Files**: `specs/001-do-you-see/quickstart.md` (reference)
  - **Steps**: npm install → .env config → Supabase CLI → supabase init/link → db reset → type gen → tsc → npm test → npm build → git push → Vercel check
  - **Acceptance**: All 11 steps pass, no errors

- [ ] **T035** Verify all 7 success criteria met
  - **Description**: Check all Sprint 0 success criteria from plan.md
  - **Criteria**:
    1. ✅ CI Pipeline Green (GitHub Actions all checks pass)
    2. ✅ Test Coverage Met (≥70% overall, ≥80% src/lib/, ≥60% src/components/)
    3. ✅ Supabase Accessible (can run migrations, types generated)
    4. ✅ Types Generated (src/types/database.types.ts exists, compiles)
    5. ✅ Auth Tests Passing (AuthContext, ProtectedRoute ≥80% coverage)
    6. ✅ Deployment Working (Vercel staging deploys successfully)
    7. ✅ Documentation Current (CLAUDE.md updated with setup, coverage, CI)
  - **Acceptance**: All 7 criteria checked and confirmed

---

## Dependencies

**Critical Path** (must be sequential):
1. T001-T004 (Environment Setup) → T016-T021 (Database Schema) → T022-T024 (Type Generation)
2. T005-T012 (Tests RED) → T025-T030 (Tests GREEN) - TDD workflow
3. T001-T004 (Environment) → T034-T035 (Verification)

**Parallel Blocks** [P]:
- T005, T006, T007, T010 can run in parallel (different files)
- T013, T014, T015 can run in parallel (same file edits, but independent changes)
- T016 can run in parallel with T013-T015 (different files)
- T031, T032, T033 can run in parallel (same file edits, non-overlapping sections)

**Blocked Tasks**:
- T022-T024 (Type Generation) blocked by T021 (Migration Applied)
- T025-T030 (Tests Pass) blocked by T012 (Tests Fail verification)
- T034-T035 (Verification) blocked by all previous phases

---

## Parallel Execution Examples

### Example 1: Launch Test Setup Tasks Together (Phase 3.2 start)
```bash
# T005, T006, T007, T010 - different files, no dependencies
Task: "Create tests/setup.ts with mock Supabase client"
Task: "Update vitest.config.ts with coverage thresholds"
Task: "Create src/contexts/AuthContext.test.tsx with authenticated session test"
Task: "Create src/components/ProtectedRoute.test.tsx with redirect test"
```

### Example 2: Launch Documentation Updates Together (Phase 3.7)
```bash
# T031, T032, T033 - same file, non-overlapping sections
Task: "Update CLAUDE.md with Supabase setup instructions"
Task: "Update CLAUDE.md with coverage requirements"
Task: "Update CLAUDE.md with CI/CD pipeline overview"
```

### Example 3: Sequential Type Generation (Phase 3.5)
```bash
# T022 → T023 → T024 must be sequential (depends on generated file)
Task: "Generate TypeScript types from Supabase schema"
# Wait for completion
Task: "Verify types compile with tsc -b"
# Wait for compilation success
Task: "Commit generated types to version control"
```

---

## Notes

- **[P] tasks** = different files OR non-overlapping changes, no dependencies
- **TDD discipline**: Phase 3.2 (RED) must complete before Phase 3.6 (GREEN)
- **Verify tests fail**: T012 is critical gate - must confirm failures before implementing
- **Commit after each task**: Use git to track incremental progress
- **Coverage enforcement**: T030 validates coverage meets constitutional requirements (Principle III)
- **Sprint 0 scope**: No custom API endpoints, no data seeding, minimal RLS (full policies in Sprint 1)

---

## Task Generation Rules Applied

1. **From Data Model**:
   - 4 entities → 4 migration sub-tasks (T016-T019) + indexes (T020)
   - Types generated from schema → type generation tasks (T022-T024)

2. **From Research**:
   - CI/CD best practices → workflow creation tasks (T013-T015)
   - Supabase CLI patterns → environment setup tasks (T001-T004)
   - Coverage thresholds → configuration task (T006)
   - Mocking patterns → test setup task (T005)

3. **From Quickstart**:
   - 11 verification steps → verification task (T034)
   - 7 success criteria → final validation task (T035)

4. **From Plan (TDD Requirement)**:
   - Phase 2 (Tests First) → T005-T012 (RED phase)
   - Phase 5 (Tests Pass) → T025-T030 (GREEN phase)
   - Constitutional gate: Tests before implementation (Principle III)

5. **Ordering**:
   - Setup (T001-T004) → Tests RED (T005-T012) → CI/CD (T013-T015) || Schema (T016-T021) → Types (T022-T024) → Tests GREEN (T025-T030) → Docs (T031-T033) → Verification (T034-T035)

---

## Validation Checklist

- [x] All design docs have corresponding tasks (plan.md, data-model.md, research.md, quickstart.md)
- [x] All 4 database entities have migration tasks (organizations, users, user_organizations, projects)
- [x] All tests come before implementation (Phase 3.2 before Phase 3.6)
- [x] Parallel tasks truly independent ([P] tasks verified)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task (except non-overlapping doc sections)
- [x] TDD workflow enforced (T012 gate: tests must fail before T025-T030)
- [x] Constitution Principle III honored (Testing Discipline - tests first)

---

**Estimated Execution Time**: 4-6 hours (including manual verification and CI pipeline runs)
**Next Command**: `/implement` or manual execution of tasks T001-T035

---

*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
