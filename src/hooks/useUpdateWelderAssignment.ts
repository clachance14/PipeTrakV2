/**
 * useUpdateWelderAssignment Hook
 * Mutation hook for updating welder assignment on an existing field weld
 * WITHOUT affecting milestone state (use this for editing, not initial assignment)
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface UpdateWelderAssignmentPayload {
  field_weld_id: string
  welder_id: string
  date_welded: string
}

/**
 * Mutation hook: Update welder assignment without changing milestones
 * Use this when editing an existing welder assignment (e.g., correcting a mistake)
 */
export function useUpdateWelderAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: UpdateWelderAssignmentPayload) => {
      const { data: fieldWeld, error } = await supabase
        .from('field_welds')
        .update({
          welder_id: payload.welder_id,
          date_welded: payload.date_welded,
        })
        .eq('id', payload.field_weld_id)
        .select('id, component_id, welder_id, date_welded')
        .maybeSingle()

      if (error) {
        throw new Error(`Failed to update welder assignment: ${error.message}`)
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
            welder_id: payload.welder_id,
            date_welded: payload.date_welded,
          }
        }
        return old
      })

      // Optimistic update: field welds list query (for Weld Log table)
      queryClient.setQueriesData({ queryKey: ['field-welds'] }, (old: unknown) => {
        if (!old || !Array.isArray(old)) return old
        return old.map((weld: { id: string }) =>
          weld.id === payload.field_weld_id
            ? { ...weld, welder_id: payload.welder_id, date_welded: payload.date_welded }
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
      toast.error(`Failed to update welder: ${error.message}`)
    },
    onSuccess: () => {
      // Invalidate caches to refresh UI
      queryClient.invalidateQueries({ queryKey: ['field-weld'] })
      queryClient.invalidateQueries({ queryKey: ['field-welds'] })

      toast.success('Welder assignment updated')
    },
  })
}
