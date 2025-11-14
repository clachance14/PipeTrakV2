import { useRef, useMemo, forwardRef, useImperativeHandle, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { DrawingRow } from './DrawingRow'
import { ComponentRow } from './ComponentRow'
import { DrawingTableSkeleton } from './DrawingTableSkeleton'
import { DrawingTableHeader } from './DrawingTableHeader'
import { StickyDrawingPortal } from './StickyDrawingPortal'
import { isElementVisible, shouldScrollToElement, scrollToElement } from '@/utils/scroll-helpers'
import type { DrawingRow as DrawingRowType, ComponentRow as ComponentRowType, SortField, SortDirection } from '@/types/drawing-table.types'

export interface DrawingTableProps {
  drawings: DrawingRowType[]
  expandedDrawingId: string | null
  componentsMap: Map<string, ComponentRowType[]>
  sortField: SortField
  sortDirection: SortDirection
  onToggleDrawing: (drawingId: string) => void
  onMilestoneUpdate: (componentId: string, milestoneName: string, value: boolean | number) => void
  onSort: (field: SortField, direction: SortDirection) => void
  loading?: boolean
  // Feature 011: Selection mode props
  selectionMode?: boolean
  selectedDrawingIds?: Set<string>
  onToggleSelection?: (drawingId: string) => void
  onSelectAll?: () => void
  // Feature 015: Mobile detection
  isMobile?: boolean
  // Feature 020: Component metadata editing
  onComponentClick?: (componentId: string) => void
}

export interface DrawingTableHandle {
  scrollToDrawingIndex: (index: number) => void
}

type VirtualRow =
  | { type: 'drawing'; data: DrawingRowType }
  | { type: 'component'; data: ComponentRowType; drawingId: string }

/**
 * Virtualized drawing/component table
 *
 * Uses @tanstack/react-virtual for efficient rendering of large lists.
 * Calculates visible rows by flattening drawings + expanded components.
 * Overscan: 10 rows desktop, 5 rows mobile for smooth scrolling.
 * Row height: Drawing 64px, Component 60px desktop | 64px mobile.
 */
export const DrawingTable = forwardRef<DrawingTableHandle, DrawingTableProps>(function DrawingTable({
  drawings,
  expandedDrawingId,
  componentsMap,
  sortField,
  sortDirection,
  onToggleDrawing,
  onMilestoneUpdate,
  onSort,
  loading = false,
  selectionMode = false,
  selectedDrawingIds = new Set(),
  onToggleSelection,
  onSelectAll,
  isMobile = false,
  onComponentClick,
}, ref) {
  const parentRef = useRef<HTMLDivElement>(null)
  const prevExpandedIdRef = useRef<string | null>(null)

  // Smart scroll when expansion changes
  useEffect(() => {
    if (!parentRef.current) return

    const isExpanding = expandedDrawingId && expandedDrawingId !== prevExpandedIdRef.current
    const isCollapsing = !expandedDrawingId && prevExpandedIdRef.current

    // Find the drawing row element
    const targetDrawingId = isExpanding ? expandedDrawingId : (isCollapsing ? prevExpandedIdRef.current : null)

    if (targetDrawingId) {
      const drawingElement = parentRef.current.querySelector(
        `[data-drawing-id="${targetDrawingId}"]`
      ) as HTMLElement

      if (drawingElement && parentRef.current) {
        const isVisible = isElementVisible(drawingElement, parentRef.current)

        if (shouldScrollToElement(isVisible)) {
          scrollToElement(drawingElement, parentRef.current)
        }
      }
    }

    prevExpandedIdRef.current = expandedDrawingId
  }, [expandedDrawingId])

  // Calculate visible rows (drawings + expanded components)
  const visibleRows = useMemo<VirtualRow[]>(() => {
    const rows: VirtualRow[] = []

    drawings.forEach((drawing) => {
      // Exclude expanded drawing from virtualizer (rendered in portal)
      if (drawing.id !== expandedDrawingId) {
        // Render collapsed drawing row
        rows.push({ type: 'drawing', data: drawing })
      } else {
        // Include component rows for expanded drawing
        const components = componentsMap.get(drawing.id) || []
        components.forEach((component) => {
          rows.push({
            type: 'component',
            data: component,
            drawingId: drawing.id
          })
        })
      }
    })

    return rows
  }, [drawings, expandedDrawingId, componentsMap])

  // Find expanded drawing for sticky portal
  const expandedDrawing = useMemo(() => {
    if (!expandedDrawingId) return null
    return drawings.find(d => d.id === expandedDrawingId) || null
  }, [drawings, expandedDrawingId])

  // Set up virtualizer
  // Mobile: reduce overscan (10 → 5), increase component row height for milestone cards with wrapping
  const virtualizer = useVirtualizer({
    count: visibleRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const row = visibleRows[index]
      if (row?.type === 'drawing') {
        return 64 // Drawing row: fixed 64px
      }
      // Component rows:
      // Desktop: Check if component has partial milestones (threaded pipes need extra height for labels + inputs)
      //   - With partial milestones: 100px (py-5 padding + milestone label + input)
      //   - Discrete milestones only: 60px (py-3 padding + checkbox)
      // Mobile: Moderately compact layout with button-based milestone controls
      //   - 5 milestones (2 rows): 176px (identity + metadata + 2 milestone rows + padding)
      //   - 3 milestones (1 row): 123px (identity + metadata + 1 milestone row + padding)
      if (row?.type === 'component') {
        if (isMobile) {
          const milestoneCount = row.data.template.milestones_config.length
          // Calculate rows needed (3 milestones per row in grid)
          const milestoneRows = Math.ceil(milestoneCount / 3)
          // Moderately reduced height for mobile button layout
          return 70 + (milestoneRows * 53)
        }
        // Check if component has any partial milestones
        const hasPartialMilestones = row.data.template.milestones_config.some(m => m.is_partial)
        return hasPartialMilestones ? 100 : 60
      }
      return 60 // fallback
    },
    overscan: isMobile ? 5 : 10,
  })

  // Expose scroll method to parent via ref
  useImperativeHandle(ref, () => ({
    scrollToDrawingIndex: (index: number) => {
      virtualizer.scrollToIndex(index, {
        align: 'start',
        behavior: 'smooth',
      })
    },
  }), [virtualizer])

  if (loading) {
    return <DrawingTableSkeleton rowCount={10} />
  }

  return (
    <div className="h-full flex flex-col">
      {/* Table Header */}
      <DrawingTableHeader
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={onSort}
        selectionMode={selectionMode}
        onSelectAll={onSelectAll}
        isMobile={isMobile}
      />

      {/* Sticky Portal for Expanded Drawing */}
      <StickyDrawingPortal
        drawing={expandedDrawing}
        isExpanded={!!expandedDrawingId}
        onToggle={onToggleDrawing}
        isMobile={isMobile}
      />

      {/* Virtualized Content */}
      <div
        ref={parentRef}
        className="flex-1 overflow-auto"
        style={{ contain: 'strict' }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const row = visibleRows[virtualRow.index]
          if (!row) return null

          if (row.type === 'drawing') {
            return (
              <div
                key={virtualRow.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <DrawingRow
                  drawing={row.data}
                  isExpanded={expandedDrawingId === row.data.id}
                  onToggle={() => onToggleDrawing(row.data.id)}
                  selectionMode={selectionMode}
                  isSelected={selectedDrawingIds.has(row.data.id)}
                  onSelect={onToggleSelection}
                  isMobile={isMobile}
                />
              </div>
            )
          }

          // Component row
          // Find the parent drawing for this component
          const parentDrawing = drawings.find(d => d.id === row.drawingId)

          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <ComponentRow
                component={row.data}
                drawing={parentDrawing}
                area={row.data.area}
                system={row.data.system}
                testPackage={row.data.test_package}
                onMilestoneUpdate={onMilestoneUpdate}
                onClick={onComponentClick}
              />
            </div>
          )
        })}
        </div>
      </div>
    </div>
  )
})
