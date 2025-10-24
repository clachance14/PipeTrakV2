/**
 * useFieldWelds Hook (Feature 014 - Field Weld QC)
 * Query hook for fetching all field welds for a project (used by Weld Log page)
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { formatIdentityKey } from '@/lib/field-weld-utils'

interface FieldWeld {
  id: string
  component_id: string
  project_id: string
  weld_type: 'BW' | 'SW' | 'FW' | 'TW'
  weld_size: string | null
  schedule: string | null
  base_metal: string | null
  spec: string | null
  welder_id: string | null
  date_welded: string | null
  nde_required: boolean
  nde_type: string | null
  nde_result: 'PASS' | 'FAIL' | 'PENDING' | null
  nde_date: string | null
  nde_notes: string | null
  status: 'active' | 'accepted' | 'rejected'
  original_weld_id: string | null
  is_repair: boolean
  created_at: string
  updated_at: string
}

interface ComponentData {
  id: string
  drawing_id: string
  type: string
  identity_key: Record<string, unknown>
  percent_complete: number
  current_milestones: Record<string, unknown>
  area_id: string | null
  system_id: string | null
  test_package_id: string | null
}

interface DrawingData {
  id: string
  drawing_no_norm: string
  project_id: string
}

interface WelderData {
  id: string
  stencil: string
  name: string
  status: 'unverified' | 'verified'
}

interface AreaData {
  id: string
  name: string
  description: string | null
}

interface SystemData {
  id: string
  name: string
  description: string | null
}

interface TestPackageData {
  id: string
  name: string
  description: string | null
}

export interface EnrichedFieldWeld extends FieldWeld {
  component: ComponentData
  drawing: DrawingData
  welder: WelderData | null
  area: AreaData | null
  system: SystemData | null
  test_package: TestPackageData | null
  identityDisplay: string
}

interface UseFieldWeldsOptions {
  projectId: string
  enabled?: boolean
}

export function useFieldWelds({ projectId, enabled = true }: UseFieldWeldsOptions) {
  return useQuery({
    queryKey: ['field-welds', { projectId }],
    queryFn: async () => {
      // Fetch field welds with components (NO nested joins)
      const { data: weldsData, error: weldsError } = await supabase
        .from('field_welds')
        .select(`
          *,
          components!inner(
            id,
            drawing_id,
            component_type,
            identity_key,
            percent_complete,
            current_milestones,
            area_id,
            system_id,
            test_package_id
          ),
          welders(
            id,
            stencil,
            name,
            status
          )
        `)
        .eq('project_id', projectId)
        .order('date_welded', { ascending: false, nullsFirst: false })

      if (weldsError) throw weldsError

      // Extract unique IDs for separate fetches
      const drawingIds = new Set<string>()
      const areaIds = new Set<string>()
      const systemIds = new Set<string>()
      const packageIds = new Set<string>()

      weldsData?.forEach((weld: any) => {
        const component = Array.isArray(weld.components) ? weld.components[0] : weld.components
        if (component?.drawing_id) drawingIds.add(component.drawing_id)
        if (component?.area_id) areaIds.add(component.area_id)
        if (component?.system_id) systemIds.add(component.system_id)
        if (component?.test_package_id) packageIds.add(component.test_package_id)
      })

      // Fetch all related data in parallel (NO nested joins)
      const [drawingsResult, areasResult, systemsResult, packagesResult] = await Promise.all([
        drawingIds.size > 0
          ? supabase.from('drawings').select('id, drawing_no_norm, project_id').in('id', Array.from(drawingIds))
          : Promise.resolve({ data: [], error: null }),
        areaIds.size > 0
          ? supabase.from('areas').select('id, name, description').in('id', Array.from(areaIds))
          : Promise.resolve({ data: [], error: null }),
        systemIds.size > 0
          ? supabase.from('systems').select('id, name, description').in('id', Array.from(systemIds))
          : Promise.resolve({ data: [], error: null }),
        packageIds.size > 0
          ? supabase.from('test_packages').select('id, name, description').in('id', Array.from(packageIds))
          : Promise.resolve({ data: [], error: null }),
      ])

      // Create lookup maps
      const drawingsMap = new Map(drawingsResult.data?.map((d: any) => [d.id, d]) || [])
      const areasMap = new Map(areasResult.data?.map((a: any) => [a.id, a]) || [])
      const systemsMap = new Map(systemsResult.data?.map((s: any) => [s.id, s]) || [])
      const packagesMap = new Map(packagesResult.data?.map((p: any) => [p.id, p]) || [])

      // Transform data to enriched format with identityDisplay
      const enriched: EnrichedFieldWeld[] = (weldsData || []).map((weld: any) => {
        const component = Array.isArray(weld.components) ? weld.components[0] : weld.components
        const drawing = component?.drawing_id ? drawingsMap.get(component.drawing_id) : null

        return {
          ...weld,
          component: {
            ...component,
            type: component?.component_type,
          },
          drawing: drawing || { id: '', drawing_no_norm: 'Unknown', project_id: '' },
          welder: weld.welders || null,
          area: component?.area_id ? areasMap.get(component.area_id) || null : null,
          system: component?.system_id ? systemsMap.get(component.system_id) || null : null,
          test_package: component?.test_package_id ? packagesMap.get(component.test_package_id) || null : null,
          identityDisplay: formatIdentityKey(
            component?.identity_key as Record<string, unknown>,
            weld.weld_type
          ),
        }
      })

      return enriched
    },
    enabled: enabled && !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}
