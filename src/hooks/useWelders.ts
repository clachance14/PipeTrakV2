/**
 * TanStack Query hooks for welders table (Feature 005)
 * Provides welder registry + verification workflow
 */

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

type Welder = Database['public']['Tables']['welders']['Row'];

interface WeldersFilters {
  status?: 'unverified' | 'verified';
}

/**
 * Query welders for a project with optional status filter
 */
export function useWelders(
  projectId: string,
  filters?: WeldersFilters
): UseQueryResult<Welder[], Error> {
  return useQuery({
    queryKey: ['projects', projectId, 'welders', filters],
    queryFn: async () => {
      let query = supabase
        .from('welders')
        .select('*')
        .eq('project_id', projectId);

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      query = query.order('name', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Create a new welder
 * Auto-normalizes stencil_norm = UPPER(TRIM(stencil))
 * Validates stencil format via regex [A-Z0-9-]{2,12} (enforced by CHECK constraint)
 * Validates unique stencil_norm within project (enforced by idx_welders_project_stencil)
 * Sets status = 'unverified'
 */
export function useCreateWelder(): UseMutationResult<
  Welder,
  Error,
  {
    project_id: string;
    name: string;
    stencil: string;
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newWelder) => {
      const stencilNorm = newWelder.stencil.toUpperCase().trim();

      // Validate stencil format (client-side validation, also enforced by database CHECK constraint)
      const stencilRegex = /^[A-Z0-9-]{2,12}$/;
      if (!stencilRegex.test(stencilNorm)) {
        throw new Error('Invalid stencil format. Must be 2-12 characters (A-Z, 0-9, -)');
      }

      const { data, error } = await supabase
        .from('welders')
        .insert({
          project_id: newWelder.project_id,
          name: newWelder.name,
          stencil: newWelder.stencil,
          stencil_norm: stencilNorm,
          status: 'unverified',
        })
        .select()
        .single();

      if (error) {
        // Check for unique constraint violation
        if (error.code === '23505') {
          throw new Error(`Welder stencil "${stencilNorm}" already exists in this project`);
        }
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      // Invalidate welders list for this project
      queryClient.invalidateQueries({
        queryKey: ['projects', data.project_id, 'welders'],
      });
    },
  });
}

/**
 * Verify a welder
 * Requires can_manage_welders permission (enforced by RLS policy)
 * Sets status = 'verified', verified_at = now(), verified_by = auth.uid()
 */
export function useVerifyWelder(): UseMutationResult<
  Welder,
  Error,
  {
    id: string;
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('welders')
        .update({
          status: 'verified',
          verified_at: new Date().toISOString(),
          verified_by: user.id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate welders list and single welder cache
      queryClient.invalidateQueries({
        queryKey: ['projects', data.project_id, 'welders'],
      });
      queryClient.invalidateQueries({
        queryKey: ['welders', data.id],
      });
    },
  });
}
