/**
 * TypeScript interfaces for Weekly Progress Reports (Feature 019)
 *
 * This file defines types for:
 * - Report row data (Area/System/Test Package progress)
 * - Report configurations (saved report settings)
 * - Grouping dimensions
 * - Export formats
 */

// Grouping dimension for progress reports
export type GroupingDimension = 'area' | 'system' | 'test_package';

// Export format options
export type ExportFormat = 'pdf' | 'excel' | 'csv';

// Progress row data structure (matches view output)
export interface ProgressRow {
  // Primary key (area_id, system_id, or test_package_id)
  id: string;
  // Display name (area_name, system_name, or test_package_name)
  name: string;
  // Project ID for filtering
  projectId: string;
  // Budget: Number of components in this grouping
  budget: number;
  // Standardized milestone percentages (0-100)
  pctReceived: number;
  pctInstalled: number;
  pctPunch: number;
  pctTested: number;
  pctRestored: number;
  // Overall completion percentage
  pctTotal: number;
}

// Grand Total row structure (calculated from all rows)
export interface GrandTotalRow {
  name: 'Grand Total';
  budget: number;
  pctReceived: number;
  pctInstalled: number;
  pctPunch: number;
  pctTested: number;
  pctRestored: number;
  pctTotal: number;
}

// Report data structure (includes rows and grand total)
export interface ReportData {
  dimension: GroupingDimension;
  rows: ProgressRow[];
  grandTotal: GrandTotalRow;
  generatedAt: Date;
  projectId: string;
}

// Report configuration (saved settings for reuse)
export interface ReportConfig {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  groupingDimension: GroupingDimension;
  hierarchicalGrouping: boolean;
  componentTypeFilter: string[] | null; // null = all types
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
}

// Report configuration create input (for API calls)
export interface CreateReportConfigInput {
  projectId: string;
  name: string;
  description?: string;
  groupingDimension: GroupingDimension;
  hierarchicalGrouping?: boolean;
  componentTypeFilter?: string[] | null;
}

// Report configuration update input (for API calls)
export interface UpdateReportConfigInput {
  name?: string;
  description?: string;
  groupingDimension?: GroupingDimension;
  hierarchicalGrouping?: boolean;
  componentTypeFilter?: string[] | null;
}

// Export options for PDF/Excel/CSV
export interface ExportOptions {
  format: ExportFormat;
  filename: string;
  reportData: ReportData;
  projectName: string;
  companyLogo?: string; // Base64 encoded image for PDF header
}

// Column configuration for reports
export interface ReportColumn {
  key: keyof ProgressRow | keyof GrandTotalRow;
  label: string;
  width?: number; // For PDF/Excel column widths
  align?: 'left' | 'center' | 'right';
  format?: 'text' | 'number' | 'percentage';
}

// Standard report columns (8 columns including % Complete)
export const REPORT_COLUMNS: ReportColumn[] = [
  { key: 'name', label: 'Area', align: 'left', format: 'text' },
  { key: 'budget', label: 'Budget', align: 'right', format: 'number' },
  { key: 'pctReceived', label: 'Received', align: 'right', format: 'percentage' },
  { key: 'pctInstalled', label: 'Installed', align: 'right', format: 'percentage' },
  { key: 'pctPunch', label: 'Punch', align: 'right', format: 'percentage' },
  { key: 'pctTested', label: 'Tested', align: 'right', format: 'percentage' },
  { key: 'pctRestored', label: 'Restored', align: 'right', format: 'percentage' },
  { key: 'pctTotal', label: '% Complete', align: 'right', format: 'percentage' },
] as const;

// Dimension display labels
export const DIMENSION_LABELS: Record<GroupingDimension, string> = {
  area: 'Area',
  system: 'System',
  test_package: 'Test Package',
};

/**
 * ============================================================================
 * FIELD WELD PROGRESS REPORTS (Weekly Field Weld Reports Feature)
 * ============================================================================
 */

// Grouping dimension for field weld reports (includes 'welder')
export type FieldWeldGroupingDimension = 'area' | 'system' | 'test_package' | 'welder';

