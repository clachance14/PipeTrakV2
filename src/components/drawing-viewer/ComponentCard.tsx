/**
 * ComponentCard Component
 * Card for discrete components (spool, valve, fitting, support, etc.).
 * Shows identity, percentage, and milestone checkboxes in horizontal wrap.
 */

import { MilestoneCheckbox } from '@/components/drawing-table/MilestoneCheckbox'
import type { ComponentRow, MilestoneConfig } from '@/types/drawing-table.types'

interface ComponentCardProps {
  component: ComponentRow
  onMilestoneChange: (componentId: string, milestoneName: string, value: boolean | number) => void
  onComponentClick?: (componentId: string) => void
}

export function ComponentCard({
  component,
  onMilestoneChange,
  onComponentClick,
}: ComponentCardProps) {
  const milestones = (component.template?.milestones_config ?? []) as MilestoneConfig[]

  return (
    <div
      className="p-3 rounded-md border border-gray-100 hover:border-gray-200 transition-colors cursor-pointer"
      onClick={() => onComponentClick?.(component.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onComponentClick?.(component.id); } }}
    >
      {/* Header: item number + identity + percentage */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          {component.attributes?.item_number != null && (
            <span className="flex-shrink-0 text-xs font-semibold text-blue-600">
              #{component.attributes.item_number}
            </span>
          )}
          <span className="text-sm font-medium text-gray-900 truncate">
            {component.identityDisplay}
          </span>
        </div>
        <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
          {Math.round(component.percent_complete)}%
        </span>
      </div>

      {/* Milestones — horizontal wrap */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2" onClick={(e) => e.stopPropagation()}>
        {milestones.map((milestone) => {
          const currentValue = component.current_milestones[milestone.name]
          const isChecked =
            typeof currentValue === 'boolean' ? currentValue : Number(currentValue) >= 100

          return (
            <MilestoneCheckbox
              key={milestone.name}
              milestone={milestone}
              checked={isChecked}
              onChange={(checked) =>
                onMilestoneChange(component.id, milestone.name, checked)
              }
              disabled={!component.canUpdate}
              compact
            />
          )
        })}
      </div>
    </div>
  )
}
