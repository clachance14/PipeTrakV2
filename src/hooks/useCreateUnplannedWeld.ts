/**
 * Hook: useCreateUnplannedWeld
 *
 * Feature: 028-add-unplanned-welds
 * Date: 2025-11-17
 *
 * TanStack Query mutation hook for creating unplanned field welds via RPC.
 * Handles atomic creation of component + field_weld records with metadata inheritance.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface CreateUnplannedWeldParams {
  projectId: string
  drawingId: string
  weldNumber: string
  weldType: 'BW' | 'SW' | 'FW' | 'TW'
  weldSize: string
  spec: string
  schedule?: string
  baseMetal?: string
  notes?: string
}

export interface CreateUnplannedWeldResponse {
  field_weld: {
    id: string
    component_id: string
    project_id: string
    weld_type: string
    weld_size: string
    spec: string
    schedule: string | null
    base_metal: string | null
    notes: string | null
    status: string
    created_by: string
    created_at: string
  }
  component: {
    id: string
    project_id: string
    drawing_id: string
    component_type: string
    identity_key: { weld_number: string }
    area_id: string | null
    system_id: string | null
    test_package_id: string | null
    percent_complete: number
    created_by: string
  }
}

export function useCreateUnplannedWeld() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: CreateUnplannedWeldParams): Promise<CreateUnplannedWeldResponse> => {
      const { data, error } = await supabase.rpc('create_unplanned_weld', {
        p_project_id: params.projectId,
        p_drawing_id: params.drawingId,
        p_weld_number: params.weldNumber,
        p_weld_type: params.weldType,
        p_weld_size: params.weldSize,
        p_spec: params.spec,
        p_schedule: params.schedule,
        p_base_metal: params.baseMetal,
        p_notes: params.notes
      })

      if (error) {
        throw new Error(error.message || 'Failed to create unplanned weld')
      }

      if (!data) {
        throw new Error('No data returned from create_unplanned_weld')
      }

      return data as unknown as CreateUnplannedWeldResponse
    },
    onSuccess: async () => {
      // Refresh materialized views to ensure drawing Items count is immediately updated
      await supabase.rpc('refresh_materialized_views')

      // Invalidate field-welds queries to refresh the table
      queryClient.invalidateQueries({ queryKey: ['field-welds'] })
      // Also invalidate components queries in case they're displayed elsewhere
      queryClient.invalidateQueries({ queryKey: ['components'] })
      // Invalidate drawings-with-progress to update the Items count
      queryClient.invalidateQueries({ queryKey: ['drawings-with-progress'] })
    }
  })
}
