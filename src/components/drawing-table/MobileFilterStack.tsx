/**
 * MobileFilterStack Component
 * Feature: 015-mobile-milestone-updates
 * Purpose: Vertical stack layout for filters on mobile devices (≤1024px)
 */

import { DrawingSearchInput } from './DrawingSearchInput'
import { StatusFilterDropdown } from './StatusFilterDropdown'
import { CollapseAllButton } from './CollapseAllButton'
import { Button } from '@/components/ui/button'
import { CheckSquare, Square } from 'lucide-react'
import type { StatusFilter } from '@/types/drawing-table.types'

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
  return (
    <div className="flex flex-col gap-3">
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

      {/* Showing count */}
      <div className="text-xs text-slate-600 text-center">
        Showing {showingCount} of {totalCount} drawings
      </div>
    </div>
  )
}
