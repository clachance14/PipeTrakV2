import { useCallback } from 'react'
import { naturalCompare } from '@/lib/natural-sort'
import { getSortableIdentity } from '@/lib/identity-sort'
import { useComponentPreferencesStore } from '@/stores/useComponentPreferencesStore'
import type { ComponentSortField, SortDirection } from '@/types/component-table.types'
import type { Database } from '@/types/database.types'

type Component = Database['public']['Tables']['components']['Row'] & {
  drawing?: { drawing_no_norm: string } | null
  area?: { name: string } | null
  system?: { name: string } | null
  test_package?: { name: string } | null
}

export function useComponentSort() {
  const {
    sortRules,
    addSortRule,
    clearSortRules,
    setSortRules,
  } = useComponentPreferencesStore()

  const sortComponents = useCallback(
    (components: Component[]) => {
      if (sortRules.length === 0) return components

      return [...components].sort((a, b) => {
        for (const rule of sortRules) {
          const comparison = compareByField(a, b, rule.field)
          if (comparison !== 0) {
            return rule.direction === 'asc' ? comparison : -comparison
          }
        }
        return 0
      })
    },
    [sortRules]
  )

  // Handle sort click - isAdditive is true when Shift is held
  const handleSort = useCallback(
    (field: ComponentSortField, direction: SortDirection, isAdditive: boolean) => {
      if (isAdditive) {
        // Check if field already exists
        const existingIndex = sortRules.findIndex((r) => r.field === field)
        if (existingIndex >= 0) {
          // Toggle direction of existing rule
          const newRules = [...sortRules]
          newRules[existingIndex] = {
            field,
            direction: sortRules[existingIndex]?.direction === 'asc' ? 'desc' : 'asc',
          }
          setSortRules(newRules)
        } else if (sortRules.length < 3) {
          // Add new rule (max 3)
          addSortRule(field, direction)
        }
      } else {
        // Replace all rules with single sort
        clearSortRules()
        addSortRule(field, direction)
      }
    },
    [sortRules, addSortRule, clearSortRules, setSortRules]
  )

  const resetToDefaultSort = useCallback(() => {
    clearSortRules()
    addSortRule('identity_key', 'asc')
  }, [clearSortRules, addSortRule])

  // Get sort info for a specific field (for header display)
  const getSortInfo = useCallback(
    (field: ComponentSortField) => {
      const index = sortRules.findIndex((r) => r.field === field)
      if (index === -1) return null
      return {
        direction: sortRules[index]?.direction || 'asc',
        priority: index + 1, // 1-based priority
      }
    },
    [sortRules]
  )

  return {
    sortRules,
    sortComponents,
    handleSort,
    resetToDefaultSort,
    getSortInfo,
  }
}

// Helper: Compare components by field
function compareByField(a: Component, b: Component, field: string): number {
  const getValue = (obj: Component, field: string) => {
    switch (field) {
      case 'identity_key': {
        const key = obj.identity_key as Record<string, unknown>
        return getSortableIdentity(key, obj.component_type)
      }
      case 'drawing':
        return obj.drawing?.drawing_no_norm || ''
      case 'component_type':
        return obj.component_type || ''
      case 'area':
        return obj.area?.name || ''
      case 'system':
        return obj.system?.name || ''
      case 'test_package':
        return obj.test_package?.name || ''
      case 'percent_complete':
        return obj.percent_complete ?? 0
      default:
        return ''
    }
  }

  const aVal = getValue(a, field)
  const bVal = getValue(b, field)

  if (typeof aVal === 'number' && typeof bVal === 'number') {
    return aVal - bVal
  }
  return naturalCompare(String(aVal), String(bVal))
}
