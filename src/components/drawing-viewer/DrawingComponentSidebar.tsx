/**
 * DrawingComponentSidebar Component
 * Shows tracked field components grouped by type with editable milestone controls,
 * plus a collapsible reference section for non-tracked BOM items.
 */

import { useState, useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { useComponentsByDrawing } from '@/hooks/useComponentsByDrawing'
import { useDrawingBomItems } from '@/hooks/useDrawingBomItems'
import { useUpdateMilestone } from '@/hooks/useUpdateMilestone'
import { useAuth } from '@/contexts/AuthContext'
import { isAggregateType } from '@/lib/component-type-labels'
import { ComponentGroup } from './ComponentGroup'
import { BomReferenceSection } from './BomReferenceSection'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ComponentRow } from '@/types/drawing-table.types'

type SortField = 'item_number' | 'identity' | 'percent'
type SortDir = 'asc' | 'desc'
type StatusFilter = 'all' | 'not-started' | 'in-progress' | 'complete'

interface DrawingComponentSidebarProps {
  drawingId: string
  /** Whether the current user can add/edit components */
  canEditComponents?: boolean
  /** Called when the "+ Add" button is clicked */
  onAddComponent?: () => void
  /** Called when a component card is clicked */
  onComponentClick?: (componentId: string) => void
}

// ============================================================================
// Pure functions for grouping, filtering, sorting
// ============================================================================

/** Filter components by completion status */
export function filterByStatus(
  components: ComponentRow[],
  status: StatusFilter,
): ComponentRow[] {
  if (status === 'all') return components
  return components.filter((c) => {
    switch (status) {
      case 'not-started':
        return c.percent_complete === 0
      case 'in-progress':
        return c.percent_complete > 0 && c.percent_complete < 100
      case 'complete':
        return c.percent_complete >= 100
      default:
        return true
    }
  })
}

/** Group order: pipe/threaded_pipe first, then alphabetical by type */
function typeGroupOrder(type: string): number {
  if (isAggregateType(type)) return 0
  return 1
}

/** Group components by component_type, maintaining sort within groups */
export function groupComponentsByType(
  components: ComponentRow[],
): Map<string, ComponentRow[]> {
  const groups = new Map<string, ComponentRow[]>()

  for (const component of components) {
    const type = component.component_type
    const existing = groups.get(type)
    if (existing) {
      existing.push(component)
    } else {
      groups.set(type, [component])
    }
  }

  // Sort group keys: aggregates first, then alphabetical
  const sortedEntries = [...groups.entries()].sort(([a], [b]) => {
    const orderDiff = typeGroupOrder(a) - typeGroupOrder(b)
    if (orderDiff !== 0) return orderDiff
    return a.localeCompare(b)
  })

  return new Map(sortedEntries)
}

/** Sort components within a group */
function sortComponents(
  components: ComponentRow[],
  sortField: SortField,
  sortDir: SortDir,
): ComponentRow[] {
  const sorted = [...components]
  const dir = sortDir === 'asc' ? 1 : -1

  sorted.sort((a, b) => {
    if (sortField === 'item_number') {
      const aNum = (a.attributes?.item_number as number) ?? Infinity
      const bNum = (b.attributes?.item_number as number) ?? Infinity
      return (aNum - bNum) * dir
    }
    if (sortField === 'percent') {
      return (a.percent_complete - b.percent_complete) * dir
    }
    // identity
    return a.identityDisplay.localeCompare(b.identityDisplay) * dir
  })

  return sorted
}

// ============================================================================
// Main component
// ============================================================================

export function DrawingComponentSidebar({ drawingId, canEditComponents, onAddComponent, onComponentClick }: DrawingComponentSidebarProps) {
  const { user } = useAuth()
  const { data: components, isLoading: componentsLoading } = useComponentsByDrawing(
    drawingId,
    true,
  )
  const { data: bomItems, isLoading: bomLoading } = useDrawingBomItems(drawingId)
  const { mutate: updateMilestone } = useUpdateMilestone()

  const handleMilestoneChange = (
    componentId: string,
    milestoneName: string,
    value: boolean | number,
  ) => {
    if (!user?.id) return

    updateMilestone({
      component_id: componentId,
      milestone_name: milestoneName,
      value,
      user_id: user.id,
    })
  }

  const [sortField, setSortField] = useState<SortField>('item_number')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const isLoading = componentsLoading || bomLoading
  const rawComponents = components ?? []
  const totalComponents = rawComponents.length

  // Progress summary
  const completedCount = useMemo(
    () => rawComponents.filter((c) => c.percent_complete >= 100).length,
    [rawComponents],
  )
  const avgPercent = useMemo(() => {
    if (rawComponents.length === 0) return 0
    const sum = rawComponents.reduce((acc, c) => acc + c.percent_complete, 0)
    return Math.round(sum / rawComponents.length)
  }, [rawComponents])

  // Filter → group → sort within groups
  const groupedComponents = useMemo(() => {
    const filtered = filterByStatus(rawComponents, statusFilter)
    const groups = groupComponentsByType(filtered)

    // Sort within each group
    const sortedGroups = new Map<string, ComponentRow[]>()
    for (const [type, comps] of groups) {
      sortedGroups.set(type, sortComponents(comps, sortField, sortDir))
    }

    return sortedGroups
  }, [rawComponents, statusFilter, sortField, sortDir])

  return (
    <div className="h-full flex flex-col bg-white border-l">
      {/* Header */}
      <div className="px-4 py-3 border-b space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Field Components</h3>
            {totalComponents > 0 && (
              <p className="text-xs text-gray-500 mt-0.5">
                {completedCount} of {totalComponents} complete ({avgPercent}%)
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {canEditComponents && (
              <Button variant="outline" size="sm" onClick={onAddComponent}>
                + Add
              </Button>
            )}
            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-gray-100 text-xs font-medium text-gray-700">
              {totalComponents}
            </span>
          </div>
        </div>

        {/* Filter + Sort controls */}
        {totalComponents > 1 && (
          <div className="flex items-center gap-2">
            <Select
              value={statusFilter}
              onValueChange={(val) => setStatusFilter(val as StatusFilter)}
            >
              <SelectTrigger className="h-7 w-[90px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="not-started">Not Started</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1 ml-auto">
              <Button
                variant={sortField === 'item_number' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => toggleSort('item_number')}
              >
                Pt# {sortField === 'item_number' && (sortDir === 'asc' ? '↑' : '↓')}
              </Button>
              <Button
                variant={sortField === 'identity' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => toggleSort('identity')}
              >
                Name {sortField === 'identity' && (sortDir === 'asc' ? '↑' : '↓')}
              </Button>
              <Button
                variant={sortField === 'percent' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => toggleSort('percent')}
              >
                % {sortField === 'percent' && (sortDir === 'asc' ? '↑' : '↓')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
        </div>
      )}

      {/* Component list — grouped by type */}
      {!isLoading && (
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {totalComponents === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">No field components</p>
          ) : groupedComponents.size === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">
              No components match filter
            </p>
          ) : (
            <div className="space-y-1">
              {[...groupedComponents.entries()].map(([type, comps]) => (
                <ComponentGroup
                  key={type}
                  componentType={type}
                  components={comps}
                  onMilestoneChange={handleMilestoneChange}
                  onComponentClick={onComponentClick}
                />
              ))}
            </div>
          )}

          {/* BOM reference items */}
          {bomItems && bomItems.length > 0 && (
            <div className="mt-4">
              <BomReferenceSection items={bomItems} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
