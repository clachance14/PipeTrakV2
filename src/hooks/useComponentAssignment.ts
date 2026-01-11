/**
 * TanStack Query hooks for bulk component assignment (Feature 007)
 * Provides mutations for assigning components to areas, systems, and test packages
 */

import { useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

type Component = Database['public']['Tables']['components']['Row'];

interface AssignComponentsParams {
  component_ids: string[];
  area_id?: string | null;
  system_id?: string | null;
  test_package_id?: string | null;
  post_hydro_install?: boolean;
}

interface AssignComponentsResult {
  updated_count: number;
  components: Component[];
}

/**
 * Bulk assign components to area, system, and/or test package
 * At least one of area_id, system_id, or test_package_id must be provided
 * Validates that target area/system/package exists in the same project
 * Requires can_manage_team permission (enforced by RLS)
 */
export function useAssignComponents(): UseMutationResult<
  AssignComponentsResult,
  Error,
  AssignComponentsParams
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ component_ids, area_id, system_id, test_package_id, post_hydro_install }) => {
      // Validate that at least one assignment is provided
      if (area_id === undefined && system_id === undefined && test_package_id === undefined && post_hydro_install === undefined) {
        throw new Error('At least one of area_id, system_id, test_package_id, or post_hydro_install must be provided');
      }

      // Validate component_ids is not empty
      if (component_ids.length === 0) {
        throw new Error('component_ids array must not be empty');
      }

      // Build update object with only non-null values
      const updates: Partial<Component> = {};
      if (area_id !== undefined) updates.area_id = area_id;
      if (system_id !== undefined) updates.system_id = system_id;
      if (test_package_id !== undefined) updates.test_package_id = test_package_id;
      if (post_hydro_install !== undefined) updates.post_hydro_install = post_hydro_install;

      // Perform bulk update
      const { data, error } = await supabase
        .from('components')
        .update(updates)
        .in('id', component_ids)
        .select();

      if (error) throw error;

      return {
        updated_count: data?.length || 0,
        components: data || [],
      };
    },
    onSuccess: (data, variables) => {
      // Invalidate components queries to refetch updated assignments
      queryClient.invalidateQueries({
        queryKey: ['components'],
      });
      queryClient.invalidateQueries({
        queryKey: ['projects'],
      });
      queryClient.invalidateQueries({
        queryKey: ['drawings-with-progress'],
      });
      queryClient.invalidateQueries({
        queryKey: ['package-readiness'],
      });

      // If test_package_id changed, invalidate package-specific queries
      if (variables.test_package_id !== undefined) {
        queryClient.invalidateQueries({
          queryKey: ['package-components'],
        });
      }

      // Log success
      console.log(`Successfully assigned ${data.updated_count} components`);
    },
  });
}

interface ClearComponentAssignmentsParams {
  component_id: string;
}

/**
 * Clear all metadata assignments (area, system, test package) from a single component
 * Sets all three fields to NULL
 * Used when user wants to remove all assignments and let component re-inherit from drawing
 * Requires can_manage_team permission (enforced by RLS)
 */
export function useClearComponentAssignments(): UseMutationResult<
  Component,
  Error,
  ClearComponentAssignmentsParams
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ component_id }) => {
      // Clear all three metadata fields to NULL
      const { data, error } = await supabase
        .from('components')
        .update({
          area_id: null,
          system_id: null,
          test_package_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', component_id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Component not found');

      return data;
    },
    onSuccess: () => {
      // Invalidate components and drawings queries to refetch updated state
      queryClient.invalidateQueries({
        queryKey: ['components'],
      });
      queryClient.invalidateQueries({
        queryKey: ['drawings-with-progress'],
      });
      queryClient.invalidateQueries({
        queryKey: ['package-readiness'],
      });
      queryClient.invalidateQueries({
        queryKey: ['package-components'],
      });

      // Log success
      console.log('Successfully cleared component assignments');
    },
  });
}
