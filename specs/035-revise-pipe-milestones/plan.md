# Implementation Plan: Revise Pipe Component Milestones

**Branch**: `035-revise-pipe-milestones` | **Date**: 2026-01-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/035-revise-pipe-milestones/spec.md`

## Summary

Add a v2 progress template for the pipe component type with 7 milestones (Receive, Erect, Connect, Support, Punch, Test, Restore) using a hybrid workflow. Weights: 5/30/30/20/5/5/5. First four milestones support partial completion (0-100%), last three are discrete (0/1).

**Technical Approach**: Single database migration to insert the new template into `progress_templates`. No frontend changes required - the system is template-driven.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), PostgreSQL 15+
**Primary Dependencies**: Supabase (database), React 18 (frontend - no changes)
**Storage**: PostgreSQL via Supabase (`progress_templates` table)
**Testing**: Vitest for unit tests, SQL verification queries
**Target Platform**: Web application (React SPA)
**Project Type**: Web (Supabase backend + React frontend)
**Performance Goals**: N/A - template insertion has no performance impact
**Constraints**: Weights must total 100%, template must be compatible with existing `calculate_component_percent()` function
**Scale/Scope**: Single migration, no frontend code changes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Type Safety (Principle I):**
- [x] TypeScript strict mode enabled (`strict: true`) - No TypeScript changes
- [x] No type assertions (`as` keyword) without justification - N/A
- [x] `noUncheckedIndexedAccess: true` enforced - N/A
- [x] Path aliases (`@/*`) used for cross-directory imports - N/A
- [x] Database types auto-generated from Supabase schema - Will regenerate after migration

**Component-Driven Development (Principle II):**
- [x] UI components use shadcn/ui and Radix UI primitives - No UI changes
- [x] Single responsibility composition verified - N/A
- [x] TanStack Query for server state, Zustand for client state - Existing hooks continue to work

**Testing Discipline (Principle III):**
- [x] TDD workflow planned (Red-Green-Refactor) - SQL verification queries before/after
- [x] Integration tests cover spec acceptance scenarios - Will add template verification test
- [x] Hotfix test debt tracking (if applicable) - N/A

**Supabase Integration (Principle IV):**
- [x] RLS enabled on all new tables - No new tables
- [x] RLS patterns remain multi-tenant-safe - N/A (progress_templates is global)
- [x] TanStack Query wraps all Supabase calls - Existing hooks
- [x] AuthContext used for auth state - N/A

**Specify Workflow (Principle V):**
- [x] Feature documented in `specs/###-feature-name/` directory
- [x] Constitution gates verified before planning
- [x] Tasks ordered with tests before implementation

**Migration Rules (Principle VI):**
- [x] New sequential migration planned (if schema changes) - Single INSERT migration
- [x] Migration idempotency verified or marked irreversible - Uses INSERT (no ON CONFLICT needed for new version)
- [x] RLS rules updated in same migration as table changes - N/A (no table changes)
- [x] Data migration reversibility documented (if applicable) - DELETE by version=2 is trivial rollback
- [x] TypeScript types regeneration planned - Yes, after migration
- [x] Backward-compatibility notes documented - v1 template remains, no breaking changes

**Performance Standards (Principle VII):**
- [x] Table rendering target <100ms for 10k rows - N/A (no UI changes)
- [x] Database query index strategy documented - Existing indexes on (component_type, version)
- [x] No `select *` in production code - N/A
- [x] TanStack Query pagination/virtualization planned - N/A

**UI Standards (Principle VIII):**
- [x] Mobile layout planned (1024px breakpoint) - No UI changes
- [x] Touch targets ≥44px (WCAG 2.1 AA) - N/A
- [x] Keyboard accessibility planned - N/A
- [x] shadcn/ui and Radix patterns followed - N/A
- [x] No inline styles (Tailwind CSS only) - N/A

**Test Coverage (Principle IX):**
- [x] Unit tests planned for business logic - SQL verification tests
- [x] Integration tests planned for data flow - Template query verification
- [x] At least one acceptance test per spec scenario - Verification queries map to acceptance criteria
- [x] Coverage targets verified - Migration-only feature, no new code to cover

## Project Structure

### Documentation (this feature)

```text
specs/035-revise-pipe-milestones/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file
├── research.md          # Phase 0 output (below)
├── data-model.md        # Phase 1 output (below)
├── quickstart.md        # Phase 1 output (below)
├── checklists/          # Quality validation
│   └── requirements.md  # Spec validation checklist
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
supabase/
└── migrations/
    └── YYYYMMDDHHMMSS_revise_pipe_milestones_v2.sql  # New migration

src/types/
└── database.types.ts  # Regenerated after migration
```

**Structure Decision**: Database-only change. Single migration file adds the template. TypeScript types regenerated to reflect any schema introspection changes (none expected for INSERT-only migration).

## Complexity Tracking

No constitution violations. This is a minimal-complexity feature:
- Single INSERT statement
- No new tables or columns
- No frontend changes
- No new dependencies
- Existing system fully supports hybrid workflows
