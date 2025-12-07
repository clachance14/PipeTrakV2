/**
 * DeltaReportTable Component (Feature 033 - Timeline Report Filter)
 *
 * Displays manhour-weighted percentage delta report for component progress.
 * Shows change in milestone completion over selected time period.
 *
 * ## Design
 *
 * Each milestone column shows stacked MH + % values:
 * - MH value on top (bold, primary)
 * - % value below (smaller, contextual)
 *
 * This reduces visual clutter while preserving all information.
 *
 * ## Calculation Overview
 *
 * Each category percentage is calculated against that category's budget (not total):
 * ```
 * category_pct = (category_earned_mh / category_budget) × 100
 * ```
 *
 * @see docs/PROGRESS-CALCULATION.md for full documentation
 */

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { ProgressDeltaReportData, ManhourDeltaRow, ManhourDeltaGrandTotal } from '@/types/reports';
import { DIMENSION_LABELS } from '@/types/reports';

interface DeltaReportTableProps {
  data: ProgressDeltaReportData;
}

/**
 * Format manhour value with appropriate precision
 */
function formatManhour(value: number): string {
  if (value === 0) return '0';
  if (value < 10) return value.toFixed(1);
  return Math.round(value).toLocaleString();
}

/**
 * Format stacked delta cell (MH on top, % below)
 * Returns both values with appropriate styling
 */
function formatStackedDelta(
  mhEarned: number,
  categoryBudget: number
): { mh: string; pct: string; colorClass: string; isZero: boolean } {
  const pct = categoryBudget === 0 ? 0 : (mhEarned / categoryBudget) * 100;
  const absValue = Math.abs(Math.round(mhEarned));
  const isZero = mhEarned === 0; // True zero - no activity at all

  let colorClass = 'text-muted-foreground';
  if (mhEarned > 0) colorClass = 'text-emerald-600 dark:text-emerald-400';
  if (mhEarned < 0) colorClass = 'text-red-600 dark:text-red-400';

  let mhText: string;
  if (isZero) {
    mhText = '—';
  } else if (absValue === 0) {
    // Rounds to 0 but there's real activity - show "<1 mh"
    mhText = mhEarned > 0 ? '<1 mh' : '>-1 mh';
  } else {
    const unit = absValue === 1 ? 'mh' : 'mh\'s';
    mhText = mhEarned > 0 ? `+${absValue} ${unit}` : `-${absValue} ${unit}`;
  }

  const pctText = isZero ? '' : (pct > 0 ? `+${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`);

  return { mh: mhText, pct: pctText, colorClass, isZero };
}

/**
 * Format total delta (uses pre-calculated percentage)
 */
function formatTotalDelta(
  mhEarned: number,
  pctComplete: number
): { mh: string; pct: string; colorClass: string; isZero: boolean } {
  const absValue = Math.abs(Math.round(mhEarned));
  const isZero = mhEarned === 0; // True zero - no activity at all

  let colorClass = 'text-muted-foreground';
  if (mhEarned > 0) colorClass = 'text-emerald-600 dark:text-emerald-400';
  if (mhEarned < 0) colorClass = 'text-red-600 dark:text-red-400';

  let mhText: string;
  if (isZero) {
    mhText = '—';
  } else if (absValue === 0) {
    // Rounds to 0 but there's real activity - show "<1 mh"
    mhText = mhEarned > 0 ? '<1 mh' : '>-1 mh';
  } else {
    const unit = absValue === 1 ? 'mh' : 'mh\'s';
    mhText = mhEarned > 0 ? `+${absValue} ${unit}` : `-${absValue} ${unit}`;
  }

  const pctText = isZero ? '' : (pctComplete > 0 ? `+${pctComplete.toFixed(1)}%` : `${pctComplete.toFixed(1)}%`);

  return { mh: mhText, pct: pctText, colorClass, isZero };
}

/**
 * Stacked cell component for MH + % display
 */
function StackedDeltaCell({
  mh,
  pct,
  colorClass,
  isZero,
  isGrandTotal = false
}: {
  mh: string;
  pct: string;
  colorClass: string;
  isZero: boolean;
  isGrandTotal?: boolean;
}) {
  return (
    <div className={`text-right flex flex-col items-end justify-center ${colorClass}`}>
      <span className={`font-semibold tabular-nums ${isGrandTotal ? 'text-sm' : 'text-sm'}`}>
        {mh}
      </span>
      {!isZero && (
        <span className={`text-xs tabular-nums ${isGrandTotal ? 'opacity-80' : 'opacity-70'}`}>
          {pct}
        </span>
      )}
    </div>
  );
}

