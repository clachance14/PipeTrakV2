/**
 * Component: CreateUnplannedWeldDialog
 *
 * Feature: 028-add-unplanned-welds
 * Date: 2025-11-17
 *
 * Dialog for creating individual unplanned field welds with auto-generated weld numbers,
 * required field validation, and mobile-optimized UI (≥44px touch targets).
 */

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import { useCreateUnplannedWeld } from '@/hooks/useCreateUnplannedWeld'
import { findNextWeldNumber } from '@/lib/weld-numbering'
import { toast } from 'sonner'

interface CreateUnplannedWeldDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
}

export function CreateUnplannedWeldDialog({
  open,
  onOpenChange,
  projectId,
}: CreateUnplannedWeldDialogProps) {
  const [weldNumber, setWeldNumber] = useState('')
  const [drawingId, setDrawingId] = useState('')
  const [weldType, setWeldType] = useState<'BW' | 'SW' | 'FW' | 'TW' | ''>('')
  const [weldSize, setWeldSize] = useState('')
  const [spec, setSpec] = useState('')
  const [schedule, setSchedule] = useState('')
  const [baseMetal, setBaseMetal] = useState('')
  const [notes, setNotes] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const createMutation = useCreateUnplannedWeld()

  // Fetch drawings for the project
  const { data: drawings = [] } = useQuery({
    queryKey: ['drawings', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drawings')
        .select('*')
        .eq('project_id', projectId)

      if (error) throw error
      return data
    },
    enabled: open && !!projectId,
  })

  // Auto-generate next weld number when dialog opens
  useEffect(() => {
    if (open && projectId) {
      // Clear previous value to avoid submitting with a stale weld number
      setWeldNumber('')
      void generateWeldNumber()
    }
  }, [open, projectId])

  const generateWeldNumber = async () => {
    try {
      // Fetch all existing weld numbers for smart numbering
      const { data } = await supabase
        .from('components')
        .select('identity_key')
        .eq('project_id', projectId)
        .eq('component_type', 'field_weld')

      // Extract weld numbers from identity keys
      const existingWeldIds: string[] = []
      if (data) {
        for (const component of data) {
          if (component?.identity_key) {
            const identityKey = component.identity_key as Record<string, unknown>
            const weldNumber = identityKey.weld_number
            if (typeof weldNumber === 'string') {
              existingWeldIds.push(weldNumber)
            }
          }
        }
      }

      // Use smart numbering to find next available weld number
      const nextWeldNumber = findNextWeldNumber(existingWeldIds)
      setWeldNumber(nextWeldNumber)
    } catch (error) {
      console.error('Failed to generate weld number:', error)
      // Fallback to default pattern on error
      setWeldNumber('W-001')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')

    if (!drawingId || !weldType || !weldSize || !spec) {
      setErrorMessage('Please fill in all required fields')
      return
    }

    try {
      await createMutation.mutateAsync({
        projectId,
        drawingId,
        weldNumber,
        weldType,
        weldSize,
        spec,
        schedule: schedule || undefined,
        baseMetal: baseMetal || undefined,
        notes: notes || undefined,
      })

      toast.success('Weld created successfully')
      onOpenChange(false)
      resetForm()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create weld'
      setErrorMessage(message)
      toast.error(message)
    }
  }

  const resetForm = () => {
    setDrawingId('')
    setWeldType('')
    setWeldSize('')
    setSpec('')
    setSchedule('')
    setBaseMetal('')
    setNotes('')
    setErrorMessage('')
  }

  const isFormValid = !!(weldNumber && drawingId && weldType && weldSize && spec)
  const isLoading = createMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full">
        <DialogHeader>
          <DialogTitle>Create Unplanned Weld</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Weld Number (Read-only) */}
          <div className="space-y-2">
            <Label htmlFor="weld-number">Weld Number</Label>
            <Input
              id="weld-number"
              value={weldNumber}
              readOnly
              className="min-h-[44px] bg-gray-50"
            />
          </div>

          {/* Drawing (Required) */}
          <div className="space-y-2">
            <Label htmlFor="drawing">
              Drawing <span className="text-red-500">*</span>
            </Label>
            <Select value={drawingId} onValueChange={setDrawingId}>
              <SelectTrigger id="drawing" className="min-h-[44px]">
                <SelectValue placeholder="Select drawing" />
              </SelectTrigger>
              <SelectContent>
                {drawings.map((drawing) => (
                  <SelectItem key={drawing.id} value={drawing.id}>
                    {drawing.drawing_no_norm}
                    {drawing.title && ` - ${drawing.title}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Weld Type (Required) */}
          <div className="space-y-2">
            <Label htmlFor="weld-type">
              Weld Type <span className="text-red-500">*</span>
            </Label>
            <Select value={weldType} onValueChange={(value) => setWeldType(value as 'BW' | 'SW' | 'FW' | 'TW')}>
              <SelectTrigger id="weld-type" className="min-h-[44px]">
                <SelectValue placeholder="Select weld type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BW">BW (Butt Weld)</SelectItem>
                <SelectItem value="SW">SW (Socket Weld)</SelectItem>
                <SelectItem value="FW">FW (Fillet Weld)</SelectItem>
                <SelectItem value="TW">TW (Tack Weld)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Weld Size (Required) */}
          <div className="space-y-2">
            <Label htmlFor="weld-size">
              Weld Size <span className="text-red-500">*</span>
            </Label>
            <Input
              id="weld-size"
              value={weldSize}
              onChange={(e) => setWeldSize(e.target.value)}
              placeholder='e.g., 2", 1/2"'
              className="min-h-[44px]"
            />
          </div>

          {/* Spec (Required) */}
          <div className="space-y-2">
            <Label htmlFor="spec">
              Spec <span className="text-red-500">*</span>
            </Label>
            <Input
              id="spec"
              value={spec}
              onChange={(e) => setSpec(e.target.value)}
              placeholder="e.g., HC05"
              className="min-h-[44px]"
            />
          </div>

          {/* Schedule (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="schedule">Schedule</Label>
            <Input
              id="schedule"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              placeholder="e.g., XS, STD"
              className="min-h-[44px]"
            />
          </div>

          {/* Base Metal (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="base-metal">Base Metal</Label>
            <Input
              id="base-metal"
              value={baseMetal}
              onChange={(e) => setBaseMetal(e.target.value)}
              placeholder="e.g., CS, SS"
              className="min-h-[44px]"
            />
          </div>

          {/* Notes (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional: Document why this weld was created (e.g., field change, client request)"
              rows={3}
              className="min-h-[44px] resize-none"
            />
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
              {errorMessage}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false)
                resetForm()
              }}
              className="min-h-[44px] min-w-[44px]"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isFormValid || isLoading}
              className="min-h-[44px] min-w-[44px]"
            >
              {isLoading ? 'Creating...' : 'Create Weld'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
