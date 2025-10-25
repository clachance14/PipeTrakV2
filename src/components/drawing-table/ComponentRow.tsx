import { useState } from 'react'
import { MilestoneCheckbox } from './MilestoneCheckbox'
import { PartialMilestoneEditor } from './PartialMilestoneEditor'
import { MobilePartialMilestoneEditor } from './MobilePartialMilestoneEditor'
import { InheritanceBadge } from './InheritanceBadge'
import { AssignedBadge } from './AssignedBadge'
import { getBadgeType } from '@/lib/metadata-inheritance'
import { useMobileDetection } from '@/hooks/useMobileDetection'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useOfflineQueue } from '@/hooks/useOfflineQueue'
import type { ComponentRow as ComponentRowType, MilestoneConfig } from '@/types/drawing-table.types'

export interface ComponentRowProps {
  component: ComponentRowType
  onMilestoneUpdate: (componentId: string, milestoneName: string, value: boolean | number) => void
  style?: React.CSSProperties
  /** Drawing this component belongs to (for inheritance detection) */
  drawing?: {
    drawing_no_norm: string
    area?: { id: string; name: string } | null
    system?: { id: string; name: string } | null
    test_package?: { id: string; name: string } | null
  }
  /** Area assigned to this component */
  area?: { id: string; name: string } | null
  /** System assigned to this component */
  system?: { id: string; name: string } | null
  /** Test package assigned to this component */
  testPackage?: { id: string; name: string } | null
}

/**
 * Format component type to human-readable string
 */
function formatComponentType(type: string): string {
  const typeMap: Record<string, string> = {
    field_weld: 'Field Weld',
    valve: 'Valve',
    fitting: 'Fitting',
    flange: 'Flange',
    instrument: 'Instrument',
    support: 'Support',
    pipe: 'Pipe',
    spool: 'Spool',
    tubing: 'Tubing',
    hose: 'Hose',
    threaded_pipe: 'Threaded Pipe',
    misc_component: 'Misc Component',
  }
  return typeMap[type] || type
}

/**
 * Component child row in table
 *
 * Displays component identity, type, milestone controls, and progress percentage.
 * Indented 32px from left to show hierarchy under drawing.
 * Renders appropriate milestone control (checkbox or percentage) based on template.
 */
