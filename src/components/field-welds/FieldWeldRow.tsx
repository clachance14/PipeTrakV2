import { useState } from 'react'
import { useFieldWeld } from '@/hooks/useFieldWeld'
import { useAssignWelder } from '@/hooks/useAssignWelder'
import { useAuth } from '@/contexts/AuthContext'
import { formatWeldType, formatNDEType, getStatusBadgeColor } from '@/lib/field-weld-utils'
import { MilestoneCheckbox } from '../drawing-table/MilestoneCheckbox'
import { WelderAssignDialog } from './WelderAssignDialog'
import { NDEResultDialog } from './NDEResultDialog'
import { CreateRepairWeldDialog } from './CreateRepairWeldDialog'
import { RepairHistoryDialog } from './RepairHistoryDialog'
import { InlineWelderAssignment } from './InlineWelderAssignment'
import { Button } from '@/components/ui/button'
import { UserCog, Microscope, History } from 'lucide-react'
import type { ComponentRow as ComponentRowType } from '@/types/drawing-table.types'

export interface FieldWeldRowProps {
  component: ComponentRowType
  projectId: string
  onMilestoneUpdate: (componentId: string, milestoneName: string, value: boolean | number) => void
  style?: React.CSSProperties
}

/**
 * Field Weld Row Component
 *
 * Specialized row for field_weld component type with weld-specific columns:
 * - Weld ID (identity key)
 * - Type (BW/SW/FW/TW with size)
 * - Welder stencil
 * - Date Welded
 * - NDE Status
 * - Status Badge
 * - Progress bar
 * - Milestones (expandable)
 * - Action buttons (Assign Welder, Record NDE)
 */
