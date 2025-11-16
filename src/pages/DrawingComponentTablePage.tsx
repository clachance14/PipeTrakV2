import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { useProject } from '@/contexts/ProjectContext'
import { useAuth } from '@/contexts/AuthContext'
import { Layout } from '@/components/Layout'
import { DrawingTable, type DrawingTableHandle } from '@/components/drawing-table/DrawingTable'
import { MobileFilterStack } from '@/components/drawing-table/MobileFilterStack'
import { EmptyDrawingsState } from '@/components/drawing-table/EmptyDrawingsState'
import { DrawingTableError } from '@/components/drawing-table/DrawingTableError'
import { DrawingBulkActions } from '@/components/drawing-table/DrawingBulkActions'
import { DrawingAssignDialog } from '@/components/drawing-table/DrawingAssignDialog'
import { WelderAssignDialog } from '@/components/field-welds/WelderAssignDialog'
import { ComponentMetadataModal } from '@/components/component-metadata/ComponentMetadataModal'
import { useDrawingsWithProgress } from '@/hooks/useDrawingsWithProgress'
import { useComponentsByDrawings } from '@/hooks/useComponentsByDrawings'
import { useExpandedDrawings } from '@/hooks/useExpandedDrawings'
import { useDrawingFilters } from '@/hooks/useDrawingFilters'
import { useUpdateMilestone } from '@/hooks/useUpdateMilestone'
import { useDrawingSelection } from '@/hooks/useDrawingSelection'
import { useAreas } from '@/hooks/useAreas'
import { useSystems } from '@/hooks/useSystems'
import { useTestPackages } from '@/hooks/useTestPackages'
import { useMobileDetection } from '@/hooks/useMobileDetection'
import { useMobileFilterState } from '@/hooks/useMobileFilterState'

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

  // Feature 015: Mobile detection
  const isMobile = useMobileDetection()

  // Feature 015: Mobile filter expand/collapse state
  const { isExpanded, handleToggle } = useMobileFilterState()

  // Feature 011: Selection mode and dialog state
  const [selectionMode, setSelectionMode] = useState(false)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)

  // Field weld welder assignment dialog state
  const [welderDialogOpen, setWelderDialogOpen] = useState(false)
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null)

  // Component metadata editing modal state
  const [metadataModalComponentId, setMetadataModalComponentId] = useState<string | null>(null)

  // Validated component click handler
  const handleComponentClick = (componentId: string) => {
    // Validate component ID format (must be UUID, not contain colons)
    if (!componentId || componentId.includes(':') || componentId.length < 10) {
      console.error('[DrawingComponentTablePage] Invalid component ID detected:', {
        componentId,
        type: typeof componentId,
        length: componentId?.length
      })
      // Don't open modal with invalid ID
      return
    }

    setMetadataModalComponentId(componentId)
  }

  // Fetch data
  const { data: drawings, isLoading, isError, error, refetch } = useDrawingsWithProgress(selectedProjectId!)

  // Manage expansion state
  const { expandedDrawingId, toggleDrawing, collapseDrawing } = useExpandedDrawings()

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
  const expandedDrawingIdsArray = useMemo(
    () => expandedDrawingId ? [expandedDrawingId] : [],
    [expandedDrawingId]
  )
  const { componentsMap } = useComponentsByDrawings(expandedDrawingIdsArray)

  // Ref for DrawingTable to enable programmatic scrolling
  const tableRef = useRef<DrawingTableHandle>(null)
  const hasScrolledRef = useRef(false)

  // Auto-scroll to expanded drawing when arriving from external link (e.g., weld log)
  useEffect(() => {
    // Only scroll once on initial mount
    if (hasScrolledRef.current) return

    // Wait for data to load
    if (isLoading || !drawings?.length) return

    // Check if there is an expanded drawing from URL
    if (!expandedDrawingId) return

    // Find the index of this drawing in the drawings array
    const drawingIndex = drawings.findIndex(d => d.id === expandedDrawingId)
    if (drawingIndex === -1) return

    // Wait for components to be fetched for the expanded drawing
    if (!componentsMap.has(expandedDrawingId)) return

    // Scroll after short delay to allow expand animation to complete
    const timeoutId = setTimeout(() => {
      tableRef.current?.scrollToDrawingIndex(drawingIndex)
      hasScrolledRef.current = true
    }, 200)

    return () => clearTimeout(timeoutId)
  }, [expandedDrawingId, drawings, componentsMap, isLoading])

  // Handle milestone update
  const handleMilestoneUpdate = (componentId: string, milestoneName: string, value: boolean | number) => {
    if (!user?.id) {
      console.error('Cannot update milestone: User not authenticated')
      return
    }

    // Find the component to check if it's a field weld
    let component = null
    for (const [, components] of componentsMap) {
      const found = components.find(c => c.id === componentId)
      if (found) {
        component = found
        break
      }
    }

    // Intercept "Weld Made" on field welds (first-time check only)
    if (
      component &&
      component.component_type === 'field_weld' &&
      milestoneName === 'Weld Made' &&
      value === true &&
      component.current_milestones['Weld Made'] !== true &&
      component.current_milestones['Weld Made'] !== 1
    ) {
      // Open welder assignment dialog instead of updating milestone directly
      setSelectedComponentId(componentId)
      setWelderDialogOpen(true)
      return
    }

    // Normal milestone update
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

  // Handle drawing toggle
  const handleToggleDrawing = useCallback((drawingId: string) => {
    // If clicking the currently expanded drawing, collapse it
    if (expandedDrawingId === drawingId) {
      collapseDrawing()
    } else {
      // Clicking a different drawing - expand it (auto-closes current)
      toggleDrawing(drawingId)
    }
  }, [expandedDrawingId, toggleDrawing, collapseDrawing])

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

  // Filter controls (called once to maintain shared state)
  const filterControls = useMemo(() => MobileFilterStack({
    searchTerm,
    onSearchChange: setSearch,
    statusFilter,
    onStatusFilterChange: setStatusFilter,
    selectionMode,
    onToggleSelectionMode: handleToggleSelectionMode,
    showingCount: displayDrawings.length,
    totalCount: drawings?.length || 0,
    isExpanded,
    onToggle: handleToggle,
  }), [searchTerm, statusFilter, selectionMode, displayDrawings.length, drawings?.length, setSearch, setStatusFilter, handleToggleSelectionMode, isExpanded, handleToggle])

  // Loading state
  if (isLoading) {
    return (
      <Layout fixedHeight>
        <div className="flex flex-col h-full overflow-hidden">
          <h1 className="text-2xl font-bold mb-2 px-2 md:px-4 py-3 md:py-4">Component Progress</h1>
          <div className="flex-1 min-h-0 bg-white rounded-lg shadow overflow-hidden mx-2 md:px-4 mb-4">
            <DrawingTable
              drawings={[]}
              expandedDrawingId={null}
              componentsMap={new Map()}
              sortField={sortField}
              sortDirection={sortDirection}
              onToggleDrawing={() => {}}
              onMilestoneUpdate={() => {}}
              onSort={() => {}}
              loading={true}
              isMobile={isMobile}
            />
          </div>
        </div>
      </Layout>
    )
  }

  // Error state
  if (isError) {
    return (
      <Layout fixedHeight>
        <div className="flex flex-col h-full overflow-hidden">
          <h1 className="text-2xl font-bold mb-2 px-2 md:px-4 py-3 md:py-4">Component Progress</h1>
          <div className="flex-1 min-h-0 bg-white rounded-lg shadow overflow-auto mx-2 md:mx-4 mb-4">
            <div className="p-4">
              <DrawingTableError error={error} onRetry={() => refetch()} />
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  // Empty state
  if (displayDrawings.length === 0) {
    return (
      <Layout fixedHeight>
        <div className="flex flex-col h-full overflow-hidden">
          <h1 className="text-2xl font-bold mb-2 px-2 md:px-4 py-3 md:py-4">Component Progress</h1>
          <div className="flex-1 min-h-0 bg-white rounded-lg shadow overflow-auto mx-2 md:mx-4 mb-4">
            <div className="p-4">
              <EmptyDrawingsState
                hasSearch={searchTerm !== ''}
                hasFilter={statusFilter !== 'all'}
                onClearFilters={handleClearFilters}
              />
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  // Main table view
  return (
    <Layout fixedHeight>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 mb-2 px-2 md:px-4 py-3 md:py-4">
          {/* Heading row with toggle button */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4 mb-2">
            <h1 className="text-lg md:text-2xl font-bold">Component Progress</h1>

            {/* Toggle button - inline on desktop */}
            <div className="flex-shrink-0 md:min-w-fit">
              {filterControls.toggleButton}
            </div>
          </div>

          {/* Collapsible content - full width below */}
          {filterControls.collapsibleContent}
        </div>

        {/* Feature 011: Bulk Actions Toolbar (T036) - Fixed */}
        {selectionMode && selectedDrawingIds.size > 0 && (
          <div className="flex-shrink-0 mb-4 px-2 md:px-4">
            <DrawingBulkActions
              selectedCount={selectedDrawingIds.size}
              onAssignMetadata={handleOpenBulkAssignDialog}
              onClearSelection={clearSelection}
            />
          </div>
        )}

        {/* Table - Scrollable fills remaining space */}
        <div className="flex-1 min-h-0 bg-white rounded-lg shadow overflow-hidden mx-2 md:mx-4 mb-4">
          <DrawingTable
            ref={tableRef}
            drawings={displayDrawings}
            expandedDrawingId={expandedDrawingId}
            componentsMap={componentsMap}
            sortField={sortField}
            sortDirection={sortDirection}
            onToggleDrawing={handleToggleDrawing}
            onMilestoneUpdate={handleMilestoneUpdate}
            onSort={setSort}
            selectionMode={selectionMode}
            selectedDrawingIds={selectedDrawingIds}
            onToggleSelection={toggleSelection}
            onSelectAll={() => selectAll(visibleDrawingIds)}
            onComponentClick={handleComponentClick}
            isMobile={isMobile}
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

        {/* Field Weld Welder Assignment Dialog */}
        {selectedComponentId && (
          <WelderAssignDialog
            componentId={selectedComponentId}
            projectId={selectedProjectId!}
            open={welderDialogOpen}
            onOpenChange={setWelderDialogOpen}
          />
        )}

        {/* Feature 020: Component Metadata Editing Modal */}
        {metadataModalComponentId && (
          <ComponentMetadataModal
            componentId={metadataModalComponentId}
            open={true}
            onClose={() => setMetadataModalComponentId(null)}
          />
        )}
      </div>
    </Layout>
  )
}
