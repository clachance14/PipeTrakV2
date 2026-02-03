/**
 * useUpdateNDE Hook
 * Mutation hook for updating an existing NDE result via RPC with audit logging
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface UpdateNDEPayload {
  field_weld_id: string
  nde_type: 'RT' | 'UT' | 'PT' | 'MT' | 'VT'
  nde_result: 'PASS' | 'FAIL' | 'PENDING'
  nde_date: string
  nde_notes?: string
  user_id: string
}

/**
 * Mutation hook: Update existing NDE result via RPC
 * Blocks changing FAIL result if repair weld exists
 * Server-side handles milestone transitions and audit events
 */
export function useUpdateNDE() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: UpdateNDEPayload) => {
      const { error } = await supabase.rpc('update_nde_result', {
        p_field_weld_id: payload.field_weld_id,
        p_nde_type: payload.nde_type,
        p_nde_result: payload.nde_result,
        p_nde_date: payload.nde_date,
        p_nde_notes: payload.nde_notes || undefined,
        p_user_id: payload.user_id,
      })

      if (error) {
        throw new Error(error.message)
      }

      return payload
    },
    onSuccess: (_data, payload) => {
      queryClient.invalidateQueries({ queryKey: ['field-weld'] })
      queryClient.invalidateQueries({ queryKey: ['field-welds'] })
      queryClient.invalidateQueries({ queryKey: ['components'] })
      queryClient.invalidateQueries({ queryKey: ['drawings-with-progress'] })
      queryClient.invalidateQueries({ queryKey: ['package-readiness'] })

      if (payload.nde_result === 'PASS') {
        toast.success('NDE updated - Weld accepted')
      } else if (payload.nde_result === 'FAIL') {
        toast.warning('NDE updated - Weld rejected')
      } else {
        toast.success('NDE result updated')
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to update NDE: ${error.message}`)
    },
  })
}
