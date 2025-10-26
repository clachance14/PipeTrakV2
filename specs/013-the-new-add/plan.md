
# Implementation Plan: Add New Project

**Branch**: `013-the-new-add` | **Date**: 2025-10-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/013-the-new-add/spec.md`

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
Enable users to quickly create new construction projects from the navbar dropdown. Selecting "Add New Project" navigates to a dedicated form page where users enter project name and description (both required). On successful creation, the new project is automatically selected and the user is redirected to the home page. This feature leverages existing `useCreateProject()` hook and `ProjectContext` for state management, requiring only UI components and routing changes.

## Technical Context
**Language/Version**: TypeScript 5 (strict mode enabled)
**Primary Dependencies**: React 18, React Router v7, TanStack Query v5, Supabase JS v2
**Storage**: Supabase PostgreSQL (existing `projects` table, no schema changes)
**Testing**: Vitest + Testing Library (jsdom environment)
**Target Platform**: Web browsers (Chrome, Firefox, Safari, Edge - latest 2 versions)
**Project Type**: Single-page web application (React SPA)
**Performance Goals**: <1s page navigation, <500ms form submission response
**Constraints**: Client-side form validation (no backend changes), mobile-responsive design
**Scale/Scope**: 1 new page component, 2 modified components (Layout, App), ~5 tests

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Type Safety First
- [x] TypeScript strict mode enabled (verified in tsconfig.app.json: `strict: true`, `noUncheckedIndexedAccess: true`)
- [x] No `as` type assertions without justification in Complexity Tracking (form handling uses controlled inputs with proper typing)
- [x] Path aliases (`@/*`) used for imports (verified in tsconfig.app.json paths)
- [x] Database types will be generated from Supabase schema (no schema changes, using existing types)

### II. Component-Driven Development
- [x] New UI components follow shadcn/ui patterns (CreateProjectPage will use existing Button, Input, Textarea from shadcn)
- [x] Components maintain single responsibility (CreateProjectPage = form logic, Layout = navigation, App = routing)
- [x] Server state via TanStack Query, client state via Zustand (using existing `useCreateProject()` TanStack Query mutation, ProjectContext for selection state)
- [x] No prop drilling beyond 2 levels (direct context access via `useProject()` and `useAuth()` hooks)

### III. Testing Discipline
- [x] TDD approach confirmed (tests before implementation)
- [x] Integration tests cover spec acceptance scenarios (7 scenarios from spec → 7 test cases)
- [x] Test files colocated or in tests/ directory (CreateProjectPage.test.tsx colocated with CreateProjectPage.tsx)
- [x] Tests will use Vitest + Testing Library (existing test infrastructure)

### IV. Supabase Integration Patterns
- [x] RLS enabled on all new tables (N/A - no new tables, using existing `projects` table with RLS already enabled)
- [x] Multi-tenant isolation via organization_id in policies (N/A - existing RLS policies on `projects` table enforce this)
- [x] TanStack Query wraps all Supabase calls (using existing `useCreateProject()` hook from `src/hooks/useProjects.ts`)
- [x] Auth via AuthContext (no direct supabase.auth in components) (form page will use `useAuth()` hook for user context)
- [x] Database migrations will use `npx supabase db push --linked` (remote-only) (N/A - no database changes)
- [x] Realtime subscriptions cleaned up on unmount (if applicable) (N/A - no realtime subscriptions in this feature)

### V. Specify Workflow Compliance
- [x] Feature has spec.md in specs/###-feature-name/ (specs/013-the-new-add/spec.md exists)
- [x] This plan.md follows template structure (using official template from .specify/templates/plan-template.md)
- [x] Tasks.md will be generated by /tasks command (Phase 2 approach documented below)
- [x] Implementation will follow /implement workflow (execution via /implement or manual TDD)

## Project Structure

### Documentation (this feature)
```
specs/013-the-new-add/
├── spec.md              # Feature specification (completed)
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
│   ├── Layout.tsx          # MODIFIED: Add "Add New Project" option to dropdown
│   └── ProtectedRoute.tsx  # EXISTING: Used to protect new route
├── pages/
│   └── CreateProjectPage.tsx  # NEW: Project creation form page
├── contexts/
│   ├── AuthContext.tsx     # EXISTING: Provides user auth state
│   └── ProjectContext.tsx  # EXISTING: Manages selected project state
├── hooks/
│   └── useProjects.ts      # EXISTING: useCreateProject() mutation already exists
├── App.tsx                 # MODIFIED: Add /projects/new route
└── types/
    └── database.types.ts   # EXISTING: Generated Supabase types

tests/
└── pages/
    └── CreateProjectPage.test.tsx  # NEW: Component tests for form
```

**Structure Decision**: React SPA (single-page web application). All code lives in `src/` with pages, components, hooks, and contexts following existing patterns. No backend changes required - leveraging existing `useCreateProject()` hook and Supabase RLS policies.

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
- Generate tasks from Phase 1 design docs (contracts/README.md, quickstart.md)
- Each component contract (6 contracts) → contract test task
- Each UI component (Layout, CreateProjectPage, App) → implementation task
- Integration test task covering full user flow

**Ordering Strategy (TDD)**:
1. **Contract Tests First** (Red): Write failing tests for each contract
   - CreateProjectPage form validation tests
   - CreateProjectPage successful creation test
   - CreateProjectPage failed creation test
   - CreateProjectPage cancel test
   - CreateProjectPage loading state test
   - Layout dropdown navigation test

2. **Implementation Second** (Green): Write minimal code to pass tests
   - Create CreateProjectPage component (form logic)
   - Modify Layout component (add dropdown option + navigation)
   - Modify App component (add route)

3. **Integration Tests Third**: Validate end-to-end flow
   - Full user journey from dropdown → form → creation → home

**Task Parallelization**:
- [P] marks indicate tasks that can run in parallel
- Contract tests are independent (can be written concurrently)
- Implementation tasks have dependencies (Layout and App must be done before integration test)

**Estimated Output**: ~12-15 numbered, ordered tasks in tasks.md
- 6 contract test tasks
- 3 implementation tasks
- 1 integration test task
- 1-2 verification/documentation tasks

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

**No violations**: This feature fully complies with all constitution principles. No complexity deviations documented.

---

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - research.md generated
- [x] Phase 1: Design complete (/plan command) - data-model.md, contracts/README.md, quickstart.md generated
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (all 5 principles satisfied)
- [x] Post-Design Constitution Check: PASS (no new violations introduced)
- [x] All NEEDS CLARIFICATION resolved (Technical Context has no unknowns)
- [x] Complexity deviations documented (none required)

---
*Based on Constitution v1.0.1 - See `.specify/memory/constitution.md`*
