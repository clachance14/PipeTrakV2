import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { formatIdentityKey } from '@/lib/formatIdentityKey'
import { calculateDuplicateCounts, createIdentityGroupKey } from '@/lib/calculateDuplicateCounts'
import type { ComponentRow } from '@/types/drawing-table.types'

/**
 * Custom hook to lazily load components for a specific drawing
 *
 * Only fetches when enabled=true and drawingId is not null.
 * Includes joined progress template and computed identityDisplay.
 *
 * @param drawingId - UUID of the drawing (nullable)
 * @param enabled - Control lazy loading (only fetch when true)
 * @returns UseQueryResult containing ComponentRow[]
 */
export function useComponentsByDrawing(
  drawingId: string | null,
  enabled: boolean
) {
  return useQuery({
    queryKey: ['components', { drawing_id: drawingId }],
    queryFn: async () => {
      if (!drawingId) {
        return []
      }

      const { data, error } = await supabase
        .from('components')
        .select(`
          *,
          progress_templates!inner(*)
        `)
        .eq('drawing_id', drawingId)
        .eq('is_retired', false)
        .order('identity_key->seq')

      if (error) throw error

      // Calculate duplicate counts for identity numbering
      const counts = calculateDuplicateCounts(data as any)

      // Transform data to ComponentRow with computed fields
      const components: ComponentRow[] = data.map((component) => ({
        id: component.id,
        project_id: component.project_id,
        drawing_id: component.drawing_id,
        component_type: component.component_type as ComponentRow['component_type'],
        identity_key: component.identity_key as unknown as ComponentRow['identity_key'],
        current_milestones: component.current_milestones as unknown as ComponentRow['current_milestones'],
        percent_complete: component.percent_complete,
        created_at: component.created_at,
        last_updated_at: component.last_updated_at,
        last_updated_by: component.last_updated_by,
        is_retired: component.is_retired,
        // Joined template
        template: component.progress_templates as unknown as ComponentRow['template'],
        // Computed fields
        identityDisplay: formatIdentityKey(
          component.identity_key as unknown as ComponentRow['identity_key'],
          component.component_type as ComponentRow['component_type'],
          counts.get(createIdentityGroupKey(component.identity_key as unknown as ComponentRow['identity_key']))
        ),
        canUpdate: true, // TODO: Get from permissions hook
      }))

      return components
    },
    enabled: enabled && !!drawingId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}
