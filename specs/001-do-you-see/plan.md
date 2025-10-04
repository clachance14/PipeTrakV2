# Implementation Plan: Sprint 0 Infrastructure Completion

**Branch**: `001-do-you-see` | **Date**: 2025-10-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/clachance14/projects/PipeTrak_V2/specs/001-do-you-see/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → ✅ Loaded spec.md with 5 clarifications resolved
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → ✅ Project Type: web (frontend only - React SPA)
   → ✅ Structure Decision: Single frontend project
3. Fill the Constitution Check section based on the content of the constitution document.
   → ✅ Constitution v1.0.0 checks populated
4. Evaluate Constitution Check section below
   → ✅ No violations - infrastructure setup aligns with constitution
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → ✅ No NEEDS CLARIFICATION remain (all resolved in /clarify)
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
   → ✅ In progress
7. Re-evaluate Constitution Check section
   → Post-Design Constitution Check (pending Phase 1 completion)
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 9. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

**Primary Requirement**: Complete Sprint 0 infrastructure setup to establish production-ready CI/CD pipeline, Supabase staging environment, and test coverage enforcement before Sprint 1 database implementation.

**Technical Approach**:
- Configure GitHub Actions CI/CD with 4-step pipeline (lint, type-check, test with coverage, build)
- Initialize Supabase staging project with CLI access for migrations and type generation
- Implement test coverage enforcement with configurable thresholds and hotfix bypass policy
- Write initial test suite for existing authentication code (AuthContext, ProtectedRoute) following TDD
- Generate database types from minimal Sprint 0 schema (organizations, users, projects, user_organizations)
- Update documentation (CLAUDE.md) with setup instructions and TDD workflow

## Technical Context

**Language/Version**: TypeScript 5.6.2 (strict mode enabled)
**Primary Dependencies**:
- React 18.3.1 + React Router 7.9.3 (SPA)
- Vite 6.0.5 (build tool)
- Supabase JS SDK 2.58.0 (backend client)
- Vitest 3.2.4 + Testing Library 16.3.0 (test infrastructure)
- TanStack Query 5.90.2 (server state - installed but not yet used)
- Zustand 5.0.8 (client state - installed but not yet used)
- Shadcn/ui + Radix UI (component library)
- Tailwind CSS 4.1.14 (styling)

**Storage**: Supabase PostgreSQL 15+ (staging environment, CLI access for migrations)
**Testing**: Vitest (globals enabled) + Testing Library + jsdom + MSW for mocking
**Target Platform**: Modern browsers (ES2020+), deployed via Vercel (SPA)
**Project Type**: web (frontend-only React SPA, backend via Supabase BaaS)
**Performance Goals**:
- CI pipeline completion: <5 minutes (NFR-001)
- Test suite execution: <30 seconds (NFR-002)
- Build time: <2 minutes

**Constraints**:
- Solo developer environment (no migration conflicts)
- Staging-only deployment for Sprint 0 (production hardening deferred to Sprint 1)
- No seed data in Sprint 0 (empty database, seeding deferred to Sprint 1)
- Multi-tenant schema with basic RLS (minimal enforcement, full policies in Sprint 1)
- Coverage bypass allowed for hotfixes with follow-up ticket requirement
- CI fails fast with error logs (no auto-retry per NFR-004)

**Scale/Scope**:
- Sprint 0 deliverables: 7 success criteria (CI green, tests passing, Supabase accessible, types generated, auth coverage ≥80%, deployment working, docs updated)
- Test coverage thresholds: ≥80% src/lib/, ≥60% src/components/, ≥70% overall
- Initial database schema: 4 tables (organizations, users, projects, user_organizations)
- Initial test suite: 2 test files (AuthContext.test.tsx, ProtectedRoute.test.tsx)

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Type Safety First
- [x] TypeScript strict mode enabled (verify tsconfig.json)
- [x] No `as` type assertions without justification in Complexity Tracking
- [x] Path aliases (`@/*`) used for imports
- [x] Database types will be generated from Supabase schema

**Status**: ✅ PASS - tsconfig.app.json has strict:true, path aliases configured in tsconfig/vite/vitest, Supabase type generation is FR-009

### II. Component-Driven Development
- [x] New UI components follow shadcn/ui patterns (Radix + Tailwind)
- [x] Components maintain single responsibility
- [x] Server state via TanStack Query, client state via Zustand
- [x] No prop drilling beyond 2 levels

**Status**: ✅ PASS - Sprint 0 is infrastructure only (no new UI components). Existing components (ProtectedRoute, Layout) follow patterns. TanStack Query/Zustand installed but deferred to Sprint 1 usage.

