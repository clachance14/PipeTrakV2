import { useMemo, useState } from 'react'
import { useProject } from '@/contexts/ProjectContext'
import { useAuth } from '@/contexts/AuthContext'
import { Layout } from '@/components/Layout'
import { DrawingTable } from '@/components/drawing-table/DrawingTable'
import { DrawingSearchInput } from '@/components/drawing-table/DrawingSearchInput'
import { StatusFilterDropdown } from '@/components/drawing-table/StatusFilterDropdown'
import { CollapseAllButton } from '@/components/drawing-table/CollapseAllButton'
import { EmptyDrawingsState } from '@/components/drawing-table/EmptyDrawingsState'
import { DrawingTableError } from '@/components/drawing-table/DrawingTableError'
import { DrawingBulkActions } from '@/components/drawing-table/DrawingBulkActions'
import { DrawingAssignDialog } from '@/components/drawing-table/DrawingAssignDialog'
import { Button } from '@/components/ui/button'
import { useDrawingsWithProgress } from '@/hooks/useDrawingsWithProgress'
import { useComponentsByDrawings } from '@/hooks/useComponentsByDrawings'
import { useExpandedDrawings } from '@/hooks/useExpandedDrawings'
import { useDrawingFilters } from '@/hooks/useDrawingFilters'
import { useUpdateMilestone } from '@/hooks/useUpdateMilestone'
import { useDrawingSelection } from '@/hooks/useDrawingSelection'
import { useAreas } from '@/hooks/useAreas'
import { useSystems } from '@/hooks/useSystems'
import { useTestPackages } from '@/hooks/useTestPackages'
import type { MilestoneConfig } from '@/types/drawing-table.types'
import { CheckSquare, Square } from 'lucide-react'

/**
 * Drawing-Centered Component Progress Table Page
 *
 * Top-level page component that orchestrates all hooks and renders the table.
 * Features:
 * - Virtualized table with expandable drawings
 * - Search and filter controls
 * - Inline milestone updates (checkbox + percentage slider)
 * - Optimistic UI with automatic rollback
 * - Selection mode with bulk assignment (Feature 011)
 */