export function DeltaReportTable({ data }: DeltaReportTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Use manhour rows for display
  const allRows: (ManhourDeltaRow | ManhourDeltaGrandTotal)[] = [...data.manhourRows, data.manhourGrandTotal];

  const rowVirtualizer = useVirtualizer({
    count: allRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56, // Slightly taller for stacked content
    overscan: 10,
  });

  // Empty state
  if (data.rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <p>No component activity found for the selected time period.</p>
      </div>
    );
  }

  const dimensionLabel = DIMENSION_LABELS[data.dimension];

  return (
    <div
      className="border rounded-lg overflow-hidden bg-white dark:bg-slate-900"
      role="table"
      aria-label={`Progress delta report grouped by ${dimensionLabel}`}
    >
      {/* Table Header */}
      <div className="sticky top-0 z-10 bg-slate-800 dark:bg-slate-900 border-b border-slate-700" role="rowgroup">
        {/* Sub-header row with column labels */}
        <div
          role="row"
          className="grid grid-cols-[2fr_1fr_1fr] lg:grid-cols-[2.5fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-1 px-4 py-3 text-xs font-medium text-slate-300 uppercase tracking-wider"
        >
          <div role="columnheader" className="text-left">
            {dimensionLabel}
          </div>
          <div role="columnheader" className="text-right">
            Budget
          </div>
          {/* Mobile: Just Total */}
          <div role="columnheader" className="text-right lg:hidden">
            Δ Total
          </div>
          {/* Desktop: All milestones */}
          <div role="columnheader" className="text-right hidden lg:block">
            Received
          </div>
          <div role="columnheader" className="text-right hidden lg:block">
            Installed
          </div>
          <div role="columnheader" className="text-right hidden lg:block">
            Punch
          </div>
          <div role="columnheader" className="text-right hidden lg:block">
            Tested
          </div>
          <div role="columnheader" className="text-right hidden lg:block">
            Restored
          </div>
          <div role="columnheader" className="text-right hidden lg:block">
            Total
          </div>
        </div>
      </div>

      {/* Table Body */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ height: '500px' }}
        data-testid="delta-report-table-body"
        role="rowgroup"
        aria-label="Delta report data rows"
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
            : allRows.map((_, index) => ({ index, start: index * 56, size: 56, key: index }))
          ).map((virtualRow) => {
            const row = allRows[virtualRow.index];
            if (!row) return null;
            const isGrandTotal = row.name === 'Grand Total';

            // Calculate stacked deltas for each milestone
            const received = formatStackedDelta(row.deltaReceiveMhEarned, row.receiveMhBudget);
            const installed = formatStackedDelta(row.deltaInstallMhEarned, row.installMhBudget);
            const punch = formatStackedDelta(row.deltaPunchMhEarned, row.punchMhBudget);
            const tested = formatStackedDelta(row.deltaTestMhEarned, row.testMhBudget);
            const restored = formatStackedDelta(row.deltaRestoreMhEarned, row.restoreMhBudget);
            const total = formatTotalDelta(row.deltaTotalMhEarned, row.deltaMhPctComplete);

            return (
              <div
                key={virtualRow.index}
                role="row"
                aria-label={isGrandTotal ? 'Grand Total summary row' : `${row.name} progress delta data`}
                data-testid={`delta-report-row-${virtualRow.index}`}
                className={`grid grid-cols-[2fr_1fr_1fr] lg:grid-cols-[2.5fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-1 px-4 py-2 border-b text-sm items-center ${
                  isGrandTotal
                    ? 'bg-slate-800 dark:bg-slate-900 text-white font-medium'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  minHeight: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {/* Name */}
                <div role="cell" className="text-left truncate font-medium">
                  {row.name}
                </div>

                {/* Budget */}
                <div role="cell" className="text-right tabular-nums text-muted-foreground">
                  {formatManhour(row.mhBudget)}
                </div>

                {/* Mobile: Total only */}
                <div role="cell" className="lg:hidden">
                  <StackedDeltaCell {...total} isGrandTotal={isGrandTotal} />
                </div>

                {/* Desktop: All milestones */}
                <div role="cell" className="hidden lg:block">
                  <StackedDeltaCell {...received} isGrandTotal={isGrandTotal} />
                </div>
                <div role="cell" className="hidden lg:block">
                  <StackedDeltaCell {...installed} isGrandTotal={isGrandTotal} />
                </div>
                <div role="cell" className="hidden lg:block">
                  <StackedDeltaCell {...punch} isGrandTotal={isGrandTotal} />
                </div>
                <div role="cell" className="hidden lg:block">
                  <StackedDeltaCell {...tested} isGrandTotal={isGrandTotal} />
                </div>
                <div role="cell" className="hidden lg:block">
                  <StackedDeltaCell {...restored} isGrandTotal={isGrandTotal} />
                </div>
                <div role="cell" className="hidden lg:block">
                  <StackedDeltaCell {...total} isGrandTotal={isGrandTotal} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
