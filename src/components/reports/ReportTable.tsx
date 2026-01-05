/**
 * ReportTable Component (Feature 019 - T023)
 * Virtualized table for displaying progress report with 7 columns + Grand Total row
 * Supports column sorting with persistent preferences
 */

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { ReportData } from '@/types/reports';
import { DIMENSION_LABELS } from '@/types/reports';
import { useReportPreferencesStore } from '@/stores/useReportPreferencesStore';
import { sortComponentReportRows } from '@/lib/report-sorting';

interface ReportTableProps {
  data: ReportData;
}

// Sort indicator component
function SortIndicator({ column, currentColumn, direction }: { column: string; currentColumn: string; direction: 'asc' | 'desc' }) {
  if (column !== currentColumn) return null;
  return <span className="ml-1">{direction === 'asc' ? '↑' : '↓'}</span>;
}

export function ReportTable({ data }: ReportTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Get sort state from store
  const { componentReport, toggleComponentSort } = useReportPreferencesStore();
  const { sortColumn, sortDirection } = componentReport;

  // Sort rows, then combine with grand total (grand total always at bottom)
  const sortedRows = sortComponentReportRows(data.rows, sortColumn, sortDirection);
  const allRows = [...sortedRows, data.grandTotal];

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
    <div className="border rounded-lg overflow-hidden" role="table" aria-label={`Progress report grouped by ${dimensionLabel}`}>
      {/* Table Header (Sticky) - Desktop: 8 columns, Mobile: 3 columns (Name, Budget, % Complete) */}
      <div className="sticky top-0 z-10 bg-slate-700 dark:bg-slate-800 border-b" role="rowgroup">
        <div
          role="row"
          className="grid grid-cols-[2fr_1fr_1fr] lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm font-semibold text-white"
        >
          <button
            role="columnheader"
            className="text-left hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
            onClick={() => toggleComponentSort('name')}
            aria-label={`Sort by ${dimensionLabel}`}
          >
            {dimensionLabel}
            <SortIndicator column="name" currentColumn={sortColumn} direction={sortDirection} />
          </button>
          <button
            role="columnheader"
            className="text-right hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
            onClick={() => toggleComponentSort('budget')}
            aria-label="Sort by Budget"
          >
            Budget
            <SortIndicator column="budget" currentColumn={sortColumn} direction={sortDirection} />
          </button>
          <button
            role="columnheader"
            className="text-right lg:hidden hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
            onClick={() => toggleComponentSort('pctTotal')}
            aria-label="Sort by percentage complete"
          >
            % Complete
            <SortIndicator column="pctTotal" currentColumn={sortColumn} direction={sortDirection} />
          </button>
          <button
            role="columnheader"
            className="text-right hidden lg:block hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
            onClick={() => toggleComponentSort('pctReceived')}
            aria-label="Sort by Received percentage"
          >
            Received
            <SortIndicator column="pctReceived" currentColumn={sortColumn} direction={sortDirection} />
          </button>
          <button
            role="columnheader"
            className="text-right hidden lg:block hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
            onClick={() => toggleComponentSort('pctInstalled')}
            aria-label="Sort by Installed percentage"
          >
            Installed
            <SortIndicator column="pctInstalled" currentColumn={sortColumn} direction={sortDirection} />
          </button>
          <button
            role="columnheader"
            className="text-right hidden lg:block hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
            onClick={() => toggleComponentSort('pctPunch')}
            aria-label="Sort by Punch percentage"
          >
            Punch
            <SortIndicator column="pctPunch" currentColumn={sortColumn} direction={sortDirection} />
          </button>
          <button
            role="columnheader"
            className="text-right hidden lg:block hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
            onClick={() => toggleComponentSort('pctTested')}
            aria-label="Sort by Tested percentage"
          >
            Tested
            <SortIndicator column="pctTested" currentColumn={sortColumn} direction={sortDirection} />
          </button>
          <button
            role="columnheader"
            className="text-right hidden lg:block hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
            onClick={() => toggleComponentSort('pctRestored')}
            aria-label="Sort by Restored percentage"
          >
            Restored
            <SortIndicator column="pctRestored" currentColumn={sortColumn} direction={sortDirection} />
          </button>
          <button
            role="columnheader"
            className="text-right hidden lg:block hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
            onClick={() => toggleComponentSort('pctTotal')}
            aria-label="Sort by percentage complete"
          >
            % Complete
            <SortIndicator column="pctTotal" currentColumn={sortColumn} direction={sortDirection} />
          </button>
        </div>
      </div>

      {/* Virtualized Table Body */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ height: '500px' }}
        data-testid="report-table-body"
        role="rowgroup"
        aria-label="Report data rows"
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

            // Format percentages to 1 decimal place
            const formatPct = (value: number) => {
              return isGrandTotal ? value.toFixed(1) : Math.round(value).toString();
            };

            return (
              <div
                key={virtualRow.index}
                role="row"
                aria-label={isGrandTotal ? 'Grand Total summary row' : `${row.name} progress data`}
                data-testid={`report-row-${virtualRow.index}`}
                className={`grid grid-cols-[2fr_1fr_1fr] lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 border-b text-sm ${
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
                <div role="cell" className="text-left truncate" aria-label={`${dimensionLabel} name`}>{row.name}</div>
                <div role="cell" className="text-right" aria-label="Budget count">{row.budget}</div>
                <div role="cell" className="text-right lg:hidden" aria-label={`Total ${formatPct(row.pctTotal)} percent complete`}>{formatPct(row.pctTotal)}%</div>
                <div role="cell" className="text-right hidden lg:block" aria-label={`Received ${formatPct(row.pctReceived)} percent`}>{formatPct(row.pctReceived)}%</div>
                <div role="cell" className="text-right hidden lg:block" aria-label={`Installed ${formatPct(row.pctInstalled)} percent`}>{formatPct(row.pctInstalled)}%</div>
                <div role="cell" className="text-right hidden lg:block" aria-label={`Punch ${formatPct(row.pctPunch)} percent`}>{formatPct(row.pctPunch)}%</div>
                <div role="cell" className="text-right hidden lg:block" aria-label={`Tested ${formatPct(row.pctTested)} percent`}>{formatPct(row.pctTested)}%</div>
                <div role="cell" className="text-right hidden lg:block" aria-label={`Restored ${formatPct(row.pctRestored)} percent`}>{formatPct(row.pctRestored)}%</div>
                <div role="cell" className="text-right hidden lg:block" aria-label={`Total ${formatPct(row.pctTotal)} percent complete`}>{formatPct(row.pctTotal)}%</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
