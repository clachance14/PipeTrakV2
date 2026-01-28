/**
 * TanStack Query hook for field weld progress reports
 * Fetches aggregated field weld progress data grouped by area, system, test package, or welder
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';
import type {
  FieldWeldGroupingDimension,
  FieldWeldProgressRow,
  FieldWeldReportData,
  FieldWeldGrandTotalRow,
} from '@/types/reports';

// View row types from database
type AreaProgressRow = Database['public']['Views']['vw_field_weld_progress_by_area']['Row'];
type SystemProgressRow = Database['public']['Views']['vw_field_weld_progress_by_system']['Row'];
type TestPackageProgressRow = Database['public']['Views']['vw_field_weld_progress_by_test_package']['Row'];
type WelderProgressRow = Database['public']['Views']['vw_field_weld_progress_by_welder']['Row'];

/**
 * Calculate grand total row from field weld progress rows
 * Sum for counts, weighted average for percentages
 */
function calculateFieldWeldGrandTotal(
  rows: FieldWeldProgressRow[],
  dimension: FieldWeldGroupingDimension
): FieldWeldGrandTotalRow {
  if (rows.length === 0) {
    return {
      name: 'Grand Total',
      totalWelds: 0,
      activeCount: 0,
      acceptedCount: 0,
      rejectedCount: 0,
      pctFitup: 0,
      pctWeldComplete: 0,
      pctAccepted: 0,
      ndeRequiredCount: 0,
      ndePassCount: 0,
      ndeFailCount: 0,
      ndePendingCount: 0,
      ndePassRate: null,
      repairCount: 0,
      repairRate: 0,
      avgDaysToNDE: null,
      avgDaysToAcceptance: null,
      pctTotal: 0,
      fitupCount: 0,
      weldCompleteCount: 0,
      remainingCount: 0,
    };
  }

  // Sum all counts
  const totalWelds = rows.reduce((sum, row) => sum + row.totalWelds, 0);
  const activeCount = rows.reduce((sum, row) => sum + row.activeCount, 0);
  const acceptedCount = rows.reduce((sum, row) => sum + row.acceptedCount, 0);
  const rejectedCount = rows.reduce((sum, row) => sum + row.rejectedCount, 0);
  const ndeRequiredCount = rows.reduce((sum, row) => sum + row.ndeRequiredCount, 0);
  const ndePassCount = rows.reduce((sum, row) => sum + row.ndePassCount, 0);
  const ndeFailCount = rows.reduce((sum, row) => sum + row.ndeFailCount, 0);
  const ndePendingCount = rows.reduce((sum, row) => sum + row.ndePendingCount, 0);
  const repairCount = rows.reduce((sum, row) => sum + row.repairCount, 0);
  const fitupCount = rows.reduce((sum, row) => sum + row.fitupCount, 0);
  const weldCompleteCount = rows.reduce((sum, row) => sum + row.weldCompleteCount, 0);
  const remainingCount = totalWelds - weldCompleteCount;

  // Calculate weighted averages for percentages (weight by totalWelds)
  const weightedAvgPercentage = (
    field: keyof Pick<FieldWeldProgressRow, 'pctFitup' | 'pctWeldComplete' | 'pctAccepted' | 'pctTotal'>
  ) => {
    if (totalWelds === 0) return 0;
    return rows.reduce((sum, row) => sum + row[field] * row.totalWelds, 0) / totalWelds;
  };

  // Calculate weighted average for time metrics (weight by count of welds with data)
  const weightedAvgTime = (field: 'avgDaysToNDE' | 'avgDaysToAcceptance') => {
    const rowsWithData = rows.filter((row) => row[field] !== null);
    if (rowsWithData.length === 0) return null;

    const totalWeldsWithData = rowsWithData.reduce((sum, row) => sum + row.totalWelds, 0);
    if (totalWeldsWithData === 0) return null;

    return (
      rowsWithData.reduce((sum, row) => sum + (row[field] || 0) * row.totalWelds, 0) / totalWeldsWithData
    );
  };

  // Calculate overall NDE pass rate
  const ndeCompleteCount = ndePassCount + ndeFailCount;
  const ndePassRate = ndeCompleteCount > 0 ? (ndePassCount / ndeCompleteCount) * 100 : null;

  // Calculate overall repair rate
  const repairRate = totalWelds > 0 ? (repairCount / totalWelds) * 100 : 0;

  const grandTotal: FieldWeldGrandTotalRow = {
    name: 'Grand Total',
    totalWelds,
    activeCount,
    acceptedCount,
    rejectedCount,
    pctFitup: Math.round(weightedAvgPercentage('pctFitup')),
    pctWeldComplete: Math.round(weightedAvgPercentage('pctWeldComplete')),
    pctAccepted: Math.round(weightedAvgPercentage('pctAccepted')),
    ndeRequiredCount,
    ndePassCount,
    ndeFailCount,
    ndePendingCount,
    ndePassRate: ndePassRate !== null ? Math.round(ndePassRate) : null,
    repairCount,
    repairRate: Math.round(repairRate),
    avgDaysToNDE: weightedAvgTime('avgDaysToNDE'),
    avgDaysToAcceptance: weightedAvgTime('avgDaysToAcceptance'),
    pctTotal: Math.round(weightedAvgPercentage('pctTotal')),
    fitupCount,
    weldCompleteCount,
    remainingCount,
  };

  // Add welder-specific metrics if dimension is 'welder'
  if (dimension === 'welder') {
    const firstPassAcceptanceCount = rows.reduce(
      (sum, row) => sum + (row.firstPassAcceptanceCount || 0),
      0
    );
    const totalNonRepairWelds = rows.reduce(
      (sum, row) => sum + (row.totalWelds - row.repairCount),
      0
    );
    const firstPassAcceptanceRate =
      totalNonRepairWelds > 0 ? (firstPassAcceptanceCount / totalNonRepairWelds) * 100 : null;

    grandTotal.firstPassAcceptanceCount = firstPassAcceptanceCount;
    grandTotal.firstPassAcceptanceRate =
      firstPassAcceptanceRate !== null ? Math.round(firstPassAcceptanceRate) : null;
  }

  return grandTotal;
}

