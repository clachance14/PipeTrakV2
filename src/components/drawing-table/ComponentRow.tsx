import { MilestoneCheckbox } from './MilestoneCheckbox'
import { PartialMilestoneInput } from './PartialMilestoneInput'
import { MetadataCell } from './MetadataCell'
import { useMobileDetection } from '@/hooks/useMobileDetection'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useOfflineQueue } from '@/hooks/useOfflineQueue'
import { cn } from '@/lib/utils'
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
  /** Optional callback when component row is clicked */
  onClick?: (componentId: string) => void
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
  onClick,
}: ComponentRowProps) {
  const isMobile = useMobileDetection()
  const isOnline = useNetworkStatus()
  const { enqueue } = useOfflineQueue()

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


  const getMilestoneControl = (milestoneConfig: MilestoneConfig) => {
    const currentValue = component.current_milestones[milestoneConfig.name]

    // Partial milestone (percentage) - inline numeric input
    if (milestoneConfig.is_partial) {
      return (
        <PartialMilestoneInput
          milestone={milestoneConfig}
          currentValue={typeof currentValue === 'number' ? currentValue : 0}
          onUpdate={(value) => handleMilestoneChange(milestoneConfig.name, value)}
          disabled={!component.canUpdate}
          isMobile={isMobile}
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

  // Check if component has partial milestones (for taller row height)
  const hasPartialMilestones = component.template.milestones_config.some(
    (m) => m.is_partial
  )

  // Handle row click
  const handleRowClick = (e: React.MouseEvent) => {
    // Don't trigger row click if clicking interactive elements
    const target = e.target as HTMLElement
    if (
      target.tagName === 'BUTTON' ||
      target.tagName === 'INPUT' ||
      target.tagName === 'LABEL' ||
      target.closest('button') ||
      target.closest('input') ||
      target.closest('label')
    ) {
      return
    }
    onClick?.(component.id)
  }

  // Mobile card layout
  if (isMobile) {
    return (
      <div
        role="row"
        style={style}
        onClick={handleRowClick}
        className={cn(
          "flex flex-col gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200 hover:bg-white transition-all duration-100",
          onClick && "cursor-pointer"
        )}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            // Don't trigger row keyboard action if event came from interactive elements
            const target = e.target as HTMLElement
            if (
              target.tagName === 'BUTTON' ||
              target.tagName === 'INPUT' ||
              target.tagName === 'LABEL' ||
              target.closest('button') ||
              target.closest('input') ||
              target.closest('label') ||
              target.closest('[role="checkbox"]')
            ) {
              return
            }

            e.preventDefault()
            onClick(component.id)
          }
        } : undefined}
        aria-label={onClick ? `Edit metadata for ${component.identityDisplay}` : undefined}
      >
        {/* Line 1: Component type + identity */}
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-base text-slate-900">
            {formatComponentType(component.component_type)}:
          </span>
          <span className="font-mono text-sm text-slate-700">
            {component.identityDisplay}
          </span>
        </div>

        {/* Line 2: Milestone controls (grid layout for better space efficiency) */}
        <div className="grid grid-cols-3 gap-x-2 gap-y-2 w-full">
          {component.template.milestones_config.map((milestone) => (
            <div key={milestone.name} className="flex items-center justify-center">
              {getMilestoneControl(milestone)}
            </div>
          ))}
        </div>

        {/* Line 3: Metadata cells */}
        <div className="flex flex-wrap gap-2 text-xs">
          <MetadataCell
            value={area}
            drawingValue={drawing?.area}
            fieldName="Area"
            componentId={component.id}
            isMobile={true}
          />
          <MetadataCell
            value={system}
            drawingValue={drawing?.system}
            fieldName="System"
            componentId={component.id}
            isMobile={true}
          />
          <MetadataCell
            value={testPackage}
            drawingValue={drawing?.test_package}
            fieldName="Test Package"
            componentId={component.id}
            isMobile={true}
          />
        </div>
      </div>
    )
  }

  // Desktop table row layout
  // Two-row layout for components with partial milestones to avoid horizontal scrolling
  if (hasPartialMilestones) {
    return (
      <div
        role="row"
        style={style}
        onClick={handleRowClick}
        className={cn(
          "flex flex-col gap-2 px-5 pl-6 py-4 bg-slate-50 border-b border-slate-100 hover:bg-white transition-all duration-100",
          onClick && "cursor-pointer"
        )}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            // Don't trigger row keyboard action if event came from interactive elements
            const target = e.target as HTMLElement
            if (
              target.tagName === 'BUTTON' ||
              target.tagName === 'INPUT' ||
              target.tagName === 'LABEL' ||
              target.closest('button') ||
              target.closest('input') ||
              target.closest('label') ||
              target.closest('[role="checkbox"]')
            ) {
              return
            }

            e.preventDefault()
            onClick(component.id)
          }
        } : undefined}
        aria-label={onClick ? `Edit metadata for ${component.identityDisplay}` : undefined}
      >
        {/* Row 1: Component identity + milestone controls + progress */}
        <div className="flex items-start gap-4">
          {/* Spacer for chevron */}
          <div className="w-3 flex-shrink-0" />

          {/* Component type and identity */}
          <div className="min-w-[280px] text-sm pt-1 flex-shrink-0">
            <span className="font-medium text-slate-600">
              {formatComponentType(component.component_type)}:
            </span>
            <span className="ml-2 font-mono text-slate-700">
              {component.identityDisplay}
            </span>
          </div>

          {/* Milestone controls */}
          <div className="flex items-start gap-3 flex-1">
            {component.template.milestones_config.map((milestone) => (
              <div
                key={milestone.name}
                className="flex items-center justify-center"
              >
                {getMilestoneControl(milestone)}
              </div>
            ))}
          </div>

          {/* Progress percentage */}
          <div className="min-w-[80px] text-sm font-semibold text-slate-800 text-right pt-1 flex-shrink-0">
            {component.percent_complete.toFixed(0)}%
          </div>
        </div>

        {/* Row 2: Metadata cells */}
        <div className="flex items-center gap-4 pl-[calc(0.75rem+280px)]">
          <div className="min-w-[100px]">
            <MetadataCell
              value={area}
              drawingValue={drawing?.area}
              fieldName="Area"
              componentId={component.id}
              isMobile={false}
            />
          </div>
          <div className="min-w-[100px]">
            <MetadataCell
              value={system}
              drawingValue={drawing?.system}
              fieldName="System"
              componentId={component.id}
              isMobile={false}
            />
          </div>
          <div className="min-w-[120px]">
            <MetadataCell
              value={testPackage}
              drawingValue={drawing?.test_package}
              fieldName="Test Package"
              componentId={component.id}
              isMobile={false}
            />
          </div>
        </div>
      </div>
    )
  }

  // Single-row layout for components with only discrete milestones
  return (
    <div
      role="row"
      style={style}
      onClick={handleRowClick}
      className={cn(
        "flex gap-4 px-5 pl-6 py-3 items-center bg-slate-50 border-b border-slate-100 hover:bg-white transition-all duration-100",
        onClick && "cursor-pointer"
      )}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick(component.id)
        }
      } : undefined}
      aria-label={onClick ? `Edit metadata for ${component.identityDisplay}` : undefined}
    >
      {/* Spacer for chevron */}
      <div className="w-3 flex-shrink-0" />

      {/* Component type and identity display */}
      <div className="w-[380px] text-sm truncate pr-4 flex-shrink-0">
        <span className="font-medium text-slate-600">
          {formatComponentType(component.component_type)}:
        </span>
        <span className="ml-2 font-mono text-slate-700">
          {component.identityDisplay}
        </span>
      </div>

      {/* Milestone controls - component-specific milestones only */}
      {component.template.milestones_config.map((milestone) => (
        <div
          key={milestone.name}
          className="flex items-center justify-center min-w-[80px]"
        >
          {getMilestoneControl(milestone)}
        </div>
      ))}

      {/* Area - ml-auto pushes this and subsequent metadata columns to the right edge */}
      <div className="min-w-[100px] shrink-0 ml-auto">
        <MetadataCell
          value={area}
          drawingValue={drawing?.area}
          fieldName="Area"
          componentId={component.id}
          isMobile={false}
        />
      </div>

      {/* System */}
      <div className="min-w-[100px]">
        <MetadataCell
          value={system}
          drawingValue={drawing?.system}
          fieldName="System"
          componentId={component.id}
          isMobile={false}
        />
      </div>

      {/* Test Package */}
      <div className="min-w-[120px]">
        <MetadataCell
          value={testPackage}
          drawingValue={drawing?.test_package}
          fieldName="Test Package"
          componentId={component.id}
          isMobile={false}
        />
      </div>

      {/* Progress percentage */}
      <div className="min-w-[130px] text-sm font-semibold text-slate-800">
        {component.percent_complete.toFixed(0)}%
      </div>

      {/* Spacer for Items column (component rows don't show item count) */}
      <div className="min-w-[90px]" />
    </div>
  )
}