export function FieldWeldRow({
  component,
  projectId,
  onMilestoneUpdate,
  style,
}: FieldWeldRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isAssignWelderOpen, setIsAssignWelderOpen] = useState(false)
  const [isRecordNDEOpen, setIsRecordNDEOpen] = useState(false)
  const [isRepairDialogOpen, setIsRepairDialogOpen] = useState(false)
  const [isRepairHistoryOpen, setIsRepairHistoryOpen] = useState(false)
  const [isAssigningWelder, setIsAssigningWelder] = useState(false)

  console.log('[FieldWeldRow] RENDERING - Component type:', component.component_type, 'ID:', component.id)

  const { data: fieldWeld, isLoading } = useFieldWeld({ componentId: component.id })
  const assignWelderMutation = useAssignWelder()
  const { user } = useAuth()

  console.log('[FieldWeldRow] fieldWeld data:', fieldWeld, 'isLoading:', isLoading)

  const handleMilestoneChange = (milestoneName: string, value: boolean | number) => {
    console.log('[FieldWeldRow] Milestone changed:', { milestoneName, value, hasFieldWeld: !!fieldWeld })

    // Special handling for "Weld Complete" milestone - trigger inline welder assignment
    if (milestoneName === 'Weld Complete' && value === true && fieldWeld) {
      console.log('[FieldWeldRow] Triggering inline welder assignment')
      setIsAssigningWelder(true)
      setIsExpanded(true) // Ensure milestones are visible
      return
    }

    console.log('[FieldWeldRow] Calling parent onMilestoneUpdate')
    onMilestoneUpdate(component.id, milestoneName, value)
  }

  const handleConfirmWelderAssignment = async (welderId: string, dateWelded: string) => {
    if (!fieldWeld || !user) return

    try {
      await assignWelderMutation.mutateAsync({
        field_weld_id: fieldWeld.id,
        welder_id: welderId,
        date_welded: dateWelded,
        user_id: user.id,
      })

      setIsAssigningWelder(false)
      // No need to manually update milestone - useAssignWelder already does this
    } catch (error) {
      // Error already handled by useAssignWelder mutation (toast + rollback)
      setIsAssigningWelder(false)
    }
  }

  const handleCancelWelderAssignment = () => {
    setIsAssigningWelder(false)
  }

  // Determine if action buttons should be visible (only on active welds)
  const isActive = fieldWeld?.status === 'active'
  const isRejected = fieldWeld?.status === 'rejected'

  // Check if this weld has repairs or is a repair itself
  const hasRepairs = fieldWeld?.is_repair || false
  const isRepair = fieldWeld?.is_repair || false

  // Status badge configuration
  const getStatusBadge = () => {
    if (!fieldWeld) return null

    const { bgColor, textColor, label, icon } = getStatusBadgeColor(fieldWeld.status)
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}
      >
        {icon} {label}
      </span>
    )
  }

  // NDE status display
  const getNDEStatusDisplay = () => {
    if (!fieldWeld?.nde_result) return <span className="text-slate-400 text-sm">N/A</span>

    const ndeType = fieldWeld.nde_type ? formatNDEType(fieldWeld.nde_type) : 'NDE'
    const result = fieldWeld.nde_result

    const resultColor =
      result === 'PASS'
        ? 'text-green-700 font-semibold'
        : result === 'FAIL'
          ? 'text-red-700 font-semibold'
          : 'text-yellow-700 font-semibold'

    return (
      <span className="text-sm">
        {ndeType} <span className={resultColor}>{result}</span>
      </span>
    )
  }

  if (isLoading) {
    return (
      <div
        style={style}
        className={`flex items-center h-[60px] border-b border-slate-200 hover:bg-slate-50 pl-8 ${
          isRejected ? 'opacity-60 bg-slate-50' : ''
        }`}
      >
        <div className="text-sm text-slate-400">Loading weld data...</div>
      </div>
    )
  }

  return (
    <>
      <div
        style={style}
        className={`flex flex-col border-b border-slate-200 hover:bg-slate-50 transition-colors ${
          isRejected ? 'opacity-60 bg-slate-50' : ''
        }`}
      >
        {/* Main row */}
        <div className="flex items-center h-[60px] pl-8 gap-4">
          {/* Expand/Collapse toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-600 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
            aria-expanded={isExpanded}
          >
            <span className="text-lg">{isExpanded ? '▼' : '▶'}</span>
          </button>

          {/* Weld ID */}
          <div className="w-32 flex-shrink-0 text-sm font-medium text-slate-900 truncate">
            {component.identityDisplay || 'N/A'}
          </div>

          {/* Type */}
          <div className="w-24 flex-shrink-0 text-sm text-slate-700">
            {fieldWeld?.weld_type ? formatWeldType(fieldWeld.weld_type) : 'N/A'}
            {fieldWeld?.weld_size && <span className="ml-1">{fieldWeld.weld_size}</span>}
          </div>

          {/* Welder */}
          <div className="w-28 flex-shrink-0 text-sm text-slate-700">
            {fieldWeld?.welder?.stencil || <span className="text-slate-400">-</span>}
          </div>

          {/* Date Welded */}
          <div className="w-28 flex-shrink-0 text-sm text-slate-700">
            {fieldWeld?.date_welded ? (
              new Date(fieldWeld.date_welded).toLocaleDateString('en-US', {
                month: '2-digit',
                day: '2-digit',
              })
            ) : (
              <span className="text-slate-400">-</span>
            )}
          </div>

          {/* NDE Status */}
          <div className="w-32 flex-shrink-0">{getNDEStatusDisplay()}</div>

          {/* Status Badge */}
          <div className="w-28 flex-shrink-0">{getStatusBadge()}</div>

          {/* Progress Bar */}
          <div className="w-40 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all"
                  style={{ width: `${component.percent_complete || 0}%` }}
                />
              </div>
              <span className="text-xs text-slate-600 w-8 text-right">
                {Math.round(component.percent_complete || 0)}%
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 ml-auto pr-4">
            {isActive && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAssignWelderOpen(true)}
                  className="text-xs"
                  aria-label="Assign welder"
                >
                  <UserCog className="mr-1 h-3 w-3" />
                  Assign Welder
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsRecordNDEOpen(true)}
                  className="text-xs"
                  aria-label="Record NDE"
                >
                  <Microscope className="mr-1 h-3 w-3" />
                  Record NDE
                </Button>
              </>
            )}
            {(hasRepairs || isRepair) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsRepairHistoryOpen(true)}
                className="text-xs text-blue-600 hover:text-blue-700"
                aria-label="View repair history"
              >
                <History className="mr-1 h-3 w-3" />
                🔗 View Repairs
              </Button>
            )}
          </div>
        </div>

        {/* Expanded milestones section */}
        {isExpanded && component.template?.milestones_config && component.template.milestones_config.length > 0 && (
          <div className="pl-16 pr-4 py-3 bg-slate-50 border-t border-slate-200">
            {(() => {
              console.log('[FieldWeldRow] Render expanded section:', { isAssigningWelder, isExpanded })
              return null
            })()}
            {isAssigningWelder ? (
              /* Show inline welder assignment UI */
              <InlineWelderAssignment
                projectId={projectId}
                onConfirm={handleConfirmWelderAssignment}
                onCancel={handleCancelWelderAssignment}
              />
            ) : (
              /* Show normal milestone checkboxes */
              <div className="flex flex-wrap gap-4">
                {component.template.milestones_config.map((milestoneConfig) => {
                  const currentValue = component.current_milestones[milestoneConfig.name]
                  const isComplete = currentValue === 1 || currentValue === true
                  return (
                    <div key={milestoneConfig.name} className="flex items-center gap-2">
                      <MilestoneCheckbox
                        milestone={milestoneConfig}
                        checked={isComplete}
                        onChange={(value) => handleMilestoneChange(milestoneConfig.name, value)}
                        disabled={!isActive}
                      />
                      <span className="text-sm text-slate-700">{milestoneConfig.name}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
      {fieldWeld && (
        <>
          <WelderAssignDialog
            fieldWeldId={fieldWeld.id}
            projectId={projectId}
            open={isAssignWelderOpen}
            onOpenChange={setIsAssignWelderOpen}
          />

          <NDEResultDialog
            fieldWeldId={fieldWeld.id}
            componentId={component.id}
            welderName={fieldWeld.welder?.name || undefined}
            dateWelded={fieldWeld.date_welded || undefined}
            open={isRecordNDEOpen}
            onOpenChange={setIsRecordNDEOpen}
            onFailure={() => setIsRepairDialogOpen(true)}
          />

          <CreateRepairWeldDialog
            originalFieldWeldId={fieldWeld.id}
            originalWeldData={{
              weldType: fieldWeld.weld_type,
              weldSize: fieldWeld.weld_size || '',
              schedule: fieldWeld.schedule || '',
              baseMetal: fieldWeld.base_metal || '',
              spec: fieldWeld.spec || '',
              drawingId: component.drawing_id || '',
              projectId: projectId,
            }}
            open={isRepairDialogOpen}
            onOpenChange={setIsRepairDialogOpen}
          />

          <RepairHistoryDialog
            fieldWeldId={fieldWeld.id}
            open={isRepairHistoryOpen}
            onOpenChange={setIsRepairHistoryOpen}
          />
        </>
      )}
    </>
  )
}
