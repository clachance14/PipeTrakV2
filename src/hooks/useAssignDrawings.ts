/**
 * Hook: useAssignDrawings
 * Feature: 011-the-drawing-component
 *
 * TanStack Query mutation for assigning metadata to drawings with automatic
 * inheritance to components. Supports both single and bulk operations with
 * optimistic updates and automatic rollback on error.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type {
  DrawingAssignmentPayload,
  BulkDrawingAssignmentPayload,
  InheritanceSummary,
} from '@/types/drawing-table.types';

/**
 * Hook for assigning metadata to a single drawing
 *
 * Features:
 * - Optimistic updates (<50ms perceived latency)
 * - Automatic rollback on error
 * - Query invalidation on success
 * - Toast notifications
 *
 * @returns TanStack Query mutation object
 *
 * @example
 * const assignDrawing = useAssignDrawing();
 *
 * assignDrawing.mutate({
 *   drawing_id: 'uuid',
 *   area_id: 'area-uuid',
 *   user_id: 'user-uuid',
 * });
 */
export function useAssignDrawing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: DrawingAssignmentPayload) => {
      const { data, error } = await supabase.rpc('assign_drawing_with_inheritance', {
        p_drawing_id: params.drawing_id,
        p_area_id: params.area_id || null,
        p_system_id: params.system_id || null,
        p_test_package_id: params.test_package_id || null,
        p_user_id: params.user_id,
      });

      if (error) throw error;
      return data as InheritanceSummary;
    },

    // Optimistic update: Show changes immediately
    onMutate: async (params) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['drawings-with-progress'] });

      // Snapshot current value for rollback
      const previousDrawings = queryClient.getQueryData(['drawings-with-progress']);

      // Optimistically update cache
      queryClient.setQueryData(['drawings-with-progress'], (old: any) => {
        if (!old) return old;

        return old.map((drawing: any) => {
          if (drawing.id !== params.drawing_id) return drawing;

          return {
            ...drawing,
            area: params.area_id ? { id: params.area_id, name: '...' } : drawing.area,
            system: params.system_id ? { id: params.system_id, name: '...' } : drawing.system,
            test_package: params.test_package_id ? { id: params.test_package_id, name: '...' } : drawing.test_package,
          };
        });
      });

      return { previousDrawings };
    },

    // Rollback on error
    onError: (err: Error, variables, context) => {
      if (context?.previousDrawings) {
        queryClient.setQueryData(['drawings-with-progress'], context.previousDrawings);
      }
      console.error('Failed to assign drawing:', err.message);
    },

    // Refetch on success
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['drawings-with-progress'] });
      queryClient.invalidateQueries({ queryKey: ['components'] });

      console.log(
        `Drawing assigned successfully. ${data.components_inherited} components inherited.`
      );
    },
  });
}

/**
 * Hook for bulk-assigning metadata to multiple drawings
 *
 * Features:
 * - Single atomic transaction (all-or-nothing)
 * - Supports 'NO_CHANGE' to preserve existing values
 * - Max 50 drawings per operation
 * - Optimistic updates for all drawings
 * - Aggregate inheritance summary
 *
 * @returns TanStack Query mutation object
 *
 * @example
 * const assignDrawings = useAssignDrawingsBulk();
 *
 * assignDrawings.mutate({
 *   drawing_ids: ['uuid1', 'uuid2', 'uuid3'],
 *   area_id: 'area-uuid',
 *   system_id: 'NO_CHANGE', // Preserve existing
 *   user_id: 'user-uuid',
 * });
 */
export function useAssignDrawingsBulk() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: BulkDrawingAssignmentPayload) => {
      // Enforce 50-drawing limit (client-side validation)
      if (params.drawing_ids.length > 50) {
        throw new Error('Cannot assign more than 50 drawings at once');
      }

      const { data, error } = await supabase.rpc('assign_drawings_bulk', {
        p_drawing_ids: params.drawing_ids,
        p_area_id: params.area_id || null,
        p_system_id: params.system_id || null,
        p_test_package_id: params.test_package_id || null,
        p_user_id: params.user_id,
      });

      if (error) throw error;
      return data as InheritanceSummary[];
    },

    // Optimistic update for all drawings
    onMutate: async (params) => {
      await queryClient.cancelQueries({ queryKey: ['drawings-with-progress'] });
      const previousDrawings = queryClient.getQueryData(['drawings-with-progress']);

      queryClient.setQueryData(['drawings-with-progress'], (old: any) => {
        if (!old) return old;

        return old.map((drawing: any) => {
          if (!params.drawing_ids.includes(drawing.id)) return drawing;

          return {
            ...drawing,
            area:
              params.area_id && params.area_id !== 'NO_CHANGE'
                ? { id: params.area_id, name: '...' }
                : drawing.area,
            system:
              params.system_id && params.system_id !== 'NO_CHANGE'
                ? { id: params.system_id, name: '...' }
                : drawing.system,
            test_package:
              params.test_package_id && params.test_package_id !== 'NO_CHANGE'
                ? { id: params.test_package_id, name: '...' }
                : drawing.test_package,
          };
        });
      });

      return { previousDrawings };
    },

    // Rollback on error
    onError: (err: Error, variables, context) => {
      if (context?.previousDrawings) {
        queryClient.setQueryData(['drawings-with-progress'], context.previousDrawings);
      }
      console.error('Failed to bulk assign drawings:', err.message);
    },

    // Refetch on success with aggregate summary
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['drawings-with-progress'] });
      queryClient.invalidateQueries({ queryKey: ['components'] });

      // Aggregate results
      const totalInherited = data.reduce((sum, d) => sum + d.components_inherited, 0);
      const drawingCount = variables.drawing_ids.length;

      console.log(
        `${drawingCount} drawings assigned. ${totalInherited} components inherited across all drawings.`
      );
    },
  });
}
