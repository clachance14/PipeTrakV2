/**
 * useAssignWelder Hook (Feature 014 - Field Weld QC)
 * Mutation hook for assigning welder to field weld
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface AssignWelderPayload {
  field_weld_id: string
  welder_id: string
  date_welded: string
  user_id: string // User making the assignment (for audit)
}

/**
 * Mutation hook: Assign welder to field weld and mark "Weld Complete" milestone
 */
export function useAssignWelder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: AssignWelderPayload) => {
      // Update field_weld - use maybeSingle() to handle RLS edge cases
      const { data: fieldWeld, error: weldError } = await supabase
        .from('field_welds')
        .update({
          welder_id: payload.welder_id,
          date_welded: payload.date_welded,
        })
        .eq('id', payload.field_weld_id)
        .select('component_id')
        .maybeSingle()

      if (weldError) {
        throw new Error(`Failed to assign welder: ${weldError.message}`)
      }

      if (!fieldWeld) {
        throw new Error('Field weld not found or access denied')
      }

      // Mark milestones on component using RPC function
      // This preserves other milestones and triggers auto-calculation of percent_complete

      // First mark Fit-up as complete (prerequisite for Weld Complete)
      const { error: fitUpError } = await supabase.rpc('update_component_milestone', {
        p_component_id: fieldWeld.component_id,
        p_milestone_name: 'Fit-up',
        p_new_value: 100,
        p_user_id: payload.user_id,
      })

      if (fitUpError) {
        throw new Error(`Failed to update Fit-up milestone: ${fitUpError.message}`)
      }

      // Then mark Weld Complete as complete
      const { error: weldCompleteError } = await supabase.rpc('update_component_milestone', {
        p_component_id: fieldWeld.component_id,
        p_milestone_name: 'Weld Complete',
        p_new_value: 100,
        p_user_id: payload.user_id,
      })

      if (weldCompleteError) {
        throw new Error(`Failed to update Weld Complete milestone: ${weldCompleteError.message}`)
      }

      return { ...fieldWeld, ...payload }
    },
    onMutate: async (payload) => {
      // Cancel outgoing queries for single field weld and field welds list
      await queryClient.cancelQueries({ queryKey: ['field-weld', payload.field_weld_id] })
      await queryClient.cancelQueries({ queryKey: ['field-welds'] })

      // Snapshot previous data for rollback
      const previousFieldWeld = queryClient.getQueryData(['field-weld', payload.field_weld_id])
      const previousFieldWeldsList = queryClient.getQueriesData({ queryKey: ['field-welds'] })

      // Optimistic update: single field weld query
      queryClient.setQueryData(['field-weld', payload.field_weld_id], (old: any) => ({
        ...old,
        welder_id: payload.welder_id,
        date_welded: payload.date_welded,
      }))

      // Optimistic update: field welds list query (for Weld Log table)
      queryClient.setQueriesData({ queryKey: ['field-welds'] }, (old: any) => {
        if (!old || !Array.isArray(old)) return old
        return old.map((weld: any) =>
          weld.id === payload.field_weld_id
            ? { ...weld, welder_id: payload.welder_id, date_welded: payload.date_welded }
            : weld
        )
      })

      return { previousFieldWeld, previousFieldWeldsList }
    },
    onError: (error: Error, payload, context) => {
      // Rollback on error
      if (context?.previousFieldWeld) {
        queryClient.setQueryData(['field-weld', payload.field_weld_id], context.previousFieldWeld)
      }
      if (context?.previousFieldWeldsList) {
        context.previousFieldWeldsList.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
      toast.error(`Failed to assign welder: ${error.message}`, {
        description: 'The welder assignment was not saved. Please try again.',
        action: {
          label: 'Retry',
          onClick: () => {
            // Retry by invalidating queries to trigger refetch
            queryClient.invalidateQueries({ queryKey: ['field-weld', payload.field_weld_id] })
            queryClient.invalidateQueries({ queryKey: ['field-welds'] })
          },
        },
      })
    },
    onSuccess: (_data, _payload) => {
      // Invalidate caches (including Weld Log table)
      queryClient.invalidateQueries({ queryKey: ['field-weld'] })
      queryClient.invalidateQueries({ queryKey: ['field-welds'] }) // For Weld Log table
      queryClient.invalidateQueries({ queryKey: ['components'] })
      queryClient.invalidateQueries({ queryKey: ['drawings-with-progress'] })
      queryClient.invalidateQueries({ queryKey: ['package-readiness'] }) // Package stats reflect weld completion

      toast.success('Welder assigned successfully')
    },
  })
}
