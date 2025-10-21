<!--
  SYNC IMPACT REPORT
  ==================
  Version Change: [TEMPLATE] → 1.0.0 → 1.0.1

  Initial Ratification (1.0.0):
  - 5 core principles established for PipeTrak V2
  - Type Safety First (I)
  - Component-Driven Development (II)
  - Testing Discipline (III)
  - Supabase Integration Patterns (IV)
  - Specify Workflow Compliance (V)

  Added Sections:
  - Security & Multi-tenancy (RLS enforcement)
  - Development Workflow (feature branch, TDD gates)

  Version 1.0.1 (2025-10-21) - PATCH:
  - Clarified Principle IV: Database migrations MUST use remote-only workflow
  - Added: "Database migrations MUST be applied to remote via `npx supabase db push --linked` (no local Supabase instance)"
  - Updated CLAUDE.md Supabase Setup section with remote-only commands

  Templates Requiring Updates:
  ✅ .specify/templates/plan-template.md - Constitution Check section references updated
  ✅ .specify/templates/spec-template.md - Already aligned (no tech details requirement matches)
  ✅ .specify/templates/tasks-template.md - TDD ordering matches principle III

  Follow-up TODOs:
  - None - all principles concrete and actionable
-->

# PipeTrak V2 Constitution

## Core Principles

### I. Type Safety First
TypeScript strict mode is NON-NEGOTIABLE. All code MUST pass compilation with:
- `strict: true` with no type assertions (`as` keyword) unless explicitly justified in PR
- `noUncheckedIndexedAccess: true` enforced (defensive array/object access)
- `noUnusedLocals` and `noUnusedParameters` enabled (no dead code)
- Path aliases (`@/*`) MUST be used for all imports outside current directory
- Database types MUST be auto-generated from Supabase schema using `npx supabase gen types`

**Rationale**: Brownfield construction tracking requires data integrity. Type errors caught at compile-time prevent field data corruption.

### II. Component-Driven Development
React components MUST follow shadcn/ui patterns:
- UI components live in `src/components/ui/` and use Radix UI primitives
- Business components live in `src/components/` or colocated with pages
- Components MUST be composable (single responsibility)
- Shared state via TanStack Query (server state) or Zustand (client state), NOT prop drilling beyond 2 levels
- Page components in `src/pages/` wrapped with Layout component for authenticated routes

**Rationale**: Industrial UIs require consistent, accessible components. Shadcn/ui provides production-ready primitives with Tailwind CSS v4 theming.

### III. Testing Discipline
Test-Driven Development is MANDATORY for all features developed via Specify workflow:
- Tests MUST be written BEFORE implementation (Red-Green-Refactor)
- Test files colocated with source (`*.test.tsx`) or in `tests/` directory
- Vitest globals enabled (no imports needed for `describe`, `it`, `expect`)
- Integration tests MUST cover user workflows from spec acceptance scenarios
- Component tests MUST use Testing Library (no enzyme, no shallow rendering)
- Tests MUST fail before implementation begins (verified in PR review)

**Exceptions**: Hotfixes and prototype spikes MAY skip TDD if labeled `[SPIKE]` or `[HOTFIX]` in PR title.

**Rationale**: Field data tracking errors are expensive. Failing tests document expected behavior before code exists.

### IV. Supabase Integration Patterns
All backend interactions MUST follow Supabase best practices:
- Row Level Security (RLS) MUST be enabled on all tables (no public access)
- Multi-tenant isolation via organization_id in RLS policies
- Supabase client (`src/lib/supabase.ts`) MUST validate environment variables at init
- TanStack Query MUST wrap all Supabase calls for caching and optimistic updates
- Realtime subscriptions MUST clean up on component unmount
- Auth state via `AuthContext` (do NOT access `supabase.auth` directly in components)
- File uploads via Supabase Storage with RLS policies matching table access
- Database migrations MUST be applied to remote via `npx supabase db push --linked` (no local Supabase instance)

**Rationale**: Multi-project construction tracking requires tenant isolation. Supabase RLS enforces data boundaries at database level.

### V. Specify Workflow Compliance
All non-trivial features MUST follow the Specify workflow:
- `/specify` → Feature spec in `specs/###-feature-name/spec.md`
- `/plan` → Implementation plan with constitution check
- `/tasks` → Ordered task breakdown (TDD sequence)
- `/implement` → Execute tasks with commits per task

**Constitution gates**:
- Plan template MUST verify no TypeScript strict mode violations
- Plan template MUST verify RLS policies defined for new tables
- Plan template MUST verify TanStack Query usage for server state
- Tasks template MUST order tests before implementation

**Rationale**: Systematic planning prevents architectural drift. Constitution checks enforce principles during design, not after implementation.

## Security & Multi-tenancy

### Row Level Security (NON-NEGOTIABLE)
- Every table MUST have RLS enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
- Policies MUST filter by `organization_id` for multi-tenant isolation
- Auth policies MUST check `auth.uid()` matches row owner or organization membership
- Service role key MUST NOT be exposed to frontend (use anon key only)

### Authentication
- Email/password auth via Supabase Auth (configured in AuthContext)
- Protected routes use `<ProtectedRoute>` wrapper (no manual auth checks in pages)
- Session persistence handled by Supabase SDK (do NOT store tokens manually)

## Development Workflow

### Feature Branches
- Branch naming: `###-feature-name` (matches spec directory)
- Main branch protected (require PR review)
- PR title format: `feat: description` or `fix: description` (conventional commits)

### TDD Gates
- PRs introducing features MUST include failing test commits before implementation
- CI MUST run `npm test` and `tsc -b` (both must pass)
- Integration tests MUST execute against local Supabase instance (via `supabase start`)

### Code Review
- Reviewers MUST verify constitution compliance:
  - TypeScript strict mode passing?
  - RLS policies present for new tables?
  - Tests written before implementation?
  - TanStack Query used for server state?
- Complexity violations MUST be justified in PR description (reference `plan.md` Complexity Tracking)

## Governance

### Amendment Process
1. Propose change in PR to `.specify/memory/constitution.md`
2. Update version (MAJOR for principle removal, MINOR for addition, PATCH for clarification)
3. Update `LAST_AMENDED_DATE` to amendment date
4. Run sync: update dependent templates and `CLAUDE.md` if principles change
5. Require approval from project maintainer

### Versioning Policy
- **MAJOR**: Principle removed or redefined (breaks existing specs)
- **MINOR**: New principle added or section expanded
- **PATCH**: Clarifications, typos, non-semantic changes

### Compliance
- All PRs MUST reference constitution version in plan.md footer
- Plan template constitution checks MUST align with current version
- Violations without justification MUST be rejected in PR review

### Runtime Guidance
- Use `CLAUDE.md` in repository root for Claude Code development sessions
- Constitution defines WHAT (principles), CLAUDE.md defines HOW (patterns and commands)

**Version**: 1.0.1 | **Ratified**: 2025-10-04 | **Last Amended**: 2025-10-21
