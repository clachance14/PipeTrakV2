import { useSearchParams } from 'react-router-dom'
import { useMemo, useCallback } from 'react'
import { toast } from 'sonner'

const MAX_EXPANDED_DRAWINGS = 50

/**
 * Custom hook to manage drawing expansion state via URL params
 *
 * Syncs expanded drawing IDs with URL search params for:
 * - Shareable links
 * - Browser back/forward navigation
 * - State persistence across page reloads
 *
 * @returns Expansion state and control functions
 */
export function useExpandedDrawings() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Parse expanded drawing IDs from URL
  const expandedDrawingIds = useMemo(() => {
    const expanded = searchParams.get('expanded')
    if (!expanded) {
      return new Set<string>()
    }
    return new Set(expanded.split(',').filter(Boolean))
  }, [searchParams])

  // Toggle a drawing's expanded state
  const toggleDrawing = useCallback(
    (drawingId: string) => {
      setSearchParams((prev) => {
        const current = new Set(
          prev.get('expanded')?.split(',').filter(Boolean) || []
        )

        if (current.has(drawingId)) {
          // Collapse: remove from set
          current.delete(drawingId)
        } else {
          // Expand: add to set (with limit check)
          if (current.size >= MAX_EXPANDED_DRAWINGS) {
            toast.warning(
              `Maximum ${MAX_EXPANDED_DRAWINGS} drawings can be expanded at once`
            )
            return prev
          }
          current.add(drawingId)
        }

        // Update URL params while preserving other params
        const newParams = new URLSearchParams(prev)
        if (current.size > 0) {
          newParams.set('expanded', Array.from(current).join(','))
        } else {
          newParams.delete('expanded')
        }

        return newParams
      })
    },
    [setSearchParams]
  )

  // Collapse all drawings
  const collapseAll = useCallback(() => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev)
      newParams.delete('expanded')
      return newParams
    })
  }, [setSearchParams])

  // Check if a drawing is expanded
  const isExpanded = useCallback(
    (drawingId: string) => {
      return expandedDrawingIds.has(drawingId)
    },
    [expandedDrawingIds]
  )

  return {
    expandedDrawingIds,
    toggleDrawing,
    collapseAll,
    isExpanded,
  }
}
