import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MilestoneCheckbox } from './MilestoneCheckbox'
import { PartialMilestoneInput } from './PartialMilestoneInput'
import { MetadataCell } from './MetadataCell'
import { RollbackConfirmationModal } from './RollbackConfirmationModal'
import { Checkbox } from '@/components/ui/checkbox'
import { useMobileDetection } from '@/hooks/useMobileDetection'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useOfflineQueue } from '@/hooks/useOfflineQueue'
import { useAuth } from '@/contexts/AuthContext'
import { isDemoUser } from '@/components/demo/DemoModeBanner'
import { cn } from '@/lib/utils'
import { formatIdentityKey } from '@/lib/formatIdentityKey'
import { isAggregatePipe, getMilestonePercentValue, isMilestoneComplete } from '@/lib/aggregatePipe'
import type { ComponentRow as ComponentRowType, MilestoneConfig, RollbackReasonData } from '@/types/drawing-table.types'

/**
 * Milestone label abbreviations for compact display
 */
const LABEL_ABBREVIATIONS: Record<string, string> = {
  'Fabricate': 'FAB',
  'Install': 'INST',
  'Erect': 'ER',
  'Connect': 'CONN',
  'Support': 'SUP',
}

export interface ComponentRowProps {
  component: ComponentRowType
  onMilestoneUpdate: (componentId: string, milestoneName: string, value: boolean | number, rollbackReason?: RollbackReasonData) => void
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
  const navigate = useNavigate()
  const { user } = useAuth()
  const isDemo = isDemoUser(user?.email)

  // Highlight % complete when it changes (demo users only)
  const [isHighlighted, setIsHighlighted] = useState(false)
  const prevPercentRef = useRef(component.percent_complete)

  // Rollback confirmation state
  const [rollbackPending, setRollbackPending] = useState<{
    milestoneName: string
    currentValue: number
    newValue: number
  } | null>(null)

  useEffect(() => {
    if (isDemo && prevPercentRef.current !== component.percent_complete) {
      setIsHighlighted(true)
      const timer = setTimeout(() => setIsHighlighted(false), 1500)
      prevPercentRef.current = component.percent_complete
      return () => clearTimeout(timer)
    }
  }, [component.percent_complete, isDemo])

