import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

type MilestoneEvent = Database['public']['Tables']['milestone_events']['Row']

export interface MilestoneHistoryItem extends MilestoneEvent {
  user?: {
    email: string
    full_name: string | null
  } | null
}

/**
 * Fetch milestone history for a component
 * Returns events sorted by timestamp (most recent first)
 */
export function useMilestoneHistory(componentId: string, limit: number = 20) {
  return useQuery({
    queryKey: ['milestone-history', componentId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('milestone_events')
        .select(`
          *,
          user:users(email, full_name)
        `)
        .eq('component_id', componentId)
        .order('timestamp', { ascending: false })
        .limit(limit)

      if (error) {
        throw new Error(`Failed to fetch milestone history: ${error.message}`)
      }

      return (data || []) as MilestoneHistoryItem[]
    },
    staleTime: 30000, // 30 seconds
  })
}
