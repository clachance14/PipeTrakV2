<!--
=============================================================================
SYNC IMPACT REPORT - Constitution Amendment History
=============================================================================

AMENDMENT: v1.0.1 → v1.0.2 (2025-10-23)
---------------------------------------
Amendment Type: PATCH (clarification + expansion)
Modified Principle: V. Specify Workflow Compliance

Changes:
- Documented all 7 Specify workflow tools (previously only 4 core steps)
- Organized tools by phase: Planning, Quality Assurance, Execution
- Added progressive enhancement model (simple/typical/complex features)
- Clarified that ALL features use workflow (scales with complexity)
- Expanded rationale to include progressive enhancement

Rationale:
- User requested all Specify tools be documented in constitution
- Removes "trivial vs non-trivial" ambiguity
- Provides clear guidance for feature complexity levels
- Maintains rigor while supporting flexibility

Template Synchronization Status:
✅ plan-template.md - No changes needed (already supports all tools)
✅ spec-template.md - No changes needed (generic template)
✅ tasks-template.md - No changes needed (already aligned)
✅ .claude/commands/*.md - All 7 commands already documented

Validation Results:
✅ Version incremented correctly (1.0.1 → 1.0.2)
✅ Amendment date updated (2025-10-23)
✅ No unexplained bracket tokens
✅ All 5 principles present with rationale
✅ Governance section complete

=============================================================================

RESTORATION: Template → v1.0.1 (2025-10-23)
--------------------------------------------
Action: Template placeholders replaced with concrete PipeTrak V2 values
Source: GitHub backup at https://github.com/clachance14/PipeTrakV2/blob/main/.specify/memory/constitution.md

Version Change: None (restoration, not amendment)
- Previous: Template with [PLACEHOLDERS]
- Restored: v1.0.1 (preserved from original)
- Ratified: 2025-10-04 (preserved)
- Last Amended: 2025-10-21 (preserved, then updated to 2025-10-23 for v1.0.2)

Modified Sections:
- All sections restored from template → concrete values
- 5 Core Principles restored
- Security & Multi-tenancy section restored
- Development Workflow section restored
- Governance section restored

=============================================================================
-->

# PipeTrak V2 Constitution

## Core Principles

### I. Type Safety First

TypeScript strict mode is mandatory. Key requirements include:
- `strict: true` with no type assertions (`as` keyword) unless explicitly justified in PR
- `noUncheckedIndexedAccess: true` enforced (defensive array/object access)
- Elimination of unused locals and parameters
- Path aliases (`@/*`) required for cross-directory imports
- Database types auto-generated from Supabase schema

**Rationale:** Brownfield construction tracking demands data integrity; compile-time type errors prevent field data corruption.

### II. Component-Driven Development

React components follow shadcn/ui patterns with:
- UI components in `src/components/ui/` using Radix UI primitives
- Business components colocated with pages
- Single responsibility composition
- State management via TanStack Query (server) or Zustand (client)
- Layout wrappers for authenticated routes

**Rationale:** Industrial UIs require consistent, accessible components.

### III. Testing Discipline

Test-Driven Development is mandatory for features via Specify workflow:
- Tests written before implementation (Red-Green-Refactor)
- Colocated test files (`*.test.tsx`) or `tests/` directory
- Vitest globals enabled
- Integration tests cover spec acceptance scenarios
- Testing Library for component tests (no enzyme)

**Exceptions:** Hotfixes and prototype spikes may skip TDD if labeled `[SPIKE]` or `[HOTFIX]`.

**Rationale:** Field data tracking errors are expensive; failing tests document expected behavior.

### IV. Supabase Integration Patterns

Backend interactions must follow:
- Row Level Security enabled on all tables
- Multi-tenant isolation via `organization_id` in RLS policies
- Environment variable validation at client initialization
- TanStack Query wrapping all Supabase calls
- Realtime subscriptions with cleanup on unmount
- AuthContext for auth state (no direct component access)
- File uploads via Supabase Storage with matching RLS policies
- Remote database migrations only via `npx supabase db push --linked`

**Rationale:** Multi-project tracking requires tenant isolation enforced at database level.

### V. Specify Workflow Compliance

All features follow the complete Specify workflow with tools organized by phase:

**Planning Phase:**
- `/specify` → Feature spec in `specs/###-feature-name/spec.md`
- `/clarify` → Resolve specification ambiguities via targeted questions (optional but recommended)
- `/plan` → Implementation plan with constitution verification
- `/tasks` → Ordered task breakdown (TDD sequence)

**Quality Assurance Phase:**
- `/checklist` → Generate requirement validation checklists (recommended for complex features)
- `/analyze` → Cross-artifact consistency check before implementation (recommended)

**Execution Phase:**
- `/implement` → Execute tasks with per-task commits

**Workflow Scales with Complexity:**
- **Simple features**: Use core tools (`/specify` → `/plan` → `/tasks` → `/implement`)
- **Typical features**: Add quality gates (`/clarify` and `/analyze` recommended)
- **Complex features**: Use full workflow including `/checklist` for requirements validation
- All features documented in `specs/###-feature-name/` directory regardless of complexity

**Constitution Gates:**
- Plan verifies no TypeScript strict mode violations
- Plan verifies RLS policies for new tables
- Plan verifies TanStack Query for server state
- Tasks orders tests before implementation

**Rationale:** Systematic planning prevents architectural drift; complete toolset enables progressive enhancement from simple to complex features.

## Security & Multi-tenancy

### Row Level Security (NON-NEGOTIABLE)

- Every table must have RLS enabled
- Policies filter by `organization_id`
- Auth policies verify "`auth.uid()` matches row owner or organization membership"
- Service role key never exposed to frontend

### Authentication

- Email/password via Supabase Auth in AuthContext
- Protected routes use `<ProtectedRoute>` wrapper
- Session persistence handled by Supabase SDK

## Development Workflow

### Feature Branches

- Naming: `###-feature-name` (matches spec directory)
- Main branch protected (require PR review)
- PR title format: "feat: description" or "fix: description" (conventional commits)

### TDD Gates

- PRs must include failing test commits before implementation
- CI runs `npm test` and `tsc -b` (both must pass)
- Integration tests execute against local Supabase instance

### Code Review

Reviewers verify:
- TypeScript strict mode passing
- RLS policies present for new tables
- Tests written before implementation
- TanStack Query used for server state
- Complexity violations justified in PR description

## Governance

### Amendment Process

1. Propose change in PR to `.specify/memory/constitution.md`
2. Update version (MAJOR for principle removal, MINOR for addition, PATCH for clarification)
3. Update LAST_AMENDED_DATE
4. Run sync to update dependent templates and CLAUDE.md
5. Require maintainer approval

### Versioning Policy

- **MAJOR:** Principle removed or redefined (breaks existing specs)
- **MINOR:** New principle added or section expanded
- **PATCH:** Clarifications, typos, non-semantic changes

### Compliance

- All PRs reference constitution version in plan.md footer
- Plan template checks align with current version
- Violations without justification rejected in PR review

### Runtime Guidance

- Use CLAUDE.md in repository root for Claude Code development sessions
- Constitution defines WHAT (principles); CLAUDE.md defines HOW (patterns and commands)

**Version**: 1.0.2 | **Ratified**: 2025-10-04 | **Last Amended**: 2025-10-23
