
# Implementation Plan: Test Package Readiness Page Enhancement

**Branch**: `012-test-package-readiness` | **Date**: 2025-10-21 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/home/clachance14/projects/PipeTrak_V2/specs/012-test-package-readiness/spec.md`

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
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code, or `AGENTS.md` for all other agents).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Fix materialized view `mv_package_readiness` to count components that inherit `test_package_id` from their drawing (not just directly assigned components), add CRUD operations for creating/editing test packages, and implement drill-down page showing all components in a package with inline milestone updates. Maintains consistency with Feature 011's metadata inheritance model (COALESCE logic for NULL component values).

## Technical Context
**Language/Version**: TypeScript 5.x (strict mode), React 18
**Primary Dependencies**: TanStack Query v5, Radix UI (Dialog, Popover), React Router v7, Sonner (toasts)
**Storage**: PostgreSQL via Supabase (remote-only, no local instance)
**Testing**: Vitest + Testing Library (jsdom environment)
**Target Platform**: Web (Chrome/Firefox/Safari, desktop + tablet)
**Project Type**: Web application (single-page React app)
**Performance Goals**:
- Package readiness page load: <2s for 50 packages
- Package detail page load: <2s for 200 components
- CRUD operations: <1s perceived latency (optimistic updates)
- Materialized view refresh: 60s interval (existing)

**Constraints**:
- No real-time sync required (60s eventual consistency acceptable)
- Backward compatible with Feature 008's usePackageReadiness hook
- Reuse inheritance badges from Feature 011 (no duplication)
- Remote database only: `npx supabase db push --linked`

**Scale/Scope**:
- Expected packages per project: 10-50
- Expected components per package: 50-500
- Concurrent users per project: 5-20
- Browser support: Modern evergreen browsers (ES2020+)

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Type Safety First
- [x] TypeScript strict mode enabled (existing tsconfig.json with strict: true)
- [x] No `as` type assertions without justification in Complexity Tracking
- [x] Path aliases (`@/*`) used for imports (all new files will use @/ prefix)
- [x] Database types will be generated from Supabase schema (run after migration 00027)

### II. Component-Driven Development
- [x] New UI components follow shadcn/ui patterns (PackageDialog uses Radix Dialog, reuses existing ui/dialog.tsx)
- [x] Components maintain single responsibility (PackageDialog=CRUD, PackageDetailPage=display, ComponentRow=reused)
- [x] Server state via TanStack Query, client state via Zustand (useCreatePackage, useUpdatePackage, usePackageComponents hooks)
- [x] No prop drilling beyond 2 levels (Context used for project selection, props for component config)

### III. Testing Discipline
- [x] TDD approach confirmed (contract tests written in Phase 1, implementation in tasks.md execution)
- [x] Integration tests cover spec acceptance scenarios (15 acceptance scenarios → 15 integration test cases)
- [x] Test files colocated or in tests/ directory (tests/contract/ for contracts, tests/integration/012-* for scenarios)
- [x] Tests will use Vitest + Testing Library (existing test infrastructure)

### IV. Supabase Integration Patterns
- [x] RLS enabled on all new tables (no new tables, only mv_package_readiness view update; existing test_packages table has RLS)
- [x] Multi-tenant isolation via organization_id in policies (mv_package_readiness filters by project_id → organization_id via existing RLS)
- [x] TanStack Query wraps all Supabase calls (useCreatePackage, useUpdatePackage, usePackageComponents, usePackageReadiness)
- [x] Auth via AuthContext (no direct supabase.auth in components; hooks use supabase client from @/lib/supabase)
- [x] Database migrations will use `npx supabase db push --linked` (migration 00027 updates mv_package_readiness)
- [x] Realtime subscriptions cleaned up on unmount (N/A - no realtime needed, uses materialized view refresh)

### V. Specify Workflow Compliance
- [x] Feature has spec.md in specs/###-feature-name/ (specs/012-test-package-readiness/spec.md exists)
- [x] This plan.md follows template structure (using plan-template.md from .specify/templates/)
- [x] Tasks.md will be generated by /tasks command (Phase 2 execution)
- [x] Implementation will follow /implement workflow (tasks.md → implementation → commit)

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
src/
├── components/
│   ├── packages/
│   │   ├── PackageCard.tsx              # Existing (Feature 008)
│   │   ├── PackageFilters.tsx           # Existing (Feature 008)
│   │   ├── PackageDialog.tsx            # NEW: Create/Edit package dialog
│   │   └── PackageDetailHeader.tsx      # NEW: Package detail page header
│   ├── drawing-table/
│   │   ├── ComponentRow.tsx             # MODIFIED: Reused for package detail page
│   │   ├── InheritanceBadge.tsx         # REUSED: From Feature 011
│   │   └── AssignedBadge.tsx            # REUSED: From Feature 011
│   └── ui/
│       └── dialog.tsx                   # REUSED: Existing shadcn/ui component
├── hooks/
│   ├── usePackageReadiness.ts           # MODIFIED: Add description field to PackageCard
│   ├── useCreatePackage.ts              # NEW: TanStack Query mutation
│   ├── useUpdatePackage.ts              # NEW: TanStack Query mutation
│   └── usePackageComponents.ts          # NEW: Query for package detail page
├── pages/
│   ├── PackagesPage.tsx                 # MODIFIED: Add "New Package" button, PackageDialog
│   └── PackageDetailPage.tsx            # NEW: Drill-down page with component table
└── lib/
    └── metadata-inheritance.ts          # REUSED: getBadgeType, getTooltipText utilities

supabase/
└── migrations/
    └── 00027_fix_package_readiness_inheritance.sql  # NEW: COALESCE join for mv_package_readiness

tests/
├── contract/
│   ├── package-crud.contract.test.ts    # NEW: Create/Update RPC tests
│   └── package-components.contract.test.ts  # NEW: Component query tests
└── integration/
    └── 012-test-package-readiness/
        ├── package-create-edit.test.tsx  # NEW: CRUD workflow tests
        ├── package-detail-page.test.tsx  # NEW: Drill-down tests
        └── inheritance-fix.test.tsx      # NEW: Materialized view tests
```

**Structure Decision**: Web application (React SPA). This feature extends existing Feature 008 (Test Packages page) and Feature 011 (metadata inheritance). Reuses components/hooks/utilities wherever possible to avoid duplication. New files follow existing patterns: hooks in `src/hooks/`, pages in `src/pages/`, components in `src/components/packages/`, tests in `tests/contract/` and `tests/integration/`.

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh claude`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. **Load tasks template** from `.specify/templates/tasks-template.md`
2. **Generate from contracts** (Phase 1 artifacts):
   - Contract `materialized-view.contract.md` → Test task: Write failing test for BC-001 to BC-010
   - Contract `package-crud.contract.md` → Test tasks: BC-CREATE-001 to BC-CREATE-008, BC-UPDATE-001 to BC-UPDATE-009
   - Contract `package-components-query.contract.md` → Test tasks: BC-QUERY-001 to BC-QUERY-010, HC-001 to HC-005
3. **Generate from data model**:
   - Migration 00027: Create `mv_package_readiness` with COALESCE join
   - RPC functions: `create_test_package`, `update_test_package`
4. **Generate from quickstart scenarios**:
   - Integration test: Scenario 1 (inheritance fix verification)
   - Integration test: Scenario 2 (create package)
   - Integration test: Scenario 3 (edit package)
   - Integration test: Scenario 4 (drill-down page)
   - Integration test: Scenario 5 (component override)
   - Integration test: Scenario 6 (empty package)
5. **Generate implementation tasks**:
   - Hooks: useCreatePackage, useUpdatePackage, usePackageComponents
   - Components: PackageDialog, PackageDetailPage, PackageDetailHeader
   - Page modifications: PackagesPage (add New Package button)
   - Route: Add `/packages/:id/components` to App.tsx

**Ordering Strategy** (TDD sequence):
```
Phase A: Database Foundation (Sequential)
  1. Create migration 00027 (materialized view + RPC functions)
  2. Apply migration: `npx supabase db push --linked`
  3. Regenerate types: `npx supabase gen types typescript --linked`

Phase B: Contract Tests (Parallel - all must fail initially)
  4-6. [P] Write contract test: materialized-view-inheritance.contract.test.ts (BC-001 to BC-010)
  7-9. [P] Write contract test: package-crud.contract.test.ts (BC-CREATE-*, BC-UPDATE-*)
  10-12. [P] Write contract test: package-components-query.contract.test.ts (BC-QUERY-*, HC-*)

Phase C: Hooks Implementation (Sequential - make contract tests pass)
  13. Implement useCreatePackage (BC-CREATE tests pass)
  14. Implement useUpdatePackage (BC-UPDATE tests pass)
  15. Implement usePackageComponents (BC-QUERY, HC tests pass)
  16. Modify usePackageReadiness (add description field to PackageCard)

Phase D: UI Components (Parallel)
  17-18. [P] Create PackageDialog component (create/edit modes)
  19-20. [P] Create PackageDetailPage component
  21. [P] Create PackageDetailHeader component

Phase E: Integration (Sequential)
  22. Modify PackagesPage (add New Package button, integrate PackageDialog)
  23. Add route to App.tsx (/packages/:id/components → PackageDetailPage)
  24. Update PackageCard onClick handler (navigate to detail page)

Phase F: Integration Tests (Parallel)
  25-30. [P] Write integration tests for all 6 quickstart scenarios

Phase G: Validation (Sequential)
  31. Run all tests: `npm test`
  32. Execute quickstart.md manually
  33. Verify performance targets (page load <2s)
```

**Estimated Output**: 33 numbered, ordered tasks in tasks.md

**Dependencies**:
- Tasks 4-12 (contract tests) depend on Task 3 (type generation)
- Tasks 13-16 (hooks) depend on Tasks 4-12 (contract tests exist to verify)
- Tasks 17-21 (components) depend on Tasks 13-16 (hooks available)
- Tasks 22-24 (integration) depend on Tasks 17-21 (components exist)
- Tasks 25-30 (integration tests) can run in parallel
- Tasks 31-33 (validation) depend on all previous tasks

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

**No violations** - All constitutional principles satisfied:
- ✅ Type Safety: Strict mode, generated types, @/ aliases
- ✅ Component-Driven: Shadcn/ui patterns, single responsibility, TanStack Query
- ✅ Testing: TDD sequence (contract tests → implementation)
- ✅ Supabase: RLS via base tables, TanStack Query wrappers, remote-only migrations
- ✅ Specify Workflow: Following /plan → /tasks → /implement

**No complexity justifications needed**.


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) ✅ research.md created
- [x] Phase 1: Design complete (/plan command) ✅ data-model.md, contracts/, quickstart.md, CLAUDE.md updated
- [x] Phase 2: Task planning complete (/plan command - describe approach only) ✅ Ordering strategy documented
- [ ] Phase 3: Tasks generated (/tasks command) ⏳ Next step: Run `/tasks`
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS ✅ All 5 principles satisfied
- [x] Post-Design Constitution Check: PASS ✅ No new violations introduced
- [x] All NEEDS CLARIFICATION resolved ✅ No unknowns in Technical Context
- [x] Complexity deviations documented ✅ No deviations (none needed)

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
