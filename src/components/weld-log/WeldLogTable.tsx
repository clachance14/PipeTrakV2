/**
 * WeldLogTable Component (Feature 014 - T071)
 * Flat table displaying all field welds with sorting and inline actions
 */

import { useState } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  formatWeldType,
  formatWeldSize,
  formatNDEType,
  getNDEResultColor,
  getStatusBadgeColor,
} from '@/lib/field-weld-utils'
import type { EnrichedFieldWeld } from '@/hooks/useFieldWelds'
import { useMobileDetection } from '@/hooks/useMobileDetection'

interface WeldLogTableProps {
  welds: EnrichedFieldWeld[]
  onAssignWelder?: (weldId: string) => void
  onRecordNDE?: (weldId: string) => void
  userRole?: string
  isMobile?: boolean
  onRowClick?: (weld: EnrichedFieldWeld) => void
}

type SortColumn =
  | 'weld_id'
  | 'drawing'
  | 'welder'
  | 'date_welded'
  | 'weld_type'
  | 'size'
  | 'nde_result'
  | 'status'
  | 'progress'

type SortDirection = 'asc' | 'desc'

export function WeldLogTable({ welds, onAssignWelder, onRecordNDE, userRole, isMobile: isMobileProp, onRowClick }: WeldLogTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('date_welded')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const isMobileDetected = useMobileDetection()
  const isMobile = isMobileProp !== undefined ? isMobileProp : isMobileDetected

  const canAssignWelder = userRole && ['owner', 'admin', 'project_manager', 'foreman'].includes(userRole)
  const canRecordNDE = userRole && ['owner', 'admin', 'qc_inspector'].includes(userRole)

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const sortedWelds = (() => {
    // Special handling for date_welded: exclude null dates from sort
    if (sortColumn === 'date_welded') {
      const weldsWithDates = welds.filter(w => w.date_welded !== null)
      const weldsWithoutDates = welds.filter(w => w.date_welded === null)

      // Sort only welds with dates
      const sorted = [...weldsWithDates].sort((a, b) => {
        const multiplier = sortDirection === 'asc' ? 1 : -1
        const dateA = a.date_welded!
        const dateB = b.date_welded!
        return multiplier * dateA.localeCompare(dateB)
      })

      // Append welds without dates at the end
      return [...sorted, ...weldsWithoutDates]
    }

    // Standard sorting for all other columns
    return [...welds].sort((a, b) => {
      const multiplier = sortDirection === 'asc' ? 1 : -1

      switch (sortColumn) {
        case 'weld_id':
          return multiplier * a.identityDisplay.localeCompare(b.identityDisplay)
        case 'drawing':
          return multiplier * a.drawing.drawing_no_norm.localeCompare(b.drawing.drawing_no_norm)
        case 'welder':
          const welderA = a.welder?.stencil || 'zzz'
          const welderB = b.welder?.stencil || 'zzz'
          return multiplier * welderA.localeCompare(welderB)
        case 'weld_type':
          return multiplier * a.weld_type.localeCompare(b.weld_type)
        case 'size':
          const sizeA = a.weld_size || 'zzz'
          const sizeB = b.weld_size || 'zzz'
          return multiplier * sizeA.localeCompare(sizeB)
        case 'nde_result':
          const ndeA = a.nde_result || 'zzz'
          const ndeB = b.nde_result || 'zzz'
          return multiplier * ndeA.localeCompare(ndeB)
        case 'status':
          return multiplier * a.status.localeCompare(b.status)
        case 'progress':
          return multiplier * (a.component.percent_complete - b.component.percent_complete)
        default:
          return 0
      }
    })
  })()

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
            {!isMobile && <SortableHeader column="status">Status</SortableHeader>}
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
            const showRecordNDE = canRecordNDE && weld.status === 'active' && weld.welder_id

            return (
              <tr
                key={weld.id}
                className={`hover:bg-slate-50 ${isMobile ? 'min-h-[44px]' : ''} ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={onRowClick ? () => onRowClick(weld) : undefined}
              >
                {/* Weld ID */}
                <td className={`px-3 py-2 text-sm font-medium text-slate-900 ${isMobile ? 'truncate max-w-0' : 'whitespace-nowrap'}`}>
                  {weld.identityDisplay}
                  {weld.is_repair && (
                    <span className="ml-1 text-xs text-orange-600">
                      {isMobile ? '(R)' : `(Repair of ${weld.identityDisplay.split('.')[0]})`}
                    </span>
                  )}
                </td>

                {/* Drawing (clickable link) */}
                <td className={`px-3 py-2 text-sm text-slate-900 ${isMobile ? 'truncate max-w-0' : 'whitespace-nowrap'}`}>
                  <Link
                    to={`/components?drawing=${weld.drawing.id}`}
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
                    new Date(weld.date_welded).toLocaleDateString()
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
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                )}

                {/* Status */}
                {!isMobile && (
                  <td className="whitespace-nowrap px-3 py-2 text-sm">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeColor(weld.status)}`}>
                      {weld.status.charAt(0).toUpperCase() + weld.status.slice(1)}
                    </span>
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
                    <div className="flex gap-2">
                      {showAssignWelder && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onAssignWelder?.(weld.id)}
                          className="h-7 text-xs"
                        >
                          Assign Welder
                        </Button>
                      )}
                      {showRecordNDE && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onRecordNDE?.(weld.id)}
                          className="h-7 text-xs"
                        >
                          Record NDE
                        </Button>
                      )}
                      {weld.status !== 'active' && (
                        <span className="text-xs text-slate-400">No actions</span>
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
  )
}
