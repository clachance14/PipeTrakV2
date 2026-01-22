/**
 * useClearWelderAssignment Hook
 * Mutation hook for clearing welder assignment from a field weld
 * Used when rolling back the "Weld Complete" milestone
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface ClearWelderAssignmentPayload {
  field_weld_id: string
}

interface ClearWelderAssignmentResult {
  id: string
  component_id: string
}

/**
 * Mutation hook: Clear welder assignment (set welder_id and date_welded to null)
 * Used when a weld is marked incomplete after being completed
 */
export function useClearWelderAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: ClearWelderAssignmentPayload): Promise<ClearWelderAssignmentResult> => {
      const { data: fieldWeld, error } = await supabase
        .from('field_welds')
        .update({
          welder_id: null,
          date_welded: null,
        })
        .eq('id', payload.field_weld_id)
        .select('id, component_id')
        .maybeSingle()

      if (error) {
        throw new Error(`Failed to clear welder assignment: ${error.message}`)
      }

      if (!fieldWeld) {
        throw new Error('Field weld not found or access denied')
      }

      return fieldWeld
    },
    onMutate: async (payload) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['field-weld'] })
      await queryClient.cancelQueries({ queryKey: ['field-welds'] })

      // Snapshot previous data for rollback
      const previousFieldWelds = queryClient.getQueriesData({ queryKey: ['field-weld'] })
      const previousFieldWeldsList = queryClient.getQueriesData({ queryKey: ['field-welds'] })

      // Optimistic update: single field weld queries
      queryClient.setQueriesData({ queryKey: ['field-weld'] }, (old: unknown) => {
        if (!old || typeof old !== 'object') return old
        const oldData = old as { id?: string }
        if (oldData.id === payload.field_weld_id) {
          return {
            ...old,
            welder_id: null,
            date_welded: null,
            welder: undefined,
          }
        }
        return old
      })

      // Optimistic update: field welds list query (for Weld Log table)
      queryClient.setQueriesData({ queryKey: ['field-welds'] }, (old: unknown) => {
        if (!old || !Array.isArray(old)) return old
        return old.map((weld: { id: string }) =>
          weld.id === payload.field_weld_id
            ? { ...weld, welder_id: null, date_welded: null, welder: undefined }
            : weld
        )
      })

      return { previousFieldWelds, previousFieldWeldsList }
    },
    onError: (error: Error, _payload, context) => {
      // Rollback on error
      if (context?.previousFieldWelds) {
        context.previousFieldWelds.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
      if (context?.previousFieldWeldsList) {
        context.previousFieldWeldsList.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
      toast.error(`Failed to clear welder: ${error.message}`)
    },
    onSuccess: () => {
      // Invalidate caches to refresh UI
      queryClient.invalidateQueries({ queryKey: ['field-weld'] })
      queryClient.invalidateQueries({ queryKey: ['field-welds'] })
      // Note: We don't show a success toast here since this is called as part of
      // milestone rollback flow which has its own feedback
    },
  })
}
