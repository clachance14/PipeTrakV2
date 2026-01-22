import { useState, useEffect } from 'react'
import { useWelders } from '@/hooks/useWelders'
import { useAssignWelder } from '@/hooks/useAssignWelder'
import { useUpdateWelderAssignment } from '@/hooks/useUpdateWelderAssignment'
import { useFieldWeld } from '@/hooks/useFieldWeld'
import { useAuth } from '@/contexts/AuthContext'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Info } from 'lucide-react'

interface WelderAssignDialogProps {
  /** Field weld ID (optional if componentId is provided) */
  fieldWeldId?: string
  /** Component ID (used to query for field weld if fieldWeldId not provided) */
  componentId?: string
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Edit mode - when true, updates existing assignment without affecting milestones */
  mode?: 'assign' | 'edit'
  /** Current welder ID (for edit mode) */
  currentWelderId?: string | null
  /** Current date welded (for edit mode) */
  currentDateWelded?: string | null
}

export function WelderAssignDialog({
  fieldWeldId,
  componentId,
  projectId,
  open,
  onOpenChange,
  mode,
  currentWelderId,
  currentDateWelded,
}: WelderAssignDialogProps) {
  const { user } = useAuth()

  // Query for field weld if componentId is provided
  const { data: fieldWeld, isLoading: isLoadingFieldWeld } = useFieldWeld({
    componentId: componentId || '',
    enabled: open && !!componentId && !fieldWeldId,
  })

  // Determine edit mode:
  // - Explicit mode prop takes precedence
  // - Otherwise, auto-detect based on whether welder is already assigned
  const resolvedWelderId = currentWelderId ?? fieldWeld?.welder_id ?? null
  const resolvedDateWelded = currentDateWelded ?? fieldWeld?.date_welded ?? null
  const isEditMode = mode === 'edit' || (mode === undefined && !!resolvedWelderId)

  // Use provided fieldWeldId or queried field weld ID
  const resolvedFieldWeldId = fieldWeldId || fieldWeld?.id
  const [selectedWelderId, setSelectedWelderId] = useState<string>('')
  const [dateWelded, setDateWelded] = useState<string>(
    new Date().toISOString().split('T')[0]!
  )

  const { data: welders, isLoading: isLoadingWelders } = useWelders({ projectId })
  const assignWelderMutation = useAssignWelder()
  const updateWelderMutation = useUpdateWelderAssignment()

  // Reset/initialize form when dialog opens or when fieldWeld data loads
  useEffect(() => {
    if (open) {
      if (isEditMode && resolvedWelderId) {
        // Pre-fill with existing values in edit mode
        setSelectedWelderId(resolvedWelderId)
        setDateWelded(resolvedDateWelded || new Date().toISOString().split('T')[0]!)
      } else {
        // Reset to defaults in assign mode
        setSelectedWelderId('')
        setDateWelded(new Date().toISOString().split('T')[0]!)
      }
    }
  }, [open, isEditMode, resolvedWelderId, resolvedDateWelded])

  const sortedWelders = welders?.sort((a, b) =>
    a.stencil.localeCompare(b.stencil)
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedWelderId) {
      toast.error('Validation error', {
        description: 'Please select a welder',
      })
      return
    }

    if (!dateWelded) {
      toast.error('Validation error', {
        description: 'Please select a date',
      })
      return
    }

    if (!resolvedFieldWeldId) {
      toast.error('Error', {
        description: 'Field weld not found',
      })
      return
    }

    if (!user?.id) {
      toast.error('Error', {
        description: 'User not authenticated',
      })
      return
    }

    try {
      if (isEditMode) {
        // Edit mode: only update welder assignment, don't touch milestones
        await updateWelderMutation.mutateAsync({
          field_weld_id: resolvedFieldWeldId,
          welder_id: selectedWelderId,
          date_welded: dateWelded,
        })
      } else {
        // Assign mode: update welder and mark milestones complete
        await assignWelderMutation.mutateAsync({
          field_weld_id: resolvedFieldWeldId,
          welder_id: selectedWelderId,
          date_welded: dateWelded,
          user_id: user.id,
        })

        toast.success('Welder assigned successfully', {
          description: 'Progress updated to 70% (Weld Made)',
        })
      }

      onOpenChange(false)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Failed to ${isEditMode ? 'update' : 'assign'} welder`
      toast.error(`Error ${isEditMode ? 'updating' : 'assigning'} welder`, {
        description: errorMessage,
      })
    }
  }

  const isPending = isEditMode ? updateWelderMutation.isPending : assignWelderMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[500px]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Welder Assignment' : 'Assign Welder'}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the welder or date for this weld.'
              : 'Select the welder who completed this weld and the date it was welded.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Loading state */}
            {isLoadingFieldWeld && (
              <div className="text-sm text-slate-600 py-2">
                Loading field weld data...
              </div>
            )}

            {/* Welder Selection */}
            <div className="grid gap-2">
              <Label htmlFor="welder" className="text-sm font-medium">
                Welder <span className="text-red-600">*</span>
              </Label>
              <Select
                value={selectedWelderId}
                onValueChange={setSelectedWelderId}
                disabled={isLoadingWelders || isLoadingFieldWeld}
              >
                <SelectTrigger
                  id="welder"
                  aria-label="Select welder"
                >
                  <SelectValue placeholder={
                    isLoadingWelders ? 'Loading welders...' : 'Select a welder'
                  } />
                </SelectTrigger>
                <SelectContent>
                  {sortedWelders && sortedWelders.length > 0 ? (
                    sortedWelders.map((welder) => (
                      <SelectItem key={welder.id} value={welder.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{welder.stencil}</span>
                          <span className="text-slate-600">- {welder.name}</span>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No welders available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Date Welded */}
            <div className="grid gap-2">
              <Label htmlFor="date-welded" className="text-sm font-medium">
                Date Welded <span className="text-red-600">*</span>
              </Label>
              <Input
                id="date-welded"
                type="date"
                value={dateWelded}
                onChange={(e) => setDateWelded(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                required
                aria-label="Date welded"
              />
            </div>

            {/* Info Panel - only show in assign mode */}
            {!isEditMode && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 flex gap-2">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800">
                  This will mark the <span className="font-medium">"Weld Made"</span> milestone
                  and update progress to <span className="font-medium">70%</span>.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || isLoadingFieldWeld || !selectedWelderId || !dateWelded || !resolvedFieldWeldId}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isPending
                ? (isEditMode ? 'Saving...' : 'Assigning...')
                : (isEditMode ? 'Save Changes' : 'Assign Welder')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
