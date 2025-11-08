/**
 * TanStack Query hook for progress reports (Feature 019)
 * Fetches aggregated progress data grouped by area, system, or test package
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';
import type { GroupingDimension, ProgressRow, ReportData, GrandTotalRow } from '@/types/reports';

// View row types from database
type AreaProgressRow = Database['public']['Views']['vw_progress_by_area']['Row'];
type SystemProgressRow = Database['public']['Views']['vw_progress_by_system']['Row'];
type TestPackageProgressRow = Database['public']['Views']['vw_progress_by_test_package']['Row'];

/**
 * Calculate grand total row from progress rows
 * Weighted average for percentages, sum for budget
 */
function calculateGrandTotal(rows: ProgressRow[]): GrandTotalRow {
  if (rows.length === 0) {
    return {
      name: 'Grand Total',
      budget: 0,
      pctReceived: 0,
      pctInstalled: 0,
      pctPunch: 0,
      pctTested: 0,
      pctRestored: 0,
      pctTotal: 0,
    };
  }

  const totalBudget = rows.reduce((sum, row) => sum + row.budget, 0);

  // Calculate weighted averages (weight by budget)
  const weightedSum = (field: keyof Pick<ProgressRow, 'pctReceived' | 'pctInstalled' | 'pctPunch' | 'pctTested' | 'pctRestored' | 'pctTotal'>) => {
    if (totalBudget === 0) return 0;
    return rows.reduce((sum, row) => sum + (row[field] * row.budget), 0) / totalBudget;
  };

  return {
    name: 'Grand Total',
    budget: totalBudget,
    pctReceived: weightedSum('pctReceived'),
    pctInstalled: weightedSum('pctInstalled'),
    pctPunch: weightedSum('pctPunch'),
    pctTested: weightedSum('pctTested'),
    pctRestored: weightedSum('pctRestored'),
    pctTotal: weightedSum('pctTotal'),
  };
}

/**
 * Transform area view row to ProgressRow
 */
function transformAreaRow(row: AreaProgressRow): ProgressRow {
  return {
    id: row.area_id || '',
    name: row.area_name || '',
    projectId: row.project_id || '',
    budget: row.budget || 0,
    pctReceived: row.pct_received || 0,
    pctInstalled: row.pct_installed || 0,
    pctPunch: row.pct_punch || 0,
    pctTested: row.pct_tested || 0,
    pctRestored: row.pct_restored || 0,
    pctTotal: row.pct_total || 0,
  };
}

/**
 * Transform system view row to ProgressRow
 */
function transformSystemRow(row: SystemProgressRow): ProgressRow {
  return {
    id: row.system_id || '',
    name: row.system_name || '',
    projectId: row.project_id || '',
    budget: row.budget || 0,
    pctReceived: row.pct_received || 0,
    pctInstalled: row.pct_installed || 0,
    pctPunch: row.pct_punch || 0,
    pctTested: row.pct_tested || 0,
    pctRestored: row.pct_restored || 0,
    pctTotal: row.pct_total || 0,
  };
}

/**
 * Transform test package view row to ProgressRow
 */
function transformTestPackageRow(row: TestPackageProgressRow): ProgressRow {
  return {
    id: row.test_package_id || '',
    name: row.test_package_name || '',
    projectId: row.project_id || '',
    budget: row.budget || 0,
    pctReceived: row.pct_received || 0,
    pctInstalled: row.pct_installed || 0,
    pctPunch: row.pct_punch || 0,
    pctTested: row.pct_tested || 0,
    pctRestored: row.pct_restored || 0,
    pctTotal: row.pct_total || 0,
  };
}

/**
 * Fetch progress report data grouped by specified dimension
 * Returns ReportData with rows, grand total, and metadata
 */
export function useProgressReport(
  projectId: string,
  groupingDimension: GroupingDimension
): UseQueryResult<ReportData, Error> {
  return useQuery({
    queryKey: ['progress-report', projectId, groupingDimension],
    queryFn: async (): Promise<ReportData> => {
      let rows: ProgressRow[] = [];

      switch (groupingDimension) {
        case 'area': {
          const { data, error } = await supabase
            .from('vw_progress_by_area')
            .select('*')
            .eq('project_id', projectId)
            .order('area_name', { ascending: true });

          if (error) throw error;
          rows = (data || []).map(transformAreaRow);
          break;
        }

        case 'system': {
          const { data, error } = await supabase
            .from('vw_progress_by_system')
            .select('*')
            .eq('project_id', projectId)
            .order('system_name', { ascending: true });

          if (error) throw error;
          rows = (data || []).map(transformSystemRow);
          break;
        }

        case 'test_package': {
          const { data, error } = await supabase
            .from('vw_progress_by_test_package')
            .select('*')
            .eq('project_id', projectId)
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
        projectId,
      };
    },
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
    enabled: !!projectId, // Only run query if projectId is provided
  });
}
