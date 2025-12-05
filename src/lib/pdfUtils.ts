/**
 * PDF Utility Functions
 * Data transformation and formatting utilities for PDF generation
 */

import type {
  FieldWeldReportData,
  FieldWeldGroupingDimension,
  ReportData,
  GroupingDimension,
  ManhourReportData,
  ReportViewMode,
} from '@/types/reports';
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
 * Transform field weld report data to table props for PDF rendering
 */
export function transformToTableProps(
  reportData: FieldWeldReportData,
  dimension: FieldWeldGroupingDimension
): TableProps {
  // Base columns (common to all dimensions)
  const baseColumns: TableColumnDefinition[] = [
    { key: 'name', label: getDimensionLabel(dimension), width: '25%', align: 'left', format: 'text' },
    { key: 'totalWelds', label: 'Total Welds', width: '9%', align: 'right', format: 'number' },
    { key: 'fitupCount', label: 'Fit-up', width: '8%', align: 'right', format: 'number' },
    { key: 'weldCompleteCount', label: 'Weld Complete', width: '11%', align: 'right', format: 'number' },
    { key: 'acceptedCount', label: 'Accepted', width: '9%', align: 'right', format: 'number' },
    { key: 'ndePassRate', label: 'NDE Pass Rate', width: '11%', align: 'right', format: 'percentage' },
    { key: 'repairRate', label: 'Repair Rate', width: '10%', align: 'right', format: 'percentage' },
    { key: 'pctTotal', label: '% Complete', width: '10%', align: 'right', format: 'percentage' },
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

    // Adjust base column widths for welder dimension (to fit 10 columns)
    if (baseColumns[0]) baseColumns[0].width = '20%'; // name
    if (baseColumns[1]) baseColumns[1].width = '8%';  // totalWelds
    if (baseColumns[2]) baseColumns[2].width = '7%';  // fitupCount
    if (baseColumns[3]) baseColumns[3].width = '10%'; // weldCompleteCount
    if (baseColumns[4]) baseColumns[4].width = '8%';  // acceptedCount
    if (baseColumns[5]) baseColumns[5].width = '10%'; // ndePassRate
    if (baseColumns[6]) baseColumns[6].width = '9%';  // repairRate
    if (baseColumns[7]) baseColumns[7].width = '9%';  // pctTotal
  }

  return {
    columns: baseColumns,
    data: reportData.rows.map((row) => ({
      name: row.name,
      totalWelds: row.totalWelds,
      fitupCount: row.fitupCount ?? null,
      weldCompleteCount: row.weldCompleteCount ?? null,
      acceptedCount: row.acceptedCount ?? null,
      ndePassRate: row.ndePassRate ?? null,
      repairRate: row.repairRate ?? null,
      pctTotal: row.pctTotal ?? null,
      ...(dimension === 'welder' && {
        firstPassAcceptanceRate: row.firstPassAcceptanceRate ?? null,
        avgDaysToAcceptance: row.avgDaysToAcceptance ?? null,
      }),
    })),
    grandTotal: {
      name: reportData.grandTotal.name || 'Grand Total',
      totalWelds: reportData.grandTotal.totalWelds,
      fitupCount: reportData.grandTotal.fitupCount ?? null,
      weldCompleteCount: reportData.grandTotal.weldCompleteCount ?? null,
      acceptedCount: reportData.grandTotal.acceptedCount ?? null,
      ndePassRate: reportData.grandTotal.ndePassRate ?? null,
      repairRate: reportData.grandTotal.repairRate ?? null,
      pctTotal: reportData.grandTotal.pctTotal ?? null,
      ...(dimension === 'welder' && {
        firstPassAcceptanceRate: reportData.grandTotal.firstPassAcceptanceRate ?? null,
        avgDaysToAcceptance: reportData.grandTotal.avgDaysToAcceptance ?? null,
      }),
    },
    highlightGrandTotal: true,
  };
}

/**
 * Sanitize filename for PDF download
 * Removes invalid characters: / \ ? % * : | " < >
 */
export function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '_');
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
  const viewSuffix = viewMode === 'manhour_percent' ? 'mh_percent' : 'manhour';
  return `${sanitizedProjectName}_${viewSuffix}_progress_${dimension}_${formattedDate}.pdf`;
}
