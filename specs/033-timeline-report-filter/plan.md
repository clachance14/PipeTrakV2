# Implementation Plan: Timeline Report Filter

**Branch**: `033-timeline-report-filter` | **Date**: 2025-12-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/033-timeline-report-filter/spec.md`

## Summary

Add a date range filter to Component Progress and Field Weld reports that displays **progress delta** (change during period) instead of cumulative totals. When a user selects a date range preset (Last 7 Days, Last 30 Days, etc.) or custom dates, the report shows only dimensions with activity and displays signed delta values (+/-) for all milestone metrics.

**Technical Approach**: Create two new PostgreSQL RPC functions to calculate deltas from `milestone_events` table, add TypeScript hooks to call them, extend the report preferences Zustand store with date range state, and build new delta table components with color-coded positive/negative styling.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), React 18
**Primary Dependencies**: TanStack Query, Zustand, shadcn/ui, Radix UI
**Storage**: Supabase PostgreSQL (existing `milestone_events` table)
**Testing**: Vitest, Testing Library, jsdom
**Target Platform**: Web (desktop + mobile responsive, ≤1024px breakpoint)
**Project Type**: Web SPA (React + Supabase)
**Performance Goals**: <2s filter switch, <3s report load for 10k events
**Constraints**: Must reuse existing `milestone_events` table and `get_milestone_weight` function
**Scale/Scope**: Projects with up to 10,000 milestone events

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Type Safety (Principle I):**
- [x] TypeScript strict mode enabled (`strict: true`)
- [x] No type assertions (`as` keyword) without justification
- [x] `noUncheckedIndexedAccess: true` enforced
- [x] Path aliases (`@/*`) used for cross-directory imports
- [x] Database types auto-generated from Supabase schema

**Component-Driven Development (Principle II):**
- [x] UI components use shadcn/ui and Radix UI primitives
- [x] Single responsibility composition verified
- [x] TanStack Query for server state, Zustand for client state

**Testing Discipline (Principle III):**
- [x] TDD workflow planned (Red-Green-Refactor)
- [x] Integration tests cover spec acceptance scenarios
- [ ] Hotfix test debt tracking (if applicable) - N/A

**Supabase Integration (Principle IV):**
- [x] RLS enabled on all new tables - N/A (no new tables)
- [x] RLS patterns remain multi-tenant-safe (`organization_id`/`user_id` filtering)
- [x] TanStack Query wraps all Supabase calls
- [x] AuthContext used for auth state (no direct component access)

**Specify Workflow (Principle V):**
- [x] Feature documented in `specs/###-feature-name/` directory
- [x] Constitution gates verified before planning
- [x] Tasks orders tests before implementation

**Migration Rules (Principle VI):**
- [x] New sequential migration planned (if schema changes)
- [x] Migration idempotency verified or marked irreversible
- [x] RLS rules updated in same migration as table changes - N/A (RPC only)
- [ ] Data migration reversibility documented (if applicable) - N/A
- [x] TypeScript types regeneration planned
- [x] Backward-compatibility notes documented - No schema changes, RPC additions only

**Performance Standards (Principle VII):**
- [x] Table rendering target <100ms for 10k rows (virtualization strategy) - Using existing virtualized tables
- [x] Database query index strategy documented - Uses existing idx_events_created_at index
- [x] No `select *` in production code
- [x] TanStack Query pagination/virtualization planned

**UI Standards (Principle VIII):**
- [x] Mobile layout planned (1024px breakpoint)
- [x] Touch targets ≥44px (WCAG 2.1 AA)
- [x] Keyboard accessibility planned (Tab, Enter, Escape)
- [x] shadcn/ui and Radix patterns followed
- [x] No inline styles (Tailwind CSS only)

**Test Coverage (Principle IX):**
- [x] Unit tests planned for business logic
- [x] Integration tests planned for data flow
- [x] At least one acceptance test per spec scenario
- [x] Coverage targets verified (≥70% overall, ≥80% lib, ≥60% components)

## Project Structure

### Documentation (this feature)

```text
specs/033-timeline-report-filter/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (RPC definitions)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── components/
│   └── reports/
│       ├── DateRangeFilter.tsx           # NEW: Date range dropdown
│       ├── DeltaReportTable.tsx          # NEW: Count delta table
│       ├── ManhourDeltaReportTable.tsx   # NEW: Manhour delta table
│       ├── ManhourPercentDeltaReportTable.tsx  # NEW: MH% delta table
│       ├── FieldWeldDeltaReportTable.tsx # NEW: Field weld delta table
│       ├── ReportPreview.tsx             # MODIFY: Add DateRangeFilter
│       └── FieldWeldReportPreview.tsx    # MODIFY: Add DateRangeFilter
├── hooks/
│   ├── useProgressDeltaReport.ts         # NEW: Component delta hook
│   └── useFieldWeldDeltaReport.ts        # NEW: Field weld delta hook
├── stores/
│   └── useReportPreferencesStore.ts      # MODIFY: Add dateRange state
├── types/
│   └── reports.ts                        # MODIFY: Add delta types
└── pages/
    └── ReportsPage.tsx                   # MODIFY: Integrate delta hooks

supabase/migrations/
└── YYYYMMDDHHMMSS_create_progress_delta_rpc.sql  # NEW: RPC functions

tests/
├── unit/
│   └── hooks/
│       ├── useProgressDeltaReport.test.ts
│       └── useFieldWeldDeltaReport.test.ts
├── integration/
│   └── progress-delta-rpc.test.ts
└── components/
    ├── DateRangeFilter.test.tsx
    └── DeltaReportTable.test.tsx
```

**Structure Decision**: Extends existing web SPA structure. New hooks, components, and types follow established patterns in `src/hooks/`, `src/components/reports/`, and `src/types/`.

## Complexity Tracking

No constitution violations requiring justification. All patterns follow existing codebase conventions.

---

**Constitution Version**: 2.0.0
