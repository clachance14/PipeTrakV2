# Plan: Timeline Filter for Progress Reports (DEFERRED)

**Status**: Saved for future implementation
**Created**: 2025-12-04

## Summary
Add a date range filter to Component Progress Reports that shows **delta (progress gained)** during a selected timeframe. Applies to all 3 views: Count, Manhours, and MH %.

Example: If Area went from 50% to 60% during the selected week, show **10%** (the delta), not 60% (the current total).

## Data Foundation
The `milestone_events` table already tracks all milestone changes with:
- `created_at` - When the change occurred (indexed)
- `value` / `previous_value` - New and old milestone values
- `component_id` - Links to component for dimension grouping

This allows calculating progress delta for any arbitrary date range.

## Implementation Phases

### Phase 1: Database RPC
**New migration**: `create_progress_delta_rpc.sql`

Create RPC function `get_progress_delta_by_dimension`:
- Accepts: `p_project_id`, `p_dimension`, `p_start_date`, `p_end_date`
- Queries `milestone_events` within date range
- Calculates delta: `SUM(value - previous_value)` per milestone
- Applies milestone weights to get percent_complete delta
- Groups by dimension (area/system/test_package)
- Returns delta for both count-based and manhour-based views

### Phase 2: TypeScript Types
**Modify**: `src/types/reports.ts`

Add:
```typescript
export interface ReportDateRange {
  preset: DateRangePreset;
  startDate: string | null;
  endDate: string | null;
}

export interface ProgressDeltaRow { ... }
export interface ManhourDeltaRow { ... }
```

### Phase 3: Query Hook
**New file**: `src/hooks/useProgressDeltaReport.ts`

Hook that calls the RPC function and returns delta data in same format as existing report hooks.

### Phase 4: State Management
**Modify**: `src/stores/useReportPreferencesStore.ts`

Add `dateRange` state with default `'all_time'`.

### Phase 5: UI Components
**New files**:
- `src/components/reports/DateRangeFilter.tsx` - Dropdown with presets
- `src/components/ui/calendar.tsx` - Via shadcn CLI for custom date picker

**Modify**: `src/components/reports/ReportPreview.tsx`
- Add DateRangeFilter next to view mode toggle
- Conditionally render delta vs absolute tables

### Phase 6: Integration
**Modify**: `src/pages/ReportsPage.tsx`

Logic:
- If `dateRange.preset === 'all_time'`: Use existing hooks (current behavior)
- If any other preset: Use new delta hook

## Date Presets
| Preset | Description |
|--------|-------------|
| All Time | Current totals (no delta - existing behavior) |
| Last 7 Days | Progress gained in past week |
| Last 30 Days | Progress gained in past month |
| Last 90 Days | Progress gained in past quarter |
| YTD | Progress gained since Jan 1 |
| Custom | User-defined date range |

## Files to Create
1. `supabase/migrations/YYYYMMDDHHMMSS_create_progress_delta_rpc.sql`
2. `src/hooks/useProgressDeltaReport.ts`
3. `src/components/reports/DateRangeFilter.tsx`
4. `src/components/ui/calendar.tsx` (shadcn CLI)

## Files to Modify
1. `src/types/reports.ts`
2. `src/stores/useReportPreferencesStore.ts`
3. `src/components/reports/ReportPreview.tsx`
4. `src/pages/ReportsPage.tsx`

## Key Reference Files
- `supabase/migrations/00010_component_tracking.sql` - milestone_events schema
- `src/hooks/useProgressReport.ts` - Pattern to follow
- `src/types/weldSummary.ts` - DateRangePreset type to reuse

## Complexity Assessment
This is a **medium-large feature** requiring:
- 1 new database migration with RPC function
- 3-4 new TypeScript files
- Modifications to 4 existing files
- Integration testing for delta calculations

Estimated: 2-3 development sessions
