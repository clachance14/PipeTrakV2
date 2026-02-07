/**
 * useReassignWeldDrawing Hook
 * Mutation hook for reassigning a field weld to a different drawing.
 * Uses RPC (reassign_field_weld_drawing) for audit logging.
 * Only allowed for pre-weld state (no welder assigned).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface ReassignWeldDrawingPayload {
  field_weld_id: string
  new_drawing_id: string
  user_id: string
}

export function useReassignWeldDrawing() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: ReassignWeldDrawingPayload) => {
      const { error } = await supabase.rpc('reassign_field_weld_drawing', {
        p_field_weld_id: payload.field_weld_id,
        p_new_drawing_id: payload.new_drawing_id,
        p_user_id: payload.user_id,
      })

      if (error) {
        throw new Error(error.message)
      }

      return { success: true }
    },
    onError: (error: Error) => {
      if (error.message.includes('welder has already been assigned')) {
        toast.error('Cannot reassign drawing', {
          description: 'A welder has already been assigned to this weld. Drawing can only be changed before welder assignment.',
        })
      } else if (error.message.includes('Duplicate weld number')) {
        toast.error('Duplicate weld number', {
          description: error.message,
        })
      } else {
        toast.error(`Failed to reassign drawing: ${error.message}`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-weld'] })
      queryClient.invalidateQueries({ queryKey: ['field-welds'] })
      queryClient.invalidateQueries({ queryKey: ['components'] })
      queryClient.invalidateQueries({ queryKey: ['drawings-with-progress'] })
      queryClient.invalidateQueries({ queryKey: ['package-readiness'] })

      toast.success('Drawing reassigned')
    },
  })
}
