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
