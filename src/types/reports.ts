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

// Report view mode for toggling between count, manhour, and manhour percent views
export type ReportViewMode = 'count' | 'manhour' | 'manhour_percent';

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
 * MANHOUR PROGRESS REPORTS (Feature 032 - Manhour Earned Value)
 * ============================================================================
 */

// Manhour progress row data structure (matches vw_manhour_progress_by_* views)
export interface ManhourProgressRow {
  // Primary key (area_id, system_id, or test_package_id)
  id: string;
  // Display name (area_name, system_name, or test_package_name)
  name: string;
  // Project ID for filtering
  projectId: string;

  // Total manhour budget for this grouping
  mhBudget: number;

  // Receive milestone: MH Budget and Earned
  receiveMhBudget: number;
  receiveMhEarned: number;

  // Install milestone: MH Budget and Earned
  installMhBudget: number;
  installMhEarned: number;

  // Punch milestone: MH Budget and Earned
  punchMhBudget: number;
  punchMhEarned: number;

  // Test milestone: MH Budget and Earned
  testMhBudget: number;
  testMhEarned: number;

  // Restore milestone: MH Budget and Earned
  restoreMhBudget: number;
  restoreMhEarned: number;

  // Total earned manhours (sum of all milestones)
  totalMhEarned: number;

  // Overall manhour-weighted completion percentage
  mhPctComplete: number;
}

// Grand Total row for manhour reports (calculated from all rows)
export interface ManhourGrandTotalRow {
  name: 'Grand Total';
  mhBudget: number;
  receiveMhBudget: number;
  receiveMhEarned: number;
  installMhBudget: number;
  installMhEarned: number;
  punchMhBudget: number;
  punchMhEarned: number;
  testMhBudget: number;
  testMhEarned: number;
  restoreMhBudget: number;
  restoreMhEarned: number;
  totalMhEarned: number;
  mhPctComplete: number;
}

// Manhour report data structure
export interface ManhourReportData {
  dimension: GroupingDimension;
  rows: ManhourProgressRow[];
  grandTotal: ManhourGrandTotalRow;
  generatedAt: Date;
  projectId: string;
}

// Manhour report column configuration
export interface ManhourReportColumn {
  key: keyof ManhourProgressRow | keyof ManhourGrandTotalRow;
  label: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  format?: 'text' | 'number' | 'percentage' | 'manhour';
  hideOnMobile?: boolean;
}

// Standard manhour report columns
export const MANHOUR_REPORT_COLUMNS: ManhourReportColumn[] = [
  { key: 'name', label: 'Name', align: 'left', format: 'text' },
  { key: 'mhBudget', label: 'MH Budget', align: 'right', format: 'manhour' },
  { key: 'receiveMhEarned', label: 'Receive', align: 'right', format: 'manhour', hideOnMobile: true },
  { key: 'installMhEarned', label: 'Install', align: 'right', format: 'manhour', hideOnMobile: true },
  { key: 'punchMhEarned', label: 'Punch', align: 'right', format: 'manhour', hideOnMobile: true },
  { key: 'testMhEarned', label: 'Test', align: 'right', format: 'manhour', hideOnMobile: true },
  { key: 'restoreMhEarned', label: 'Restore', align: 'right', format: 'manhour', hideOnMobile: true },
  { key: 'totalMhEarned', label: 'Total Earned', align: 'right', format: 'manhour' },
  { key: 'mhPctComplete', label: '% Complete', align: 'right', format: 'percentage' },
] as const;

/**
 * ============================================================================
 * FIELD WELD PROGRESS REPORTS (Weekly Field Weld Reports Feature)
 * ============================================================================
 */

