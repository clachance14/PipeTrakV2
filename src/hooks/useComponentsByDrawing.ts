import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { formatIdentityKey } from '@/lib/formatIdentityKey'
import { cleanDescription } from '@/lib/cleanDescription'
import { calculateDuplicateCounts, createIdentityGroupKey } from '@/lib/calculateDuplicateCounts'
import { naturalCompare } from '@/lib/natural-sort'
import type { ComponentRow } from '@/types/drawing-table.types'

// Component types that should use BOM description display (sequence-based types).
// Pipe aggregates show size-only, spools show spool_id, field welds show weld_number —
// these MUST keep their existing formatIdentityKey behavior.
const DESCRIPTION_DISPLAY_TYPES = new Set([
  'valve', 'flange', 'support', 'fitting', 'instrument',
  'tubing', 'hose', 'misc_component',
])

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
        .order('component_type', { ascending: true })
        .order('identity_key->seq', { ascending: true })

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
        attributes: component.attributes as ComponentRow['attributes'],
        // Joined template
        template: component.progress_templates as unknown as ComponentRow['template'],
        // Computed fields
        identityDisplay: (() => {
          const type = component.component_type as ComponentRow['component_type']
          const identityKey = component.identity_key as unknown as ComponentRow['identity_key']
          const totalCount = counts.get(createIdentityGroupKey(identityKey))

          // Sequence-based types prefer BOM description over commodity code
          if (DESCRIPTION_DISPLAY_TYPES.has(type)) {
            const attrs = component.attributes as ComponentRow['attributes']
            const desc = cleanDescription(attrs?.description as string | null | undefined)
            if (desc) {
              return totalCount && totalCount > 1 ? `${desc} ${(identityKey as { seq?: number }).seq ?? ''} of ${totalCount}`.trimEnd() : desc
            }
          }

          return formatIdentityKey(identityKey, type, totalCount)
        })(),
        canUpdate: true, // TODO: Get from permissions hook
      }))

      // Apply natural sorting by identity display for proper alphanumeric order
      // (e.g., SPOOL1, SPOOL2, SPOOL3 instead of SPOOL1, SPOOL10, SPOOL2)
      const sortedComponents = components.sort((a, b) =>
        naturalCompare(a.identityDisplay, b.identityDisplay)
      )

      return sortedComponents
    },
    enabled: enabled && !!drawingId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}
