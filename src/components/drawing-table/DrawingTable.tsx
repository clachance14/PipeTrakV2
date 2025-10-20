import { useRef, useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { DrawingRow } from './DrawingRow'
import { ComponentRow } from './ComponentRow'
import { DrawingTableSkeleton } from './DrawingTableSkeleton'
import type { DrawingRow as DrawingRowType, ComponentRow as ComponentRowType, MilestoneConfig } from '@/types/drawing-table.types'

export interface DrawingTableProps {
  drawings: DrawingRowType[]
  expandedDrawingIds: Set<string>
  componentsMap: Map<string, ComponentRowType[]>
  visibleMilestones: MilestoneConfig[]
  onToggleDrawing: (drawingId: string) => void
  onMilestoneUpdate: (componentId: string, milestoneName: string, value: boolean | number) => void
  loading?: boolean
}

type VirtualRow =
  | { type: 'drawing'; data: DrawingRowType }
  | { type: 'component'; data: ComponentRowType; drawingId: string }

/**
 * Virtualized drawing/component table
 *
 * Uses @tanstack/react-virtual for efficient rendering of large lists.
 * Calculates visible rows by flattening drawings + expanded components.
 * Overscan: 10 rows for smooth scrolling.
 */
export function DrawingTable({
  drawings,
  expandedDrawingIds,
  componentsMap,
  visibleMilestones,
  onToggleDrawing,
  onMilestoneUpdate,
  loading = false,
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
  const virtualizer = useVirtualizer({
    count: visibleRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const row = visibleRows[index]
      return row?.type === 'drawing' ? 64 : 60 // Drawing: 64px, Component: 60px
    },
    overscan: 10,
  })

  if (loading) {
    return <DrawingTableSkeleton rowCount={10} />
  }

  return (
    <div
      ref={parentRef}
      className="h-full overflow-auto"
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
                />
              </div>
            )
          }

          // Component row
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
                visibleMilestones={visibleMilestones}
                onMilestoneUpdate={onMilestoneUpdate}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
