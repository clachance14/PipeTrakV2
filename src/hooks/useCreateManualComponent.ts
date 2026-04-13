/**
 * useCreateManualComponent Hook
 * Mutation hook for creating a manual component on a drawing
 * Uses RPC (create_manual_component) which inserts a new component record
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { ComponentType } from '@/types/drawing-table.types'

interface CreateManualComponentPayload {
  drawing_id: string
  project_id: string
  component_type: ComponentType
  identity: Record<string, unknown>
  attributes: Record<string, unknown>
  user_id: string
}

export function useCreateManualComponent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreateManualComponentPayload) => {
      const { data, error } = await supabase.rpc('create_manual_component', {
        p_drawing_id: payload.drawing_id,
        p_project_id: payload.project_id,
        p_component_type: payload.component_type,
        p_identity: payload.identity,
        p_attributes: payload.attributes,
        p_user_id: payload.user_id,
      })

      if (error) {
        throw new Error(error.message)
      }

      return data
    },
    onError: (error: Error) => {
      toast.error(`Failed to create component: ${error.message}`)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['components'] })
      queryClient.invalidateQueries({ queryKey: ['drawing-progress'] })
      queryClient.invalidateQueries({ queryKey: ['drawings-with-progress'] })
      queryClient.invalidateQueries({ queryKey: ['package-readiness'] })
      queryClient.invalidateQueries({ queryKey: ['manhour-progress'] })

      const count = (data as Record<string, unknown>)?.components_created ?? 1
      toast.success(`${count} component(s) created`)
    },
  })
}
