/**
 * FieldWeldReportTable Component (Weekly Field Weld Progress Reports)
 * Virtualized table for displaying field weld progress report with Grand Total row
 * Supports column sorting with persistent preferences
 */

import { useEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { toast } from 'sonner';
import { useFieldWeldPDFExport } from '@/hooks/useFieldWeldPDFExport';
import { PDFPreviewDialog } from '@/components/reports/PDFPreviewDialog';
import type { FieldWeldReportData, ExportFormat, FieldWeldReportColumn } from '@/types/reports';
import {
  FIELD_WELD_DIMENSION_LABELS,
  FIELD_WELD_REPORT_COLUMNS,
  WELDER_PERFORMANCE_COLUMNS,
  XRAY_TIER_COLUMNS,
} from '@/types/reports';
import { hasNonZeroRepairRate } from '@/lib/pdfUtils';
import { useOrganizationLogo } from '@/hooks/useOrganizationLogo';
import { useReportPreferencesStore, type FieldWeldReportSortColumn } from '@/stores/useReportPreferencesStore';
import { sortFieldWeldReportRows } from '@/lib/report-sorting';

interface FieldWeldReportTableProps {
  reportData: FieldWeldReportData;
  projectName: string;
  onExport: (format: ExportFormat) => void;
}

export function FieldWeldReportTable({ reportData, projectName, onExport }: FieldWeldReportTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const { generatePDFPreview, isGenerating } = useFieldWeldPDFExport();
  const { data: companyLogo } = useOrganizationLogo();

  // PDF Preview state
  const [previewState, setPreviewState] = useState<{
    open: boolean;
    url: string | null;
    filename: string | null;
    blob: Blob | null;
  }>({
    open: false,
    url: null,
    filename: null,
    blob: null,
  });

  // Determine if welder-specific columns should be shown
  const isWelderDimension = reportData.dimension === 'welder';

  // Determine if repair rate column should be shown (hide if ALL rows have 0% repair rate)
  const showRepairRate = hasNonZeroRepairRate(reportData);

  // Enhanced PDF export handler (preview first, then download from dialog)
  const handleEnhancedPDFExport = async () => {
    try {
      const { blob, url, filename } = await generatePDFPreview(
        reportData,
        projectName,
        reportData.dimension,
        companyLogo ?? undefined
      );

      setPreviewState({
        open: true,
        url,
        filename,
        blob,
      });
    } catch (err) {
      console.error('Enhanced PDF export error:', err);
      toast.error('Failed to generate PDF. Please try again or use classic export.');
    }
  };

  /**
   * Close preview dialog and cleanup object URL
   */
  const handleClosePreview = () => {
    if (previewState.url) {
      URL.revokeObjectURL(previewState.url);
    }
    setPreviewState({
      open: false,
      url: null,
      filename: null,
      blob: null,
    });
  };

  /**
   * Cleanup effect - revoke object URL if component unmounts with open preview
   */
  useEffect(() => {
    return () => {
      if (previewState.url) {
        URL.revokeObjectURL(previewState.url);
      }
    };
  }, [previewState.url]);

  // Get sort state from store
  const { fieldWeldReport, toggleFieldWeldSort } = useReportPreferencesStore();
  const { sortColumn, sortDirection } = fieldWeldReport;

  // Build column list based on dimension
  // Filter out repair rate column if all rows have 0% repair rate
  const baseColumns = isWelderDimension
    ? [...FIELD_WELD_REPORT_COLUMNS, ...WELDER_PERFORMANCE_COLUMNS, ...XRAY_TIER_COLUMNS]
    : FIELD_WELD_REPORT_COLUMNS;
  const columns = showRepairRate
    ? baseColumns
    : baseColumns.filter(col => col.key !== 'repairRate');

  // Sort rows, then combine with grand total (grand total always at bottom)
  const sortedRows = sortFieldWeldReportRows(reportData.rows, sortColumn, sortDirection);
  const allRows = [...sortedRows, reportData.grandTotal];

  const rowVirtualizer = useVirtualizer({
    count: allRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48, // Estimated row height in pixels
    overscan: 10, // Increased overscan for better test compatibility
  });

  // Empty state
  if (reportData.rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <p>No field welds found for this grouping dimension.</p>
      </div>
    );
  }

  // Format numeric values based on column format
  const formatValue = (value: number | null | undefined, format?: string): string => {
    if (value === null || value === undefined) {
      return '-';
    }

    switch (format) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'decimal':
        return value.toFixed(1);
      case 'number':
        return value.toString();
      default:
        return String(value);
    }
  };

  // Map column keys to sort column names (handles naming differences)
  const mapColumnKeyToSortColumn = (key: FieldWeldReportColumn['key']): FieldWeldReportSortColumn => {
    const mapping: Record<string, FieldWeldReportSortColumn> = {
      name: 'name',
      totalWelds: 'totalWelds',
      weldCompleteCount: 'weldCompleteCount',
      acceptedCount: 'acceptedCount',
      ndePassRate: 'ndePassRate',
      repairRate: 'repairRate',
      pctTotal: 'pctTotal',
      firstPassAcceptanceRate: 'firstPassRate',
      avgDaysToAcceptance: 'avgDaysToAcceptance',
      xray5pctCount: 'xray5Count',
      xray10pctCount: 'xray10Count',
      xray100pctCount: 'xray100Count',
      xray5pctPassRate: 'xray5PassRate',
      xray10pctPassRate: 'xray10PassRate',
      xray100pctPassRate: 'xray100PassRate',
    };
    return mapping[key as string] ?? 'name';
  };

  // Get dimension-specific column header
  const dimensionLabel = FIELD_WELD_DIMENSION_LABELS[reportData.dimension];

  return (
    <>
      {/* PDF Preview Dialog */}
      <PDFPreviewDialog
        open={previewState.open}
        onClose={handleClosePreview}
        previewUrl={previewState.url}
        blob={previewState.blob}
        filename={previewState.filename}
      />

      <div className="space-y-4">
        {/* Export Buttons (Desktop only: ≥1024px) */}
        <div className="hidden lg:flex justify-end gap-2">
        {/* Enhanced PDF Export (Component-based with Preview) */}
        <button
          onClick={handleEnhancedPDFExport}
          disabled={isGenerating}
          className="px-4 py-2 text-sm font-medium text-white bg-slate-700 rounded hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Preview and export report to PDF"
        >
          {isGenerating ? 'Generating Preview...' : 'Preview & Export PDF'}
        </button>

        {/* Excel Export */}
        <button
          onClick={() => onExport('excel')}
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          aria-label="Export report to Excel"
        >
          Export Excel
        </button>

        {/* CSV Export */}
        <button
          onClick={() => onExport('csv')}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Export report to CSV"
        >
          Export CSV
        </button>
      </div>

      {/* Table Container */}
      <div
        className="border rounded-lg overflow-hidden"
        role="table"
        aria-label={`Field weld progress report grouped by ${dimensionLabel}`}
      >
        {/* Table Header (Sticky) - Desktop: all columns, Mobile: 3 columns (Name, Total Welds, % Complete) */}
        <div className="sticky top-0 z-10 bg-slate-700 dark:bg-slate-800 border-b" role="rowgroup">
          <div
            role="row"
            className="grid grid-cols-[2fr_1fr_1fr] lg:grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-4 px-4 py-3 text-sm font-semibold text-white"
            style={{
              gridTemplateColumns: `repeat(${columns.length}, minmax(120px, 1fr))`,
            }}
          >
            {/* Mobile: 3 columns */}
            <button
              role="columnheader"
              className="text-left lg:hidden hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
              onClick={() => toggleFieldWeldSort('name')}
              aria-label={`Sort by ${dimensionLabel}`}
            >
              {dimensionLabel}
              {sortColumn === 'name' && <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
            </button>
            <button
              role="columnheader"
              className="text-right lg:hidden hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
              onClick={() => toggleFieldWeldSort('totalWelds')}
              aria-label="Sort by Total Welds"
            >
              Total Welds
              {sortColumn === 'totalWelds' && <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
            </button>
            <button
              role="columnheader"
              className="text-right lg:hidden hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors"
              onClick={() => toggleFieldWeldSort('pctTotal')}
              aria-label="Sort by percentage complete"
            >
              % Complete
              {sortColumn === 'pctTotal' && <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
            </button>

            {/* Desktop: All columns */}
            {columns.map((col) => {
              const sortKey = mapColumnKeyToSortColumn(col.key);
              return (
                <button
                  key={String(col.key)}
                  role="columnheader"
                  className={`hidden lg:block hover:bg-slate-600 rounded px-1 -mx-1 cursor-pointer transition-colors ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                  onClick={() => toggleFieldWeldSort(sortKey)}
                  aria-label={`Sort by ${col.label}`}
                >
                  {col.key === 'name' ? dimensionLabel : col.label}
                  {sortColumn === sortKey && <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Virtualized Table Body */}
        <div
          ref={parentRef}
          className="overflow-auto"
          style={{ height: '500px' }}
          data-testid="field-weld-report-table-body"
          role="rowgroup"
          aria-label="Field weld report data rows"
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
                  aria-label={isGrandTotal ? 'Grand Total summary row' : `${row.name} field weld progress data`}
                  data-testid={`field-weld-report-row-${virtualRow.index}`}
                  className={`grid grid-cols-[2fr_1fr_1fr] lg:grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-4 px-4 py-3 border-b text-sm ${
                    isGrandTotal
                      ? 'font-bold bg-slate-700 dark:bg-slate-800 text-white border-t-2'
                      : ''
                  }`}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    gridTemplateColumns: `repeat(${columns.length}, minmax(120px, 1fr))`,
                  }}
                >
                  {/* Mobile: 3 columns */}
                  <div role="cell" className="text-left truncate lg:hidden" aria-label={`${dimensionLabel} name`}>
                    {row.name}
                  </div>
                  <div role="cell" className="text-right lg:hidden" aria-label="Total welds count">
                    {row.totalWelds}
                  </div>
                  <div
                    role="cell"
                    className="text-right lg:hidden"
                    aria-label={`Total ${formatValue(row.pctTotal, 'percentage')} complete`}
                  >
                    {formatValue(row.pctTotal, 'percentage')}
                  </div>

                  {/* Desktop: All columns */}
                  {columns.map((col) => {
                    const value = row[col.key as keyof typeof row];
                    const formattedValue = formatValue(value as number | null | undefined, col.format);

                    return (
                      <div
                        key={String(col.key)}
                        role="cell"
                        className={`hidden lg:block ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.key === 'name' ? 'truncate' : ''}`}
                        aria-label={`${col.label}: ${formattedValue}`}
                      >
                        {col.key === 'name' ? value : formattedValue}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

        {/* Report Metadata */}
        <div className="text-sm text-muted-foreground">
          <p>
            Report generated at {reportData.generatedAt.toLocaleString()} for project: {projectName}
          </p>
        </div>
      </div>
    </>
  );
}
