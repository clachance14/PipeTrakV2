# Implementation Plan: Manhour Earned Value Tracking

**Branch**: `032-manhour-earned-value` | **Date**: 2025-12-04 | **Spec**: [spec.md](./spec.md)
**Updated**: 2025-12-04 (Simplified design - columns on components table, computed earned value)

## Summary

Add manhour budget tracking and earned value calculations to PipeTrak V2. Project managers enter total budgeted manhours, system auto-distributes to components based on size using non-linear scaling (diameter^1.5), and earned manhours are **computed on the fly** from existing percent_complete. Financial visibility restricted to Owner, Admin, and PM roles.

**Simplified Design:**
- Manhour columns added directly to `components` table (no separate junction table)
- Earned value always computed: `budgeted_manhours × percent_complete / 100`
- Aggregations use dynamic SQL (no pre-built views)
- Budget history tracked in `project_manhour_budgets` table

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), React 18, PostgreSQL 15+ (Supabase)
**Primary Dependencies**: TanStack Query v5, Zustand, shadcn/ui, Radix UI, @tanstack/react-virtual
**Storage**: Supabase PostgreSQL with RLS
**Testing**: Vitest, Testing Library
**Target Platform**: Web (desktop and mobile, 1024px breakpoint)
**Project Type**: Web application (React SPA + Supabase backend)
**Performance Goals**: Budget distribution <30s for 5k components, dashboard load <1s
**Constraints**: No breaking changes to component schema (additive columns only)
**Scale/Scope**: Projects with up to 10k components, 50+ areas/systems

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
- [x] Hotfix test debt tracking (if applicable)

**Supabase Integration (Principle IV):**
- [x] RLS enabled on all new tables
- [x] RLS patterns remain multi-tenant-safe (`organization_id`/`user_id` filtering)
- [x] TanStack Query wraps all Supabase calls
- [x] AuthContext used for auth state (no direct component access)

**Specify Workflow (Principle V):**
- [x] Feature documented in `specs/032-manhour-earned-value/` directory
- [x] Constitution gates verified before planning
- [x] Tasks ordered with tests before implementation

**Migration Rules (Principle VI):**
- [x] New sequential migration planned (if schema changes)
- [x] Migration idempotency verified or marked irreversible
- [x] RLS rules updated in same migration as table changes
- [x] Data migration reversibility documented (if applicable)
- [x] TypeScript types regeneration planned
- [x] Backward-compatibility notes documented

**Performance Standards (Principle VII):**
- [x] Table rendering target <100ms for 10k rows (virtualization strategy)
- [x] Database query index strategy documented
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
specs/032-manhour-earned-value/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Simplified data model
├── quickstart.md        # Implementation guide
├── contracts/           # RPC contracts
└── tasks.md             # Task breakdown
```

### Source Code (repository root)

```text
# Database Migrations
supabase/migrations/
├── YYYYMMDDHHMMSS_add_manhour_columns.sql       # Add columns to components
├── YYYYMMDDHHMMSS_create_manhour_budgets.sql    # Budget table + RLS + trigger
└── YYYYMMDDHHMMSS_manhour_rpcs.sql              # Distribution RPC

# Frontend Components
src/
├── components/
│   ├── settings/
│   │   └── manhour-budget/
│   │       ├── ManhourBudgetPage.tsx            # Settings tab main page
│   │       ├── BudgetCreateForm.tsx             # Budget creation form
│   │       ├── BudgetVersionHistory.tsx         # Version list
│   │       └── DistributionResults.tsx          # Post-distribution summary
│   └── dashboard/
│       └── ManhourSummaryWidget.tsx             # Dashboard widget
├── hooks/
│   ├── useManhourBudget.ts                      # Budget CRUD operations
│   └── useProjectManhours.ts                    # Project-level summary
└── lib/
    ├── manhour/
    │   ├── calculate-weight.ts                  # Weight calculation logic
    │   └── parse-size.ts                        # SIZE field parsing
    └── permissions/
        └── manhour-permissions.ts               # Role-based access helpers

# Tests
src/lib/manhour/
├── calculate-weight.test.ts                     # Unit tests (colocated)
└── parse-size.test.ts                           # Unit tests (colocated)

tests/integration/manhour/
├── budget-creation.test.ts                      # Integration tests
└── distribution.test.ts                         # Integration tests
```

**Structure Decision**: Simplified from original plan. Removed dimension-specific hooks, bucket editor, and reports integration components. Manhour data integrates with existing reports via computed columns.

## Complexity Tracking

No Constitution Check violations. Design follows existing patterns without introducing new abstractions or dependencies.

---

## Phase 0: Research

See [research.md](./research.md) for detailed findings.

### Key Decisions

1. **Weight Calculation Formula**: Use diameter^1.5 for non-linear scaling (larger pipes require disproportionately more work)
2. **Earned Value Strategy**: Compute on the fly from `budgeted_manhours × percent_complete / 100` (no stored column, no triggers)
3. **Aggregation Strategy**: Dynamic SQL queries with existing grouping logic (no pre-built views)
4. **Permission Model**: Extend existing `usePermissions()` hook pattern, enforce at RLS and application layer

---

## Phase 1: Design

### Database Schema

See [data-model.md](./data-model.md) for complete entity definitions.

**New Columns on `components` table:**
- `budgeted_manhours` NUMERIC(10,4) DEFAULT 0
- `manhour_weight` NUMERIC(10,4) DEFAULT 0

**New Table:**
- `project_manhour_budgets` - Versioned budget records per project (with RLS)

**New RPC Functions:**
- `create_manhour_budget()` - Create budget and distribute to components

**Computed (not stored):**
- `earned_manhours = budgeted_manhours × percent_complete / 100`

### API Contracts

See [contracts/](./contracts/) directory for RPC specifications.

### Integration Points

1. **Dashboard Integration**: Add `ManhourSummaryWidget` to `DashboardPage.tsx` with role-based visibility
2. **Settings Tab**: Add "Manhour Budget" card to `SettingsIndexPage.tsx`
3. **Reports Integration**: Existing reports can add manhour columns via computed fields on component queries

### Performance Strategy

1. **Budget Distribution**: Use batch UPDATE with single transaction
2. **Earned Value**: Computed on the fly (instant, no sync needed)
3. **Aggregations**: SUM() on component queries with existing indexes
4. **Dashboard Query**: Cache with TanStack Query, 60s stale time

### Security Model

1. **Budget Table RLS**: Filter by `project_id` with user-project membership + role check
2. **RPC Functions**: SECURITY DEFINER with explicit role checks (Owner, Admin, PM)
3. **Frontend**: Hide UI elements for unauthorized roles via `usePermissions()` hook
4. **Component Manhour Data**: Visibility controlled at application layer (columns on existing table)

---

## Quickstart

See [quickstart.md](./quickstart.md) for implementation guide.

---

## What Was Removed (Original Design)

| Original | Simplified |
|----------|-----------|
| `component_manhours` table | Columns on `components` table |
| `manhour_buckets` table | Not needed |
| 5 aggregation views | Dynamic SQL queries |
| Stored `earned_manhours` | Computed on the fly |
| `calculate_component_earned_manhours` RPC | Not needed |
| `recalculate_project_earned_manhours` RPC | Not needed |
| `redistribute_component_weight` RPC | POST-MVP |
| Dimension-specific hooks | Not needed |

---

## Next Steps

Run `/speckit.tasks` to generate the ordered task breakdown for implementation.

---

**Constitution Version**: 2.0.0 | **Plan Generated**: 2025-12-04 | **Plan Updated**: 2025-12-04
