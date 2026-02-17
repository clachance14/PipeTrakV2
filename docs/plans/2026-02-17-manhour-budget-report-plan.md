# Manhour Budget Report Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Budget" view mode to component progress reports showing manhour budget distribution per milestone for P6 export.

**Architecture:** Extend existing `ReportViewMode` type with `'manhour_budget'`, create new table component displaying budget-only columns, add new PDF component with lazy loading. Reuses existing `useManhourProgressReport` hook since budget data already exists in the payload.

**Tech Stack:** React 18, TypeScript, @tanstack/react-virtual, @react-pdf/renderer (lazy-loaded), Zustand, Vitest

---

## Task 1: Update ReportViewMode Type

**Files:**
- Modify: `src/types/reports.ts:18`

**Step 1: Update ReportViewMode type definition**

In `src/types/reports.ts`, find line 18:
```typescript
export type ReportViewMode = 'count' | 'manhour' | 'manhour_percent';
```

Replace with:
```typescript
export type ReportViewMode = 'count' | 'manhour' | 'manhour_percent' | 'manhour_budget';
```

**Step 2: Run type check to verify no errors**

Run: `tsc -b`
Expected: No errors (the new type is valid but not yet used)

**Step 3: Commit**

```bash
git add src/types/reports.ts
git commit -m "$(cat <<'EOF'
feat(reports): add manhour_budget to ReportViewMode type

Extends ReportViewMode union type to include 'manhour_budget' for
budget-only view in component progress reports.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Add Budget Sort State to Preferences Store

**Files:**
- Modify: `src/stores/useReportPreferencesStore.ts`

**Step 1: Add ManhourBudgetReportSortColumn type**

After line 54 (after `ManhourReportSortColumn`), add:
```typescript
// Manhour Budget Report sortable columns (budget-only columns)
export type ManhourBudgetReportSortColumn =
  | 'name'
  | 'mhBudget'
  | 'receiveMhBudget'
  | 'installMhBudget'
  | 'punchMhBudget'
  | 'testMhBudget'
  | 'restoreMhBudget';
```

**Step 2: Add manhourBudgetReport state to interface**

In the `ReportPreferencesStore` interface (around line 125), add after `manhourDeltaReport`:
```typescript
  manhourBudgetReport: {
    sortColumn: ManhourBudgetReportSortColumn;
    sortDirection: 'asc' | 'desc';
  };
  toggleManhourBudgetSort: (column: ManhourBudgetReportSortColumn) => void;
```

**Step 3: Add default state and toggle function**

In the store implementation (around line 191), add after `manhourDeltaReport`:
```typescript
      manhourBudgetReport: {
        sortColumn: 'name',
        sortDirection: 'asc',
      },
```

Add toggle function after `toggleManhourDeltaSort` (around line 315):
```typescript
      toggleManhourBudgetSort: (column: ManhourBudgetReportSortColumn) => {
        set((state) => {
          if (state.manhourBudgetReport.sortColumn === column) {
            return {
              manhourBudgetReport: {
                sortColumn: column,
                sortDirection: state.manhourBudgetReport.sortDirection === 'asc' ? 'desc' : 'asc',
              },
            };
          } else {
            return {
              manhourBudgetReport: {
                sortColumn: column,
                sortDirection: 'asc',
              },
            };
          }
        });
      },
```

**Step 4: Add merge handler for new state**

In the `merge` function (around line 355), add:
```typescript
          // Ensure manhourBudgetReport has defaults even if localStorage is old
          manhourBudgetReport: {
            sortColumn: state?.manhourBudgetReport?.sortColumn ?? 'name',
            sortDirection: state?.manhourBudgetReport?.sortDirection ?? 'asc',
          },
```

**Step 5: Run type check**

Run: `tsc -b`
Expected: No errors

**Step 6: Commit**

```bash
git add src/stores/useReportPreferencesStore.ts
git commit -m "$(cat <<'EOF'
feat(reports): add manhour budget sort state to preferences store

Adds ManhourBudgetReportSortColumn type and manhourBudgetReport state
with localStorage persistence for sorting budget report columns.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Add Sort Function for Budget Report

**Files:**
- Modify: `src/lib/report-sorting.ts`

**Step 1: Import the new sort column type**

At line 20, add to imports:
```typescript
  ManhourBudgetReportSortColumn,
```

**Step 2: Add sortManhourBudgetReportRows function**