### III. Testing Discipline
- [x] TDD approach confirmed (tests before implementation)
- [x] Integration tests cover spec acceptance scenarios
- [x] Test files colocated or in tests/ directory
- [x] Tests will use Vitest + Testing Library

**Status**: ✅ PASS - FR-010 mandates tests for AuthContext/ProtectedRoute with ≥80% coverage. Plan includes failing test phase before implementation. Vitest+Testing Library already configured.

### IV. Supabase Integration Patterns
- [x] RLS enabled on all new tables
- [x] Multi-tenant isolation via organization_id in policies
- [x] TanStack Query wraps all Supabase calls
- [x] Auth via AuthContext (no direct supabase.auth in components)
- [x] Realtime subscriptions cleaned up on unmount (if applicable)

**Status**: ✅ PASS - FR-008 specifies multi-tenant schema with basic RLS. AuthContext already exists (src/contexts/AuthContext.tsx). TanStack Query integration deferred to Sprint 1. No realtime in Sprint 0.

### V. Specify Workflow Compliance
- [x] Feature has spec.md in specs/###-feature-name/
- [x] This plan.md follows template structure
- [x] Tasks.md will be generated by /tasks command
- [x] Implementation will follow /implement workflow

**Status**: ✅ PASS - spec.md exists at specs/001-do-you-see/spec.md with 5 clarifications resolved. This plan.md follows template. /tasks command will generate tasks.md.

## Project Structure

### Documentation (this feature)
```
specs/001-do-you-see/
├── spec.md              # Feature specification with clarifications
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command) - minimal, no unknowns
├── data-model.md        # Phase 1 output (/plan command) - database schema
├── quickstart.md        # Phase 1 output (/plan command) - setup verification
├── contracts/           # Phase 1 output (/plan command) - API contracts (minimal for Sprint 0)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Frontend-only React SPA structure
src/
├── components/
│   ├── ui/              # Shadcn/ui components (future)
│   ├── Layout.tsx       # Authenticated route wrapper
│   └── ProtectedRoute.tsx # Auth guard component
├── contexts/
│   └── AuthContext.tsx  # Supabase auth state provider
├── pages/               # Route components (Dashboard, Components, etc.)
├── lib/
│   └── supabase.ts     # Supabase client initialization
└── types/
    └── database.types.ts # Generated from Supabase schema (Sprint 0 output)

tests/
├── setup.ts            # Vitest global setup
├── integration/        # Future integration tests
└── unit/               # Future unit tests (colocated pattern preferred)

.github/
└── workflows/
    └── ci.yml          # Sprint 0 deliverable - CI/CD pipeline

supabase/               # Sprint 0 deliverable - local development
├── config.toml         # Supabase CLI configuration
└── migrations/
    └── 00001_initial_schema.sql # Organizations, users, projects, user_organizations

.specify/
├── memory/
│   └── constitution.md # v1.0.0 - ratified 2025-10-04
├── templates/          # Workflow templates
└── scripts/            # Automation scripts
```

**Structure Decision**: Single frontend project (web type). Backend provided by Supabase BaaS. No separate backend/ directory needed. All source in src/, tests colocated or in tests/, infrastructure files at repo root (.github/, supabase/).

## Phase 0: Outline & Research
*Prerequisites: Feature spec with clarifications resolved*

### Unknowns from Technical Context

**Status**: ✅ NO UNKNOWNS - All clarifications resolved during /clarify phase

The following questions were pre-resolved:
1. ✅ Supabase provisioning: Project lead creates staging project with CLI access
2. ✅ Coverage enforcement policy: Temporary bypass for hotfixes with follow-up ticket
3. ✅ RLS implementation scope: Multi-tenant schema with basic policies (minimal enforcement)
4. ✅ CI failure behavior: Fail fast with error logs, no auto-retry
5. ✅ Test data seeding: No seed data in Sprint 0 (deferred to Sprint 1)

### Research Tasks

Since no NEEDS CLARIFICATION remain, research focuses on **implementation best practices**:

1. **GitHub Actions CI/CD Best Practices for Vite + Vitest**
   - Research: GitHub Actions workflow patterns for Node.js projects
   - Research: Vitest coverage reporting in CI (Istanbul vs v8 reporter)
   - Research: Caching strategies for npm dependencies in Actions
   - Output: Optimal workflow configuration for <5 min pipeline

2. **Supabase CLI Local Development Patterns**
   - Research: supabase init vs supabase link for staging connection
   - Research: Migration file naming conventions (timestamp vs sequential)
   - Research: Type generation workflow (manual vs git hooks)
   - Output: Developer setup instructions for CLAUDE.md

