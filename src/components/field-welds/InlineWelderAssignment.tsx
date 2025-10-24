import { useState } from 'react'
import { useWelders } from '@/hooks/useWelders'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export interface InlineWelderAssignmentProps {
  projectId: string
  onConfirm: (welderId: string, dateWelded: string) => void
  onCancel: () => void
}

/**
 * Inline Welder Assignment Component
 *
 * Displays inline UI for assigning a welder when "Weld Complete" milestone is checked.
 * Shows welder dropdown, read-only date display (today), and confirm/cancel buttons.
 *
 * Design decisions (from brainstorming):
 * - Date is auto-filled with today and locked (no backdating)
 * - Cancel is blocked (user must complete or explicitly cancel)
 * - Requires welder selection before confirm
 */
export function InlineWelderAssignment({
  projectId,
  onConfirm,
  onCancel,
}: InlineWelderAssignmentProps) {
  const [selectedWelderId, setSelectedWelderId] = useState<string>('')
  const dateWelded = new Date().toISOString().split('T')[0]! // Today's date, locked (non-null assertion safe here)

  const { data: welders, isLoading: isLoadingWelders } = useWelders({ projectId })

  // Sort welders by stencil
  const sortedWelders = welders?.sort((a, b) =>
    a.stencil.localeCompare(b.stencil)
  )

  const handleConfirm = () => {
    if (!selectedWelderId) {
      toast.error('Validation error', {
        description: 'Please select a welder before confirming',
      })
      return
    }

    onConfirm(selectedWelderId, dateWelded)
  }

  const handleCancel = () => {
    onCancel()
  }

  return (
    <div className="flex items-center gap-3 py-2 px-4 bg-blue-50 border border-blue-200 rounded">
      {/* Welder Dropdown */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-slate-700 whitespace-nowrap">
          Welder:
        </label>
        <Select
          value={selectedWelderId}
          onValueChange={setSelectedWelderId}
          disabled={isLoadingWelders}
        >
          <SelectTrigger
            className="w-64 bg-white"
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
                    <span
                      className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        welder.status === 'verified'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {welder.status === 'verified' ? 'Verified' : 'Unverified'}
                    </span>
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

      {/* Date Display (Read-only) */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-slate-700 whitespace-nowrap">
          Date Welded:
        </label>
        <span className="text-sm text-slate-900 font-medium">
          {new Date(dateWelded).toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
          })}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 ml-auto">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCancel}
          className="bg-white hover:bg-slate-100"
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleConfirm}
          disabled={!selectedWelderId}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Confirm
        </Button>
      </div>
    </div>
  )
}