Add after `sortManhourDeltaReportRows` (at end of file):
```typescript
/**
 * Sort manhour budget report rows by the specified column and direction
 *
 * @param rows - Array of manhour progress rows to sort (uses same type as manhour report)
 * @param sortColumn - Column to sort by (budget columns only)
 * @param sortDirection - Sort direction ('asc' or 'desc')
 * @returns Sorted array of rows (original array is not mutated)
 */
export function sortManhourBudgetReportRows(
  rows: ManhourProgressRow[],
  sortColumn: ManhourBudgetReportSortColumn,
  sortDirection: 'asc' | 'desc'
): ManhourProgressRow[] {
  const multiplier = sortDirection === 'asc' ? 1 : -1;

  return [...rows].sort((a, b) => {
    if (sortColumn === 'name') {
      return multiplier * a.name.localeCompare(b.name);
    }

    // Numeric sorting for all other columns
    const valueA = a[sortColumn];
    const valueB = b[sortColumn];

    return multiplier * (valueA - valueB);
  });
}
```

**Step 3: Run type check**

Run: `tsc -b`
Expected: No errors

**Step 4: Commit**

```bash
git add src/lib/report-sorting.ts
git commit -m "$(cat <<'EOF'
feat(reports): add sort function for manhour budget report

Adds sortManhourBudgetReportRows for sorting budget-only columns
(name, mhBudget, receiveMhBudget, installMhBudget, etc).

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Create ManhourBudgetReportTable Component

**Files:**
- Create: `src/components/reports/ManhourBudgetReportTable.tsx`
- Create: `src/components/reports/ManhourBudgetReportTable.test.tsx`

**Step 1: Write the failing test**

Create `src/components/reports/ManhourBudgetReportTable.test.tsx`:
```typescript
/**
 * ManhourBudgetReportTable Component Tests
 * Tests for budget-only manhour report table
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ManhourBudgetReportTable } from './ManhourBudgetReportTable';
import type { ManhourReportData } from '@/types/reports';

// Mock the report preferences store
const mockToggleManhourBudgetSort = vi.fn();
vi.mock('@/stores/useReportPreferencesStore', () => ({
  useReportPreferencesStore: () => ({
    manhourBudgetReport: {
      sortColumn: 'name',
      sortDirection: 'asc',
    },
    toggleManhourBudgetSort: mockToggleManhourBudgetSort,
  }),
}));

describe('ManhourBudgetReportTable', () => {
  const mockData: ManhourReportData = {
    dimension: 'area',
    projectId: 'test-project',
    generatedAt: new Date('2026-02-17'),
    rows: [
      {
        id: '1',
        name: 'Area A',
        projectId: 'test-project',
        mhBudget: 1000,
        receiveMhBudget: 100,
        receiveMhEarned: 50,
        installMhBudget: 400,
        installMhEarned: 200,
        punchMhBudget: 200,
        punchMhEarned: 100,
        testMhBudget: 200,
        testMhEarned: 100,
        restoreMhBudget: 100,
        restoreMhEarned: 50,
        totalMhEarned: 500,
        mhPctComplete: 50,
      },
      {
        id: '2',
        name: 'Area B',
        projectId: 'test-project',
        mhBudget: 500,
        receiveMhBudget: 50,
        receiveMhEarned: 25,
        installMhBudget: 200,
        installMhEarned: 100,
        punchMhBudget: 100,
        punchMhEarned: 50,
        testMhBudget: 100,
        testMhEarned: 50,
        restoreMhBudget: 50,
        restoreMhEarned: 25,
        totalMhEarned: 250,
        mhPctComplete: 50,
      },
    ],
    grandTotal: {
      name: 'Grand Total',
      mhBudget: 1500,
      receiveMhBudget: 150,
      receiveMhEarned: 75,
      installMhBudget: 600,
      installMhEarned: 300,
      punchMhBudget: 300,
      punchMhEarned: 150,
      testMhBudget: 300,
      testMhEarned: 150,
      restoreMhBudget: 150,
      restoreMhEarned: 75,
      totalMhEarned: 750,
      mhPctComplete: 50,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders budget columns correctly', () => {
    render(<ManhourBudgetReportTable data={mockData} />);

    // Check header columns
    expect(screen.getByRole('columnheader', { name: /area/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /mh budget/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /receive/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /install/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /punch/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /test/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /restore/i })).toBeInTheDocument();
  });

  it('renders data rows with budget values', () => {
    render(<ManhourBudgetReportTable data={mockData} />);

    // Check data values - budget columns should show budget values, not earned
    expect(screen.getByText('Area A')).toBeInTheDocument();
    expect(screen.getByText('1,000')).toBeInTheDocument(); // mhBudget for Area A
    expect(screen.getByText('Area B')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument(); // mhBudget for Area B
  });

  it('renders Grand Total row', () => {
    render(<ManhourBudgetReportTable data={mockData} />);

    expect(screen.getByText('Grand Total')).toBeInTheDocument();
    expect(screen.getByText('1,500')).toBeInTheDocument(); // Grand total mhBudget
  });

  it('shows empty state when no data', () => {
    const emptyData: ManhourReportData = {
      ...mockData,
      rows: [],
      grandTotal: {
        name: 'Grand Total',
        mhBudget: 0,
        receiveMhBudget: 0,
        receiveMhEarned: 0,
        installMhBudget: 0,
        installMhEarned: 0,
        punchMhBudget: 0,
        punchMhEarned: 0,
        testMhBudget: 0,
        testMhEarned: 0,
        restoreMhBudget: 0,
        restoreMhEarned: 0,
        totalMhEarned: 0,
        mhPctComplete: 0,
      },
    };

    render(<ManhourBudgetReportTable data={emptyData} />);

    expect(screen.getByText(/no components found/i)).toBeInTheDocument();
  });

  it('calls toggleManhourBudgetSort when column header is clicked', async () => {
    const user = userEvent.setup();
    render(<ManhourBudgetReportTable data={mockData} />);

    const mhBudgetHeader = screen.getByRole('columnheader', { name: /mh budget/i });
    await user.click(mhBudgetHeader);

    expect(mockToggleManhourBudgetSort).toHaveBeenCalledWith('mhBudget');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/reports/ManhourBudgetReportTable.test.tsx`
Expected: FAIL - module not found

**Step 3: Write the implementation**

Create `src/components/reports/ManhourBudgetReportTable.tsx`:
```typescript
/**
 * ManhourBudgetReportTable Component
 * Virtualized table for displaying manhour budget distribution report
 * Shows budget-only columns: MH Budget, Receive, Install, Punch, Test, Restore
 */

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { ManhourReportData, ManhourProgressRow, ManhourGrandTotalRow } from '@/types/reports';
import { DIMENSION_LABELS } from '@/types/reports';
import { useReportPreferencesStore, type ManhourBudgetReportSortColumn } from '@/stores/useReportPreferencesStore';
import { sortManhourBudgetReportRows } from '@/lib/report-sorting';

