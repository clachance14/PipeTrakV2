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
        const progressTemplate: ProgressTemplate = {
          id: template.id,
          component_type: template.component_type as ComponentType,
          version: template.version,
          workflow_type: template.workflow_type as 'discrete' | 'quantity' | 'hybrid',
          milestones_config: template.milestones_config as any, // Json to MilestoneConfig[] conversion
        }
        templatesMap.set(progressTemplate.component_type, progressTemplate)
      })

      return templatesMap
    },
    staleTime: Infinity, // Templates are static, never refetch
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })
}
