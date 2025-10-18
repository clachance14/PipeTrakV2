# Implementation Plan: Authenticated Pages with Real Data

**Branch**: `008-we-just-planned` | **Date**: 2025-10-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/clachance14/projects/PipeTrak_V2/specs/008-we-just-planned/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → ✅ DONE: Spec loaded with 59 functional requirements
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → ✅ DONE: No NEEDS CLARIFICATION markers (user provided clarifications during spec creation)
   → Detect Project Type: Single React SPA (web frontend)
   → Set Structure Decision: src/ directory structure
3. Fill the Constitution Check section based on constitution document
   → ✅ DONE: All 5 principles evaluated
4. Evaluate Constitution Check section
   → ✅ DONE: No violations detected (uses existing infrastructure)
   → Update Progress Tracking: Initial Constitution Check PASS
5. Execute Phase 0 → research.md
   → ✅ IN PROGRESS: Researching 7 technical topics
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
   → ⏳ PENDING
7. Re-evaluate Constitution Check section
   → ⏳ PENDING: Will verify after Phase 1 complete
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
   → ⏳ PENDING
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 8. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

This feature transforms all authenticated pages from placeholder HTML to fully functional interfaces displaying real data from the Supabase database. The primary changes include:

1. **Sidebar Navigation**: Add collapsible left sidebar with icons, labels, active state highlighting, and localStorage persistence
2. **Dashboard Page**: Replace hard-coded metrics with live data (overall progress from components, ready packages from mv_package_readiness, needs review count, recent activity from audit_log/milestone_events)
3. **Test Packages Page**: Display real test packages with filtering (All/Ready/In Progress/Blocked), searching, and sorting
4. **Needs Review Page**: Show flagged items with resolve workflow, type filters, age-based color coding, and resolution notes
5. **Welders Page**: List welders with verification status, weld counts, add/verify workflows, stencil validation
6. **Imports Page**: Foundation only - display recent imports from audit_log, template downloads (no upload implementation)
7. **Permission-Based UI**: Hide buttons/nav items based on user role permissions (can_manage_welders, can_resolve_reviews, can_manage_team, can_update_milestones)

**Technical Approach**: Leverage existing Sprint 1 infrastructure (14 tables, 2 materialized views, 11 TanStack Query hooks). No new database migrations required. Use Radix UI + Tailwind for UI components. Implement custom hooks for dashboard aggregations and sidebar state persistence.

## Technical Context

**Language/Version**: TypeScript 5.6 (strict mode enabled)

**Primary Dependencies**:
- React 18.3 + React DOM + React Router v7
- TanStack Query v5.90 (server state management)
- Zustand v5.0 (client state management)
- Supabase JS Client v2.58
- Radix UI primitives (Dialog, Select, Checkbox, Slider, Label, Toast, Dropdown Menu)
- Tailwind CSS v4.1 + PostCSS + Autoprefixer
- Zod v4.1 (schema validation)
- Lucide React v0.544 (icons)
- React Hook Form v7.64 + @hookform/resolvers

**Storage**:
- Supabase PostgreSQL (existing 14 tables, 2 materialized views from Sprint 1)
- localStorage (sidebar collapsed state, user preferences)
- No new database migrations required

**Testing**:
- Vitest v3.2 + @vitest/ui + @vitest/coverage-v8
- Testing Library (React v16.3, user-event v14.6, jest-dom v6.9)
- jsdom v27.0 (DOM environment)
- Vitest globals enabled (no imports for describe/it/expect)

**Target Platform**: Web browser (Chrome, Firefox, Safari latest versions), desktop-first responsive design

**Project Type**: Single React SPA (src/ directory structure)

**Performance Goals**:
- Dashboard initial load <500ms p95
- Page transitions <200ms p95
- Search/filter response <300ms (debounced)
- Sidebar toggle <50ms p95
- Query cache hit rate >80%

**Constraints**:
- Must use existing database schema (14 tables from Sprint 1, no new migrations)
- Must work with existing TanStack Query hooks (useComponents, useTestPackages, useNeedsReview, useWelders, useAuditLog, useRefreshDashboards)
- Must respect RLS policies and multi-tenant isolation
- Must support projects with 10k+ components without performance degradation
- Sidebar state persistence must survive browser refresh

