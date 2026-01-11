/**
 * TanStack Query hook for bulk updating post_hydro_install flag
 * Used by ComponentsBulkActions to mark/clear post-hydro status on multiple components
 */

import { useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

type Component = Database['public']['Tables']['components']['Row'];

interface BulkUpdatePostHydroParams {
  componentIds: string[];
  postHydroInstall: boolean;
}

interface BulkUpdatePostHydroResult {
  updatedCount: number;
  components: Component[];
}

/**
 * Bulk update post_hydro_install flag on multiple components
 * Used by bulk actions menu to mark/clear post-hydro status
 */
export function useBulkUpdatePostHydro(): UseMutationResult<
  BulkUpdatePostHydroResult,
  Error,
  BulkUpdatePostHydroParams
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ componentIds, postHydroInstall }) => {
      if (componentIds.length === 0) {
        throw new Error('componentIds array must not be empty');
      }

      const { data, error } = await supabase
        .from('components')
        .update({ post_hydro_install: postHydroInstall })
        .in('id', componentIds)
        .select();

      if (error) throw error;

      return {
        updatedCount: data?.length ?? 0,
        components: data ?? [],
      };
    },
    onSuccess: (data) => {
      // Invalidate relevant queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['components'] });
      queryClient.invalidateQueries({ queryKey: ['package-readiness'] });
      queryClient.invalidateQueries({ queryKey: ['drawings-with-progress'] });
      queryClient.invalidateQueries({ queryKey: ['package-components'] });

      console.log(`Successfully updated post_hydro_install for ${data.updatedCount} components`);
    },
  });
}
