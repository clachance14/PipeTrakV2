import { useRepairHistory } from '@/hooks/useRepairHistory'
import { formatWeldType, formatNDEType } from '@/lib/field-weld-utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ArrowDown, MapPin, Wrench, CheckCircle2, XCircle } from 'lucide-react'

interface RepairHistoryDialogProps {
  fieldWeldId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RepairHistoryDialog({
  fieldWeldId,
  open,
  onOpenChange,
}: RepairHistoryDialogProps) {
  const { data: repairChain, isLoading, error } = useRepairHistory(fieldWeldId)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            🟢 Accepted
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            🔴 Rejected
          </span>
        )
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            🟢 Active
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            🟡 Pending
          </span>
        )
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Repair History</DialogTitle>
          <DialogDescription>
            Complete repair chain showing all attempts for this weld
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="py-8 text-center text-sm text-slate-500">
            Loading repair history...
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-800">
              Error loading repair history: {error.message}
            </p>
          </div>
        )}

        {repairChain && (
          <div className="space-y-4 py-4">
            {/* Original Weld */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-blue-600 flex-shrink-0 mt-1" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-900">
                      📍 Original Weld
                    </h4>
                    {getStatusBadge(repairChain.original.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm text-slate-700">
                    <div>
                      <span className="font-medium">Type:</span>{' '}
                      {formatWeldType(repairChain.original.weld_type)}{' '}
                      {repairChain.original.weld_size || ''}
                      {repairChain.original.schedule ? ` ${repairChain.original.schedule}` : ''}
                    </div>
                    {repairChain.original.spec && (
                      <div>
                        <span className="font-medium">Spec:</span> {repairChain.original.spec}
                      </div>
                    )}
                  </div>

                  {repairChain.original.welder_stencil && (
                    <div className="text-sm text-slate-700">
                      <span className="font-medium">Welder:</span>{' '}
                      {repairChain.original.welder_stencil} - {repairChain.original.welder_name}
                    </div>
                  )}

                  {repairChain.original.date_welded && (
                    <div className="text-sm text-slate-700">
                      <span className="font-medium">Date Welded:</span>{' '}
                      {formatDate(repairChain.original.date_welded)}
                    </div>
                  )}

                  {repairChain.original.nde_result && (
                    <div className="text-sm text-slate-700">
                      <span className="font-medium">NDE:</span>{' '}
                      {formatNDEType(repairChain.original.nde_type || '')}{' '}
                      <span
                        className={
                          repairChain.original.nde_result === 'PASS'
                            ? 'text-green-700 font-semibold'
                            : 'text-red-700 font-semibold'
                        }
                      >
                        {repairChain.original.nde_result}
                      </span>
                      {repairChain.original.nde_notes && ` - ${repairChain.original.nde_notes}`}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Repairs */}
            {repairChain.repairs.map((repair, index) => (
              <div key={repair.id}>
                {/* Arrow separator */}
                <div className="flex justify-center py-2">
                  <ArrowDown className="h-5 w-5 text-slate-400" />
                </div>

                {/* Repair Weld */}
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <Wrench className="h-5 w-5 text-orange-600 flex-shrink-0 mt-1" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-slate-900">
                          🔧 Repair {index + 1}
                        </h4>
                        {getStatusBadge(repair.status)}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm text-slate-700">
                        <div>
                          <span className="font-medium">Type:</span>{' '}
                          {formatWeldType(repair.weld_type)} {repair.weld_size || ''}
                          {repair.schedule ? ` ${repair.schedule}` : ''}
                        </div>
                        {repair.spec && (
                          <div>
                            <span className="font-medium">Spec:</span> {repair.spec}
                          </div>
                        )}
                      </div>

                      {repair.welder_stencil && (
                        <div className="text-sm text-slate-700">
                          <span className="font-medium">Welder:</span> {repair.welder_stencil} -{' '}
                          {repair.welder_name}
                        </div>
                      )}

                      {repair.date_welded && (
                        <div className="text-sm text-slate-700">
                          <span className="font-medium">Date Welded:</span>{' '}
                          {formatDate(repair.date_welded)}
                        </div>
                      )}

                      {repair.nde_result && (
                        <div className="text-sm text-slate-700">
                          <span className="font-medium">NDE:</span>{' '}
                          {formatNDEType(repair.nde_type || '')}{' '}
                          <span
                            className={
                              repair.nde_result === 'PASS'
                                ? 'text-green-700 font-semibold'
                                : 'text-red-700 font-semibold'
                            }
                          >
                            {repair.nde_result}
                          </span>
                          {repair.nde_notes && ` - ${repair.nde_notes}`}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Summary Footer */}
            <div className="rounded-lg border border-slate-200 bg-white p-4 mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    Total Attempts: {repairChain.totalAttempts}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-900">Final Status:</span>
                  {repairChain.finalStatus === 'accepted' ? (
                    <span className="inline-flex items-center gap-1 text-green-700 font-semibold">
                      <CheckCircle2 className="h-4 w-4" />✅ Accepted
                    </span>
                  ) : repairChain.finalStatus === 'rejected' ? (
                    <span className="inline-flex items-center gap-1 text-red-700 font-semibold">
                      <XCircle className="h-4 w-4" />
                      🔴 Rejected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-blue-700 font-semibold">
                      Active
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
