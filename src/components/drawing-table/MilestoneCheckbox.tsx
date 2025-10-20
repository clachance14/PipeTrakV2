import { Checkbox } from '@/components/ui/checkbox'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { MilestoneConfig } from '@/types/drawing-table.types'

export interface MilestoneCheckboxProps {
  milestone: MilestoneConfig
  checked: boolean
  onChange: (checked: boolean) => void
  disabled: boolean
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
}: MilestoneCheckboxProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`flex items-center gap-2 ${
              disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Checkbox
              checked={checked}
              onCheckedChange={onChange}
              disabled={disabled}
              aria-label={`${milestone.name} milestone`}
              className={disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
            />
            <label
              className={`text-sm ${
                disabled ? 'cursor-not-allowed text-muted-foreground' : 'cursor-pointer'
              }`}
            >
              {milestone.name}
            </label>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{milestone.weight}% of total progress</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
