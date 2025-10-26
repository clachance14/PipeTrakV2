/**
 * useFieldWeld Hook (Feature 014 - Field Weld QC)
 * Query hook for single field weld with joined welder info
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface FieldWeld {
  id: string
  component_id: string
  project_id: string
  weld_type: 'BW' | 'SW' | 'FW' | 'TW'
  weld_size: string | null
  schedule: string | null
  base_metal: string | null
  spec: string | null
  welder_id: string | null
  date_welded: string | null
  nde_required: boolean
  nde_type: string | null
  nde_result: 'PASS' | 'FAIL' | 'PENDING' | null
  nde_date: string | null
  nde_notes: string | null
  status: 'active' | 'accepted' | 'rejected'
  original_weld_id: string | null
  is_repair: boolean
  created_at: string
  updated_at: string
  welder?: {
    stencil: string
    name: string
  }
  identityDisplay: string
}

interface UseFieldWeldOptions {
  componentId: string
  enabled?: boolean
}

/**
 * Query hook: Get field weld by component_id with joined welder info
 */
export function useFieldWeld({ componentId, enabled = true }: UseFieldWeldOptions) {
  return useQuery({
    queryKey: ['field-weld', componentId],
    queryFn: async (): Promise<FieldWeld | null> => {
      const { data: fieldWeld, error } = await supabase
        .from('field_welds')
        .select(`
          *,
          welder:welders(stencil, name)
        `)
        .eq('component_id', componentId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null
        }
        throw new Error(`Failed to fetch field weld: ${error.message}`)
      }

      // Fetch component for identity key
      const { data: component, error: componentError } = await supabase
        .from('components')
        .select('identity_key, component_type')
        .eq('id', componentId)
        .single()

      if (componentError) {
        throw new Error(`Failed to fetch component: ${componentError.message}`)
      }

      // Format identity display
      const identityKey = component.identity_key as Record<string, any>
      const identityDisplay = formatIdentityDisplay(identityKey)

      return {
        ...fieldWeld,
        weld_type: fieldWeld.weld_type as 'BW' | 'SW' | 'FW' | 'TW',
        nde_result: fieldWeld.nde_result as 'PASS' | 'FAIL' | 'PENDING' | null,
        status: fieldWeld.status as 'active' | 'accepted' | 'rejected',
        nde_required: fieldWeld.nde_required ?? true,
        is_repair: fieldWeld.is_repair ?? false,
        welder: fieldWeld.welder || undefined,
        identityDisplay,
      }
    },
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

function formatIdentityDisplay(identityKey: Record<string, any>): string {
  if (identityKey.weld_id) {
    return `Weld ${identityKey.weld_id}`
  }
  return 'Unknown'
}
