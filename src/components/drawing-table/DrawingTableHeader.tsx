import { SortableColumnHeader } from '../table/SortableColumnHeader'
import { Checkbox } from '@/components/ui/checkbox'
import type { SortField, SortDirection } from '@/types/drawing-table.types'

interface DrawingTableHeaderProps {
  sortField: SortField
  sortDirection: SortDirection
  onSort: (field: SortField, direction: SortDirection) => void
  /** Selection mode active */
  selectionMode?: boolean
  /** Whether all visible drawings are selected */
  allSelected?: boolean
  /** Callback when "Select All" checkbox clicked */
  onSelectAll?: () => void
  /** Mobile viewport indicator (≤1024px) */
  isMobile?: boolean
}

/**
 * Table header for drawing table
 *
 * Displays column headers with sorting controls.
 * Matches the column structure of DrawingRow component.
 */
export function DrawingTableHeader({
  sortField,
  sortDirection,
  onSort,
  selectionMode = false,
  allSelected = false,
  onSelectAll,
  isMobile = false,
}: DrawingTableHeaderProps) {
  return (
    <div className={`flex items-center ${isMobile ? 'gap-1 px-2 text-xs' : 'gap-4 px-5 text-sm'} py-3 bg-slate-100 border-b border-slate-300 font-semibold text-slate-700 sticky top-0 z-10`}>
      {/* Select All checkbox (shown only in selection mode) */}
      {selectionMode && onSelectAll && (
        <Checkbox
          checked={allSelected}
          onCheckedChange={onSelectAll}
          aria-label="Select all drawings"
        />
      )}

      {/* Spacer for chevron icon */}
      <div className={isMobile ? 'min-w-[44px] flex-shrink-0' : 'w-5'} />

      {/* Drawing Number */}
      <div className={isMobile ? 'min-w-[70px] flex-shrink-0' : 'min-w-[140px]'}>
        <SortableColumnHeader
          label="Drawing"
          field="drawing_no_norm"
          currentSortField={sortField}
          currentSortDirection={sortDirection}
          onSort={onSort}
        />
      </div>

      {/* Spec - Hidden on mobile */}
      {!isMobile && (
        <div className="min-w-[80px]">
          <SortableColumnHeader
            label="Spec"
            field="spec"
            currentSortField={sortField}
            currentSortDirection={sortDirection}
            onSort={onSort}
          />
        </div>
      )}

      {/* Area */}
      <div className={isMobile ? 'flex-1' : 'min-w-[60px] ml-auto'}>
        <SortableColumnHeader
          label="Area"
          field="area"
          currentSortField={sortField}
          currentSortDirection={sortDirection}
          onSort={onSort}
        />
      </div>

      {/* System */}
      <div className={isMobile ? 'flex-1' : 'min-w-[60px]'}>
        <SortableColumnHeader
          label="System"
          field="system"
          currentSortField={sortField}
          currentSortDirection={sortDirection}
          onSort={onSort}
        />
      </div>

      {/* Test Package - Hidden on mobile */}
      {!isMobile && (
        <div className="min-w-[80px]">
          <SortableColumnHeader
            label="Test Package"
            field="test_package"
            currentSortField={sortField}
            currentSortDirection={sortDirection}
            onSort={onSort}
          />
        </div>
      )}

      {/* Progress */}
      <div className={isMobile ? 'min-w-[45px] flex-shrink-0 text-right' : 'min-w-[130px]'}>
        <SortableColumnHeader
          label={isMobile ? 'Prog' : 'Progress'}
          field="avg_percent_complete"
          currentSortField={sortField}
          currentSortDirection={sortDirection}
          onSort={onSort}
        />
      </div>

      {/* Component Count - Hidden on mobile */}
      {!isMobile && (
        <div className="min-w-[90px] text-right">
          <SortableColumnHeader
            label="Items"
            field="total_components"
            currentSortField={sortField}
            currentSortDirection={sortDirection}
            onSort={onSort}
          />
        </div>
      )}
    </div>
  )
}
