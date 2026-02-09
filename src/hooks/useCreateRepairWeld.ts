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
      console.log('[useCreateRepairWeld] Starting with payload:', payload)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      if (!payload.drawing_id) {
        throw new Error('Drawing ID is required but was not provided')
      }

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
        .select('project_id, component_id, component:components!inner(progress_template_id, identity_key, area_id, system_id, test_package_id, manhour_weight)')
        .eq('id', payload.original_field_weld_id)
        .single()

      if (fetchError || !originalWeld) {
        console.error('[useCreateRepairWeld] Fetch error:', fetchError)
        throw new Error('Failed to fetch original weld')
      }

      // Get inherited fields from the original component
      const originalComponent = originalWeld.component as any
      const progressTemplateId = originalComponent?.progress_template_id
      const originalIdentityKey = originalComponent?.identity_key
      const originalWeldNumber = originalIdentityKey?.weld_number || 'UNKNOWN'

      console.log('[useCreateRepairWeld] Original weld data:', {
        project_id: originalWeld.project_id,
        component_id: originalWeld.component_id,
        progress_template_id: progressTemplateId,
        original_weld_number: originalWeldNumber,
        area_id: originalComponent?.area_id,
        system_id: originalComponent?.system_id,
        test_package_id: originalComponent?.test_package_id,
      })

      if (!progressTemplateId) {
        throw new Error('Progress template ID not found on original component')
      }

      // Create repair weld number: Original number + "." + repair attempt number
      // e.g., "W-001" becomes "W-001.1", "W-001.2", etc.
      const repairWeldNumber = `${originalWeldNumber}.${depth + 1}`

      const componentData = {
        project_id: originalWeld.project_id,
        drawing_id: payload.drawing_id,
        component_type: 'field_weld' as const,
        progress_template_id: progressTemplateId,
        identity_key: {
          weld_number: repairWeldNumber,
          repair_of: payload.original_field_weld_id,
        },
        area_id: originalComponent?.area_id ?? null,
        system_id: originalComponent?.system_id ?? null,
        test_package_id: originalComponent?.test_package_id ?? null,
        manhour_weight: originalComponent?.manhour_weight ?? 0,
        percent_complete: 0,
        current_milestones: {},
        created_by: user.id,
        last_updated_by: user.id,
      }
      console.log('[useCreateRepairWeld] Creating component with:', componentData)

      const { data: component, error: componentError } = await supabase
        .from('components')
        .insert(componentData)
        .select()
        .single()

      if (componentError) {
        console.error('[useCreateRepairWeld] Component creation error:', componentError)
        throw new Error(`Failed to create repair component: ${componentError.message || JSON.stringify(componentError)}`)
      }

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
      // Invalidate all related queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['field-weld'] })
      queryClient.invalidateQueries({ queryKey: ['field-welds'] })
      queryClient.invalidateQueries({ queryKey: ['components'] })
      queryClient.invalidateQueries({ queryKey: ['drawings-with-progress'] })

      console.log('[useCreateRepairWeld] Success! Repair weld created:', {
        component_id: data.component.id,
        field_weld_id: data.field_weld.id,
        drawing_id: data.component.drawing_id,
        weld_number: (data.component.identity_key as any)?.weld_number,
      })

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
