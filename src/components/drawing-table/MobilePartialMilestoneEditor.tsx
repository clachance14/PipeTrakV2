/**
 * MobilePartialMilestoneEditor Component
 * Feature: 015-mobile-milestone-updates
 * Purpose: Full-screen modal for editing partial milestones on mobile devices
 */

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'

interface MobilePartialMilestoneEditorProps {
  open: boolean
  milestoneName: string
  currentValue: number
  onSave: (value: number) => void
  onCancel: () => void
}

export function MobilePartialMilestoneEditor({
  open,
  milestoneName,
  currentValue,
  onSave,
  onCancel
}: MobilePartialMilestoneEditorProps) {
  const [localValue, setLocalValue] = useState(currentValue)

  const handleSave = () => {
    onSave(localValue)
  }

  const handleCancel = () => {
    setLocalValue(currentValue) // Reset to original
    onCancel()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleCancel()}>
      <DialogContent className="h-screen w-screen max-w-none rounded-none">
        <DialogHeader>
          <DialogTitle className="text-2xl">{milestoneName}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center flex-1 gap-8">
          {/* Large percentage display */}
          <div className="text-6xl font-bold text-slate-900">
            {localValue}%
          </div>

          {/* Large draggable slider */}
          <Slider
            value={[localValue]}
            onValueChange={([value]) => setLocalValue(value)}
            max={100}
            step={1}
            className="w-4/5 h-12"
            aria-label={`${milestoneName} percentage`}
          />

          {/* Helper text */}
          <p className="text-sm text-slate-600">
            Drag slider or tap to set percentage
          </p>
        </div>

        <DialogFooter className="flex flex-row gap-4 sm:gap-4">
          <Button
            variant="outline"
            size="lg"
            onClick={handleCancel}
            className="flex-1 h-12 text-base"
          >
            Cancel
          </Button>
          <Button
            size="lg"
            onClick={handleSave}
            className="flex-1 h-12 text-base"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
