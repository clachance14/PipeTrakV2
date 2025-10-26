import { useState, useEffect } from 'react'
import { useRecordNDE } from '@/hooks/useRecordNDE'
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
import { AlertTriangle } from 'lucide-react'

interface NDEResultDialogProps {
  fieldWeldId: string
  componentId: string
  welderName?: string
  dateWelded?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onFailure?: () => void
}

const NDE_TYPES = [
  { value: 'RT', label: 'RT (Radiographic)' },
  { value: 'UT', label: 'UT (Ultrasonic)' },
  { value: 'PT', label: 'PT (Penetrant)' },
  { value: 'MT', label: 'MT (Magnetic)' },
]

type NDEResult = 'PASS' | 'FAIL' | 'PENDING'

export function NDEResultDialog({
  fieldWeldId,
  componentId,
  welderName,
  dateWelded,
  open,
  onOpenChange,
  onFailure,
}: NDEResultDialogProps) {
  const [ndeType, setNdeType] = useState<string>('')
  const [ndeResult, setNdeResult] = useState<NDEResult | ''>('')
  const [ndeDate, setNdeDate] = useState<string>(
    new Date().toISOString().split('T')[0]!
  )
  const [ndeNotes, setNdeNotes] = useState<string>('')

  const recordNDEMutation = useRecordNDE()

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setNdeType('')
      setNdeResult('')
      setNdeDate(new Date().toISOString().split('T')[0]!)
      setNdeNotes('')
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!ndeType) {
      toast.error('Validation error', {
        description: 'Please select an NDE type',
      })
      return
    }

    if (!ndeResult) {
      toast.error('Validation error', {
        description: 'Please select an NDE result',
      })
      return
    }

    if (!ndeDate) {
      toast.error('Validation error', {
        description: 'Please select a date',
      })
      return
    }

    try {
      await recordNDEMutation.mutateAsync({
        field_weld_id: fieldWeldId,
        nde_type: ndeType as 'RT' | 'UT' | 'PT' | 'MT',
        nde_result: ndeResult as 'PASS' | 'FAIL' | 'PENDING',
        nde_date: ndeDate,
        nde_notes: ndeNotes.trim() || undefined,
      })

      if (ndeResult === 'PASS') {
        toast.success('NDE result recorded - Weld Accepted', {
          description: 'Progress updated to 100% (Accepted)',
        })
      } else if (ndeResult === 'FAIL') {
        toast.warning('NDE result recorded - Weld Rejected', {
          description: 'Weld marked as rejected. Create a repair weld to continue.',
        })
        // Call onFailure callback to open repair dialog
        if (onFailure) {
          onFailure()
        }
      } else {
        toast.info('NDE result recorded', {
          description: 'Result marked as pending',
        })
      }

      onOpenChange(false)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to record NDE result'
      toast.error('Error recording NDE', {
        description: errorMessage,
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Record NDE Result</DialogTitle>
          <DialogDescription>
            Record the non-destructive examination results for this weld.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Context Display */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <h4 className="text-sm font-medium text-slate-900 mb-2">Weld Context</h4>
              <div className="space-y-1 text-sm text-slate-600">
                <p>
                  <span className="font-medium">Component ID:</span> {componentId}
                </p>
                {welderName && (
                  <p>
                    <span className="font-medium">Welder:</span> {welderName}
                  </p>
                )}
                {dateWelded && (
                  <p>
                    <span className="font-medium">Date Welded:</span> {dateWelded}
                  </p>
                )}
              </div>
            </div>

            {/* NDE Type */}
            <div className="grid gap-2">
              <Label htmlFor="nde-type" className="text-sm font-medium">
                NDE Type <span className="text-red-600">*</span>
              </Label>
              <Select value={ndeType} onValueChange={setNdeType}>
                <SelectTrigger id="nde-type" aria-label="Select NDE type">
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
                NDE Result <span className="text-red-600">*</span>
              </Label>
              <RadioGroup
                value={ndeResult}
                onValueChange={(value) => setNdeResult(value as NDEResult)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="PASS" id="pass" />
                  <Label htmlFor="pass" className="font-normal cursor-pointer">
                    PASS ◉
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="FAIL" id="fail" />
                  <Label htmlFor="fail" className="font-normal cursor-pointer">
                    FAIL ○
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="PENDING" id="pending" />
                  <Label htmlFor="pending" className="font-normal cursor-pointer">
                    PENDING ○
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Warning Box - Only show when FAIL is selected */}
            {ndeResult === 'FAIL' && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-red-900 mb-2">
                      ⚠️ WARNING: Weld Rejection
                    </h4>
                    <div className="text-sm text-red-800 space-y-1">
                      <p>Selecting FAIL will:</p>
                      <ul className="list-disc list-inside ml-2 space-y-0.5">
                        <li>Mark this weld as REJECTED</li>
                        <li>Set progress to 100% (complete but rejected)</li>
                        <li>Prompt you to create a repair weld</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* NDE Date */}
            <div className="grid gap-2">
              <Label htmlFor="nde-date" className="text-sm font-medium">
                NDE Date <span className="text-red-600">*</span>
              </Label>
              <Input
                id="nde-date"
                type="date"
                value={ndeDate}
                onChange={(e) => setNdeDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                required
                aria-label="NDE date"
              />
            </div>

            {/* Notes */}
            <div className="grid gap-2">
              <Label htmlFor="nde-notes" className="text-sm font-medium">
                Notes (Optional)
              </Label>
              <Textarea
                id="nde-notes"
                value={ndeNotes}
                onChange={(e) => setNdeNotes(e.target.value)}
                placeholder="Additional inspection notes..."
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-900"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={recordNDEMutation.isPending || !ndeType || !ndeResult || !ndeDate}
              className={
                ndeResult === 'FAIL'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }
            >
              {recordNDEMutation.isPending ? 'Recording...' : 'Record NDE Result'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
