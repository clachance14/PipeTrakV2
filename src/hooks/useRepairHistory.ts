import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface RepairHistoryItem {
  id: string
  component_id: string
  weld_type: string
  weld_size: string | null
  schedule: string | null
  base_metal: string | null
  spec: string | null
  welder_id: string | null
  welder_stencil: string | null
  welder_name: string | null
  date_welded: string | null
  nde_type: string | null
  nde_result: string | null
  nde_notes: string | null
  status: string
  original_weld_id: string | null
  is_repair: boolean
  created_at: string
}

export interface RepairChain {
  original: RepairHistoryItem
  repairs: RepairHistoryItem[]
  totalAttempts: number
  finalStatus: 'accepted' | 'rejected' | 'active'
}

/**
 * Fetches the complete repair history chain for a field weld
 * @param fieldWeldId - The ID of any weld in the chain (original or repair)
 */
export function useRepairHistory(fieldWeldId: string | null) {
  return useQuery({
    queryKey: ['repair-history', fieldWeldId],
    queryFn: async (): Promise<RepairChain | null> => {
      if (!fieldWeldId) return null

      // First, get the current weld to check if it's a repair or original
      const { data: currentWeld, error: currentError } = await supabase
        .from('field_welds')
        .select(
          `
          *,
          welder:welders(stencil, name)
        `
        )
        .eq('id', fieldWeldId)
        .single()

      if (currentError) throw currentError
      if (!currentWeld) return null

      // Find the original weld (either current weld or traverse up the chain)
      const originalWeldId = currentWeld.original_weld_id || currentWeld.id

      // Fetch the original weld
      const { data: originalWeld, error: originalError } = await supabase
        .from('field_welds')
        .select(
          `
          *,
          welder:welders(stencil, name),
          component:components(id)
        `
        )
        .eq('id', originalWeldId)
        .single()

      if (originalError) throw originalError
      if (!originalWeld) return null

      // Fetch all repairs that reference this original weld
      const { data: repairs, error: repairsError } = await supabase
        .from('field_welds')
        .select(
          `
          *,
          welder:welders(stencil, name),
          component:components(id)
        `
        )
        .eq('original_weld_id', originalWeldId)
        .order('created_at', { ascending: true })

      if (repairsError) throw repairsError

      // Map the data to our interface
      const mapWeldData = (weld: any): RepairHistoryItem => ({
        id: weld.id,
        component_id: weld.component_id,
        weld_type: weld.weld_type,
        weld_size: weld.weld_size,
        schedule: weld.schedule,
        base_metal: weld.base_metal,
        spec: weld.spec,
        welder_id: weld.welder_id,
        welder_stencil: weld.welder?.stencil || null,
        welder_name: weld.welder?.name || null,
        date_welded: weld.date_welded,
        nde_type: weld.nde_type,
        nde_result: weld.nde_result,
        nde_notes: weld.nde_notes,
        status: weld.status,
        original_weld_id: weld.original_weld_id,
        is_repair: weld.is_repair || false,
        created_at: weld.created_at,
      })

      const original = mapWeldData(originalWeld)
      const repairList = (repairs || []).map(mapWeldData)

      // Determine final status (last item in chain)
      const lastWeld = repairList.length > 0 ? repairList[repairList.length - 1]! : original
      const finalStatus =
        lastWeld.status === 'accepted'
          ? 'accepted'
          : lastWeld.status === 'rejected'
            ? 'rejected'
            : 'active'

      return {
        original,
        repairs: repairList,
        totalAttempts: 1 + repairList.length,
        finalStatus,
      }
    },
    enabled: !!fieldWeldId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}
