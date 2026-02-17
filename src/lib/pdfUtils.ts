/**
 * PDF Utility Functions
 * Data transformation and formatting utilities for PDF generation
 */

import type {
  FieldWeldReportData,
  FieldWeldDeltaReportData,
  FieldWeldDeltaRow,
  FieldWeldDeltaGrandTotal,
  FieldWeldGroupingDimension,
  ReportData,
  GroupingDimension,
  ManhourReportData,
  ReportViewMode,
  ReportDateRange,
} from '@/types/reports';
import { DATE_RANGE_PRESET_LABELS } from '@/types/reports';
import type {
  TableProps,
  TableColumnDefinition,
} from '@/types/pdf-components';

/**
 * Get display label for field weld dimension
 */
export function getDimensionLabel(dimension: FieldWeldGroupingDimension): string {
  const labels: Partial<Record<FieldWeldGroupingDimension, string>> = {
    area: 'Area',
    system: 'System',
    test_package: 'Test Package',
    welder: 'Welder',
  };
  return labels[dimension] ?? 'Unknown';
}

/**
 * Check if any row (including grand total) has non-zero repair rate
 */
export function hasNonZeroRepairRate(reportData: FieldWeldReportData): boolean {
  const rowsHaveRepairs = reportData.rows.some(row => row.repairRate > 0);
  const grandTotalHasRepairs = reportData.grandTotal.repairRate > 0;
  return rowsHaveRepairs || grandTotalHasRepairs;
}

/**
 * Format a delta numeric value as a string with +/- prefix for PDF display
 * @param value - The delta value
 * @param isPercent - Whether to format as percentage (with % suffix and 1 decimal)
 */
export function formatDeltaForPDF(value: number, isPercent: boolean): string {
  if (isPercent) {
    if (value > 0) return `+${value.toFixed(1)}%`;
    if (value < 0) return `${value.toFixed(1)}%`;
    return '0.0%';
  }
  if (value > 0) return `+${value}`;
  if (value < 0) return `${value}`;
  return '0';
}

/**
 * Format a base cell value with its inline delta suffix.
 * Returns a pre-formatted string like "136 (+5)" or "99.0% (+18.1%)".
 * When passed as a string to formatCellValue in TableRow, it passes through as-is.
 */
function formatValueWithInlineDelta(
  baseValue: number | null,
  deltaValue: number,
  baseFormat: 'number' | 'percentage',
): string {
  const deltaSuffix = formatDeltaForPDF(deltaValue, baseFormat === 'percentage');

  if (baseValue === null || baseValue === undefined) return `- (${deltaSuffix})`;

  if (baseFormat === 'percentage') {
    return `${baseValue.toFixed(1)}% (${deltaSuffix})`;
  }
  // number format
  return `${baseValue.toLocaleString('en-US', { maximumFractionDigits: 0 })} (${deltaSuffix})`;
}

/** Maps base column keys to their corresponding delta field + format */
const INLINE_DELTA_DEFS: Array<{
  baseKey: string;
  deltaField: keyof FieldWeldDeltaRow & keyof FieldWeldDeltaGrandTotal;
  baseFormat: 'number' | 'percentage';
}> = [
  { baseKey: 'totalWelds', deltaField: 'deltaNewWelds', baseFormat: 'number' },
  { baseKey: 'weldCompleteCount', deltaField: 'deltaWeldCompleteCount', baseFormat: 'number' },
  { baseKey: 'acceptedCount', deltaField: 'deltaAcceptedCount', baseFormat: 'number' },
  { baseKey: 'pctTotal', deltaField: 'deltaPctTotal', baseFormat: 'percentage' },
];

/**
 * Transform field weld report data to table props for PDF rendering
 * @param reportData - Field weld report data
 * @param dimension - Grouping dimension
 * @param includeRepairRate - Whether to include repair rate column (default: true)
 * @param deltaData - Optional delta data; when present, affected cells show inline deltas like "136 (+5)"
 */
