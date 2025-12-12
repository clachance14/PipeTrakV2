import { ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SortDirection = 'asc' | 'desc'

interface SortableColumnHeaderProps<T extends string> {
  /** Column label to display */
  label: string
  /** Field name this column sorts by */
  field: T
  /** Sort info for this field (null if not sorted) */
  sortInfo: { direction: SortDirection; priority: number } | null
  /** Callback when column is clicked */
  onSort: (field: T, direction: SortDirection, isAdditive: boolean) => void
  /** Optional CSS classes */
  className?: string
}

/**
 * Sortable column header component with multi-sort support
 *
 * Displays column label with sort indicator icon.
 * Clicking cycles through: asc → desc → back to asc
 * Shift+click adds secondary/tertiary sorts (up to 3 total)
 *
 * Features:
 * - Visual sort indicator (ArrowUp/ArrowDown/ChevronsUpDown)
 * - Priority badges for multi-sort (shows 2, 3 for secondary/tertiary)
 * - Keyboard accessible (Tab, Enter/Space)
 * - ARIA labels for screen readers
 * - Generic field type for reusability
 */
export function SortableColumnHeader<T extends string>({
  label,
  field,
  sortInfo,
  onSort,
  className = '',
}: SortableColumnHeaderProps<T>) {
  const handleClick = (e: React.MouseEvent) => {
    const isAdditive = e.shiftKey
    const newDirection = sortInfo?.direction === 'asc' ? 'desc' : 'asc'
    onSort(field, newDirection, isAdditive)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const isAdditive = e.shiftKey
      const newDirection = sortInfo?.direction === 'asc' ? 'desc' : 'asc'
      onSort(field, newDirection, isAdditive)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'inline-flex items-center gap-1 font-medium text-left',
        'hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
        'transition-colors duration-150',
        sortInfo ? 'text-slate-900' : 'text-slate-700',
        className
      )}
      aria-label={
        sortInfo
          ? `${label}, sorted ${sortInfo.direction === 'asc' ? 'ascending' : 'descending'}${
              sortInfo.priority > 1 ? ` (priority ${sortInfo.priority})` : ''
            }. Click to ${
              sortInfo.direction === 'asc' ? 'sort descending' : 'sort ascending'
            }. Shift+click to add secondary sort.`
          : `${label}, not sorted. Click to sort ascending. Shift+click to add secondary sort.`
      }
      aria-sort={sortInfo ? (sortInfo.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <span>{label}</span>
      <span className="flex items-center">
        {sortInfo ? (
          <>
            {/* Priority badge for multi-sort */}
            {sortInfo.priority > 1 && (
              <span className="text-xs bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center mr-0.5">
                {sortInfo.priority}
              </span>
            )}
            {/* Direction arrow */}
            {sortInfo.direction === 'asc' ? (
              <ArrowUp className="w-4 h-4" />
            ) : (
              <ArrowDown className="w-4 h-4" />
            )}
          </>
        ) : (
          <ChevronsUpDown className="w-4 h-4 opacity-50" />
        )}
      </span>
    </button>
  )
}
