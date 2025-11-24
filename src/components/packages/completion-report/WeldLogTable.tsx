/**
 * WeldLogTable Component (Package Completion Report)
 * Feature 030: Test Package Workflow - Read-only weld log display
 *
 * Displays field welds with NDE data for a drawing in the completion report.
 * Simplified version without actions/editing - focused on reporting.
 */

import type { WeldLogEntry } from '@/types/packageReport';

interface WeldLogTableProps {
  welds: WeldLogEntry[];
}

/**
 * Format NDE result with appropriate styling
 */
function getNDEResultClasses(result: string | null): string {
  if (!result) return '';

  switch (result.toUpperCase()) {
    case 'PASS':
      return 'bg-green-100 text-green-800';
    case 'FAIL':
      return 'bg-red-100 text-red-800';
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-slate-100 text-slate-800';
  }
}

/**
 * Format date from ISO string to MM/DD/YYYY
 */
function formatDate(dateString: string | null): string {
  if (!dateString) return '-';

  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { timeZone: 'UTC' });
}

export function WeldLogTable({ welds }: WeldLogTableProps) {
  if (welds.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
        <div className="text-center">
          <p className="text-sm font-medium text-slate-900">No welds found</p>
          <p className="mt-1 text-xs text-slate-500">
            No welds have been created for this drawing yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full divide-y divide-slate-200">
        <thead>
          <tr>
            <th className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-700">
              Weld Number
            </th>
            <th className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-700">
              Welder
            </th>
            <th className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-700">
              Date Welded
            </th>
            <th className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-700">
              NDE Type
            </th>
            <th className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-700">
              NDE Result
            </th>
            <th className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-700">
              NDE Date
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {welds.map((weld) => (
            <tr key={weld.id} className="hover:bg-slate-50">
              {/* Weld Number */}
              <td className="whitespace-nowrap px-3 py-2 text-sm font-medium text-slate-900">
                {weld.weld_display_name}
              </td>

              {/* Welder */}
              <td className="whitespace-nowrap px-3 py-2 text-sm text-slate-900">
                {weld.welder_name || (
                  <span className="text-slate-400">Not Assigned</span>
                )}
              </td>

              {/* Date Welded */}
              <td className="whitespace-nowrap px-3 py-2 text-sm text-slate-900">
                {formatDate(weld.date_welded)}
              </td>

              {/* NDE Type */}
              <td className="whitespace-nowrap px-3 py-2 text-sm text-slate-900">
                {weld.nde_type || <span className="text-slate-400">-</span>}
              </td>

              {/* NDE Result */}
              <td className="whitespace-nowrap px-3 py-2 text-sm">
                {weld.nde_result ? (
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getNDEResultClasses(weld.nde_result)}`}
                  >
                    {weld.nde_result}
                  </span>
                ) : (
                  <span className="text-slate-400">-</span>
                )}
              </td>

              {/* NDE Date */}
              <td className="whitespace-nowrap px-3 py-2 text-sm text-slate-900">
                {formatDate(weld.nde_date)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
