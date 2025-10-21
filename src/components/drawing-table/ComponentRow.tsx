import { MilestoneCheckbox } from './MilestoneCheckbox'
import { PartialMilestoneEditor } from './PartialMilestoneEditor'
import { InheritanceBadge } from './InheritanceBadge'
import { AssignedBadge } from './AssignedBadge'
import { getBadgeType } from '@/lib/metadata-inheritance'
import type { ComponentRow as ComponentRowType, MilestoneConfig } from '@/types/drawing-table.types'

export interface ComponentRowProps {
  component: ComponentRowType
  visibleMilestones: MilestoneConfig[]
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
 * Component child row in table
 *
 * Displays component identity, type, milestone controls, and progress percentage.
 * Indented 32px from left to show hierarchy under drawing.
 * Renders appropriate milestone control (checkbox or percentage) based on template.
 */
export function ComponentRow({
  component,
  visibleMilestones,
  onMilestoneUpdate,
  style,
  drawing,
  area,
  system,
  testPackage,
}: ComponentRowProps) {
  const handleMilestoneChange = (milestoneName: string, value: boolean | number) => {
    onMilestoneUpdate(component.id, milestoneName, value)
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

  const getMilestoneControl = (milestone: MilestoneConfig) => {
    // Find milestone in component's template
    const milestoneConfig = component.template.milestones_config.find(
      (m) => m.name === milestone.name
    )

    // Milestone not in this component's template
    if (!milestoneConfig) {
      return <span className="text-muted-foreground">—</span>
    }

    const currentValue = component.current_milestones[milestone.name]

    // Partial milestone (percentage)
    if (milestoneConfig.is_partial) {
      return (
        <PartialMilestoneEditor
          milestone={milestoneConfig}
          currentValue={typeof currentValue === 'number' ? currentValue : 0}
          onUpdate={(value) => handleMilestoneChange(milestone.name, value)}
          disabled={!component.canUpdate}
        />
      )
    }

    // Discrete milestone (checkbox)
    // Database stores 1 (complete) or 0 (incomplete) as numeric values
    return (
      <MilestoneCheckbox
        milestone={milestoneConfig}
        checked={currentValue === 1 || currentValue === true}
        onChange={(checked) => handleMilestoneChange(milestone.name, checked)}
        disabled={!component.canUpdate}
      />
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

      {/* Identity display - WIDER FIXED WIDTH so checkboxes don't cover text */}
      <div className="w-[300px] text-sm font-mono text-slate-700 truncate pr-4">
        {component.identityDisplay}
      </div>

      {/* Milestone controls - each in fixed-width column, MOVED LEFT */}
      {visibleMilestones && visibleMilestones.length > 0 && visibleMilestones.map((milestone) => (
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
    </div>
  )
}
