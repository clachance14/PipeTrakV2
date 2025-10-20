import { useMemo } from 'react'
import { useProject } from '@/contexts/ProjectContext'
import { useAuth } from '@/contexts/AuthContext'
import { DrawingTable } from '@/components/drawing-table/DrawingTable'
import { DrawingSearchInput } from '@/components/drawing-table/DrawingSearchInput'
import { StatusFilterDropdown } from '@/components/drawing-table/StatusFilterDropdown'
import { CollapseAllButton } from '@/components/drawing-table/CollapseAllButton'
import { EmptyDrawingsState } from '@/components/drawing-table/EmptyDrawingsState'
import { DrawingTableError } from '@/components/drawing-table/DrawingTableError'
import { useDrawingsWithProgress } from '@/hooks/useDrawingsWithProgress'
import { useComponentsByDrawings } from '@/hooks/useComponentsByDrawings'
import { useExpandedDrawings } from '@/hooks/useExpandedDrawings'
import { useDrawingFilters } from '@/hooks/useDrawingFilters'
import { useUpdateMilestone } from '@/hooks/useUpdateMilestone'
import type { MilestoneConfig } from '@/types/drawing-table.types'

/**
 * Drawing-Centered Component Progress Table Page
 *
 * Top-level page component that orchestrates all hooks and renders the table.
 * Features:
 * - Virtualized table with expandable drawings
 * - Search and filter controls
 * - Inline milestone updates (checkbox + percentage slider)
 * - Optimistic UI with automatic rollback
 */
export function DrawingComponentTablePage() {
  const { selectedProjectId } = useProject()
  const { user } = useAuth()

  // Fetch data
  const { data: drawings, isLoading, isError, error, refetch } = useDrawingsWithProgress(selectedProjectId!)

  // Manage expansion state
  const { expandedDrawingIds, toggleDrawing, collapseAll } = useExpandedDrawings()

  // Manage filters
  const { searchTerm, statusFilter, setSearch, setStatusFilter, filteredDrawings } = useDrawingFilters()

  // Milestone update mutation
  const updateMilestoneMutation = useUpdateMilestone()

  // Fetch components for expanded drawings (using useQueries pattern)
  const expandedDrawingIdsArray = useMemo(() => Array.from(expandedDrawingIds), [expandedDrawingIds])
  const { componentsMap } = useComponentsByDrawings(expandedDrawingIdsArray)

  // Calculate visible milestones from expanded components
  const visibleMilestones = useMemo<MilestoneConfig[]>(() => {
    const milestones = new Set<string>()
    const milestoneConfigs: MilestoneConfig[] = []

    componentsMap.forEach((components) => {
      components.forEach((component) => {
        component.template.milestones_config.forEach((m) => {
          if (!milestones.has(m.name)) {
            milestones.add(m.name)
            milestoneConfigs.push(m)
          }
        })
      })
    })

    // Sort by standard order
    const standardOrder = ['Receive', 'Fabricate', 'Install', 'Erect', 'Connect', 'Support', 'Punch', 'Test', 'Restore']
    return milestoneConfigs.sort((a, b) => {
      const aIndex = standardOrder.indexOf(a.name)
      const bIndex = standardOrder.indexOf(b.name)
      if (aIndex === -1) return 1
      if (bIndex === -1) return -1
      return aIndex - bIndex
    })
  }, [componentsMap])

  // Handle milestone update
  const handleMilestoneUpdate = (componentId: string, milestoneName: string, value: boolean | number) => {
    if (!user?.id) {
      console.error('Cannot update milestone: User not authenticated')
      return
    }

    // Convert boolean to number BEFORE passing to mutation
    const numericValue = typeof value === 'boolean' ? (value ? 1 : 0) : value

    updateMilestoneMutation.mutate({
      component_id: componentId,
      milestone_name: milestoneName,
      value: numericValue,
      user_id: user.id,
    })
  }

  // Handle clear filters
  const handleClearFilters = () => {
    setSearch('')
    setStatusFilter('all')
  }

  // Apply filters
  const displayDrawings = filteredDrawings(drawings || [])

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b border-slate-200 p-4">
          <h1 className="text-2xl font-bold">Component Progress</h1>
        </div>
        <div className="flex-1 p-4">
          <DrawingTable
            drawings={[]}
            expandedDrawingIds={new Set()}
            componentsMap={new Map()}
            visibleMilestones={[]}
            onToggleDrawing={() => {}}
            onMilestoneUpdate={() => {}}
            loading={true}
          />
        </div>
      </div>
    )
  }

  // Error state
  if (isError) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b border-slate-200 p-4">
          <h1 className="text-2xl font-bold">Component Progress</h1>
        </div>
        <div className="flex-1 p-4">
          <DrawingTableError error={error} onRetry={() => refetch()} />
        </div>
      </div>
    )
  }

  // Empty state
  if (displayDrawings.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b border-slate-200 p-4">
          <h1 className="text-2xl font-bold">Component Progress</h1>
        </div>
        <div className="flex-1 p-4">
          <EmptyDrawingsState
            hasSearch={searchTerm !== ''}
            hasFilter={statusFilter !== 'all'}
            onClearFilters={handleClearFilters}
          />
        </div>
      </div>
    )
  }

  // Main table view
  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="border-b border-slate-200 p-4 flex-shrink-0">
        <h1 className="text-2xl font-bold mb-4">Component Progress</h1>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          <DrawingSearchInput
            value={searchTerm}
            onChange={setSearch}
            placeholder="Search by drawing number..."
          />
          <StatusFilterDropdown value={statusFilter} onChange={setStatusFilter} />
          <CollapseAllButton
            onClick={collapseAll}
            disabled={expandedDrawingIds.size === 0}
          />
          <div className="ml-auto text-sm text-slate-600">
            Showing {displayDrawings.length} of {drawings?.length || 0} drawings
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0">
        <DrawingTable
          drawings={displayDrawings}
          expandedDrawingIds={expandedDrawingIds}
          componentsMap={componentsMap}
          visibleMilestones={visibleMilestones}
          onToggleDrawing={toggleDrawing}
          onMilestoneUpdate={handleMilestoneUpdate}
        />
      </div>
    </div>
  )
}
