/**
 * Welder usage tracking hook
 * Feature: 008-we-just-planned (Authenticated Pages with Real Data)
 * Counts "Weld Made" milestone events by welder_id for usage statistics
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

type MilestoneEvent = Database['public']['Tables']['milestone_events']['Row'];

/**
 * Hook to count welder usage from milestone events
 * Queries milestone_events table for "Weld Made" events
 * Groups by metadata->>'welder_id' to count welds per welder
 *
 * @param projectId - The project to fetch welder usage for
 * @returns TanStack Query result with Map<welderId, weldCount>
 */
export function useWelderUsage(
  projectId: string
): UseQueryResult<Map<string, number>, Error> {
  const query = useQuery({
    queryKey: ['projects', projectId, 'welder-usage'],
    queryFn: async () => {
      // Fetch all "Weld Made" milestone events for this project
      // We need to join with components to filter by project_id
      const { data, error } = await supabase
        .from('milestone_events')
        .select(`
          id,
          metadata,
          component_id,
          components!inner(project_id)
        `)
        .eq('milestone_name', 'Weld Made')
        .eq('components.project_id', projectId);

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Transform array to Map<welderId, count>
  const usageMap = useMemo(() => {
    if (!query.data) return undefined;

    const map = new Map<string, number>();

    for (const event of query.data) {
      // Extract welder_id from metadata JSONB
      if (event.metadata && typeof event.metadata === 'object') {
        const metadata = event.metadata as Record<string, any>;
        const welderId = metadata.welder_id;

        if (typeof welderId === 'string') {
          const currentCount = map.get(welderId) || 0;
          map.set(welderId, currentCount + 1);
        }
      }
    }

    return map;
  }, [query.data]);

  return {
    ...query,
    data: usageMap,
  } as UseQueryResult<Map<string, number>, Error>;
}