  const handleMilestoneChange = (milestoneName: string, value: boolean | number) => {
    // Get current value (normalize to number for comparison)
    const currentValue = component.current_milestones[milestoneName]
    const currentNumeric = typeof currentValue === 'boolean' ? (currentValue ? 100 : 0) : (currentValue || 0)
    const newNumeric = typeof value === 'boolean' ? (value ? 100 : 0) : value

    // Check if this is a rollback (decrease in value)
    const isRollback = newNumeric < currentNumeric

    if (isRollback) {
      // Open rollback confirmation modal
      setRollbackPending({
        milestoneName,
        currentValue: currentNumeric,
        newValue: newNumeric
      })
      return
    }

    // Not a rollback - proceed immediately
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

  const handleRollbackConfirm = (reasonData: RollbackReasonData) => {
    if (!rollbackPending) return

    const { milestoneName, newValue } = rollbackPending

    // If offline, enqueue update to localStorage
    if (!isOnline) {
      enqueue({
        component_id: component.id,
        milestone_name: milestoneName,
        value: newValue,
        user_id: 'current-user-id' // TODO: Get from auth context
      })
      // Still call onMilestoneUpdate for optimistic UI
    }

    onMilestoneUpdate(component.id, milestoneName, newValue, reasonData)
    setRollbackPending(null)
  }

  // Navigate to test package detail page
  const handleTestPackageClick = (packageId: string) => {
    navigate(`/packages/${packageId}/components`)
  }

  // Aggregate pipe display logic (Feature 027 + pipe aggregates)
  // Applies to both 'pipe' and 'threaded_pipe' component types with -AGG suffix
  const componentIsAggregatePipe = isAggregatePipe(component.component_type, component.identity_key)

  const getIdentityDisplay = () => {
    if (!componentIsAggregatePipe) {
      return component.identityDisplay
    }

    // Aggregate threaded pipe: show size and linear feet (e.g., "1" • 6.6 LF")
    const totalLF = component.attributes?.total_linear_feet ?? component.attributes?.original_qty ?? 0
    const sizeDisplay = formatIdentityKey(
      component.identity_key,
      component.component_type,
      undefined
    )

    return `${sizeDisplay} • ${totalLF} LF`
  }

  const getLineNumberTooltip = () => {
    if (!componentIsAggregatePipe) {
      return undefined
    }

    const lineNumbers = component.attributes?.line_numbers || []
    if (lineNumbers.length === 0) {
      return undefined
    }

    // Show line numbers and full pipe_id on hover
    const pipeId = 'pipe_id' in component.identity_key ? component.identity_key.pipe_id : ''
    return `Line numbers: ${lineNumbers.join(', ')}\nPipe ID: ${pipeId}`
  }

  const identityDisplay = getIdentityDisplay()
  const lineNumberTooltip = getLineNumberTooltip()

  // Check if component has any incomplete milestones (for demo tour targeting)
  const hasIncompleteMilestones = () => {
    return component.template.milestones_config.some((milestone) => {
      const value = component.current_milestones[milestone.name]
      // Incomplete if not 100 or true
      return value !== 100 && value !== true
    })
  }

  const getMilestoneControl = (milestoneConfig: MilestoneConfig) => {
    // Partial milestone (percentage) - inline numeric input
    if (milestoneConfig.is_partial) {
      const percentValue = getMilestonePercentValue(component, milestoneConfig.name, true)
      return (
        <PartialMilestoneInput
          milestone={milestoneConfig}
          currentValue={percentValue}
          onUpdate={(value) => handleMilestoneChange(milestoneConfig.name, value)}
          disabled={!component.canUpdate}
          isMobile={isMobile}
          abbreviate={isMobile}
          component={component}
        />
      )
    }

    // Discrete milestone (checkbox)
    const currentValue = component.current_milestones[milestoneConfig.name]
    return (
      <MilestoneCheckbox
        milestone={milestoneConfig}
        checked={isMilestoneComplete(currentValue)}
        onChange={(checked) => handleMilestoneChange(milestoneConfig.name, checked ? 100 : 0)}
        disabled={!component.canUpdate}
        abbreviate={isMobile}
        isMobile={isMobile}
      />
    )
  }

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
          "flex flex-col gap-1 px-3 py-1 -my-1 mb-2 bg-slate-50 border-b border-slate-200 hover:bg-white transition-all duration-100",
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
        aria-label={onClick ? `Edit metadata for ${identityDisplay}` : undefined}
      >
        {/* Line 1: Component type + identity (single line with bullet separators) */}
        <div className="flex items-baseline gap-1.5 text-sm">
          <span className="font-semibold text-slate-900 whitespace-nowrap">
            {formatComponentType(component.component_type)}
          </span>
          <span className="text-slate-400">·</span>
          <span
            className="font-mono text-slate-700 truncate"
            title={lineNumberTooltip}
          >
            {identityDisplay}
          </span>
        </div>

        {/* Line 2: Metadata badges */}
        <div className="flex flex-wrap gap-1.5 text-xs">
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

        {/* Line 3: Milestone controls (grid layout for better space efficiency) */}
        <div className="grid grid-cols-3 gap-2 w-full">
          {component.template.milestones_config.map((milestone) => (
            <div key={milestone.name} className="flex">
              {getMilestoneControl(milestone)}
            </div>
          ))}
        </div>

        {/* Rollback confirmation modal */}
        {rollbackPending && (
          <div data-testid="rollback-modal-wrapper">
            <RollbackConfirmationModal
              isOpen={!!rollbackPending}
              onClose={() => setRollbackPending(null)}
              onConfirm={handleRollbackConfirm}
              componentName={identityDisplay}
              milestoneName={rollbackPending.milestoneName}
            />
          </div>
        )}
      </div>
    )
  }

  // Desktop single-row layout (all components except mobile)
  return (
    <div
      role="row"
      style={style}
      onClick={handleRowClick}
      className={cn(
        "flex gap-4 px-5 pl-6 py-3 mb-2 items-center bg-slate-50 border-b border-slate-100 hover:bg-white transition-all duration-100",
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
      data-tour-component={hasIncompleteMilestones() ? 'incomplete' : undefined}
    >
      {/* Spacer for chevron */}
      <div className="w-3 flex-shrink-0" />

      {/* Component type and identity display */}
      {componentIsAggregatePipe ? (
        <div className="w-[280px] pr-4 flex-shrink-0">
          <div className="flex flex-col">
            <div className="text-sm font-medium text-slate-600">
              {component.component_type === 'threaded_pipe' ? 'Threaded Pipe' : 'Pipe'}
            </div>
            <div className="font-mono text-xs text-slate-700" title={lineNumberTooltip}>
              {identityDisplay}
            </div>
          </div>
        </div>
      ) : (
        <div className="w-[280px] text-sm truncate pr-4 flex-shrink-0">
          <span className="font-medium text-slate-600">
            {formatComponentType(component.component_type)}:
          </span>
          <span className="ml-2 font-mono text-slate-700" title={lineNumberTooltip}>
            {identityDisplay}
          </span>
        </div>
      )}

      {/* Milestone controls */}
      {componentIsAggregatePipe ? (
        <div className="flex items-center gap-1 px-2">
          {/* Partial milestones */}
          {component.template.milestones_config
            .filter(m => m.is_partial)
            .map((milestone) => (
              <PartialMilestoneInput
                key={milestone.name}
                milestone={milestone}
                currentValue={getMilestonePercentValue(component, milestone.name, true)}
                onUpdate={(value) => handleMilestoneChange(milestone.name, value)}
                disabled={!component.canUpdate}
                abbreviate={true}
                component={component}
                variant="compact"
                showLinearFeetHelper={false}
              />
            ))}

          {/* Discrete milestones (QA checkboxes) */}
          {component.template.milestones_config
            .filter(m => !m.is_partial)
            .map((milestone) => {
              const currentValue = component.current_milestones[milestone.name]
              const abbreviation = LABEL_ABBREVIATIONS[milestone.name] || milestone.name

              return (
                <label key={milestone.name} className="inline-flex items-center gap-1 cursor-pointer">
                  <Checkbox
                    checked={isMilestoneComplete(currentValue)}
                    onCheckedChange={(checkedState) => handleMilestoneChange(milestone.name, checkedState === true ? 100 : 0)}
                    disabled={!component.canUpdate}
                    className={cn('h-3 w-3', !component.canUpdate && 'cursor-not-allowed')}
                  />
                  <span className="text-[10px] font-medium text-slate-600">{abbreviation}</span>
                </label>
              )
            })}
        </div>
      ) : (
        component.template.milestones_config.map((milestone) => (
          <div
            key={milestone.name}
            className="flex items-center justify-center min-w-[80px]"
          >
            {getMilestoneControl(milestone)}
          </div>
        ))
      )}

      {/* Area - ml-auto pushes this and subsequent metadata columns to the right edge */}
      <div className="min-w-[60px] shrink-0 ml-auto">
        <MetadataCell
          value={area}
          drawingValue={drawing?.area}
          fieldName="Area"
          componentId={component.id}
          isMobile={false}
        />
      </div>

      {/* System */}
      <div className="min-w-[60px]">
        <MetadataCell
          value={system}
          drawingValue={drawing?.system}
          fieldName="System"
          componentId={component.id}
          isMobile={false}
        />
      </div>

      {/* Test Package */}
      <div className="min-w-[80px]">
        <MetadataCell
          value={testPackage}
          drawingValue={drawing?.test_package}
          fieldName="Test Package"
          componentId={component.id}
          isMobile={false}
          onClick={handleTestPackageClick}
        />
      </div>

      {/* Progress percentage */}
      <div className={cn(
        "min-w-[130px] text-sm font-semibold text-slate-800 transition-all duration-300",
        isHighlighted && "bg-yellow-200 text-yellow-900 rounded px-2 -mx-2 scale-110"
      )}>
        {component.percent_complete.toFixed(0)}%
      </div>

      {/* Spacer for Items column (component rows don't show item count) */}
      <div className="min-w-[90px]" />

      {/* Rollback confirmation modal */}
      {rollbackPending && (
        <div data-testid="rollback-modal-wrapper">
          <RollbackConfirmationModal
            isOpen={!!rollbackPending}
            onClose={() => setRollbackPending(null)}
            onConfirm={handleRollbackConfirm}
            componentName={identityDisplay}
            milestoneName={rollbackPending.milestoneName}
          />
        </div>
      )}
    </div>
  )
}
