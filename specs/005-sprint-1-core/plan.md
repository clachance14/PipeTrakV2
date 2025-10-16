
# Implementation Plan: Sprint 1 - Core Foundation Database Expansion

**Branch**: `005-sprint-1-core` | **Date**: 2025-10-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/clachance14/projects/PipeTrak_V2/specs/005-sprint-1-core/spec.md`

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
Expand PipeTrak V2 database from 4 to 14 tables to enable comprehensive pipe component tracking for brownfield construction. This sprint establishes the data foundation for tracking 1M+ components across 11 component types (spool, field_weld, support, valve, fitting, flange, instrument, tubing, hose, misc_component, threaded_pipe) with automated progress calculation, multi-tenant RLS isolation, drawing similarity detection, welder registry, field weld QC inspection tracking, exception handling queue, and full audit trail. Sprint 1 focuses exclusively on database schema, stored procedures, materialized views, and basic CRUD operations—import pipeline deferred to Sprint 2.

## Technical Context
**Language/Version**: TypeScript 5.x (strict mode), PostgreSQL 15+ (via Supabase), PL/pgSQL for stored procedures
**Primary Dependencies**: Supabase SDK, TanStack Query v5, Zustand, Vitest 3, Testing Library, pg_trgm extension
**Storage**: Supabase (PostgreSQL 15+) with 14 tables, 2 materialized views, JSONB columns for flexible data, ~600MB table + 210MB indexes
**Testing**: Vitest 3 + Testing Library (jsdom), contract tests, integration tests (RLS validation), stored procedure tests
**Target Platform**: Web application (Chrome 90+, Edge 90+, Firefox 88+), Vercel deployment
**Project Type**: Web (React 18 SPA + Supabase backend)
**Performance Goals**: p90 <100ms for single component lookup, p95 <50ms for dashboard queries (via materialized views), 1M+ component capacity
**Constraints**: Multi-tenant RLS isolation (organization_id filtering), materialized view 60-second refresh latency acceptable, no real-time requirements
**Scale/Scope**: 14 database tables, 11 progress templates seeded, 60 functional requirements, ~11-12 TanStack Query hooks, ~5-7 contract tests, database-only scope (UI minimal for Sprint 1)

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Type Safety First
- [x] TypeScript strict mode enabled (existing tsconfig.json has strict: true)
- [x] No `as` type assertions without justification - database schema validation via JSONB + CHECK constraints
- [x] Path aliases (`@/*`) used for imports (existing vite.config.ts, tsconfig.app.json configured)
- [x] Database types will be generated from Supabase schema using `npx supabase gen types typescript`

### II. Component-Driven Development
- [x] New UI components follow shadcn/ui patterns (Radix + Tailwind) - Sprint 1 focuses on database, minimal UI
- [x] Components maintain single responsibility - Basic ProjectListPage, ComponentsTable (read-only, non-virtualized <100 rows)
- [x] Server state via TanStack Query, client state via Zustand - TanStack Query hooks for all Supabase queries
- [x] No prop drilling beyond 2 levels - minimal UI in Sprint 1, tree navigation deferred to Sprint 3

### III. Testing Discipline
- [x] TDD approach confirmed - tests written before implementation per Phase 2 tasks ordering
- [x] Integration tests cover spec acceptance scenarios - 18 scenarios from spec → integration test files
- [x] Test files colocated or in tests/ directory - tests/integration/rls/, tests/contract/
- [x] Tests will use Vitest + Testing Library (existing setup, globals enabled)

### IV. Supabase Integration Patterns
- [x] RLS enabled on all new tables - 11 new tables all require RLS (FR-027, FR-028, FR-029, FR-060)
- [x] Multi-tenant isolation via organization_id in policies - All queries filter by users.organization_id (Feature 004 single-org model)
- [x] TanStack Query wraps all Supabase calls - useComponents, useDrawings, useFieldWeldInspections, useProjects, etc.
- [x] Auth via AuthContext (no direct supabase.auth in components) - existing AuthContext from Feature 001
- [x] Realtime subscriptions cleaned up on unmount - Not applicable for Sprint 1 (no realtime features)

### V. Specify Workflow Compliance
- [x] Feature has spec.md in specs/005-sprint-1-core/
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
├── components/           # Business components (existing)
│   └── ui/              # shadcn/ui primitives (existing)
├── contexts/            # React contexts (existing AuthContext)
├── hooks/               # Custom React hooks (NEW in Sprint 1)
│   ├── useProjects.ts            # Project CRUD operations
│   ├── useDrawings.ts            # Drawing management + similarity detection
│   ├── useComponents.ts          # Component CRUD + milestone updates
│   ├── useAreas.ts               # Area assignment management
│   ├── useSystems.ts             # System assignment management
│   ├── useTestPackages.ts        # Test package + readiness view
│   ├── useWelders.ts             # Welder registry + verification
│   ├── useFieldWeldInspections.ts # QC tracking for field welds (hydro, PMI, PWHT, x-ray, repairs)
│   ├── useNeedsReview.ts         # Exception queue management
│   └── useAuditLog.ts            # Audit trail queries (read-only)
├── lib/                 # Utilities (existing supabase.ts, permissions.ts from Feature 004)
│   └── validation.ts    # NEW: Validation helpers (FR-041 to FR-046)
├── pages/               # Page components (existing)
│   ├── ProjectListPage.tsx      # UPDATED: Connect to useProjects hook
│   └── ComponentsTable.tsx      # NEW: Basic component list (read-only, <100 rows)
└── types/               # TypeScript types (existing)
    └── database.types.ts    # REGENERATED from Supabase schema

supabase/
└── migrations/
    ├── 00008_single_org_refactor.sql  # Existing (Feature 004)
    └── 00009_sprint1_core_tables.sql  # NEW: 11 tables + indexes + RLS + stored procedures + materialized views + seed data

tests/
├── contract/                 # Contract tests (NEW in Sprint 1)
│   ├── hooks-api.test.ts        # TanStack Query hook contracts
│   ├── database-schema.test.ts  # Table/column/constraint validation
│   └── stored-procedures.test.ts # calculate_component_percent(), detect_similar_drawings()
├── integration/              # Integration tests (NEW in Sprint 1)
│   ├── rls/
│   │   └── multi-tenant.test.ts # RLS policy validation (18 scenarios from spec)
│   └── permissions/
│       └── role-checks.test.ts   # Permission enforcement (FR-047)
└── setup.ts                 # Existing test setup (Vitest globals, Supabase mocks)
```

**Structure Decision**: React 18 SPA with Supabase backend (Web application, Option 2 frontend-only). Sprint 1 adds 10 TanStack Query hooks (src/hooks/), 1 validation utility (src/lib/validation.ts), 1 massive migration file (supabase/migrations/00009), contract tests (tests/contract/), and RLS integration tests (tests/integration/rls/). UI is minimal—basic ProjectListPage connection and read-only ComponentsTable for testing database queries. Import UI, tree navigation, and virtualization deferred to future sprints.

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
The `/tasks` command will generate a comprehensive, ordered task list following TDD principles:

1. **Contract Test Tasks** (from contracts/):
   - T001 [P]: Write database schema validation tests (contracts/database-schema.test.ts) - validate all 14 tables, indexes, constraints
   - T002 [P]: Write stored procedure contract tests (contracts/stored-procedures.test.ts) - validate 5 functions (calculate_component_percent, detect_similar_drawings, get_weld_repair_history, etc.)
   - T003 [P]: Write hook API contract tests (contracts/hooks-api.test.ts) - validate 10 hook signatures (useProjects, useComponents, useFieldWeldInspections, etc.)

2. **Integration Test Tasks** (from spec.md acceptance scenarios):
   - T004 [P]: Write RLS multi-tenant isolation tests (tests/integration/rls/multi-tenant.test.ts) - 18 scenarios from spec
   - T005 [P]: Write permission enforcement tests (tests/integration/permissions/role-checks.test.ts) - FR-047 permission matrix validation

3. **Migration Implementation** (must run BEFORE tests can pass):
   - T006: Create migration file `00009_sprint1_core_tables.sql`:
     - Add pg_trgm extension
     - Create 11 new tables (drawings, areas, systems, test_packages, progress_templates, components, milestone_events, welders, field_weld_inspections, needs_review, audit_log)
     - Add indexes (53 total)
     - Create RLS policies (11 tables)
     - Create stored procedures (5 functions)
     - Create materialized views (2 views)
     - Seed progress templates (11 rows)
     - Add CHECK constraints (identity_key validation, milestone weight validation, weld repair tracking)
     - Add triggers (update_component_percent_on_milestone_change, update_weld_inspection_timestamp)
   - T007: Run migration locally: `supabase db push`
   - T008: Regenerate TypeScript types: `npx supabase gen types typescript --linked > src/types/database.types.ts`
   - T009: Verify all contract tests now pass (schema, stored procedures)

4. **Validation Utility Implementation**:
   - T010: Create validation helpers in `src/lib/validation.ts` - FR-041 to FR-046 validation functions

5. **Hook Implementation Tasks** (from contracts/hooks-api.md):
   - T011 [P]: Implement useProjects hook (src/hooks/useProjects.ts)
   - T012 [P]: Implement useDrawings hook (src/hooks/useDrawings.ts) - includes similarity detection
   - T013 [P]: Implement useComponents hook (src/hooks/useComponents.ts) - includes milestone updates
   - T014 [P]: Implement useAreas hook (src/hooks/useAreas.ts)
   - T015 [P]: Implement useSystems hook (src/hooks/useSystems.ts)
   - T016 [P]: Implement useTestPackages hook (src/hooks/useTestPackages.ts) - includes readiness view
   - T017 [P]: Implement useWelders hook (src/hooks/useWelders.ts)
   - T018 [P]: Implement useFieldWeldInspections hook (src/hooks/useFieldWeldInspections.ts) - QC tracking, repairs, x-ray flagging
   - T019 [P]: Implement useNeedsReview hook (src/hooks/useNeedsReview.ts)
   - T020 [P]: Implement useAuditLog hook (src/hooks/useAuditLog.ts)
   - T021 [P]: Implement useRefreshDashboards hook (src/hooks/useRefreshDashboards.ts)

6. **UI Implementation Tasks** (minimal for Sprint 1):
   - T022: Update ProjectListPage to connect to useProjects hook (src/pages/ProjectListPage.tsx)
   - T023: Create ComponentsTable (src/pages/ComponentsTable.tsx) - read-only, <100 rows for testing

7. **Integration Test Validation**:
   - T024: Run RLS integration tests - verify all 18 scenarios pass
   - T025: Run permission integration tests - verify FR-047 enforced
   - T026: Run quickstart.md validation steps 1-12

8. **Polish & Documentation**:
   - T027: Run full test suite with coverage: `npm test -- --coverage` - verify ≥70% overall, ≥80% lib/
   - T028: Run type check: `tsc -b` - verify 0 errors
   - T029: Run linter: `npm run lint` - fix any issues
   - T030: Run build: `npm run build` - verify production build succeeds
   - T031: Update PROJECT-STATUS.md with Sprint 1 completion

**Ordering Strategy (TDD Strict)**:
1. Contract tests FIRST (T001-T005) - must fail initially
2. Migration implementation (T006-T009) - enables tests to pass
3. Application code (T010-T023) - hook and UI implementation
4. Validation (T024-T026) - verify all acceptance scenarios pass
5. Polish (T027-T031) - final checks and documentation

**Parallel Execution Markers**:
- [P] indicates tasks can run in parallel (different files, no dependencies)
- Contract tests (T001-T003) can run in parallel
- Integration test writing (T004-T005) can run in parallel
- Hook implementations (T011-T021) can run in parallel after migration complete

**Estimated Task Count**: 29-33 tasks

**Critical Path**:
- Contract tests (T001-T005) → Migration (T006-T009) → Hooks (T011-T021) → Integration validation (T024-T026) → Polish (T027-T031)
- Total estimated time: 13-17 hours (10-13 hours per original estimate, adding 3-4 hours for field weld inspection workflow + test debugging)

**Success Criteria** (from spec.md):
- All 11 new tables exist with indexes and RLS policies ✅ (T006-T009)
- 11 progress templates seeded with validated weights ✅ (T006)
- Component percent complete auto-calculates when milestones change ✅ (T006 trigger, T013 hook, T024 integration tests)
- Field weld inspection tracking with QC workflow (foreman, x-ray flagging, repairs) ✅ (T006, T018 hook, T026 quickstart)
- Users can only view/modify data in their own organization ✅ (T004 RLS tests)
- Drawing similarity detection finds matches above 85% threshold ✅ (T012 hook, T024 integration tests)
- Materialized views refresh every 60 seconds ✅ (T006 pg_cron job, T016 hook)
- All database tests achieve ≥80% coverage ✅ (T027)
- Overall test coverage remains ≥70% ✅ (T027)
- TypeScript compiles with 0 errors ✅ (T028)
- CI pipeline passes ✅ (T029-T030)

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - research.md created (5 research questions resolved)
- [x] Phase 1: Design complete (/plan command) - data-model.md, contracts/, quickstart.md, CLAUDE.md updated
- [x] Phase 2: Task planning complete (/plan command - describe approach only) - 30 tasks outlined (T001-T030)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (all 5 principles satisfied, 0 violations)
- [x] Post-Design Constitution Check: PASS (re-evaluated, 0 new violations, design follows Constitution v1.0.0)
- [x] All NEEDS CLARIFICATION resolved (Phase 0 research resolved all unknowns)
- [x] Complexity deviations documented (none - table empty, no constitutional violations)

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
