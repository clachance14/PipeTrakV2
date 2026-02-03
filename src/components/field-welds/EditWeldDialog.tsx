/**
 * EditWeldDialog Component
 * Unified dialog for editing welder details and NDE details on an existing field weld
 * Replaces separate WelderAssignDialog (edit mode) + NDEResultDialog for editing/recording
 */

import { useState, useEffect, useRef } from 'react'
import { useWelders } from '@/hooks/useWelders'
import { useUpdateWelderAssignment } from '@/hooks/useUpdateWelderAssignment'
import { useClearWelderAssignment } from '@/hooks/useClearWelderAssignment'
import { useRecordNDE } from '@/hooks/useRecordNDE'
import { useUpdateNDE } from '@/hooks/useUpdateNDE'
import { useClearNDE } from '@/hooks/useClearNDE'
import { useHasRepairWeld } from '@/hooks/useHasRepairWeld'
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
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { toast } from 'sonner'
import { AlertTriangle, ShieldAlert } from 'lucide-react'
import { RollbackConfirmationModal } from '../drawing-table/RollbackConfirmationModal'
import type { EnrichedFieldWeld } from '@/hooks/useFieldWelds'

interface EditWeldDialogProps {
  weld: EnrichedFieldWeld
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called when NDE result is set to FAIL (to open CreateRepairWeldDialog) */
  onRepairWeldNeeded?: () => void
}

type NDEResult = 'PASS' | 'FAIL' | 'PENDING'
type NDEType = 'RT' | 'UT' | 'PT' | 'MT' | 'VT'

const NDE_TYPES = [
  { value: 'RT', label: 'RT (X-ray)' },
  { value: 'UT', label: 'UT (Ultrasonic)' },
  { value: 'PT', label: 'PT (Penetrant)' },
  { value: 'MT', label: 'MT (Magnetic)' },
  { value: 'VT', label: 'VT (Visual)' },
]

const getTodayLocal = () => new Date().toLocaleDateString('en-CA')

