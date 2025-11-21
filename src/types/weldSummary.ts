/**
 * TypeScript interfaces for Dynamic Weld Summary Report (By Welder)
 *
 * This file defines types for:
 * - RPC function parameters (get_weld_summary_by_welder)
 * - RPC function return structure (tier-grouped metrics)
 * - UI filter state
 * - Export formats
 */

// ============================================================================
// RPC Function Types
// ============================================================================

/**
 * Parameters for get_weld_summary_by_welder RPC function
 */
export interface WelderSummaryParams {
  p_project_id: string; // Required
  p_start_date?: string | null; // Optional: YYYY-MM-DD format
  p_end_date?: string | null; // Optional: YYYY-MM-DD format
  p_welder_ids?: string[] | null; // Optional: Array of welder UUIDs
  p_area_ids?: string[] | null; // Optional: Array of area UUIDs
  p_system_ids?: string[] | null; // Optional: Array of system UUIDs
  p_package_ids?: string[] | null; // Optional: Array of test package UUIDs
}

/**
 * Single welder row returned by get_weld_summary_by_welder RPC
 * Matches the tier-grouped format from the report screenshot
 */
export interface WelderSummaryRow {
  // Welder identification
  welder_id: string;
  welder_stencil: string;
  welder_name: string;

  // 5% X-Ray Tier
  welds_5pct: number; // Total completed welds with 5% xray
  nde_5pct: number; // Number of 5% welds with NDE performed
  reject_5pct: number; // Number of 5% welds rejected

  // 10% X-Ray Tier
  welds_10pct: number;
  nde_10pct: number;
  reject_10pct: number;

  // 100% X-Ray Tier
  welds_100pct: number;
  nde_100pct: number;
  reject_100pct: number;

  // Overall Totals (across all tiers)
  welds_total: number;
  nde_total: number;
  reject_total: number;

  // Calculated Metrics
  reject_rate: number; // Percentage (reject_total / nde_total * 100)
  nde_comp_5pct: number | null; // NDE completion % for 5% tier (nde_5pct / welds_5pct * 100)
  nde_comp_10pct: number | null; // NDE completion % for 10% tier
  nde_comp_100pct: number | null; // NDE completion % for 100% tier
}

/**
 * Totals row (calculated from all welder rows)
 */
export interface WelderSummaryTotals {
  // 5% X-Ray Tier Totals
  welds_5pct: number;
  nde_5pct: number;
  reject_5pct: number;

  // 10% X-Ray Tier Totals
  welds_10pct: number;
  nde_10pct: number;
  reject_10pct: number;

  // 100% X-Ray Tier Totals
  welds_100pct: number;
  nde_100pct: number;
  reject_100pct: number;

  // Overall Totals
  welds_total: number;
  nde_total: number;
  reject_total: number;

  // Calculated Metrics (for totals row)
  reject_rate: number; // Overall rejection rate
  nde_comp_5pct: number | null; // Overall 5% NDE completion %
  nde_comp_10pct: number | null; // Overall 10% NDE completion %
  nde_comp_100pct: number | null; // Overall 100% NDE completion %
}

/**
 * Complete weld summary report data structure
 */
export interface WelderSummaryReport {
  rows: WelderSummaryRow[];
  totals: WelderSummaryTotals;
  generatedAt: Date;
  filters: WelderSummaryParams;
}

// ============================================================================
// UI Filter State Types
// ============================================================================

/**
 * Date range preset options
 */
export type DateRangePreset =
  | 'all_time'
  | 'last_7_days'
  | 'last_30_days'
  | 'last_90_days'
  | 'ytd'
  | 'custom';

/**
 * Filter state for weld summary report UI
 */
export interface WelderSummaryFilters {
  // Date range
  dateRangePreset: DateRangePreset;
  startDate: string | null; // YYYY-MM-DD format
  endDate: string | null; // YYYY-MM-DD format

  // Entity filters (multi-select)
  welderIds: string[]; // Empty array = all welders
  areaIds: string[]; // Empty array = all areas
  systemIds: string[]; // Empty array = all systems
  packageIds: string[]; // Empty array = all packages
}

/**
 * Initial/default filter state
 */
export const DEFAULT_WELDER_SUMMARY_FILTERS: WelderSummaryFilters = {
  dateRangePreset: 'all_time',
  startDate: null,
  endDate: null,
  welderIds: [],
  areaIds: [],
  systemIds: [],
  packageIds: [],
};

// ============================================================================
// Export Types
// ============================================================================

/**
 * Export format options for weld summary report
 */
export type WelderSummaryExportFormat = 'pdf' | 'excel' | 'csv';

/**
 * Export options for weld summary report
 */
export interface WelderSummaryExportOptions {
  format: WelderSummaryExportFormat;
  filename: string;
  reportData: WelderSummaryReport;
  projectName: string;
  companyLogo?: string; // Base64 encoded image for PDF header
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate totals from array of welder rows
 */
export function calculateWelderSummaryTotals(
  rows: WelderSummaryRow[]
): WelderSummaryTotals {
  const totals = rows.reduce(
    (acc, row) => ({
      welds_5pct: acc.welds_5pct + row.welds_5pct,
      nde_5pct: acc.nde_5pct + row.nde_5pct,
      reject_5pct: acc.reject_5pct + row.reject_5pct,
      welds_10pct: acc.welds_10pct + row.welds_10pct,
      nde_10pct: acc.nde_10pct + row.nde_10pct,
      reject_10pct: acc.reject_10pct + row.reject_10pct,
      welds_100pct: acc.welds_100pct + row.welds_100pct,
      nde_100pct: acc.nde_100pct + row.nde_100pct,
      reject_100pct: acc.reject_100pct + row.reject_100pct,
      welds_total: acc.welds_total + row.welds_total,
      nde_total: acc.nde_total + row.nde_total,
      reject_total: acc.reject_total + row.reject_total,
    }),
    {
      welds_5pct: 0,
      nde_5pct: 0,
      reject_5pct: 0,
      welds_10pct: 0,
      nde_10pct: 0,
      reject_10pct: 0,
      welds_100pct: 0,
      nde_100pct: 0,
      reject_100pct: 0,
      welds_total: 0,
      nde_total: 0,
      reject_total: 0,
    }
  );

  return {
    ...totals,
    // Calculate overall metrics
    reject_rate: totals.nde_total > 0 ? (totals.reject_total / totals.nde_total) * 100 : 0,
    nde_comp_5pct:
      totals.welds_5pct > 0 ? (totals.nde_5pct / totals.welds_5pct) * 100 : null,
    nde_comp_10pct:
      totals.welds_10pct > 0 ? (totals.nde_10pct / totals.welds_10pct) * 100 : null,
    nde_comp_100pct:
      totals.welds_100pct > 0 ? (totals.nde_100pct / totals.welds_100pct) * 100 : null,
  };
}
