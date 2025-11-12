# Implementation Plan: Editable Milestone Weight Templates

**Branch**: `026-editable-milestone-templates` | **Date**: 2025-11-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/026-editable-milestone-templates/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Enable admins and project managers to customize milestone weight percentages for each component type within their project. Each project can clone system templates and override weights (e.g., "Weld Made" from 60% to 70%), with optional retroactive application to existing components. Implementation includes: (1) `project_progress_templates` table with RLS policies, (2) template cloning RPC functions, (3) weight validation triggers, (4) Settings page UI with modal editor, (5) audit logging of all changes, (6) updated `calculate_component_percent()` function with project template fallback.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), React 18.3
**Primary Dependencies**: Supabase JS Client, TanStack Query v5, react-hook-form, Zod, Radix UI (Dialog, Tabs), Tailwind CSS v4
**Storage**: PostgreSQL (Supabase remote) with Row Level Security
**Testing**: Vitest + Testing Library, ≥70% coverage required
**Target Platform**: Web (desktop-only, >1024px viewport)
**Project Type**: Web application (React SPA + Supabase backend)
**Performance Goals**: Template weight updates <500ms, recalculation for 1,000 components <3 seconds, UI validation <100ms
**Constraints**: Desktop-only (no mobile optimization), admin/project_manager roles only, weights must sum to 100% per component type
**Scale/Scope**: 11 component types, ~55 milestone templates per project, 100-10,000 components per project, <10 concurrent template editors

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Type Safety First ✅

- **TypeScript strict mode**: All new code in `src/` uses strict TypeScript with no type assertions
- **noUncheckedIndexedAccess**: Template weight arrays accessed defensively (`.at()` or optional chaining)
- **Database types**: Auto-generated types from Supabase schema for `project_progress_templates` table
- **Path aliases**: All imports use `@/*` for cross-directory references

**Status**: COMPLIANT - No violations

### II. Component-Driven Development ✅

- **UI components**: Dialog, Tabs from `src/components/ui/` (Radix UI primitives)
- **Business components**: `MilestoneTemplatesPage`, `TemplateEditor`, `WeightInput` colocated in `src/pages/` and `src/components/settings/`
- **State management**: TanStack Query for server state (template queries/mutations), no client state needed
- **Layout**: Settings page uses existing `Layout` component wrapper

**Status**: COMPLIANT - Follows shadcn/ui + TanStack Query patterns

### III. Testing Discipline ✅

- **TDD workflow**: Tests written before implementation (Red-Green-Refactor)
- **Test location**: Colocated `.test.tsx` files for components, `tests/integration/` for RLS and workflow tests
- **Coverage target**: ≥70% overall, ≥80% for utility functions (weight validation, recalculation logic)
- **Testing tools**: Vitest globals enabled, Testing Library for component tests

**Status**: COMPLIANT - TDD via `/tasks` workflow

### IV. Supabase Integration Patterns ✅

- **RLS policies**: All new tables (`project_progress_templates`, `project_template_changes`) have RLS enabled
- **Multi-tenant isolation**: Policies filter by `organization_id` via project relationship
- **TanStack Query**: All Supabase calls wrapped in query hooks (`useProjectTemplates`, `useUpdateProjectTemplates`)
- **AuthContext**: Permission checks use existing `useAuth()` hook (no direct Supabase auth access)
- **Remote migrations**: All schema changes via `supabase db push --linked`

**Status**: COMPLIANT - Follows established RLS + query hook patterns

### V. Specify Workflow Compliance ✅

- **Planning phase**: `/specify` (complete) → `/plan` (this file) → `/tasks` (next step)
- **Quality assurance**: `/analyze` recommended before `/implement` (cross-artifact consistency check)
- **Constitution gates**: Type safety, RLS, TanStack Query verified above
- **Documentation**: All artifacts in `specs/026-editable-milestone-templates/`

**Status**: COMPLIANT - Following full workflow

### Gate Summary

**Pre-Phase 0**: ✅ PASS (all 5 principles compliant, no violations to justify)
**Post-Phase 1**: Re-check after data model and contracts finalized

## Project Structure

### Documentation (this feature)

