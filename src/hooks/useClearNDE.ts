/**
 * useClearNDE Hook
 * Mutation hook for clearing NDE result via RPC with audit logging
 * Requires metadata with rollback reason
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { Json } from '@/types/database.types'

interface ClearNDEMetadata {
  rollback_reason: string
  rollback_reason_label: string
  rollback_details?: string
}

interface ClearNDEPayload {
  field_weld_id: string
  user_id: string
  metadata: ClearNDEMetadata
}

/**
 * Mutation hook: Clear NDE result via RPC
 * Blocks if repair weld exists
 * Requires metadata with rollback reason
 * Server-side reverts milestones and logs audit event
 */
export function useClearNDE() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: ClearNDEPayload) => {
      const metadataJson: Json = {
        rollback_reason: payload.metadata.rollback_reason,
        rollback_reason_label: payload.metadata.rollback_reason_label,
        rollback_details: payload.metadata.rollback_details,
      }

      const { error } = await supabase.rpc('clear_nde_result', {
        p_field_weld_id: payload.field_weld_id,
        p_user_id: payload.user_id,
        p_metadata: metadataJson,
      })

      if (error) {
        throw new Error(error.message)
      }

      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-weld'] })
      queryClient.invalidateQueries({ queryKey: ['field-welds'] })
      queryClient.invalidateQueries({ queryKey: ['components'] })
      queryClient.invalidateQueries({ queryKey: ['drawings-with-progress'] })
      queryClient.invalidateQueries({ queryKey: ['package-readiness'] })

      toast.success('NDE result cleared')
    },
    onError: (error: Error) => {
      toast.error(`Failed to clear NDE: ${error.message}`)
    },
  })
}
