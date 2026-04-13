/**
 * useRetireComponents Hook
 * Mutation hook for retiring (soft-deleting) one or more components
 * Uses RPC (retire_components) which sets components.is_retired = true
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface RetireComponentsPayload {
  component_ids: string[]
  user_id: string
  reason?: string
}

export function useRetireComponents() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: RetireComponentsPayload) => {
      const { data, error } = await supabase.rpc('retire_components', {
        p_component_ids: payload.component_ids,
        p_user_id: payload.user_id,
        p_reason: payload.reason ?? null,
      })
      if (error) throw new Error(error.message)
      return data
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete component(s): ${error.message}`)
    },
    onSuccess: (_data, variables) => {
      const count = variables.component_ids.length
      queryClient.invalidateQueries({ queryKey: ['components'] })
      queryClient.invalidateQueries({ queryKey: ['drawing-progress'] })
      queryClient.invalidateQueries({ queryKey: ['drawings-with-progress'] })
      queryClient.invalidateQueries({ queryKey: ['package-readiness'] })
      queryClient.invalidateQueries({ queryKey: ['manhour-progress'] })
      toast.success(`${count} component(s) deleted`)
    },
  })
}