3. **Test Coverage Threshold Configuration in Vitest**
   - Research: vitest.config.ts coverage configuration options
   - Research: Per-directory threshold enforcement (src/lib/ vs src/components/)
   - Research: Coverage bypass mechanisms (environment variables vs flags)
   - Output: Coverage configuration supporting hotfix bypass policy

4. **Mocking Supabase Client in Vitest**
   - Research: vi.mock() patterns for Supabase SDK
   - Research: Testing Library best practices for AuthContext provider
   - Research: Mock return value patterns for auth state changes
   - Output: Reusable mock patterns for AuthContext/ProtectedRoute tests

**Output**: research.md documenting decisions and rationale

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

### 1. Data Model (data-model.md)

**Sprint 0 Schema** (minimal multi-tenant foundation):

```sql
-- organizations table (multi-tenant root)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Basic RLS policy (full policies in Sprint 1)
CREATE POLICY "Users can read own organization"
  ON organizations FOR SELECT
  USING (id IN (
    SELECT organization_id FROM user_organizations
    WHERE user_id = auth.uid()
  ));

-- users table (extends auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own record"
  ON users FOR SELECT
  USING (id = auth.uid());

-- user_organizations junction (membership)
CREATE TABLE user_organizations (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- 'admin' | 'member'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, organization_id)
);

ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own memberships"
  ON user_organizations FOR SELECT
  USING (user_id = auth.uid());

-- projects table (org-scoped)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own org projects"
  ON projects FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_organizations
    WHERE user_id = auth.uid()
  ));

-- Indexes for performance
CREATE INDEX idx_projects_org_id ON projects(organization_id);
CREATE INDEX idx_user_organizations_user_id ON user_organizations(user_id);
CREATE INDEX idx_user_organizations_org_id ON user_organizations(organization_id);
```

**Validation Rules** (enforced in Sprint 1 via Edge Functions):
- Organization name: required, 1-100 characters
- User email: valid email format, unique
- Project name: required, 1-200 characters
- User role: enum ['admin', 'member']

**State Transitions**: None in Sprint 0 (CRUD only)

### 2. API Contracts (contracts/)

**Sprint 0 Scope**: No custom API endpoints (Supabase PostgREST auto-generates CRUD)

Future contracts (Sprint 1+):
- `/contracts/auth.yaml` - Authentication endpoints
- `/contracts/organizations.yaml` - Organization management
- `/contracts/projects.yaml` - Project CRUD

**Sprint 0**: Document Supabase PostgREST patterns instead of OpenAPI contracts

### 3. Contract Tests

**Sprint 0 Tests** (integration level, not contract level):

```typescript
// tests/integration/auth.test.ts (Sprint 1)
// tests/integration/multi-tenant.test.ts (Sprint 1)
```

**Sprint 0 Focus**: Unit tests for existing auth code (AuthContext, ProtectedRoute)

### 4. Test Scenarios from User Stories

**From Spec Acceptance Scenarios**:

1. **Scenario 1**: Developer pushes code → CI runs all checks
   - Test: GitHub Actions workflow executes 4 steps
   - Test: Each step (lint, type-check, test, build) runs independently

2. **Scenario 2**: Coverage below threshold → CI fails
   - Test: Coverage below 70% → pipeline fails
   - Test: Coverage at 70% → pipeline passes

3. **Scenario 3**: Developer runs Supabase CLI locally
   - Test: `supabase db diff` detects migration changes
   - Test: `npx supabase gen types` generates src/types/database.types.ts

4. **Scenario 4**: Developer runs test suite
   - Test: AuthContext provides session when authenticated
   - Test: AuthContext provides null when unauthenticated
   - Test: ProtectedRoute redirects when unauthenticated
   - Test: ProtectedRoute renders children when authenticated

5. **Scenario 5**: TypeScript types available after generation
   - Test: Import Database type from src/types/database.types.ts
   - Test: Type-safe query: `supabase.from('projects').select('*')`

6. **Scenario 6**: CI passes → Vercel deploys
   - Test: Vercel deployment succeeds with .env configured
   - Test: Deployed app serves index.html at root

7. **Scenario 7**: CI fails → Developer receives notification
   - Test: GitHub Actions sends failure notification
   - Test: Error logs accessible via Actions UI link

### 5. Quickstart Test (quickstart.md)

**Purpose**: Verify Sprint 0 infrastructure setup is complete

**Steps**:
1. Clone repository
2. Copy `.env.example` → `.env`, configure Supabase URL/key
3. Run `npm install`
4. Run `npm test` → verify tests pass with ≥70% coverage
5. Run `npm run build` → verify production build succeeds
6. Run `tsc -b` → verify strict TypeScript compilation passes
7. Run `supabase db diff` → verify local Supabase connection
8. Run `npx supabase gen types typescript --local > src/types/database.types.ts` → verify type generation
9. Push to feature branch → verify CI runs all 4 steps
10. Verify Vercel preview deployment succeeds