/**
 * Transform area view row to FieldWeldProgressRow
 */
function transformAreaRow(row: AreaProgressRow): FieldWeldProgressRow {
  return {
    id: row.area_id || '',
    name: row.area_name || '',
    projectId: row.project_id || '',
    totalWelds: row.total_welds || 0,
    activeCount: row.active_count || 0,
    acceptedCount: row.accepted_count || 0,
    rejectedCount: row.rejected_count || 0,
    pctFitup: row.pct_fitup || 0,
    pctWeldComplete: row.pct_weld_complete || 0,
    pctAccepted: row.pct_accepted || 0,
    ndeRequiredCount: row.nde_required_count || 0,
    ndePassCount: row.nde_pass_count || 0,
    ndeFailCount: row.nde_fail_count || 0,
    ndePendingCount: row.nde_pending_count || 0,
    ndePassRate: row.nde_pass_rate,
    repairCount: row.repair_count || 0,
    repairRate: row.repair_rate || 0,
    avgDaysToNDE: row.avg_days_to_nde,
    avgDaysToAcceptance: row.avg_days_to_acceptance,
    pctTotal: row.pct_total || 0,
    fitupCount: row.fitup_count || 0,
    weldCompleteCount: row.weld_complete_count || 0,
    remainingCount: (row.total_welds || 0) - (row.weld_complete_count || 0),
  };
}

/**
 * Transform system view row to FieldWeldProgressRow
 */
function transformSystemRow(row: SystemProgressRow): FieldWeldProgressRow {
  return {
    id: row.system_id || '',
    name: row.system_name || '',
    projectId: row.project_id || '',
    totalWelds: row.total_welds || 0,
    activeCount: row.active_count || 0,
    acceptedCount: row.accepted_count || 0,
    rejectedCount: row.rejected_count || 0,
    pctFitup: row.pct_fitup || 0,
    pctWeldComplete: row.pct_weld_complete || 0,
    pctAccepted: row.pct_accepted || 0,
    ndeRequiredCount: row.nde_required_count || 0,
    ndePassCount: row.nde_pass_count || 0,
    ndeFailCount: row.nde_fail_count || 0,
    ndePendingCount: row.nde_pending_count || 0,
    ndePassRate: row.nde_pass_rate,
    repairCount: row.repair_count || 0,
    repairRate: row.repair_rate || 0,
    avgDaysToNDE: row.avg_days_to_nde,
    avgDaysToAcceptance: row.avg_days_to_acceptance,
    pctTotal: row.pct_total || 0,
    fitupCount: row.fitup_count || 0,
    weldCompleteCount: row.weld_complete_count || 0,
    remainingCount: (row.total_welds || 0) - (row.weld_complete_count || 0),
  };
}

/**
 * Transform test package view row to FieldWeldProgressRow
 */