export function ComponentRow({
  component,
  onMilestoneUpdate,
  style,
  drawing,
  area,
  system,
  testPackage,
}: ComponentRowProps) {
  const isMobile = useMobileDetection()
  const isOnline = useNetworkStatus()
  const { enqueue } = useOfflineQueue()
  const [mobileModalOpen, setMobileModalOpen] = useState(false)
  const [editingMilestone, setEditingMilestone] = useState<MilestoneConfig | null>(null)

  const handleMilestoneChange = (milestoneName: string, value: boolean | number) => {
    // If offline, enqueue update to localStorage
    if (!isOnline) {
      enqueue({
        component_id: component.id,
        milestone_name: milestoneName,
        value,
        user_id: 'current-user-id' // TODO: Get from auth context
      })
      // Still call onMilestoneUpdate for optimistic UI
    }

    onMilestoneUpdate(component.id, milestoneName, value)
  }

  const handlePartialMilestoneClick = (milestone: MilestoneConfig) => {
    if (isMobile) {
      setEditingMilestone(milestone)
      setMobileModalOpen(true)
    }
  }

  const handleMobileSave = (value: number) => {
    if (editingMilestone) {
      handleMilestoneChange(editingMilestone.name, value)
    }
    setMobileModalOpen(false)
    setEditingMilestone(null)
  }

  const handleMobileCancel = () => {
    setMobileModalOpen(false)
    setEditingMilestone(null)
  }

  // Determine badge types for metadata fields
  const areaBadge = getBadgeType(area?.id || null, drawing?.area?.id || null)
  const systemBadge = getBadgeType(system?.id || null, drawing?.system?.id || null)
  const packageBadge = getBadgeType(testPackage?.id || null, drawing?.test_package?.id || null)

  const renderMetadataWithBadge = (
    value: { id: string; name: string } | null | undefined,
    badgeType: 'inherited' | 'assigned' | 'none',
    drawingNumber?: string
  ) => {
    if (!value) return <span className="text-gray-400">—</span>

    return (
      <div className="flex items-center gap-1.5">
        <span className="text-sm text-slate-700">{value.name}</span>
        {badgeType === 'inherited' && drawingNumber && (
          <InheritanceBadge drawingNumber={drawingNumber} />
        )}
        {badgeType === 'assigned' && <AssignedBadge />}
      </div>
    )
  }

  const getMilestoneControl = (milestoneConfig: MilestoneConfig) => {
    const currentValue = component.current_milestones[milestoneConfig.name]

    // Partial milestone (percentage)
    if (milestoneConfig.is_partial) {
      // On mobile, show trigger button that opens full-screen modal
      if (isMobile) {
        return (
          <button
            onClick={() => handlePartialMilestoneClick(milestoneConfig)}
            disabled={!component.canUpdate}
            className="min-h-[44px] w-full px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 active:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {typeof currentValue === 'number' ? currentValue : 0}%
          </button>
        )
      }

      // Desktop: inline popover editor
      return (
        <PartialMilestoneEditor
          milestone={milestoneConfig}
          currentValue={typeof currentValue === 'number' ? currentValue : 0}
          onUpdate={(value) => handleMilestoneChange(milestoneConfig.name, value)}
          disabled={!component.canUpdate}
        />
      )
    }

    // Discrete milestone (checkbox) - increase hit area on mobile
    // Database stores 1 (complete) or 0 (incomplete) as numeric values
    return (
      <div className={isMobile ? 'min-w-[44px] min-h-[44px] flex items-center justify-center' : ''}>
        <MilestoneCheckbox
          milestone={milestoneConfig}
          checked={currentValue === 1 || currentValue === true}
          onChange={(checked) => handleMilestoneChange(milestoneConfig.name, checked)}
          disabled={!component.canUpdate}
        />
      </div>
    )
  }

  return (
    <div
      role="row"
      style={style}
      className="flex items-center gap-4 px-5 py-3 pl-14 bg-slate-50 border-b border-slate-100 hover:bg-white transition-all duration-100"
    >
      {/* Spacer for chevron */}
      <div className="w-5" />

      {/* Component type and identity display */}
      <div className="w-[300px] text-sm truncate pr-4">
        <span className="font-medium text-slate-600">
          {formatComponentType(component.component_type)}:
        </span>
        <span className="ml-2 font-mono text-slate-700">
          {component.identityDisplay}
        </span>
      </div>

      {/* Milestone controls - component-specific milestones only */}
      {component.template.milestones_config.map((milestone) => (
        <div key={milestone.name} className="min-w-[80px] flex items-center justify-center">
          {getMilestoneControl(milestone)}
        </div>
      ))}

      {/* Spacer for title column */}
      <div className="flex-1" />

      {/* Area with badge */}
      <div className="min-w-[100px]">
        {renderMetadataWithBadge(area, areaBadge, drawing?.drawing_no_norm)}
      </div>

      {/* System with badge */}
      <div className="min-w-[100px]">
        {renderMetadataWithBadge(system, systemBadge, drawing?.drawing_no_norm)}
      </div>

      {/* Test Package with badge */}
      <div className="min-w-[120px]">
        {renderMetadataWithBadge(testPackage, packageBadge, drawing?.drawing_no_norm)}
      </div>

      {/* Progress percentage */}
      <div className="ml-auto text-sm font-semibold text-slate-800">
        {component.percent_complete.toFixed(0)}%
      </div>

      {/* Mobile partial milestone editor modal */}
      {isMobile && editingMilestone && (
        <MobilePartialMilestoneEditor
          open={mobileModalOpen}
          milestoneName={editingMilestone.name}
          currentValue={
            typeof component.current_milestones[editingMilestone.name] === 'number'
              ? (component.current_milestones[editingMilestone.name] as number)
              : 0
          }
          onSave={handleMobileSave}
          onCancel={handleMobileCancel}
        />
      )}
    </div>
  )
}
