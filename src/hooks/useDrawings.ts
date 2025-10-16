/**
 * TanStack Query hooks for drawings table (Feature 005)
 * Provides CRUD operations + similarity detection for construction drawings
 */

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

type Drawing = Database['public']['Tables']['drawings']['Row'];

interface DrawingsFilters {
  is_retired?: boolean;
  search?: string;
}

interface SimilarDrawing {
  drawing_id: string;
  drawing_no_norm: string;
  similarity_score: number;
}

/**
 * Query drawings for a project with optional filters
 */
export function useDrawings(
  projectId: string,
  filters?: DrawingsFilters
): UseQueryResult<Drawing[], Error> {
  return useQuery({
    queryKey: ['projects', projectId, 'drawings', filters],
    queryFn: async () => {
      let query = supabase
        .from('drawings')
        .select('*')
        .eq('project_id', projectId);

      // Apply filters
      if (filters?.is_retired !== undefined) {
        query = query.eq('is_retired', filters.is_retired);
      }

      if (filters?.search) {
        query = query.ilike('drawing_no_raw', `%${filters.search}%`);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Find similar drawings using trigram similarity
 * Calls detect_similar_drawings() stored procedure
 */
export function useSimilarDrawings(
  projectId: string,
  drawingNoNorm: string,
  threshold: number = 0.85
): UseQueryResult<SimilarDrawing[], Error> {
  return useQuery({
    queryKey: ['projects', projectId, 'similar-drawings', drawingNoNorm, threshold],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('detect_similar_drawings', {
        p_project_id: projectId,
        p_drawing_no_norm: drawingNoNorm,
        p_threshold: threshold,
      });

      if (error) throw error;
      return data || [];
    },
    enabled: !!drawingNoNorm && drawingNoNorm.length > 0,
    staleTime: 10 * 60 * 1000, // 10 minutes (similarity rarely changes)
  });
}

/**
 * Create a new drawing
 * Auto-normalizes drawing_no_norm via trigger
 * Triggers similarity detection
 */
export function useCreateDrawing(): UseMutationResult<
  Drawing,
  Error,
  {
    project_id: string;
    drawing_no_raw: string;
    title?: string;
    rev?: string;
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newDrawing) => {
      const { data, error } = await supabase
        .from('drawings')
        .insert({
          project_id: newDrawing.project_id,
          drawing_no_raw: newDrawing.drawing_no_raw,
          drawing_no_norm: newDrawing.drawing_no_raw.toUpperCase().trim(), // Normalized (trigger will also do this)
          title: newDrawing.title,
          rev: newDrawing.rev,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate drawings list for this project
      queryClient.invalidateQueries({
        queryKey: ['projects', data.project_id, 'drawings'],
      });

      // TODO: Trigger similar drawing detection and create needs_review if matches found
      // This will be implemented when useNeedsReview is available
    },
  });
}

/**
 * Retire a drawing (soft delete)
 * Sets is_retired = true and retire_reason
 */
export function useRetireDrawing(): UseMutationResult<
  Drawing,
  Error,
  {
    id: string;
    retire_reason: string;
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, retire_reason }) => {
      const { data, error } = await supabase
        .from('drawings')
        .update({
          is_retired: true,
          retire_reason,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate drawings list and single drawing cache
      queryClient.invalidateQueries({
        queryKey: ['projects', data.project_id, 'drawings'],
      });
      queryClient.invalidateQueries({
        queryKey: ['drawings', data.id],
      });
    },
  });
}
