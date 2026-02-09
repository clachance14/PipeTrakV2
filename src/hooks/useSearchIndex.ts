import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface SearchIndexItem {
  id: string
  category: 'drawing' | 'component' | 'welder' | 'test_package' | 'field_weld' | 'area'
  label: string
  sublabel: string | null
  badge: string | null
}

export function useSearchIndex(projectId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['search-index', projectId],
    queryFn: async (): Promise<SearchIndexItem[]> => {
      const { data, error } = await supabase.rpc('get_search_index', {
        p_project_id: projectId!,
      })

      if (error) {
        throw new Error(`Failed to fetch search index: ${error.message}`)
      }

      return (data as SearchIndexItem[]) || []
    },
    enabled: enabled && !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  })
}
