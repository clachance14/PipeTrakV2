/**
 * useRetireFieldWeld Hook
 * Mutation hook for retiring (soft-deleting) a field weld
 * Uses RPC (retire_field_weld) which sets components.is_retired = true
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface RetireFieldWeldPayload {
  field_weld_id: string
  retire_reason: string
  user_id: string
}

export function useRetireFieldWeld() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: RetireFieldWeldPayload) => {
      const { error } = await supabase.rpc('retire_field_weld', {
        p_field_weld_id: payload.field_weld_id,
        p_retire_reason: payload.retire_reason,
        p_user_id: payload.user_id,
      })

      if (error) {
        throw new Error(error.message)
      }

      return { success: true }
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete weld: ${error.message}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-weld'] })
      queryClient.invalidateQueries({ queryKey: ['field-welds'] })
      queryClient.invalidateQueries({ queryKey: ['components'] })
      queryClient.invalidateQueries({ queryKey: ['drawings-with-progress'] })
      queryClient.invalidateQueries({ queryKey: ['package-readiness'] })
      queryClient.invalidateQueries({ queryKey: ['has-repair-weld'] })

      toast.success('Weld deleted successfully')
    },
  })
}
