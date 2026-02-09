import { useMemo } from 'react'
import { useSearchIndex, type SearchIndexItem } from './useSearchIndex'

const CATEGORY_ORDER: SearchIndexItem['category'][] = [
  'drawing',
  'component',
  'welder',
  'test_package',
  'field_weld',
  'area',
]

const CATEGORY_LABELS: Record<SearchIndexItem['category'], string> = {
  drawing: 'Drawings',
  component: 'Components',
  welder: 'Welders',
  test_package: 'Test Packages',
  field_weld: 'Field Welds',
  area: 'Areas',
}

const MAX_PER_GROUP = 5

export interface SearchResultGroup {
  category: SearchIndexItem['category']
  categoryLabel: string
  items: SearchIndexItem[]
  totalCount: number
}

export function useGlobalSearch(query: string, projectId: string | null) {
  const shouldFetch = query.length >= 2
  const { data: index, isLoading: isIndexLoading } = useSearchIndex(projectId, shouldFetch)

  const results = useMemo((): SearchResultGroup[] => {
    if (!index || query.length < 2) return []

    const lowerQuery = query.toLowerCase()

    // Filter items matching the query
    const matched = index.filter(
      (item) =>
        item.label?.toLowerCase().includes(lowerQuery) ||
        item.sublabel?.toLowerCase().includes(lowerQuery)
    )

    // Group by category, preserving order
    const groups: SearchResultGroup[] = []

    for (const category of CATEGORY_ORDER) {
      const categoryItems = matched.filter((item) => item.category === category)
      if (categoryItems.length > 0) {
        groups.push({
          category,
          categoryLabel: CATEGORY_LABELS[category],
          items: categoryItems.slice(0, MAX_PER_GROUP),
          totalCount: categoryItems.length,
        })
      }
    }

    return groups
  }, [index, query])

  const totalResults = results.reduce((sum, group) => sum + group.totalCount, 0)

  return {
    results,
    totalResults,
    isLoading: isIndexLoading && shouldFetch,
    hasQuery: query.length >= 2,
  }
}

export { CATEGORY_LABELS }
