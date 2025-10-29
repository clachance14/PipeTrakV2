import { useRef, useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { DrawingRow } from './DrawingRow'
import { ComponentRow } from './ComponentRow'
import { DrawingTableSkeleton } from './DrawingTableSkeleton'
import { DrawingTableHeader } from './DrawingTableHeader'
import type { DrawingRow as DrawingRowType, ComponentRow as ComponentRowType, SortField, SortDirection } from '@/types/drawing-table.types'

export interface DrawingTableProps {
  drawings: DrawingRowType[]
  expandedDrawingIds: Set<string>
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
export function DrawingTable({
  drawings,
  expandedDrawingIds,
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
}: DrawingTableProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  // Calculate visible rows (drawings + expanded components)
  const visibleRows = useMemo<VirtualRow[]>(() => {
    const rows: VirtualRow[] = []

    drawings.forEach((drawing) => {
      // Add drawing row
      rows.push({ type: 'drawing', data: drawing })

      // Add component rows if expanded
      if (expandedDrawingIds.has(drawing.id)) {
        const components = componentsMap.get(drawing.id) || []
        components.forEach((component) => {
          rows.push({ type: 'component', data: component, drawingId: drawing.id })
        })
      }
    })

    return rows
  }, [drawings, expandedDrawingIds, componentsMap])

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
      // Desktop: 60px (compact table row)
      // Mobile: 150px (card with large vertical milestone layout: 32px checkbox + label + identity + metadata)
      return isMobile ? 150 : 60
    },
    overscan: isMobile ? 5 : 10,
  })

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
                  isExpanded={expandedDrawingIds.has(row.data.id)}
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
}
