import { ChevronRight, Pencil } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import type { DrawingRow as DrawingRowType } from '@/types/drawing-table.types'

export interface DrawingRowProps {
  drawing: DrawingRowType
  isExpanded: boolean
  onToggle: () => void
  style?: React.CSSProperties
  /** Selection mode active */
  selectionMode?: boolean
  /** Whether this drawing is selected */
  isSelected?: boolean
  /** Callback when selection checkbox clicked */
  onSelect?: (drawingId: string) => void
  /** Callback when pencil icon clicked for inline edit */
  onEditMetadata?: (drawing: DrawingRowType, field: 'area' | 'system' | 'package') => void
  /** Mobile viewport indicator (≤1024px) */
  isMobile?: boolean
}

/**
 * Drawing parent row in table
 *
 * Displays drawing number, title, progress summary, and component count.
 * Clickable to expand/collapse component rows beneath.
 * Shows chevron icon that rotates when expanded.
 */
export function DrawingRow({
  drawing,
  isExpanded,
  onToggle,
  style,
  selectionMode = false,
  isSelected = false,
  onSelect,
  onEditMetadata,
  isMobile = false,
}: DrawingRowProps) {
  // Mobile: simplified progress display "47%" instead of "47% Complete"
  const progressSummary = isMobile
    ? `${Math.round(drawing.avg_percent_complete)}%`
    : `${drawing.completed_components}/${drawing.total_components} • ${Math.round(drawing.avg_percent_complete)}%`
  const componentCountText = drawing.total_components === 1 ? '1 item' : `${drawing.total_components} items`

  return (
    <div
      style={style}
      className={`group flex items-center ${isMobile ? 'gap-2 px-3' : 'gap-4 px-5'} py-3.5 bg-white border-l-[3px] border-blue-600 hover:bg-slate-50 transition-all duration-150 shadow-sm hover:shadow-md`}
    >
      {/* Selection checkbox (shown only in selection mode) */}
      {selectionMode && onSelect && (
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect(drawing.id)}
          aria-label={`Select drawing ${drawing.drawing_no_norm}`}
          onClick={(e) => e.stopPropagation()}
        />
      )}

      {/* Expand icon - Mobile: 44px tap target */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} drawing ${drawing.drawing_no_norm}`}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggle()
          }
        }}
        className={`cursor-pointer flex items-center justify-center ${isMobile ? 'min-h-[44px] min-w-[44px]' : ''}`}
      >
        {drawing.total_components > 0 && (
          <ChevronRight
            className={`${isMobile ? 'h-6 w-6' : 'h-5 w-5'} text-slate-500 transition-transform duration-200 ${
              isExpanded ? 'rotate-90' : ''
            }`}
          />
        )}
        {drawing.total_components === 0 && <div className={isMobile ? 'w-6' : 'w-5'} />}
      </div>

      {/* Drawing number */}
      <div className={`${isMobile ? 'min-w-[100px]' : 'min-w-[140px]'} font-semibold text-base text-slate-900`}>
        {drawing.drawing_no_norm}
      </div>

      {/* Title - Hidden on mobile */}
      {!isMobile && (
        <div className="flex-1 text-sm text-slate-600">
          {drawing.title || '—'}
        </div>
      )}

      {/* Area (with inline edit pencil) */}
      <div className={`${isMobile ? 'min-w-[70px]' : 'min-w-[100px]'} flex items-center gap-1.5 text-sm text-slate-600`}>
        <span>{drawing.area?.name || '—'}</span>
        {!isMobile && onEditMetadata && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEditMetadata(drawing, 'area')
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-200 rounded"
            aria-label="Edit area"
          >
            <Pencil className="h-3.5 w-3.5 text-slate-500" />
          </button>
        )}
      </div>

      {/* System (with inline edit pencil) */}
      <div className={`${isMobile ? 'min-w-[70px]' : 'min-w-[100px]'} flex items-center gap-1.5 text-sm text-slate-600`}>
        <span>{drawing.system?.name || '—'}</span>
        {!isMobile && onEditMetadata && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEditMetadata(drawing, 'system')
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-200 rounded"
            aria-label="Edit system"
          >
            <Pencil className="h-3.5 w-3.5 text-slate-500" />
          </button>
        )}
      </div>

      {/* Test Package (with inline edit pencil) - Hidden on mobile */}
      {!isMobile && (
        <div className="min-w-[120px] flex items-center gap-1.5 text-sm text-slate-600">
          <span>{drawing.test_package?.name || '—'}</span>
          {onEditMetadata && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEditMetadata(drawing, 'package')
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-200 rounded"
              aria-label="Edit test package"
            >
              <Pencil className="h-3.5 w-3.5 text-slate-500" />
            </button>
          )}
        </div>
      )}

      {/* Progress summary */}
      <div className={`${isMobile ? 'min-w-[60px]' : 'min-w-[130px]'} text-sm font-semibold text-slate-800`}>
        {progressSummary}
      </div>

      {/* Component count - Hidden on mobile */}
      {!isMobile && (
        <div className="min-w-[90px] text-xs font-medium text-slate-500 text-right uppercase tracking-wide">
          {componentCountText}
        </div>
      )}
    </div>
  )
}
