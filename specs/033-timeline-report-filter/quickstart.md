# Quickstart: Timeline Report Filter

**Feature**: 033-timeline-report-filter
**Date**: 2025-12-05

## Overview

Add a date range filter to Component Progress and Field Weld reports that displays **progress delta** (change during selected period) instead of cumulative totals.

---

## Key Patterns

### Date Range Preset Resolution

```typescript
// src/hooks/useProgressDeltaReport.ts

function resolveDateRange(dateRange: ReportDateRange): { start: Date; end: Date } | null {
  if (dateRange.preset === 'all_time') return null;

  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1); // Tomorrow midnight

  switch (dateRange.preset) {
    case 'last_7_days':
      return { start: subDays(end, 7), end };
    case 'last_30_days':
      return { start: subDays(end, 30), end };
    case 'last_90_days':
      return { start: subDays(end, 90), end };
    case 'ytd':
      return { start: new Date(now.getFullYear(), 0, 1), end };
    case 'custom':
      if (!dateRange.startDate || !dateRange.endDate) return null;
      return {
        start: new Date(dateRange.startDate),
        end: addDays(new Date(dateRange.endDate), 1) // Inclusive end
      };
  }
}
```

### Delta Calculation Logic

```sql
-- In RPC function
-- For each milestone event in the date range:
delta = value - previous_value

-- Examples:
-- Complete action:   100 - 0   = +100% (add 1 to count)
-- Rollback action:   0 - 100   = -100% (subtract 1 from count)
-- Partial update:    75 - 50   = +25%  (add 0.25 to percentage)
```

### Conditional Hook Enabling

```typescript
// Only fetch delta data when a filter is active
const { data: deltaData, isLoading } = useProgressDeltaReport({
  projectId,
  dimension,
  dateRange,
  enabled: dateRange.preset !== 'all_time' // Skip query when "All Time"
});
```

### Store Extension Pattern

```typescript
// src/stores/useReportPreferencesStore.ts

interface ReportPreferencesStore {
  // Existing
  viewMode: ReportViewMode;
  setViewMode: (mode: ReportViewMode) => void;

  // NEW
  dateRange: ReportDateRange;
  setDateRangePreset: (preset: DateRangePreset) => void;
  setCustomDateRange: (start: string, end: string) => void;
  resetDateRange: () => void;
}

export const useReportPreferencesStore = create<ReportPreferencesStore>()(
  persist(
    (set) => ({
      viewMode: 'count',
      setViewMode: (mode) => set({ viewMode: mode }),

      dateRange: { preset: 'all_time', startDate: null, endDate: null },
      setDateRangePreset: (preset) => set({
        dateRange: { preset, startDate: null, endDate: null }
      }),
      setCustomDateRange: (startDate, endDate) => set({
        dateRange: { preset: 'custom', startDate, endDate }
      }),
      resetDateRange: () => set({
        dateRange: { preset: 'all_time', startDate: null, endDate: null }
      }),
    }),
    { name: 'pipetrak:report-preferences' }
  )
);
```

---

## Component Patterns

### DateRangeFilter Component

```tsx
// src/components/reports/DateRangeFilter.tsx

export function DateRangeFilter() {
  const { dateRange, setDateRangePreset, setCustomDateRange, resetDateRange } =
    useReportPreferencesStore();

  return (
    <div className="flex items-center gap-2">
      <Select
        value={dateRange.preset}
        onValueChange={(value) => setDateRangePreset(value as DateRangePreset)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select period" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(DATE_RANGE_PRESET_LABELS).map(([key, label]) => (
            <SelectItem key={key} value={key}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {dateRange.preset === 'custom' && (
        <DateRangePicker
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
          onChange={setCustomDateRange}
        />
      )}

      {dateRange.preset !== 'all_time' && (
        <Button variant="ghost" size="sm" onClick={resetDateRange}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
```

### Delta Value Formatting

