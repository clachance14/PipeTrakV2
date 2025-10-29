import { useState } from 'react'
import { MilestoneCheckbox } from './MilestoneCheckbox'
import { PartialMilestoneEditor } from './PartialMilestoneEditor'
import { MobilePartialMilestoneEditor } from './MobilePartialMilestoneEditor'
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

  const getMobileMilestoneControl = (milestoneConfig: MilestoneConfig) => {
    const currentValue = component.current_milestones[milestoneConfig.name]

    // Partial milestone - show as compact button with percentage
    if (milestoneConfig.is_partial) {
      return (
        <button
          key={milestoneConfig.name}
          onClick={() => handlePartialMilestoneClick(milestoneConfig)}
          disabled={!component.canUpdate}
          className="min-h-[36px] px-2 py-1 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded hover:bg-slate-200 active:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {milestoneConfig.name}: {typeof currentValue === 'number' ? currentValue : 0}%
        </button>
      )
    }

    // Discrete milestone - checkbox above label (vertical stack)
    return (
      <label
        key={milestoneConfig.name}
        className="flex flex-col items-center gap-1.5 flex-1 min-w-0 py-1 cursor-pointer active:opacity-70"
      >
        <input
          type="checkbox"
          checked={currentValue === 1 || currentValue === true}
          onChange={(e) => handleMilestoneChange(milestoneConfig.name, e.target.checked)}
          disabled={!component.canUpdate}
          aria-label={`${milestoneConfig.name} milestone`}
          className="w-8 h-8 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
        />
        <span className="text-xs text-slate-700 whitespace-nowrap select-none leading-tight font-medium text-center">
          {milestoneConfig.name}
        </span>
      </label>
    )
  }

  // Handle row click
  const handleRowClick = (e: React.MouseEvent) => {
    // Don't trigger row click if clicking interactive elements
    const target = e.target as HTMLElement
    if (
      target.tagName === 'BUTTON' ||
      target.tagName === 'INPUT' ||
      target.closest('button') ||
      target.closest('input')
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
          "flex flex-col gap-2 px-4 py-3 ml-8 bg-slate-50 border-b border-slate-200 hover:bg-white transition-all duration-100",
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
        {/* Line 1: Component type + identity */}
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-base text-slate-900">
            {formatComponentType(component.component_type)}:
          </span>
          <span className="font-mono text-sm text-slate-700">
            {component.identityDisplay}
          </span>
        </div>

        {/* Line 2: Milestone controls (evenly distributed across width) */}
        <div className="flex items-start justify-between gap-1">
          {component.template.milestones_config.map((milestone) =>
            getMobileMilestoneControl(milestone)
          )}
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

        {/* Mobile partial milestone editor modal */}
        {editingMilestone && (
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

  // Desktop table row layout
  return (
    <div
      role="row"
      style={style}
      onClick={handleRowClick}
      className={cn(
        "flex items-center gap-4 px-5 py-3 pl-14 bg-slate-50 border-b border-slate-100 hover:bg-white transition-all duration-100",
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

      {/* Mobile partial milestone editor modal */}
      {editingMilestone && (
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
