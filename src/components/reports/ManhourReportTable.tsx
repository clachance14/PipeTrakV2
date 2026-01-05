/**
 * ManhourReportTable Component (Feature 032)
 * Virtualized table for displaying manhour progress report
 * Shows MH Budget, Earned MH per milestone, Total Earned, and % Complete
 */

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { ManhourReportData, ManhourProgressRow, ManhourGrandTotalRow } from '@/types/reports';
import { DIMENSION_LABELS } from '@/types/reports';
import { useReportPreferencesStore } from '@/stores/useReportPreferencesStore';
import { sortManhourReportRows } from '@/lib/report-sorting';

interface ManhourReportTableProps {
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

/**
 * Format percentage value
 */
function formatPercent(value: number, isGrandTotal: boolean): string {
  return isGrandTotal ? value.toFixed(1) : Math.round(value).toString();
}

export function ManhourReportTable({ data }: ManhourReportTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Get sort state from store
  const { manhourReport, toggleManhourSort } = useReportPreferencesStore();
  const { sortColumn, sortDirection } = manhourReport;

  // Sort rows, then combine with grand total (grand total always at bottom)
  const sortedRows = sortManhourReportRows(data.rows, sortColumn, sortDirection);
  const allRows: (ManhourProgressRow | ManhourGrandTotalRow)[] = [...sortedRows, data.grandTotal];

  const rowVirtualizer = useVirtualizer({
    count: allRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48, // Estimated row height in pixels
    overscan: 10, // Increased overscan for better test compatibility
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

  return (
    <div
      className="border rounded-lg overflow-hidden"
      role="table"
      aria-label={`Manhour progress report grouped by ${dimensionLabel}`}
    >
      {/* Table Header (Sticky) */}
      {/* Desktop: 9 columns, Mobile: 4 columns (Name, MH Budget, Total Earned, % Complete) */}
      <div className="sticky top-0 z-10 bg-slate-700 dark:bg-slate-800 border-b" role="rowgroup">
        <div
          role="row"
          className="grid grid-cols-[2fr_1fr_1fr_1fr] lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm font-semibold text-white"
        >
          <button
            role="columnheader"
            className="text-left hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
            onClick={() => toggleManhourSort('name')}
            aria-label={`Sort by ${dimensionLabel}`}
          >
            {dimensionLabel}
            <SortIndicator column="name" currentColumn={sortColumn} direction={sortDirection} />
          </button>
          <button
            role="columnheader"
            className="text-right hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
            onClick={() => toggleManhourSort('mhBudget')}
            aria-label="Sort by MH Budget"
          >
            MH Budget
            <SortIndicator column="mhBudget" currentColumn={sortColumn} direction={sortDirection} />
          </button>
          <button
            role="columnheader"
            className="text-right hidden lg:block hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
            onClick={() => toggleManhourSort('receiveMhEarned')}
            aria-label="Sort by Receive manhours earned"
          >
            Receive
            <SortIndicator column="receiveMhEarned" currentColumn={sortColumn} direction={sortDirection} />
          </button>
          <button
            role="columnheader"
            className="text-right hidden lg:block hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
            onClick={() => toggleManhourSort('installMhEarned')}
            aria-label="Sort by Install manhours earned"
          >
            Install
            <SortIndicator column="installMhEarned" currentColumn={sortColumn} direction={sortDirection} />
          </button>
          <button
            role="columnheader"
            className="text-right hidden lg:block hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
            onClick={() => toggleManhourSort('punchMhEarned')}
            aria-label="Sort by Punch manhours earned"
          >
            Punch
            <SortIndicator column="punchMhEarned" currentColumn={sortColumn} direction={sortDirection} />
          </button>
          <button
            role="columnheader"
            className="text-right hidden lg:block hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
            onClick={() => toggleManhourSort('testMhEarned')}
            aria-label="Sort by Test manhours earned"
          >
            Test
            <SortIndicator column="testMhEarned" currentColumn={sortColumn} direction={sortDirection} />
          </button>
          <button
            role="columnheader"
            className="text-right hidden lg:block hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
            onClick={() => toggleManhourSort('restoreMhEarned')}
            aria-label="Sort by Restore manhours earned"
          >
            Restore
            <SortIndicator column="restoreMhEarned" currentColumn={sortColumn} direction={sortDirection} />
          </button>
          <button
            role="columnheader"
            className="text-right hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
            onClick={() => toggleManhourSort('totalMhEarned')}
            aria-label="Sort by Total manhours earned"
          >
            Total Earned
            <SortIndicator column="totalMhEarned" currentColumn={sortColumn} direction={sortDirection} />
          </button>
          <button
            role="columnheader"
            className="text-right hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
            onClick={() => toggleManhourSort('mhPctComplete')}
            aria-label="Sort by Percentage complete"
          >
            % Complete
            <SortIndicator column="mhPctComplete" currentColumn={sortColumn} direction={sortDirection} />
          </button>
        </div>
      </div>

      {/* Virtualized Table Body */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ height: '500px' }}
        data-testid="manhour-report-table-body"
        role="rowgroup"
        aria-label="Manhour report data rows"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {/* Always render all rows in test environment (when virtual items is 0) */}
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
                  isGrandTotal ? 'Grand Total summary row' : `${row.name} manhour progress data`
                }
                data-testid={`manhour-report-row-${virtualRow.index}`}
                className={`grid grid-cols-[2fr_1fr_1fr_1fr] lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 border-b text-sm ${
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
                  aria-label={`Receive ${formatManhour(row.receiveMhEarned)} earned`}
                >
                  {formatManhour(row.receiveMhEarned)}
                </div>
                <div
                  role="cell"
                  className="text-right hidden lg:block"
                  aria-label={`Install ${formatManhour(row.installMhEarned)} earned`}
                >
                  {formatManhour(row.installMhEarned)}
                </div>
                <div
                  role="cell"
                  className="text-right hidden lg:block"
                  aria-label={`Punch ${formatManhour(row.punchMhEarned)} earned`}
                >
                  {formatManhour(row.punchMhEarned)}
                </div>
                <div
                  role="cell"
                  className="text-right hidden lg:block"
                  aria-label={`Test ${formatManhour(row.testMhEarned)} earned`}
                >
                  {formatManhour(row.testMhEarned)}
                </div>
                <div
                  role="cell"
                  className="text-right hidden lg:block"
                  aria-label={`Restore ${formatManhour(row.restoreMhEarned)} earned`}
                >
                  {formatManhour(row.restoreMhEarned)}
                </div>
                <div
                  role="cell"
                  className="text-right"
                  aria-label={`Total ${formatManhour(row.totalMhEarned)} earned`}
                >
                  {formatManhour(row.totalMhEarned)}
                </div>
                <div
                  role="cell"
                  className="text-right"
                  aria-label={`${formatPercent(row.mhPctComplete, isGrandTotal)} percent complete`}
                >
                  {formatPercent(row.mhPctComplete, isGrandTotal)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
