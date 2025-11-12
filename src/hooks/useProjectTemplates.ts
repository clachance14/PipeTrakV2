/**
 * TanStack Query hook for project_progress_templates (Feature 026)
 * Fetches project-specific milestone weight templates
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

type ProjectTemplate = Database['public']['Tables']['project_progress_templates']['Row']

/**
 * Fetch project templates for a specific component type
 *
 * @param projectId - Project UUID
 * @param componentType - Component type (e.g., "Field Weld", "Spool")
 * @returns Query result with array of templates ordered by milestone_order
 */
export function useProjectTemplates(
  projectId: string,
  componentType?: string
): UseQueryResult<ProjectTemplate[], Error> {
  return useQuery({
    queryKey: componentType
      ? ['projectTemplates', projectId, componentType]
      : ['projectTemplates', projectId],
    queryFn: async () => {
      let query = supabase
        .from('project_progress_templates')
        .select('*')
        .eq('project_id', projectId)
        .order('milestone_order', { ascending: true })

      // Filter by component type if provided
      if (componentType) {
        query = query.eq('component_type', componentType)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    },
    staleTime: 5 * 60 * 1000, // 5 minutes (templates change infrequently)
    enabled: !!projectId && (componentType !== undefined ? !!componentType : true), // Disable if projectId or componentType is empty
  })
}
