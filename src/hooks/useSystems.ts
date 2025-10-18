/**
 * TanStack Query hooks for systems table (Feature 005)
 * Provides CRUD operations for system assignment management
 */

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

type System = Database['public']['Tables']['systems']['Row'];

/**
 * Query systems for a project
 */
export function useSystems(projectId: string): UseQueryResult<System[], Error> {
  return useQuery({
    queryKey: ['projects', projectId, 'systems'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('systems')
        .select('*')
        .eq('project_id', projectId)
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes (systems rarely change)
  });
}

/**
 * Create a new system
 * Validates unique name within project (enforced by idx_systems_project_name)
 */
export function useCreateSystem(): UseMutationResult<
  System,
  Error,
  {
    project_id: string;
    name: string;
    description?: string;
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newSystem) => {
      const { data, error } = await supabase
        .from('systems')
        .insert(newSystem)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate systems list for this project
      queryClient.invalidateQueries({
        queryKey: ['projects', data.project_id, 'systems'],
      });
    },
  });
}

/**
 * Update an existing system
 */
export function useUpdateSystem(): UseMutationResult<
  System,
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
        .from('systems')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate systems list for this project
      queryClient.invalidateQueries({
        queryKey: ['projects', data.project_id, 'systems'],
      });
    },
  });
}

/**
 * Delete a system
 * Sets component.system_id to NULL for any assigned components
 */
export function useDeleteSystem(): UseMutationResult<
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
        .from('systems')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate all systems queries
      queryClient.invalidateQueries({
        queryKey: ['projects'],
      });
      // Also invalidate components since system_id may have changed
      queryClient.invalidateQueries({
        queryKey: ['components'],
      });
    },
  });
}
