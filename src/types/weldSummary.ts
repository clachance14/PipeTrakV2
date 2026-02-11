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
 * Matches the tier-grouped format with separate BW and SW sections
 */
export interface WelderSummaryRow {
  // Welder identification
  welder_id: string;
  welder_stencil: string;
  welder_name: string;

  // Butt Weld (BW) 5% Tier
  bw_welds_5pct: number; // Total completed BW with 5% xray
  bw_nde_5pct: number; // Number of 5% BW with RT performed
  bw_reject_5pct: number; // Number of 5% BW rejected

  // Butt Weld (BW) 10% Tier
  bw_welds_10pct: number;
  bw_nde_10pct: number;
  bw_reject_10pct: number;

  // Butt Weld (BW) 100% Tier
  bw_welds_100pct: number;
  bw_nde_100pct: number;
  bw_reject_100pct: number;

  // Butt Weld (BW) Calculated Metrics
  bw_reject_rate: number; // BW rejection rate (bw_reject_total / bw_nde_total * 100)
  bw_nde_comp_5pct: number | null; // BW 5% NDE completion %
  bw_nde_comp_10pct: number | null; // BW 10% NDE completion %
  bw_nde_comp_100pct: number | null; // BW 100% NDE completion %

  // Socket Weld (SW) 5% Tier
  sw_welds_5pct: number; // Total completed SW with 5% xray
  sw_nde_5pct: number; // Number of 5% SW with RT performed
  sw_reject_5pct: number; // Number of 5% SW rejected

  // Socket Weld (SW) 10% Tier
  sw_welds_10pct: number;
  sw_nde_10pct: number;
  sw_reject_10pct: number;

  // Socket Weld (SW) 100% Tier
  sw_welds_100pct: number;
  sw_nde_100pct: number;
  sw_reject_100pct: number;

  // Socket Weld (SW) Calculated Metrics
  sw_reject_rate: number; // SW rejection rate (sw_reject_total / sw_nde_total * 100)
  sw_nde_comp_5pct: number | null; // SW 5% NDE completion %
  sw_nde_comp_10pct: number | null; // SW 10% NDE completion %
  sw_nde_comp_100pct: number | null; // SW 100% NDE completion %

  // Overall Totals (BW + SW combined)
  welds_total: number;
  nde_total: number;
  reject_total: number;
  reject_rate: number; // Overall rejection rate
}

/**
 * Totals row (calculated from all welder rows)
 * Includes separate BW and SW totals plus grand total
 */
export interface WelderSummaryTotals {
  // Butt Weld (BW) 5% Tier Totals
  bw_welds_5pct: number;
  bw_nde_5pct: number;
  bw_reject_5pct: number;

  // Butt Weld (BW) 10% Tier Totals
  bw_welds_10pct: number;
  bw_nde_10pct: number;
  bw_reject_10pct: number;

  // Butt Weld (BW) 100% Tier Totals
  bw_welds_100pct: number;
  bw_nde_100pct: number;
  bw_reject_100pct: number;

  // Butt Weld (BW) Calculated Metrics
  bw_reject_rate: number; // BW rejection rate
  bw_nde_comp_5pct: number | null; // BW 5% NDE completion %
  bw_nde_comp_10pct: number | null; // BW 10% NDE completion %
  bw_nde_comp_100pct: number | null; // BW 100% NDE completion %

  // Socket Weld (SW) 5% Tier Totals
  sw_welds_5pct: number;
  sw_nde_5pct: number;
  sw_reject_5pct: number;

  // Socket Weld (SW) 10% Tier Totals
  sw_welds_10pct: number;
  sw_nde_10pct: number;
  sw_reject_10pct: number;

  // Socket Weld (SW) 100% Tier Totals
  sw_welds_100pct: number;
  sw_nde_100pct: number;
  sw_reject_100pct: number;

  // Socket Weld (SW) Calculated Metrics
  sw_reject_rate: number; // SW rejection rate
  sw_nde_comp_5pct: number | null; // SW 5% NDE completion %
  sw_nde_comp_10pct: number | null; // SW 10% NDE completion %
  sw_nde_comp_100pct: number | null; // SW 100% NDE completion %

