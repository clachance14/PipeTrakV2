import { ArrowUp, ArrowDown } from 'lucide-react'

export type SortDirection = 'asc' | 'desc'

interface SortableColumnHeaderProps<T extends string> {
  /** Column label to display */
  label: string
  /** Field name this column sorts by */
  field: T
  /** Current active sort field */
  currentSortField: T
  /** Current sort direction */
  currentSortDirection: SortDirection
  /** Callback when column is clicked */
  onSort: (field: T, direction: SortDirection) => void
  /** Optional CSS classes */
  className?: string
}

/**
 * Sortable column header component
 *
 * Displays column label with sort indicator icon.
 * Clicking cycles through: asc → desc → back to asc
 *
 * Features:
 * - Visual sort indicator (ArrowUp/ArrowDown)
 * - Keyboard accessible (Tab, Enter/Space)
 * - ARIA labels for screen readers
 * - Generic field type for reusability
 */
export function SortableColumnHeader<T extends string>({
  label,
  field,
  currentSortField,
  currentSortDirection,
  onSort,
  className = '',
}: SortableColumnHeaderProps<T>) {
  const isActive = currentSortField === field

  const handleClick = () => {
    if (!isActive) {
      // Not currently sorted by this column - sort ascending
      onSort(field, 'asc')
    } else if (currentSortDirection === 'asc') {
      // Currently sorted ascending - switch to descending
      onSort(field, 'desc')
    } else {
      // Currently sorted descending - cycle back to ascending
      // Note: Reset behavior depends on parent component's default field
      onSort(field, 'asc')
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
              currentSortDirection === 'asc' ? 'sort descending' : 'sort ascending'
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
