/**
 * useUpdateWeldSpecs Hook
 * Mutation hook for updating weld specification fields
 * Uses RPC (update_field_weld_specs) for audit logging
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface UpdateWeldSpecsPayload {
  field_weld_id: string
  weld_type: string
  weld_size: string | null
  schedule: string | null
  base_metal: string | null
  spec: string | null
  user_id: string
}

export function useUpdateWeldSpecs() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: UpdateWeldSpecsPayload) => {
      const { error } = await supabase.rpc('update_field_weld_specs', {
        p_field_weld_id: payload.field_weld_id,
        p_weld_type: payload.weld_type,
        p_weld_size: payload.weld_size ?? '',
        p_schedule: payload.schedule ?? '',
        p_base_metal: payload.base_metal ?? '',
        p_spec: payload.spec ?? '',
        p_user_id: payload.user_id,
      })

      if (error) {
        throw new Error(`Failed to update weld specifications: ${error.message}`)
      }

      return { success: true }
    },
    onError: (error: Error) => {
      toast.error(`Failed to update specs: ${error.message}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-weld'] })
      queryClient.invalidateQueries({ queryKey: ['field-welds'] })
      queryClient.invalidateQueries({ queryKey: ['components'] })
      queryClient.invalidateQueries({ queryKey: ['drawings-with-progress'] })
      queryClient.invalidateQueries({ queryKey: ['package-readiness'] })

      toast.success('Weld specifications updated')
    },
  })
}
