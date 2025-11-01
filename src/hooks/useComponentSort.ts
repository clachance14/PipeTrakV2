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

  const sortComponents = useCallback((components: Component[]) => {
    return [...components]
  }, [])

  const handleSort = (field: ComponentSortField, direction: SortDirection) => {
    setSortField(field)
    setSortDirection(direction)
  }

  return { sortField, sortDirection, sortComponents, handleSort }
}
