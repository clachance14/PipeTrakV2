import { MilestoneCheckbox } from './MilestoneCheckbox'
import { PartialMilestoneEditor } from './PartialMilestoneEditor'
import type { ComponentRow as ComponentRowType, MilestoneConfig } from '@/types/drawing-table.types'

export interface ComponentRowProps {
  component: ComponentRowType
  visibleMilestones: MilestoneConfig[]
  onMilestoneUpdate: (componentId: string, milestoneName: string, value: boolean | number) => void
  style?: React.CSSProperties
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
}: ComponentRowProps) {
  const handleMilestoneChange = (milestoneName: string, value: boolean | number) => {
    onMilestoneUpdate(component.id, milestoneName, value)
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
      {/* Identity display */}
      <div className="min-w-[220px] text-sm font-mono text-slate-700">
        {component.identityDisplay}
      </div>

      {/* Component type badge */}
      <div className="min-w-[120px]">
        <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
          {component.component_type}
        </span>
      </div>

      {/* Milestone controls */}
      <div className="flex-1 flex gap-6 items-center">
        {visibleMilestones.map((milestone) => (
          <div key={milestone.name} className="flex items-center gap-2">
            {getMilestoneControl(milestone)}
          </div>
        ))}
      </div>

      {/* Progress percentage */}
      <div className="min-w-[90px] text-sm font-semibold text-right text-slate-700">
        {component.percent_complete.toFixed(0)}%
      </div>
    </div>
  )
}
