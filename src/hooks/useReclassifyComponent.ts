/**
 * useReclassifyComponent Hook
 * Mutation hook for reclassifying a component to a different type
 * Uses RPC (reclassify_component) which updates component_type and resets milestones
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { ComponentType } from '@/types/drawing-table.types'

interface ReclassifyComponentPayload {
  component_id: string
  new_type: ComponentType
  user_id: string
}

export function useReclassifyComponent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: ReclassifyComponentPayload) => {
      const { data, error } = await supabase.rpc('reclassify_component', {
        p_component_id: payload.component_id,
        p_new_type: payload.new_type,
        p_user_id: payload.user_id,
      })
      if (error) throw new Error(error.message)
      return data
    },
    onError: (error: Error) => {
      toast.error(`Failed to reclassify component: ${error.message}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['components'] })
      queryClient.invalidateQueries({ queryKey: ['drawing-progress'] })
      queryClient.invalidateQueries({ queryKey: ['drawings-with-progress'] })
      queryClient.invalidateQueries({ queryKey: ['package-readiness'] })
      queryClient.invalidateQueries({ queryKey: ['manhour-progress'] })
      toast.success('Component reclassified successfully')
    },
  })
}