export function EditWeldDialog({
  weld,
  projectId,
  open,
  onOpenChange,
  onRepairWeldNeeded,
}: EditWeldDialogProps) {
  const { user } = useAuth()

  // Welder form state
  const [selectedWelderId, setSelectedWelderId] = useState<string>('')
  const [dateWelded, setDateWelded] = useState<string>('')

  // NDE form state
  const [ndeType, setNdeType] = useState<string>('')
  const [ndeResult, setNdeResult] = useState<NDEResult | ''>('')
  const [ndeDate, setNdeDate] = useState<string>(getTodayLocal())
  const [ndeNotes, setNdeNotes] = useState<string>('')

  // UI state
  const [showFailConfirmation, setShowFailConfirmation] = useState(false)
  const [showClearWelderConfirm, setShowClearWelderConfirm] = useState(false)
  const [showClearNDEConfirm, setShowClearNDEConfirm] = useState(false)

  const prevOpenRef = useRef(false)

  // Hooks
  const { data: welders, isLoading: isLoadingWelders } = useWelders({ projectId })
  const updateWelderMutation = useUpdateWelderAssignment()
  const clearWelderMutation = useClearWelderAssignment()
  const recordNDEMutation = useRecordNDE()
  const updateNDEMutation = useUpdateNDE()
  const clearNDEMutation = useClearNDE()
  const { data: hasRepairWeld = false } = useHasRepairWeld(weld.id)

  // Derived state
  const hasExistingNDE = !!weld.nde_result
  const hasWelder = !!weld.welder_id

  // Initialize form when dialog opens
  useEffect(() => {
    const justOpened = open && !prevOpenRef.current
    prevOpenRef.current = open

    if (justOpened) {
      // Welder fields
      setSelectedWelderId(weld.welder_id || '')
      setDateWelded(weld.date_welded || '')

      // NDE fields
      setNdeType(weld.nde_type || '')
      setNdeResult((weld.nde_result as NDEResult) || '')
      setNdeDate(weld.nde_date || getTodayLocal())
      setNdeNotes(weld.nde_notes || '')

      // Reset UI state
      setShowFailConfirmation(false)
      setShowClearWelderConfirm(false)
      setShowClearNDEConfirm(false)
    }
  }, [open, weld])

  const sortedWelders = welders
    ? [...welders].sort((a, b) => a.stencil.localeCompare(b.stencil))
    : undefined

  // Detect what changed
  const welderChanged = selectedWelderId !== (weld.welder_id || '') ||
    dateWelded !== (weld.date_welded || '')
  const ndeChanged = hasExistingNDE && (
    ndeType !== (weld.nde_type || '') ||
    ndeResult !== (weld.nde_result || '') ||
    ndeDate !== (weld.nde_date || '') ||
    ndeNotes !== (weld.nde_notes || '')
  )
  const ndeIsNew = !hasExistingNDE && !!ndeType && !!ndeResult && !!ndeDate

  // Block NDE result change from FAIL if repair weld exists
  const ndeFailChangeBlocked = hasRepairWeld && weld.nde_result === 'FAIL'

  const handleClearWelderClick = () => {
    if (hasExistingNDE || ndeIsNew) {
      toast.error('Cannot clear assignment', {
        description: 'NDE results exist. Clear NDE first.',
      })
      return
    }
    setShowClearWelderConfirm(true)
  }

  const handleClearNDEClick = () => {
    if (hasRepairWeld) {
      toast.error('Cannot clear NDE', {
        description: 'A repair weld exists for this weld.',
      })
      return
    }
    setShowClearNDEConfirm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user?.id) {
      toast.error('User not authenticated')
      return
    }

    // Validate welder fields
    if (!selectedWelderId) {
      toast.error('Please select a welder')
      return
    }
    if (!dateWelded) {
      toast.error('Please select a date welded')
      return
    }

    // If NDE fields are partially filled, validate
    if ((ndeType || ndeResult || ndeDate) && ndeIsNew) {
      if (!ndeType) {
        toast.error('Please select an NDE type')
        return
      }
      if (!ndeResult) {
        toast.error('Please select an NDE result')
        return
      }
      if (!ndeDate) {
        toast.error('Please select an NDE date')
        return
      }
    }

    // FAIL confirmation flow
    if (ndeResult === 'FAIL' && !showFailConfirmation && (ndeIsNew || (ndeChanged && weld.nde_result !== 'FAIL'))) {
      setShowFailConfirmation(true)
      return
    }

    try {
      // 1. Save welder changes if needed
      if (welderChanged) {
        await updateWelderMutation.mutateAsync({
          field_weld_id: weld.id,
          welder_id: selectedWelderId,
          date_welded: dateWelded,
          user_id: user.id,
        })
      }

      // 2. Save NDE changes if needed
      if (ndeIsNew) {
        await recordNDEMutation.mutateAsync({
          field_weld_id: weld.id,
          nde_type: ndeType as NDEType,
          nde_result: ndeResult as NDEResult,
          nde_date: ndeDate,
          nde_notes: ndeNotes.trim() || undefined,
          user_id: user.id,
        })

        if (ndeResult === 'FAIL' && onRepairWeldNeeded) {
          onOpenChange(false)
          onRepairWeldNeeded()
          return
        }
      } else if (ndeChanged) {
        await updateNDEMutation.mutateAsync({
          field_weld_id: weld.id,
          nde_type: ndeType as NDEType,
          nde_result: ndeResult as NDEResult,
          nde_date: ndeDate,
          nde_notes: ndeNotes.trim() || undefined,
          user_id: user.id,
        })

        if (ndeResult === 'FAIL' && weld.nde_result !== 'FAIL' && onRepairWeldNeeded) {
          onOpenChange(false)
          onRepairWeldNeeded()
          return
        }
      }

      // Show generic success if only welder changed (hook shows its own toast)
      if (!ndeIsNew && !ndeChanged && !welderChanged) {
        toast.info('No changes to save')
      }

      onOpenChange(false)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save changes'
      toast.error('Error saving weld', { description: errorMessage })
    }
  }

  const isPending = updateWelderMutation.isPending ||
    recordNDEMutation.isPending ||
    updateNDEMutation.isPending

  const hasChanges = welderChanged || ndeChanged || ndeIsNew

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Edit Weld</DialogTitle>
            <DialogDescription>
              Update welder details and NDE results for {weld.identityDisplay}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-6 py-4">
              {/* === WELDER DETAILS SECTION === */}
              <section>
                <h3 className="text-sm font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-1">
                  Welder Details
                </h3>
                <div className="space-y-3">
                  {/* Welder Selection */}
                  <div className="grid gap-2">
                    <Label htmlFor="edit-welder" className="text-sm font-medium">
                      Welder <span className="text-red-600">*</span>
                    </Label>
                    <Select
                      value={selectedWelderId}
                      onValueChange={setSelectedWelderId}
                      disabled={isLoadingWelders}
                    >
                      <SelectTrigger id="edit-welder" aria-label="Select welder">
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
                    <Label htmlFor="edit-date-welded" className="text-sm font-medium">
                      Date Welded <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      id="edit-date-welded"
                      type="date"
                      value={dateWelded}
                      onChange={(e) => setDateWelded(e.target.value)}
                      max={getTodayLocal()}
                      required
                      aria-label="Date welded"
                    />
                  </div>

                  {/* Clear Assignment Button */}
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleClearWelderClick}
                      disabled={isPending || clearWelderMutation.isPending}
                      className="text-xs border-red-300 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
                    >
                      {clearWelderMutation.isPending ? 'Clearing...' : 'Clear Assignment'}
                    </Button>
                    {(hasExistingNDE || ndeIsNew) && (
                      <span className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Clear NDE first
                      </span>
                    )}
                  </div>
                </div>
              </section>

              {/* === NDE DETAILS SECTION === */}
              {hasWelder && (
                <section>
                  <h3 className="text-sm font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-1">
                    NDE Details
                  </h3>
                  <div className="space-y-3">
                    {/* NDE Type */}
                    <div className="grid gap-2">
                      <Label htmlFor="edit-nde-type" className="text-sm font-medium">
                        NDE Type {(hasExistingNDE || ndeResult) && <span className="text-red-600">*</span>}
                      </Label>
                      <Select value={ndeType} onValueChange={setNdeType}>
                        <SelectTrigger id="edit-nde-type" aria-label="Select NDE type">
                          <SelectValue placeholder="Select NDE type" />
                        </SelectTrigger>
                        <SelectContent>
                          {NDE_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* NDE Result */}
                    <div className="grid gap-2">
                      <Label className="text-sm font-medium">
                        NDE Result {(hasExistingNDE || ndeType) && <span className="text-red-600">*</span>}
                      </Label>
                      <RadioGroup
                        value={ndeResult}
                        onValueChange={(value) => {
                          if (ndeFailChangeBlocked && value !== 'FAIL') {
                            toast.error('Cannot change result from FAIL', {
                              description: 'A repair weld already exists.',
                            })
                            return
                          }
                          setNdeResult(value as NDEResult)
                          setShowFailConfirmation(false)
                        }}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="PASS" id="edit-pass" disabled={ndeFailChangeBlocked} />
                          <Label htmlFor="edit-pass" className="font-normal cursor-pointer">
                            PASS
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="FAIL" id="edit-fail" />
                          <Label htmlFor="edit-fail" className="font-normal cursor-pointer">
                            FAIL
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="PENDING" id="edit-pending" disabled={ndeFailChangeBlocked} />
                          <Label htmlFor="edit-pending" className="font-normal cursor-pointer">
                            PENDING
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Repair weld guard warning */}
                    {ndeFailChangeBlocked && (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex gap-2">
                        <ShieldAlert className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-800">
                          NDE result cannot be changed from FAIL because a repair weld already exists.
                        </p>
                      </div>
                    )}

                    {/* FAIL confirmation */}
                    {ndeResult === 'FAIL' && showFailConfirmation && (
                      <div className="rounded-lg border-2 border-red-500 bg-red-50 p-4">
                        <div className="flex gap-3">
                          <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <h4 className="text-sm font-bold text-red-900 mb-2">
                              Confirm: Weld Rejection
                            </h4>
                            <div className="text-sm text-red-800 space-y-1 mb-3">
                              <p className="font-semibold">This will:</p>
                              <ul className="list-disc list-inside ml-2 space-y-0.5">
                                <li>Mark this weld as <strong>REJECTED</strong></li>
                                <li>Set progress to 100% (complete but rejected)</li>
                                <li>Require creating a repair weld</li>
                              </ul>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowFailConfirmation(false)}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="submit"
                                size="sm"
                                disabled={isPending}
                                className="bg-red-600 hover:bg-red-700 text-white"
                              >
                                {isPending ? 'Saving...' : 'Yes, Reject Weld'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* FAIL warning (pre-confirmation) */}
                    {ndeResult === 'FAIL' && !showFailConfirmation && !ndeFailChangeBlocked && (ndeIsNew || (ndeChanged && weld.nde_result !== 'FAIL')) && (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-red-800">
                          <p className="font-semibold">Warning: Selecting FAIL will reject this weld.</p>
                        </div>
                      </div>
                    )}

                    {/* NDE Date */}
                    <div className="grid gap-2">
                      <Label htmlFor="edit-nde-date" className="text-sm font-medium">
                        NDE Date {(hasExistingNDE || ndeType || ndeResult) && <span className="text-red-600">*</span>}
                      </Label>
                      <Input
                        id="edit-nde-date"
                        type="date"
                        value={ndeDate}
                        onChange={(e) => setNdeDate(e.target.value)}
                        max={getTodayLocal()}
                        aria-label="NDE date"
                      />
                    </div>

                    {/* Notes */}
                    <div className="grid gap-2">
                      <Label htmlFor="edit-nde-notes" className="text-sm font-medium">
                        Notes
                      </Label>
                      <Textarea
                        id="edit-nde-notes"
                        value={ndeNotes}
                        onChange={(e) => setNdeNotes(e.target.value)}
                        placeholder="Additional inspection notes..."
                        rows={3}
                        className="resize-none"
                      />
                    </div>

                    {/* Clear NDE Button */}
                    {hasExistingNDE && (
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleClearNDEClick}
                          disabled={isPending || clearNDEMutation.isPending || hasRepairWeld}
                          className="text-xs border-red-300 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
                        >
                          {clearNDEMutation.isPending ? 'Clearing...' : 'Clear NDE'}
                        </Button>
                        {hasRepairWeld && (
                          <span className="text-xs text-red-600 flex items-center gap-1">
                            <ShieldAlert className="h-3 w-3" />
                            Blocked: repair weld exists
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>

            {/* Footer - hide when FAIL confirmation is showing */}
            {!showFailConfirmation && (
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending || !hasChanges || !selectedWelderId || !dateWelded}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            )}
          </form>
        </DialogContent>
      </Dialog>

      {/* Clear Welder Assignment Confirmation */}
      {showClearWelderConfirm && user && (
        <RollbackConfirmationModal
          isOpen={showClearWelderConfirm}
          onClose={() => setShowClearWelderConfirm(false)}
          onConfirm={(reasonData) => {
            clearWelderMutation.mutate({
              field_weld_id: weld.id,
              user_id: user.id,
              metadata: {
                rollback_reason: reasonData.reason,
                rollback_reason_label: reasonData.reasonLabel,
                rollback_details: reasonData.details,
              },
            }, {
              onSuccess: () => {
                setShowClearWelderConfirm(false)
                onOpenChange(false)
              },
              onError: () => {
                setShowClearWelderConfirm(false)
              },
            })
          }}
          componentName={weld.identityDisplay}
          milestoneName="Welder Assignment"
        />
      )}

      {/* Clear NDE Confirmation */}
      {showClearNDEConfirm && user && (
        <RollbackConfirmationModal
          isOpen={showClearNDEConfirm}
          onClose={() => setShowClearNDEConfirm(false)}
          onConfirm={(reasonData) => {
            clearNDEMutation.mutate({
              field_weld_id: weld.id,
              user_id: user.id,
              metadata: {
                rollback_reason: reasonData.reason,
                rollback_reason_label: reasonData.reasonLabel,
                rollback_details: reasonData.details,
              },
            }, {
              onSuccess: () => {
                setShowClearNDEConfirm(false)
                onOpenChange(false)
              },
              onError: () => {
                setShowClearNDEConfirm(false)
              },
            })
          }}
          componentName={weld.identityDisplay}
          milestoneName="NDE Result"
        />
      )}
    </>
  )
}
