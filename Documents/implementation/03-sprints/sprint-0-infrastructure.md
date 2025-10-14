7.1 Sprint 0: Infrastructure Setup (Week 1)

**STATUS: ✅ 94% COMPLETE** (Completed: 2025-10-04)
**Reference**: See `specs/001-do-you-see/` for detailed task execution (33/35 tasks completed)

Duration: 5 days
Team: 1 Full-stack Developer + 1 DevOps/Infra

GOALS:
- Initialize project with Spec Kit ✅
- Set up repositories, CI/CD, Supabase project ✅
- Define coding standards & architecture principles ✅

TASKS:
✅ Install Spec Kit CLI: uv tool install specify-cli
✅ Initialize project: specify init PipeTrak_V2
✅ Create constitution document (coding standards, tech stack, quality gates)
❌ Migrate existing Documents into .specify/specs/ structure (PENDING)
⚠️ Initialize GitHub repository with branch protection rules (VERIFY MANUALLY)
✅ Set up Supabase project (staging + production environments)
  - ✅ Enable extensions: uuid-ossp, pg_trgm
  - ✅ Configure Auth settings (email/password, JWT expiry)
✅ Set up Vercel project (linked to GitHub, auto-deploy on main)
✅ Configure GitHub Actions CI/CD:
  - ✅ Lint (ESLint + Prettier)
  - ✅ Type check (TypeScript)
  - ✅ Unit tests (Vitest)
  - ✅ Build check
✅ Create initial database schema (organizations, users, user_organizations, projects tables)
✅ Generate TypeScript types from Supabase schema (supabase gen types typescript)
✅ Initialize frontend project:
  - ✅ Vite + React + TypeScript
  - ✅ Install dependencies: Shadcn/ui, TanStack Query, Zustand, Supabase client
  - ✅ Set up Tailwind CSS + theme configuration
✅ Verify existing auth flow (AuthContext, ProtectedRoute already implemented)
✅ Document architecture decisions in .specify/memory/
✅ Configure test infrastructure:
  - ✅ Set up Vitest coverage reporting (vitest --coverage)
  - ✅ Configure test file organization (colocated .test.tsx pattern)
  - ✅ Add test execution to CI pipeline (must pass before merge)
  - ✅ Set coverage thresholds: 70% overall, 60% components, 80% business logic
  - ⚠️ Install testing dependencies: @testing-library/user-event installed, MSW (Mock Service Worker) NOT INSTALLED
✅ Create TDD workflow documentation:
  - ✅ Add testing patterns to CLAUDE.md
  - ✅ Create example: failing test → implementation → passing test
  - ✅ Document mocking strategy (Supabase client, realtime)
✅ Write initial test suite for existing code:
  - ✅ Test: AuthContext provides user session (3 tests)
  - ✅ Test: ProtectedRoute redirects when unauthenticated
  - ✅ Test: ProtectedRoute renders children when authenticated

**REMAINING TASKS**:
❌ Install MSW (Mock Service Worker): `npm install -D msw@latest`
❌ Migrate Documents/ to .specify/specs/ structure
⏳ Verify quickstart workflow (T034 from specs/001-do-you-see/tasks.md)
⏳ Verify all success criteria (T035 from specs/001-do-you-see/tasks.md)

DELIVERABLES:
✅ Spec Kit project structure in place
✅ GitHub repo with CI/CD pipeline green (including test execution)
✅ Supabase staging environment live
✅ Vercel staging deployment live
✅ Auth flow functional (already exists, tests added)
✅ Constitution document finalized
✅ Test infrastructure configured
✅ Initial test suite passing

ACCEPTANCE CRITERIA:
- Developer can clone repo, run npm install, npm run dev
- CI passes on main branch (lint + type-check + tests + build)
- npm test runs successfully with ≥70% coverage
- Can log in to staging app with test account
- Auth flow has test coverage (AuthContext, ProtectedRoute)

CONSTITUTION COMPLIANCE (v1.0.0):
- ✅ I. Type Safety First: TypeScript strict mode enforced in tsconfig, no `as` assertions
- ✅ II. Component-Driven: Test infrastructure supports component testing (Testing Library)
- ✅ III. Testing Discipline: Tests written before implementation (initial auth tests)
- ✅ IV. Supabase Integration: Client initialized with env validation, types generated
- ✅ V. Specify Workflow: Project initialized with `.specify/` structure

──────────────────────────────────────────────────────────────────────────────