export function transformToTableProps(
  reportData: FieldWeldReportData,
  dimension: FieldWeldGroupingDimension,
  includeRepairRate: boolean = true,
  deltaData?: FieldWeldDeltaReportData
): TableProps {
  // Base columns (common to all dimensions)
  // Note: fitupCount removed per user request
  // Note: remainingCount only shown for non-welder dimensions
  const baseColumns: TableColumnDefinition[] = [
    { key: 'name', label: getDimensionLabel(dimension), width: '26%', align: 'left', format: 'text' },
    { key: 'totalWelds', label: 'Total Welds', width: '11%', align: 'right', format: 'number' },
    { key: 'weldCompleteCount', label: 'Weld Complete', width: '12%', align: 'right', format: 'number' },
    ...(dimension !== 'welder' ? [{ key: 'remainingCount', label: 'Remaining', width: '11%', align: 'right' as const, format: 'number' as const }] : []),
    { key: 'acceptedCount', label: 'Accepted', width: '11%', align: 'right', format: 'number' },
    { key: 'ndePassRate', label: 'NDE Pass Rate', width: '12%', align: 'right', format: 'percentage' },
    ...(includeRepairRate ? [{ key: 'repairRate', label: 'Repair Rate', width: '9%', align: 'right' as const, format: 'percentage' as const }] : []),
    { key: 'pctTotal', label: '% Complete', width: '8%', align: 'right', format: 'percentage' },
  ];

  // Add welder-specific columns if dimension is 'welder'
  if (dimension === 'welder') {
    baseColumns.push(
      {
        key: 'firstPassAcceptanceRate',
        label: 'First Pass Rate',
        width: '12%',
        align: 'right',
        format: 'percentage',
      },
      {
        key: 'avgDaysToAcceptance',
        label: 'Avg Days',
        width: '10%',
        align: 'right',
        format: 'decimal',
      }
    );

    // Adjust base column widths for welder dimension (to fit more columns)
    if (baseColumns[0]) baseColumns[0].width = '22%'; // name
    if (baseColumns[1]) baseColumns[1].width = '10%'; // totalWelds
    if (baseColumns[2]) baseColumns[2].width = '12%'; // weldCompleteCount
    if (baseColumns[3]) baseColumns[3].width = '10%'; // acceptedCount
    if (baseColumns[4]) baseColumns[4].width = '12%'; // ndePassRate
    // repairRate is at index 5 if included, pctTotal shifts accordingly
    const repairRateIndex = includeRepairRate ? 5 : -1;
    const pctTotalIndex = includeRepairRate ? 6 : 5;
    if (repairRateIndex >= 0 && baseColumns[repairRateIndex]) baseColumns[repairRateIndex].width = '9%';
    if (baseColumns[pctTotalIndex]) baseColumns[pctTotalIndex].width = '9%';
  }

  // Build delta lookup map: row id → delta row
  const deltaByRowId = deltaData
    ? new Map(deltaData.rows.map(r => [r.id, r]))
    : null;

  return {
    columns: baseColumns,
    data: reportData.rows.map((row) => {
      const baseRow: Record<string, string | number | null> = {
        name: row.name,
        totalWelds: row.totalWelds,
        weldCompleteCount: row.weldCompleteCount ?? null,
        ...(dimension !== 'welder' && { remainingCount: row.remainingCount ?? null }),
        acceptedCount: row.acceptedCount ?? null,
        ndePassRate: row.ndePassRate ?? null,
        ...(includeRepairRate && { repairRate: row.repairRate ?? null }),
        pctTotal: row.pctTotal ?? null,
        ...(dimension === 'welder' && {
          firstPassAcceptanceRate: row.firstPassAcceptanceRate ?? null,
          avgDaysToAcceptance: row.avgDaysToAcceptance ?? null,
        }),
      };

      // Merge inline delta values into base cells as pre-formatted strings
      if (deltaByRowId) {
        const deltaRow = deltaByRowId.get(row.id);
        if (deltaRow) {
          mergeInlineDeltaValues(baseRow, deltaRow);
        }
      }

      return baseRow;
    }),
    grandTotal: (() => {
      const gt: Record<string, string | number | null> = {
        name: reportData.grandTotal.name || 'Grand Total',
        totalWelds: reportData.grandTotal.totalWelds,
        weldCompleteCount: reportData.grandTotal.weldCompleteCount ?? null,
        ...(dimension !== 'welder' && { remainingCount: reportData.grandTotal.remainingCount ?? null }),
        acceptedCount: reportData.grandTotal.acceptedCount ?? null,
        ndePassRate: reportData.grandTotal.ndePassRate ?? null,
        ...(includeRepairRate && { repairRate: reportData.grandTotal.repairRate ?? null }),
        pctTotal: reportData.grandTotal.pctTotal ?? null,
        ...(dimension === 'welder' && {
          firstPassAcceptanceRate: reportData.grandTotal.firstPassAcceptanceRate ?? null,
          avgDaysToAcceptance: reportData.grandTotal.avgDaysToAcceptance ?? null,
        }),
      };

      // Merge grand total inline delta values
      if (deltaData) {
        mergeInlineDeltaValues(gt, deltaData.grandTotal);
      }

      return gt;
    })(),
    highlightGrandTotal: true,
  };
}

