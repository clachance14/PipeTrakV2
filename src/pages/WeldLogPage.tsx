/**
 * WeldLogPage (Feature 014 - T073)
 * QC-focused page displaying all field welds in a flat table with advanced filtering
 */

import { useState, useMemo } from 'react'
import { Layout } from '@/components/Layout'
import { WeldLogFilters } from '@/components/weld-log/WeldLogFilters'
import { WeldLogTable } from '@/components/weld-log/WeldLogTable'
import { useFieldWelds, type EnrichedFieldWeld } from '@/hooks/useFieldWelds'
import { useAuth } from '@/contexts/AuthContext'
import { useProject } from '@/contexts/ProjectContext'
import { useMobileDetection } from '@/hooks/useMobileDetection'
import { NDEResultDialog } from '@/components/field-welds/NDEResultDialog'
import { WelderAssignDialog } from '@/components/field-welds/WelderAssignDialog'
import { CreateRepairWeldDialog } from '@/components/field-welds/CreateRepairWeldDialog'
import { WeldDetailModal } from '@/components/weld-log/WeldDetailModal'
import { UpdateWeldDialog } from '@/components/field-welds/UpdateWeldDialog'
import { CreateUnplannedWeldDialog } from '@/components/field-welds/CreateUnplannedWeldDialog'
import { Button } from '@/components/ui/button'
import { canCreateFieldWeld } from '@/lib/permissions'
import { Plus } from 'lucide-react'

export function WeldLogPage() {
  const { user } = useAuth()
  const { selectedProjectId } = useProject()
  const projectId = selectedProjectId || ''
  const isMobile = useMobileDetection()

  const { data: welds = [], isLoading, isError, error } = useFieldWelds({
    projectId,
    enabled: !!projectId,
  })

  const [filteredWelds, setFilteredWelds] = useState<EnrichedFieldWeld[]>([])

  // Modal state management (Feature 022 - Phase 4)
  const [selectedWeld, setSelectedWeld] = useState<EnrichedFieldWeld | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false)
  const [isWelderDialogOpen, setIsWelderDialogOpen] = useState(false)
  const [isNDEDialogOpen, setIsNDEDialogOpen] = useState(false)
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

  const handleRecordNDE = () => {
    // Close detail modal, then open NDE dialog
    setIsDetailModalOpen(false)
    setIsNDEDialogOpen(true)
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
      <div className="flex flex-col h-full mx-auto max-w-[1920px] px-4 py-3 md:py-8 sm:px-6 lg:px-8">
        {/* Page Header - Fixed */}
        <div className="flex-shrink-0 mb-3 md:mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg md:text-3xl font-bold text-slate-900">Weld Log</h1>
              <p className="mt-1 md:mt-2 text-xs md:text-sm text-slate-600">
                QC tracking for all project field welds - Sortable table with advanced filtering
              </p>
            </div>
            {user?.role && canCreateFieldWeld(user.role) && (
              <Button
                onClick={() => setIsCreateUnplannedDialogOpen(true)}
                className="min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Weld
              </Button>
            )}
          </div>
        </div>

        {/* Filters - Fixed */}
        <div className="flex-shrink-0 mb-3 md:mb-6">
          <WeldLogFilters
            welds={welds}
            drawings={drawings}
            welders={welders}
            testPackages={testPackages}
            systems={systems}
            onFilteredWeldsChange={setFilteredWelds}
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
            onRecordNDE={(weldId) => {
              const weld = filteredWelds.find((w) => w.id === weldId)
              if (weld) {
                setSelectedWeld(weld)
                setIsNDEDialogOpen(true)
              }
            }}
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
            onRecordNDE={handleRecordNDE}
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
          />

          {/* NDE Result Dialog (reused from Feature 015) */}
          <NDEResultDialog
            fieldWeldId={selectedWeld.id}
            componentId={selectedWeld.component.id}
            welderName={selectedWeld.welder?.name}
            dateWelded={selectedWeld.date_welded || undefined}
            open={isNDEDialogOpen}
            onOpenChange={setIsNDEDialogOpen}
            onFailure={() => setIsRepairDialogOpen(true)}
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
    </Layout>
  )
}
