/**
 * useUpdateComponentIdentity Hook
 * Mutation hook for updating identity_key and attribute fields on a component
 * and its siblings via the update_component_identity RPC.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface UpdateComponentIdentityPayload {
  component_id: string
  identity_changes: Record<string, unknown>
  attribute_changes: Record<string, unknown>
  user_id: string
}

export function useUpdateComponentIdentity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: UpdateComponentIdentityPayload) => {
      const { data, error } = await supabase.rpc('update_component_identity', {
        p_component_id: payload.component_id,
        p_identity_changes: payload.identity_changes,
        p_attribute_changes: payload.attribute_changes,
        p_user_id: payload.user_id,
      })

      if (error) {
        throw new Error(error.message)
      }

      return data
    },
    onError: (error: Error) => {
      toast.error(`Failed to update component: ${error.message}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['components'] })
      queryClient.invalidateQueries({ queryKey: ['drawing-progress'] })
      queryClient.invalidateQueries({ queryKey: ['drawings-with-progress'] })
      queryClient.invalidateQueries({ queryKey: ['package-readiness'] })
      queryClient.invalidateQueries({ queryKey: ['manhour-progress'] })
      toast.success('Component updated successfully')
    },
  })
}
