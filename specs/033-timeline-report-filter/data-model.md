# Data Model: Timeline Report Filter

**Feature**: 033-timeline-report-filter
**Date**: 2025-12-05

## Overview

This feature does not create new database tables. It adds RPC functions that query existing `milestone_events` and `components` tables, and extends TypeScript types for delta reports.

---

## Existing Entities (Reference)

### milestone_events (existing)

```sql
CREATE TABLE milestone_events (
  id UUID PRIMARY KEY,
  component_id UUID NOT NULL REFERENCES components(id),
  milestone_name TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('complete', 'rollback', 'update')),
  value NUMERIC(5,2),           -- New value (0-100)
  previous_value NUMERIC(5,2),  -- Old value before change
  user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB
);

-- Relevant indexes
CREATE INDEX idx_events_created_at ON milestone_events(created_at DESC);
CREATE INDEX idx_events_component_id ON milestone_events(component_id);
```

### components (existing - relevant fields)

```sql
-- Relevant columns for delta grouping
area_id UUID REFERENCES areas(id),
system_id UUID REFERENCES systems(id),
test_package_id UUID REFERENCES test_packages(id),
component_type TEXT NOT NULL,
budgeted_manhours NUMERIC(10,2),
is_retired BOOLEAN DEFAULT false
```

---

## New TypeScript Types

### ReportDateRange

```typescript
export interface ReportDateRange {
  preset: DateRangePreset;
  startDate: string | null;  // ISO 8601 (YYYY-MM-DD)
  endDate: string | null;    // ISO 8601 (YYYY-MM-DD)
}
```

### ProgressDeltaRow

```typescript
export interface ProgressDeltaRow {
  id: string;
  name: string;
  componentsWithActivity: number;
  deltaReceived: number;    // percentage points
  deltaInstalled: number;
  deltaPunch: number;
  deltaTested: number;
  deltaRestored: number;
  deltaTotal: number;       // weighted total
}
```

### ManhourDeltaRow

```typescript
export interface ManhourDeltaRow {
  id: string;
  name: string;
  componentsWithActivity: number;
  mhBudget: number;
  deltaReceiveMhEarned: number;
  deltaInstallMhEarned: number;
  deltaPunchMhEarned: number;
  deltaTestMhEarned: number;
  deltaRestoreMhEarned: number;
  deltaTotalMhEarned: number;
  deltaMhPctComplete: number;
}
```

### FieldWeldDeltaRow

```typescript
export interface FieldWeldDeltaRow {
  id: string;
  name: string;
  stencil?: string;         // welder stencil (welder dimension only)
  weldsWithActivity: number;
  deltaFitupCount: number;
  deltaWeldCompleteCount: number;
  deltaAcceptedCount: number;
  deltaPctTotal: number;
}
```

### Grand Total Types

```typescript
export interface ProgressDeltaGrandTotal {
  name: 'Grand Total';
  componentsWithActivity: number;
  deltaReceived: number;
  deltaInstalled: number;
  deltaPunch: number;
  deltaTested: number;
  deltaRestored: number;
  deltaTotal: number;
}

export interface ManhourDeltaGrandTotal {
  name: 'Grand Total';
  componentsWithActivity: number;
  mhBudget: number;
  deltaReceiveMhEarned: number;
  deltaInstallMhEarned: number;
  deltaPunchMhEarned: number;
  deltaTestMhEarned: number;
  deltaRestoreMhEarned: number;
  deltaTotalMhEarned: number;
  deltaMhPctComplete: number;
}

export interface FieldWeldDeltaGrandTotal {
  name: 'Grand Total';
  weldsWithActivity: number;
  deltaFitupCount: number;
  deltaWeldCompleteCount: number;
  deltaAcceptedCount: number;
  deltaPctTotal: number;
}
```

### Report Data Structures

```typescript
export interface ProgressDeltaReportData {
  dimension: GroupingDimension;
  rows: ProgressDeltaRow[];
  manhourRows: ManhourDeltaRow[];
  grandTotal: ProgressDeltaGrandTotal;
  manhourGrandTotal: ManhourDeltaGrandTotal;
  dateRange: ReportDateRange;
  generatedAt: Date;
  projectId: string;
}

export interface FieldWeldDeltaReportData {
  dimension: FieldWeldGroupingDimension;
  rows: FieldWeldDeltaRow[];
  grandTotal: FieldWeldDeltaGrandTotal;
  dateRange: ReportDateRange;
  generatedAt: Date;
  projectId: string;
}
```

---

## Store Extension

### useReportPreferencesStore additions

```typescript
interface ReportPreferencesStore {
  // Existing
  viewMode: ReportViewMode;
  setViewMode: (mode: ReportViewMode) => void;

  // NEW: Date range state
  dateRange: ReportDateRange;
  setDateRangePreset: (preset: DateRangePreset) => void;
  setCustomDateRange: (startDate: string, endDate: string) => void;
  resetDateRange: () => void;
}

const DEFAULT_DATE_RANGE: ReportDateRange = {
  preset: 'all_time',
  startDate: null,
  endDate: null,
};
```

---

## UI Label Constants

```typescript
export const DATE_RANGE_PRESET_LABELS: Record<DateRangePreset, string> = {
  all_time: 'All Time',
  last_7_days: 'Last 7 Days',
  last_30_days: 'Last 30 Days',
  last_90_days: 'Last 90 Days',
  ytd: 'Year to Date',
  custom: 'Custom Range',
};
```

---

## Validation Rules

1. **Custom date range**: `endDate >= startDate` (enforced in UI)
2. **Preset resolution**: Happens at hook level before RPC call
3. **Delta sign**: Positive = progress gained, Negative = rollback
4. **Empty filter**: Rows with `componentsWithActivity === 0` filtered out in hook