// Grouping dimension for field weld reports (includes 'welder' and 'overall')
export type FieldWeldGroupingDimension = 'area' | 'system' | 'test_package' | 'welder' | 'overall';

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

  // NEW: Milestone counts (added alongside percentages)
  fitupCount: number;
  weldCompleteCount: number;

  // Welder-specific metrics (only for welder dimension)
  firstPassAcceptanceCount?: number;
  firstPassAcceptanceRate?: number | null;

  // X-Ray tier metrics (only for welder dimension)
  xray5pctCount?: number;
  xray10pctCount?: number;
  xray100pctCount?: number;
  xrayOtherCount?: number;
  xray5pctPassRate?: number | null;
  xray10pctPassRate?: number | null;
  xray100pctPassRate?: number | null;
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
  // NEW: Milestone counts (added alongside percentages)
  fitupCount: number;
  weldCompleteCount: number;
  // Welder-specific (only shown for welder dimension)
  firstPassAcceptanceCount?: number;
  firstPassAcceptanceRate?: number | null;
  // X-Ray tier metrics (only for welder dimension)
  xray5pctCount?: number;
  xray10pctCount?: number;
  xray100pctCount?: number;
  xrayOtherCount?: number;
  xray5pctPassRate?: number | null;
  xray10pctPassRate?: number | null;
  xray100pctPassRate?: number | null;
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
  overall: 'Overall',
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
  { key: 'fitupCount', label: 'Fit-up', align: 'right', format: 'number', hideOnMobile: true },
  { key: 'weldCompleteCount', label: 'Weld Complete', align: 'right', format: 'number', hideOnMobile: true },
  { key: 'acceptedCount', label: 'Accepted', align: 'right', format: 'number' },
  { key: 'ndePassRate', label: 'NDE Pass Rate', align: 'right', format: 'percentage', hideOnMobile: true },
  { key: 'repairRate', label: 'Repair Rate', align: 'right', format: 'percentage', hideOnMobile: true },
  { key: 'pctTotal', label: '% Complete', align: 'right', format: 'percentage' },
] as const;

// Welder-specific columns (additional columns for welder dimension)
export const WELDER_PERFORMANCE_COLUMNS: FieldWeldReportColumn[] = [
  { key: 'firstPassAcceptanceRate', label: 'First Pass Rate', align: 'right', format: 'percentage' },
  { key: 'avgDaysToAcceptance', label: 'Avg Days to Accept', align: 'right', format: 'decimal', hideOnMobile: true },
] as const;

// X-Ray tier columns (additional columns for welder dimension)
export const XRAY_TIER_COLUMNS: FieldWeldReportColumn[] = [
  { key: 'xray5pctCount', label: '5% X-Ray Count', align: 'right', format: 'number', hideOnMobile: true },
  { key: 'xray10pctCount', label: '10% X-Ray Count', align: 'right', format: 'number', hideOnMobile: true },
  { key: 'xray100pctCount', label: '100% X-Ray Count', align: 'right', format: 'number', hideOnMobile: true },
  { key: 'xray5pctPassRate', label: '5% Pass Rate', align: 'right', format: 'percentage', hideOnMobile: true },
  { key: 'xray10pctPassRate', label: '10% Pass Rate', align: 'right', format: 'percentage', hideOnMobile: true },
  { key: 'xray100pctPassRate', label: '100% Pass Rate', align: 'right', format: 'percentage', hideOnMobile: true },
] as const;

/**
 * ============================================================================
 * DATE RANGE FILTER TYPES (Feature 033 - Timeline Report Filter)
 * ============================================================================
 */

// Re-export DateRangePreset from weldSummary.ts for convenience
export type { DateRangePreset } from './weldSummary';

// Import for local use
import type { DateRangePreset } from './weldSummary';

// Report date range state (includes preset and custom dates)
export interface ReportDateRange {
  preset: DateRangePreset;
  startDate: string | null;  // ISO 8601 (YYYY-MM-DD)
  endDate: string | null;    // ISO 8601 (YYYY-MM-DD)
}

// Default date range state
export const DEFAULT_DATE_RANGE: ReportDateRange = {
  preset: 'all_time',
  startDate: null,
  endDate: null,
};

