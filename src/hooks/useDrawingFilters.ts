import { useSearchParams } from 'react-router-dom'
import { useMemo, useCallback } from 'react'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import type { DrawingRow, StatusFilter } from '@/types/drawing-table.types'

/**
 * Custom hook to manage search and filter state via URL params
 *
 * Provides debounced search and status filtering for drawings.
 * State is synced with URL for shareability and persistence.
 *
 * @returns Filter state and control functions
 */
export function useDrawingFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Parse search term from URL
  const rawSearchTerm = searchParams.get('search') || ''

  // Debounce search term to avoid excessive filtering
  const searchTerm = useDebouncedValue(rawSearchTerm, 300)

  // Parse status filter from URL
  const statusFilter = (searchParams.get('status') || 'all') as StatusFilter

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

  return {
    searchTerm,
    statusFilter,
    setSearch,
    setStatusFilter,
    filteredDrawings,
  }
}
