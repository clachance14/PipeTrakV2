/**
 * TanStack Query hook for manhour progress reports (Feature 032)
 * Fetches aggregated manhour data grouped by area, system, or test package
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';
import type {
  GroupingDimension,
  ManhourProgressRow,
  ManhourReportData,
  ManhourGrandTotalRow,
} from '@/types/reports';

// View row types from database
type AreaManhourRow = Database['public']['Views']['vw_manhour_progress_by_area']['Row'];
type SystemManhourRow = Database['public']['Views']['vw_manhour_progress_by_system']['Row'];
type TestPackageManhourRow = Database['public']['Views']['vw_manhour_progress_by_test_package']['Row'];

/**
 * Calculate grand total row from manhour progress rows
 * Sum for manhour values, weighted average for percentage
 */
function calculateGrandTotal(rows: ManhourProgressRow[]): ManhourGrandTotalRow {
  if (rows.length === 0) {
    return {
      name: 'Grand Total',
      mhBudget: 0,
      receiveMhBudget: 0,
      receiveMhEarned: 0,
      installMhBudget: 0,
      installMhEarned: 0,
      punchMhBudget: 0,
      punchMhEarned: 0,
      testMhBudget: 0,
      testMhEarned: 0,
      restoreMhBudget: 0,
      restoreMhEarned: 0,
      totalMhEarned: 0,
      mhPctComplete: 0,
    };
  }

  // Sum all manhour values
  const totals = rows.reduce(
    (acc, row) => ({
      mhBudget: acc.mhBudget + row.mhBudget,
      receiveMhBudget: acc.receiveMhBudget + row.receiveMhBudget,
      receiveMhEarned: acc.receiveMhEarned + row.receiveMhEarned,
      installMhBudget: acc.installMhBudget + row.installMhBudget,
      installMhEarned: acc.installMhEarned + row.installMhEarned,
      punchMhBudget: acc.punchMhBudget + row.punchMhBudget,
      punchMhEarned: acc.punchMhEarned + row.punchMhEarned,
      testMhBudget: acc.testMhBudget + row.testMhBudget,
      testMhEarned: acc.testMhEarned + row.testMhEarned,
      restoreMhBudget: acc.restoreMhBudget + row.restoreMhBudget,
      restoreMhEarned: acc.restoreMhEarned + row.restoreMhEarned,
      totalMhEarned: acc.totalMhEarned + row.totalMhEarned,
    }),
    {
      mhBudget: 0,
      receiveMhBudget: 0,
      receiveMhEarned: 0,
      installMhBudget: 0,
      installMhEarned: 0,
      punchMhBudget: 0,
      punchMhEarned: 0,
      testMhBudget: 0,
      testMhEarned: 0,
      restoreMhBudget: 0,
      restoreMhEarned: 0,
      totalMhEarned: 0,
    }
  );

  // Calculate overall % complete (weighted by manhour budget)
  const mhPctComplete =
    totals.mhBudget > 0
      ? (totals.totalMhEarned / totals.mhBudget) * 100
      : 0;

  return {
    name: 'Grand Total',
    ...totals,
    mhPctComplete,
  };
}

/**
 * Transform area view row to ManhourProgressRow
 */
function transformAreaRow(row: AreaManhourRow): ManhourProgressRow {
  return {
    id: row.area_id || '',
    name: row.area_name || '',
    projectId: row.project_id || '',
    mhBudget: row.mh_budget || 0,
    receiveMhBudget: row.receive_mh_budget || 0,
    receiveMhEarned: row.receive_mh_earned || 0,
    installMhBudget: row.install_mh_budget || 0,
    installMhEarned: row.install_mh_earned || 0,
    punchMhBudget: row.punch_mh_budget || 0,
    punchMhEarned: row.punch_mh_earned || 0,
    testMhBudget: row.test_mh_budget || 0,
    testMhEarned: row.test_mh_earned || 0,
    restoreMhBudget: row.restore_mh_budget || 0,
    restoreMhEarned: row.restore_mh_earned || 0,
    totalMhEarned: row.total_mh_earned || 0,
    mhPctComplete: row.mh_pct_complete || 0,
  };
}