  // Overall Totals (BW + SW combined)
  welds_total: number;
  nde_total: number;
  reject_total: number;
  reject_rate: number; // Overall rejection rate
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
 * Sums BW and SW fields separately, then combines for grand total
 */
export function calculateWelderSummaryTotals(
  rows: WelderSummaryRow[]
): WelderSummaryTotals {
  const totals = rows.reduce(
    (acc, row) => ({
      // Butt Weld (BW) Tier Totals
      bw_welds_5pct: acc.bw_welds_5pct + row.bw_welds_5pct,
      bw_nde_5pct: acc.bw_nde_5pct + row.bw_nde_5pct,
      bw_reject_5pct: acc.bw_reject_5pct + row.bw_reject_5pct,
      bw_welds_10pct: acc.bw_welds_10pct + row.bw_welds_10pct,
      bw_nde_10pct: acc.bw_nde_10pct + row.bw_nde_10pct,
      bw_reject_10pct: acc.bw_reject_10pct + row.bw_reject_10pct,
      bw_welds_100pct: acc.bw_welds_100pct + row.bw_welds_100pct,
      bw_nde_100pct: acc.bw_nde_100pct + row.bw_nde_100pct,
      bw_reject_100pct: acc.bw_reject_100pct + row.bw_reject_100pct,

      // Socket Weld (SW) Tier Totals
      sw_welds_5pct: acc.sw_welds_5pct + row.sw_welds_5pct,
      sw_nde_5pct: acc.sw_nde_5pct + row.sw_nde_5pct,
      sw_reject_5pct: acc.sw_reject_5pct + row.sw_reject_5pct,
      sw_welds_10pct: acc.sw_welds_10pct + row.sw_welds_10pct,
      sw_nde_10pct: acc.sw_nde_10pct + row.sw_nde_10pct,
      sw_reject_10pct: acc.sw_reject_10pct + row.sw_reject_10pct,
      sw_welds_100pct: acc.sw_welds_100pct + row.sw_welds_100pct,
      sw_nde_100pct: acc.sw_nde_100pct + row.sw_nde_100pct,
      sw_reject_100pct: acc.sw_reject_100pct + row.sw_reject_100pct,

      // Overall Totals (BW + SW)
      welds_total: acc.welds_total + row.welds_total,
      nde_total: acc.nde_total + row.nde_total,
      reject_total: acc.reject_total + row.reject_total,
    }),
    {
      // Initialize all fields to 0
      bw_welds_5pct: 0,
      bw_nde_5pct: 0,
      bw_reject_5pct: 0,
      bw_welds_10pct: 0,
      bw_nde_10pct: 0,
      bw_reject_10pct: 0,
      bw_welds_100pct: 0,
      bw_nde_100pct: 0,
      bw_reject_100pct: 0,
      sw_welds_5pct: 0,
      sw_nde_5pct: 0,
      sw_reject_5pct: 0,
      sw_welds_10pct: 0,
      sw_nde_10pct: 0,
      sw_reject_10pct: 0,
      sw_welds_100pct: 0,
      sw_nde_100pct: 0,
      sw_reject_100pct: 0,
      welds_total: 0,
      nde_total: 0,
      reject_total: 0,
    }
  );

  // Calculate BW tier metrics
  const bw_total_welds = totals.bw_welds_5pct + totals.bw_welds_10pct + totals.bw_welds_100pct;
  const bw_total_reject = totals.bw_reject_5pct + totals.bw_reject_10pct + totals.bw_reject_100pct;

  // Calculate SW tier metrics
  const sw_total_welds = totals.sw_welds_5pct + totals.sw_welds_10pct + totals.sw_welds_100pct;
  const sw_total_reject = totals.sw_reject_5pct + totals.sw_reject_10pct + totals.sw_reject_100pct;

  return {
    ...totals,

    // Butt Weld (BW) Calculated Metrics
    bw_reject_rate: bw_total_welds > 0 ? (bw_total_reject / bw_total_welds) * 100 : 0,
    bw_nde_comp_5pct:
      totals.bw_welds_5pct > 0 ? (totals.bw_nde_5pct / totals.bw_welds_5pct) * 100 : null,
    bw_nde_comp_10pct:
      totals.bw_welds_10pct > 0 ? (totals.bw_nde_10pct / totals.bw_welds_10pct) * 100 : null,
    bw_nde_comp_100pct:
      totals.bw_welds_100pct > 0 ? (totals.bw_nde_100pct / totals.bw_welds_100pct) * 100 : null,

    // Socket Weld (SW) Calculated Metrics
    sw_reject_rate: sw_total_welds > 0 ? (sw_total_reject / sw_total_welds) * 100 : 0,
    sw_nde_comp_5pct:
      totals.sw_welds_5pct > 0 ? (totals.sw_nde_5pct / totals.sw_welds_5pct) * 100 : null,
    sw_nde_comp_10pct:
      totals.sw_welds_10pct > 0 ? (totals.sw_nde_10pct / totals.sw_welds_10pct) * 100 : null,
    sw_nde_comp_100pct:
      totals.sw_welds_100pct > 0 ? (totals.sw_nde_100pct / totals.sw_welds_100pct) * 100 : null,

    // Overall Calculated Metrics (BW + SW combined)
    reject_rate: totals.welds_total > 0 ? (totals.reject_total / totals.welds_total) * 100 : 0,
  };
}