**Scale/Scope**:
- Supports 50+ concurrent users per project
- Handles projects with 10k+ components, 100+ test packages, 50+ welders
- Dashboard metrics recalculate on every project switch
- Materialized views refresh every 60 seconds (mv_package_readiness, mv_drawing_progress)

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Type Safety First
- [x] TypeScript strict mode enabled (verify tsconfig.json) - ✅ Confirmed strict: true, noUncheckedIndexedAccess: true
- [x] No `as` type assertions without justification in Complexity Tracking - ✅ Will avoid type assertions
- [x] Path aliases (`@/*`) used for imports - ✅ Confirmed @/* maps to ./src/* in tsconfig
- [x] Database types will be generated from Supabase schema - ✅ Using existing src/types/database.types.ts

### II. Component-Driven Development
- [x] New UI components follow shadcn/ui patterns (Radix + Tailwind) - ✅ Will use existing Radix primitives
- [x] Components maintain single responsibility - ✅ Sidebar, MetricCard, PackageCard, ReviewItemCard, WelderTable all focused
- [x] Server state via TanStack Query, client state via Zustand - ✅ Dashboard metrics via TanStack Query, sidebar state via custom hook + localStorage
- [x] No prop drilling beyond 2 levels - ✅ Using ProjectContext for selectedProjectId, hooks for data

### III. Testing Discipline
- [x] TDD approach confirmed (tests before implementation) - ✅ Contract tests first, then components
- [x] Integration tests cover spec acceptance scenarios - ✅ Project switching, permission rendering, empty states
- [x] Test files colocated or in tests/ directory - ✅ Contract tests in specs/008-we-just-planned/contracts/, component tests colocated
- [x] Tests will use Vitest + Testing Library - ✅ Confirmed in package.json

### IV. Supabase Integration Patterns
- [x] RLS enabled on all new tables - ✅ N/A - No new tables created
- [x] Multi-tenant isolation via organization_id in policies - ✅ Using existing RLS policies from Sprint 1
- [x] TanStack Query wraps all Supabase calls - ✅ Using existing hooks (useComponents, useTestPackages, etc.)
- [x] Auth via AuthContext (no direct supabase.auth in components) - ✅ Will use existing useAuth() hook
- [x] Realtime subscriptions cleaned up on unmount (if applicable) - ✅ N/A - No new realtime subscriptions

### V. Specify Workflow Compliance
- [x] Feature has spec.md in specs/###-feature-name/ - ✅ specs/008-we-just-planned/spec.md exists
- [x] This plan.md follows template structure - ✅ Following plan-template.md structure
- [x] Tasks.md will be generated by /tasks command - ✅ Planned in Phase 2
- [x] Implementation will follow /implement workflow - ✅ Will execute via /implement

**Gate Status**: ✅ PASS - No violations detected, all principles satisfied

## Project Structure

### Documentation (this feature)
```
specs/008-we-just-planned/
├── spec.md              # Feature specification (input)
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
│   ├── dashboard-metrics.contract.test.ts
│   ├── package-readiness.contract.test.ts
│   ├── needs-review.contract.test.ts
│   ├── welders.contract.test.ts
│   └── sidebar-state.contract.test.ts
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
src/
├── components/          # React components
│   ├── ui/              # shadcn/ui components (existing: Button, Dialog, Input, Select, Checkbox, Slider, Label, Sonner, Form)
│   ├── team/            # Team management components (existing)
│   ├── auth/            # Auth components (existing)
│   ├── Sidebar.tsx      # NEW: Collapsible sidebar navigation
│   ├── Layout.tsx       # MODIFIED: Add sidebar to layout
│   ├── PermissionGate.tsx  # EXISTING: Permission-based rendering
│   ├── dashboard/       # NEW: Dashboard components
│   │   ├── MetricCard.tsx
│   │   ├── ProgressRing.tsx
│   │   └── ActivityFeed.tsx
│   ├── packages/        # NEW: Test package components
│   │   ├── PackageCard.tsx
│   │   └── PackageFilters.tsx
│   ├── needs-review/    # NEW: Needs review components
│   │   ├── ReviewItemCard.tsx
│   │   ├── ResolveReviewModal.tsx
│   │   └── ReviewFilters.tsx
│   └── welders/         # NEW: Welder components
│       ├── WelderTable.tsx
│       ├── AddWelderModal.tsx
│       └── VerifyWelderDialog.tsx
├── pages/               # Page components
│   ├── DashboardPage.tsx      # MODIFIED: Replace hard-coded data with real metrics
│   ├── PackagesPage.tsx       # MODIFIED: Connect to mv_package_readiness
│   ├── NeedsReviewPage.tsx    # MODIFIED: Connect to needs_review table
│   ├── WeldersPage.tsx        # MODIFIED: Connect to welders table
│   ├── ImportsPage.tsx        # MODIFIED: Show recent audit_log imports
│   ├── ComponentsPage.tsx     # EXISTING: Already functional (Feature 007)
│   ├── DrawingsPage.tsx       # EXISTING: Already functional (Feature 007)
│   └── ProjectListPage.tsx    # EXISTING: Already functional (Feature 005)
├── hooks/               # Custom React hooks
│   ├── useComponents.ts       # EXISTING (Sprint 1)
│   ├── useTestPackages.ts     # EXISTING (Sprint 1)
│   ├── useNeedsReview.ts      # EXISTING (Sprint 1)
│   ├── useWelders.ts          # EXISTING (Sprint 1)
│   ├── useAuditLog.ts         # EXISTING (Sprint 1)
│   ├── useRefreshDashboards.ts  # EXISTING (Sprint 1)
│   ├── usePermissions.ts      # EXISTING (Feature 005)
│   ├── useDashboardMetrics.ts # NEW: Aggregate dashboard stats
│   ├── usePackageReadiness.ts # NEW: Query mv_package_readiness view
│   ├── useWelderUsage.ts      # NEW: Count welds by welder
│   └── useSidebarState.ts     # NEW: localStorage + state persistence
├── contexts/            # React contexts
│   ├── AuthContext.tsx        # EXISTING: Authentication state
│   └── ProjectContext.tsx     # EXISTING: Selected project state
├── lib/                 # Utility libraries
│   ├── supabase.ts            # EXISTING: Supabase client
│   ├── permissions.ts         # EXISTING: Permission helpers (Feature 005)
│   └── validation.ts          # EXISTING: Validation helpers (Feature 005)
├── types/               # TypeScript types
│   └── database.types.ts      # EXISTING: Auto-generated from Supabase
└── stores/              # Zustand stores
    └── organizationStore.ts   # EXISTING: Organization state

tests/
├── contract/            # Contract tests (Phase 1)
│   └── 008-we-just-planned/
│       ├── dashboard-metrics.contract.test.ts
│       ├── package-readiness.contract.test.ts
│       ├── needs-review.contract.test.ts
│       ├── welders.contract.test.ts
│       └── sidebar-state.contract.test.ts
└── integration/         # Integration tests (Phase 1)
    └── 008-we-just-planned/
        ├── project-switching.test.ts
        └── permission-rendering.test.ts
```

**Structure Decision**: Single React SPA structure with src/ directory. No backend code (Supabase handles all backend logic). Components organized by feature domain (dashboard/, packages/, needs-review/, welders/). Hooks organized by data entity (useComponents, useDashboardMetrics, etc.). Existing project structure from Sprint 0-1 maintained.

## Phase 0: Outline & Research

### Research Topics Identified

From Technical Context and Feature Requirements, the following unknowns need research:

1. **Sidebar Navigation Patterns**: Best practices for collapsible sidebars with state persistence
   - Research: React sidebar patterns, localStorage hooks, responsive behavior
   - Goal: Choose pattern for collapse/expand + icon-only vs full-label views

2. **Dashboard Metrics Calculation**: Approaches for aggregating component progress from database
   - Research: TanStack Query aggregation patterns, caching strategies, stale time configuration
   - Goal: Determine if custom hook or materialized view query is best

3. **Permission-Based Rendering**: React patterns for hiding UI elements based on user permissions
   - Research: usePermissions hook usage, PermissionGate component patterns, conditional rendering best practices
   - Goal: Consistent approach for permission checks across pages

4. **Welder Usage Counting**: Query strategies for counting milestone_events by welder
   - Research: Supabase PostgREST JSONB queries, metadata filtering, aggregation performance
   - Goal: Efficient query to count "Weld Made" events per welder without N+1 queries

5. **LocalStorage Patterns**: Persisting sidebar state across sessions
   - Research: localStorage hooks, sync with React state, SSR considerations (none for this SPA)
   - Goal: Custom hook that reads/writes localStorage and syncs with component state

6. **Empty State Design**: UI patterns for zero-data scenarios
   - Research: shadcn/ui empty state patterns, Tailwind CSS centering, call-to-action button placement
   - Goal: Consistent empty state UX across all pages

7. **Error Boundary Patterns**: Handling data fetch failures gracefully
   - Research: TanStack Query error states, React error boundaries, retry strategies
   - Goal: Per-page error handling with retry button and user-friendly messages

### Research Execution

Dispatching research tasks for each topic and generating research.md...

**Output**: research.md will contain decisions, rationales, and alternatives for all 7 topics

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

### 1. Extract entities from feature spec → `data-model.md`

**Existing Entities** (no new tables):
- Project (from Sprint 0)
- Component (from Sprint 1) - has percent_complete, current_milestones
- Test Package (from Sprint 1) - linked to components
- Needs Review Item (from Sprint 1) - has type, status, payload
- Welder (from Sprint 1) - has stencil, status, verification tracking
- Milestone Event (from Sprint 1) - tracks milestone changes with user and timestamp
- Audit Log (from Sprint 1) - tracks all user actions
- Materialized View: mv_package_readiness (from Sprint 1)
- Materialized View: mv_drawing_progress (from Sprint 1)

**New Client-Side State**:
- SidebarState: { isCollapsed: boolean } - persisted to localStorage

**Computed Metrics** (dashboard):
- OverallProgress: AVG(components.percent_complete) for selected project
- ComponentCount: COUNT(components) for selected project
- ReadyPackagesCount: COUNT(mv_package_readiness) WHERE avg_percent_complete = 100
- NeedsReviewCount: COUNT(needs_review) WHERE status = 'pending'
- RecentActivity: Last 10 milestone_events OR audit_log entries

**View Models**:
- DashboardMetrics: { overallProgress, componentCount, readyPackages, needsReviewCount, recentActivity }
- PackageCard: { id, name, progress, componentCount, blockerCount, targetDate }
- ReviewItem: { id, type, description, ageInDays, ageColorClass, payload }
- WelderRow: { id, name, stencil, status, weldCount, verifiedAt, verifiedBy }

### 2-5. Generate Phase 1 Artifacts

Will generate:
- **data-model.md**: Entity definitions and view models
- **contracts/**: 5 contract test files (dashboard, packages, needs review, welders, sidebar)
- **quickstart.md**: 12-step manual validation workflow
- **CLAUDE.md update**: Run update-agent-context.sh script

**Output**: data-model.md, /contracts/* (5 files), quickstart.md, CLAUDE.md updated

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:

1. **Load Template**: Load `.specify/templates/tasks-template.md` as base structure
2. **Generate from Phase 1 Artifacts**:
   - From contracts/ → 5 contract test tasks (dashboard, packages, needs review, welders, sidebar)
   - From data-model.md → 4 new hook tasks (useDashboardMetrics, usePackageReadiness, useWelderUsage, useSidebarState)
   - From component requirements → 13 component creation tasks
   - From page requirements → 5 page update tasks
   - From layout requirements → 1 layout update task
   - From integration tests → 2 integration test tasks

**Ordering Strategy**:

1. **TDD Order**: All contract tests FIRST (marked [P] for parallel execution)
2. **Bottom-Up Dependency Order**: Hooks → Components → Pages → Layout → Integration tests
3. **Parallelization**: Independent tasks marked [P] can run in parallel

**Estimated Output**: ~30 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

**No violations detected** - All constitutional principles satisfied:
- TypeScript strict mode enabled (tsconfig.app.json)
- No new tables (RLS N/A)
- TDD approach confirmed (tests before implementation)
- TanStack Query wraps all Supabase calls (existing hooks)
- Specify workflow followed (spec → plan → tasks → implement)

No complexity deviations to document.

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [ ] Phase 0: Research complete (/plan command)
- [ ] Phase 1: Design complete (/plan command)
- [ ] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [ ] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
