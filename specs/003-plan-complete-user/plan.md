# Implementation Plan: Complete User Data Storage During Signup

**Branch**: `003-plan-complete-user` | **Date**: 2025-10-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/clachance14/projects/PipeTrak_V2/specs/003-plan-complete-user/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 9. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Fix missing user profile data storage during registration. Currently, users exist in Supabase Auth (`auth.users`) but their profile information (email, full name) is never written to the `public.users` table, and terms of service acceptance is not tracked. This feature adds a database trigger to automatically create `public.users` records from auth signup metadata, tracks terms acceptance with timestamps and versioning, backfills existing users, and updates registration code to pass terms acceptance data through auth metadata.

## Technical Context
**Language/Version**: TypeScript 5.7 (strict mode enabled per tsconfig.app.json)
**Primary Dependencies**: React 18.3, Supabase JS SDK 2.58, TanStack Query 5.90, React Hook Form 7.64, Zod 4.1
**Storage**: Supabase (PostgreSQL 15+ with Row Level Security)
**Testing**: Vitest 3.3 + Testing Library 16.3 (jsdom environment)
**Target Platform**: Web (SPA via Vite, deployed to Vercel)
**Project Type**: Single SPA (React frontend, Supabase backend)
**Performance Goals**: Registration completion <2s, backfill operation <5s for current user base
**Constraints**: Zero downtime deployment, atomic transactions (all-or-nothing data creation), RLS policy compliance
**Scale/Scope**: ~10 existing users to backfill, 4 new database columns, 1 trigger function, 2 RLS policies, 1 migration file

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Type Safety First
- [x] TypeScript strict mode enabled (verify tsconfig.json) - ✅ Confirmed in tsconfig.app.json:8-12
- [x] No `as` type assertions without justification in Complexity Tracking - ✅ No type assertions needed for this feature
- [x] Path aliases (`@/*`) used for imports - ✅ Already configured in tsconfig.app.json:24-26
- [x] Database types will be generated from Supabase schema - ✅ Will run `npx supabase gen types` after migration

### II. Component-Driven Development
- [x] New UI components follow shadcn/ui patterns (Radix + Tailwind) - ✅ No new UI components (backend-focused feature)
- [x] Components maintain single responsibility - ✅ N/A (only modifying registration logic in src/lib/auth.ts)
- [x] Server state via TanStack Query, client state via Zustand - ✅ Existing useRegistration hook already uses TanStack Query
- [x] No prop drilling beyond 2 levels - ✅ N/A (no component hierarchy changes)

### III. Testing Discipline
- [x] TDD approach confirmed (tests before implementation) - ✅ Will write contract tests before migration
- [x] Integration tests cover spec acceptance scenarios - ✅ Will test registration flow + backfill scenarios
- [x] Test files colocated or in tests/ directory - ✅ Contract tests in tests/contract/, integration in tests/integration/
- [x] Tests will use Vitest + Testing Library - ✅ Confirmed in package.json dependencies

### IV. Supabase Integration Patterns
- [x] RLS enabled on all new tables - ✅ public.users already has RLS (00001_initial_schema.sql:45), will add INSERT policy
- [x] Multi-tenant isolation via organization_id in policies - ✅ N/A (users table is per-user, not per-org)
- [x] TanStack Query wraps all Supabase calls - ✅ Existing useRegistration hook already implements this
- [x] Auth via AuthContext (no direct supabase.auth in components) - ✅ No component changes, only lib/auth.ts helper
- [x] Realtime subscriptions cleaned up on unmount (if applicable) - ✅ N/A (no realtime subscriptions in this feature)

### V. Specify Workflow Compliance
- [x] Feature has spec.md in specs/###-feature-name/ - ✅ specs/003-plan-complete-user/spec.md exists
- [x] This plan.md follows template structure - ✅ Following .specify/templates/plan-template.md
- [x] Tasks.md will be generated by /tasks command - ✅ Deferred to /tasks phase
- [x] Implementation will follow /implement workflow - ✅ Will execute via /implement after /tasks

## Project Structure

### Documentation (this feature)
```
specs/003-plan-complete-user/
├── spec.md              # Feature specification (already created)
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
│   ├── registration.test.ts      # Registration flow contract test
│   └── profile-retrieval.test.ts # Profile data retrieval contract test
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
src/
├── components/          # React components (UI + business logic)
│   ├── ui/             # shadcn/ui components (Button, Input, etc.)
│   └── auth/           # Authentication components (RegistrationForm)
├── contexts/           # React context providers (AuthContext)
├── hooks/              # Custom React hooks (useRegistration, useAuth)
├── lib/                # Utilities and helpers
│   ├── supabase.ts    # Supabase client initialization
│   ├── auth.ts        # Authentication helpers (registerUser) - WILL MODIFY
│   └── permissions.ts # RBAC helpers
├── pages/              # Page components (Register, Login)
├── stores/             # Zustand stores (client state)
└── types/              # TypeScript type definitions
    └── database.types.ts # Auto-generated from Supabase schema - WILL REGENERATE

tests/
├── contract/           # API contract tests - WILL ADD
│   ├── registration.test.ts
│   └── profile-retrieval.test.ts
├── integration/        # Integration tests
│   └── registration-flow.test.ts - WILL ADD
└── unit/               # Unit tests (existing)

supabase/
└── migrations/
    ├── 00001_initial_schema.sql       # Sprint 0 base schema (existing)
    ├── 00002_invitations_table.sql    # Feature 002 (existing)
    ├── 00003_fix_rls_recursion.sql    # Feature 002 (existing)
    └── 00004_auto_create_user_profile.sql # THIS FEATURE - WILL CREATE
```

