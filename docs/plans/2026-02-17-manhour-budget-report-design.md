# Manhour Budget Report Design

**Date:** 2026-02-17
**Status:** Approved
**Purpose:** Add a budget-only view mode to component progress reports for P6 planning

## Overview

Add a fourth view mode (`manhour_budget`) to the existing report view toggle, displaying only the manhour budget distribution across milestones. This enables users to export budget allocations for import into P6 (Primavera) for project planning.

## Requirements

- Show budget distribution per milestone (Receive, Install, Punch, Test, Restore)
- Group by existing dimensions: Area, System, Test Package
- PDF export with same visual styling as other reports
- Only available when project has a manhour budget configured

## Type Changes

```typescript
// src/types/reports.ts
// Current
export type ReportViewMode = 'count' | 'manhour' | 'manhour_percent';

// New
export type ReportViewMode = 'count' | 'manhour' | 'manhour_percent' | 'manhour_budget';
```

No new hooks required - `useManhourProgressReport` already fetches all budget columns:
- `receiveMhBudget`, `installMhBudget`, `punchMhBudget`, `testMhBudget`, `restoreMhBudget`

## Components

### New: ManhourBudgetReportTable.tsx

Virtualized table displaying budget-only columns:

| Column | Source Field | Mobile |
|--------|--------------|--------|
| Area/System/Test Package | `name` | Show |
| MH Budget | `mhBudget` | Show |
| Receive | `receiveMhBudget` | Hide |
| Install | `installMhBudget` | Hide |
| Punch | `punchMhBudget` | Hide |
| Test | `testMhBudget` | Hide |
| Restore | `restoreMhBudget` | Hide |

Features:
- Same visual styling as `ManhourReportTable` (slate-700 header, virtualized rows)
- Grand Total row at bottom
- Sortable columns using existing `useReportPreferencesStore` pattern
- Mobile: Show Name and MH Budget only

### Update: ReportViewModeToggle.tsx

Add fourth button to toggle group:
- Count | Manhour | MH % | **Budget**

Budget option enabled only when `hasManhourBudget === true` (same condition as Manhour view).

### New: ManhourBudgetReportPDF.tsx

PDF export component:
- Lazy-loaded via dynamic import (consistent with existing PDF patterns)
- Landscape orientation (7 columns)
- Company logo header
- Slate-700 table header styling
- Grand Total row with bold styling
- Filename: `{ProjectName}_Manhour_Budget_by_{Dimension}_{Date}.pdf`

## Data Flow

```
ReportsPage
  └── ReportViewModeToggle (adds 'manhour_budget' option)
  └── ReportPreview
        └── (viewMode === 'manhour_budget')
              └── ManhourBudgetReportTable
                    └── data from useManhourProgressReport (existing)
        └── ExportButtons
              └── (viewMode === 'manhour_budget')
                    └── lazy import ManhourBudgetReportPDF
```

## Testing

### Unit Tests
- `ManhourBudgetReportTable.test.tsx`
  - Renders all budget columns correctly
  - Sorting works for each column
  - Grand Total row displays at bottom
  - Empty state when no data
  - Mobile view hides milestone breakdown columns

- `ManhourBudgetReportPDF.test.tsx`
  - Renders PDF document structure
  - Formats manhour values correctly
  - Grand Total row included

### Integration
- View mode toggle shows all 4 options
- Budget option disabled when no manhour budget exists
- PDF export generates correct filename
- Switching between view modes preserves dimension selection

### Coverage Target
80%+ for new components (per CI requirements for `src/components/**`)

## Files to Create/Modify

### Create
- `src/components/reports/ManhourBudgetReportTable.tsx`
- `src/components/reports/ManhourBudgetReportTable.test.tsx`
- `src/components/pdf/reports/ManhourBudgetReportPDF.tsx`
- `src/components/pdf/reports/ManhourBudgetReportPDF.test.tsx`

### Modify
- `src/types/reports.ts` - Add `'manhour_budget'` to `ReportViewMode`
- `src/components/reports/ReportViewModeToggle.tsx` - Add fourth button
- `src/components/reports/ReportPreview.tsx` - Handle new view mode
- `src/stores/useReportPreferencesStore.ts` - Add sort state for budget view (if needed)

## Out of Scope

- Excel/CSV export (PDF only per requirements)
- New grouping dimensions (uses existing Area/System/Test Package)
- Budget editing (read-only report)
