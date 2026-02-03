/**
 * WeldLogPage (Feature 014 - T073)
 * QC-focused page displaying all field welds in a flat table with advanced filtering
 */

import { useState, useMemo, useEffect } from 'react'
import { toast } from 'sonner'
import { Layout } from '@/components/Layout'
import { WeldLogFilters } from '@/components/weld-log/WeldLogFilters'
import { WeldLogTable } from '@/components/weld-log/WeldLogTable'
import { useFieldWelds, type EnrichedFieldWeld } from '@/hooks/useFieldWelds'
import { useAuth } from '@/contexts/AuthContext'
import { useProject } from '@/contexts/ProjectContext'
import { useProjects } from '@/hooks/useProjects'
import { useMobileDetection } from '@/hooks/useMobileDetection'
import { useWeldLogPDFExport } from '@/hooks/useWeldLogPDFExport'
import { usePDFPreviewState } from '@/hooks/usePDFPreviewState'
import { useOrganizationLogo } from '@/hooks/useOrganizationLogo'
import { useWeldLogPreferencesStore } from '@/stores/useWeldLogPreferencesStore'
import { sortFieldWelds } from '@/lib/weld-log-sorting'
import { PDFPreviewDialog } from '@/components/reports/PDFPreviewDialog'
import { exportWeldLogToExcel } from '@/lib/exportWeldLog'
import { WelderAssignDialog } from '@/components/field-welds/WelderAssignDialog'
import { EditWeldDialog } from '@/components/field-welds/EditWeldDialog'
import { CreateRepairWeldDialog } from '@/components/field-welds/CreateRepairWeldDialog'
import { WeldDetailModal } from '@/components/weld-log/WeldDetailModal'
import { UpdateWeldDialog } from '@/components/field-welds/UpdateWeldDialog'
import { CreateUnplannedWeldDialog } from '@/components/field-welds/CreateUnplannedWeldDialog'
import { Button } from '@/components/ui/button'
import { canCreateFieldWeld } from '@/lib/permissions'
import { Plus, FileDown, FileSpreadsheet, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

export function WeldLogPage() {
  const { user } = useAuth()
  const { selectedProjectId } = useProject()
  const projectId = selectedProjectId || ''
  const isMobile = useMobileDetection()

  // Fetch project details for export filename
  const { data: projects } = useProjects()
  const currentProject = projects?.find((p) => p.id === selectedProjectId)

  const { data: welds = [], isLoading, isError, error } = useFieldWelds({
    projectId,
    enabled: !!projectId,
  })

  const [filteredWelds, setFilteredWelds] = useState<EnrichedFieldWeld[]>([])

  // Search state (lifted from WeldLogFilters for toolbar integration)
  const {
    searchTerm,
    setSearchTerm,
  } = useWeldLogPreferencesStore()
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm)

  // Debounce search term (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(localSearchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [localSearchTerm, setSearchTerm])

  // PDF export hooks
  const { generatePDFPreview, isGenerating: isPDFGenerating } = useWeldLogPDFExport()
  const { previewState, openPreview, closePreview } = usePDFPreviewState()
  const { data: companyLogo } = useOrganizationLogo()

  // Modal state management (Feature 022 - Phase 4)
  const [selectedWeld, setSelectedWeld] = useState<EnrichedFieldWeld | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false)
  const [isWelderDialogOpen, setIsWelderDialogOpen] = useState(false)
  const [isEditWeldDialogOpen, setIsEditWeldDialogOpen] = useState(false)
  const [isRepairDialogOpen, setIsRepairDialogOpen] = useState(false)
  const [isCreateUnplannedDialogOpen, setIsCreateUnplannedDialogOpen] = useState(false)

  // Extract unique drawings, welders, packages, and systems for filter dropdowns
  const drawings = useMemo(() => {
    const unique = new Map()
    welds.forEach((weld) => {
      if (!unique.has(weld.drawing.id)) {
        unique.set(weld.drawing.id, {
          id: weld.drawing.id,
          drawing_no_norm: weld.drawing.drawing_no_norm,
        })
      }
    })
    return Array.from(unique.values()).sort((a, b) => a.drawing_no_norm.localeCompare(b.drawing_no_norm))
  }, [welds])

  const welders = useMemo(() => {
    const unique = new Map()
    welds.forEach((weld) => {
      if (weld.welder && !unique.has(weld.welder.id)) {
        unique.set(weld.welder.id, {
          id: weld.welder.id,
          stencil: weld.welder.stencil,
          name: weld.welder.name,
        })
      }
    })
    return Array.from(unique.values()).sort((a, b) => a.stencil.localeCompare(b.stencil))
  }, [welds])

  const testPackages = useMemo(() => {
    const unique = new Map()
    welds.forEach((weld) => {
      if (weld.test_package && !unique.has(weld.test_package.id)) {
        unique.set(weld.test_package.id, {
          id: weld.test_package.id,
          name: weld.test_package.name,
        })
      }
    })
    return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [welds])

  const systems = useMemo(() => {
    const unique = new Map()
    welds.forEach((weld) => {
      if (weld.system && !unique.has(weld.system.id)) {
        unique.set(weld.system.id, {
          id: weld.system.id,
          name: weld.system.name,
        })
      }
    })
    return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [welds])

  // Event handlers (Feature 022 - Phase 4)
  const handleRowClick = (weld: EnrichedFieldWeld) => {
    setSelectedWeld(weld)
    setIsDetailModalOpen(true)
  }

  const handleUpdateWeld = () => {
    setIsUpdateDialogOpen(true)
  }

  const handleTriggerWelderDialog = () => {
    // Close both detail modal and update dialog, then open welder dialog
    setIsDetailModalOpen(false)
    setIsUpdateDialogOpen(false)
    setIsWelderDialogOpen(true)
  }

  const handleEditWeld = (weldId: string) => {
    const weld = filteredWelds.find((w) => w.id === weldId)
    if (weld) {
      setSelectedWeld(weld)
      setIsDetailModalOpen(false)
      setIsEditWeldDialogOpen(true)
    }
  }

  const handleEditWeldFromModal = () => {
    setIsDetailModalOpen(false)
    setIsEditWeldDialogOpen(true)
  }

  // Export handlers
  const handlePDFExport = async () => {
    if (filteredWelds.length === 0) {
      toast.error('No welds to export')
      return
    }

    if (!currentProject) {
      toast.error('Project information not available')
      return
    }

    try {
      // Get current sort preferences at export time (not render time)
      const { sortColumn, sortDirection } = useWeldLogPreferencesStore.getState()

      // Sort welds using same order as table display
      const sortedWelds = sortFieldWelds(filteredWelds, sortColumn, sortDirection)

      const { blob, url, filename } = await generatePDFPreview(
        sortedWelds,
        currentProject.name,
        companyLogo ?? undefined,
        'pdfmake' // Use pdfmake engine for better table alignment
      )
      openPreview(blob, url, filename)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate PDF'
      toast.error(errorMessage)
    }
  }

  const handleExcelExport = () => {
    if (filteredWelds.length === 0) {
      toast.error('No welds to export')
      return
    }

    if (!currentProject) {
      toast.error('Project information not available')
      return
    }

    try {
      // Get current sort preferences at export time (not render time)
      const { sortColumn, sortDirection } = useWeldLogPreferencesStore.getState()

      // Sort welds using same order as table display
      const sortedWelds = sortFieldWelds(filteredWelds, sortColumn, sortDirection)

      exportWeldLogToExcel(sortedWelds, currentProject.name)
      toast.success('Excel file downloaded successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export Excel'
      toast.error(errorMessage)
    }
  }

  if (isLoading) {
    return (
      <Layout fixedHeight>
        <div className="mx-auto max-w-[1920px] px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-900">Weld Log</h1>
            <p className="mt-2 text-sm text-slate-600">QC tracking for all project field welds</p>
          </div>
          <div className="flex h-64 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600"></div>
              <p className="mt-4 text-sm text-slate-600">Loading field welds...</p>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  if (isError) {
    return (
      <Layout fixedHeight>
        <div className="mx-auto max-w-[1920px] px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-900">Weld Log</h1>
            <p className="mt-2 text-sm text-slate-600">QC tracking for all project field welds</p>
          </div>
          <div className="flex h-64 items-center justify-center rounded-lg border border-red-200 bg-red-50">
            <div className="text-center">
              <p className="text-sm font-medium text-red-900">Failed to load field welds</p>
              <p className="mt-1 text-xs text-red-600">
                {error instanceof Error ? error.message : 'An unknown error occurred'}
              </p>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout fixedHeight>
      <div className="flex flex-col h-full mx-auto max-w-[1920px] px-4 py-3 md:py-4 sm:px-6 lg:px-8">
        {/* Toolbar Row 1: Title + Search + Count + Export + Add (Desktop) */}
        <div className="flex-shrink-0 flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3 mb-2">
          {/* Title - always visible */}
          <h1 className="text-lg lg:text-2xl font-bold text-slate-900 whitespace-nowrap">
            Weld Log
          </h1>

          {/* Search - grows to fill space on desktop, full width on mobile */}
          <div className="flex-1 lg:max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Search by weld ID, drawing, or welder..."
                value={localSearchTerm}
                onChange={(e) => setLocalSearchTerm(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>

          {/* Count badge - desktop only */}
          <span className="hidden lg:inline text-sm text-slate-500 whitespace-nowrap">
            {filteredWelds.length}/{welds.length}
          </span>

          {/* Export buttons - desktop only */}
          <div className="hidden lg:flex items-center gap-2">
            <Button
              onClick={handlePDFExport}
              disabled={isPDFGenerating || filteredWelds.length === 0}
              variant="outline"
              size="sm"
              className="min-h-[36px]"
            >
              <FileDown className="h-4 w-4 mr-2" />
              {isPDFGenerating ? 'Generating...' : 'Preview & Export PDF'}
            </Button>
            <Button
              onClick={handleExcelExport}
              disabled={filteredWelds.length === 0}
              variant="outline"
              size="sm"
              className="min-h-[36px]"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
          </div>

          {/* Add Weld button */}
          {user?.role && canCreateFieldWeld(user.role) && (
            <Button
              onClick={() => setIsCreateUnplannedDialogOpen(true)}
              size="sm"
              className="min-h-[36px] lg:min-h-[36px] bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 lg:mr-1" />
              <span className="hidden lg:inline">Add Weld</span>
              <span className="lg:hidden">Add</span>
            </Button>
          )}
        </div>

        {/* Filter Row - Simplified on desktop, collapsible on mobile */}
        <div className="flex-shrink-0 mb-2">
          <WeldLogFilters
            welds={welds}
            drawings={drawings}
            welders={welders}
            testPackages={testPackages}
            systems={systems}
            onFilteredWeldsChange={setFilteredWelds}
            searchTerm={searchTerm}
          />
        </div>

        {/* Table - Scrollable fills remaining space */}
        <div className="flex-1 overflow-hidden">
          <WeldLogTable
            welds={filteredWelds}
            userRole={user?.role}
            isMobile={isMobile}
            onRowClick={isMobile ? handleRowClick : undefined}
            onAssignWelder={(weldId) => {
              const weld = filteredWelds.find((w) => w.id === weldId)
              if (weld) {
                setSelectedWeld(weld)
                setIsUpdateDialogOpen(true)
              }
            }}
            onEditWeld={handleEditWeld}
          />
        </div>
      </div>

      {/* Dialogs (Feature 022 - Phase 4) */}
      {selectedWeld && (
        <>
          {/* Detail Modal (Feature 022) */}
          <WeldDetailModal
            weld={selectedWeld}
            open={isDetailModalOpen}
            onOpenChange={setIsDetailModalOpen}
            onUpdateWeld={handleUpdateWeld}
            onEditWeld={handleEditWeldFromModal}
          />

          {/* Update Weld Dialog (Feature 022) */}
          <UpdateWeldDialog
            weld={selectedWeld}
            open={isUpdateDialogOpen}
            onOpenChange={setIsUpdateDialogOpen}
            onTriggerWelderDialog={handleTriggerWelderDialog}
          />

          {/* Welder Assignment Dialog (reused from Feature 015) */}
          <WelderAssignDialog
            fieldWeldId={selectedWeld.id}
            projectId={projectId}
            open={isWelderDialogOpen}
            onOpenChange={setIsWelderDialogOpen}
            mode={(() => {
              if (!selectedWeld.welder_id) return 'assign'
              const weldComplete = selectedWeld.component?.current_milestones?.['Weld Complete']
              if (weldComplete !== 100 && weldComplete !== true && weldComplete !== 1) {
                return 'assign'
              }
              return 'edit'
            })()}
            currentWelderId={selectedWeld.welder_id}
            currentDateWelded={selectedWeld.date_welded}
            currentNdeResult={selectedWeld.nde_result}
            weldIdentity={selectedWeld.identityDisplay}
          />

          {/* Edit Weld Dialog (unified welder + NDE editing) */}
          <EditWeldDialog
            weld={selectedWeld}
            projectId={projectId}
            open={isEditWeldDialogOpen}
            onOpenChange={setIsEditWeldDialogOpen}
            onRepairWeldNeeded={() => setIsRepairDialogOpen(true)}
          />

          {/* Repair Weld Dialog (existing functionality) */}
          <CreateRepairWeldDialog
            originalFieldWeldId={selectedWeld.id}
            originalWeldData={{
              weldType: selectedWeld.weld_type,
              weldSize: selectedWeld.weld_size || '',
              schedule: selectedWeld.schedule || '',
              baseMetal: selectedWeld.base_metal || '',
              spec: selectedWeld.spec || '',
              drawingId: selectedWeld.drawing.id,
              projectId: projectId,
            }}
            open={isRepairDialogOpen}
            onOpenChange={setIsRepairDialogOpen}
          />
        </>
      )}

      {/* Create Unplanned Weld Dialog (Feature 028) */}
      <CreateUnplannedWeldDialog
        open={isCreateUnplannedDialogOpen}
        onOpenChange={setIsCreateUnplannedDialogOpen}
        projectId={projectId}
      />

      {/* PDF Preview Dialog */}
      <PDFPreviewDialog
        open={previewState.open}
        onClose={closePreview}
        previewUrl={previewState.url}
        blob={previewState.blob}
        filename={previewState.filename}
      />
    </Layout>
  )
}
