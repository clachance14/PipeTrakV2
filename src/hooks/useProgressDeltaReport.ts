/**
 * TanStack Query hook for progress delta reports (Feature 033)
 * Fetches progress deltas (percentage point changes) over a specified date range
 * Grouped by area, system, or test package
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type {
  GroupingDimension,
  ReportDateRange,
  ProgressDeltaRow,
  ManhourDeltaRow,
  ProgressDeltaGrandTotal,
  ManhourDeltaGrandTotal,
  ProgressDeltaReportData,
} from '@/types/reports';

/**
 * Database row structure from get_progress_delta_by_dimension RPC
 */
interface ProgressDeltaRPCRow {
  dimension_id: string;
  dimension_name: string;
  components_with_activity: number;
  // Count-based delta columns (percentage points)
  delta_received: number;
  delta_installed: number;
  delta_punch: number;
  delta_tested: number;
  delta_restored: number;
  delta_total: number;
  // Total manhour budget
  mh_budget: number;
  // Category-specific budgets (for calculating category percentages)
  receive_mh_budget: number;
  install_mh_budget: number;
  punch_mh_budget: number;
  test_mh_budget: number;
  restore_mh_budget: number;
  // Delta earned columns
  delta_receive_mh_earned: number;
  delta_install_mh_earned: number;
  delta_punch_mh_earned: number;
  delta_test_mh_earned: number;
  delta_restore_mh_earned: number;
  delta_total_mh_earned: number;
  delta_mh_pct_complete: number;
}

/**
 * Converts DateRangePreset to actual start/end dates
 * Returns null for 'all_time' (no filter)
 */
export function resolveDateRange(dateRange: ReportDateRange): { start: Date; end: Date } | null {
  if (dateRange.preset === 'all_time') return null;

  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1); // Tomorrow midnight

  switch (dateRange.preset) {
    case 'last_7_days':
      return { start: subDays(end, 7), end };
    case 'last_30_days':
      return { start: subDays(end, 30), end };
    case 'last_90_days':
      return { start: subDays(end, 90), end };
    case 'ytd':
      return { start: new Date(now.getFullYear(), 0, 1), end };
    case 'custom':
      if (!dateRange.startDate || !dateRange.endDate) return null;
      return {
        start: new Date(dateRange.startDate),
        end: addDays(new Date(dateRange.endDate), 1) // Inclusive end
      };
  }
}

/**
 * Subtract days from date
 */
function subDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

/**
 * Add days to date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Transform database row to ProgressDeltaRow
 */
function transformProgressDeltaRow(row: ProgressDeltaRPCRow): ProgressDeltaRow {
  return {
    id: row.dimension_id,
    name: row.dimension_name,
    componentsWithActivity: row.components_with_activity,
    deltaReceived: row.delta_received,
    deltaInstalled: row.delta_installed,
    deltaPunch: row.delta_punch,
    deltaTested: row.delta_tested,
    deltaRestored: row.delta_restored,
    deltaTotal: row.delta_total,
  };
}

/**
 * Transform database row to ManhourDeltaRow
 */
function transformManhourDeltaRow(row: ProgressDeltaRPCRow): ManhourDeltaRow {
  return {
    id: row.dimension_id,
    name: row.dimension_name,
    componentsWithActivity: row.components_with_activity,
    mhBudget: row.mh_budget,
    // Category-specific budgets
    receiveMhBudget: row.receive_mh_budget,
    installMhBudget: row.install_mh_budget,
    punchMhBudget: row.punch_mh_budget,
    testMhBudget: row.test_mh_budget,
    restoreMhBudget: row.restore_mh_budget,
    // Delta earned values
    deltaReceiveMhEarned: row.delta_receive_mh_earned,
    deltaInstallMhEarned: row.delta_install_mh_earned,
    deltaPunchMhEarned: row.delta_punch_mh_earned,
    deltaTestMhEarned: row.delta_test_mh_earned,
    deltaRestoreMhEarned: row.delta_restore_mh_earned,
    deltaTotalMhEarned: row.delta_total_mh_earned,
    deltaMhPctComplete: row.delta_mh_pct_complete,
  };
}

/**
 * Calculate grand total for progress delta rows
 * Note: This function is no longer used for display - we use manhour grand total instead
 * Kept for backwards compatibility
 */
function calculateProgressDeltaGrandTotal(rows: ProgressDeltaRow[]): ProgressDeltaGrandTotal {
  const totalComponents = rows.reduce((sum, row) => sum + row.componentsWithActivity, 0);

  return {
    name: 'Grand Total',
    componentsWithActivity: totalComponents,
    deltaReceived: 0,
    deltaInstalled: 0,
    deltaPunch: 0,
    deltaTested: 0,
    deltaRestored: 0,
    deltaTotal: 0,
  };
}

/**
 * Calculate grand total for manhour delta rows
 * RPC returns delta_total_mh_earned as actual manhours (not percentages)
 * Grand total % = sum(delta_mh_earned) / sum(mh_budget) * 100
 */
