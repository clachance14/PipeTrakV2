/**
 * Welder Summary Report Table (Tier-Grouped Format)
 * Matches the Excel report format with 5%BW, 10%BW, 100%BW tier columns
 */

import type { WelderSummaryReport } from '@/types/weldSummary';

interface WelderSummaryReportTableProps {
  reportData: WelderSummaryReport;
  projectName: string;
  onExport?: (format: 'pdf' | 'excel' | 'csv') => void;
}

export function WelderSummaryReportTable({
  reportData,
  projectName,
  onExport,
}: WelderSummaryReportTableProps) {
  const { rows, totals, generatedAt } = reportData;

  // Format date as MM/DD/YYYY
  const formattedDate = generatedAt.toLocaleDateString('en-US');

  // Format percentage with 2 decimals
  const formatPercent = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return `${value.toFixed(2)}%`;
  };

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="bg-white p-4 rounded-lg border border-slate-200">
        <h1 className="text-xl font-bold text-center text-slate-900 mb-1">
          {projectName} WELD LOG SUMMARY
        </h1>
        <p className="text-center text-sm text-slate-600">{formattedDate}</p>
      </div>

      {/* Export Buttons */}
      {onExport && (
        <div className="flex justify-end gap-2">
          <button
            onClick={() => onExport('excel')}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700"
          >
            Export Excel
          </button>
          <button
            onClick={() => onExport('pdf')}
            className="px-4 py-2 text-sm font-medium text-white bg-slate-700 rounded hover:bg-slate-800"
          >
            Export PDF
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-lg border border-slate-200">
        <table className="w-full text-sm border-collapse">
          {/* Header Row */}
          <thead>
            {/* Main column groups */}
            <tr className="bg-slate-700 text-white">
              <th className="border border-slate-600 px-3 py-2 text-left" rowSpan={2}>
                WELDERS<br />NAME
              </th>
              <th className="border border-slate-600 px-3 py-2 text-center" rowSpan={2}>
                STEN.<br />ID
              </th>
              {/* 5%BW Group */}
              <th className="border border-slate-600 px-3 py-2 text-center" colSpan={3}>
                5%BW
              </th>
              {/* 10%BW Group */}
              <th className="border border-slate-600 px-3 py-2 text-center" colSpan={3}>
                10%BW
              </th>
              {/* 100%BW Group */}
              <th className="border border-slate-600 px-3 py-2 text-center" colSpan={3}>
                100%BW
              </th>
              {/* Overall Totals Group */}
              <th className="border border-slate-600 px-3 py-2 text-center" colSpan={3}>
                OVERALL TOTALS
              </th>
              {/* Rejection Rate */}
              <th className="border border-slate-600 px-3 py-2 text-center bg-red-600" rowSpan={2}>
                REJ./WELDER
              </th>
            </tr>
            {/* Sub-headers */}
            <tr className="bg-slate-700 text-white text-xs">
              {/* 5%BW sub-columns */}
              <th className="border border-slate-600 px-2 py-1 text-center">WELDS</th>
              <th className="border border-slate-600 px-2 py-1 text-center">X-RAY</th>
              <th className="border border-slate-600 px-2 py-1 text-center bg-red-600">REJ.</th>
              {/* 10%BW sub-columns */}
              <th className="border border-slate-600 px-2 py-1 text-center">WELDS</th>
              <th className="border border-slate-600 px-2 py-1 text-center">X-RAY</th>
              <th className="border border-slate-600 px-2 py-1 text-center bg-red-600">REJ.</th>
              {/* 100%BW sub-columns */}
              <th className="border border-slate-600 px-2 py-1 text-center">WELDS</th>
              <th className="border border-slate-600 px-2 py-1 text-center">X-RAY</th>
              <th className="border border-slate-600 px-2 py-1 text-center bg-red-600">REJ.</th>
              {/* Overall Totals sub-columns */}
              <th className="border border-slate-600 px-2 py-1 text-center">WELDS</th>
              <th className="border border-slate-600 px-2 py-1 text-center">X-RAY</th>
              <th className="border border-slate-600 px-2 py-1 text-center bg-red-600">REJ.</th>
            </tr>
          </thead>

          {/* Data Rows */}
          <tbody>
            {rows.map((row) => (
              <tr key={row.welder_id} className="hover:bg-slate-50">
                {/* Welder Info */}
                <td className="border border-slate-200 px-3 py-2 text-left font-medium text-blue-600">
                  {row.welder_name}
                </td>
                <td className="border border-slate-200 px-3 py-2 text-center font-medium">
                  {row.welder_stencil}
                </td>

                {/* 5% Tier */}
                <td className="border border-slate-200 px-3 py-2 text-center">
                  {row.welds_5pct || ''}
                </td>
                <td className="border border-slate-200 px-3 py-2 text-center">
                  {row.nde_5pct || ''}
                </td>
                <td className="border border-slate-200 px-3 py-2 text-center bg-red-50">
                  {row.reject_5pct || ''}
                </td>

                {/* 10% Tier */}
                <td className="border border-slate-200 px-3 py-2 text-center">
                  {row.welds_10pct || ''}
                </td>
                <td className="border border-slate-200 px-3 py-2 text-center">
                  {row.nde_10pct || ''}
                </td>
                <td className="border border-slate-200 px-3 py-2 text-center bg-red-50">
                  {row.reject_10pct || ''}
                </td>

                {/* 100% Tier */}
                <td className="border border-slate-200 px-3 py-2 text-center">
                  {row.welds_100pct || ''}
                </td>
                <td className="border border-slate-200 px-3 py-2 text-center">
                  {row.nde_100pct || ''}
                </td>
                <td className="border border-slate-200 px-3 py-2 text-center bg-red-50">
                  {row.reject_100pct || ''}
                </td>

                {/* Overall Totals */}
                <td className="border border-slate-200 px-3 py-2 text-center font-semibold">
                  {row.welds_total}
                </td>
                <td className="border border-slate-200 px-3 py-2 text-center font-semibold">
                  {row.nde_total}
                </td>
                <td className="border border-slate-200 px-3 py-2 text-center font-semibold bg-red-50">
                  {row.reject_total || ''}
                </td>

                {/* Rejection Rate */}
                <td className="border border-slate-200 px-3 py-2 text-center bg-yellow-200 font-semibold">
                  {formatPercent(row.reject_rate)}
                </td>
              </tr>
            ))}

            {/* TOTALS Row */}
            <tr className="bg-slate-100 font-bold">
              <td className="border border-slate-300 px-3 py-2 text-left" colSpan={2}>
                TOTALS
              </td>

              {/* 5% Tier Totals */}
              <td className="border border-slate-300 px-3 py-2 text-center">
                {totals.welds_5pct}
              </td>
              <td className="border border-slate-300 px-3 py-2 text-center">
                {totals.nde_5pct}
              </td>
              <td className="border border-slate-300 px-3 py-2 text-center bg-red-100">
                {totals.reject_5pct}
              </td>

              {/* 10% Tier Totals */}
              <td className="border border-slate-300 px-3 py-2 text-center">
                {totals.welds_10pct}
              </td>
              <td className="border border-slate-300 px-3 py-2 text-center">
                {totals.nde_10pct}
              </td>
              <td className="border border-slate-300 px-3 py-2 text-center bg-red-100">
                {totals.reject_10pct}
              </td>

              {/* 100% Tier Totals */}
              <td className="border border-slate-300 px-3 py-2 text-center">
                {totals.welds_100pct}
              </td>
              <td className="border border-slate-300 px-3 py-2 text-center">
                {totals.nde_100pct}
              </td>
              <td className="border border-slate-300 px-3 py-2 text-center bg-red-100">
                {totals.reject_100pct}
              </td>

              {/* Overall Totals */}
              <td className="border border-slate-300 px-3 py-2 text-center">
                {totals.welds_total}
              </td>
              <td className="border border-slate-300 px-3 py-2 text-center">
                {totals.nde_total}
              </td>
              <td className="border border-slate-300 px-3 py-2 text-center bg-red-100">
                {totals.reject_total}
              </td>

              {/* Overall Rejection Rate */}
              <td className="border border-slate-300 px-3 py-2 text-center bg-yellow-300">
                {formatPercent(totals.reject_rate)}
              </td>
            </tr>

            {/* Rejection Rate per Tier Row */}
            <tr className="bg-yellow-100">
              <td className="border border-slate-300 px-3 py-2 text-center font-medium" colSpan={2}></td>
              <td className="border border-slate-300 px-3 py-2 text-center" colSpan={3}>
                <span className="text-xs font-medium">Reject</span>{' '}
                <span className="font-bold">
                  {totals.welds_5pct > 0
                    ? formatPercent((totals.reject_5pct / totals.welds_5pct) * 100)
                    : '0.00%'}
                </span>
              </td>
              <td className="border border-slate-300 px-3 py-2 text-center" colSpan={3}>
                <span className="text-xs font-medium">Reject</span>{' '}
                <span className="font-bold">
                  {totals.welds_10pct > 0
                    ? formatPercent((totals.reject_10pct / totals.welds_10pct) * 100)
                    : '0.00%'}
                </span>
              </td>
              <td className="border border-slate-300 px-3 py-2 text-center" colSpan={3}>
                <span className="text-xs font-medium">Reject</span>{' '}
                <span className="font-bold">
                  {totals.welds_100pct > 0
                    ? formatPercent((totals.reject_100pct / totals.welds_100pct) * 100)
                    : '0.00%'}
                </span>
              </td>
              <td className="border border-slate-300 px-3 py-2 text-center" colSpan={3}>
                <span className="text-xs font-medium">Reject</span>{' '}
                <span className="font-bold">{formatPercent(totals.reject_rate)}</span>
              </td>
              <td className="border border-slate-300"></td>
            </tr>

            {/* NDE Completion % per Tier Row */}
            <tr className="bg-slate-700 text-white">
              <td className="border border-slate-600 px-3 py-2 text-center" colSpan={2}></td>
              <td className="border border-slate-600 px-3 py-2 text-center text-xs" colSpan={3}>
                <span className="font-medium">NDE Comp %</span>{' '}
                <span className="font-bold">{formatPercent(totals.nde_comp_5pct)}</span>
              </td>
              <td className="border border-slate-600 px-3 py-2 text-center text-xs" colSpan={3}>
                <span className="font-medium">NDE Comp %</span>{' '}
                <span className="font-bold">{formatPercent(totals.nde_comp_10pct)}</span>
              </td>
              <td className="border border-slate-600 px-3 py-2 text-center text-xs" colSpan={3}>
                <span className="font-medium">NDE Comp %</span>{' '}
                <span className="font-bold">{formatPercent(totals.nde_comp_100pct)}</span>
              </td>
              <td className="border border-slate-600" colSpan={4}></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