/**
 * Merge inline delta values into a row's base cells as pre-formatted strings.
 * Converts numeric cell values to strings like "136 (+5)" or "99.0% (+18.1%)".
 */
function mergeInlineDeltaValues(
  row: Record<string, string | number | null>,
  deltaRow: FieldWeldDeltaRow | FieldWeldDeltaGrandTotal
): void {
  for (const def of INLINE_DELTA_DEFS) {
    const baseValue = row[def.baseKey];
    if (baseValue !== undefined) {
      row[def.baseKey] = formatValueWithInlineDelta(
        typeof baseValue === 'number' ? baseValue : null,
        deltaRow[def.deltaField] as number,
        def.baseFormat
      );
    }
  }
}

/**
 * Sanitize filename for PDF download
 * Removes invalid characters: / \ ? % * : | " < >
 */
export function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '_');
}

/**
 * Build a subtitle string showing active sort + filter for PDF header.
 * Example: "Sorted by: % Complete (desc) | Period: Last 7 Days"
 *
 * @param sortLabel - Human-readable sort column name (e.g., "% Complete")
 * @param sortDirection - 'asc' or 'desc'
 * @param dateRange - Optional date range filter state
 */
export function buildPDFSubtitle(
  sortLabel: string,
  sortDirection: 'asc' | 'desc',
  dateRange?: ReportDateRange
): string {
  const parts: string[] = [];

  // Sort info
  const directionLabel = sortDirection === 'asc' ? 'asc' : 'desc';
  parts.push(`Sorted by: ${sortLabel} (${directionLabel})`);

  // Date range info (only show if not "all_time")
  if (dateRange && dateRange.preset !== 'all_time') {
    if (dateRange.preset === 'custom' && dateRange.startDate && dateRange.endDate) {
      parts.push(`Period: ${dateRange.startDate} to ${dateRange.endDate}`);
    } else {
      parts.push(`Period: ${DATE_RANGE_PRESET_LABELS[dateRange.preset]}`);
    }
  }

  return parts.join('  |  ');
}

/**
 * Format date for filename (YYYY-MM-DD)
 */
