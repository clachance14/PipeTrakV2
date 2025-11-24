import { useSearchParams } from 'react-router-dom'
import { useCallback } from 'react'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { naturalCompare } from '@/lib/natural-sort'
import type { DrawingRow, StatusFilter, SortField, SortDirection } from '@/types/drawing-table.types'

/**
 * Custom hook to manage search, filter, and sort state via URL params
 *
 * Provides debounced search, status filtering, and multi-column sorting for drawings.
 * State is synced with URL for shareability and persistence.
 *
 * @returns Filter/sort state and control functions
 */
export function useDrawingFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Parse search term from URL
  const rawSearchTerm = searchParams.get('search') || ''

  // Debounce search term to avoid excessive filtering
  const searchTerm = useDebouncedValue(rawSearchTerm, 300)

  // Parse status filter from URL
  const statusFilter = (searchParams.get('status') || 'all') as StatusFilter

  // Parse sort params from URL (default: drawing_no_norm asc)
  const sortField = (searchParams.get('sort') || 'drawing_no_norm') as SortField
  const sortDirection = (searchParams.get('dir') || 'asc') as SortDirection

  // Update search term in URL
  const setSearch = useCallback(
    (term: string) => {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev)
        if (term) {
          newParams.set('search', term)
        } else {
          newParams.delete('search')
        }
        return newParams
      })
    },
    [setSearchParams]
  )

  // Update status filter in URL
  const setStatusFilter = useCallback(
    (status: StatusFilter) => {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev)
        if (status === 'all') {
          newParams.delete('status')
        } else {
          newParams.set('status', status)
        }
        return newParams
      })
    },
    [setSearchParams]
  )

  // Update sort field and direction in URL
  const setSort = useCallback(
    (field: SortField, direction: SortDirection) => {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev)
        // Only set params if not default values
        if (field === 'drawing_no_norm' && direction === 'asc') {
          newParams.delete('sort')
          newParams.delete('dir')
        } else {
          newParams.set('sort', field)
          newParams.set('dir', direction)
        }
        return newParams
      })
    },
    [setSearchParams]
  )

  // Filter drawings function
  const filteredDrawings = useCallback(
    (drawings: DrawingRow[]): DrawingRow[] => {
      return drawings.filter((drawing) => {
        // Search filter: case-insensitive substring match on drawing_no_norm
        if (searchTerm) {
          const normalizedSearch = searchTerm.toUpperCase()
          if (!drawing.drawing_no_norm.includes(normalizedSearch)) {
            return false
          }
        }

        // Status filter
        if (statusFilter === 'not-started' && drawing.avg_percent_complete !== 0) {
          return false
        }
        if (
          statusFilter === 'in-progress' &&
          (drawing.avg_percent_complete === 0 || drawing.avg_percent_complete === 100)
        ) {
          return false
        }
        if (statusFilter === 'complete' && drawing.avg_percent_complete !== 100) {
          return false
        }

        return true
      })
    },
    [searchTerm, statusFilter]
  )

  // Sort drawings function
  const sortedDrawings = useCallback(
    (drawings: DrawingRow[]): DrawingRow[] => {
      const sorted = [...drawings]

      sorted.sort((a, b) => {
        let aVal: string | number | null
        let bVal: string | number | null

        // Extract comparison values based on sort field
        switch (sortField) {
          case 'drawing_no_norm':
            aVal = a.drawing_no_norm
            bVal = b.drawing_no_norm
            break
          case 'title':
            aVal = a.title
            bVal = b.title
            break
          case 'spec':
            aVal = a.spec || null
            bVal = b.spec || null
            break
          case 'area':
            aVal = a.area?.name || null
            bVal = b.area?.name || null
            break
          case 'system':
            aVal = a.system?.name || null
            bVal = b.system?.name || null
            break
          case 'test_package':
            aVal = a.test_package?.name || null
            bVal = b.test_package?.name || null
            break
          case 'avg_percent_complete':
            aVal = a.avg_percent_complete
            bVal = b.avg_percent_complete
            break
          case 'total_components':
            aVal = a.total_components
            bVal = b.total_components
            break
          default:
            aVal = a.drawing_no_norm
            bVal = b.drawing_no_norm
        }

        // Handle null values (always sort to end)
        if (aVal === null && bVal === null) return 0
        if (aVal === null) return 1
        if (bVal === null) return -1

        // Compare values
        let comparison = 0
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          comparison = naturalCompare(aVal, bVal)
        } else if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal - bVal
        }

        // Apply sort direction
        return sortDirection === 'asc' ? comparison : -comparison
      })

      return sorted
    },
    [sortField, sortDirection]
  )

  // Combined filter and sort function
  const filterAndSortDrawings = useCallback(
    (drawings: DrawingRow[]): DrawingRow[] => {
      const filtered = filteredDrawings(drawings)
      return sortedDrawings(filtered)
    },
    [filteredDrawings, sortedDrawings]
  )

  return {
    searchTerm,
    statusFilter,
    sortField,
    sortDirection,
    setSearch,
    setStatusFilter,
    setSort,
    filteredDrawings,
    sortedDrawings,
    filterAndSortDrawings,
  }
}
