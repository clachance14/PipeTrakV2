/**
 * ComponentGroup Component
 * Collapsible type group header + list of component cards for one component type.
 * Click the header to expand/collapse the group.
 */

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { formatComponentTypePlural, isAggregateType } from '@/lib/component-type-labels'
import { ComponentCard } from './ComponentCard'
import { AggregateComponentCard } from './AggregateComponentCard'
import type { ComponentRow } from '@/types/drawing-table.types'

interface ComponentGroupProps {
  componentType: string
  components: ComponentRow[]
  onMilestoneChange: (componentId: string, milestoneName: string, value: boolean | number) => void
  onComponentClick?: (componentId: string) => void
  /** Whether the group starts expanded (default: true) */
  defaultExpanded?: boolean
}

export function ComponentGroup({
  componentType,
  components,
  onMilestoneChange,
  onComponentClick,
  defaultExpanded = false,
}: ComponentGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  if (components.length === 0) return null

  const label = formatComponentTypePlural(componentType)
  const isAggregate = isAggregateType(componentType)

  return (
    <div>
      {/* Collapsible type header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full py-2 text-left hover:bg-gray-50 rounded transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
        )}
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {label}
        </span>
        <span className="text-xs text-gray-400">({components.length})</span>
        <div className="h-px flex-1 bg-gray-200" />
      </button>

      {/* Component cards */}
      {isExpanded && (
        <div className="space-y-2">
          {components.map((component) =>
            isAggregate ? (
              <AggregateComponentCard
                key={component.id}
                component={component}
                onMilestoneChange={onMilestoneChange}
                onComponentClick={onComponentClick}
              />
            ) : (
              <ComponentCard
                key={component.id}
                component={component}
                onMilestoneChange={onMilestoneChange}
                onComponentClick={onComponentClick}
              />
            )
          )}
        </div>
      )}
    </div>
  )
}
