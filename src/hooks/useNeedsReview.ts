/**
 * TanStack Query hooks for needs_review table (Feature 005)
 * Provides exception queue management for items requiring human review
 */

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

type NeedsReviewItem = Database['public']['Tables']['needs_review']['Row'];

type ReviewStatus = 'pending' | 'resolved' | 'ignored';
type ReviewType =
  | 'out_of_sequence'
  | 'rollback'
  | 'delta_quantity'
  | 'drawing_change'
  | 'similar_drawing'
  | 'verify_welder';

interface NeedsReviewFilters {
  status?: ReviewStatus;
  type?: ReviewType;
}

/**
 * Query needs_review items for a project with optional filters
 * Defaults to status = 'pending' (show review queue)
 */
export function useNeedsReview(
  projectId: string,
  filters?: NeedsReviewFilters
): UseQueryResult<NeedsReviewItem[], Error> {
  return useQuery({
    queryKey: ['projects', projectId, 'needs-review', filters],
    queryFn: async () => {
      let query = supabase
        .from('needs_review')
        .select('*')
        .eq('project_id', projectId);

      // Default to pending status if not specified
      const status = filters?.status || 'pending';
      query = query.eq('status', status);

      if (filters?.type) {
        query = query.eq('type', filters.type);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    staleTime: 1 * 60 * 1000, // 1 minute (review queue changes frequently)
  });
}

/**
 * Resolve or ignore a needs_review item
 * Requires can_resolve_reviews permission (enforced by RLS policy)
 * Sets resolved_at = now(), resolved_by = auth.uid()
 * Creates audit_log entry
 */
export function useResolveNeedsReview(): UseMutationResult<
  NeedsReviewItem,
  Error,
  {
    id: string;
    status: 'resolved' | 'ignored';
    resolution_note?: string;
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, resolution_note }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('needs_review')
        .update({
          status,
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
          resolution_note,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // TODO: Create audit_log entry when useAuditLog is available

      return data;
    },
    onSuccess: (data) => {
      // Invalidate needs_review list for this project
      queryClient.invalidateQueries({
        queryKey: ['projects', data.project_id, 'needs-review'],
      });

      // Invalidate audit log
      queryClient.invalidateQueries({
        queryKey: ['projects', data.project_id, 'audit-log'],
      });
    },
  });
}
