import { ArrowUp, ArrowDown } from 'lucide-react'
import type { SortField, SortDirection } from '@/types/drawing-table.types'

interface SortableColumnHeaderProps {
  /** Column label to display */
  label: string
  /** Field name this column sorts by */
  field: SortField
  /** Current active sort field */
  currentSortField: SortField
  /** Current sort direction */
  currentSortDirection: SortDirection
  /** Callback when column is clicked */
  onSort: (field: SortField, direction: SortDirection) => void
  /** Optional CSS classes */
  className?: string
}

/**
 * Sortable column header component
 *
 * Displays column label with sort indicator icon.
 * Clicking cycles through: asc → desc → back to default (drawing_no_norm asc)
 *
 * Features:
 * - Visual sort indicator (ArrowUp/ArrowDown)
 * - Keyboard accessible (Tab, Enter/Space)
 * - ARIA labels for screen readers
 */
export function SortableColumnHeader({
  label,
  field,
  currentSortField,
  currentSortDirection,
  onSort,
  className = '',
}: SortableColumnHeaderProps) {
  const isActive = currentSortField === field

  const handleClick = () => {
    if (!isActive) {
      // Not currently sorted by this column - sort ascending
      onSort(field, 'asc')
    } else if (currentSortDirection === 'asc') {
      // Currently sorted ascending - switch to descending
      onSort(field, 'desc')
    } else {
      // Currently sorted descending - reset to default (drawing_no_norm asc)
      onSort('drawing_no_norm', 'asc')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        inline-flex items-center gap-1 font-medium text-left
        hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
        transition-colors duration-150
        ${isActive ? 'text-slate-900' : 'text-slate-700'}
        ${className}
      `}
      aria-label={
        isActive
          ? `${label}, sorted ${currentSortDirection === 'asc' ? 'ascending' : 'descending'}. Click to ${
              currentSortDirection === 'asc' ? 'sort descending' : 'reset sort'
            }.`
          : `${label}, not sorted. Click to sort ascending.`
      }
      aria-sort={isActive ? (currentSortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <span>{label}</span>
      {isActive && (
        <span aria-hidden="true">
          {currentSortDirection === 'asc' ? (
            <ArrowUp className="w-4 h-4" />
          ) : (
            <ArrowDown className="w-4 h-4" />
          )}
        </span>
      )}
    </button>
  )
}
