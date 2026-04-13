import { useEffect, useCallback, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { DrawingRow } from '@/types/drawing-table.types'
import { normalizeSpec } from '@/lib/csv/normalize-spec'

/**
 * Custom hook to fetch drawings with aggregated progress metrics
 *
 * Joins drawings table with mv_drawing_progress materialized view
 * to get real-time progress summaries. Subscribes to Realtime for
 * live updates when drawings are inserted or processing completes.
 *
 * @param projectId - UUID of the project
 * @returns UseQueryResult containing DrawingRow[]
 */
export function useDrawingsWithProgress(projectId: string) {
  const queryClient = useQueryClient()
  const channelRef = useRef<RealtimeChannel | null>(null)

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['drawings-with-progress', { project_id: projectId }] })
  }, [queryClient, projectId])

  // Subscribe to Realtime changes on drawings for this project
  useEffect(() => {
    if (!projectId) return

    const channel = supabase
      .channel(`drawings-table-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'drawings',
          filter: `project_id=eq.${projectId}`,
        },
        () => invalidate(),
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'drawings',
          filter: `project_id=eq.${projectId}`,
        },
        () => invalidate(),
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
      channelRef.current = null
    }
  }, [projectId, invalidate])

  return useQuery({
    queryKey: ['drawings-with-progress', { project_id: projectId }],
    queryFn: async () => {
      // Fetch drawings, progress, and spec data in parallel
      const [drawingsResult, progressResult, specResult] = await Promise.all([
        supabase
          .from('drawings')
          .select(`
            *,
            area:areas(id, name),
            system:systems(id, name),
            test_package:test_packages(id, name)
          `)
          .eq('project_id', projectId)
          .eq('is_retired', false)
          .order('drawing_no_norm'),
        supabase
          .from('mv_drawing_progress')
          .select('*')
          .eq('project_id', projectId),
        supabase.rpc(
          'get_most_common_spec_per_drawing',
          { p_project_id: projectId }
        ),
      ])

      if (drawingsResult.error) throw drawingsResult.error
      if (progressResult.error) throw progressResult.error

      const drawingsData = drawingsResult.data
      const progressData = progressResult.data
      const specData = specResult.data

      if (specResult.error) {
        // If RPC doesn't exist yet, continue without spec data
        console.warn('Could not fetch spec data:', specResult.error)
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
        const rawSpec = specMap.get(drawing.id) ?? drawing.spec ?? null
        const spec = normalizeSpec(rawSpec)
        return {
          id: drawing.id,
          project_id: drawing.project_id,
          drawing_no_norm: drawing.drawing_no_norm,
          drawing_no_raw: drawing.drawing_no_raw,
          title: drawing.title,
          rev: drawing.rev,
          is_retired: drawing.is_retired,
          sheet_number: drawing.sheet_number ?? null,
          line_number: drawing.line_number ?? null,
          file_path: drawing.file_path ?? null,
          source_page: drawing.source_page ?? null,
          processing_status: drawing.processing_status ?? null,
          processing_note: drawing.processing_note ?? null,
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
