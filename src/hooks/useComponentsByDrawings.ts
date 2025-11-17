import { useQueries } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { formatIdentityKey } from '@/lib/formatIdentityKey'
import { formatIdentityKey as formatFieldWeldKey } from '@/lib/field-weld-utils'
import { calculateDuplicateCounts, createIdentityGroupKey } from '@/lib/calculateDuplicateCounts'
import { naturalCompare } from '@/lib/natural-sort'
import type { ComponentRow } from '@/types/drawing-table.types'

/**
 * Custom hook to lazily load components for multiple drawings
 *
 * Uses useQueries to fetch components for an array of drawing IDs
 * without violating React's Rules of Hooks.
 *
 * @param drawingIds - Array of drawing UUIDs to fetch components for
 * @returns Map of drawing ID to ComponentRow[]
 */
export function useComponentsByDrawings(drawingIds: string[]) {
  // Use useQueries to fetch components for each drawing
  const queries = useQueries({
    queries: drawingIds.map((drawingId) => ({
      queryKey: ['components', { drawing_id: drawingId }],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('components')
          .select(`
            *,
            progress_templates!inner(*),
            areas(id, name),
            systems(id, name),
            test_packages(id, name)
          `)
          .eq('drawing_id', drawingId)
          .eq('is_retired', false)
          .order('component_type', { ascending: true })
          .order('identity_key->seq', { ascending: true })

        if (error) throw error

        // Calculate duplicate counts for all components
        const counts = calculateDuplicateCounts(data as any)

        // Transform data to ComponentRow with computed fields
        const components: ComponentRow[] = data.map((component: any) => {
          // Validate component ID format
          if (!component.id || typeof component.id !== 'string' || component.id.includes(':')) {
            console.error('[useComponentsByDrawings] Invalid component ID detected from database:', {
              component_id: component.id,
              component_type: component.component_type,
              drawing_id: drawingId,
              identity_key: component.identity_key
            })
          }

          return {
            id: component.id,
            project_id: component.project_id,
            drawing_id: component.drawing_id,
            component_type: component.component_type as any, // Type assertion for component_type
            identity_key: component.identity_key as any, // Type assertion for identity_key
            current_milestones: component.current_milestones as any,
            attributes: component.attributes as any, // Include attributes for aggregate threaded pipe (total_linear_feet)
            percent_complete: component.percent_complete,
            created_at: component.created_at,
            last_updated_at: component.last_updated_at,
            last_updated_by: component.last_updated_by,
            is_retired: component.is_retired,
            // Metadata fields (from joined tables)
            area: component.areas,
            system: component.systems,
            test_package: component.test_packages,
            // Joined template
            template: component.progress_templates as any,
            // Computed fields
            identityDisplay: component.component_type === 'field_weld'
              ? formatFieldWeldKey(
                  component.identity_key as any,
                  component.component_type as any
                )
              : formatIdentityKey(
                  component.identity_key as any,
                  component.component_type as any,
                  counts.get(createIdentityGroupKey(component.identity_key))
                ),
            canUpdate: true, // TODO: Get from permissions hook
          }
        })

        // Apply natural sorting by identity display for proper alphanumeric order
        // (e.g., SPOOL1, SPOOL2, SPOOL3 instead of SPOOL1, SPOOL10, SPOOL2)
        const sortedComponents = components.sort((a, b) =>
          naturalCompare(a.identityDisplay, b.identityDisplay)
        )

        return sortedComponents
      },
      staleTime: 2 * 60 * 1000, // 2 minutes
      enabled: !!drawingId,
    })),
  })

  // Build a map of drawing ID to components
  const componentsMap = new Map<string, ComponentRow[]>()
  queries.forEach((query, index) => {
    const drawingId = drawingIds[index]
    if (query.data && drawingId) {
      componentsMap.set(drawingId, query.data)
    }
  })

  // Check if any queries are loading
  const isLoading = queries.some((q) => q.isLoading)
  const isError = queries.some((q) => q.isError)

  return {
    componentsMap,
    isLoading,
    isError,
  }
}
