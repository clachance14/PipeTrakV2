/**
 * WeldDetailModal Component (Feature 022 - T009, T013)
 * Modal displaying complete weld information for mobile users
 * Includes action buttons for NDE recording and welder assignment
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { formatWeldType, formatNDEType } from '@/lib/field-weld-utils'
import type { EnrichedFieldWeld } from '@/hooks/useFieldWelds'

interface WeldDetailModalProps {
  weld: EnrichedFieldWeld
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdateWeld: () => void
  onEditWelder?: () => void
  onRecordNDE: () => void
}

export function WeldDetailModal({ weld, open, onOpenChange, onUpdateWeld, onEditWelder, onRecordNDE }: WeldDetailModalProps) {
  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString()
  }

  // Helper to display value or "-" for null/undefined
  const displayValue = (value: string | null | undefined) => {
    return value || '-'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
        <div className="flex-shrink-0 p-6 pb-4 pr-12">
          <DialogHeader>
            <DialogTitle>Weld Details: {weld.identityDisplay}</DialogTitle>
            <DialogDescription>
              Complete information for this weld including specifications, NDE results, and status
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6 space-y-6">
          {/* Identification Section */}
          <section aria-labelledby="identification-heading">
            <h2 id="identification-heading" className="text-sm font-semibold text-slate-900 mb-3">Identification</h2>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm text-slate-600">Weld ID</dt>
                <dd className="text-sm font-medium text-slate-900">{weld.identityDisplay}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-slate-600">Drawing Number</dt>
                <dd className="text-sm font-medium text-slate-900">{weld.drawing?.drawing_no_norm || '-'}</dd>
              </div>
            </dl>
          </section>

          {/* Specifications Section */}
          <section aria-labelledby="specifications-heading">
            <h2 id="specifications-heading" className="text-sm font-semibold text-slate-900 mb-3">Specifications</h2>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm text-slate-600">Type</dt>
                <dd className="text-sm font-medium text-slate-900">{formatWeldType(weld.weld_type)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-slate-600">Size</dt>
                <dd className="text-sm font-medium text-slate-900">{displayValue(weld.weld_size)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-slate-600">Schedule</dt>
                <dd className="text-sm font-medium text-slate-900">{displayValue(weld.schedule)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-slate-600">Base Metal</dt>
                <dd className="text-sm font-medium text-slate-900">{displayValue(weld.base_metal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-slate-600">Spec</dt>
                <dd className="text-sm font-medium text-slate-900">{displayValue(weld.spec)}</dd>
              </div>
            </dl>
          </section>

          {/* Welder Information Section */}
          <section aria-labelledby="welder-information-heading">
            <h2 id="welder-information-heading" className="text-sm font-semibold text-slate-900 mb-3">Welder Information</h2>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm text-slate-600">Welder</dt>
                <dd className="text-sm font-medium text-slate-900">
                  {weld.welder ? `${weld.welder.stencil} - ${weld.welder.name}` : 'Not Assigned'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-slate-600">Date Welded</dt>
                <dd className="text-sm font-medium text-slate-900">{formatDate(weld.date_welded)}</dd>
              </div>
            </dl>
          </section>

          {/* NDE Results Section */}
          <section aria-labelledby="nde-results-heading">
            <h2 id="nde-results-heading" className="text-sm font-semibold text-slate-900 mb-3">NDE Results</h2>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm text-slate-600">NDE Required</dt>
                <dd className="text-sm font-medium text-slate-900">{weld.nde_required ? 'Yes' : 'No'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-slate-600">NDE Type</dt>
                <dd className="text-sm font-medium text-slate-900">
                  {weld.nde_type ? formatNDEType(weld.nde_type) : '-'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-slate-600">NDE Result</dt>
                <dd className="text-sm font-medium text-slate-900">{displayValue(weld.nde_result)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-slate-600">NDE Date</dt>
                <dd className="text-sm font-medium text-slate-900">{formatDate(weld.nde_date)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-slate-600">NDE Notes</dt>
                <dd className="text-sm font-medium text-slate-900">{displayValue(weld.nde_notes)}</dd>
              </div>
            </dl>
          </section>

          {/* Metadata Section */}
          <section aria-labelledby="metadata-heading">
            <h2 id="metadata-heading" className="text-sm font-semibold text-slate-900 mb-3">Metadata</h2>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm text-slate-600">Area</dt>
                <dd className="text-sm font-medium text-slate-900">
                  {weld.area ? weld.area.name : '-'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-slate-600">System</dt>
                <dd className="text-sm font-medium text-slate-900">
                  {weld.system ? weld.system.name : '-'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-slate-600">Test Package</dt>
                <dd className="text-sm font-medium text-slate-900">
                  {weld.test_package ? weld.test_package.name : '-'}
                </dd>
              </div>
            </dl>
          </section>

          {/* Status Section */}
          <section aria-labelledby="status-heading">
            <h2 id="status-heading" className="text-sm font-semibold text-slate-900 mb-3">Status</h2>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm text-slate-600">Status</dt>
                <dd className="text-sm font-medium text-slate-900">
                  {weld.status.charAt(0).toUpperCase() + weld.status.slice(1)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-slate-600">Progress</dt>
                <dd className="text-sm font-medium text-slate-900">{weld.component.percent_complete}%</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-slate-600">Is Repair</dt>
                <dd className="text-sm font-medium text-slate-900">{weld.is_repair ? 'Yes' : 'No'}</dd>
              </div>
            </dl>
          </section>
        </div>

        {/* Fixed Footer with Action Buttons */}
        <div className="flex-shrink-0 p-6 pt-4 border-t border-slate-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
              {/* Conditional Button Logic:
                  - If weld not made (no welder_id): Show "Update Weld" button
                  - If weld made but no NDE result: Show "Record NDE" button
                  - If NDE recorded: Show NO action buttons
              */}
              {!weld.welder_id && (
                <button
                  onClick={onUpdateWeld}
                  className="min-h-[44px] px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                  aria-label="Update weld milestones"
                >
                  Update Weld
                </button>
              )}

              {weld.welder_id && onEditWelder && (
                <button
                  onClick={onEditWelder}
                  className="min-h-[44px] px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  aria-label="Edit weld details"
                >
                  Edit Weld
                </button>
              )}

              {weld.welder_id && !weld.nde_result && (
                <button
                  onClick={onRecordNDE}
                  className="min-h-[44px] px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Record NDE result"
                >
                  Record NDE
                </button>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={() => onOpenChange(false)}
              className="min-h-[44px] px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
              aria-label="Close dialog"
            >
              Close
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