export function DrawingComponentTablePage() {
  const { selectedProjectId } = useProject()
  const { user } = useAuth()

  // Feature 011: Selection mode and dialog state
  const [selectionMode, setSelectionMode] = useState(false)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)

  // Fetch data
  const { data: drawings, isLoading, isError, error, refetch } = useDrawingsWithProgress(selectedProjectId!)

  // Manage expansion state
  const { expandedDrawingIds, toggleDrawing, collapseAll } = useExpandedDrawings()

  // Manage filters and sorting
  const { searchTerm, statusFilter, sortField, sortDirection, setSearch, setStatusFilter, setSort, filterAndSortDrawings } = useDrawingFilters()

  // Milestone update mutation
  const updateMilestoneMutation = useUpdateMilestone()

  // Feature 011: Drawing selection hook (T035)
  const {
    selectedDrawingIds,
    toggleDrawing: toggleSelection,
    selectAll,
    clearSelection,
  } = useDrawingSelection()

  // Fetch lookup data for dialogs
  const { data: areas = [] } = useAreas(selectedProjectId!)
  const { data: systems = [] } = useSystems(selectedProjectId!)
  const { data: testPackages = [] } = useTestPackages(selectedProjectId!)

  // Fetch components for expanded drawings (using useQueries pattern)
  const expandedDrawingIdsArray = useMemo(() => Array.from(expandedDrawingIds), [expandedDrawingIds])
  const { componentsMap } = useComponentsByDrawings(expandedDrawingIdsArray)

  // Calculate visible milestones from expanded components
  const visibleMilestones = useMemo<MilestoneConfig[]>(() => {
    const milestones = new Set<string>()
    const milestoneConfigs: MilestoneConfig[] = []

    componentsMap.forEach((components) => {
      components.forEach((component) => {
        component.template?.milestones_config?.forEach((m) => {
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

  // Feature 011: Handle selection mode toggle (T034)
  const handleToggleSelectionMode = () => {
    setSelectionMode(!selectionMode)
    if (selectionMode) {
      // Exiting selection mode - clear selections
      clearSelection()
    }
  }

  // Feature 011: Handle bulk assignment dialog
  const handleOpenBulkAssignDialog = () => {
    setAssignDialogOpen(true)
  }

  // Apply filters and sorting
  const displayDrawings = filterAndSortDrawings(drawings || [])

  // Feature 011: Get selected drawing for dialog (single-selection mode)
  const selectedDrawing = useMemo(() => {
    if (selectedDrawingIds.size === 1) {
      const drawingId = Array.from(selectedDrawingIds)[0]
      return drawings?.find(d => d.id === drawingId)
    }
    return undefined
  }, [selectedDrawingIds, drawings])

  // Get visible drawing IDs for select all
  const visibleDrawingIds = useMemo(
    () => displayDrawings.map(d => d.id),
    [displayDrawings]
  )

  // Loading state
  if (isLoading) {
    return (
      <Layout>
        <div className="mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-6">Component Progress</h1>
          <div className="bg-white rounded-lg shadow h-[calc(100vh-200px)]">
            <DrawingTable
              drawings={[]}
              expandedDrawingIds={new Set()}
              componentsMap={new Map()}
              visibleMilestones={[]}
              sortField={sortField}
              sortDirection={sortDirection}
              onToggleDrawing={() => {}}
              onMilestoneUpdate={() => {}}
              onSort={() => {}}
              loading={true}
            />
          </div>
        </div>
      </Layout>
    )
  }

  // Error state
  if (isError) {
    return (
      <Layout>
        <div className="mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-6">Component Progress</h1>
          <div className="bg-white rounded-lg shadow p-4">
            <DrawingTableError error={error} onRetry={() => refetch()} />
          </div>
        </div>
      </Layout>
    )
  }

  // Empty state
  if (displayDrawings.length === 0) {
    return (
      <Layout>
        <div className="mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-6">Component Progress</h1>
          <div className="bg-white rounded-lg shadow p-4">
            <EmptyDrawingsState
              hasSearch={searchTerm !== ''}
              hasFilter={statusFilter !== 'all'}
              onClearFilters={handleClearFilters}
            />
          </div>
        </div>
      </Layout>
    )
  }

  // Main table view
  return (
    <Layout>
      <div className="mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
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

            {/* Feature 011: Selection Mode Toggle (T034) */}
            <Button
              variant={selectionMode ? 'default' : 'outline'}
              size="sm"
              onClick={handleToggleSelectionMode}
              className="flex items-center gap-2"
            >
              {selectionMode ? (
                <>
                  <CheckSquare className="h-4 w-4" />
                  Exit Select Mode
                </>
              ) : (
                <>
                  <Square className="h-4 w-4" />
                  Select Mode
                </>
              )}
            </Button>

            <div className="ml-auto text-sm text-slate-600">
              Showing {displayDrawings.length} of {drawings?.length || 0} drawings
            </div>
          </div>
        </div>

        {/* Feature 011: Bulk Actions Toolbar (T036) */}
        {selectionMode && selectedDrawingIds.size > 0 && (
          <div className="mb-4">
            <DrawingBulkActions
              selectedCount={selectedDrawingIds.size}
              onAssignMetadata={handleOpenBulkAssignDialog}
              onClearSelection={clearSelection}
            />
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-lg shadow h-[calc(100vh-280px)]">
          <DrawingTable
            drawings={displayDrawings}
            expandedDrawingIds={expandedDrawingIds}
            componentsMap={componentsMap}
            visibleMilestones={visibleMilestones}
            sortField={sortField}
            sortDirection={sortDirection}
            onToggleDrawing={toggleDrawing}
            onMilestoneUpdate={handleMilestoneUpdate}
            onSort={setSort}
            selectionMode={selectionMode}
            selectedDrawingIds={selectedDrawingIds}
            onToggleSelection={toggleSelection}
            onSelectAll={() => selectAll(visibleDrawingIds)}
          />
        </div>

        {/* Feature 011: Drawing Assignment Dialog (T037) */}
        <DrawingAssignDialog
          // Single-selection mode: pass drawing prop to show current values
          // Multi-selection mode: pass drawingIds for bulk assignment with 'No change' defaults
          drawing={selectedDrawing}
          drawingIds={selectedDrawing ? undefined : Array.from(selectedDrawingIds)}
          areas={areas}
          systems={systems}
          testPackages={testPackages}
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
        />
      </div>
    </Layout>
  )
}
