/**
 * TanStack Query hooks for areas table (Feature 005)
 * Provides CRUD operations for area assignment management
 */

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

type Area = Database['public']['Tables']['areas']['Row'];

/**
 * Query areas for a project
 */
export function useAreas(projectId: string): UseQueryResult<Area[], Error> {
  return useQuery({
    queryKey: ['projects', projectId, 'areas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('areas')
        .select('*')
        .eq('project_id', projectId)
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes (areas rarely change)
  });
}

/**
 * Create a new area
 * Validates unique name within project (enforced by idx_areas_project_name)
 */
export function useCreateArea(): UseMutationResult<
  Area,
  Error,
  {
    project_id: string;
    name: string;
    description?: string;
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newArea) => {
      const { data, error } = await supabase
        .from('areas')
        .insert(newArea)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate areas list for this project
      queryClient.invalidateQueries({
        queryKey: ['projects', data.project_id, 'areas'],
      });
    },
  });
}

/**
 * Update an existing area
 */
export function useUpdateArea(): UseMutationResult<
  Area,
  Error,
  {
    id: string;
    name?: string;
    description?: string;
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('areas')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate areas list for this project
      queryClient.invalidateQueries({
        queryKey: ['projects', data.project_id, 'areas'],
      });
    },
  });
}

/**
 * Delete an area
 * Sets component.area_id to NULL for any assigned components
 */
export function useDeleteArea(): UseMutationResult<
  void,
  Error,
  {
    id: string;
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }) => {
      const { error } = await supabase
        .from('areas')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, _variables) => {
      // Invalidate all areas queries
      queryClient.invalidateQueries({
        queryKey: ['projects'],
      });
      // Also invalidate components since area_id may have changed
      queryClient.invalidateQueries({
        queryKey: ['components'],
      });
    },
  });
}
