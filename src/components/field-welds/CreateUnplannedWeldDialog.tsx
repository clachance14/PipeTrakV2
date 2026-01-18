/**
 * Component: CreateUnplannedWeldDialog
 *
 * Feature: 028-add-unplanned-welds
 * Updated: 2026-01-12
 *
 * Dialog for creating individual unplanned field welds with auto-generated weld numbers,
 * smart auto-populate based on selected drawing, and mobile-optimized UI (≥44px touch targets).
 *
 * Smart dropdown behavior:
 * - When drawing is selected, queries existing welds on that drawing
 * - If a field has exactly 1 unique value, auto-populates (if field is empty)
 * - If multiple values exist, shows them as dropdown suggestions
 * - Falls back to all project values if drawing has no welds
 * - User can always type custom values
 */

import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { SearchableCombobox } from '@/components/component-metadata/SearchableCombobox'
import { supabase } from '@/lib/supabase'
import { useCreateUnplannedWeld } from '@/hooks/useCreateUnplannedWeld'
import { useDistinctWeldAttributes } from '@/hooks/useDistinctWeldAttributes'
import { useWeldAttributesByDrawing } from '@/hooks/useWeldAttributesByDrawing'
import { findNextWeldNumber } from '@/lib/weld-numbering'
import { toast } from 'sonner'
import type { MetadataOption } from '@/types/metadata'

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

  // Track which fields user has manually edited (to prevent auto-populate overwriting)
  const [userEditedFields, setUserEditedFields] = useState<Set<string>>(new Set())

  // Popover open states for each field
  const [weldSizeOpen, setWeldSizeOpen] = useState(false)
  const [specOpen, setSpecOpen] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [baseMetalOpen, setBaseMetalOpen] = useState(false)

  const createMutation = useCreateUnplannedWeld()

  // Fetch weld attributes for the selected drawing
  const { data: drawingAttrs } = useWeldAttributesByDrawing(drawingId || null)

  // Fetch project-wide weld attributes (fallback when drawing has no welds)
  const { data: projectAttrs } = useDistinctWeldAttributes(projectId)

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

  // Transform drawings into MetadataOption format for SearchableCombobox
  const drawingOptions: MetadataOption[] = useMemo(() => {
    return drawings.map((drawing) => ({
      value: drawing.id,
      label: `${drawing.drawing_no_norm}${drawing.title ? ` - ${drawing.title}` : ''}`,
      type: 'existing' as const,
    }))
  }, [drawings])

  // Auto-generate next weld number when dialog opens
  useEffect(() => {
    if (open && projectId) {
      // Clear previous value to avoid submitting with a stale weld number
      setWeldNumber('')
      void generateWeldNumber()
    }
  }, [open, projectId])

  // Auto-populate fields when drawing changes (only if field is empty and not user-edited)
  useEffect(() => {
    if (!drawingId || !drawingAttrs) return

    // Auto-populate if drawing has exactly 1 value and field is empty and not user-edited
    const firstWeldSize = drawingAttrs.weldSizes[0]
    const firstSpec = drawingAttrs.specs[0]
    const firstSchedule = drawingAttrs.schedules[0]
    const firstBaseMetal = drawingAttrs.baseMetals[0]

    if (drawingAttrs.weldSizes.length === 1 && firstWeldSize && !weldSize && !userEditedFields.has('weldSize')) {
      setWeldSize(firstWeldSize)
    }
    if (drawingAttrs.specs.length === 1 && firstSpec && !spec && !userEditedFields.has('spec')) {
      setSpec(firstSpec)
    }
    if (drawingAttrs.schedules.length === 1 && firstSchedule && !schedule && !userEditedFields.has('schedule')) {
      setSchedule(firstSchedule)
    }
    if (drawingAttrs.baseMetals.length === 1 && firstBaseMetal && !baseMetal && !userEditedFields.has('baseMetal')) {
      setBaseMetal(firstBaseMetal)
    }
  }, [drawingId, drawingAttrs, weldSize, spec, schedule, baseMetal, userEditedFields])

  // Reset user edits tracking when drawing changes
  useEffect(() => {
    setUserEditedFields(new Set())
  }, [drawingId])

  // Determine dropdown options (drawing values, or fallback to project)
  const weldSizeOptions = (drawingAttrs?.weldSizes.length ?? 0) > 0
    ? drawingAttrs!.weldSizes
    : projectAttrs?.weldSizes ?? []

  const specOptions = (drawingAttrs?.specs.length ?? 0) > 0
    ? drawingAttrs!.specs
    : projectAttrs?.specs ?? []

  const scheduleOptions = (drawingAttrs?.schedules.length ?? 0) > 0
    ? drawingAttrs!.schedules
    : projectAttrs?.schedules ?? []

  const baseMetalOptions = (drawingAttrs?.baseMetals.length ?? 0) > 0
    ? drawingAttrs!.baseMetals
    : projectAttrs?.baseMetals ?? []

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

    if (!drawingId || !weldType || !weldSize || !spec || !notes.trim()) {
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
        notes,
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
    setUserEditedFields(new Set())
  }

  const isFormValid = !!(weldNumber && drawingId && weldType && weldSize && spec && notes.trim())
  const isLoading = createMutation.isPending

  // Helper to render input with suggestions popover
  const renderInputWithSuggestions = (
    id: string,
    value: string,
    onChange: (value: string) => void,
    options: string[],
    placeholder: string,
    isOpen: boolean,
    setIsOpen: (open: boolean) => void,
    fieldKey: string,
  ) => {
    const filteredOptions = options.filter(opt =>
      opt.toLowerCase().includes(value.toLowerCase())
    )

    return (
      <Popover open={isOpen && filteredOptions.length > 0} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="relative w-full">
            <Input
              id={id}
              value={value}
              onChange={(e) => {
                onChange(e.target.value)
                setUserEditedFields(prev => new Set(prev).add(fieldKey))
                setIsOpen(true)
              }}
              onFocus={() => setIsOpen(true)}
              placeholder={placeholder}
              className="min-h-[44px]"
              autoComplete="off"
            />
          </div>
        </PopoverTrigger>
        {filteredOptions.length > 0 && (
          <PopoverContent
            className="p-1 w-[var(--radix-popover-trigger-width)] !bg-white border border-slate-200 shadow-lg"
            align="start"
            sideOffset={4}
            onOpenAutoFocus={(e) => e.preventDefault()}
            onInteractOutside={() => setIsOpen(false)}
          >
            <div className="max-h-[200px] overflow-y-auto bg-white">
              {filteredOptions.map((opt) => (
                <div
                  key={opt}
                  onClick={() => {
                    onChange(opt)
                    setUserEditedFields(prev => new Set(prev).add(fieldKey))
                    setIsOpen(false)
                  }}
                  className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none bg-white hover:bg-slate-100 hover:text-slate-900"
                >
                  {opt}
                </div>
              ))}
            </div>
          </PopoverContent>
        )}
      </Popover>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Unplanned Weld</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="space-y-4 overflow-y-auto flex-1 px-1">
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
              <Label htmlFor="drawing" id="drawing-label">
                Drawing <span className="text-red-500">*</span>
              </Label>
              <SearchableCombobox
                options={drawingOptions}
                value={drawingId || null}
                onChange={(value) => setDrawingId(value || '')}
                placeholder="Select drawing..."
                emptyMessage="No drawings found"
                className="min-h-[44px]"
                aria-labelledby="drawing-label"
              />
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

            {/* Weld Size (Required) - with suggestions */}
            <div className="space-y-2">
              <Label htmlFor="weld-size">
                Weld Size <span className="text-red-500">*</span>
              </Label>
              {renderInputWithSuggestions(
                'weld-size',
                weldSize,
                setWeldSize,
                weldSizeOptions,
                'Type or select weld size...',
                weldSizeOpen,
                setWeldSizeOpen,
                'weldSize'
              )}
            </div>

            {/* Spec (Required) - with suggestions */}
            <div className="space-y-2">
              <Label htmlFor="spec">
                Spec <span className="text-red-500">*</span>
              </Label>
              {renderInputWithSuggestions(
                'spec',
                spec,
                setSpec,
                specOptions,
                'Type or select spec...',
                specOpen,
                setSpecOpen,
                'spec'
              )}
            </div>

            {/* Schedule (Optional) - with suggestions */}
            <div className="space-y-2">
              <Label htmlFor="schedule">Schedule</Label>
              {renderInputWithSuggestions(
                'schedule',
                schedule,
                setSchedule,
                scheduleOptions,
                'Type or select schedule...',
                scheduleOpen,
                setScheduleOpen,
                'schedule'
              )}
            </div>

            {/* Base Metal (Optional) - with suggestions */}
            <div className="space-y-2">
              <Label htmlFor="base-metal">Base Metal</Label>
              {renderInputWithSuggestions(
                'base-metal',
                baseMetal,
                setBaseMetal,
                baseMetalOptions,
                'Type or select base metal...',
                baseMetalOpen,
                setBaseMetalOpen,
                'baseMetal'
              )}
            </div>

            {/* Notes (Required) */}
            <div className="space-y-2">
              <Label htmlFor="notes">
                Notes <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Document why this weld was created (e.g., field change, client request)"
                rows={3}
                className="min-h-[44px] resize-none"
              />
            </div>
          </div>

          {/* Action Buttons (Fixed at bottom) */}
          <div className="flex flex-col gap-3 pt-4 border-t mt-4 bg-white">
            {/* Error Message */}
            {errorMessage && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                {errorMessage}
              </div>
            )}

            <div className="flex justify-end gap-3">
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
              className="min-h-[44px] min-w-[44px] bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? 'Creating...' : 'Create Weld'}
            </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