interface ManhourBudgetReportTableProps {
  data: ManhourReportData;
}

// Sort indicator component
function SortIndicator({ column, currentColumn, direction }: { column: string; currentColumn: string; direction: 'asc' | 'desc' }) {
  if (column !== currentColumn) return null;
  return <span className="ml-1">{direction === 'asc' ? '↑' : '↓'}</span>;
}

/**
 * Format manhour value with appropriate precision
 * Shows whole numbers for large values, 1 decimal for small values
 */
function formatManhour(value: number): string {
  if (value === 0) return '0';
  if (value < 10) return value.toFixed(1);
  return Math.round(value).toLocaleString();
}

export function ManhourBudgetReportTable({ data }: ManhourBudgetReportTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Get sort state from store
  const { manhourBudgetReport, toggleManhourBudgetSort } = useReportPreferencesStore();
  const { sortColumn, sortDirection } = manhourBudgetReport;

  // Sort rows, then combine with grand total (grand total always at bottom)
  const sortedRows = sortManhourBudgetReportRows(data.rows, sortColumn, sortDirection);
  const allRows: (ManhourProgressRow | ManhourGrandTotalRow)[] = [...sortedRows, data.grandTotal];

  const rowVirtualizer = useVirtualizer({
    count: allRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  // Empty state
  if (data.rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <p>No components found for this grouping dimension.</p>
      </div>
    );
  }

  // Get dimension-specific column header
  const dimensionLabel = DIMENSION_LABELS[data.dimension];

  // Column header click handler
  const handleHeaderClick = (column: ManhourBudgetReportSortColumn) => {
    toggleManhourBudgetSort(column);
  };

  return (
    <div
      className="border rounded-lg overflow-hidden"
      role="table"
      aria-label={`Manhour budget report grouped by ${dimensionLabel}`}
    >
      {/* Table Header (Sticky) */}
      {/* Desktop: 7 columns, Mobile: 2 columns (Name, MH Budget) */}
      <div className="sticky top-0 z-10 bg-slate-700 dark:bg-slate-800 border-b" role="rowgroup">
        <div
          role="row"
          className="grid grid-cols-[2fr_1fr] lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm font-semibold text-white"
        >
          <button
            role="columnheader"
            className="text-left hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
            onClick={() => handleHeaderClick('name')}
            aria-label={`Sort by ${dimensionLabel}`}
          >
            {dimensionLabel}
            <SortIndicator column="name" currentColumn={sortColumn} direction={sortDirection} />
          </button>
          <button
            role="columnheader"
            className="text-right hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
            onClick={() => handleHeaderClick('mhBudget')}
            aria-label="Sort by MH Budget"
          >
            MH Budget
            <SortIndicator column="mhBudget" currentColumn={sortColumn} direction={sortDirection} />
          </button>
          <button
            role="columnheader"
            className="text-right hidden lg:block hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
            onClick={() => handleHeaderClick('receiveMhBudget')}
            aria-label="Sort by Receive budget"
          >
            Receive
            <SortIndicator column="receiveMhBudget" currentColumn={sortColumn} direction={sortDirection} />
          </button>
          <button
            role="columnheader"
            className="text-right hidden lg:block hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
            onClick={() => handleHeaderClick('installMhBudget')}
            aria-label="Sort by Install budget"
          >
            Install
            <SortIndicator column="installMhBudget" currentColumn={sortColumn} direction={sortDirection} />
          </button>
          <button
            role="columnheader"
            className="text-right hidden lg:block hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
            onClick={() => handleHeaderClick('punchMhBudget')}
            aria-label="Sort by Punch budget"
          >
            Punch
            <SortIndicator column="punchMhBudget" currentColumn={sortColumn} direction={sortDirection} />
          </button>
          <button
            role="columnheader"
            className="text-right hidden lg:block hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
            onClick={() => handleHeaderClick('testMhBudget')}
            aria-label="Sort by Test budget"
          >
            Test
            <SortIndicator column="testMhBudget" currentColumn={sortColumn} direction={sortDirection} />
          </button>
          <button
            role="columnheader"
            className="text-right hidden lg:block hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
            onClick={() => handleHeaderClick('restoreMhBudget')}
            aria-label="Sort by Restore budget"
          >
            Restore
            <SortIndicator column="restoreMhBudget" currentColumn={sortColumn} direction={sortDirection} />
          </button>
        </div>
      </div>

      {/* Virtualized Table Body */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ height: '500px' }}
        data-testid="manhour-budget-report-table-body"
        role="rowgroup"
        aria-label="Manhour budget report data rows"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {(rowVirtualizer.getVirtualItems().length > 0
            ? rowVirtualizer.getVirtualItems()
            : allRows.map((_, index) => ({ index, start: index * 48, size: 48, key: index }))
          ).map((virtualRow) => {
            const row = allRows[virtualRow.index];
            if (!row) return null;
            const isGrandTotal = row.name === 'Grand Total';

            return (
              <div
                key={virtualRow.index}
                role="row"
                aria-label={
                  isGrandTotal ? 'Grand Total summary row' : `${row.name} manhour budget data`
                }
                data-testid={`manhour-budget-report-row-${virtualRow.index}`}
                className={`grid grid-cols-[2fr_1fr] lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 border-b text-sm ${
                  isGrandTotal ? 'font-bold bg-slate-700 dark:bg-slate-800 text-white' : ''
                }`}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div role="cell" className="text-left truncate" aria-label={`${dimensionLabel} name`}>
                  {row.name}
                </div>
                <div role="cell" className="text-right" aria-label="Manhour budget">
                  {formatManhour(row.mhBudget)}
                </div>
                <div
                  role="cell"
                  className="text-right hidden lg:block"
                  aria-label={`Receive budget ${formatManhour(row.receiveMhBudget)}`}
                >
                  {formatManhour(row.receiveMhBudget)}
                </div>
                <div
                  role="cell"
                  className="text-right hidden lg:block"
                  aria-label={`Install budget ${formatManhour(row.installMhBudget)}`}
                >
                  {formatManhour(row.installMhBudget)}
                </div>
                <div
                  role="cell"
                  className="text-right hidden lg:block"
                  aria-label={`Punch budget ${formatManhour(row.punchMhBudget)}`}
                >
                  {formatManhour(row.punchMhBudget)}
                </div>
                <div
                  role="cell"
                  className="text-right hidden lg:block"
                  aria-label={`Test budget ${formatManhour(row.testMhBudget)}`}
                >
                  {formatManhour(row.testMhBudget)}
                </div>
                <div
                  role="cell"
                  className="text-right hidden lg:block"
                  aria-label={`Restore budget ${formatManhour(row.restoreMhBudget)}`}
                >
                  {formatManhour(row.restoreMhBudget)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/components/reports/ManhourBudgetReportTable.test.tsx`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/components/reports/ManhourBudgetReportTable.tsx src/components/reports/ManhourBudgetReportTable.test.tsx
git commit -m "$(cat <<'EOF'
feat(reports): add ManhourBudgetReportTable component

Virtualized table displaying budget-only columns (MH Budget, Receive,
Install, Punch, Test, Restore) for P6 export. Mobile-responsive with
Name and MH Budget visible on small screens.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Add PDF Utils for Budget Report

**Files:**
- Modify: `src/lib/pdfUtils.ts`

**Step 1: Add transformManhourBudgetToTableProps function**

Add after `transformManhourPercentToTableProps` (around line 487):
```typescript
/**
 * Transform manhour report data to table props for "Manhour Budget" view PDF rendering
 * Shows: Name | MH Budget | Receive | Install | Punch | Test | Restore
 */
export function transformManhourBudgetToTableProps(
  reportData: ManhourReportData,
  dimension: GroupingDimension
): TableProps {
  const columns: TableColumnDefinition[] = [
    { key: 'name', label: getComponentProgressDimensionLabel(dimension), width: '22%', align: 'left', format: 'text' },
    { key: 'mhBudget', label: 'MH Budget', width: '13%', align: 'right', format: 'number' },
    { key: 'receiveMhBudget', label: 'Receive', width: '13%', align: 'right', format: 'decimal' },
    { key: 'installMhBudget', label: 'Install', width: '13%', align: 'right', format: 'decimal' },
    { key: 'punchMhBudget', label: 'Punch', width: '13%', align: 'right', format: 'decimal' },
    { key: 'testMhBudget', label: 'Test', width: '13%', align: 'right', format: 'decimal' },
    { key: 'restoreMhBudget', label: 'Restore', width: '13%', align: 'right', format: 'decimal' },
  ];

  return {
    columns,
    data: reportData.rows.map((row) => ({
      name: row.name,
      mhBudget: row.mhBudget,
      receiveMhBudget: row.receiveMhBudget,
      installMhBudget: row.installMhBudget,
      punchMhBudget: row.punchMhBudget,
      testMhBudget: row.testMhBudget,
      restoreMhBudget: row.restoreMhBudget,
    })),
    grandTotal: {
      name: 'Grand Total',
      mhBudget: reportData.grandTotal.mhBudget,
      receiveMhBudget: reportData.grandTotal.receiveMhBudget,
      installMhBudget: reportData.grandTotal.installMhBudget,
      punchMhBudget: reportData.grandTotal.punchMhBudget,
      testMhBudget: reportData.grandTotal.testMhBudget,
      restoreMhBudget: reportData.grandTotal.restoreMhBudget,
    },
    highlightGrandTotal: true,
  };
}
```

**Step 2: Update generateManhourProgressPDFFilename to handle budget view**

Modify the function (around line 493) to handle the new view mode:
```typescript
export function generateManhourProgressPDFFilename(
  projectName: string,
  dimension: GroupingDimension,
  viewMode: ReportViewMode,
  date: Date = new Date()
): string {
  const sanitizedProjectName = sanitizeFilename(projectName);
  const formattedDate = formatDateForFilename(date);
  const viewSuffix = viewMode === 'manhour_percent'
    ? 'mh_percent'
    : viewMode === 'manhour_budget'
      ? 'mh_budget'
      : 'manhour';
  return `${sanitizedProjectName}_${viewSuffix}_progress_${dimension}_${formattedDate}.pdf`;
}
```

**Step 3: Run type check**

Run: `tsc -b`
Expected: No errors

**Step 4: Commit**

```bash
git add src/lib/pdfUtils.ts
git commit -m "$(cat <<'EOF'
feat(reports): add PDF utils for manhour budget report

Adds transformManhourBudgetToTableProps for budget-only PDF rendering
and updates filename generation to handle manhour_budget view mode.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Create ManhourBudgetReportPDF Component

**Files:**
- Create: `src/components/pdf/reports/ManhourBudgetReportPDF.tsx`
- Create: `src/components/pdf/reports/ManhourBudgetReportPDF.test.tsx`

**Step 1: Write the failing test**

Create `src/components/pdf/reports/ManhourBudgetReportPDF.test.tsx`:
```typescript
/**
 * ManhourBudgetReportPDF Component Tests
 * Tests for PDF document generation of manhour budget report
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ManhourBudgetReportPDF } from './ManhourBudgetReportPDF';
import type { ManhourReportData } from '@/types/reports';

// Mock @react-pdf/renderer
vi.mock('@react-pdf/renderer', () => ({
  Document: ({ children }: { children: React.ReactNode }) => <div data-testid="pdf-document">{children}</div>,
  Page: ({ children }: { children: React.ReactNode }) => <div data-testid="pdf-page">{children}</div>,
  View: ({ children }: { children: React.ReactNode }) => <div data-testid="pdf-view">{children}</div>,
  Text: ({ children }: { children: React.ReactNode }) => <span data-testid="pdf-text">{children}</span>,
  StyleSheet: { create: (styles: Record<string, unknown>) => styles },
}));

// Mock PDF components
vi.mock('../layout/BrandedHeader', () => ({
  BrandedHeader: ({ title }: { title: string }) => <div data-testid="branded-header">{title}</div>,
}));

vi.mock('../layout/ReportFooter', () => ({
  ReportFooter: () => <div data-testid="report-footer">Footer</div>,
}));

vi.mock('../tables/Table', () => ({
  Table: ({ data, grandTotal }: { data: unknown[]; grandTotal: unknown }) => (
    <div data-testid="pdf-table">
      <span>Rows: {data.length}</span>
      <span>Grand Total: {grandTotal ? 'Yes' : 'No'}</span>
    </div>
  ),
}));

describe('ManhourBudgetReportPDF', () => {
  const mockData: ManhourReportData = {
    dimension: 'area',
    projectId: 'test-project',
    generatedAt: new Date('2026-02-17'),
    rows: [
      {
        id: '1',
        name: 'Area A',
        projectId: 'test-project',
        mhBudget: 1000,
        receiveMhBudget: 100,
        receiveMhEarned: 50,
        installMhBudget: 400,
        installMhEarned: 200,
        punchMhBudget: 200,
        punchMhEarned: 100,
        testMhBudget: 200,
        testMhEarned: 100,
        restoreMhBudget: 100,
        restoreMhEarned: 50,
        totalMhEarned: 500,
        mhPctComplete: 50,
      },
    ],
    grandTotal: {
      name: 'Grand Total',
      mhBudget: 1000,
      receiveMhBudget: 100,
      receiveMhEarned: 50,
      installMhBudget: 400,
      installMhEarned: 200,
      punchMhBudget: 200,
      punchMhEarned: 100,
      testMhBudget: 200,
      testMhEarned: 100,
      restoreMhBudget: 100,
      restoreMhEarned: 50,
      totalMhEarned: 500,
      mhPctComplete: 50,
    },
  };

  it('renders PDF document structure', () => {
    render(
      <ManhourBudgetReportPDF
        reportData={mockData}
        projectName="Test Project"
        dimension="area"
        generatedDate="2026-02-17"
      />
    );

    expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
    expect(screen.getByTestId('pdf-page')).toBeInTheDocument();
    expect(screen.getByTestId('branded-header')).toBeInTheDocument();
    expect(screen.getByTestId('pdf-table')).toBeInTheDocument();
    expect(screen.getByTestId('report-footer')).toBeInTheDocument();
  });

  it('displays correct report title', () => {
    render(
      <ManhourBudgetReportPDF
        reportData={mockData}
        projectName="Test Project"
        dimension="area"
        generatedDate="2026-02-17"
      />
    );

    expect(screen.getByText('PipeTrak Manhour Budget Report')).toBeInTheDocument();
  });

  it('renders table with data rows', () => {
    render(
      <ManhourBudgetReportPDF
        reportData={mockData}
        projectName="Test Project"
        dimension="area"
        generatedDate="2026-02-17"
      />
    );

    expect(screen.getByText('Rows: 1')).toBeInTheDocument();
    expect(screen.getByText('Grand Total: Yes')).toBeInTheDocument();
  });

  it('handles empty data with appropriate message', () => {
    const emptyData: ManhourReportData = {
      ...mockData,
      rows: [],
    };

    render(
      <ManhourBudgetReportPDF
        reportData={emptyData}
        projectName="Test Project"
        dimension="area"
        generatedDate="2026-02-17"
      />
    );

    expect(screen.getByText('No data available for this report.')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/pdf/reports/ManhourBudgetReportPDF.test.tsx`
Expected: FAIL - module not found

**Step 3: Write the implementation**

Create `src/components/pdf/reports/ManhourBudgetReportPDF.tsx`:
```typescript
/**
 * ManhourBudgetReportPDF Component
 *
 * Complete PDF document for manhour budget report.
 * Shows budget distribution per milestone (no earned values).
 *
 * Features:
 * - Multi-page support (splits data into 50-row pages)
 * - Repeated headers and footers on each page
 * - Grand total only on last page
 * - Empty state handling
 * - Landscape A4 orientation
 */

import { Document, Page, View, Text } from '@react-pdf/renderer';
import { BrandedHeader } from '../layout/BrandedHeader';
import { ReportFooter } from '../layout/ReportFooter';
import { Table } from '../tables/Table';
import { commonStyles } from '../styles/commonStyles';
import {
  transformManhourBudgetToTableProps,
  getComponentProgressDimensionLabel,
} from '@/lib/pdfUtils';
import type { ManhourReportData, GroupingDimension } from '@/types/reports';

const ROWS_PER_PAGE = 50;

interface ManhourBudgetReportPDFProps {
  reportData: ManhourReportData;
  projectName: string;
  dimension: GroupingDimension;
  generatedDate: string;
  companyLogo?: string;
  subtitle?: string;
}

export function ManhourBudgetReportPDF({
  reportData,
  projectName,
  dimension,
  generatedDate,
  companyLogo,
  subtitle,
}: ManhourBudgetReportPDFProps) {
  const tableProps = transformManhourBudgetToTableProps(reportData, dimension);
  const dimensionLabel = getComponentProgressDimensionLabel(dimension);
  const reportTitle = 'PipeTrak Manhour Budget Report';

  // Handle empty data
  if (!reportData.rows || reportData.rows.length === 0) {
    return (
      <Document>
        <Page size="A4" orientation="landscape" style={commonStyles.page}>
          <BrandedHeader
            logo={companyLogo}
            title={reportTitle}
            subtitle={subtitle}
            projectName={projectName}
            dimensionLabel={dimensionLabel}
            generatedDate={generatedDate}
          />

          <View style={{ marginTop: 40, alignItems: 'center' }}>
            <Text style={commonStyles.body}>
              No data available for this report.
            </Text>
          </View>

          <ReportFooter showPageNumbers={true} />
        </Page>
      </Document>
    );
  }

  // Split data into pages if necessary
  const rowsPerPage = ROWS_PER_PAGE;
  const totalDataRows = tableProps.data.length;
  const pageCount = Math.ceil(totalDataRows / rowsPerPage);

  const pages = [];
  for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
    const startIndex = pageIndex * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, totalDataRows);
    const pageData = tableProps.data.slice(startIndex, endIndex);

    // Include grand total only on the last page
    const includeGrandTotal = pageIndex === pageCount - 1;

    pages.push({
      data: pageData,
      grandTotal: includeGrandTotal ? tableProps.grandTotal : undefined,
    });
  }

  return (
    <Document>
      {pages.map((page, pageIndex) => (
        <Page
          key={`page-${pageIndex}`}
          size="A4"
          orientation="landscape"
          style={commonStyles.page}
        >
          <BrandedHeader
            logo={companyLogo}
            title={reportTitle}
            subtitle={subtitle}
            projectName={projectName}
            dimensionLabel={dimensionLabel}
            generatedDate={generatedDate}
          />

          <Table
            columns={tableProps.columns}
            data={page.data}
            grandTotal={page.grandTotal}
            highlightGrandTotal={tableProps.highlightGrandTotal}
          />

          <ReportFooter showPageNumbers={true} />
        </Page>
      ))}
    </Document>
  );
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/components/pdf/reports/ManhourBudgetReportPDF.test.tsx`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/components/pdf/reports/ManhourBudgetReportPDF.tsx src/components/pdf/reports/ManhourBudgetReportPDF.test.tsx
git commit -m "$(cat <<'EOF'
feat(reports): add ManhourBudgetReportPDF component

PDF document component for manhour budget reports. Shows budget
distribution per milestone without earned values. Supports multi-page
rendering with 50 rows per page.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Update ReportViewModeToggle

**Files:**
- Modify: `src/components/reports/ReportViewModeToggle.tsx`

**Step 1: Add Budget button to toggle**

Import `DollarSign` icon (add to line 6):
```typescript
import { Hash, Clock, Percent, DollarSign } from 'lucide-react';
```

Update `handleChange` function (line 24-27) to include `manhour_budget`:
```typescript
  const handleChange = (mode: ReportViewMode) => {
    if (disabled) return;
    if ((mode === 'manhour' || mode === 'manhour_percent' || mode === 'manhour_budget') && !hasBudget) return;
    onChange(mode);
  };
```

Remove `rounded-r-md` from the MH % button (line 86) and add the Budget button after it (before the closing `</div>`):

```typescript
      {/* Budget View Button */}
      <button
        type="button"
        role="radio"
        aria-checked={value === 'manhour_budget'}
        onClick={() => handleChange('manhour_budget')}
        disabled={disabled || !hasBudget}
        title={!hasBudget ? 'Create a manhour budget in Settings to enable this view' : undefined}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors',
          'rounded-r-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          value === 'manhour_budget'
            ? 'bg-primary text-primary-foreground'
            : 'hover:bg-accent hover:text-accent-foreground'
        )}
      >
        <DollarSign className="h-4 w-4" aria-hidden="true" />
        <span>Budget</span>
      </button>
```

**Step 2: Run type check and lint**

Run: `tsc -b && npm run lint`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/reports/ReportViewModeToggle.tsx
git commit -m "$(cat <<'EOF'
feat(reports): add Budget button to view mode toggle

Adds fourth toggle option for manhour budget view. Button is disabled
when no manhour budget exists (same as Manhour and MH % views).

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Update ReportPreview to Handle Budget View

**Files:**
- Modify: `src/components/reports/ReportPreview.tsx`

**Step 1: Import the new table component**

Add import at line 12 (after ManhourPercentReportTable):
```typescript
import { ManhourBudgetReportTable } from './ManhourBudgetReportTable';
```

**Step 2: Update effectiveViewMode calculation**

Modify the effectiveViewMode logic (around line 102-107) to handle `manhour_budget`:
```typescript
  // Effective view mode (fall back to count if manhour data unavailable)
  const effectiveViewMode: ReportViewMode = (() => {
    if ((viewMode === 'manhour' || viewMode === 'manhour_percent' || viewMode === 'manhour_budget') && manhourData && hasManhourBudget) {
      return viewMode;
    }
    return 'count';
  })();
```

**Step 3: Add budget table to render logic**

Update the conditional rendering (around line 273-280) to include budget view:
```typescript
        ) : // Standard mode: Show regular report tables
        effectiveViewMode === 'manhour_budget' && manhourData ? (
          <ManhourBudgetReportTable data={manhourData} />
        ) : effectiveViewMode === 'manhour_percent' && manhourData ? (
          <ManhourPercentReportTable data={manhourData} />
        ) : effectiveViewMode === 'manhour' && manhourData ? (
          <ManhourReportTable data={manhourData} />
        ) : (
          <ReportTable data={data} />
        )}
```

**Step 4: Update footer text for budget view**

Update the footer text (around line 285-292) to include budget view description:
```typescript
        <p>
          {isDeltaMode
            ? 'This report shows progress change (delta) for the selected time period. Positive values indicate progress gained, negative values indicate rollbacks.'
            : effectiveViewMode === 'manhour_budget'
              ? 'This report shows manhour budget distribution across milestones. Use this for P6 planning and budget allocation.'
              : effectiveViewMode === 'manhour_percent'
                ? 'This report shows completion percentage per milestone, calculated as (earned MH / budget MH) for each milestone.'
                : effectiveViewMode === 'manhour'
                  ? 'This report shows manhour earned value calculated from component progress and project-specific milestone weights.'
                  : 'This report shows progress percentages calculated using earned value methodology. Percentages reflect partial completion where applicable.'}
        </p>
```

**Step 5: Run type check**

Run: `tsc -b`
Expected: No errors

**Step 6: Commit**

```bash
git add src/components/reports/ReportPreview.tsx
git commit -m "$(cat <<'EOF'
feat(reports): integrate ManhourBudgetReportTable into ReportPreview

Adds manhour_budget view mode handling to ReportPreview. Renders
ManhourBudgetReportTable when budget view is selected.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Add PDF Export for Budget View

**Files:**
- Modify: `src/hooks/useComponentProgressPDFExport.ts`

**Step 1: Read the current hook implementation**

First understand the existing structure by reading the file.

**Step 2: Import the new PDF component and utilities**

The hook should already have dynamic imports. Add `ManhourBudgetReportPDF` to the dynamic import alongside existing PDF components.

**Step 3: Add generateBudgetPDFPreview function**

Add a new function similar to `generateManhourPDFPreview` that handles the budget view.

**Step 4: Update handleEnhancedPDFExport in ReportPreview**

Modify `ReportPreview.tsx` to call the budget PDF generation when `effectiveViewMode === 'manhour_budget'`.

**Step 5: Run type check and tests**

Run: `tsc -b && npm test`
Expected: No errors, all tests pass

**Step 6: Commit**

```bash
git add src/hooks/useComponentProgressPDFExport.ts src/components/reports/ReportPreview.tsx
git commit -m "$(cat <<'EOF'
feat(reports): add PDF export for manhour budget view

Adds generateBudgetPDFPreview to useComponentProgressPDFExport hook.
Updates ReportPreview to generate budget PDF when in budget view mode.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Final Integration Test

**Files:**
- Run: Full test suite and type check

**Step 1: Run full type check**

Run: `tsc -b`
Expected: No errors

**Step 2: Run full lint check**

Run: `npm run lint`
Expected: No errors

**Step 3: Run full test suite**

Run: `npm test`
Expected: All tests pass, coverage meets thresholds

**Step 4: Manual verification checklist**

- [ ] View mode toggle shows 4 options: Count | Manhour | MH % | Budget
- [ ] Budget option is disabled when no manhour budget exists
- [ ] Budget table shows only budget columns (no earned values)
- [ ] Sorting works on all budget columns
- [ ] Mobile view shows only Name and MH Budget
- [ ] PDF export generates correct document with budget columns
- [ ] PDF filename follows pattern: `{project}_mh_budget_progress_{dimension}_{date}.pdf`

**Step 5: Final commit with all changes**

If any fixes were needed:
```bash
git add -A
git commit -m "$(cat <<'EOF'
fix(reports): address integration issues in manhour budget report

Final fixes and adjustments after integration testing.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```