function transformTestPackageRow(row: TestPackageProgressRow): FieldWeldProgressRow {
  return {
    id: row.test_package_id || '',
    name: row.test_package_name || '',
    projectId: row.project_id || '',
    totalWelds: row.total_welds || 0,
    activeCount: row.active_count || 0,
    acceptedCount: row.accepted_count || 0,
    rejectedCount: row.rejected_count || 0,
    pctFitup: row.pct_fitup || 0,
    pctWeldComplete: row.pct_weld_complete || 0,
    pctAccepted: row.pct_accepted || 0,
    ndeRequiredCount: row.nde_required_count || 0,
    ndePassCount: row.nde_pass_count || 0,
    ndeFailCount: row.nde_fail_count || 0,
    ndePendingCount: row.nde_pending_count || 0,
    ndePassRate: row.nde_pass_rate,
    repairCount: row.repair_count || 0,
    repairRate: row.repair_rate || 0,
    avgDaysToNDE: row.avg_days_to_nde,
    avgDaysToAcceptance: row.avg_days_to_acceptance,
    pctTotal: row.pct_total || 0,
    fitupCount: row.fitup_count || 0,
    weldCompleteCount: row.weld_complete_count || 0,
    remainingCount: (row.total_welds || 0) - (row.weld_complete_count || 0),
  };
}

/**
 * Transform welder view row to FieldWeldProgressRow
 */
function transformWelderRow(row: WelderProgressRow): FieldWeldProgressRow {
  return {
    id: row.welder_id || '',
    name: row.welder_name || '',
    stencil: row.welder_stencil || undefined,
    projectId: row.project_id || '',
    totalWelds: row.total_welds || 0,
    activeCount: row.active_count || 0,
    acceptedCount: row.accepted_count || 0,
    rejectedCount: row.rejected_count || 0,
    pctFitup: row.pct_fitup || 0,
    pctWeldComplete: row.pct_weld_complete || 0,
    pctAccepted: row.pct_accepted || 0,
    ndeRequiredCount: row.nde_required_count || 0,
    ndePassCount: row.nde_pass_count || 0,
    ndeFailCount: row.nde_fail_count || 0,
    ndePendingCount: row.nde_pending_count || 0,
    ndePassRate: row.nde_pass_rate,
    repairCount: row.repair_count || 0,
    repairRate: row.repair_rate || 0,
    avgDaysToNDE: row.avg_days_to_nde,
    avgDaysToAcceptance: row.avg_days_to_acceptance,
    pctTotal: row.pct_total || 0,
    // NOTE: Welder view doesn't have count columns yet (will be added separately)
    fitupCount: 0,
    weldCompleteCount: 0,
    remainingCount: (row.total_welds || 0),
    firstPassAcceptanceCount: row.first_pass_acceptance_count || 0,
    firstPassAcceptanceRate: row.first_pass_acceptance_rate,
  };
}

/**
 * Fetch field weld progress report data grouped by specified dimension
 * Returns FieldWeldReportData with rows, grand total, and metadata
 */
export function useFieldWeldProgressReport(
  projectId: string,
  groupingDimension: FieldWeldGroupingDimension
): UseQueryResult<FieldWeldReportData, Error> {
  return useQuery({
    queryKey: ['field-weld-progress-report', projectId, groupingDimension],
    queryFn: async (): Promise<FieldWeldReportData> => {
      let rows: FieldWeldProgressRow[] = [];

      switch (groupingDimension) {
        case 'area': {
          const { data, error } = await supabase
            .from('vw_field_weld_progress_by_area')
            .select('*')
            .eq('project_id', projectId)
            .order('area_name', { ascending: true });

          if (error) throw error;
          rows = (data || []).map(transformAreaRow);
          break;
        }

        case 'system': {
          const { data, error } = await supabase
            .from('vw_field_weld_progress_by_system')
            .select('*')
            .eq('project_id', projectId)
            .order('system_name', { ascending: true });

          if (error) throw error;
          rows = (data || []).map(transformSystemRow);
          break;
        }

        case 'test_package': {
          const { data, error } = await supabase
            .from('vw_field_weld_progress_by_test_package')
            .select('*')
            .eq('project_id', projectId)
            .order('test_package_name', { ascending: true });

          if (error) throw error;
          rows = (data || []).map(transformTestPackageRow);
          break;
        }

        case 'welder': {
          const { data, error } = await supabase
            .from('vw_field_weld_progress_by_welder')
            .select('*')
            .eq('project_id', projectId)
            .order('welder_name', { ascending: true });

          if (error) throw error;
          rows = (data || []).map(transformWelderRow);
          break;
        }

        default:
          throw new Error(`Invalid grouping dimension: ${groupingDimension}`);
      }

      const grandTotal = calculateFieldWeldGrandTotal(rows, groupingDimension);

      return {
        dimension: groupingDimension,
        rows,
        grandTotal,
        generatedAt: new Date(),
        projectId,
      };
    },
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
    enabled: !!projectId, // Only run query if projectId is provided
  });
}