**Structure Decision**: Single SPA with React frontend. All source in `src/`, tests in `tests/`, database migrations in `supabase/migrations/`. No backend/ or api/ directories needed since Supabase provides backend via RLS and triggers.

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - ✅ No NEEDS CLARIFICATION markers (all technical decisions known from existing codebase)

2. **Research topics**:
   - Supabase database triggers best practices (ON INSERT to auth.users)
   - Accessing auth.users metadata in trigger functions (raw_user_meta_data JSONB column)
   - RLS policy patterns for INSERT on public.users (allow trigger to insert)
   - Backfilling strategies (INSERT ... ON CONFLICT DO NOTHING)
   - Terms of service versioning patterns (semantic versioning vs date-based)
   - PostgreSQL trigger security (SECURITY DEFINER vs SECURITY INVOKER)

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all research consolidated

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity: User Profile (public.users table)
     - Fields: id (UUID FK to auth.users), email (TEXT), full_name (TEXT), terms_accepted_at (TIMESTAMPTZ), terms_version (TEXT), created_at, updated_at
     - Validation: email format, terms_accepted_at required for new users (nullable for legacy), terms_version defaults to 'v1.0'
     - Relationships: 1:1 with auth.users, 1:N with user_organizations
   - Entity: Terms Acceptance (embedded in users table, not separate table)
     - State: NULL (legacy user) vs timestamp (accepted)

2. **Generate API contracts** from functional requirements:
   - FR-001, FR-002, FR-005, FR-008: Registration contract
     - Input: { email, password, full_name, organization_name, terms_accepted: true }
     - Output: { user: { id, email, full_name, terms_accepted_at }, organization: { id, name, role } }
   - FR-009: Profile retrieval contract
     - Input: user_id (from auth)
     - Output: { id, email, full_name, terms_accepted_at, terms_version, created_at }
   - Output to `contracts/registration.test.ts` and `contracts/profile-retrieval.test.ts`

3. **Generate contract tests** from contracts:
   - Registration test: Assert response includes full_name and terms_accepted_at
   - Profile retrieval test: Assert all fields present in public.users query
   - Tests must fail (trigger not implemented yet)

4. **Extract test scenarios** from user stories:
   - Scenario 1: New user registration → full profile created
   - Scenario 2: Existing user login → profile data visible
   - Scenario 3: Legacy user backfill → email/full_name populated from auth metadata
   - Scenario 4: Terms audit → timestamp retrievable
   - Output to `quickstart.md` as manual test steps

5. **Update CLAUDE.md incrementally**:
   - Run `.specify/scripts/bash/update-agent-context.sh claude`
   - Add section: "Database Triggers: handle_new_user() auto-creates public.users from auth.users"
   - Add section: "Migration 00004: Terms tracking (terms_accepted_at, terms_version columns)"
   - Keep under 150 lines

**Output**: data-model.md, contracts/registration.test.ts, contracts/profile-retrieval.test.ts, quickstart.md, updated CLAUDE.md

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs:
  1. Contract test tasks (from contracts/)
  2. Migration file creation (from data-model.md)
  3. Trigger function implementation (from research.md)
  4. RLS policy updates (from data-model.md)
  5. Registration code updates (from contracts)
  6. Database type regeneration
  7. Integration test tasks (from quickstart.md scenarios)

**Ordering Strategy** (TDD + dependency order):
1. Write contract tests (failing) [P]
2. Create migration file with:
   - Schema changes (columns)
   - Trigger function
   - RLS policies
   - Backfill SQL
3. Apply migration locally
4. Update registration code (src/lib/auth.ts)
5. Regenerate database types
6. Run contract tests (should pass now)
7. Write integration tests
8. Run full test suite

**Estimated Output**: 12-15 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, verify backfill)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

No constitutional violations detected. All checks passed.

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - research.md generated
- [x] Phase 1: Design complete (/plan command) - data-model.md, contracts/, quickstart.md, CLAUDE.md updated
- [x] Phase 2: Task planning complete (/plan command - approach documented above)
- [ ] Phase 3: Tasks generated (/tasks command) - Pending
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (all principles verified)
- [x] Post-Design Constitution Check: PASS (no new violations introduced)
- [x] All NEEDS CLARIFICATION resolved (none found)
- [x] Complexity deviations documented (none - all checks passed)

**Artifacts Generated**:
- ✅ specs/003-plan-complete-user/research.md (6 research topics, all decisions documented)
- ✅ specs/003-plan-complete-user/data-model.md (schema changes, trigger design, backfill strategy)
- ✅ specs/003-plan-complete-user/contracts/registration.test.ts (6 test groups, FR-001 through FR-010)
- ✅ specs/003-plan-complete-user/contracts/profile-retrieval.test.ts (5 test groups, legacy user handling)
- ✅ specs/003-plan-complete-user/quickstart.md (5 manual test scenarios with SQL verification)
- ✅ CLAUDE.md updated with feature context (via update-agent-context.sh)

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
