/**
 * useRecordNDE Hook (Feature 014 - Field Weld QC)
 * Mutation hook for recording NDE results
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface RecordNDEPayload {
  field_weld_id: string
  nde_type: 'RT' | 'UT' | 'PT' | 'MT'
  nde_result: 'PASS' | 'FAIL' | 'PENDING'
  nde_date: string
  nde_notes?: string
}

/**
 * Mutation hook: Record NDE result with automatic status and progress updates
 */
export function useRecordNDE() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: RecordNDEPayload) => {
      // Get field weld to find component_id
      const { data: fieldWeld, error: fetchError } = await supabase
        .from('field_welds')
        .select('component_id')
        .eq('id', payload.field_weld_id)
        .single()

      if (fetchError) {
        throw new Error(`Failed to fetch field weld: ${fetchError.message}`)
      }

      // Update field_weld with NDE result
      const { error: weldError } = await supabase
        .from('field_welds')
        .update({
          nde_type: payload.nde_type,
          nde_result: payload.nde_result,
          nde_date: payload.nde_date,
          nde_notes: payload.nde_notes || null,
          // Database trigger will handle rejection workflow on FAIL
          // status will be set to 'rejected' automatically
          status: payload.nde_result === 'PASS' ? 'accepted' : 'active',
        })
        .eq('id', payload.field_weld_id)

      if (weldError) {
        throw new Error(`Failed to record NDE: ${weldError.message}`)
      }

      // Update component progress based on result
      if (payload.nde_result === 'PASS') {
        // Mark "Accepted" milestone (100% complete)
        await supabase
          .from('components')
          .update({
            progress_state: {
              'Fit-up': true,
              'Weld Complete': true,
              'Accepted': true,
            },
            percent_complete: 100,
          })
          .eq('id', fieldWeld.component_id)
      }
      // Note: FAIL result is handled by database trigger which sets 100% and rejected status

      return { ...payload, component_id: fieldWeld.component_id }
    },
    onSuccess: (_data, payload) => {
      // Invalidate caches
      queryClient.invalidateQueries({ queryKey: ['field-weld'] })
      queryClient.invalidateQueries({ queryKey: ['components'] })
      queryClient.invalidateQueries({ queryKey: ['drawings-with-progress'] })

      if (payload.nde_result === 'PASS') {
        toast.success('NDE passed - Weld accepted')
      } else if (payload.nde_result === 'FAIL') {
        toast.warning('NDE failed - Weld rejected. Create repair weld?')
      } else {
        toast.info('NDE result recorded')
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to record NDE: ${error.message}`)
    },
  })
}
