import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { sortWeldSizes } from '@/lib/sortWeldSizes'
import type { WeldAttributes } from './useDistinctWeldAttributes'

/**
 * Hook to fetch distinct weld attribute values for field welds on a specific drawing.
 * Joins through components table since field_welds doesn't have drawing_id directly.
 *
 * @param drawingId - The drawing ID to query (null to disable)
 * @returns Distinct values for weld_size, spec, schedule, and base_metal for that drawing
 */
export function useWeldAttributesByDrawing(drawingId: string | null) {
  return useQuery<WeldAttributes>({
    queryKey: ['field-welds', 'by-drawing', drawingId, 'attributes'],
    queryFn: async () => {
      // Join through components to get drawing_id
      // drawingId is guaranteed non-null here because enabled: !!drawingId
      const { data, error } = await supabase
        .from('field_welds')
        .select(`
          weld_size, spec, schedule, base_metal,
          component:components!inner(drawing_id)
        `)
        .eq('component.drawing_id', drawingId!)

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
        specs: [...specs].sort(),
        schedules: [...schedules].sort(),
        baseMetals: [...baseMetals].sort(),
      }
    },
    enabled: !!drawingId,
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}