// UI labels for date range presets
export const DATE_RANGE_PRESET_LABELS: Record<DateRangePreset, string> = {
  all_time: 'All Time',
  last_7_days: 'Last 7 Days',
  last_30_days: 'Last 30 Days',
  last_90_days: 'Last 90 Days',
  ytd: 'Year to Date',
  custom: 'Custom Range',
};

/**
 * ============================================================================
 * COMPONENT PROGRESS DELTA REPORTS (Feature 033 - Timeline Report Filter)
 * ============================================================================
 */

// Progress delta row data structure (count-based percentage deltas)
export interface ProgressDeltaRow {
  id: string;
  name: string;
  componentsWithActivity: number;
  deltaReceived: number;    // percentage points
  deltaInstalled: number;
  deltaPunch: number;
  deltaTested: number;
  deltaRestored: number;
  deltaTotal: number;       // weighted total
}

// Manhour delta row data structure
export interface ManhourDeltaRow {
  id: string;
  name: string;
  componentsWithActivity: number;
  mhBudget: number;
  // Category-specific budgets (for calculating category percentages)
  receiveMhBudget: number;
  installMhBudget: number;
  punchMhBudget: number;
  testMhBudget: number;
  restoreMhBudget: number;
  // Delta earned values
  deltaReceiveMhEarned: number;
  deltaInstallMhEarned: number;
  deltaPunchMhEarned: number;
  deltaTestMhEarned: number;
  deltaRestoreMhEarned: number;
  deltaTotalMhEarned: number;
  deltaMhPctComplete: number;
}

// Grand total for progress delta (count-based)
export interface ProgressDeltaGrandTotal {
  name: 'Grand Total';
  componentsWithActivity: number;
  deltaReceived: number;
  deltaInstalled: number;
  deltaPunch: number;
  deltaTested: number;
  deltaRestored: number;
  deltaTotal: number;
}

// Grand total for manhour delta
export interface ManhourDeltaGrandTotal {
  name: 'Grand Total';
  componentsWithActivity: number;
  mhBudget: number;
  // Category-specific budgets (for calculating category percentages)
  receiveMhBudget: number;
  installMhBudget: number;
  punchMhBudget: number;
  testMhBudget: number;
  restoreMhBudget: number;
  // Delta earned values
  deltaReceiveMhEarned: number;
  deltaInstallMhEarned: number;
  deltaPunchMhEarned: number;
  deltaTestMhEarned: number;
  deltaRestoreMhEarned: number;
  deltaTotalMhEarned: number;
  deltaMhPctComplete: number;
}

// Complete progress delta report data
export interface ProgressDeltaReportData {
  dimension: GroupingDimension;
  rows: ProgressDeltaRow[];
  manhourRows: ManhourDeltaRow[];
  grandTotal: ProgressDeltaGrandTotal;
  manhourGrandTotal: ManhourDeltaGrandTotal;
  dateRange: ReportDateRange;
  generatedAt: Date;
  projectId: string;
}

/**
 * ============================================================================
 * FIELD WELD DELTA REPORTS (Feature 033 - Timeline Report Filter)
 * ============================================================================
 */

// Field weld delta row data structure
export interface FieldWeldDeltaRow {
  id: string;
  name: string;
  stencil?: string;         // welder stencil (welder dimension only)
  weldsWithActivity: number;
  deltaFitupCount: number;
  deltaWeldCompleteCount: number;
  deltaAcceptedCount: number;
  deltaPctTotal: number;
}

// Grand total for field weld delta
export interface FieldWeldDeltaGrandTotal {
  name: 'Grand Total';
  weldsWithActivity: number;
  deltaFitupCount: number;
  deltaWeldCompleteCount: number;
  deltaAcceptedCount: number;
  deltaPctTotal: number;
}

// Complete field weld delta report data
export interface FieldWeldDeltaReportData {
  dimension: FieldWeldGroupingDimension;
  rows: FieldWeldDeltaRow[];
  grandTotal: FieldWeldDeltaGrandTotal;
  dateRange: ReportDateRange;
  generatedAt: Date;
  projectId: string;
}
