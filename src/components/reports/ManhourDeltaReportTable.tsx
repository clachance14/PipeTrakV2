/**
 * ManhourDeltaReportTable Component (Feature 033 - Timeline Report Filter)
 * Displays manhour-based delta report for component progress
 * Shows change in manhour earned over selected time period
 */

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { ManhourDeltaRow, ManhourDeltaGrandTotal } from '@/types/reports';
import { DIMENSION_LABELS, type GroupingDimension } from '@/types/reports';

interface ManhourDeltaReportTableProps {
  rows: ManhourDeltaRow[];
  grandTotal: ManhourDeltaGrandTotal;
  dimension: GroupingDimension;
}

/**
 * Format manhour delta value with color coding
 * Positive values = green text with + prefix
 * Negative values = red text
 * Zero = neutral muted text
 */
function formatManhourDelta(value: number): { text: string; className: string } {
  if (value > 0) {
    return { text: `+${Math.round(value)} MH`, className: 'text-green-600 dark:text-green-400' };
  } else if (value < 0) {
    return { text: `${Math.round(value)} MH`, className: 'text-red-600 dark:text-red-400' };
  }
  return { text: '0 MH', className: 'text-muted-foreground' };
}

/**
 * Format manhour percentage delta value with color coding
 * Positive values = green text with + prefix
 * Negative values = red text
 * Zero = neutral muted text
 */
function formatManhourPercentDelta(value: number): { text: string; className: string } {
  if (value > 0) {
    return { text: `+${value.toFixed(1)}%`, className: 'text-green-600 dark:text-green-400' };
  } else if (value < 0) {
    return { text: `${value.toFixed(1)}%`, className: 'text-red-600 dark:text-red-400' };
  }
  return { text: '0.0%', className: 'text-muted-foreground' };
}

/**
 * Format manhour budget value
 */
function formatManhourBudget(value: number): string {
  if (value === 0) return '0';
  if (value < 10) return value.toFixed(1);
  return Math.round(value).toLocaleString();
}

export function ManhourDeltaReportTable({ rows, grandTotal, dimension }: ManhourDeltaReportTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Combine data rows + grand total for virtualization
  const allRows: (ManhourDeltaRow | ManhourDeltaGrandTotal)[] = [...rows, grandTotal];

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
        <p>No manhour activity found for the selected time period.</p>
      </div>
    );
  }

  // Get dimension-specific column header
  const dimensionLabel = DIMENSION_LABELS[dimension];

  return (
    <div
      className="border rounded-lg overflow-hidden"
      role="table"
      aria-label={`Manhour delta report grouped by ${dimensionLabel}`}
    >
      {/* Table Header (Sticky) */}
      {/* Desktop: 10 columns, Mobile: 4 columns (Name, Active Components, MH Budget, Δ Total MH, Δ MH %) */}
      <div className="sticky top-0 z-10 bg-slate-700 dark:bg-slate-800 border-b" role="rowgroup">
        <div
          role="row"
          className="grid grid-cols-[2fr_1fr_1fr_1fr] lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm font-semibold text-white"
        >
          <div role="columnheader" className="text-left">
            {dimensionLabel}
          </div>
          <div role="columnheader" className="text-right">
            Active Components
          </div>
          <div role="columnheader" className="text-right">
            MH Budget
          </div>
          <div role="columnheader" className="text-right lg:hidden" aria-label="Change in total manhours earned">
            Δ Total MH
          </div>
          <div role="columnheader" className="text-right hidden lg:block" aria-label="Change in receive manhours">
            Δ Receive
          </div>
          <div role="columnheader" className="text-right hidden lg:block" aria-label="Change in install manhours">
            Δ Install
          </div>
          <div role="columnheader" className="text-right hidden lg:block" aria-label="Change in punch manhours">
            Δ Punch
          </div>
          <div role="columnheader" className="text-right hidden lg:block" aria-label="Change in test manhours">
            Δ Test
          </div>
          <div role="columnheader" className="text-right hidden lg:block" aria-label="Change in restore manhours">
            Δ Restore
          </div>
          <div role="columnheader" className="text-right hidden lg:block" aria-label="Change in total manhours earned">
            Δ Total MH
          </div>
          <div role="columnheader" className="text-right" aria-label="Change in manhour percentage complete">
            Δ MH %
          </div>
        </div>
      </div>

      {/* Virtualized Table Body */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ height: '500px' }}
        data-testid="manhour-delta-report-table-body"
        role="rowgroup"
        aria-label="Manhour delta report data rows"
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

            // Format deltas with color coding
            const formattedReceive = formatManhourDelta(
              'deltaReceiveMhEarned' in row ? row.deltaReceiveMhEarned : 0
            );
            const formattedInstall = formatManhourDelta(
              'deltaInstallMhEarned' in row ? row.deltaInstallMhEarned : 0
            );
            const formattedPunch = formatManhourDelta(
              'deltaPunchMhEarned' in row ? row.deltaPunchMhEarned : 0
            );
            const formattedTest = formatManhourDelta(
              'deltaTestMhEarned' in row ? row.deltaTestMhEarned : 0
            );
            const formattedRestore = formatManhourDelta(
              'deltaRestoreMhEarned' in row ? row.deltaRestoreMhEarned : 0
            );
            const formattedTotal = formatManhourDelta(row.deltaTotalMhEarned);
            const formattedPercent = formatManhourPercentDelta(row.deltaMhPctComplete);

            return (
              <div
                key={virtualRow.index}
                role="row"
                aria-label={
                  isGrandTotal ? 'Grand Total summary row' : `${row.name} manhour delta data`
                }
                data-testid={`manhour-delta-report-row-${virtualRow.index}`}
                className={`grid grid-cols-[2fr_1fr_1fr_1fr] lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 border-b text-sm ${
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
                <div role="cell" className="text-right" aria-label="Active components count">
                  {row.componentsWithActivity}
                </div>
                <div role="cell" className="text-right" aria-label="Manhour budget">
                  {formatManhourBudget(row.mhBudget)}
                </div>
                <div
                  role="cell"
                  className={`text-right lg:hidden ${formattedTotal.className}`}
                  aria-label={`Total delta ${formattedTotal.text}`}
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
                  aria-label={`Total delta ${formattedTotal.text}`}
                >
                  {formattedTotal.text}
                </div>
                <div
                  role="cell"
                  className={`text-right ${formattedPercent.className}`}
                  aria-label={`Percent delta ${formattedPercent.text}`}
                >
                  {formattedPercent.text}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
