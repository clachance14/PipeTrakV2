import { useState, useCallback } from 'react'
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
            comparison = JSON.stringify(a.identity_key).localeCompare(
              JSON.stringify(b.identity_key)
            )
            break
          case 'drawing':
            comparison = (a.drawing?.drawing_no_norm || '').localeCompare(
              b.drawing?.drawing_no_norm || ''
            )
            break
          case 'area':
            comparison = (a.area?.name || '').localeCompare(b.area?.name || '')
            break
          case 'system':
            comparison = (a.system?.name || '').localeCompare(b.system?.name || '')
            break
          case 'test_package':
            comparison = (a.test_package?.name || '').localeCompare(
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