**Expected Result**: All steps pass, CI green, deployment live

### 6. Update CLAUDE.md

**Action**: Run `.specify/scripts/bash/update-agent-context.sh claude`

**Incremental Updates** (preserving existing content):
- Add Supabase setup instructions (Step 2: copy .env, configure Supabase CLI)
- Add test coverage requirements (≥80% utils, ≥60% components, ≥70% overall)
- Add CI/CD pipeline overview (4 steps, fail fast, no auto-retry)
- Update TDD workflow (write failing tests first per Constitution III)
- Add Sprint 0 database schema reference (4 tables, basic RLS)

**Keep under 150 lines**: Focus on Sprint 0 additions, remove outdated placeholders

**Output**: Updated CLAUDE.md at repository root

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. Load `.specify/templates/tasks-template.md` as base structure
2. Generate tasks from Phase 1 design docs in TDD order:
   - **Phase 0: Environment Setup** (prerequisite tasks)
     - Install Supabase CLI
     - Configure .env with staging credentials
     - Initialize supabase/ directory with `supabase init`
     - Link to staging project with `supabase link`

   - **Phase 1: Tests First (RED)** [TDD]
     - Write failing test: AuthContext provides session when authenticated
     - Write failing test: AuthContext provides null when unauthenticated
     - Write failing test: AuthContext calls signOut on logout
     - Write failing test: ProtectedRoute redirects when unauthenticated
     - Write failing test: ProtectedRoute renders children when authenticated
     - Configure coverage thresholds in vitest.config.ts (will fail initially)

   - **Phase 2: CI/CD Pipeline** [P]
     - Create .github/workflows/ci.yml with 4 steps
     - Add npm caching to workflow
     - Configure coverage reporting in workflow
     - Test workflow on feature branch push

   - **Phase 3: Database Schema** [P]
     - Create supabase/migrations/00001_initial_schema.sql
     - Add organizations table with RLS
     - Add users table with RLS
     - Add user_organizations junction with RLS
     - Add projects table with RLS
     - Run migration locally: `supabase db reset`

   - **Phase 4: Type Generation** (depends on Phase 3)
     - Generate types: `npx supabase gen types typescript --local > src/types/database.types.ts`
     - Verify types compile with tsc -b
     - Commit generated types to version control

   - **Phase 5: Tests Pass (GREEN)** [TDD] (depends on Phase 1)
     - Implement mocks: Mock Supabase client in tests/setup.ts
     - Run tests: npm test (should now pass)
     - Verify coverage meets thresholds (≥70%)

   - **Phase 6: Documentation** [P]
     - Update CLAUDE.md with Supabase setup
     - Update CLAUDE.md with coverage requirements
     - Update CLAUDE.md with CI pipeline overview
     - Update CLAUDE.md with TDD workflow

   - **Phase 7: Verification** (depends on all phases)
     - Run quickstart.md steps 1-10
     - Verify CI pipeline green on PR
     - Verify Vercel deployment succeeds
     - Verify all 7 success criteria met

**Ordering Strategy**:
- **TDD order**: Tests (Phase 1) before implementation (Phase 5)
- **Dependency order**: Environment (Phase 0) → Schema (Phase 3) → Types (Phase 4)
- **Parallel execution** [P]: CI/CD (Phase 2), Schema (Phase 3), Docs (Phase 6) can run independently

**Estimated Output**: ~35-40 numbered, ordered tasks in tasks.md

**Task Format** (per tasks-template.md):
```markdown
## Task 001: Install Supabase CLI
**Status**: pending | **Type**: setup | **Depends**: []
**Description**: Install Supabase CLI globally for local development and type generation
**Acceptance**: `supabase --version` returns v1.x.x
```

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following TDD and constitutional principles)
**Phase 5**: Validation (run quickstart.md, verify all 7 success criteria, confirm CI green)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None      | N/A        | N/A                                 |

**Status**: ✅ No constitutional violations. Sprint 0 infrastructure setup fully complies with Constitution v1.0.0.

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - research.md created with 4 best practices
- [x] Phase 1: Design complete (/plan command) - data-model.md, quickstart.md, contracts/README.md, CLAUDE.md updated
- [x] Phase 2: Task planning complete (/plan command - 7-phase approach with ~35-40 tasks estimated)
- [ ] Phase 3: Tasks generated (/tasks command) - NEXT STEP
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (all 5 principles satisfied)
- [x] Post-Design Constitution Check: PASS (data model has RLS, tests planned first, types generated)
- [x] All NEEDS CLARIFICATION resolved (5 clarifications completed in /clarify phase)
- [x] Complexity deviations documented (none - no violations)

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
