import { useQueries } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { formatIdentityKey } from '@/lib/formatIdentityKey'
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
            progress_templates!inner(*)
          `)
          .eq('drawing_id', drawingId)
          .eq('is_retired', false)
          .order('identity_key->seq')

        if (error) throw error

        // Transform data to ComponentRow with computed fields
        const components: ComponentRow[] = data.map((component) => ({
          id: component.id,
          project_id: component.project_id,
          drawing_id: component.drawing_id,
          component_type: component.component_type as any, // Type assertion for component_type
          identity_key: component.identity_key as any, // Type assertion for identity_key
          current_milestones: component.current_milestones as any,
          percent_complete: component.percent_complete,
          created_at: component.created_at,
          last_updated_at: component.last_updated_at,
          last_updated_by: component.last_updated_by,
          is_retired: component.is_retired,
          // Joined template
          template: component.progress_templates as any,
          // Computed fields
          identityDisplay: formatIdentityKey(
            component.identity_key as any,
            component.component_type
          ),
          canUpdate: true, // TODO: Get from permissions hook
        }))

        return components
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
