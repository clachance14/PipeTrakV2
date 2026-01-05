/**
 * ManhourPercentDeltaReportTable Component (Feature 033 - Timeline Report Filter)
 * Displays manhour percentage delta report for component progress
 * Shows change in milestone completion percentages over selected time period
 */

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { ManhourDeltaRow, ManhourDeltaGrandTotal } from '@/types/reports';
import { DIMENSION_LABELS, type GroupingDimension } from '@/types/reports';
import { useReportPreferencesStore } from '@/stores/useReportPreferencesStore';
import { sortManhourDeltaReportRows } from '@/lib/report-sorting';

interface ManhourPercentDeltaReportTableProps {
  rows: ManhourDeltaRow[];
  grandTotal: ManhourDeltaGrandTotal;
  dimension: GroupingDimension;
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
 * Format percent delta value with color coding
 * Positive values = green text with + prefix
 * Negative values = red text
 * Zero = neutral muted text
 */
function formatPercentDelta(value: number): { text: string; className: string } {
  if (value > 0) {
    return { text: `+${value.toFixed(1)}%`, className: 'text-green-600 dark:text-green-400' };
  } else if (value < 0) {
    return { text: `${value.toFixed(1)}%`, className: 'text-red-600 dark:text-red-400' };
  }
  return { text: '0.0%', className: 'text-muted-foreground' };
}

/**
 * Calculate milestone percentage delta from earned delta and CATEGORY budget
 * Returns "--" when budget is 0 to avoid division by zero
 *
 * NOTE: Uses category-specific budget (e.g., receiveMhBudget) NOT total mhBudget.
 * This matches how "All Time" calculates category percentages:
 *   Receive % = receiveMhEarned / receiveMhBudget
 * So delta should be:
 *   Δ Receive % = deltaReceiveMhEarned / receiveMhBudget
 */
function calculateMilestonePercentDelta(
  earnedDelta: number,
  categoryBudget: number
): { text: string; className: string } {
  if (categoryBudget === 0) return { text: '--', className: 'text-muted-foreground' };
  const percentDelta = (earnedDelta / categoryBudget) * 100;
  return formatPercentDelta(percentDelta);
}

// Sort indicator component
function SortIndicator({ column, currentColumn, direction }: { column: string; currentColumn: string; direction: 'asc' | 'desc' }) {
  if (column !== currentColumn) return null;
  return <span className="ml-1">{direction === 'asc' ? '↑' : '↓'}</span>;
}

export function ManhourPercentDeltaReportTable({
  rows,
  grandTotal,
  dimension,
}: ManhourPercentDeltaReportTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Get sort state from store (shares state with ManhourDeltaReportTable)
  const { manhourDeltaReport, toggleManhourDeltaSort } = useReportPreferencesStore();
  const { sortColumn, sortDirection } = manhourDeltaReport;

  // Sort rows, then combine with grand total (grand total always at bottom)
  const sortedRows = sortManhourDeltaReportRows(rows, sortColumn, sortDirection);
  const allRows: (ManhourDeltaRow | ManhourDeltaGrandTotal)[] = [...sortedRows, grandTotal];

  const rowVirtualizer = useVirtualizer({
    count: allRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48, // Estimated row height in pixels
    overscan: 10, // Increased overscan for better test compatibility
  });

  // Empty state
  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <p>No component activity found for the selected time period.</p>
      </div>
    );
  }

  // Get dimension-specific column header
  const dimensionLabel = DIMENSION_LABELS[dimension];

  return (
    <div
      className="border rounded-lg overflow-hidden"
      role="table"
      aria-label={`Manhour percent delta report grouped by ${dimensionLabel}`}
    >
      {/* Table Header (Sticky) */}
      {/* Desktop: 7 columns, Mobile: 3 columns (Name, MH Budget, Δ % Complete) */}
      <div className="sticky top-0 z-10 bg-slate-700 dark:bg-slate-800 border-b" role="rowgroup">
        <div
          role="row"
          className="grid grid-cols-[2fr_1fr_1fr] lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm font-semibold text-white"
        >
          <button
            role="columnheader"
            className="text-left hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
            onClick={() => toggleManhourDeltaSort('name')}
            aria-label={`Sort by ${dimensionLabel}`}
          >
            {dimensionLabel}
            <SortIndicator column="name" currentColumn={sortColumn} direction={sortDirection} />
          </button>
          <button
            role="columnheader"
            className="text-right hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
            onClick={() => toggleManhourDeltaSort('mhBudget')}
            aria-label="Sort by MH Budget"
          >
            MH Budget
            <SortIndicator column="mhBudget" currentColumn={sortColumn} direction={sortDirection} />
          </button>
          <button
            role="columnheader"
            className="text-right lg:hidden hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
            onClick={() => toggleManhourDeltaSort('deltaMhPctComplete')}
            aria-label="Sort by percent complete delta"
          >
            Δ % Complete
            <SortIndicator column="deltaMhPctComplete" currentColumn={sortColumn} direction={sortDirection} />
          </button>
          <button
            role="columnheader"
            className="text-right hidden lg:block hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
            onClick={() => toggleManhourDeltaSort('deltaReceiveMhEarned')}
            aria-label="Sort by receive percent delta"
          >
            Δ Received
            <SortIndicator column="deltaReceiveMhEarned" currentColumn={sortColumn} direction={sortDirection} />
          </button>
          <button
            role="columnheader"
            className="text-right hidden lg:block hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
            onClick={() => toggleManhourDeltaSort('deltaInstallMhEarned')}
            aria-label="Sort by install percent delta"
          >
            Δ Installed
            <SortIndicator column="deltaInstallMhEarned" currentColumn={sortColumn} direction={sortDirection} />
          </button>
          <button
            role="columnheader"
            className="text-right hidden lg:block hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
            onClick={() => toggleManhourDeltaSort('deltaPunchMhEarned')}
            aria-label="Sort by punch percent delta"
          >
            Δ Punch
            <SortIndicator column="deltaPunchMhEarned" currentColumn={sortColumn} direction={sortDirection} />
          </button>
          <button
            role="columnheader"
            className="text-right hidden lg:block hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
            onClick={() => toggleManhourDeltaSort('deltaTestMhEarned')}
            aria-label="Sort by test percent delta"
          >
            Δ Tested
            <SortIndicator column="deltaTestMhEarned" currentColumn={sortColumn} direction={sortDirection} />
          </button>
          <button
            role="columnheader"
            className="text-right hidden lg:block hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
            onClick={() => toggleManhourDeltaSort('deltaRestoreMhEarned')}
            aria-label="Sort by restore percent delta"
          >
            Δ Restored
            <SortIndicator column="deltaRestoreMhEarned" currentColumn={sortColumn} direction={sortDirection} />
          </button>
          <button
            role="columnheader"
            className="text-right hidden lg:block hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
            onClick={() => toggleManhourDeltaSort('deltaMhPctComplete')}
            aria-label="Sort by percent complete delta"
          >
            Δ % Complete
            <SortIndicator column="deltaMhPctComplete" currentColumn={sortColumn} direction={sortDirection} />
          </button>
        </div>
      </div>

      {/* Virtualized Table Body */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ height: '500px' }}
        data-testid="manhour-percent-delta-report-table-body"
        role="rowgroup"
        aria-label="Manhour percent delta report data rows"
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

            // Calculate milestone percent deltas from earned deltas and CATEGORY budgets
            // This matches how "All Time" calculates category percentages:
            //   Receive % = receiveMhEarned / receiveMhBudget (NOT totalMhBudget)
            const formattedReceive = isGrandTotal
              ? calculateMilestonePercentDelta(
                  grandTotal.deltaReceiveMhEarned,
                  grandTotal.receiveMhBudget
                )
              : calculateMilestonePercentDelta(
                  (row as ManhourDeltaRow).deltaReceiveMhEarned,
                  (row as ManhourDeltaRow).receiveMhBudget
                );

            const formattedInstall = isGrandTotal
              ? calculateMilestonePercentDelta(
                  grandTotal.deltaInstallMhEarned,
                  grandTotal.installMhBudget
                )
              : calculateMilestonePercentDelta(
                  (row as ManhourDeltaRow).deltaInstallMhEarned,
                  (row as ManhourDeltaRow).installMhBudget
                );

            const formattedPunch = isGrandTotal
              ? calculateMilestonePercentDelta(grandTotal.deltaPunchMhEarned, grandTotal.punchMhBudget)
              : calculateMilestonePercentDelta(
                  (row as ManhourDeltaRow).deltaPunchMhEarned,
                  (row as ManhourDeltaRow).punchMhBudget
                );

            const formattedTest = isGrandTotal
              ? calculateMilestonePercentDelta(grandTotal.deltaTestMhEarned, grandTotal.testMhBudget)
              : calculateMilestonePercentDelta(
                  (row as ManhourDeltaRow).deltaTestMhEarned,
                  (row as ManhourDeltaRow).testMhBudget
                );

            const formattedRestore = isGrandTotal
              ? calculateMilestonePercentDelta(
                  grandTotal.deltaRestoreMhEarned,
                  grandTotal.restoreMhBudget
                )
              : calculateMilestonePercentDelta(
                  (row as ManhourDeltaRow).deltaRestoreMhEarned,
                  (row as ManhourDeltaRow).restoreMhBudget
                );

            // For overall percent delta, use the deltaMhPctComplete field directly
            const formattedTotal = formatPercentDelta(row.deltaMhPctComplete);

            return (
              <div
                key={virtualRow.index}
                role="row"
                aria-label={
                  isGrandTotal
                    ? 'Grand Total summary row'
                    : `${row.name} manhour percent delta data`
                }
                data-testid={`manhour-percent-delta-report-row-${virtualRow.index}`}
                className={`grid grid-cols-[2fr_1fr_1fr] lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 border-b text-sm ${
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
                  className={`text-right lg:hidden ${formattedTotal.className}`}
                  aria-label={`Percent complete delta ${formattedTotal.text}`}
                >
                  {formattedTotal.text}
                </div>
                <div
                  role="cell"
                  className={`text-right hidden lg:block ${formattedReceive.className}`}
                  aria-label={`Receive delta ${formattedReceive.text}`}
                >
                  {formattedReceive.text}
                </div>
                <div
                  role="cell"
                  className={`text-right hidden lg:block ${formattedInstall.className}`}
                  aria-label={`Install delta ${formattedInstall.text}`}
                >
                  {formattedInstall.text}
                </div>
                <div
                  role="cell"
                  className={`text-right hidden lg:block ${formattedPunch.className}`}
                  aria-label={`Punch delta ${formattedPunch.text}`}
                >
                  {formattedPunch.text}
                </div>
                <div
                  role="cell"
                  className={`text-right hidden lg:block ${formattedTest.className}`}
                  aria-label={`Test delta ${formattedTest.text}`}
                >
                  {formattedTest.text}
                </div>
                <div
                  role="cell"
                  className={`text-right hidden lg:block ${formattedRestore.className}`}
                  aria-label={`Restore delta ${formattedRestore.text}`}
                >
                  {formattedRestore.text}
                </div>
                <div
                  role="cell"
                  className={`text-right hidden lg:block ${formattedTotal.className}`}
                  aria-label={`Percent complete delta ${formattedTotal.text}`}
                >
                  {formattedTotal.text}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
