
# Implementation Plan: Drawing & Component Metadata Assignment UI

**Branch**: `011-the-drawing-component` | **Date**: 2025-10-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/clachance14/projects/PipeTrak_V2/specs/011-the-drawing-component/spec.md`

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
Implement UI for assigning Areas, Systems, and Test Packages to drawings with automatic inheritance to components. Features include inline editing, bulk assignment (up to 50 drawings), component override capability, and optional metadata descriptions. Components inherit metadata from drawings unless explicitly overridden. Visual indicators distinguish inherited vs manually assigned values.

## Technical Context
**Language/Version**: TypeScript 5.6.2 (strict mode)
**Primary Dependencies**: React 18.3, TanStack Query 5.90, Radix UI (dialog, select, popover, checkbox, slider), Tailwind CSS v4
**Storage**: Supabase PostgreSQL (remote-only via RLS)
**Testing**: Vitest 3.2.4 + Testing Library (jsdom environment)
**Target Platform**: Web (Chrome/Firefox/Safari, desktop-first responsive)
**Project Type**: Web (React SPA with Supabase backend)
**Performance Goals**: <1s single drawing assignment, <10s bulk 50 drawings, <2s page load (500 drawings)
**Constraints**: Browser-based only (no mobile app), max 50 bulk operations, descriptions max 100 chars
**Scale/Scope**: Support 500+ drawings per project, 200 components per drawing, multi-tenant isolation via organization_id

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Type Safety First
- [x] TypeScript strict mode enabled (tsconfig.app.json: strict=true, noUncheckedIndexedAccess=true)
- [x] No `as` type assertions without justification in Complexity Tracking
- [x] Path aliases (`@/*`) used for imports (configured in tsconfig, vite, vitest)
- [x] Database types will be generated from Supabase schema (src/types/database.types.ts exists)

### II. Component-Driven Development
- [x] New UI components follow shadcn/ui patterns (Radix + Tailwind): DrawingAssignDialog, ComponentAssignDialog, DrawingBulkActions, etc.
- [x] Components maintain single responsibility (separate: dialogs, table rows, filters, bulk actions)
- [x] Server state via TanStack Query (useDrawingsWithProgress, useAreas, useSystems), client state via Zustand (useDrawingSelection)
- [x] No prop drilling beyond 2 levels (URL state via useSearchParams, global state via hooks)

### III. Testing Discipline
- [x] TDD approach confirmed (contract tests before implementation per spec Scenario 9)
- [x] Integration tests cover spec acceptance scenarios (all 9 scenarios)
- [x] Test files in tests/contract/ directory (metadata-description.contract.test.ts, drawing-assignment.contract.test.ts)
- [x] Tests will use Vitest + Testing Library (existing pattern established)

### IV. Supabase Integration Patterns
- [x] RLS enabled on all new tables (areas/systems/test_packages tables already have RLS, description column is additive)
- [x] Multi-tenant isolation via organization_id in policies (existing RLS policies filter by organization_id)
- [x] TanStack Query wraps all Supabase calls (useAssignDrawings, useUpdateArea mutations)
- [x] Auth via AuthContext (no direct supabase.auth in components)
- [x] Database migrations will use `npx supabase db push --linked` (remote-only workflow established)
- [x] Realtime subscriptions cleaned up on unmount (N/A - feature uses polling/invalidation only)

### V. Specify Workflow Compliance
- [x] Feature has spec.md in specs/011-the-drawing-component/
- [x] This plan.md follows template structure
- [x] Tasks.md will be generated by /tasks command
- [x] Implementation will follow /implement workflow

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
│   ├── drawing-table/              # Existing (Feature 010)
│   │   ├── DrawingTable.tsx
│   │   ├── DrawingRow.tsx
│   │   ├── ComponentRow.tsx
│   │   └── [NEW] DrawingAssignDialog.tsx
│   │   └── [NEW] DrawingBulkActions.tsx
│   │   └── [NEW] DrawingTableHeader.tsx (with Select Mode toggle)
│   ├── [NEW] ComponentAssignDialog.tsx
│   ├── [NEW] MetadataDescriptionEditor.tsx (quick-edit popover)
│   └── ui/                          # Shadcn/ui components
│       ├── dialog.tsx               # Existing
│       ├── select.tsx               # Existing (enhanced for descriptions)
│       ├── popover.tsx              # Existing
│       └── checkbox.tsx             # Existing
├── hooks/
│   ├── [NEW] useAssignDrawings.ts   # Bulk/single drawing assignment mutation
│   ├── [NEW] useDrawingSelection.ts # Zustand store for selection state
│   ├── [NEW] useUpdateArea.ts       # Area description update mutation
│   ├── [NEW] useUpdateSystem.ts     # System description update mutation
│   └── [NEW] useUpdateTestPackage.ts # Test package description update mutation
│   ├── useAreas.ts                  # Existing (fetch with description)
│   ├── useSystems.ts                # Existing (fetch with description)
│   └── useTestPackages.ts           # Existing (fetch with description)
├── lib/
│   └── [NEW] metadata-inheritance.ts # Inheritance detection logic
└── types/
    └── database.types.ts            # Generated from Supabase (updated)
    └── [NEW] drawing-table.types.ts # DrawingRow, InheritanceStatus, etc.

tests/
├── contract/
│   ├── [NEW] drawing-assignment.contract.test.ts    # Scenarios 1-2, 6-8
│   ├── [NEW] component-override.contract.test.ts    # Scenarios 4-5
│   ├── [NEW] inheritance-detection.contract.test.ts # Scenario 3
│   ├── [NEW] drawing-selection.contract.test.ts     # Selection state management
│   └── [NEW] metadata-description.contract.test.ts  # Scenario 9
└── integration/
    └── (existing scenario tests from Feature 010)

supabase/
└── migrations/
    └── [NEW] 00025_add_metadata_descriptions.sql  # Add description columns
    └── [NEW] 00026_assign_drawing_metadata.sql    # Batch assignment function
```

**Structure Decision**: Web application (React SPA). This feature extends the existing drawing table (Feature 010) with assignment dialogs and metadata description editing. Uses established patterns: components in src/components/, hooks in src/hooks/, contract tests in tests/contract/.

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
The /tasks command will generate tasks.md by:

1. **Database Layer** (from data-model.md):
   - Migration task: Add description columns to areas/systems/test_packages
   - Migration task: Create assign_drawing_metadata() RPC function
   - Migration task: Create bulk_assign_drawings() RPC function
   - Type generation: Update database.types.ts from schema

2. **Contract Tests** (from contracts/):
   - Contract test: drawing-assignment.contract.test.ts (12 tests)
   - Contract test: component-override.contract.test.ts (7 tests)
   - Contract test: metadata-description.contract.test.ts (8 tests)
   - Contract test: inheritance-detection.contract.test.ts (10 tests)
   - Contract test: drawing-selection.contract.test.ts (8 tests)

3. **Type Definitions** (from data-model.md TypeScript section):
   - Types: drawing-table.types.ts (DrawingRow, ComponentRow, InheritanceStatus, payloads)

4. **Hooks Layer** (TDD: tests before implementation):
   - Hook: useAssignDrawings.ts (single + bulk assignment mutations)
   - Hook: useDrawingSelection.ts (Zustand store with URL sync)
   - Hook: useUpdateArea.ts / useUpdateSystem.ts / useUpdateTestPackage.ts (description mutations)
   - Update: useAreas.ts / useSystems.ts / useTestPackages.ts (include description in SELECT)

5. **Components Layer** (TDD: tests before implementation):
   - Component: DrawingAssignDialog.tsx (single drawing assignment)
   - Component: DrawingBulkActions.tsx (bulk assignment toolbar + dialog)
   - Component: DrawingTableHeader.tsx (Select Mode toggle)
   - Component: ComponentAssignDialog.tsx (override component metadata)
   - Component: MetadataDescriptionEditor.tsx (quick-edit popover)
   - Update: Select component (enhance for two-line display with descriptions)

6. **Integration Layer**:
   - Utility: metadata-inheritance.ts (detectInheritance() function)
   - Update: DrawingRow.tsx (add pencil icon, wire up dialog)
   - Update: ComponentRow.tsx (add pencil icon, wire up dialog, inheritance badges)

**Ordering Strategy**:
1. Database migrations (blocking - needed for types)
2. Type generation (blocking - needed for hooks/components)
3. Contract tests [P] (parallel - independent files)
4. Type definitions [P] (parallel - independent files)
5. Utility functions + tests (metadata-inheritance.ts)
6. Hooks + tests [P] (parallel where no dependencies)
7. Components + tests (dependency order: dialogs before table integration)
8. Integration updates (wire up UI to hooks)

**TDD Enforcement**:
- Every hook task includes: "Write test file first (RED), then implementation (GREEN)"
- Every component task includes: "Write contract test first (RED), then implementation (GREEN)"
- Integration tests validate end-to-end scenarios from quickstart.md

**Estimated Output**: 35-40 numbered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

**No violations** - All constitutional requirements satisfied:
- TypeScript strict mode: ✅ Enabled
- Component-driven development: ✅ Radix UI + shadcn/ui patterns
- TDD: ✅ Contract tests before implementation
- Supabase patterns: ✅ RLS, TanStack Query, remote-only migrations
- Specify workflow: ✅ Spec → Plan → Tasks → Implement


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) → research.md generated
- [x] Phase 1: Design complete (/plan command) → data-model.md, contracts/, quickstart.md, CLAUDE.md updated
- [x] Phase 2: Task planning complete (/plan command - describe approach only) → 35-40 task strategy documented
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (all requirements satisfied)
- [x] Post-Design Constitution Check: PASS (no new violations introduced)
- [x] All NEEDS CLARIFICATION resolved (Technical Context fully populated)
- [x] Complexity deviations documented (none - no violations)

**Artifacts Generated**:
- ✅ `/specs/011-the-drawing-component/research.md` (7 technical decisions)
- ✅ `/specs/011-the-drawing-component/data-model.md` (5 entities + types + migrations)
- ✅ `/specs/011-the-drawing-component/quickstart.md` (7 test scenarios + performance validation)
- ✅ `/specs/011-the-drawing-component/contracts/drawing-assignment.contract.ts` (12 test stubs)
- ✅ `/specs/011-the-drawing-component/contracts/component-override.contract.ts` (7 test stubs)
- ✅ `/specs/011-the-drawing-component/contracts/metadata-description.contract.ts` (8 test stubs)
- ✅ `/CLAUDE.md` (updated with Feature 011 context)

**Next Command**: Run `/tasks` to generate tasks.md from Phase 1 design artifacts

---
*Based on Constitution v1.0.1 - See `.specify/memory/constitution.md`*
