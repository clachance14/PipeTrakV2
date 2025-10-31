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

interface WeldLogTableProps {
  welds: EnrichedFieldWeld[]
  onAssignWelder?: (weldId: string) => void
  onRecordNDE?: (weldId: string) => void
  userRole?: string
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

export function WeldLogTable({ welds, onAssignWelder, onRecordNDE, userRole }: WeldLogTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('date_welded')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

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

  const sortedWelds = [...welds].sort((a, b) => {
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
      case 'date_welded':
        const dateA = a.date_welded || '9999-12-31'
        const dateB = b.date_welded || '9999-12-31'
        return multiplier * dateA.localeCompare(dateB)
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
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full divide-y divide-slate-200">
        <thead>
          <tr>
            <SortableHeader column="weld_id">Weld ID</SortableHeader>
            <SortableHeader column="drawing">Drawing</SortableHeader>
            <SortableHeader column="welder">Welder</SortableHeader>
            <SortableHeader column="date_welded">Date Welded</SortableHeader>
            <SortableHeader column="weld_type">Type</SortableHeader>
            <SortableHeader column="size">Size</SortableHeader>
            <SortableHeader column="nde_result">NDE Result</SortableHeader>
            <SortableHeader column="status">Status</SortableHeader>
            <SortableHeader column="progress">Progress</SortableHeader>
            <th className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-700">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sortedWelds.map((weld) => {
            const showAssignWelder = canAssignWelder && weld.status === 'active' && !weld.welder_id
            const showRecordNDE = canRecordNDE && weld.status === 'active' && weld.welder_id

            return (
              <tr key={weld.id} className="hover:bg-slate-50">
                {/* Weld ID */}
                <td className="whitespace-nowrap px-3 py-2 text-sm font-medium text-slate-900">
                  {weld.identityDisplay}
                  {weld.is_repair && (() => {
                    // Extract original weld number from repair number
                    // e.g., "W-008.1" -> "W-008"
                    const originalWeldNumber = weld.identityDisplay.split('.')[0]
                    return (
                      <span className="ml-1 text-xs text-orange-600">
                        (Repair of {originalWeldNumber})
                      </span>
                    )
                  })()}
                </td>

                {/* Drawing (clickable link) */}
                <td className="whitespace-nowrap px-3 py-2 text-sm text-slate-900">
                  <Link
                    to={`/components?drawing=${weld.drawing.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {weld.drawing.drawing_no_norm}
                  </Link>
                </td>

                {/* Welder */}
                <td className="whitespace-nowrap px-3 py-2 text-sm text-slate-900">
                  {weld.welder ? (
                    <span>
                      {weld.welder.stencil} - {weld.welder.name}
                    </span>
                  ) : (
                    <span className="text-slate-400">Not Assigned</span>
                  )}
                </td>

                {/* Date Welded */}
                <td className="whitespace-nowrap px-3 py-2 text-sm text-slate-900">
                  {weld.date_welded ? (
                    new Date(weld.date_welded).toLocaleDateString()
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>

                {/* Weld Type */}
                <td className="whitespace-nowrap px-3 py-2 text-sm text-slate-900">
                  {formatWeldType(weld.weld_type)}
                </td>

                {/* Size */}
                <td className="whitespace-nowrap px-3 py-2 text-sm text-slate-900">
                  {formatWeldSize(weld.weld_size)}
                </td>

                {/* NDE Result */}
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

                {/* Status */}
                <td className="whitespace-nowrap px-3 py-2 text-sm">
                  <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeColor(weld.status)}`}>
                    {weld.status.charAt(0).toUpperCase() + weld.status.slice(1)}
                  </span>
                </td>

                {/* Progress */}
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

                {/* Actions */}
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
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
