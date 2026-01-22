/**
 * UpdateWeldDialog Component (Feature 022 enhancement)
 * Dialog for updating field weld milestones (Fit-up, Weld Complete)
 * Replaces WelderAssignDialog functionality
 */

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useUpdateMilestone } from '@/hooks/useUpdateMilestone'
import { useAuth } from '@/contexts/AuthContext'
import type { EnrichedFieldWeld } from '@/hooks/useFieldWelds'
import { toast } from 'sonner'

interface UpdateWeldDialogProps {
  weld: EnrichedFieldWeld
  open: boolean
  onOpenChange: (open: boolean) => void
  onTriggerWelderDialog?: () => void
}

export function UpdateWeldDialog({ weld, open, onOpenChange, onTriggerWelderDialog }: UpdateWeldDialogProps) {
  const { user } = useAuth()
  const updateMilestone = useUpdateMilestone()

  // Get current milestone values from component
  const currentMilestones = (weld.component.current_milestones as Record<string, any>) || {}

  // Local state for checkboxes
  // Note: Milestone keys match project_progress_templates: 'Fit-up' (lowercase u), 'Weld Complete'
  const [fitUpChecked, setFitUpChecked] = useState(Boolean(currentMilestones['Fit-up']))
  const [weldCompleteChecked, setWeldCompleteChecked] = useState(Boolean(currentMilestones['Weld Complete']))

  // Update local state when weld changes (e.g., after mutation)
  useEffect(() => {
    setFitUpChecked(Boolean(currentMilestones['Fit-up']))
    setWeldCompleteChecked(Boolean(currentMilestones['Weld Complete']))
  }, [currentMilestones])

  const handleSave = async () => {
    if (!user?.id) {
      toast.error('User not authenticated')
      return
    }

    // INTERCEPTION LOGIC (T019): Check if Weld Complete is being checked for the first time
    // If Weld Complete is being checked (true) AND current value is false/0 (first time)
    // Then trigger welder assignment dialog instead of updating milestone
    const isWeldMadeFirstTime = weldCompleteChecked && !currentMilestones['Weld Complete']

    if (isWeldMadeFirstTime && onTriggerWelderDialog) {
      // Trigger welder dialog and return early (don't update milestone)
      onTriggerWelderDialog()
      return
    }

    try {
      // Update Fit-up milestone if changed
      if (fitUpChecked !== Boolean(currentMilestones['Fit-up'])) {
        await updateMilestone.mutateAsync({
          component_id: weld.component_id,
          milestone_name: 'Fit-up',
          value: fitUpChecked,
          user_id: user.id,
        })
      }

      // Update Weld Complete milestone if changed
      if (weldCompleteChecked !== Boolean(currentMilestones['Weld Complete'])) {
        await updateMilestone.mutateAsync({
          component_id: weld.component_id,
          milestone_name: 'Weld Complete',
          value: weldCompleteChecked,
          user_id: user.id,
        })
      }

      toast.success('Weld milestones updated successfully')
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to update weld milestones:', error)
      toast.error('Failed to update milestones. Please try again.')
    }
  }

  const handleCancel = () => {
    // Reset to current values
    setFitUpChecked(Boolean(currentMilestones['Fit-up']))
    setWeldCompleteChecked(Boolean(currentMilestones['Weld Complete']))
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Weld: {weld.identityDisplay}</DialogTitle>
          <DialogDescription>
            Update milestone progress for this field weld
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Fit-up Milestone */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="fit-up"
              checked={fitUpChecked}
              onChange={(e) => setFitUpChecked(e.target.checked)}
              className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Fit-up complete"
            />
            <label
              htmlFor="fit-up"
              className="flex flex-1 cursor-pointer flex-col"
            >
              <span className="text-sm font-medium text-slate-900">Fit-up</span>
              <span className="text-xs text-slate-500">Mark when joint is fitted up and ready for welding</span>
            </label>
          </div>

          {/* Weld Complete Milestone */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="weld-complete"
              checked={weldCompleteChecked}
              onChange={(e) => setWeldCompleteChecked(e.target.checked)}
              className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Weld complete"
            />
            <label
              htmlFor="weld-complete"
              className="flex flex-1 cursor-pointer flex-col"
            >
              <span className="text-sm font-medium text-slate-900">Weld Complete</span>
              <span className="text-xs text-slate-500">Mark when welding is complete (triggers welder assignment)</span>
            </label>
          </div>

          {/* Progress Indicator */}
          <div className="rounded-md bg-slate-50 p-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Current Progress:</span>
              <span className="font-medium text-slate-900">
                {weld.component.percent_complete}%
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${weld.component.percent_complete}%` }}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="min-h-[44px]"
            aria-label="Cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateMilestone.isPending}
            className="min-h-[44px]"
            aria-label="Save milestone updates"
          >
            {updateMilestone.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
