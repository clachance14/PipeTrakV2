/**
 * EditWeldDialog Component
 * Unified dialog for editing weld specifications, welder details, and NDE details
 * Also supports retiring (soft-deleting) a weld
 */

import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useWelders } from '@/hooks/useWelders'
import { useUpdateWelderAssignment } from '@/hooks/useUpdateWelderAssignment'
import { useClearWelderAssignment } from '@/hooks/useClearWelderAssignment'
import { useRecordNDE } from '@/hooks/useRecordNDE'
import { useUpdateNDE } from '@/hooks/useUpdateNDE'
import { useClearNDE } from '@/hooks/useClearNDE'
import { useUpdateWeldSpecs } from '@/hooks/useUpdateWeldSpecs'
import { useReassignWeldDrawing } from '@/hooks/useReassignWeldDrawing'
import { useRetireFieldWeld } from '@/hooks/useRetireFieldWeld'
import { useHasRepairWeld } from '@/hooks/useHasRepairWeld'
import { useDrawings } from '@/hooks/useDrawings'
import { useAuth } from '@/contexts/AuthContext'
import { canDeleteFieldWeld } from '@/lib/permissions'
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
import { AlertTriangle, ShieldAlert, Trash2, Info } from 'lucide-react'
import { RollbackConfirmationModal } from '../drawing-table/RollbackConfirmationModal'
import type { EnrichedFieldWeld } from '@/hooks/useFieldWelds'
import type { Role } from '@/lib/permissions'

interface EditWeldDialogProps {
  weld: EnrichedFieldWeld
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called when NDE result is set to FAIL (to open CreateRepairWeldDialog) */
  onRepairWeldNeeded?: () => void
  /** Called after weld is retired (for parent cleanup) */
  onWeldRetired?: () => void
  /** Which section to scroll to when dialog opens */
  initialSection?: 'specs' | 'nde'
}

type NDEResult = 'PASS' | 'FAIL' | 'PENDING'
type NDEType = 'RT' | 'UT' | 'PT' | 'MT' | 'VT'

const WELD_TYPES = [
  { value: 'BW', label: 'BW (Butt Weld)' },
  { value: 'SW', label: 'SW (Socket Weld)' },
  { value: 'FW', label: 'FW (Fillet Weld)' },
  { value: 'TW', label: 'TW (Tack Weld)' },
]

const NDE_TYPES = [
  { value: 'RT', label: 'RT (X-ray)' },
  { value: 'UT', label: 'UT (Ultrasonic)' },
  { value: 'PT', label: 'PT (Penetrant)' },
  { value: 'MT', label: 'MT (Magnetic)' },
  { value: 'VT', label: 'VT (Visual)' },
]

const retireReasonSchema = z.object({
  retire_reason: z
    .string()
    .min(10, 'Delete reason must be at least 10 characters')
    .trim(),
})

type RetireReasonFormData = z.infer<typeof retireReasonSchema>

const getTodayLocal = () => new Date().toLocaleDateString('en-CA')

