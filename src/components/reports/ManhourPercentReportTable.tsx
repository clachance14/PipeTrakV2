/**
 * ManhourPercentReportTable Component (Feature 032)
 * Virtualized table for displaying milestone % complete with MH Budget
 * Shows: MH Budget | Receive % | Install % | Punch % | Test % | Restore % | % Complete
 *
 * Calculation: (milestone_earned / milestone_budget) * 100
 * Edge case: Display "--" when milestone_budget === 0
 */

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { ManhourReportData, ManhourProgressRow, ManhourGrandTotalRow } from '@/types/reports';
import { DIMENSION_LABELS } from '@/types/reports';
import { useReportPreferencesStore } from '@/stores/useReportPreferencesStore';
import { sortManhourReportRows } from '@/lib/report-sorting';

interface ManhourPercentReportTableProps {
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
 * Calculate milestone percentage: (earned / budget) * 100
 * Returns "--" when budget is 0 to avoid division by zero
 */
function formatMilestonePercent(
  earned: number,
  budget: number,
  isGrandTotal: boolean = false
): string {
  if (budget === 0) return '--';
  const percent = (earned / budget) * 100;
  return isGrandTotal ? `${percent.toFixed(1)}%` : `${Math.round(percent)}%`;
}

/**
 * Format overall percentage value
 */
function formatOverallPercent(value: number, isGrandTotal: boolean): string {
  return isGrandTotal ? `${value.toFixed(1)}%` : `${Math.round(value)}%`;
}

export function ManhourPercentReportTable({ data }: ManhourPercentReportTableProps) {
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
      aria-label={`Manhour percent complete report grouped by ${dimensionLabel}`}
    >
      {/* Table Header (Sticky) */}
      {/* Desktop: 8 columns, Mobile: 4 columns (Name, MH Budget, Restore %, % Complete) */}
      <div className="sticky top-0 z-10 bg-slate-700 dark:bg-slate-800 border-b" role="rowgroup">
        <div
          role="row"
          className="grid grid-cols-[2fr_1fr_1fr_1fr] lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm font-semibold text-white"
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
            aria-label="Sort by Manhour budget"
          >
            MH Budget
            <SortIndicator column="mhBudget" currentColumn={sortColumn} direction={sortDirection} />
          </button>
          <button
            role="columnheader"
            className="text-right hidden lg:block hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
            onClick={() => toggleManhourSort('receiveMhEarned')}
            aria-label="Sort by Receive percent complete"
          >
            Receive %
            <SortIndicator column="receiveMhEarned" currentColumn={sortColumn} direction={sortDirection} />
          </button>
          <button
            role="columnheader"
            className="text-right hidden lg:block hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
            onClick={() => toggleManhourSort('installMhEarned')}
            aria-label="Sort by Install percent complete"
          >
            Install %
            <SortIndicator column="installMhEarned" currentColumn={sortColumn} direction={sortDirection} />
          </button>
          <button
            role="columnheader"
            className="text-right hidden lg:block hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
            onClick={() => toggleManhourSort('punchMhEarned')}
            aria-label="Sort by Punch percent complete"
          >
            Punch %
            <SortIndicator column="punchMhEarned" currentColumn={sortColumn} direction={sortDirection} />
          </button>
          <button
            role="columnheader"
            className="text-right hidden lg:block hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
            onClick={() => toggleManhourSort('testMhEarned')}
            aria-label="Sort by Test percent complete"
          >
            Test %
            <SortIndicator column="testMhEarned" currentColumn={sortColumn} direction={sortDirection} />
          </button>
          <button
            role="columnheader"
            className="text-right hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
            onClick={() => toggleManhourSort('restoreMhEarned')}
            aria-label="Sort by Restore percent complete"
          >
            Restore %
            <SortIndicator column="restoreMhEarned" currentColumn={sortColumn} direction={sortDirection} />
          </button>
          <button
            role="columnheader"
            className="text-right hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
            onClick={() => toggleManhourSort('mhPctComplete')}
            aria-label="Sort by Overall percent complete"
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
        data-testid="manhour-percent-report-table-body"
        role="rowgroup"
        aria-label="Manhour percent report data rows"
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
                  isGrandTotal
                    ? 'Grand Total summary row'
                    : `${row.name} manhour percent complete data`
                }
                data-testid={`manhour-percent-report-row-${virtualRow.index}`}
                className={`grid grid-cols-[2fr_1fr_1fr_1fr] lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 border-b text-sm ${
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
                  aria-label={`Receive ${formatMilestonePercent(row.receiveMhEarned, row.receiveMhBudget, isGrandTotal)} complete`}
                >
                  {formatMilestonePercent(row.receiveMhEarned, row.receiveMhBudget, isGrandTotal)}
                </div>
                <div
                  role="cell"
                  className="text-right hidden lg:block"
                  aria-label={`Install ${formatMilestonePercent(row.installMhEarned, row.installMhBudget, isGrandTotal)} complete`}
                >
                  {formatMilestonePercent(row.installMhEarned, row.installMhBudget, isGrandTotal)}
                </div>
                <div
                  role="cell"
                  className="text-right hidden lg:block"
                  aria-label={`Punch ${formatMilestonePercent(row.punchMhEarned, row.punchMhBudget, isGrandTotal)} complete`}
                >
                  {formatMilestonePercent(row.punchMhEarned, row.punchMhBudget, isGrandTotal)}
                </div>
                <div
                  role="cell"
                  className="text-right hidden lg:block"
                  aria-label={`Test ${formatMilestonePercent(row.testMhEarned, row.testMhBudget, isGrandTotal)} complete`}
                >
                  {formatMilestonePercent(row.testMhEarned, row.testMhBudget, isGrandTotal)}
                </div>
                <div
                  role="cell"
                  className="text-right"
                  aria-label={`Restore ${formatMilestonePercent(row.restoreMhEarned, row.restoreMhBudget, isGrandTotal)} complete`}
                >
                  {formatMilestonePercent(row.restoreMhEarned, row.restoreMhBudget, isGrandTotal)}
                </div>
                <div
                  role="cell"
                  className="text-right"
                  aria-label={`${formatOverallPercent(row.mhPctComplete, isGrandTotal)} overall complete`}
                >
                  {formatOverallPercent(row.mhPctComplete, isGrandTotal)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
