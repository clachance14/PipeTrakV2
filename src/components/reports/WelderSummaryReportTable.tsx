/**
 * Welder Summary Report Table (BW & SW Sections)
 * Three-section layout: Butt Welds, Socket Welds, and Grand Total
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
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-lg border border-slate-200">
        <h1 className="text-xl font-bold text-center text-slate-900 mb-1">
          {projectName} WELD LOG SUMMARY
        </h1>
        <p className="text-center text-sm text-slate-600">{formattedDate}</p>
      </div>

      {/* Export Buttons (Desktop-only: hidden on mobile ≤1024px) */}
      {onExport && (
        <div className="hidden lg:flex justify-end gap-2">
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

      {/* SECTION 1: BUTT WELDS (BW) */}
      <div className="space-y-2">
        <h2 className="text-lg font-bold text-slate-900 bg-blue-100 px-4 py-2 rounded">
          BUTT WELDS (BW)
        </h2>
        <div className="overflow-x-auto bg-white rounded-lg border border-slate-200">
          <table className="w-full text-sm border-collapse">
            {/* BW Header Row */}
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
              </tr>
            </thead>

            {/* BW Data Rows */}
            <tbody>
              {rows.map((row) => (
                <tr key={`bw-${row.welder_id}`} className="hover:bg-slate-50">
                  {/* Welder Info */}
                  <td className="border border-slate-200 px-3 py-2 text-left font-medium text-blue-600">
                    {row.welder_name}
                  </td>
                  <td className="border border-slate-200 px-3 py-2 text-center font-medium">
                    {row.welder_stencil}
                  </td>

                  {/* BW 5% Tier */}
                  <td className="border border-slate-200 px-3 py-2 text-center">
                    {row.bw_welds_5pct || ''}
                  </td>
                  <td className="border border-slate-200 px-3 py-2 text-center">
                    {row.bw_nde_5pct || ''}
                  </td>
                  <td className="border border-slate-200 px-3 py-2 text-center bg-red-50">
                    {row.bw_reject_5pct || ''}
                  </td>

                  {/* BW 10% Tier */}
                  <td className="border border-slate-200 px-3 py-2 text-center">
                    {row.bw_welds_10pct || ''}
                  </td>
                  <td className="border border-slate-200 px-3 py-2 text-center">
                    {row.bw_nde_10pct || ''}
                  </td>
                  <td className="border border-slate-200 px-3 py-2 text-center bg-red-50">
                    {row.bw_reject_10pct || ''}
                  </td>

                  {/* BW 100% Tier */}
                  <td className="border border-slate-200 px-3 py-2 text-center">
                    {row.bw_welds_100pct || ''}
                  </td>
                  <td className="border border-slate-200 px-3 py-2 text-center">
                    {row.bw_nde_100pct || ''}
                  </td>
                  <td className="border border-slate-200 px-3 py-2 text-center bg-red-50">
                    {row.bw_reject_100pct || ''}
                  </td>

                  {/* BW Rejection Rate */}
                  <td className="border border-slate-200 px-3 py-2 text-center bg-yellow-200 font-semibold">
                    {formatPercent(row.bw_reject_rate)}
                  </td>
                </tr>
              ))}

              {/* BW TOTALS Row */}
              <tr className="bg-slate-100 font-bold">
                <td className="border border-slate-300 px-3 py-2 text-left" colSpan={2}>
                  BW TOTALS
                </td>

                {/* BW 5% Tier Totals */}
                <td className="border border-slate-300 px-3 py-2 text-center">
                  {totals.bw_welds_5pct}
                </td>
                <td className="border border-slate-300 px-3 py-2 text-center">
                  {totals.bw_nde_5pct}
                </td>
                <td className="border border-slate-300 px-3 py-2 text-center bg-red-100">
                  {totals.bw_reject_5pct}
                </td>

                {/* BW 10% Tier Totals */}
                <td className="border border-slate-300 px-3 py-2 text-center">
                  {totals.bw_welds_10pct}
                </td>
                <td className="border border-slate-300 px-3 py-2 text-center">
                  {totals.bw_nde_10pct}
                </td>
                <td className="border border-slate-300 px-3 py-2 text-center bg-red-100">
                  {totals.bw_reject_10pct}
                </td>

                {/* BW 100% Tier Totals */}
                <td className="border border-slate-300 px-3 py-2 text-center">
                  {totals.bw_welds_100pct}
                </td>
                <td className="border border-slate-300 px-3 py-2 text-center">
                  {totals.bw_nde_100pct}
                </td>
                <td className="border border-slate-300 px-3 py-2 text-center bg-red-100">
                  {totals.bw_reject_100pct}
                </td>

                {/* BW Overall Rejection Rate */}
                <td className="border border-slate-300 px-3 py-2 text-center bg-yellow-300">
                  {formatPercent(totals.bw_reject_rate)}
                </td>
              </tr>

              {/* BW Rejection Rate per Tier Row */}
              <tr className="bg-yellow-100">
                <td className="border border-slate-300 px-3 py-2 text-center font-medium" colSpan={2}></td>
                <td className="border border-slate-300 px-3 py-2 text-center" colSpan={3}>
                  <span className="text-xs font-medium">Reject</span>{' '}
                  <span className="font-bold">
                    {totals.bw_welds_5pct > 0
                      ? formatPercent((totals.bw_reject_5pct / totals.bw_welds_5pct) * 100)
                      : '0.00%'}
                  </span>
                </td>
                <td className="border border-slate-300 px-3 py-2 text-center" colSpan={3}>
                  <span className="text-xs font-medium">Reject</span>{' '}
                  <span className="font-bold">
                    {totals.bw_welds_10pct > 0
                      ? formatPercent((totals.bw_reject_10pct / totals.bw_welds_10pct) * 100)
                      : '0.00%'}
                  </span>
                </td>
                <td className="border border-slate-300 px-3 py-2 text-center" colSpan={3}>
                  <span className="text-xs font-medium">Reject</span>{' '}
                  <span className="font-bold">
                    {totals.bw_welds_100pct > 0
                      ? formatPercent((totals.bw_reject_100pct / totals.bw_welds_100pct) * 100)
                      : '0.00%'}
                  </span>
                </td>
                <td className="border border-slate-300"></td>
              </tr>

              {/* BW NDE Completion % per Tier Row */}
              <tr className="bg-slate-700 text-white">
                <td className="border border-slate-600 px-3 py-2 text-center" colSpan={2}></td>
                <td className="border border-slate-600 px-3 py-2 text-center text-xs" colSpan={3}>
                  <span className="font-medium">NDE Comp %</span>{' '}
                  <span className="font-bold">{formatPercent(totals.bw_nde_comp_5pct)}</span>
                </td>
                <td className="border border-slate-600 px-3 py-2 text-center text-xs" colSpan={3}>
                  <span className="font-medium">NDE Comp %</span>{' '}
                  <span className="font-bold">{formatPercent(totals.bw_nde_comp_10pct)}</span>
                </td>
                <td className="border border-slate-600 px-3 py-2 text-center text-xs" colSpan={3}>
                  <span className="font-medium">NDE Comp %</span>{' '}
                  <span className="font-bold">{formatPercent(totals.bw_nde_comp_100pct)}</span>
                </td>
                <td className="border border-slate-600"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: SOCKET WELDS (SW) */}
      <div className="space-y-2">
        <h2 className="text-lg font-bold text-slate-900 bg-green-100 px-4 py-2 rounded">
          SOCKET WELDS (SW)
        </h2>
        <div className="overflow-x-auto bg-white rounded-lg border border-slate-200">
          <table className="w-full text-sm border-collapse">
            {/* SW Header Row */}
            <thead>
              {/* Main column groups */}
              <tr className="bg-slate-700 text-white">
                <th className="border border-slate-600 px-3 py-2 text-left" rowSpan={2}>
                  WELDERS<br />NAME
                </th>
                <th className="border border-slate-600 px-3 py-2 text-center" rowSpan={2}>
                  STEN.<br />ID
                </th>
                {/* 5%SW Group */}
                <th className="border border-slate-600 px-3 py-2 text-center" colSpan={3}>
                  5%SW
                </th>
                {/* 10%SW Group */}
                <th className="border border-slate-600 px-3 py-2 text-center" colSpan={3}>
                  10%SW
                </th>
                {/* 100%SW Group */}
                <th className="border border-slate-600 px-3 py-2 text-center" colSpan={3}>
                  100%SW
                </th>
                {/* Rejection Rate */}
                <th className="border border-slate-600 px-3 py-2 text-center bg-red-600" rowSpan={2}>
                  REJ./WELDER
                </th>
              </tr>
              {/* Sub-headers */}
              <tr className="bg-slate-700 text-white text-xs">
                {/* 5%SW sub-columns */}
                <th className="border border-slate-600 px-2 py-1 text-center">WELDS</th>
                <th className="border border-slate-600 px-2 py-1 text-center">X-RAY</th>
                <th className="border border-slate-600 px-2 py-1 text-center bg-red-600">REJ.</th>
                {/* 10%SW sub-columns */}
                <th className="border border-slate-600 px-2 py-1 text-center">WELDS</th>
                <th className="border border-slate-600 px-2 py-1 text-center">X-RAY</th>
                <th className="border border-slate-600 px-2 py-1 text-center bg-red-600">REJ.</th>
                {/* 100%SW sub-columns */}
                <th className="border border-slate-600 px-2 py-1 text-center">WELDS</th>
                <th className="border border-slate-600 px-2 py-1 text-center">X-RAY</th>
                <th className="border border-slate-600 px-2 py-1 text-center bg-red-600">REJ.</th>
              </tr>
            </thead>

            {/* SW Data Rows */}
            <tbody>
              {rows.map((row) => (
                <tr key={`sw-${row.welder_id}`} className="hover:bg-slate-50">
                  {/* Welder Info */}
                  <td className="border border-slate-200 px-3 py-2 text-left font-medium text-blue-600">
                    {row.welder_name}
                  </td>
                  <td className="border border-slate-200 px-3 py-2 text-center font-medium">
                    {row.welder_stencil}
                  </td>

                  {/* SW 5% Tier */}
                  <td className="border border-slate-200 px-3 py-2 text-center">
                    {row.sw_welds_5pct || ''}
                  </td>
                  <td className="border border-slate-200 px-3 py-2 text-center">
                    {row.sw_nde_5pct || ''}
                  </td>
                  <td className="border border-slate-200 px-3 py-2 text-center bg-red-50">
                    {row.sw_reject_5pct || ''}
                  </td>

                  {/* SW 10% Tier */}
                  <td className="border border-slate-200 px-3 py-2 text-center">
                    {row.sw_welds_10pct || ''}
                  </td>
                  <td className="border border-slate-200 px-3 py-2 text-center">
                    {row.sw_nde_10pct || ''}
                  </td>
                  <td className="border border-slate-200 px-3 py-2 text-center bg-red-50">
                    {row.sw_reject_10pct || ''}
                  </td>

                  {/* SW 100% Tier */}
                  <td className="border border-slate-200 px-3 py-2 text-center">
                    {row.sw_welds_100pct || ''}
                  </td>
                  <td className="border border-slate-200 px-3 py-2 text-center">
                    {row.sw_nde_100pct || ''}
                  </td>
                  <td className="border border-slate-200 px-3 py-2 text-center bg-red-50">
                    {row.sw_reject_100pct || ''}
                  </td>

                  {/* SW Rejection Rate */}
                  <td className="border border-slate-200 px-3 py-2 text-center bg-yellow-200 font-semibold">
                    {formatPercent(row.sw_reject_rate)}
                  </td>
                </tr>
              ))}

              {/* SW TOTALS Row */}
              <tr className="bg-slate-100 font-bold">
                <td className="border border-slate-300 px-3 py-2 text-left" colSpan={2}>
                  SW TOTALS
                </td>

                {/* SW 5% Tier Totals */}
                <td className="border border-slate-300 px-3 py-2 text-center">
                  {totals.sw_welds_5pct}
                </td>
                <td className="border border-slate-300 px-3 py-2 text-center">
                  {totals.sw_nde_5pct}
                </td>
                <td className="border border-slate-300 px-3 py-2 text-center bg-red-100">
                  {totals.sw_reject_5pct}
                </td>

                {/* SW 10% Tier Totals */}
                <td className="border border-slate-300 px-3 py-2 text-center">
                  {totals.sw_welds_10pct}
                </td>
                <td className="border border-slate-300 px-3 py-2 text-center">
                  {totals.sw_nde_10pct}
                </td>
                <td className="border border-slate-300 px-3 py-2 text-center bg-red-100">
                  {totals.sw_reject_10pct}
                </td>

                {/* SW 100% Tier Totals */}
                <td className="border border-slate-300 px-3 py-2 text-center">
                  {totals.sw_welds_100pct}
                </td>
                <td className="border border-slate-300 px-3 py-2 text-center">
                  {totals.sw_nde_100pct}
                </td>
                <td className="border border-slate-300 px-3 py-2 text-center bg-red-100">
                  {totals.sw_reject_100pct}
                </td>

                {/* SW Overall Rejection Rate */}
                <td className="border border-slate-300 px-3 py-2 text-center bg-yellow-300">
                  {formatPercent(totals.sw_reject_rate)}
                </td>
              </tr>

              {/* SW Rejection Rate per Tier Row */}
              <tr className="bg-yellow-100">
                <td className="border border-slate-300 px-3 py-2 text-center font-medium" colSpan={2}></td>
                <td className="border border-slate-300 px-3 py-2 text-center" colSpan={3}>
                  <span className="text-xs font-medium">Reject</span>{' '}
                  <span className="font-bold">
                    {totals.sw_welds_5pct > 0
                      ? formatPercent((totals.sw_reject_5pct / totals.sw_welds_5pct) * 100)
                      : '0.00%'}
                  </span>
                </td>
                <td className="border border-slate-300 px-3 py-2 text-center" colSpan={3}>
                  <span className="text-xs font-medium">Reject</span>{' '}
                  <span className="font-bold">
                    {totals.sw_welds_10pct > 0
                      ? formatPercent((totals.sw_reject_10pct / totals.sw_welds_10pct) * 100)
                      : '0.00%'}
                  </span>
                </td>
                <td className="border border-slate-300 px-3 py-2 text-center" colSpan={3}>
                  <span className="text-xs font-medium">Reject</span>{' '}
                  <span className="font-bold">
                    {totals.sw_welds_100pct > 0
                      ? formatPercent((totals.sw_reject_100pct / totals.sw_welds_100pct) * 100)
                      : '0.00%'}
                  </span>
                </td>
                <td className="border border-slate-300"></td>
              </tr>

              {/* SW NDE Completion % per Tier Row */}
              <tr className="bg-slate-700 text-white">
                <td className="border border-slate-600 px-3 py-2 text-center" colSpan={2}></td>
                <td className="border border-slate-600 px-3 py-2 text-center text-xs" colSpan={3}>
                  <span className="font-medium">NDE Comp %</span>{' '}
                  <span className="font-bold">{formatPercent(totals.sw_nde_comp_5pct)}</span>
                </td>
                <td className="border border-slate-600 px-3 py-2 text-center text-xs" colSpan={3}>
                  <span className="font-medium">NDE Comp %</span>{' '}
                  <span className="font-bold">{formatPercent(totals.sw_nde_comp_10pct)}</span>
                </td>
                <td className="border border-slate-600 px-3 py-2 text-center text-xs" colSpan={3}>
                  <span className="font-medium">NDE Comp %</span>{' '}
                  <span className="font-bold">{formatPercent(totals.sw_nde_comp_100pct)}</span>
                </td>
                <td className="border border-slate-600"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: GRAND TOTAL (BW + SW) */}
      <div className="space-y-2">
        <h2 className="text-lg font-bold text-slate-900 bg-purple-100 px-4 py-2 rounded">
          GRAND TOTAL (BW + SW COMBINED)
        </h2>
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-slate-900">{rows.length}</p>
              <p className="text-sm text-slate-600">Welders</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totals.welds_total}</p>
              <p className="text-sm text-slate-600">Total Welds (BW + SW)</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totals.nde_total}</p>
              <p className="text-sm text-slate-600">X-Rays Performed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {formatPercent(totals.welds_total > 0 ? (totals.nde_total / totals.welds_total) * 100 : null)}
              </p>
              <p className="text-sm text-slate-600">NDE Comp Rate</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {formatPercent(totals.reject_rate)}
              </p>
              <p className="text-sm text-slate-600">Overall Rejection Rate</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
