/**
 * TanStack Query hook for Dynamic Weld Summary Report (By Welder)
 * Calls the get_weld_summary_by_welder RPC function with dynamic filters
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type {
  WelderSummaryParams,
  WelderSummaryRow,
  WelderSummaryReport,
} from '@/types/weldSummary';
import { calculateWelderSummaryTotals } from '@/types/weldSummary';

export interface UseWelderSummaryReportOptions {
  params: WelderSummaryParams;
  enabled?: boolean; // Optional: disable query (e.g., until project selected)
}

export function useWelderSummaryReport({
  params,
  enabled = true,
}: UseWelderSummaryReportOptions) {
  return useQuery({
    queryKey: ['weld-summary-by-welder', params],
    queryFn: async (): Promise<WelderSummaryReport> => {
      // Call the RPC function
      const { data, error } = await supabase.rpc('get_weld_summary_by_welder', {
        p_project_id: params.p_project_id,
        p_start_date: params.p_start_date ?? undefined,
        p_end_date: params.p_end_date ?? undefined,
        p_welder_ids: params.p_welder_ids ?? undefined,
        p_area_ids: params.p_area_ids ?? undefined,
        p_system_ids: params.p_system_ids ?? undefined,
        p_package_ids: params.p_package_ids ?? undefined,
      });

      if (error) {
        throw new Error(`Failed to fetch weld summary: ${error.message}`);
      }

      // Cast data to WelderSummaryRow[] (Supabase returns any[])
      const rows = (data as WelderSummaryRow[]) || [];

      // Calculate totals
      const totals = calculateWelderSummaryTotals(rows);

      return {
        rows,
        totals,
        generatedAt: new Date(),
        filters: params,
      };
    },
    enabled: enabled && !!params.p_project_id, // Only run if enabled and project ID provided
    staleTime: 30000, // 30 seconds - data is relatively fresh
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  });
}
