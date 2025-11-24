import { ChevronRight, Pencil } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
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
  const navigate = useNavigate()

  // Desktop: detailed progress display
  const progressSummary = `${drawing.completed_components}/${drawing.total_components} • ${Math.round(drawing.avg_percent_complete)}%`
  const componentCountText = drawing.total_components === 1 ? '1 item' : `${drawing.total_components} items`

  // Mobile: single-line summary "DRAIN-1 · ES-03 · A1 · S1 · TP1 · 100%"
  const mobileSummary = [
    drawing.drawing_no_norm,
    drawing.spec || '—',
    drawing.area?.name || '—',
    drawing.system?.name || '—',
    drawing.test_package?.name || '—',
    `${Math.round(drawing.avg_percent_complete)}%`
  ].join(' · ')

  // Navigate to test package detail page
  const handleTestPackageClick = (e: React.MouseEvent, packageId: string) => {
    e.stopPropagation()
    navigate(`/packages/${packageId}/components`)
  }

  return (
    <div
      data-drawing-id={drawing.id}
      style={style}
      className={`group flex items-center ${isMobile ? 'gap-2 px-2' : 'gap-4 px-5'} py-3.5 bg-white border-l-[3px] border-blue-600 hover:bg-slate-50 transition-all duration-150 shadow-sm hover:shadow-md`}
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
        className={`cursor-pointer flex items-center justify-center ${isMobile ? 'min-h-[44px] min-w-[44px] flex-shrink-0' : ''}`}
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

      {isMobile ? (
        /* Mobile: Single-line summary */
        <div className="flex-1 text-xs font-semibold text-slate-900 truncate">
          {mobileSummary}
        </div>
      ) : (
        /* Desktop: Multi-column layout */
        <>
          {/* Drawing number */}
          <div className="min-w-[140px] text-base font-semibold text-slate-900 truncate">
            {drawing.drawing_no_norm}
          </div>

          {/* Spec (most common from components) */}
          <div className="min-w-[80px] text-sm text-slate-600 truncate">
            {drawing.spec || '—'}
          </div>

          {/* Area (with inline edit pencil) */}
          <div className="min-w-[60px] flex items-center gap-1.5 text-sm text-slate-600 truncate ml-auto">
            <span className="truncate">{drawing.area?.name || '—'}</span>
            {onEditMetadata && (
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
          <div className="min-w-[60px] flex items-center gap-1.5 text-sm text-slate-600 truncate">
            <span className="truncate">{drawing.system?.name || '—'}</span>
            {onEditMetadata && (
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

          {/* Test Package (with inline edit pencil) */}
          <div className="min-w-[80px] flex items-center gap-1.5 text-sm text-slate-600">
            {drawing.test_package ? (
              <span
                className="text-blue-600 hover:underline cursor-pointer"
                onClick={(e) => handleTestPackageClick(e, drawing.test_package!.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleTestPackageClick(e as unknown as React.MouseEvent, drawing.test_package!.id)
                  }
                }}
                aria-label={`Navigate to test package ${drawing.test_package!.name}`}
              >
                {drawing.test_package.name}
              </span>
            ) : (
              <span>—</span>
            )}
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

          {/* Progress summary */}
          <div className="min-w-[130px] text-sm font-semibold text-slate-800 text-right">
            {progressSummary}
          </div>

          {/* Component count */}
          <div className="min-w-[90px] text-xs font-medium text-slate-500 text-right uppercase tracking-wide">
            {componentCountText}
          </div>
        </>
      )}
    </div>
  )
}
