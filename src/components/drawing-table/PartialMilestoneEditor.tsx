import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Slider } from '@/components/ui/slider'
import type { MilestoneConfig } from '@/types/drawing-table.types'

export interface PartialMilestoneEditorProps {
  milestone: MilestoneConfig
  currentValue: number
  onUpdate: (value: number) => void
  disabled: boolean
}

/**
 * Partial milestone control (percentage slider)
 *
 * Renders a clickable percentage that opens a popover with slider (0-100, step 5).
 * Shows current percentage as trigger, updates on slider change.
 * Applies disabled styling when user lacks update permissions.
 */
export function PartialMilestoneEditor({
  milestone,
  currentValue,
  onUpdate,
  disabled,
}: PartialMilestoneEditorProps) {
  const [tempValue, setTempValue] = useState(currentValue)
  const [isOpen, setIsOpen] = useState(false)

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setTempValue(currentValue) // Reset to current value when opening
    }
    setIsOpen(open)
  }

  const handleUpdate = () => {
    onUpdate(tempValue)
    setIsOpen(false)
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          className={`text-sm text-primary underline-offset-4 hover:underline ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`}
          disabled={disabled}
          aria-label={`${milestone.name} milestone at ${currentValue}%`}
        >
          {currentValue}%
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">{milestone.name}</label>
              <span className="text-sm text-muted-foreground">{tempValue}%</span>
            </div>
            <Slider
              value={[tempValue]}
              onValueChange={(values) => setTempValue(values[0])}
              min={0}
              max={100}
              step={5}
              className="w-full"
              disabled={disabled}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleUpdate} disabled={disabled}>
              Update
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
