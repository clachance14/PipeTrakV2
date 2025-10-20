import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ProgressTemplate, ComponentType } from '@/types/drawing-table.types'

/**
 * Custom hook to fetch all progress templates (static configuration)
 *
 * Templates define the milestone workflow for each component type.
 * This data is static and cached indefinitely.
 *
 * @returns UseQueryResult containing Map<ComponentType, ProgressTemplate>
 */
export function useProgressTemplates() {
  return useQuery({
    queryKey: ['progress-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('progress_templates')
        .select('*')
        .order('component_type')

      if (error) throw error

      // Transform array to Map for O(1) lookup by component type
      const templatesMap = new Map<ComponentType, ProgressTemplate>()

      data.forEach((template) => {
        templatesMap.set(template.component_type as ComponentType, template as ProgressTemplate)
      })

      return templatesMap
    },
    staleTime: Infinity, // Templates are static, never refetch
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })
}
