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
import { NDEResultDialog } from '@/components/field-welds/NDEResultDialog'
import { WelderAssignDialog } from '@/components/field-welds/WelderAssignDialog'
import { CreateRepairWeldDialog } from '@/components/field-welds/CreateRepairWeldDialog'

export function WeldLogPage() {
  const { user } = useAuth()
  const { selectedProjectId } = useProject()
  const projectId = selectedProjectId || ''

  const { data: welds = [], isLoading, isError, error } = useFieldWelds({
    projectId,
    enabled: !!projectId,
  })

  const [filteredWelds, setFilteredWelds] = useState<EnrichedFieldWeld[]>([])

  // Dialog state management
  const [selectedWeld, setSelectedWeld] = useState<EnrichedFieldWeld | null>(null)
  const [isWelderDialogOpen, setIsWelderDialogOpen] = useState(false)
  const [isNDEDialogOpen, setIsNDEDialogOpen] = useState(false)
  const [isRepairDialogOpen, setIsRepairDialogOpen] = useState(false)

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

  if (isLoading) {
    return (
      <Layout>
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
      <Layout>
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
    <Layout>
      <div className="mx-auto max-w-[1920px] px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Weld Log</h1>
          <p className="mt-2 text-sm text-slate-600">
            QC tracking for all project field welds - Sortable table with advanced filtering
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <WeldLogFilters
            welds={welds}
            drawings={drawings}
            welders={welders}
            testPackages={testPackages}
            systems={systems}
            onFilteredWeldsChange={setFilteredWelds}
          />
        </div>

        {/* Table */}
        <div className="mb-8">
          <WeldLogTable
            welds={filteredWelds}
            userRole={user?.role}
            onAssignWelder={(weldId) => {
              const weld = filteredWelds.find((w) => w.id === weldId)
              if (weld) {
                setSelectedWeld(weld)
                setIsWelderDialogOpen(true)
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

        {/* Responsive Design Notes */}
        <div className="mt-8 hidden text-xs text-slate-500 lg:block">
          <p>
            <strong>Desktop view</strong> - All columns visible with sortable headers
          </p>
        </div>
      </div>

      {/* Dialogs */}
      {selectedWeld && (
        <>
          <WelderAssignDialog
            fieldWeldId={selectedWeld.id}
            projectId={projectId}
            open={isWelderDialogOpen}
            onOpenChange={setIsWelderDialogOpen}
          />

          <NDEResultDialog
            fieldWeldId={selectedWeld.id}
            componentId={selectedWeld.component.id}
            welderName={selectedWeld.welder?.name}
            dateWelded={selectedWeld.date_welded || undefined}
            open={isNDEDialogOpen}
            onOpenChange={setIsNDEDialogOpen}
            onFailure={() => setIsRepairDialogOpen(true)}
          />

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
            onOpenChange={(open) => {
              if (!open) {
                console.log('[WeldLogPage] Closing repair dialog')
              } else {
                console.log('[WeldLogPage] Opening repair dialog with weld:', {
                  id: selectedWeld.id,
                  weld_type: selectedWeld.weld_type,
                  weld_size: selectedWeld.weld_size,
                  schedule: selectedWeld.schedule,
                  base_metal: selectedWeld.base_metal,
                  spec: selectedWeld.spec,
                })
              }
              setIsRepairDialogOpen(open)
            }}
          />
        </>
      )}
    </Layout>
  )
}
