/**
 * AggregateComponentCard Component
 * Card for pipe/threaded_pipe aggregate components.
 * Visually distinct: blue left border, linear feet display, vertical milestone layout.
 */

import { PartialMilestoneInput } from './PartialMilestoneInput'
import { MilestoneCheckbox } from '@/components/drawing-table/MilestoneCheckbox'
import type { ComponentRow, MilestoneConfig } from '@/types/drawing-table.types'

interface AggregateComponentCardProps {
  component: ComponentRow
  onMilestoneChange: (componentId: string, milestoneName: string, value: boolean | number) => void
  onComponentClick?: (componentId: string) => void
}

export function AggregateComponentCard({
  component,
  onMilestoneChange,
  onComponentClick,
}: AggregateComponentCardProps) {
  const milestones = (component.template?.milestones_config ?? []) as MilestoneConfig[]
  const linearFeet = component.attributes?.total_linear_feet as number | undefined

  return (
    <div
      className="p-3 rounded-md border border-blue-200 bg-blue-50/30 border-l-[3px] border-l-blue-600 cursor-pointer"
      onClick={() => onComponentClick?.(component.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onComponentClick?.(component.id); } }}
    >
      {/* Header: identity + percentage */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-900 truncate">
          {component.identityDisplay}
        </span>
        <span className="text-sm text-gray-500 ml-2 flex-shrink-0">
          {Math.round(component.percent_complete)}%
        </span>
      </div>

      {/* Linear feet */}
      {linearFeet != null && linearFeet > 0 && (
        <div className="text-xs text-gray-500 mt-0.5">
          {linearFeet} LF
        </div>
      )}

      {/* Milestones — vertical stack */}
      <div className="mt-2 space-y-0.5" onClick={(e) => e.stopPropagation()}>
        {milestones.map((milestone) => {
          const currentValue = component.current_milestones[milestone.name]

          if (milestone.is_partial) {
            const pctValue = typeof currentValue === 'number' ? currentValue : 0
            return (
              <PartialMilestoneInput
                key={milestone.name}
                label={milestone.name}
                value={pctValue}
                onChange={(val: number) => onMilestoneChange(component.id, milestone.name, val)}
                disabled={!component.canUpdate}
              />
            )
          }

          const isChecked =
            typeof currentValue === 'boolean' ? currentValue : Number(currentValue) >= 100
          return (
            <div key={milestone.name} className="px-2 py-0.5">
              <MilestoneCheckbox
                milestone={milestone}
                checked={isChecked}
                onChange={(checked) =>
                  onMilestoneChange(component.id, milestone.name, checked)
                }
                disabled={!component.canUpdate}
                compact
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