function calculateManhourDeltaGrandTotal(rows: ManhourDeltaRow[]): ManhourDeltaGrandTotal {
  if (rows.length === 0) {
    return {
      name: 'Grand Total',
      componentsWithActivity: 0,
      mhBudget: 0,
      receiveMhBudget: 0,
      installMhBudget: 0,
      punchMhBudget: 0,
      testMhBudget: 0,
      restoreMhBudget: 0,
      deltaReceiveMhEarned: 0,
      deltaInstallMhEarned: 0,
      deltaPunchMhEarned: 0,
      deltaTestMhEarned: 0,
      deltaRestoreMhEarned: 0,
      deltaTotalMhEarned: 0,
      deltaMhPctComplete: 0,
    };
  }

  // Sum totals across all rows
  const totalMhBudget = rows.reduce((sum, row) => sum + row.mhBudget, 0);
  const totalComponentsWithActivity = rows.reduce((sum, row) => sum + row.componentsWithActivity, 0);

  // Sum category budgets
  const totalReceiveMhBudget = rows.reduce((sum, row) => sum + row.receiveMhBudget, 0);
  const totalInstallMhBudget = rows.reduce((sum, row) => sum + row.installMhBudget, 0);
  const totalPunchMhBudget = rows.reduce((sum, row) => sum + row.punchMhBudget, 0);
  const totalTestMhBudget = rows.reduce((sum, row) => sum + row.testMhBudget, 0);
  const totalRestoreMhBudget = rows.reduce((sum, row) => sum + row.restoreMhBudget, 0);

  // Sum per-milestone deltas
  const totalReceiveMhEarned = rows.reduce((sum, row) => sum + row.deltaReceiveMhEarned, 0);
  const totalInstallMhEarned = rows.reduce((sum, row) => sum + row.deltaInstallMhEarned, 0);
  const totalPunchMhEarned = rows.reduce((sum, row) => sum + row.deltaPunchMhEarned, 0);
  const totalTestMhEarned = rows.reduce((sum, row) => sum + row.deltaTestMhEarned, 0);
  const totalRestoreMhEarned = rows.reduce((sum, row) => sum + row.deltaRestoreMhEarned, 0);
  const totalDeltaMhEarned = rows.reduce((sum, row) => sum + row.deltaTotalMhEarned, 0);

  // Calculate grand total percentage
  const deltaMhPctComplete = totalMhBudget > 0
    ? (totalDeltaMhEarned / totalMhBudget) * 100
    : 0;

  return {
    name: 'Grand Total',
    componentsWithActivity: totalComponentsWithActivity,
    mhBudget: totalMhBudget,
    receiveMhBudget: totalReceiveMhBudget,
    installMhBudget: totalInstallMhBudget,
    punchMhBudget: totalPunchMhBudget,
    testMhBudget: totalTestMhBudget,
    restoreMhBudget: totalRestoreMhBudget,
    deltaReceiveMhEarned: totalReceiveMhEarned,
    deltaInstallMhEarned: totalInstallMhEarned,
    deltaPunchMhEarned: totalPunchMhEarned,
    deltaTestMhEarned: totalTestMhEarned,
    deltaRestoreMhEarned: totalRestoreMhEarned,
    deltaTotalMhEarned: totalDeltaMhEarned,
    deltaMhPctComplete,
  };
}

/**
 * Fetch progress delta report data grouped by specified dimension and date range
 * Returns ProgressDeltaReportData with count and manhour deltas
 */
export function useProgressDeltaReport(
  projectId: string | undefined,
  dimension: GroupingDimension,
  dateRange: ReportDateRange,
  enabled: boolean = true
): UseQueryResult<ProgressDeltaReportData, Error> {
  return useQuery({
    queryKey: ['progress-delta-report', projectId, dimension, dateRange],
    queryFn: async (): Promise<ProgressDeltaReportData> => {
      // Safe: query is disabled when projectId is undefined
      const safeProjectId = projectId!;

      const resolvedRange = resolveDateRange(dateRange);

      // Query is disabled for all_time, so resolvedRange should always exist
      if (!resolvedRange) {
        throw new Error('Date range is required for delta reports');
      }

      // Call RPC function
      const { data, error } = await supabase.rpc('get_progress_delta_by_dimension', {
        p_project_id: safeProjectId,
        p_dimension: dimension,
        p_start_date: resolvedRange.start.toISOString(),
        p_end_date: resolvedRange.end.toISOString(),
      });

      if (error) throw error;

      const allRows = (data || []) as ProgressDeltaRPCRow[];

      // Filter out rows with no activity
      const filteredRows = allRows.filter(
        (row) => row.components_with_activity > 0
      );

      // Transform to typed rows
      const progressRows = filteredRows.map(transformProgressDeltaRow);
      const manhourRows = filteredRows.map(transformManhourDeltaRow);

      // Calculate grand totals
      const grandTotal = calculateProgressDeltaGrandTotal(progressRows);
      const manhourGrandTotal = calculateManhourDeltaGrandTotal(manhourRows);

      return {
        dimension,
        rows: progressRows,
        manhourRows,
        grandTotal,
        manhourGrandTotal,
        dateRange,
        generatedAt: new Date(),
        projectId: safeProjectId,
      };
    },
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
    enabled: !!projectId && dateRange.preset !== 'all_time' && enabled,
  });
}
