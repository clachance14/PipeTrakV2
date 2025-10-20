import { FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface EmptyDrawingsStateProps {
  hasSearch: boolean
  hasFilter: boolean
  onClearFilters: () => void
}

/**
 * Empty state for drawing table
 *
 * Shows when no drawings match current filters.
 * Displays FileText icon, title, and conditional description.
 * Shows clear filters button if filters are active.
 */
export function EmptyDrawingsState({
  hasSearch,
  hasFilter,
  onClearFilters,
}: EmptyDrawingsStateProps) {
  const hasActiveFilters = hasSearch || hasFilter
  const description = hasActiveFilters
    ? 'Try adjusting your search or filters'
    : 'No drawings exist for this project'

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <FileText className="h-16 w-16 text-slate-400 mb-4" />
      <h3 className="text-lg font-semibold text-slate-900 mb-2">
        No drawings found
      </h3>
      <p className="text-sm text-slate-600 mb-6">{description}</p>
      {hasActiveFilters && (
        <Button variant="outline" onClick={onClearFilters}>
          Clear Filters
        </Button>
      )}
    </div>
  )
}