export function EditWeldDialog({
  weld,
  projectId,
  open,
  onOpenChange,
  onRepairWeldNeeded,
  onWeldRetired,
  initialSection,
}: EditWeldDialogProps) {
  const { user } = useAuth()

  // Drawing reassignment state
  const [selectedDrawingId, setSelectedDrawingId] = useState<string>('')

  // Weld spec form state
  const [weldType, setWeldType] = useState<string>('')
  const [weldSize, setWeldSize] = useState<string>('')
  const [schedule, setSchedule] = useState<string>('')
  const [baseMetal, setBaseMetal] = useState<string>('')
  const [spec, setSpec] = useState<string>('')

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
  const [showRetireConfirm, setShowRetireConfirm] = useState(false)

  const prevOpenRef = useRef(false)
  const ndeSectionRef = useRef<HTMLElement>(null)

  // Hooks
  const { data: welders, isLoading: isLoadingWelders } = useWelders({ projectId })
  const { data: drawings } = useDrawings(projectId, { is_retired: false })
  const updateWelderMutation = useUpdateWelderAssignment()
  const clearWelderMutation = useClearWelderAssignment()
  const recordNDEMutation = useRecordNDE()
  const updateNDEMutation = useUpdateNDE()
  const clearNDEMutation = useClearNDE()
  const updateSpecsMutation = useUpdateWeldSpecs()
  const reassignDrawingMutation = useReassignWeldDrawing()
  const retireMutation = useRetireFieldWeld()
  const { data: hasRepairWeld = false } = useHasRepairWeld(weld.id)

  // Retire form
  const retireForm = useForm<RetireReasonFormData>({
    resolver: zodResolver(retireReasonSchema),
    defaultValues: { retire_reason: '' },
  })

  // Derived state
  const hasExistingNDE = !!weld.nde_result
  const hasWelder = !!weld.welder_id
  const canRetire = user?.role && canDeleteFieldWeld(user.role as Role)

  // Initialize form when dialog opens
  useEffect(() => {
    const justOpened = open && !prevOpenRef.current
    prevOpenRef.current = open

    if (justOpened) {
      // Drawing reassignment
      setSelectedDrawingId(weld.drawing.id)

      // Weld spec fields
      setWeldType(weld.weld_type || '')
      setWeldSize(weld.weld_size || '')
      setSchedule(weld.schedule || '')
      setBaseMetal(weld.base_metal || '')
      setSpec(weld.spec || '')

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
      setShowRetireConfirm(false)
      retireForm.reset({ retire_reason: '' })

      // Scroll to NDE section if requested (delay for DOM render)
      if (initialSection === 'nde') {
        setTimeout(() => {
          ndeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 100)
      }
    }
  }, [open, weld, retireForm, initialSection])

  const sortedWelders = welders
    ? [...welders].sort((a, b) => a.stencil.localeCompare(b.stencil))
    : undefined

  // Sorted drawings for dropdown
  const sortedDrawings = drawings
    ? [...drawings].sort((a, b) => a.drawing_no_norm.localeCompare(b.drawing_no_norm))
    : undefined

  // Detect what changed
  const drawingChanged = selectedDrawingId !== weld.drawing.id
  const specsChanged = weldType !== (weld.weld_type || '') ||
    weldSize !== (weld.weld_size || '') ||
    schedule !== (weld.schedule || '') ||
    baseMetal !== (weld.base_metal || '') ||
    spec !== (weld.spec || '')
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

  const handleRetireClick = () => {
    if (hasRepairWeld) {
      toast.error('Cannot delete weld', {
        description: 'Repair welds exist for this weld. Delete repairs first.',
      })
      return
    }
    setShowRetireConfirm(true)
  }

  const handleRetireSubmit = async (data: RetireReasonFormData) => {
    if (!user?.id) {
      toast.error('User not authenticated')
      return
    }

    try {
      await retireMutation.mutateAsync({
        field_weld_id: weld.id,
        retire_reason: data.retire_reason,
        user_id: user.id,
      })
      setShowRetireConfirm(false)
      onOpenChange(false)
      onWeldRetired?.()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete weld'
      toast.error('Error deleting weld', { description: errorMessage })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user?.id) {
      toast.error('User not authenticated')
      return
    }

    // Validate welder fields (only when welder section is visible)
    if (hasWelder) {
      if (!selectedWelderId) {
        toast.error('Please select a welder')
        return
      }
      if (!dateWelded) {
        toast.error('Please select a date welded')
        return
      }
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
      // 0. Reassign drawing if changed (must happen before spec changes)
      if (drawingChanged) {
        await reassignDrawingMutation.mutateAsync({
          field_weld_id: weld.id,
          new_drawing_id: selectedDrawingId,
          user_id: user.id,
        })
      }

      // 1. Save spec changes if needed
      if (specsChanged) {
        await updateSpecsMutation.mutateAsync({
          field_weld_id: weld.id,
          weld_type: weldType,
          weld_size: weldSize || null,
          schedule: schedule || null,
          base_metal: baseMetal || null,
          spec: spec || null,
          user_id: user.id,
        })
      }

      // 2. Save welder changes if needed
      if (welderChanged) {
        await updateWelderMutation.mutateAsync({
          field_weld_id: weld.id,
          welder_id: selectedWelderId,
          date_welded: dateWelded,
          user_id: user.id,
        })
      }

      // 3. Save NDE changes if needed
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

      // Show generic success if nothing changed (individual hooks show their own toasts)
      if (!ndeIsNew && !ndeChanged && !welderChanged && !specsChanged && !drawingChanged) {
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
    updateNDEMutation.isPending ||
    updateSpecsMutation.isPending ||
    reassignDrawingMutation.isPending

  const hasChanges = drawingChanged || welderChanged || ndeChanged || ndeIsNew || specsChanged

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
              {hasWelder
                ? `Update weld specifications, welder details, and NDE results for ${weld.identityDisplay}`
                : `Update weld specifications for ${weld.identityDisplay}`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-6 py-4">
              {/* === WELD SPECIFICATIONS SECTION === */}
              <section>
                <h3 className="text-sm font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-1">
                  Weld Specifications
                </h3>
                <div className="space-y-3">
                  {/* Drawing */}
                  <div className="grid gap-2">
                    <Label htmlFor="edit-drawing" className="text-sm font-medium">
                      Drawing
                    </Label>
                    {hasWelder ? (
                      <p className="text-sm text-slate-700 py-1.5">
                        {weld.drawing.drawing_no_norm}
                      </p>
                    ) : (
                      <Select value={selectedDrawingId} onValueChange={setSelectedDrawingId}>
                        <SelectTrigger id="edit-drawing" aria-label="Select drawing">
                          <SelectValue placeholder="Select drawing" />
                        </SelectTrigger>
                        <SelectContent>
                          {sortedDrawings && sortedDrawings.length > 0 ? (
                            sortedDrawings.map((drawing) => (
                              <SelectItem key={drawing.id} value={drawing.id}>
                                {drawing.drawing_no_norm}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>
                              No drawings available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Weld Type */}
                  <div className="grid gap-2">
                    <Label htmlFor="edit-weld-type" className="text-sm font-medium">
                      Weld Type <span className="text-red-600">*</span>
                    </Label>
                    <Select value={weldType} onValueChange={setWeldType}>
                      <SelectTrigger id="edit-weld-type" aria-label="Select weld type">
                        <SelectValue placeholder="Select weld type" />
                      </SelectTrigger>
                      <SelectContent>
                        {WELD_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {weldType !== (weld.weld_type || '') && (
                      <div className="rounded-md border border-blue-200 bg-blue-50 p-2 flex gap-2">
                        <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-800">
                          Changing weld type affects welder summary report grouping.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Weld Size */}
                  <div className="grid gap-2">
                    <Label htmlFor="edit-weld-size" className="text-sm font-medium">
                      Weld Size
                    </Label>
                    <Input
                      id="edit-weld-size"
                      type="text"
                      value={weldSize}
                      onChange={(e) => setWeldSize(e.target.value)}
                      placeholder='e.g., 4"'
                      aria-label="Weld size"
                    />
                  </div>

                  {/* Schedule */}
                  <div className="grid gap-2">
                    <Label htmlFor="edit-schedule" className="text-sm font-medium">
                      Schedule
                    </Label>
                    <Input
                      id="edit-schedule"
                      type="text"
                      value={schedule}
                      onChange={(e) => setSchedule(e.target.value)}
                      placeholder="e.g., 40"
                      aria-label="Schedule"
                    />
                  </div>

                  {/* Base Metal */}
                  <div className="grid gap-2">
                    <Label htmlFor="edit-base-metal" className="text-sm font-medium">
                      Base Metal
                    </Label>
                    <Input
                      id="edit-base-metal"
                      type="text"
                      value={baseMetal}
                      onChange={(e) => setBaseMetal(e.target.value)}
                      placeholder="e.g., CS"
                      aria-label="Base metal"
                    />
                  </div>

                  {/* Spec */}
                  <div className="grid gap-2">
                    <Label htmlFor="edit-spec" className="text-sm font-medium">
                      Spec
                    </Label>
                    <Input
                      id="edit-spec"
                      type="text"
                      value={spec}
                      onChange={(e) => setSpec(e.target.value)}
                      placeholder="e.g., A106-B"
                      aria-label="Spec"
                    />
                  </div>
                </div>
              </section>

              {/* === WELDER DETAILS SECTION (only for welds with welder assigned) === */}
              {hasWelder && (
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
              )}

              {/* === NDE DETAILS SECTION === */}
              {hasWelder && (
                <section ref={ndeSectionRef}>
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
              <DialogFooter className="gap-2 sm:gap-0 flex-row justify-between sm:justify-between">
                {/* Left: Retire button */}
                <div>
                  {canRetire && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRetireClick}
                      disabled={isPending || retireMutation.isPending}
                      className="text-xs border-red-300 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      {retireMutation.isPending ? 'Deleting...' : 'Delete Weld'}
                    </Button>
                  )}
                </div>

                {/* Right: Cancel + Save */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isPending || !hasChanges || (hasWelder && (!selectedWelderId || !dateWelded))}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </DialogFooter>
            )}
          </form>
        </DialogContent>
      </Dialog>

      {/* Retire Confirmation Dialog */}
      {showRetireConfirm && (
        <Dialog open={showRetireConfirm} onOpenChange={setShowRetireConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Weld</DialogTitle>
              <DialogDescription>
                Delete weld <strong>{weld.identityDisplay}</strong>. This will hide the weld from
                the weld log. The weld and all related records are preserved and can be recovered.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={retireForm.handleSubmit(handleRetireSubmit)} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="retire_reason">
                  Delete Reason <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="retire_reason"
                  placeholder="e.g., Duplicate weld created during import"
                  {...retireForm.register('retire_reason')}
                  disabled={retireMutation.isPending}
                />
                {retireForm.formState.errors.retire_reason && (
                  <p className="text-sm text-destructive">{retireForm.formState.errors.retire_reason.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Minimum 10 characters required
                </p>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRetireConfirm(false)}
                  disabled={retireMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={retireMutation.isPending}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {retireMutation.isPending ? 'Deleting...' : 'Delete Weld'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

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
