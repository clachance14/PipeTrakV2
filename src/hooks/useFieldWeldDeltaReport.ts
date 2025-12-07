/**
 * TanStack Query hook for field weld delta reports (Feature 033)
 * Fetches progress delta data showing changes within a date range
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type {
  FieldWeldGroupingDimension,
  ReportDateRange,
  FieldWeldDeltaRow,
  FieldWeldDeltaGrandTotal,
  FieldWeldDeltaReportData,
} from '@/types/reports';
import { resolveDateRange } from './useProgressDeltaReport';

/**
 * Calculate grand total row from field weld delta rows
 * Sum for counts, weighted average for percentage
 */
function calculateFieldWeldDeltaGrandTotal(
  rows: FieldWeldDeltaRow[]
): FieldWeldDeltaGrandTotal {
  if (rows.length === 0) {
    return {
      name: 'Grand Total',
      weldsWithActivity: 0,
      deltaFitupCount: 0,
      deltaWeldCompleteCount: 0,
      deltaAcceptedCount: 0,
      deltaPctTotal: 0,
    };
  }

  // Sum all counts
  const weldsWithActivity = rows.reduce((sum, row) => sum + row.weldsWithActivity, 0);
  const deltaFitupCount = rows.reduce((sum, row) => sum + row.deltaFitupCount, 0);
  const deltaWeldCompleteCount = rows.reduce((sum, row) => sum + row.deltaWeldCompleteCount, 0);
  const deltaAcceptedCount = rows.reduce((sum, row) => sum + row.deltaAcceptedCount, 0);

  // Calculate weighted average for percentage (weight by weldsWithActivity)
  const deltaPctTotal =
    weldsWithActivity > 0
      ? rows.reduce((sum, row) => sum + row.deltaPctTotal * row.weldsWithActivity, 0) /
        weldsWithActivity
      : 0;

  return {
    name: 'Grand Total',
    weldsWithActivity,
    deltaFitupCount,
    deltaWeldCompleteCount,
    deltaAcceptedCount,
    deltaPctTotal,
  };
}

/**
 * Fetch field weld delta report data for a specific date range
 * Returns FieldWeldDeltaReportData with rows filtered to only include dimensions with activity
 */
export function useFieldWeldDeltaReport(
  projectId: string | undefined,
  dimension: FieldWeldGroupingDimension,
  dateRange: ReportDateRange,
  enabled = true
): UseQueryResult<FieldWeldDeltaReportData, Error> {
  const resolvedRange = resolveDateRange(dateRange);

  return useQuery({
    queryKey: [
      'field-weld-delta-report',
      projectId,
      dimension,
      resolvedRange?.start.toISOString(),
      resolvedRange?.end.toISOString(),
    ],
    queryFn: async (): Promise<FieldWeldDeltaReportData> => {
      // Safe: query is disabled when projectId is undefined or dateRange is all_time
      const safeProjectId = projectId!;
      const safeStartDate = resolvedRange!.start.toISOString().split('T')[0]!;
      const safeEndDate = resolvedRange!.end.toISOString().split('T')[0]!;

      // Call RPC function
      const { data, error } = await supabase.rpc('get_field_weld_delta_by_dimension', {
        p_project_id: safeProjectId,
        p_dimension: dimension,
        p_start_date: safeStartDate,
        p_end_date: safeEndDate,
      });

      if (error) throw error;

      // Transform database rows to TypeScript format
      const transformedRows: FieldWeldDeltaRow[] = (data || []).map((row) => ({
        id: row.dimension_id || '',
        name: row.dimension_name || '',
        stencil: row.stencil || undefined,
        weldsWithActivity: row.welds_with_activity || 0,
        deltaFitupCount: row.delta_fitup_count || 0,
        deltaWeldCompleteCount: row.delta_weld_complete_count || 0,
        deltaAcceptedCount: row.delta_accepted_count || 0,
        deltaPctTotal: row.delta_pct_total || 0,
      }));

      // Filter out rows with no activity
      const filteredRows = transformedRows.filter((row) => row.weldsWithActivity > 0);

      // Calculate grand total
      const grandTotal = calculateFieldWeldDeltaGrandTotal(filteredRows);

      return {
        dimension,
        rows: filteredRows,
        grandTotal,
        dateRange,
        generatedAt: new Date(),
        projectId: safeProjectId,
      };
    },
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
    enabled: !!projectId && dateRange.preset !== 'all_time' && enabled, // Only run when projectId exists and not viewing all time
  });
}
