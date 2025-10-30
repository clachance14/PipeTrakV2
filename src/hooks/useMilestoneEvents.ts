/**
 * TanStack Query hook for milestone_events table (Feature 020 - T011)
 * Provides read-only milestone event history for component metadata modal
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

type MilestoneEvent = Database['public']['Tables']['milestone_events']['Row']

/**
 * Query milestone events for a specific component
 * Returns events sorted by timestamp descending (most recent first)
 */
export function useMilestoneEvents(
  componentId: string
): UseQueryResult<MilestoneEvent[], Error> {
  return useQuery({
    queryKey: ['milestone-events', componentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('milestone_events')
        .select('*')
        .eq('component_id', componentId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    staleTime: 2 * 60 * 1000, // 2 minutes (milestone history is relatively static)
  })
}
