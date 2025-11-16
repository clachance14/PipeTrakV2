import { useState, useEffect } from 'react'

const STORAGE_KEY = 'pipetrak-mobile-filters-expanded'

/**
 * Custom hook for managing mobile filter expand/collapse state
 * with localStorage persistence
 *
 * Feature: 015-mobile-milestone-updates
 * Purpose: Separate state logic from UI rendering to follow React Rules of Hooks
 */
export function useMobileFilterState() {
  // Collapse state with localStorage persistence
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored !== null ? JSON.parse(stored) : false // Default to collapsed
    } catch {
      return false // Graceful degradation if localStorage fails
    }
  })

  // Sync state changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(isExpanded))
    } catch {
      // Graceful degradation if localStorage is blocked
      console.warn('Failed to persist filter collapse state to localStorage')
    }
  }, [isExpanded])

  // Toggle handler
  const handleToggle = () => {
    setIsExpanded(prev => !prev)
  }

  return {
    isExpanded,
    setIsExpanded,
    handleToggle,
  }
}