// Field weld progress row data structure (matches view output)
export interface FieldWeldProgressRow {
  // Primary key (area_id, system_id, test_package_id, or welder_id)
  id: string;
  // Display name (area_name, system_name, test_package_name, or welder_name)
  name: string;
  // Welder stencil (only for welder dimension)
  stencil?: string;
  // Project ID for filtering
  projectId: string;

  // Budget metrics
  totalWelds: number;
  activeCount: number;
  acceptedCount: number;
  rejectedCount: number;

  // Milestone progress (0-100%)
  pctFitup: number;
  pctWeldComplete: number;
  pctAccepted: number;

  // NDE metrics
  ndeRequiredCount: number;
  ndePassCount: number;
  ndeFailCount: number;
  ndePendingCount: number;
  ndePassRate: number | null;

  // Repair metrics
  repairCount: number;
  repairRate: number;

  // Time metrics (in days)
  avgDaysToNDE: number | null;
  avgDaysToAcceptance: number | null;

  // Overall completion
  pctTotal: number;

  // Welder-specific metrics (only for welder dimension)
  firstPassAcceptanceCount?: number;
  firstPassAcceptanceRate?: number | null;
}

// Grand Total row for field weld reports
export interface FieldWeldGrandTotalRow {
  name: 'Grand Total';
  totalWelds: number;
  activeCount: number;
  acceptedCount: number;
  rejectedCount: number;
  pctFitup: number;
  pctWeldComplete: number;
  pctAccepted: number;
  ndeRequiredCount: number;
  ndePassCount: number;
  ndeFailCount: number;
  ndePendingCount: number;
  ndePassRate: number | null;
  repairCount: number;
  repairRate: number;
  avgDaysToNDE: number | null;
  avgDaysToAcceptance: number | null;
  pctTotal: number;
  // Welder-specific (only shown for welder dimension)
  firstPassAcceptanceCount?: number;
  firstPassAcceptanceRate?: number | null;
}

// Field weld report data structure
export interface FieldWeldReportData {
  dimension: FieldWeldGroupingDimension;
  rows: FieldWeldProgressRow[];
  grandTotal: FieldWeldGrandTotalRow;
  generatedAt: Date;
  projectId: string;
}

// Field weld dimension display labels
export const FIELD_WELD_DIMENSION_LABELS: Record<FieldWeldGroupingDimension, string> = {
  area: 'Area',
  system: 'System',
  test_package: 'Test Package',
  welder: 'Welder',
};

// Field weld report column configuration
export interface FieldWeldReportColumn {
  key: keyof FieldWeldProgressRow | keyof FieldWeldGrandTotalRow;
  label: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  format?: 'text' | 'number' | 'percentage' | 'decimal';
  hideOnMobile?: boolean; // Hide column on mobile (≤1024px)
}

// Standard field weld report columns
export const FIELD_WELD_REPORT_COLUMNS: FieldWeldReportColumn[] = [
  { key: 'name', label: 'Name', align: 'left', format: 'text' },
  { key: 'totalWelds', label: 'Total Welds', align: 'right', format: 'number' },
  { key: 'pctFitup', label: 'Fit-up', align: 'right', format: 'percentage', hideOnMobile: true },
  { key: 'pctWeldComplete', label: 'Weld Complete', align: 'right', format: 'percentage', hideOnMobile: true },
  { key: 'pctAccepted', label: 'Accepted', align: 'right', format: 'percentage' },
  { key: 'ndePassRate', label: 'NDE Pass Rate', align: 'right', format: 'percentage', hideOnMobile: true },
  { key: 'repairRate', label: 'Repair Rate', align: 'right', format: 'percentage', hideOnMobile: true },
  { key: 'pctTotal', label: '% Complete', align: 'right', format: 'percentage' },
] as const;

// Welder-specific columns (additional columns for welder dimension)
export const WELDER_PERFORMANCE_COLUMNS: FieldWeldReportColumn[] = [
  { key: 'firstPassAcceptanceRate', label: 'First Pass Rate', align: 'right', format: 'percentage' },
  { key: 'avgDaysToAcceptance', label: 'Avg Days to Accept', align: 'right', format: 'decimal', hideOnMobile: true },
] as const;
