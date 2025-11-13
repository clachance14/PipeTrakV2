import { useSearchParams } from 'react-router-dom'
import { useCallback, useMemo } from 'react'

export interface UseExpandedDrawingsResult {
  expandedDrawingId: string | null
  toggleDrawing: (drawingId: string) => void
  collapseDrawing: () => void
  isExpanded: (drawingId: string) => boolean
}

export function useExpandedDrawings(): UseExpandedDrawingsResult {
  const [searchParams, setSearchParams] = useSearchParams()

  const expandedDrawingId = useMemo(() => {
    const param = searchParams.get('expanded')
    if (!param) return null

    // Handle legacy multi-ID URLs (take first ID)
    const firstId = param.split(',')[0].trim()
    return firstId || null
  }, [searchParams])

  const toggleDrawing = useCallback((drawingId: string) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev)

      // If clicking already expanded drawing, collapse it
      if (expandedDrawingId === drawingId) {
        newParams.delete('expanded')
      } else {
        // Otherwise, expand new drawing (auto-closes previous)
        newParams.set('expanded', drawingId)
      }

      return newParams
    })
  }, [expandedDrawingId, setSearchParams])

  const collapseDrawing = useCallback(() => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev)
      newParams.delete('expanded')
      return newParams
    })
  }, [setSearchParams])

  const isExpanded = useCallback((drawingId: string) => {
    return expandedDrawingId === drawingId
  }, [expandedDrawingId])

  return {
    expandedDrawingId,
    toggleDrawing,
    collapseDrawing,
    isExpanded
  }
}
