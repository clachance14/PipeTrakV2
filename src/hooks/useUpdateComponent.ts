/**
 * Hook: useUpdateComponent (T022)
 *
 * Feature: 020-component-metadata-editing
 * Date: 2025-10-29
 *
 * TanStack Query mutation hook for updating component metadata with optimistic locking.
 * Implements optimistic updates and automatic rollback on error.
 *
 * @example
 * ```typescript
 * const mutation = useUpdateComponent()
 *
 * mutation.mutate({
 *   componentId: 'uuid-123',
 *   version: 5,  // Current version for optimistic locking
 *   area_id: 'area-uuid-456',
 *   system_id: null,  // Clears system assignment
 *   test_package_id: 'tp-uuid-789'
 * })
 *
 * if (mutation.isSuccess) {
 *   console.log('Updated:', mutation.data)
 * }
 *
 * if (mutation.isError) {
 *   const error = mutation.error as MetadataError
 *   if (error.code === MetadataErrorCode.CONCURRENT_UPDATE) {
 *     showMessage('Component was updated by another user. Please refresh.')
 *   }
 * }
 * ```
 */

import { useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  MetadataError,
  MetadataErrorCode,
  ERROR_MESSAGES,
  type UpdateComponentMetadataParams,
  type Component
} from '@/types/metadata'

/**
 * Mutation hook for updating component metadata with version check
 *
 * Features:
 * - Optimistic locking via version field (prevents concurrent edit conflicts)
 * - Optimistic updates (immediate UI feedback)
 * - Automatic rollback on error
 * - Query invalidation on success
 *
 * @param projectId - Project ID for proper cache invalidation
 * @returns TanStack Query mutation result
 *
 * Error Handling:
 * - Throws MetadataError with CONCURRENT_UPDATE code when version mismatches
 * - Throws database errors directly (network failures, permission denied, etc.)
 *
 * Query Invalidation:
 * - Invalidates ['components'] - component list queries
 * - Invalidates ['drawings-with-progress'] - drawing table queries
 * - Invalidates ['drawing-components', projectId] - drawing component lists
 * - Invalidates ['drawings-component-count', projectId] - component count queries
 * - Invalidates ['package-readiness'] - package stats
 */
export function useUpdateComponent(projectId: string): UseMutationResult<
  Component,
  Error,
  UpdateComponentMetadataParams,
  { previous: Component | undefined }
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: UpdateComponentMetadataParams) => {
      const { componentId, version, ...updates } = params

      // Update with version check (optimistic locking)
      const { data, error } = await supabase
        .from('components')
        .update(updates)
        .eq('id', componentId)
        .eq('version', version) // Optimistic locking: only update if version matches
        .select()
        .single()

      if (error) throw error

      // If no rows updated, version changed (concurrent edit)
      if (!data) {
        throw new MetadataError(
          MetadataErrorCode.CONCURRENT_UPDATE,
          ERROR_MESSAGES[MetadataErrorCode.CONCURRENT_UPDATE]
        )
      }

      return data as unknown as Component
    },

    onMutate: async (variables) => {
      // Cancel in-flight queries to prevent race conditions
      await queryClient.cancelQueries({ queryKey: ['component', variables.componentId] })

      // Snapshot current state for rollback
      const previous = queryClient.getQueryData<Component>(['component', variables.componentId])

      // Optimistically update cache for immediate UI feedback
      queryClient.setQueryData<Component>(
        ['component', variables.componentId],
        (old) => {
          if (!old) return old

          return {
            ...old,
            area_id: variables.area_id,
            system_id: variables.system_id,
            test_package_id: variables.test_package_id,
            last_updated_at: new Date().toISOString()
          }
        }
      )

      return { previous }
    },

    onError: (_err, variables, context) => {
      // Rollback optimistic update on error
      if (context?.previous) {
        queryClient.setQueryData(
          ['component', variables.componentId],
          context.previous
        )
      }
    },

    onSuccess: (_data, variables) => {
      // Invalidate related queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['components'] })
      queryClient.invalidateQueries({ queryKey: ['drawings-with-progress'] })
      queryClient.invalidateQueries({ queryKey: ['package-readiness'] })
      queryClient.invalidateQueries({ queryKey: ['drawing-components', projectId] })
      queryClient.invalidateQueries({ queryKey: ['drawings-component-count', projectId] })

      // If test_package_id changed, invalidate package-specific queries
      if (variables.test_package_id !== undefined) {
        queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'test-packages'] })
        queryClient.invalidateQueries({ queryKey: ['package-components'] })
      }
    }
  })
}
