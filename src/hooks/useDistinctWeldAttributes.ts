import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { sortWeldSizes } from '@/lib/sortWeldSizes'

export interface WeldAttributes {
  weldSizes: string[]
  specs: string[]
  schedules: string[]
  baseMetals: string[]
}

/**
 * Hook to fetch distinct weld attribute values across all field welds in a project.
 * Used as a fallback when the selected drawing has no existing welds.
 *
 * @param projectId - The project ID to query
 * @returns Distinct values for weld_size, spec, schedule, and base_metal
 */
export function useDistinctWeldAttributes(projectId: string) {
  return useQuery<WeldAttributes>({
    queryKey: ['field-welds', projectId, 'distinct-attributes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('field_welds')
        .select('weld_size, spec, schedule, base_metal')
        .eq('project_id', projectId)

      if (error) throw error

      // Extract unique non-null values for each field
      const weldSizes = [...new Set(
        data?.map(r => r.weld_size).filter((v): v is string => Boolean(v)) ?? []
      )]
      const specs = [...new Set(
        data?.map(r => r.spec).filter((v): v is string => Boolean(v)) ?? []
      )]
      const schedules = [...new Set(
        data?.map(r => r.schedule).filter((v): v is string => Boolean(v)) ?? []
      )]
      const baseMetals = [...new Set(
        data?.map(r => r.base_metal).filter((v): v is string => Boolean(v)) ?? []
      )]

      return {
        weldSizes: sortWeldSizes(weldSizes),
        specs: specs.sort(),
        schedules: schedules.sort(),
        baseMetals: baseMetals.sort(),
      }
    },
    enabled: !!projectId,
    staleTime: 1 * 60 * 1000, // 1 minute (shorter for fresh data after creating welds)
  })
}
