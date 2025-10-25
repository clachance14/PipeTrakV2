
# Implementation Plan: Field Weld QC Module

**Branch**: `014-add-comprehensive-field` | **Date**: 2025-10-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/clachance14/projects/PipeTrak_V2/specs/014-add-comprehensive-field/spec.md`

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
Add comprehensive field weld tracking to PipeTrak V2, replacing Excel-based weld logs with an integrated QC workflow. Field welds become a first-class component type with dedicated tracking for welder assignment, NDE inspection, and repair management. System supports bulk CSV import (2000 welds in <30s), real-time progress updates, welder registry management, and repair chain tracking. Field welds integrate with existing drawing/package/system progress rollup calculations.

## Technical Context
**Language/Version**: TypeScript 5 (strict mode), React 18
**Primary Dependencies**: Supabase (PostgreSQL, Auth, Storage), TanStack Query v5, Radix UI, Tailwind CSS v4, Vite, Vitest + Testing Library
**Storage**: Supabase PostgreSQL with Row Level Security (RLS), multi-tenant via organization_id
**Testing**: Vitest with jsdom, contract tests for RLS policies, integration tests for user workflows
**Target Platform**: Web (desktop + tablet-optimized for field foremen on tablets)
**Project Type**: Web application (React SPA + Supabase backend)
**Performance Goals**: Milestone update <2s, drawing table load <3s, search <1s, CSV import 2000 welds <30s
**Constraints**: Max 5,000 welds per project, 100 welds per drawing, 50 welders per project; Last write wins for concurrent updates
**Scale/Scope**: Small-to-medium construction projects, extends existing component tracking (58 FRs, 4 entities, 6 acceptance scenarios)

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Type Safety First
- [x] TypeScript strict mode enabled (verified in tsconfig.json per CLAUDE.md)
- [x] No `as` type assertions without justification in Complexity Tracking
- [x] Path aliases (`@/*`) used for imports (already configured)
- [x] Database types will be generated from Supabase schema (`npx supabase gen types typescript --linked`)

### II. Component-Driven Development
- [x] New UI components follow shadcn/ui patterns (Radix + Tailwind) - WelderForm, AssignWelderDialog, RecordNDEDialog, CreateRepairDialog use Radix primitives
- [x] Components maintain single responsibility - separate dialogs for assign welder, record NDE, create repair
- [x] Server state via TanStack Query, client state via Zustand - field welds/welders fetched via TanStack Query
- [x] No prop drilling beyond 2 levels - hooks pattern for data access (useFieldWelds, useWelders, useAssignWelder, useRecordNDE)

### III. Testing Discipline
- [x] TDD approach confirmed (tests before implementation) - contract tests for RLS, integration tests for 6 acceptance scenarios
- [x] Integration tests cover spec acceptance scenarios - Scenario 1-6 from spec.md mapped to test files
- [x] Test files colocated or in tests/ directory - tests/contract/field-welds/, tests/integration/field-welds/
- [x] Tests will use Vitest + Testing Library - configured in vitest.config.ts

### IV. Supabase Integration Patterns
- [x] RLS enabled on all new tables - field_welds and welders tables will have RLS policies
- [x] Multi-tenant isolation via organization_id in policies - field_welds.project_id→projects.organization_id, welders.project_id→projects.organization_id
- [x] TanStack Query wraps all Supabase calls - useFieldWelds, useWelders, useImportFieldWelds hooks
- [x] Auth via AuthContext (no direct supabase.auth in components) - existing pattern maintained
- [x] Database migrations will use `npx supabase db push --linked` (remote-only) - per constitution v1.0.1
- [x] Realtime subscriptions cleaned up on unmount (if applicable) - Not required for initial release (polling via TanStack Query sufficient)

### V. Specify Workflow Compliance
- [x] Feature has spec.md in specs/###-feature-name/ - specs/014-add-comprehensive-field/spec.md exists
- [x] This plan.md follows template structure - executing plan template now
- [x] Tasks.md will be generated by /tasks command - Phase 2 describes approach
- [x] Implementation will follow /implement workflow - /implement will execute tasks.md

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
│   ├── field-welds/
│   │   ├── AssignWelderDialog.tsx
│   │   ├── RecordNDEDialog.tsx
│   │   ├── CreateRepairDialog.tsx
│   │   ├── FieldWeldRow.tsx          # extends ComponentRow with weld-specific columns
│   │   └── RepairHistory.tsx
│   ├── welders/
│   │   ├── WelderForm.tsx
│   │   └── WelderList.tsx
│   └── ui/                             # existing shadcn/ui components
├── hooks/
│   ├── useFieldWelds.ts                # fetch field welds for drawing/project
│   ├── useWelders.ts                   # fetch welders, add welder
│   ├── useAssignWelder.ts              # assign welder to weld
│   ├── useRecordNDE.ts                 # record NDE result
│   ├── useCreateRepairWeld.ts          # create repair weld
│   └── useImportFieldWelds.ts          # CSV import mutation
├── pages/
│   ├── DrawingComponentTablePage.tsx   # existing, will show field welds
│   └── WeldersPage.tsx                 # new welder management page
├── lib/
│   ├── field-weld-utils.ts             # progress calc, repair chain utils
│   └── supabase.ts                     # existing client
└── types/
    └── database.types.ts               # regenerated with field_welds, welders tables

supabase/
├── migrations/
│   ├── 00033_create_field_welds.sql
│   └── 00034_field_weld_progress_template.sql
└── functions/
    └── import-field-welds/             # Edge Function for CSV processing
        ├── index.ts
        └── import_map.json

tests/
├── contract/
│   └── field-welds/
│       ├── rls-policies.contract.test.ts
│       ├── weld-identity.contract.test.ts
│       └── progress-rollup.contract.test.ts
└── integration/
    └── field-welds/
        ├── scenario-1-bulk-import.test.tsx
        ├── scenario-2-assign-welder.test.tsx
        ├── scenario-3-nde-pass.test.tsx
        ├── scenario-4-nde-fail-repair.test.tsx
        ├── scenario-5-view-progress.test.tsx
        └── scenario-6-manage-welders.test.tsx
```

**Structure Decision**: React SPA (single project) with Supabase backend. Field weld components colocated in `src/components/field-welds/`, custom hooks in `src/hooks/`, integration with existing drawing table. Database migrations in `supabase/migrations/`, CSV import via Supabase Edge Function. Tests organized by contract (RLS, identity rules) and integration (user scenarios 1-6).

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
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (data-model.md, contracts/, quickstart.md)
- **Database tasks** (migrations 00035-00038 from data-model.md):
  1. Create field_welds table with indexes
  2. Create welders table with RLS
  3. Create triggers (handle_weld_rejection, auto_start_repair_welds, update_field_weld_timestamp)
  4. Create Field Weld progress template
  5. Generate TypeScript types from schema
- **Contract test tasks** (61 tests from contracts/):
  - RLS policies (23 tests) → rls-policies.contract.test.ts [P]
  - Weld identity (18 tests) → weld-identity.contract.test.ts [P]
  - Progress rollup (20 tests) → progress-rollup.contract.test.ts [P]
- **Hook tasks** (TanStack Query):
  - useFieldWelds (fetch all welds for project with joins - used by WeldLogPage)
  - useWelders (fetch welders, add welder)
  - useAssignWelder (assign welder mutation)
  - useRecordNDE (record NDE result mutation)
  - useCreateRepairWeld (create repair weld mutation)
  - useImportFieldWelds (CSV import mutation)
- **UI Component tasks**:
  - WelderForm, WelderList (welder management) [P]
  - AssignWelderDialog (triggered on "Weld Complete")
  - RecordNDEDialog (QC inspector NDE recording)
  - CreateRepairDialog (triggered on NDE FAIL)
  - FieldWeldRow (extends ComponentRow with weld columns)
  - RepairHistory (repair chain display)
  - WeldLogTable (flat table for all field welds with sorting/filtering)
  - WeldLogFilters (filter controls: search, drawing, welder, status, package, system)
- **Page tasks**:
  - WeldersPage (/welders route)
  - DrawingComponentTablePage enhancements (field weld filter, weld columns)
  - WeldLogPage (/weld-log route - QC-focused flat weld table)
- **Edge Function tasks**:
  - import-field-welds/ (CSV parsing, validation, transaction)
- **Integration test tasks** (7 scenarios from quickstart.md):
  - Scenario 1: Bulk import 2000 welds
  - Scenario 2: Assign welder to completed weld
  - Scenario 3: Record passing NDE
  - Scenario 4: Record failing NDE, create repair
  - Scenario 5: View weld progress in drawing table
  - Scenario 6: Manage welder registry
  - Scenario 7: QC inspector views weld log

**Ordering Strategy**:
- **Phase 1**: Database (migrations → types) - SEQUENTIAL (migrations depend on each other)
- **Phase 2**: Contract tests (3 test files) - PARALLEL [P] (independent)
- **Phase 3**: Hooks (6 custom hooks) - SEQUENTIAL (some hooks depend on others)
- **Phase 4**: UI Components - PARALLEL [P] where independent (WelderForm/List independent of dialogs)
- **Phase 5**: Pages (WeldersPage, DrawingComponentTablePage) - SEQUENTIAL (depend on hooks + components)
- **Phase 6**: Edge Function (import-field-welds) - SEQUENTIAL (depends on database + hooks)
- **Phase 7**: Integration tests (7 scenarios) - PARALLEL [P] (independent scenarios)
- **Phase 8**: Weld Log Feature (WeldLogPage, WeldLogTable, WeldLogFilters) - SEQUENTIAL (depends on useFieldWelds hook)

**TDD Enforcement**:
- Contract tests written BEFORE migrations (tests fail initially)
- Integration tests written BEFORE UI components (tests fail initially)
- All tests must fail before implementation begins (Red-Green-Refactor)

**Estimated Output**: 50-55 numbered, ordered tasks in tasks.md (includes Weld Log feature - 9 additional tasks)

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

**No violations** - All constitutional principles followed in design phase.


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - research.md generated with 10 design decisions
- [x] Phase 1: Design complete (/plan command) - data-model.md, contracts/ (61 test stubs), quickstart.md generated
- [x] Phase 2: Task planning complete (/plan command - describe approach only) - 40-45 tasks estimated, 7 phases defined
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (all 5 principles checked)
- [x] Post-Design Constitution Check: PASS (no new violations)
- [x] All NEEDS CLARIFICATION resolved (Technical Context has zero NEEDS CLARIFICATION markers)
- [x] Complexity deviations documented (none - no violations)

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