export function formatDateForFilename(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Generate filename for field weld PDF export
 * Pattern: [project-name]_field_weld_[dimension]_[YYYY-MM-DD].pdf
 */
export function generateFieldWeldPDFFilename(
  projectName: string,
  dimension: FieldWeldGroupingDimension,
  date: Date = new Date()
): string {
  const sanitizedProjectName = sanitizeFilename(projectName);
  const formattedDate = formatDateForFilename(date);
  return `${sanitizedProjectName}_field_weld_${dimension}_${formattedDate}.pdf`;
}

/**
 * Get display label for component progress dimension
 */
export function getComponentProgressDimensionLabel(dimension: GroupingDimension): string {
  const labels: Record<GroupingDimension, string> = {
    area: 'Area',
    system: 'System',
    test_package: 'Test Package',
  };
  return labels[dimension];
}

/**
 * Transform component progress report data to table props for PDF rendering
 */
export function transformComponentProgressToTableProps(
  reportData: ReportData,
  dimension: GroupingDimension
): TableProps {
  // Component progress columns (8 columns including % Complete)
  const columns: TableColumnDefinition[] = [
    { key: 'name', label: getComponentProgressDimensionLabel(dimension), width: '25%', align: 'left', format: 'text' },
    { key: 'budget', label: 'Budget', width: '10%', align: 'right', format: 'number' },
    { key: 'pctReceived', label: 'Received', width: '10%', align: 'right', format: 'percentage' },
    { key: 'pctInstalled', label: 'Installed', width: '10%', align: 'right', format: 'percentage' },
    { key: 'pctPunch', label: 'Punch', width: '10%', align: 'right', format: 'percentage' },
    { key: 'pctTested', label: 'Tested', width: '10%', align: 'right', format: 'percentage' },
    { key: 'pctRestored', label: 'Restored', width: '10%', align: 'right', format: 'percentage' },
    { key: 'pctTotal', label: '% Complete', width: '15%', align: 'right', format: 'percentage' },
  ];

  return {
    columns,
    data: reportData.rows.map((row) => ({
      name: row.name,
      budget: row.budget,
      pctReceived: row.pctReceived,
      pctInstalled: row.pctInstalled,
      pctPunch: row.pctPunch,
      pctTested: row.pctTested,
      pctRestored: row.pctRestored,
      pctTotal: row.pctTotal,
    })),
    grandTotal: {
      name: reportData.grandTotal.name || 'Grand Total',
      budget: reportData.grandTotal.budget,
      pctReceived: reportData.grandTotal.pctReceived,
      pctInstalled: reportData.grandTotal.pctInstalled,
      pctPunch: reportData.grandTotal.pctPunch,
      pctTested: reportData.grandTotal.pctTested,
      pctRestored: reportData.grandTotal.pctRestored,
      pctTotal: reportData.grandTotal.pctTotal,
    },
    highlightGrandTotal: true,
  };
}

/**
 * Generate filename for component progress PDF export
 * Pattern: [project-name]_component_progress_[dimension]_[YYYY-MM-DD].pdf
 */
export function generateComponentProgressPDFFilename(
  projectName: string,
  dimension: GroupingDimension,
  date: Date = new Date()
): string {
  const sanitizedProjectName = sanitizeFilename(projectName);
  const formattedDate = formatDateForFilename(date);
  return `${sanitizedProjectName}_component_progress_${dimension}_${formattedDate}.pdf`;
}

/**
 * Generate filename for welder summary PDF export
 * Pattern: [project-name]_welder_summary_[YYYY-MM-DD].pdf
 */
export function generateWelderSummaryPDFFilename(
  projectName: string,
  date: Date = new Date()
): string {
  const sanitizedProjectName = sanitizeFilename(projectName);
  const formattedDate = formatDateForFilename(date);
  return `${sanitizedProjectName}_welder_summary_${formattedDate}.pdf`;
}

/**
 * ============================================================================
 * MANHOUR PROGRESS REPORT PDF UTILITIES (Feature 032)
 * ============================================================================
 */

/**
 * Transform manhour report data to table props for "Manhour" view PDF rendering
 * Shows: Name | MH Budget | Receive | Install | Punch | Test | Restore | Total Earned | % Complete
 */
export function transformManhourToTableProps(
  reportData: ManhourReportData,
  dimension: GroupingDimension
): TableProps {
  const columns: TableColumnDefinition[] = [
    { key: 'name', label: getComponentProgressDimensionLabel(dimension), width: '18%', align: 'left', format: 'text' },
    { key: 'mhBudget', label: 'MH Budget', width: '10%', align: 'right', format: 'number' },
    { key: 'receiveMhEarned', label: 'Receive', width: '10%', align: 'right', format: 'decimal' },
    { key: 'installMhEarned', label: 'Install', width: '10%', align: 'right', format: 'decimal' },
    { key: 'punchMhEarned', label: 'Punch', width: '10%', align: 'right', format: 'decimal' },
    { key: 'testMhEarned', label: 'Test', width: '10%', align: 'right', format: 'decimal' },
    { key: 'restoreMhEarned', label: 'Restore', width: '10%', align: 'right', format: 'decimal' },
    { key: 'totalMhEarned', label: 'Total Earned', width: '10%', align: 'right', format: 'decimal' },
    { key: 'mhPctComplete', label: '% Complete', width: '12%', align: 'right', format: 'percentage' },
  ];

  return {
    columns,
    data: reportData.rows.map((row) => ({
      name: row.name,
      mhBudget: row.mhBudget,
      receiveMhEarned: row.receiveMhEarned,
      installMhEarned: row.installMhEarned,
      punchMhEarned: row.punchMhEarned,
      testMhEarned: row.testMhEarned,
      restoreMhEarned: row.restoreMhEarned,
      totalMhEarned: row.totalMhEarned,
      mhPctComplete: row.mhPctComplete,
    })),
    grandTotal: {
      name: 'Grand Total',
      mhBudget: reportData.grandTotal.mhBudget,
      receiveMhEarned: reportData.grandTotal.receiveMhEarned,
      installMhEarned: reportData.grandTotal.installMhEarned,
      punchMhEarned: reportData.grandTotal.punchMhEarned,
      testMhEarned: reportData.grandTotal.testMhEarned,
      restoreMhEarned: reportData.grandTotal.restoreMhEarned,
      totalMhEarned: reportData.grandTotal.totalMhEarned,
      mhPctComplete: reportData.grandTotal.mhPctComplete,
    },
    highlightGrandTotal: true,
  };
}

/**
 * Calculate milestone percentage: (earned / budget) * 100
 * Returns null when budget is 0 to avoid division by zero
 */
function calculateMilestonePercent(earned: number, budget: number): number | null {
  if (budget === 0) return null;
  return (earned / budget) * 100;
}

/**
 * Transform manhour report data to table props for "Manhour %" view PDF rendering
 * Shows: Name | MH Budget | Receive % | Install % | Punch % | Test % | Restore % | % Complete
 */
export function transformManhourPercentToTableProps(
  reportData: ManhourReportData,
  dimension: GroupingDimension
): TableProps {
  const columns: TableColumnDefinition[] = [
    { key: 'name', label: getComponentProgressDimensionLabel(dimension), width: '20%', align: 'left', format: 'text' },
    { key: 'mhBudget', label: 'MH Budget', width: '11%', align: 'right', format: 'number' },
    { key: 'receivePct', label: 'Receive %', width: '11%', align: 'right', format: 'percentage' },
    { key: 'installPct', label: 'Install %', width: '11%', align: 'right', format: 'percentage' },
    { key: 'punchPct', label: 'Punch %', width: '11%', align: 'right', format: 'percentage' },
    { key: 'testPct', label: 'Test %', width: '11%', align: 'right', format: 'percentage' },
    { key: 'restorePct', label: 'Restore %', width: '11%', align: 'right', format: 'percentage' },
    { key: 'mhPctComplete', label: '% Complete', width: '14%', align: 'right', format: 'percentage' },
  ];

  return {
    columns,
    data: reportData.rows.map((row) => ({
      name: row.name,
      mhBudget: row.mhBudget,
      receivePct: calculateMilestonePercent(row.receiveMhEarned, row.receiveMhBudget),
      installPct: calculateMilestonePercent(row.installMhEarned, row.installMhBudget),
      punchPct: calculateMilestonePercent(row.punchMhEarned, row.punchMhBudget),
      testPct: calculateMilestonePercent(row.testMhEarned, row.testMhBudget),
      restorePct: calculateMilestonePercent(row.restoreMhEarned, row.restoreMhBudget),
      mhPctComplete: row.mhPctComplete,
    })),
    grandTotal: {
      name: 'Grand Total',
      mhBudget: reportData.grandTotal.mhBudget,
      receivePct: calculateMilestonePercent(reportData.grandTotal.receiveMhEarned, reportData.grandTotal.receiveMhBudget),
      installPct: calculateMilestonePercent(reportData.grandTotal.installMhEarned, reportData.grandTotal.installMhBudget),
      punchPct: calculateMilestonePercent(reportData.grandTotal.punchMhEarned, reportData.grandTotal.punchMhBudget),
      testPct: calculateMilestonePercent(reportData.grandTotal.testMhEarned, reportData.grandTotal.testMhBudget),
      restorePct: calculateMilestonePercent(reportData.grandTotal.restoreMhEarned, reportData.grandTotal.restoreMhBudget),
      mhPctComplete: reportData.grandTotal.mhPctComplete,
    },
    highlightGrandTotal: true,
  };
}

/**
 * Generate filename for manhour progress PDF export
 * Pattern: [project-name]_manhour_progress_[dimension]_[YYYY-MM-DD].pdf
 */
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