```tsx
// Color-coded delta display
function formatDelta(value: number): { text: string; className: string } {
  if (value > 0) {
    return { text: `+${value.toFixed(1)}%`, className: 'text-green-600' };
  } else if (value < 0) {
    return { text: `${value.toFixed(1)}%`, className: 'text-red-600' };
  }
  return { text: '0%', className: 'text-muted-foreground' };
}
```

---

## Integration Points

### ReportPreview Integration

```tsx
// src/components/reports/ReportPreview.tsx

export function ReportPreview({ projectId, dimension }: Props) {
  const { dateRange } = useReportPreferencesStore();
  const isDeltaMode = dateRange.preset !== 'all_time';

  // Standard data (always fetched)
  const standardData = useManhourProgressReport({ projectId, dimension });

  // Delta data (only when filter active)
  const deltaData = useProgressDeltaReport({
    projectId,
    dimension,
    dateRange,
    enabled: isDeltaMode
  });

  return (
    <div>
      <div className="flex justify-between mb-4">
        <DateRangeFilter />
        <ViewModeToggle />
      </div>

      {isDeltaMode ? (
        deltaData.data?.rows.length ? (
          <DeltaReportTable data={deltaData.data} />
        ) : (
          <NoActivityFound dateRange={dateRange} />
        )
      ) : (
        <StandardReportTable data={standardData.data} />
      )}
    </div>
  );
}
```

---

## Testing Patterns

### Mock RPC Response

```typescript
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({
      data: [
        {
          dimension_id: 'area-1',
          dimension_name: 'Area A',
          components_with_activity: 5,
          delta_received: 10.5,
          delta_installed: 5.0,
          delta_punch: 2.5,
          delta_tested: 0,
          delta_restored: 0,
          delta_total: 8.2,
        }
      ],
      error: null
    })
  }
}));
```

### Date Range Resolution Tests

```typescript
describe('resolveDateRange', () => {
  it('returns null for all_time preset', () => {
    const result = resolveDateRange({ preset: 'all_time', startDate: null, endDate: null });
    expect(result).toBeNull();
  });

  it('resolves last_7_days to correct range', () => {
    vi.setSystemTime(new Date('2025-12-05'));
    const result = resolveDateRange({ preset: 'last_7_days', startDate: null, endDate: null });
    expect(result?.start).toEqual(new Date('2025-11-28'));
    expect(result?.end).toEqual(new Date('2025-12-06')); // Tomorrow
  });
});
```

---

## Common Pitfalls

1. **Date boundary handling**: Use exclusive end dates in SQL (`< p_end_date`) but inclusive in UI
2. **Timezone handling**: Convert presets to local midnight, send as ISO timestamps to RPC
3. **Empty state**: Filter rows with zero activity in hook, not RPC (keeps RPC generic)
4. **Grand total calculation**: Use weighted averages for percentages, sums for manhours
5. **Field weld milestones**: Different from components (Fitup/Weld Complete/Accepted vs Receive/Install/etc.)

---

## File Checklist

### New Files (8)
- [ ] `supabase/migrations/YYYYMMDDHHMMSS_create_progress_delta_rpc.sql`
- [ ] `src/hooks/useProgressDeltaReport.ts`
- [ ] `src/hooks/useFieldWeldDeltaReport.ts`
- [ ] `src/components/reports/DateRangeFilter.tsx`
- [ ] `src/components/reports/DeltaReportTable.tsx`
- [ ] `src/components/reports/ManhourDeltaReportTable.tsx`
- [ ] `src/components/reports/ManhourPercentDeltaReportTable.tsx`
- [ ] `src/components/reports/FieldWeldDeltaReportTable.tsx`

### Modified Files (5)
- [ ] `src/types/reports.ts`
- [ ] `src/stores/useReportPreferencesStore.ts`
- [ ] `src/components/reports/ReportPreview.tsx`
- [ ] `src/components/reports/FieldWeldReportPreview.tsx`
- [ ] `src/pages/ReportsPage.tsx`
