import { ChevronRight } from 'lucide-react'
import type { DrawingRow as DrawingRowType } from '@/types/drawing-table.types'

export interface DrawingRowProps {
  drawing: DrawingRowType
  isExpanded: boolean
  onToggle: () => void
  style?: React.CSSProperties
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
}: DrawingRowProps) {
  const progressSummary = `${drawing.completed_components}/${drawing.total_components} • ${Math.round(drawing.avg_percent_complete)}%`
  const componentCountText = drawing.total_components === 1 ? '1 item' : `${drawing.total_components} items`

  return (
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
      style={style}
      className="flex items-center gap-4 px-5 py-3.5 bg-white border-l-[3px] border-blue-600 cursor-pointer hover:bg-slate-50 transition-all duration-150 shadow-sm hover:shadow-md"
    >
      {/* Expand icon */}
      {drawing.total_components > 0 && (
        <ChevronRight
          className={`h-5 w-5 text-slate-500 transition-transform duration-200 ${
            isExpanded ? 'rotate-90' : ''
          }`}
        />
      )}
      {drawing.total_components === 0 && <div className="w-5" />}

      {/* Drawing number */}
      <div className="min-w-[140px] font-semibold text-base text-slate-900">
        {drawing.drawing_no_norm}
      </div>

      {/* Title */}
      <div className="flex-1 text-sm text-slate-600">
        {drawing.title || '—'}
      </div>

      {/* Progress summary */}
      <div className="min-w-[130px] text-sm font-semibold text-slate-800">
        {progressSummary}
      </div>

      {/* Component count */}
      <div className="min-w-[90px] text-xs font-medium text-slate-500 text-right uppercase tracking-wide">
        {componentCountText}
      </div>
    </div>
  )
}
