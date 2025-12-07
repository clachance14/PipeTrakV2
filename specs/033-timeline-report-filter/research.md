# Research: Timeline Report Filter

**Feature**: 033-timeline-report-filter
**Date**: 2025-12-05

## Research Summary

No NEEDS CLARIFICATION items identified. All technical decisions resolved through codebase exploration and prior planning discussion.

---

## Decision 1: Delta Calculation Strategy

**Decision**: Calculate deltas server-side via PostgreSQL RPC functions

**Rationale**:
- `milestone_events` table already has indexed `created_at` column (idx_events_created_at)
- Server-side aggregation avoids transferring large event datasets to client
- Existing `get_milestone_weight` function can be reused for weighted calculations
- Performance target of <3s for 10k events achievable with proper indexing

**Alternatives Considered**:
1. **Client-side calculation**: Rejected - would require fetching all milestone events to client, poor performance for large datasets
2. **Materialized view**: Rejected - adds complexity, requires refresh triggers, delta calculation needs dynamic date ranges

---

## Decision 2: Date Range State Management

**Decision**: Extend existing `useReportPreferencesStore` Zustand store

**Rationale**:
- Store already exists with `viewMode` preference and localStorage persistence
- Same storage key pattern (`pipetrak:report-preferences`) maintains consistency
- Single source of truth for all report preferences
- Zustand persist middleware handles serialization automatically

**Alternatives Considered**:
1. **Separate dateRange store**: Rejected - unnecessary separation, complicates preference coordination
2. **URL search params**: Rejected - date ranges should persist across sessions like viewMode does

---

## Decision 3: Delta Display Strategy

**Decision**: Separate delta table components (not conditional rendering within existing tables)

**Rationale**:
- Delta tables have different column structure ("Active Components" vs "Budget")
- Different formatting requirements (signed percentages with color coding)
- Cleaner separation of concerns - delta tables are visually and semantically different
- Easier to test and maintain independently

**Alternatives Considered**:
1. **Conditional columns in existing tables**: Rejected - complex prop drilling, harder to maintain
2. **HOC wrapper**: Rejected - over-engineering, direct component composition is simpler

---

## Decision 4: RPC Function Architecture

**Decision**: Two separate RPC functions - one for components, one for field welds

**Rationale**:
- Components and field welds have different milestone structures
- Components need weighted totals via `get_milestone_weight`
- Field welds have simpler Fitup/Weld Complete/Accepted milestones
- Separate functions easier to test and optimize independently

**Alternatives Considered**:
1. **Single unified RPC**: Rejected - would require complex conditional logic for different component types
2. **Client-side aggregation with multiple RPCs**: Rejected - N+1 problem, poor performance

---

## Decision 5: Date Preset Handling

**Decision**: Convert presets to actual dates in TypeScript hooks, pass ISO timestamps to RPC

**Rationale**:
- `DateRangePreset` type already exists in `src/types/weldSummary.ts`
- Client knows current date/time for relative calculations
- RPC functions receive absolute timestamps - simpler, more testable
- YTD calculation (`new Date(currentYear, 0, 1)`) is trivial in TypeScript

**Alternatives Considered**:
1. **PostgreSQL preset handling**: Rejected - duplicates logic, harder to test, timezone complexity
2. **UTC-only dates**: Rejected - users expect local time boundaries

---

## Decision 6: Empty State Handling

**Decision**: Filter dimensions with zero activity in hook, display "No Activity Found" when all filtered

**Rationale**:
- Spec requirement: "Only show dimensions with activity in the period"
- Filtering at hook level keeps RPC generic (can return all dimensions with zeros)
- Single responsibility - UI decides what to display, data layer provides all data
- "No Activity Found" component already used elsewhere in codebase

**Alternatives Considered**:
1. **Filter in RPC**: Rejected - less flexible, harder to debug (can't see what was filtered)
2. **Show all with zeros**: Rejected - violates spec requirement, clutters UI

---

## Key Reference Files Confirmed

| File | Purpose |
|------|---------|
| `supabase/migrations/00010_component_tracking.sql` | milestone_events schema |
| `supabase/migrations/20251205015230_manhour_report_weight_function.sql` | get_milestone_weight RPC |
| `src/hooks/useManhourProgressReport.ts` | Hook pattern to follow |
| `src/hooks/useFieldWeldProgressReport.ts` | Field weld hook pattern |
| `src/stores/useReportPreferencesStore.ts` | Store to extend |
| `src/types/reports.ts` | Types to extend |
| `src/types/weldSummary.ts` | DateRangePreset type |
| `src/components/reports/ReportPreview.tsx` | Component to integrate |

---

## Index Strategy

Existing indexes sufficient for delta queries:
- `idx_events_created_at DESC` - primary filter for date range
- `idx_events_component_id` - join to components table
- Components table has indexes on `area_id`, `system_id`, `test_package_id` for grouping

No new indexes required.
