/**
 * useHasRepairWeld Hook
 * Query hook to check if a repair weld exists for a given field weld
 * Used to guard NDE clear/edit operations
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/**
 * Query hook: Does a repair weld exist for this field_weld_id?
 * Returns boolean. Used by UI to show/disable repair weld guard warnings.
 */
export function useHasRepairWeld(fieldWeldId: string | null) {
  return useQuery({
    queryKey: ['has-repair-weld', fieldWeldId],
    queryFn: async () => {
      if (!fieldWeldId) return false

      const { count, error } = await supabase
        .from('field_welds')
        .select('id', { count: 'exact', head: true })
        .eq('original_weld_id', fieldWeldId)

      if (error) {
        throw new Error(`Failed to check repair welds: ${error.message}`)
      }

      return (count ?? 0) > 0
    },
    enabled: !!fieldWeldId,
    staleTime: 30_000,
  })
}
