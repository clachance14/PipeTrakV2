/**
 * TanStack Query hooks for manual materialized view refresh (Feature 005)
 * Utility hook for refreshing dashboards after bulk operations
 */

import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

/**
 * Manually refresh materialized views after bulk operations
 * Calls Supabase RPC 'refresh_materialized_views'
 * Refreshes: mv_package_readiness, mv_drawing_progress
 * Use case: After bulk import, call mutate() to update dashboards immediately
 */
export function useRefreshDashboards(): UseMutationResult<void, Error, void> {
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('refresh_materialized_views');

      if (error) throw error;
    },
  });
}
