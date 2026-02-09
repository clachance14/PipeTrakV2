/**
 * WeldLogTable Component (Feature 014 - T071)
 * Flat table displaying all field welds with sorting and inline actions
 */

import { ArrowUpDown, ArrowUp, ArrowDown, Info, Pencil } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  formatWeldType,
  formatWeldSize,
  formatNDEType,
  getNDEResultColor,
} from '@/lib/field-weld-utils'
import type { EnrichedFieldWeld } from '@/hooks/useFieldWelds'
import { useMobileDetection } from '@/hooks/useMobileDetection'
import { useWeldLogPreferencesStore } from '@/stores/useWeldLogPreferencesStore'
import { sortFieldWelds, type SortColumn } from '@/lib/weld-log-sorting'

interface WeldLogTableProps {
  welds: EnrichedFieldWeld[]
  onAssignWelder?: (weldId: string) => void
  onEditWeld?: (weldId: string) => void
  onUpdateNDE?: (weldId: string) => void
  userRole?: string
  isMobile?: boolean
  onRowClick?: (weld: EnrichedFieldWeld) => void
}

export function WeldLogTable({ welds, onAssignWelder, onEditWeld, onUpdateNDE, userRole, isMobile: isMobileProp, onRowClick }: WeldLogTableProps) {
  const { sortColumn, sortDirection, toggleSort } = useWeldLogPreferencesStore()
  const isMobileDetected = useMobileDetection()
  const isMobile = isMobileProp !== undefined ? isMobileProp : isMobileDetected

  const canAssignWelder = userRole && ['owner', 'admin', 'project_manager', 'foreman'].includes(userRole)
  const canEditWeld = userRole && ['owner', 'admin', 'project_manager', 'foreman', 'qc_inspector'].includes(userRole)

  const handleSort = (column: SortColumn) => {
    toggleSort(column)
  }

  // Use shared sorting utility
  const sortedWelds = sortFieldWelds(welds, sortColumn, sortDirection)

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="ml-1 h-3 w-3 text-slate-400" />
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="ml-1 h-3 w-3 text-slate-700" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3 text-slate-700" />
    )
  }

  const SortableHeader = ({ column, children }: { column: SortColumn; children: React.ReactNode }) => (
    <th className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-left">
      <button
        onClick={() => handleSort(column)}
        className="flex items-center text-xs font-medium uppercase tracking-wide text-slate-700 hover:text-slate-900"
      >
        {children}
        <SortIcon column={column} />
      </button>
    </th>
  )

  if (welds.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
        <div className="text-center">
          <p className="text-sm font-medium text-slate-900">No field welds found</p>
          <p className="mt-1 text-xs text-slate-500">Try adjusting your filters</p>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="h-full overflow-auto rounded-lg border border-slate-200 bg-white">
        <table className={`w-full divide-y divide-slate-200 ${isMobile ? 'table-fixed' : ''}`}>
        <thead>
          <tr>
            <SortableHeader column="weld_id">Weld ID</SortableHeader>
            <SortableHeader column="drawing">Drawing</SortableHeader>
            {!isMobile && <SortableHeader column="welder">Welder</SortableHeader>}
            <SortableHeader column="date_welded">Date Welded</SortableHeader>
            {!isMobile && <SortableHeader column="weld_type">Type</SortableHeader>}
            {!isMobile && <SortableHeader column="size">Size</SortableHeader>}
            {!isMobile && <SortableHeader column="nde_result">NDE Result</SortableHeader>}
            {!isMobile && <SortableHeader column="progress">Progress</SortableHeader>}
            {!isMobile && (
              <th className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-700">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sortedWelds.map((weld) => {
            const showAssignWelder = canAssignWelder && weld.status === 'active' && !weld.welder_id
            const showEditWeld = !!canEditWeld

            return (
              <tr
                key={weld.id}
                className={`hover:bg-slate-50 ${isMobile ? 'min-h-[44px]' : ''} ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={onRowClick ? () => onRowClick(weld) : undefined}
              >
                {/* Weld ID */}
                <td className={`px-3 py-2 text-sm font-medium text-slate-900 ${isMobile ? 'truncate max-w-0' : 'whitespace-nowrap'}`}>
                  <div className="flex items-center gap-1">
                    <span>{weld.identityDisplay}</span>
                    {weld.is_unplanned && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="ml-0.5 inline-flex items-center justify-center rounded-full p-0.5 text-blue-500 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            aria-label="Added weld"
                          >
                            <Info className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-md w-fit bg-slate-900 text-white border-slate-700">
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-slate-300">Added Weld</p>
                            {weld.notes && <p className="text-sm break-words whitespace-normal">{weld.notes}</p>}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {weld.is_repair && (
                      <span className="ml-1 text-xs text-orange-600">
                        {isMobile ? '(R)' : `(Repair of ${weld.identityDisplay.split('.')[0]})`}
                      </span>
                    )}
                  </div>
                </td>

                {/* Drawing (clickable link) */}
                <td className={`px-3 py-2 text-sm text-slate-900 ${isMobile ? 'truncate max-w-0' : 'whitespace-nowrap'}`}>
                  <Link
                    to={`/drawings?expanded=${weld.drawing.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {weld.drawing.drawing_no_norm}
                  </Link>
                </td>

                {/* Welder */}
                {!isMobile && (
                  <td className="whitespace-nowrap px-3 py-2 text-sm text-slate-900">
                    {weld.welder ? (
                      <span>
                        {weld.welder.stencil} - {weld.welder.name}
                      </span>
                    ) : (
                      <span className="text-slate-400">Not Assigned</span>
                    )}
                  </td>
                )}

                {/* Date Welded */}
                <td className={`px-3 py-2 text-sm text-slate-900 ${isMobile ? 'truncate max-w-0' : 'whitespace-nowrap'}`}>
                  {weld.date_welded ? (
                    new Date(weld.date_welded).toLocaleDateString('en-US', { timeZone: 'UTC' })
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>

                {/* Weld Type */}
                {!isMobile && (
                  <td className="whitespace-nowrap px-3 py-2 text-sm text-slate-900">
                    {formatWeldType(weld.weld_type)}
                  </td>
                )}

                {/* Size */}
                {!isMobile && (
                  <td className="whitespace-nowrap px-3 py-2 text-sm text-slate-900">
                    {formatWeldSize(weld.weld_size)}
                  </td>
                )}

                {/* NDE Result */}
                {!isMobile && (
                  <td className="whitespace-nowrap px-3 py-2 text-sm">
                    {weld.nde_result ? (
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getNDEResultColor(weld.nde_result)}`}>
                        {weld.nde_type && `${formatNDEType(weld.nde_type)} `}
                        {weld.nde_result}
                      </span>
                    ) : canEditWeld && weld.welder_id && onUpdateNDE ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          onUpdateNDE(weld.id)
                        }}
                      >
                        Update NDE
                      </Button>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                )}

                {/* Progress */}
                {!isMobile && (
                  <td className="whitespace-nowrap px-3 py-2 text-sm text-slate-900">
                    <div className="flex items-center">
                      <div className="w-16 rounded-full bg-slate-200">
                        <div
                          className={`h-2 rounded-full ${
                            weld.status === 'rejected'
                              ? 'bg-red-500'
                              : weld.status === 'accepted'
                              ? 'bg-green-500'
                              : 'bg-blue-500'
                          }`}
                          style={{ width: `${weld.component.percent_complete}%` }}
                        />
                      </div>
                      <span className="ml-2 text-xs font-medium">{weld.component.percent_complete}%</span>
                    </div>
                  </td>
                )}

                {/* Actions */}
                {!isMobile && (
                  <td className="whitespace-nowrap px-3 py-2 text-sm">
                    <div className="flex gap-2 items-center">
                      {showAssignWelder && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onAssignWelder?.(weld.id)}
                          className="h-7 text-xs"
                        >
                          Update Weld
                        </Button>
                      )}
                      {showEditWeld && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => onEditWeld?.(weld.id)}
                              className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700"
                              aria-label="Edit weld"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Edit Weld</TooltipContent>
                        </Tooltip>
                      )}
                      {!showAssignWelder && !showEditWeld && (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
        </table>
      </div>
    </TooltipProvider>
  )
}
