import { useState, useEffect } from 'react'
import { useCreateRepairWeld } from '@/hooks/useCreateRepairWeld'
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

interface CreateRepairWeldDialogProps {
  originalFieldWeldId: string
  originalWeldData?: {
    weldType: string
    weldSize: string
    schedule: string
    baseMetal: string
    spec: string
    drawingId: string
    projectId: string
  }
  open: boolean
  onOpenChange: (open: boolean) => void
}

const WELD_TYPES = ['BW', 'SW', 'FW', 'TW']

export function CreateRepairWeldDialog({
  originalFieldWeldId,
  originalWeldData,
  open,
  onOpenChange,
}: CreateRepairWeldDialogProps) {
  const [weldType, setWeldType] = useState<string>('')
  const [weldSize, setWeldSize] = useState<string>('')
  const [schedule, setSchedule] = useState<string>('')
  const [baseMetal, setBaseMetal] = useState<string>('')
  const [spec, setSpec] = useState<string>('')

  const createRepairMutation = useCreateRepairWeld()

  // Pre-fill form with original weld data when dialog opens
  useEffect(() => {
    if (open && originalWeldData) {
      setWeldType(originalWeldData.weldType || '')
      setWeldSize(originalWeldData.weldSize || '')
      setSchedule(originalWeldData.schedule || '')
      setBaseMetal(originalWeldData.baseMetal || '')
      setSpec(originalWeldData.spec || '')
    } else if (!open) {
      // Reset form when dialog closes
      setWeldType('')
      setWeldSize('')
      setSchedule('')
      setBaseMetal('')
      setSpec('')
    }
  }, [open, originalWeldData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!originalWeldData) {
      toast.error('Error', {
        description: 'Original weld data not available',
      })
      return
    }

    if (!weldType) {
      toast.error('Validation error', {
        description: 'Please select a weld type',
      })
      return
    }

    try {
      await createRepairMutation.mutateAsync({
        original_field_weld_id: originalFieldWeldId,
        drawing_id: originalWeldData.drawingId,
        weld_specs: {
          weld_type: weldType as 'BW' | 'SW' | 'FW' | 'TW',
          weld_size: weldSize.trim() || undefined,
          schedule: schedule.trim() || undefined,
          base_metal: baseMetal.trim() || undefined,
          spec: spec.trim() || undefined,
        },
      })

      toast.success('Repair weld created successfully', {
        description: 'New weld started at 30% (Fit-up complete)',
      })

      onOpenChange(false)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create repair weld'
      toast.error('Error creating repair weld', {
        description: errorMessage,
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Create Repair Weld</DialogTitle>
          <DialogDescription>
            Create a new weld to replace the rejected weld. Specifications are pre-filled
            but can be edited if needed.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Original Weld Info */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <h4 className="text-sm font-medium text-slate-900">
                Repair for Field Weld - Rejected
              </h4>
            </div>

            {/* Weld Type */}
            <div className="grid gap-2">
              <Label htmlFor="weld-type" className="text-sm font-medium">
                Weld Type <span className="text-red-600">*</span>
              </Label>
              <Select value={weldType} onValueChange={setWeldType}>
                <SelectTrigger id="weld-type" aria-label="Select weld type">
                  <SelectValue placeholder="Select weld type" />
                </SelectTrigger>
                <SelectContent>
                  {WELD_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Weld Size */}
            <div className="grid gap-2">
              <Label htmlFor="weld-size" className="text-sm font-medium">
                Weld Size
              </Label>
              <Input
                id="weld-size"
                type="text"
                value={weldSize}
                onChange={(e) => setWeldSize(e.target.value)}
                placeholder='e.g., 2", 1/2"'
              />
            </div>

            {/* Schedule */}
            <div className="grid gap-2">
              <Label htmlFor="schedule" className="text-sm font-medium">
                Schedule
              </Label>
              <Input
                id="schedule"
                type="text"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                placeholder="e.g., XS, STD"
              />
            </div>

            {/* Base Metal */}
            <div className="grid gap-2">
              <Label htmlFor="base-metal" className="text-sm font-medium">
                Base Metal
              </Label>
              <Input
                id="base-metal"
                type="text"
                value={baseMetal}
                onChange={(e) => setBaseMetal(e.target.value)}
                placeholder="e.g., CS, SS"
              />
            </div>

            {/* Spec */}
            <div className="grid gap-2">
              <Label htmlFor="spec" className="text-sm font-medium">
                Spec
              </Label>
              <Input
                id="spec"
                type="text"
                value={spec}
                onChange={(e) => setSpec(e.target.value)}
                placeholder="e.g., HC05"
              />
            </div>

            {/* Info Panel */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 flex gap-2">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                ℹ️ Repair weld will auto-start at{' '}
                <span className="font-medium">30%</span> (Fit-up milestone complete)
              </p>
            </div>
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
              disabled={createRepairMutation.isPending || !weldType}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {createRepairMutation.isPending ? 'Creating...' : 'Create Repair Weld'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
