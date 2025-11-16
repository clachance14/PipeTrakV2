import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { DrawingRow } from '@/types/drawing-table.types'

/**
 * Custom hook to fetch drawings with aggregated progress metrics
 *
 * Joins drawings table with mv_drawing_progress materialized view
 * to get real-time progress summaries.
 *
 * @param projectId - UUID of the project
 * @returns UseQueryResult containing DrawingRow[]
 */
export function useDrawingsWithProgress(projectId: string) {
  return useQuery({
    queryKey: ['drawings-with-progress', { project_id: projectId }],
    queryFn: async () => {
      // Fetch drawings with metadata joins
      const { data: drawingsData, error: drawingsError } = await supabase
        .from('drawings')
        .select(`
          *,
          area:areas(id, name),
          system:systems(id, name),
          test_package:test_packages(id, name)
        `)
        .eq('project_id', projectId)
        .eq('is_retired', false)
        .order('drawing_no_norm')

      if (drawingsError) throw drawingsError

      // Fetch progress data from materialized view
      const { data: progressData, error: progressError } = await supabase
        .from('mv_drawing_progress')
        .select('*')
        .eq('project_id', projectId)

      if (progressError) throw progressError

      // Fetch most common spec per drawing
      // Use RPC to execute custom SQL for finding mode (most frequent value)
      const { data: specData, error: specError } = await supabase.rpc(
        'get_most_common_spec_per_drawing',
        { p_project_id: projectId }
      )

      if (specError) {
        // If RPC doesn't exist yet, continue without spec data
        // This allows gradual rollout without breaking existing functionality
        console.warn('Could not fetch spec data:', specError)
      }

      // Create progress lookup map
      const progressMap = new Map(
        progressData?.map((p) => [p.drawing_id, p]) || []
      )

      // Create spec lookup map - handle both array and non-array responses
      const specArray = Array.isArray(specData) ? specData : []
      const specMap = new Map<string, string | null>(
        specArray.map((s: { drawing_id: string; most_common_spec: string | null }) => [
          s.drawing_id,
          s.most_common_spec,
        ])
      )

      // Merge drawings with progress data and spec data
      const drawings: DrawingRow[] = drawingsData.map((drawing) => {
        const progress = progressMap.get(drawing.id)
        const spec = specMap.get(drawing.id) ?? null
        return {
          id: drawing.id,
          project_id: drawing.project_id,
          drawing_no_norm: drawing.drawing_no_norm,
          drawing_no_raw: drawing.drawing_no_raw,
          title: drawing.title,
          rev: drawing.rev,
          is_retired: drawing.is_retired,
          area: drawing.area || null,
          system: drawing.system || null,
          test_package: drawing.test_package || null,
          spec,
          total_components: progress?.total_components || 0,
          completed_components: progress?.completed_components || 0,
          avg_percent_complete: progress?.avg_percent_complete || 0,
        }
      })

      return drawings
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
  })
}
