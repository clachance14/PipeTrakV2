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
      // Fetch drawings
      const { data: drawingsData, error: drawingsError } = await supabase
        .from('drawings')
        .select('*')
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

      // Create progress lookup map
      const progressMap = new Map(
        progressData?.map((p) => [p.drawing_id, p]) || []
      )

      // Merge drawings with progress data
      const drawings: DrawingRow[] = drawingsData.map((drawing) => {
        const progress = progressMap.get(drawing.id)
        return {
          id: drawing.id,
          project_id: drawing.project_id,
          drawing_no_norm: drawing.drawing_no_norm,
          drawing_no_raw: drawing.drawing_no_raw,
          title: drawing.title,
          rev: drawing.rev,
          is_retired: drawing.is_retired,
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
