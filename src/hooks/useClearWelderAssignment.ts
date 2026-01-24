/**
 * useClearWelderAssignment Hook
 * Mutation hook for clearing welder assignment from a field weld
 * Used when rolling back the "Weld Complete" milestone or manually clearing via Edit Weld dialog
 * Now uses RPC for audit logging with optional rollback reason
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { Json } from '@/types/database.types'

interface ClearWelderAssignmentMetadata {
  rollback_reason: string
  rollback_reason_label: string
  rollback_details?: string
}

interface ClearWelderAssignmentPayload {
  field_weld_id: string
  user_id: string
  metadata?: ClearWelderAssignmentMetadata
}

/**
 * Mutation hook: Clear welder assignment (set welder_id and date_welded to null)
 * Used when a weld is marked incomplete after being completed, or manually cleared
 * Records audit event in field_weld_events table via RPC
 * Blocks if NDE results exist
 */
export function useClearWelderAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: ClearWelderAssignmentPayload): Promise<{ success: boolean }> => {
      // Convert metadata to Json type for RPC
      const metadataJson: Json | null = payload.metadata
        ? {
            rollback_reason: payload.metadata.rollback_reason,
            rollback_reason_label: payload.metadata.rollback_reason_label,
            rollback_details: payload.metadata.rollback_details,
          }
        : null

      // Call RPC for audit logging
      const { error } = await supabase.rpc('clear_weld_assignment', {
        p_field_weld_id: payload.field_weld_id,
        p_user_id: payload.user_id,
        p_metadata: metadataJson,
      })

      if (error) {
        throw new Error(error.message)
      }

      // RPC returns { success: true }
      return { success: true }
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
    onSuccess: (_data, payload) => {
      // Invalidate caches to refresh UI
      queryClient.invalidateQueries({ queryKey: ['field-weld'] })
      queryClient.invalidateQueries({ queryKey: ['field-welds'] })
      queryClient.invalidateQueries({ queryKey: ['components'] })
      queryClient.invalidateQueries({ queryKey: ['drawings-with-progress'] })
      queryClient.invalidateQueries({ queryKey: ['package-readiness'] })

      // Show success toast only when called with metadata (manual clear)
      // Automatic rollback via milestone change has its own feedback
      if (payload.metadata) {
        toast.success('Welder assignment cleared')
      }
    },
  })
}
