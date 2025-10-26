/**
 * useCreateRepairWeld Hook (Feature 014 - Field Weld QC)
 * Mutation hook for creating repair welds after NDE failure
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface WeldSpecs {
  weld_type: 'BW' | 'SW' | 'FW' | 'TW'
  weld_size?: string
  schedule?: string
  base_metal?: string
  spec?: string
}

interface CreateRepairWeldPayload {
  original_field_weld_id: string
  drawing_id: string
  weld_specs: WeldSpecs
}

export function useCreateRepairWeld() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreateRepairWeldPayload) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Validate repair chain depth before creating repair (CHK002)
      let depth = 0
      let currentId: string | null = payload.original_field_weld_id

      while (currentId && depth < 10) {
        const result: { data: { original_weld_id: string | null } | null; error: any } = await supabase
          .from('field_welds')
          .select('original_weld_id')
          .eq('id', currentId)
          .single()

        if (result.error || !result.data) break // Orphaned repair or missing weld

        currentId = result.data.original_weld_id
        depth++
      }

      if (depth >= 10) {
        throw new Error(
          'Maximum repair chain depth (10) exceeded. Engineering review required before proceeding.'
        )
      }

      const { data: originalWeld, error: fetchError } = await supabase
        .from('field_welds')
        .select('project_id, component_id, component:components!inner(progress_template_id)')
        .eq('id', payload.original_field_weld_id)
        .single()

      if (fetchError || !originalWeld) throw new Error('Failed to fetch original weld')

      // Get the progress_template_id from the original component
      const progressTemplateId = (originalWeld.component as any)?.progress_template_id

      const { data: component, error: componentError } = await supabase
        .from('components')
        .insert({
          project_id: originalWeld.project_id,
          drawing_id: payload.drawing_id,
          component_type: 'field_weld',
          progress_template_id: progressTemplateId,
          identity_key: {
            weld_id: 'REPAIR-' + payload.original_field_weld_id.substring(0, 8),
            repair_of: payload.original_field_weld_id,
          },
          percent_complete: 0,
          current_milestones: {},
          created_by: user.id,
        })
        .select()
        .single()

      if (componentError) throw new Error('Failed to create repair component')

      const { data: fieldWeld, error: fieldWeldError } = await supabase
        .from('field_welds')
        .insert({
          component_id: component.id,
          project_id: originalWeld.project_id,
          weld_type: payload.weld_specs.weld_type,
          weld_size: payload.weld_specs.weld_size || null,
          schedule: payload.weld_specs.schedule || null,
          base_metal: payload.weld_specs.base_metal || null,
          spec: payload.weld_specs.spec || null,
          original_weld_id: payload.original_field_weld_id,
          status: 'active',
          created_by: user.id,
        })
        .select()
        .single()

      if (fieldWeldError) {
        await supabase.from('components').delete().eq('id', component.id)
        throw new Error('Failed to create repair weld')
      }

      return { component, field_weld: fieldWeld, depth }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['field-weld'] })
      queryClient.invalidateQueries({ queryKey: ['components'] })
      queryClient.invalidateQueries({ queryKey: ['drawings-with-progress'] })

      // Show depth info in toast for awareness
      const depthMessage = data.depth > 0
        ? ` (Repair attempt #${data.depth + 1})`
        : ''
      toast.success(`Repair weld created${depthMessage}`)
    },
    onError: (error: Error) => {
      toast.error('Failed to create repair weld: ' + error.message)
    },
  })
}
