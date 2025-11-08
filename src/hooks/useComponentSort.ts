import { useState, useCallback } from 'react'
import { naturalCompare } from '@/lib/natural-sort'
import type { ComponentSortField, SortDirection } from '@/types/component-table.types'
import type { Database } from '@/types/database.types'

type Component = Database['public']['Tables']['components']['Row'] & {
  drawing?: { drawing_no_norm: string } | null
  area?: { name: string } | null
  system?: { name: string } | null
  test_package?: { name: string } | null
}

export function useComponentSort() {
  const [sortField, setSortField] = useState<ComponentSortField>('identity_key')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const sortComponents = useCallback(
    (components: Component[]) => {
      return [...components].sort((a, b) => {
        let comparison = 0

        switch (sortField) {
          case 'identity_key':
            // Stringify identity_key for comparison
            comparison = naturalCompare(
              JSON.stringify(a.identity_key),
              JSON.stringify(b.identity_key)
            )
            break
          case 'drawing':
            comparison = naturalCompare(
              a.drawing?.drawing_no_norm || '',
              b.drawing?.drawing_no_norm || ''
            )
            break
          case 'area':
            comparison = naturalCompare(a.area?.name || '', b.area?.name || '')
            break
          case 'system':
            comparison = naturalCompare(a.system?.name || '', b.system?.name || '')
            break
          case 'test_package':
            comparison = naturalCompare(
              a.test_package?.name || '',
              b.test_package?.name || ''
            )
            break
          case 'percent_complete':
            comparison = a.percent_complete - b.percent_complete
            break
        }

        return sortDirection === 'asc' ? comparison : -comparison
      })
    },
    [sortField, sortDirection]
  )

  const handleSort = (field: ComponentSortField, direction: SortDirection) => {
    setSortField(field)
    setSortDirection(direction)
  }

  return { sortField, sortDirection, sortComponents, handleSort }
}
