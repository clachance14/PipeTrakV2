/**
 * FieldWeldDeltaReportTable Component (Feature 033 - Timeline Report Filter)
 * Displays count-based delta report for field weld progress
 * Shows change in weld milestone completion over selected time period
 */

import { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { FieldWeldDeltaReportData, FieldWeldDeltaRow, FieldWeldDeltaGrandTotal } from '@/types/reports';
import { FIELD_WELD_DIMENSION_LABELS } from '@/types/reports';
import { useReportPreferencesStore } from '@/stores/useReportPreferencesStore';
import { sortFieldWeldDeltaReportRows } from '@/lib/report-sorting';

interface FieldWeldDeltaReportTableProps {
  data: FieldWeldDeltaReportData;
}

/**
 * Format delta count with color coding
 * Positive values = green text with + prefix
 * Negative values = red text
 * Zero = neutral muted text
 */
function formatDeltaCount(value: number): { text: string; className: string } {
  if (value > 0) {
    return { text: `+${value}`, className: 'text-green-600 dark:text-green-400' };
  } else if (value < 0) {
    return { text: `${value}`, className: 'text-red-600 dark:text-red-400' };
  }
  return { text: '0', className: 'text-muted-foreground' };
}

/**
 * Format delta percentage with color coding
 * Positive values = green text with + prefix
 * Negative values = red text
 * Zero = neutral muted text
 */
function formatDeltaPercent(value: number): { text: string; className: string } {
  if (value > 0) {
    return { text: `+${value.toFixed(1)}%`, className: 'text-green-600 dark:text-green-400' };
  } else if (value < 0) {
    return { text: `${value.toFixed(1)}%`, className: 'text-red-600 dark:text-red-400' };
  }
  return { text: '0.0%', className: 'text-muted-foreground' };
}

// Sort indicator component
function SortIndicator({ column, currentColumn, direction }: { column: string; currentColumn: string; direction: 'asc' | 'desc' }) {
  if (column !== currentColumn) return null;
  return <span className="ml-1">{direction === 'asc' ? '↑' : '↓'}</span>;
}

export function FieldWeldDeltaReportTable({ data }: FieldWeldDeltaReportTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Get sort state from store
  const { fieldWeldDeltaReport, toggleFieldWeldDeltaSort } = useReportPreferencesStore();
  const { sortColumn, sortDirection } = fieldWeldDeltaReport;

  // Sort rows, then combine with grand total (grand total always at bottom)
  const sortedRows = sortFieldWeldDeltaReportRows(data.rows, sortColumn, sortDirection);
  const allRows: (FieldWeldDeltaRow | FieldWeldDeltaGrandTotal)[] = [...sortedRows, data.grandTotal];

  // Check if any row has a stencil (welder dimension only)
  const hasStencilColumn = useMemo(() => {
    return data.rows.some((row) => row.stencil !== undefined && row.stencil !== null);
  }, [data.rows]);

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
        <p>No field weld activity found for the selected time period.</p>
      </div>
    );
  }

  // Get dimension-specific column header
  const dimensionLabel = FIELD_WELD_DIMENSION_LABELS[data.dimension];

  return (
    <div
      className="border rounded-lg overflow-hidden"
      role="table"
      aria-label={`Field weld delta report grouped by ${dimensionLabel}`}
    >
      {/* Table Header (Sticky) */}
      {/* Desktop: 7-8 columns (with/without stencil), Mobile: 3 columns (Name, Active Welds, % Complete delta) */}
      <div className="sticky top-0 z-10 bg-slate-700 dark:bg-slate-800 border-b" role="rowgroup">
        <div
          role="row"
          className={`grid ${
            hasStencilColumn
              ? 'grid-cols-[2fr_1fr_1fr] lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr]'
              : 'grid-cols-[2fr_1fr_1fr] lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr]'
          } gap-4 px-4 py-3 text-sm font-semibold text-white`}
        >
          <button
            role="columnheader"
            className="text-left hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
            onClick={() => toggleFieldWeldDeltaSort('name')}
            aria-label={`Sort by ${dimensionLabel}`}
          >
            {dimensionLabel}
            <SortIndicator column="name" currentColumn={sortColumn} direction={sortDirection} />
          </button>
          {hasStencilColumn && (
            <div role="columnheader" className="text-left hidden lg:block">
              Stencil
            </div>
          )}
          <button
            role="columnheader"
            className="text-right hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
            onClick={() => toggleFieldWeldDeltaSort('weldsWithActivity')}
            aria-label="Sort by Active Welds"
          >
            Active Welds
            <SortIndicator column="weldsWithActivity" currentColumn={sortColumn} direction={sortDirection} />
          </button>
          <button
            role="columnheader"
            className="text-right lg:hidden hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
            onClick={() => toggleFieldWeldDeltaSort('deltaPctTotal')}
            aria-label="Sort by percentage complete delta"
          >
            Δ % Complete
            <SortIndicator column="deltaPctTotal" currentColumn={sortColumn} direction={sortDirection} />
          </button>
          <button
            role="columnheader"
            className="text-right hidden lg:block hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
            onClick={() => toggleFieldWeldDeltaSort('deltaFitupCount')}
            aria-label="Sort by fit-up delta"
          >
            Δ Fit-up
            <SortIndicator column="deltaFitupCount" currentColumn={sortColumn} direction={sortDirection} />
          </button>
          <button
            role="columnheader"
            className="text-right hidden lg:block hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
            onClick={() => toggleFieldWeldDeltaSort('deltaWeldCompleteCount')}
            aria-label="Sort by weld complete delta"
          >
            Δ Weld Complete
            <SortIndicator column="deltaWeldCompleteCount" currentColumn={sortColumn} direction={sortDirection} />
          </button>
          <button
            role="columnheader"
            className="text-right hidden lg:block hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
            onClick={() => toggleFieldWeldDeltaSort('deltaAcceptedCount')}
            aria-label="Sort by accepted delta"
          >
            Δ Accepted
            <SortIndicator column="deltaAcceptedCount" currentColumn={sortColumn} direction={sortDirection} />
          </button>
          <button
            role="columnheader"
            className="text-right hidden lg:block hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
            onClick={() => toggleFieldWeldDeltaSort('deltaPctTotal')}
            aria-label="Sort by percentage complete delta"
          >
            Δ % Complete
            <SortIndicator column="deltaPctTotal" currentColumn={sortColumn} direction={sortDirection} />
          </button>
        </div>
      </div>

      {/* Virtualized Table Body */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ height: '500px' }}
        data-testid="field-weld-delta-report-table-body"
        role="rowgroup"
        aria-label="Field weld delta report data rows"
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
            const formattedFitup = formatDeltaCount('deltaFitupCount' in row ? row.deltaFitupCount : 0);
            const formattedWeldComplete = formatDeltaCount('deltaWeldCompleteCount' in row ? row.deltaWeldCompleteCount : 0);
            const formattedAccepted = formatDeltaCount('deltaAcceptedCount' in row ? row.deltaAcceptedCount : 0);
            const formattedPctTotal = formatDeltaPercent(row.deltaPctTotal);

            return (
              <div
                key={virtualRow.index}
                role="row"
                aria-label={
                  isGrandTotal ? 'Grand Total summary row' : `${row.name} field weld delta data`
                }
                data-testid={`field-weld-delta-report-row-${virtualRow.index}`}
                className={`grid ${
                  hasStencilColumn
                    ? 'grid-cols-[2fr_1fr_1fr] lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr]'
                    : 'grid-cols-[2fr_1fr_1fr] lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr]'
                } gap-4 px-4 py-3 border-b text-sm ${
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
                {hasStencilColumn && (
                  <div role="cell" className="text-left hidden lg:block" aria-label="Welder stencil">
                    {'stencil' in row ? row.stencil || '—' : ''}
                  </div>
                )}
                <div role="cell" className="text-right" aria-label="Active welds count">
                  {'weldsWithActivity' in row ? row.weldsWithActivity : 0}
                </div>
                <div
                  role="cell"
                  className={`text-right lg:hidden ${formattedPctTotal.className}`}
                  aria-label={`Percentage complete delta ${formattedPctTotal.text}`}
                >
                  {formattedPctTotal.text}
                </div>
                <div
                  role="cell"
                  className={`text-right hidden lg:block ${formattedFitup.className}`}
                  aria-label={`Fit-up delta ${formattedFitup.text}`}
                >
                  {formattedFitup.text}
                </div>
                <div
                  role="cell"
                  className={`text-right hidden lg:block ${formattedWeldComplete.className}`}
                  aria-label={`Weld complete delta ${formattedWeldComplete.text}`}
                >
                  {formattedWeldComplete.text}
                </div>
                <div
                  role="cell"
                  className={`text-right hidden lg:block ${formattedAccepted.className}`}
                  aria-label={`Accepted delta ${formattedAccepted.text}`}
                >
                  {formattedAccepted.text}
                </div>
                <div
                  role="cell"
                  className={`text-right hidden lg:block ${formattedPctTotal.className}`}
                  aria-label={`Percentage complete delta ${formattedPctTotal.text}`}
                >
                  {formattedPctTotal.text}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