```text
specs/026-editable-milestone-templates/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (generated below)
├── data-model.md        # Phase 1 output (generated below)
├── quickstart.md        # Phase 1 output (generated below)
├── contracts/           # Phase 1 output (generated below)
│   └── rpc-functions.sql  # Template cloning, weight updates, recalculation RPCs
├── checklists/
│   └── requirements.md  # Specification quality validation (complete)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Web application structure (React SPA + Supabase backend)

src/
├── components/
│   ├── ui/              # Radix UI primitives (Dialog, Tabs - already exist)
│   └── settings/        # NEW: Settings feature components
│       ├── MilestoneTemplatesPage.tsx       # Main settings page
│       ├── MilestoneTemplatesPage.test.tsx
│       ├── TemplateCard.tsx                 # Component type card
│       ├── TemplateCard.test.tsx
│       ├── TemplateEditor.tsx               # Modal weight editor
│       ├── TemplateEditor.test.tsx
│       ├── WeightInput.tsx                  # Numeric input with validation
│       ├── WeightInput.test.tsx
│       ├── WeightProgressBar.tsx            # Visual weight distribution
│       ├── WeightProgressBar.test.tsx
│       ├── CloneTemplatesBanner.tsx         # Prompt for existing projects
│       └── CloneTemplatesBanner.test.tsx
├── hooks/
│   ├── useProjectTemplates.ts               # NEW: Fetch project templates
│   ├── useProjectTemplates.test.ts
│   ├── useUpdateProjectTemplates.ts         # NEW: Mutate templates
│   ├── useUpdateProjectTemplates.test.ts
│   ├── useCloneTemplates.ts                 # NEW: Clone system templates
│   ├── useCloneTemplates.test.ts
│   └── useTemplateChanges.ts                # NEW: Fetch audit log
└── types/
    └── database.types.ts                    # UPDATED: Regenerate after migrations

supabase/migrations/
├── 000XX_project_progress_templates.sql     # NEW: project_progress_templates table
├── 000XX_template_validation.sql            # NEW: Weight sum = 100% trigger
├── 000XX_template_audit.sql                 # NEW: project_template_changes table
├── 000XX_update_calculate_percent.sql       # UPDATED: Fallback to project templates
├── 000XX_template_rls_policies.sql          # NEW: RLS policies for templates
├── 000XX_clone_templates_rpc.sql            # NEW: Clone system templates RPC
└── 000XX_recalculate_components_rpc.sql     # NEW: Retroactive recalculation RPC

tests/integration/
├── rls/
│   └── project-templates-rls.test.ts        # NEW: RLS policy validation
└── settings/
    └── milestone-templates-workflow.test.ts  # NEW: E2E settings workflow
```

**Structure Decision**: Web application structure with React frontend and Supabase backend. New components isolated in `src/components/settings/` directory. Database schema changes via migrations in `supabase/migrations/`. Integration tests in `tests/integration/` covering RLS policies and complete user workflows. Follows existing PipeTrak V2 patterns (shadcn/ui components, TanStack Query hooks, colocated tests).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No violations to track** - All constitution principles are satisfied without exceptions.

---

## Planning Complete

### Phase 0: Outline & Research ✅

**Research Questions Resolved**:
1. Template cloning pattern chosen (full copy per project)
2. Dual validation (client + server)
3. Synchronous recalculation with loading indicator
4. Optimistic locking for concurrent edits
5. Admin/PM permissions via existing role system
6. Dedicated audit table with JSONB old/new weights
7. Real-time affected component count query

**Output**: [research.md](./research.md) (7 decisions documented)

### Phase 1: Design & Contracts ✅

**Data Model**:
- 2 new tables (`project_progress_templates`, `project_template_changes`)
- 7 migrations (schema + triggers + RLS + RPCs)
- Performance indexes defined
- State transitions documented

**Output**: [data-model.md](./data-model.md)

**API Contracts**:
- 6 RPC functions specified (clone, update, recalculate, summary, validation, audit)
- Input/output types documented
- Error cases defined
- TypeScript type definitions provided

**Output**: [contracts/rpc-functions.sql](./contracts/rpc-functions.sql)

**Quickstart Guide**:
- 6 implementation phases defined (0-5)
- File creation order specified
- TDD workflow examples
- Common patterns referenced
- Testing checklist (40+ items)
- Performance targets documented
- Rollout checklist provided

**Output**: [quickstart.md](./quickstart.md)

**Agent Context**: ✅ Updated CLAUDE.md with technology stack

---

### Post-Phase 1 Constitution Check ✅

Re-evaluation after design complete:

**I. Type Safety First** ✅ COMPLIANT
- All TypeScript types defined in contracts (JSONB structures, RPC returns)
- Database types will be regenerated after migrations
- No type assertions needed

**II. Component-Driven Development** ✅ COMPLIANT
- 6 UI components identified (TemplateCard, TemplateEditor, WeightInput, etc.)
- Radix UI primitives (Dialog, Tabs) confirmed available
- TanStack Query hooks specified (4 total)

**III. Testing Discipline** ✅ COMPLIANT
- 40+ test cases identified in quickstart checklist
- TDD workflow documented (RED-GREEN-REFACTOR)
- Coverage targets specified (≥70% overall, ≥80% utilities)

**IV. Supabase Integration Patterns** ✅ COMPLIANT
- RLS policies specified for both tables
- Multi-tenant isolation via project → organization relationship
- All Supabase calls wrapped in TanStack Query hooks
- Remote migrations only (`supabase db push --linked`)

**V. Specify Workflow Compliance** ✅ COMPLIANT
- Specification complete ([spec.md](./spec.md))
- Planning complete (this file)
- Ready for `/speckit.tasks` (task generation)
- Next: `/speckit.implement` (execution)

**Final Gate Summary**: ✅ PASS (all 5 principles remain compliant after design phase)

---

## Next Steps

1. **Run `/speckit.tasks`** to generate ordered task breakdown (`tasks.md`)
2. **Review tasks** with user for approval
3. **Run `/speckit.analyze`** (optional) to validate cross-artifact consistency
4. **Run `/speckit.implement`** to execute implementation with TDD workflow

**Estimated Effort**: 16-20 hours (2-3 days solo developer)

**Key Files Generated**:
- [x] `plan.md` - This file (implementation plan)
- [x] `research.md` - Research decisions (7 questions resolved)
- [x] `data-model.md` - Entity definitions + validation rules
- [x] `contracts/rpc-functions.sql` - API contracts (6 RPCs)
- [x] `quickstart.md` - Developer guide (40+ test checklist)

**Next Artifact**: `tasks.md` (generated by `/speckit.tasks` command)

---

**Constitution Version**: v1.0.2 (2025-10-23)