/**
 * Transform system view row to ManhourProgressRow
 */
function transformSystemRow(row: SystemManhourRow): ManhourProgressRow {
  return {
    id: row.system_id || '',
    name: row.system_name || '',
    projectId: row.project_id || '',
    mhBudget: row.mh_budget || 0,
    receiveMhBudget: row.receive_mh_budget || 0,
    receiveMhEarned: row.receive_mh_earned || 0,
    installMhBudget: row.install_mh_budget || 0,
    installMhEarned: row.install_mh_earned || 0,
    punchMhBudget: row.punch_mh_budget || 0,
    punchMhEarned: row.punch_mh_earned || 0,
    testMhBudget: row.test_mh_budget || 0,
    testMhEarned: row.test_mh_earned || 0,
    restoreMhBudget: row.restore_mh_budget || 0,
    restoreMhEarned: row.restore_mh_earned || 0,
    totalMhEarned: row.total_mh_earned || 0,
    mhPctComplete: row.mh_pct_complete || 0,
  };
}

/**
 * Transform test package view row to ManhourProgressRow
 */
function transformTestPackageRow(row: TestPackageManhourRow): ManhourProgressRow {
  return {
    id: row.test_package_id || '',
    name: row.test_package_name || '',
    projectId: row.project_id || '',
    mhBudget: row.mh_budget || 0,
    receiveMhBudget: row.receive_mh_budget || 0,
    receiveMhEarned: row.receive_mh_earned || 0,
    installMhBudget: row.install_mh_budget || 0,
    installMhEarned: row.install_mh_earned || 0,
    punchMhBudget: row.punch_mh_budget || 0,
    punchMhEarned: row.punch_mh_earned || 0,
    testMhBudget: row.test_mh_budget || 0,
    testMhEarned: row.test_mh_earned || 0,
    restoreMhBudget: row.restore_mh_budget || 0,
    restoreMhEarned: row.restore_mh_earned || 0,
    totalMhEarned: row.total_mh_earned || 0,
    mhPctComplete: row.mh_pct_complete || 0,
  };
}

/**
 * Fetch manhour progress report data grouped by specified dimension
 * Returns ManhourReportData with rows, grand total, and metadata
 */
export function useManhourProgressReport(
  projectId: string | undefined,
  groupingDimension: GroupingDimension
): UseQueryResult<ManhourReportData, Error> {
  return useQuery({
    queryKey: ['manhour-progress-report', projectId, groupingDimension],
    queryFn: async (): Promise<ManhourReportData> => {
      // Safe: query is disabled when projectId is undefined
      const safeProjectId = projectId!;
      let rows: ManhourProgressRow[] = [];

      switch (groupingDimension) {
        case 'area': {
          const { data, error } = await supabase
            .from('vw_manhour_progress_by_area')
            .select('*')
            .eq('project_id', safeProjectId)
            .order('area_name', { ascending: true });

          if (error) throw error;
          rows = (data || []).map(transformAreaRow);
          break;
        }

        case 'system': {
          const { data, error } = await supabase
            .from('vw_manhour_progress_by_system')
            .select('*')
            .eq('project_id', safeProjectId)
            .order('system_name', { ascending: true });

          if (error) throw error;
          rows = (data || []).map(transformSystemRow);
          break;
        }

        case 'test_package': {
          const { data, error } = await supabase
            .from('vw_manhour_progress_by_test_package')
            .select('*')
            .eq('project_id', safeProjectId)
            .order('test_package_name', { ascending: true });

          if (error) throw error;
          rows = (data || []).map(transformTestPackageRow);
          break;
        }

        default:
          throw new Error(`Invalid grouping dimension: ${groupingDimension}`);
      }

      const grandTotal = calculateGrandTotal(rows);

      return {
        dimension: groupingDimension,
        rows,
        grandTotal,
        generatedAt: new Date(),
        projectId: safeProjectId,
      };
    },
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
    enabled: !!projectId, // Only run query if projectId is provided
  });
}
