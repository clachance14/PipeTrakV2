/**
 * MobileFilterStack Component
 * Feature: 015-mobile-milestone-updates
 * Purpose: Vertical stack layout for filters on mobile devices (≤1024px)
 * Enhancement: Collapsible filters to maximize table space (2025-11-02)
 */

import { useState, useEffect } from 'react'
import { DrawingSearchInput } from './DrawingSearchInput'
import { StatusFilterDropdown } from './StatusFilterDropdown'
import { CollapseAllButton } from './CollapseAllButton'
import { Button } from '@/components/ui/button'
import { CheckSquare, Square, ChevronDown } from 'lucide-react'
import type { StatusFilter } from '@/types/drawing-table.types'

const STORAGE_KEY = 'pipetrak-mobile-filters-expanded'

interface MobileFilterStackProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  statusFilter: StatusFilter
  onStatusFilterChange: (value: StatusFilter) => void
  onCollapseAll: () => void
  collapseAllDisabled: boolean
  selectionMode: boolean
  onToggleSelectionMode: () => void
  showingCount: number
  totalCount: number
}

export function MobileFilterStack({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onCollapseAll,
  collapseAllDisabled,
  selectionMode,
  onToggleSelectionMode,
  showingCount,
  totalCount,
}: MobileFilterStackProps) {
  // Collapse state with localStorage persistence
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored !== null ? JSON.parse(stored) : true // Default to expanded
    } catch {
      return true // Graceful degradation if localStorage fails
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

  return (
    <div className="flex flex-col gap-2">
      {/* Toggle Button with Count */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleToggle}
        className="flex items-center justify-between min-h-[44px] w-full px-3 py-2"
        aria-expanded={isExpanded}
        aria-controls="mobile-filters-content"
        aria-label={isExpanded ? "Hide filter controls" : "Show filter controls"}
        id="mobile-filters-toggle"
      >
        <div className="flex items-center gap-2">
          <ChevronDown
            className="h-4 w-4 chevron-rotate"
            data-expanded={isExpanded}
            aria-hidden="true"
          />
          <span className="text-sm font-medium">
            {isExpanded ? 'Hide Filters' : 'Show Filters'}
          </span>
        </div>
        <span className="text-xs text-slate-600 font-normal">
          {showingCount}/{totalCount}
        </span>
      </Button>

      {/* Collapsible Container */}
      <div
        className="collapsible-grid"
        data-expanded={isExpanded}
        id="mobile-filters-content"
      >
        <div className="collapsible-content">
          <div className="flex flex-col gap-2">
            {/* Search input - full width */}
            <DrawingSearchInput
              value={searchTerm}
              onChange={onSearchChange}
              placeholder="Search by drawing number..."
            />

            {/* Status filter - full width */}
            <StatusFilterDropdown
              value={statusFilter}
              onChange={onStatusFilterChange}
            />

            {/* Action buttons row */}
            <div className="flex gap-2">
              <CollapseAllButton
                onClick={onCollapseAll}
                disabled={collapseAllDisabled}
              />

              <Button
                variant={selectionMode ? 'default' : 'outline'}
                size="sm"
                onClick={onToggleSelectionMode}
                className="flex items-center gap-2 min-h-[44px] flex-1"
              >
                {selectionMode ? (
                  <>
                    <CheckSquare className="h-4 w-4" />
                    <span className="text-sm">Exit Select</span>
                  </>
                ) : (
                  <>
                    <Square className="h-4 w-4" />
                    <span className="text-sm">Select</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
