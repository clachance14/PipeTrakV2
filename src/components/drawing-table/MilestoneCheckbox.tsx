import { Checkbox } from '@/components/ui/checkbox'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { MilestoneConfig } from '@/types/drawing-table.types'

export interface MilestoneCheckboxProps {
  milestone: MilestoneConfig
  checked: boolean
  onChange: (checked: boolean) => void
  disabled: boolean
  /** Whether to abbreviate label for mobile (Receive → Recv, Install → Inst, Restore → Rest) */
  abbreviate?: boolean
  /** Whether this is rendered on mobile (affects hit area sizing) */
  isMobile?: boolean
  /** Compact variant for card grid layout */
  compact?: boolean
}

/**
 * Abbreviation map for mobile milestone labels
 */
const LABEL_ABBREVIATIONS: Record<string, string> = {
  'Receive': 'Recv',
  'Install': 'Inst',
  'Restore': 'Rest',
  // 'Punch' and 'Test' are already short
}

/**
 * Discrete milestone control (checkbox)
 *
 * Renders a checkbox for boolean milestones (complete/incomplete).
 * Shows milestone weight in tooltip on hover.
 * Applies disabled styling when user lacks update permissions.
 */
export function MilestoneCheckbox({
  milestone,
  checked,
  onChange,
  disabled,
  abbreviate = false,
  isMobile = false,
  compact = false,
}: MilestoneCheckboxProps) {
  const displayLabel = abbreviate && LABEL_ABBREVIATIONS[milestone.name]
    ? LABEL_ABBREVIATIONS[milestone.name]
    : milestone.name

  const content = (
    <>
      <Checkbox
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        aria-label={`${milestone.name} milestone`}
        className={cn(
          disabled ? 'cursor-not-allowed' : 'cursor-pointer',
          isMobile ? 'h-5 w-5' : compact ? 'h-3 w-3' : ''
        )}
      />
      <span
        className={cn(
          compact ? 'text-[11px]' : 'text-xs',
          'font-medium truncate',
          disabled ? 'cursor-not-allowed text-muted-foreground' : 'cursor-pointer'
        )}
      >
        {displayLabel}
      </span>
    </>
  )

  // Desktop: normal inline label
  if (!isMobile) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <label
              className={cn(
                'inline-flex items-center gap-2',
                disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              )}
            >
              {content}
            </label>
          </TooltipTrigger>
          <TooltipContent>
            <p>{milestone.weight}% of total progress</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Mobile: big touch-friendly container with visual feedback
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            onClick={() => !disabled && onChange(!checked)}
            className={cn(
              'flex items-center gap-2 w-full',
              'rounded-md border px-2 py-2',
              'min-h-[44px]',
              'transition-colors',
              disabled
                ? 'opacity-50 cursor-not-allowed bg-slate-100 border-slate-200'
                : checked
                ? 'bg-blue-50 border-blue-400 cursor-pointer'
                : 'bg-white border-slate-300 cursor-pointer'
            )}
          >
            <Checkbox
              checked={checked}
              onCheckedChange={onChange}
              disabled={disabled}
              aria-label={`${milestone.name} milestone`}
              className={cn(
                disabled ? 'cursor-not-allowed' : 'cursor-pointer',
                'h-5 w-5'
              )}
            />
            <span
              className={cn(
                'text-xs font-medium truncate',
                disabled ? 'cursor-not-allowed text-muted-foreground' : 'cursor-pointer'
              )}
            >
              {displayLabel}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{milestone.weight}% of total progress</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
