/**
 * WelderSummaryReportPDF Component
 *
 * Complete PDF document for welder summary report (tier-grouped BW/SW metrics).
 * Displays separate BW and SW sections with tier metrics (5%, 10%, 100%).
 *
 * Features:
 * - Multi-page support (splits data into ~30-row pages)
 * - Two-table layout (BW table + SW table)
 * - Repeated headers and footers on each page
 * - Totals, rejection rate per tier, and NDE completion % summary rows
 * - Grand total section (BW + SW combined)
 * - Color-matched to on-screen report
 * - Empty state handling
 * - Landscape A4 orientation
 */

import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { BrandedHeader } from '../layout/BrandedHeader';
import { ReportFooter } from '../layout/ReportFooter';
import { commonStyles } from '../styles/commonStyles';
import type { WelderSummaryReportPDFProps } from '@/types/pdf-components';
import type { WelderSummaryRow, WelderSummaryTotals } from '@/types/weldSummary';

const ROWS_PER_PAGE = 40; // Compact layout fits more rows

// PDF-specific styles for welder summary table - compact to fit single page
const styles = StyleSheet.create({
  table: {
    marginTop: 2,
    marginBottom: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#334155', // slate-700
    borderBottomWidth: 0.5,
    borderBottomColor: '#475569',
    borderBottomStyle: 'solid',
  },
  tableHeaderCell: {
    color: '#ffffff',
    fontSize: 7,
    fontWeight: 'bold',
    padding: 2,
    textAlign: 'center',
    borderRightWidth: 0.5,
    borderRightColor: '#475569',
    borderRightStyle: 'solid',
  },
  tableHeaderCellRed: {
    color: '#ffffff',
    fontSize: 7,
    fontWeight: 'bold',
    padding: 2,
    textAlign: 'center',
    borderRightWidth: 0.5,
    borderRightColor: '#475569',
    borderRightStyle: 'solid',
    backgroundColor: '#dc2626', // red-600
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    borderBottomStyle: 'solid',
  },
  tableCell: {
    fontSize: 7,
    padding: 2,
    textAlign: 'center',
    borderRightWidth: 0.5,
    borderRightColor: '#e2e8f0',
    borderRightStyle: 'solid',
  },
  tableCellLeft: {
    textAlign: 'left',
  },
  tableCellBold: {
    fontWeight: 'bold',
  },
  // Cell background colors matching the HTML table
  cellRejectBg: {
    backgroundColor: '#fef2f2', // red-50
  },
  cellRejectTotalBg: {
    backgroundColor: '#fee2e2', // red-100
  },
  cellRejRateBg: {
    backgroundColor: '#fef08a', // yellow-200
  },
  cellRejRateTotalBg: {
    backgroundColor: '#fde047', // yellow-300
  },
  totalRow: {
    backgroundColor: '#f1f5f9', // slate-100
    fontWeight: 'bold',
    borderBottomWidth: 0.5,
    borderBottomColor: '#cbd5e1', // slate-300
    borderBottomStyle: 'solid',
  },
  // Section titles matching HTML colors
  sectionTitleBW: {
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: '#dbeafe', // blue-100
    padding: 3,
    marginTop: 4,
    marginBottom: 0,
  },
  sectionTitleSW: {
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: '#dcfce7', // green-100
    padding: 3,
    marginTop: 4,
    marginBottom: 0,
  },
  // Summary rows
  rejectRateRow: {
    flexDirection: 'row',
    backgroundColor: '#fef9c3', // yellow-100
    borderBottomWidth: 0.5,
    borderBottomColor: '#cbd5e1',
    borderBottomStyle: 'solid',
  },
  ndeCompRow: {
    flexDirection: 'row',
    backgroundColor: '#334155', // slate-700
    borderBottomWidth: 0.5,
    borderBottomColor: '#475569',
    borderBottomStyle: 'solid',
  },
  summaryCell: {
    fontSize: 7,
    padding: 2,
    textAlign: 'center',
    borderRightWidth: 0.5,
    borderRightColor: '#cbd5e1',
    borderRightStyle: 'solid',
  },
  summaryCellWhite: {
    fontSize: 7,
    padding: 2,
    textAlign: 'center',
    color: '#ffffff',
    borderRightWidth: 0.5,
    borderRightColor: '#475569',
    borderRightStyle: 'solid',
  },
  // Grand Total section
  grandTotalTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: '#f3e8ff', // purple-100
    padding: 3,
    marginTop: 4,
    marginBottom: 2,
  },
  grandTotalContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc', // slate-50
    borderWidth: 0.5,
    borderColor: '#e2e8f0',
    borderStyle: 'solid',
    borderRadius: 3,
    padding: 6,
    marginBottom: 4,
  },
  grandTotalMetric: {
    flex: 1,
    alignItems: 'center',
  },
  grandTotalValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a', // slate-900
  },
  grandTotalLabel: {
    fontSize: 7,
    color: '#475569', // slate-600
    marginTop: 1,
  },
});

// Column widths (percentages) - 12 columns total
const colWidths = {
  name: '18%',      // Welder Name
  stencil: '8%',    // Stencil ID
  welds5: '7%',     // 5% Welds
  nde5: '7%',       // 5% NDE
  rej5: '7%',       // 5% Reject
  welds10: '7%',    // 10% Welds
  nde10: '7%',      // 10% NDE
  rej10: '7%',      // 10% Reject
  welds100: '7%',   // 100% Welds
  nde100: '7%',     // 100% NDE
  rej100: '7%',     // 100% Reject
  rejRate: '11%',   // Rejection Rate
  tierGroup: '21%', // Combined tier group (W/X/R) = 7% + 7% + 7%
  nameStencil: '26%', // Combined name + stencil = 18% + 8%
};

// Format percentage helper
const formatPercent = (value: number | null): string => {
  if (value === null || value === undefined) return '-';
  return `${value.toFixed(2)}%`;
};

// ============================================================================
// BW Components
// ============================================================================

function BWTableHeader() {
  return (
    <View style={styles.tableHeader}>
      <Text style={[styles.tableHeaderCell, { width: colWidths.name, textAlign: 'left' }]}>
        WELDER NAME
      </Text>
      <Text style={[styles.tableHeaderCell, { width: colWidths.stencil }]}>STEN. ID</Text>
      <Text style={[styles.tableHeaderCell, { width: colWidths.welds5 }]}>WELDS</Text>
      <Text style={[styles.tableHeaderCell, { width: colWidths.nde5 }]}>X-RAY</Text>
      <Text style={[styles.tableHeaderCellRed, { width: colWidths.rej5 }]}>REJ.</Text>
      <Text style={[styles.tableHeaderCell, { width: colWidths.welds10 }]}>WELDS</Text>
      <Text style={[styles.tableHeaderCell, { width: colWidths.nde10 }]}>X-RAY</Text>
      <Text style={[styles.tableHeaderCellRed, { width: colWidths.rej10 }]}>REJ.</Text>
      <Text style={[styles.tableHeaderCell, { width: colWidths.welds100 }]}>WELDS</Text>
      <Text style={[styles.tableHeaderCell, { width: colWidths.nde100 }]}>X-RAY</Text>
      <Text style={[styles.tableHeaderCellRed, { width: colWidths.rej100 }]}>REJ.</Text>
      <Text style={[styles.tableHeaderCellRed, { width: colWidths.rejRate }]}>REJ./WELDER</Text>
    </View>
  );
}

// BW tier group label row (5%BW | 10%BW | 100%BW)
function BWTierLabelRow() {
  return (
    <View style={styles.tableHeader}>
      <Text style={[styles.tableHeaderCell, { width: colWidths.name, textAlign: 'left' }]}>{''}</Text>
      <Text style={[styles.tableHeaderCell, { width: colWidths.stencil }]}>{''}</Text>
      <Text style={[styles.tableHeaderCell, { width: colWidths.tierGroup }]}>5% BW</Text>
      <Text style={[styles.tableHeaderCell, { width: colWidths.tierGroup }]}>10% BW</Text>
      <Text style={[styles.tableHeaderCell, { width: colWidths.tierGroup }]}>100% BW</Text>
      <Text style={[styles.tableHeaderCell, { width: colWidths.rejRate }]}>{''}</Text>
    </View>
  );
}

function BWDataRow({ row }: { row: WelderSummaryRow }) {
  return (
    <View style={styles.tableRow}>
      <Text style={[styles.tableCell, styles.tableCellLeft, { width: colWidths.name, color: '#2563eb' }]}>
        {row.welder_name}
      </Text>
      <Text style={[styles.tableCell, styles.tableCellBold, { width: colWidths.stencil }]}>{row.welder_stencil}</Text>

      {/* 5% BW */}
      <Text style={[styles.tableCell, { width: colWidths.welds5 }]}>{row.bw_welds_5pct || ''}</Text>
      <Text style={[styles.tableCell, { width: colWidths.nde5 }]}>{row.bw_nde_5pct || ''}</Text>
      <Text style={[styles.tableCell, styles.cellRejectBg, { width: colWidths.rej5 }]}>{row.bw_reject_5pct || ''}</Text>

      {/* 10% BW */}
      <Text style={[styles.tableCell, { width: colWidths.welds10 }]}>{row.bw_welds_10pct || ''}</Text>
      <Text style={[styles.tableCell, { width: colWidths.nde10 }]}>{row.bw_nde_10pct || ''}</Text>
      <Text style={[styles.tableCell, styles.cellRejectBg, { width: colWidths.rej10 }]}>{row.bw_reject_10pct || ''}</Text>

      {/* 100% BW */}
      <Text style={[styles.tableCell, { width: colWidths.welds100 }]}>{row.bw_welds_100pct || ''}</Text>
      <Text style={[styles.tableCell, { width: colWidths.nde100 }]}>{row.bw_nde_100pct || ''}</Text>
      <Text style={[styles.tableCell, styles.cellRejectBg, { width: colWidths.rej100 }]}>{row.bw_reject_100pct || ''}</Text>

      {/* Rejection Rate - yellow bg */}
      <Text style={[styles.tableCell, styles.tableCellBold, styles.cellRejRateBg, { width: colWidths.rejRate }]}>
        {formatPercent(row.bw_reject_rate)}
      </Text>
    </View>
  );
}

function BWTotalsRow({ totals }: { totals: WelderSummaryTotals }) {
  return (
    <View style={[styles.tableRow, styles.totalRow]}>
      <Text style={[styles.tableCell, styles.tableCellLeft, styles.tableCellBold, { width: colWidths.nameStencil, borderRightColor: '#cbd5e1' }]}>
        BW TOTALS
      </Text>

      {/* 5% BW Totals */}
      <Text style={[styles.tableCell, styles.tableCellBold, { width: colWidths.welds5, borderRightColor: '#cbd5e1' }]}>{totals.bw_welds_5pct}</Text>
      <Text style={[styles.tableCell, styles.tableCellBold, { width: colWidths.nde5, borderRightColor: '#cbd5e1' }]}>{totals.bw_nde_5pct}</Text>
      <Text style={[styles.tableCell, styles.tableCellBold, styles.cellRejectTotalBg, { width: colWidths.rej5, borderRightColor: '#cbd5e1' }]}>{totals.bw_reject_5pct}</Text>

      {/* 10% BW Totals */}
      <Text style={[styles.tableCell, styles.tableCellBold, { width: colWidths.welds10, borderRightColor: '#cbd5e1' }]}>{totals.bw_welds_10pct}</Text>
      <Text style={[styles.tableCell, styles.tableCellBold, { width: colWidths.nde10, borderRightColor: '#cbd5e1' }]}>{totals.bw_nde_10pct}</Text>
      <Text style={[styles.tableCell, styles.tableCellBold, styles.cellRejectTotalBg, { width: colWidths.rej10, borderRightColor: '#cbd5e1' }]}>{totals.bw_reject_10pct}</Text>

      {/* 100% BW Totals */}
      <Text style={[styles.tableCell, styles.tableCellBold, { width: colWidths.welds100, borderRightColor: '#cbd5e1' }]}>{totals.bw_welds_100pct}</Text>
      <Text style={[styles.tableCell, styles.tableCellBold, { width: colWidths.nde100, borderRightColor: '#cbd5e1' }]}>{totals.bw_nde_100pct}</Text>
      <Text style={[styles.tableCell, styles.tableCellBold, styles.cellRejectTotalBg, { width: colWidths.rej100, borderRightColor: '#cbd5e1' }]}>{totals.bw_reject_100pct}</Text>

      {/* Overall BW Rejection Rate - darker yellow */}
      <Text style={[styles.tableCell, styles.tableCellBold, styles.cellRejRateTotalBg, { width: colWidths.rejRate, borderRightColor: '#cbd5e1' }]}>
        {formatPercent(totals.bw_reject_rate)}
      </Text>
    </View>
  );
}

// BW Rejection Rate per Tier row (yellow-100 bg)
function BWRejectRateRow({ totals }: { totals: WelderSummaryTotals }) {
  const rej5 = totals.bw_welds_5pct > 0
    ? formatPercent((totals.bw_reject_5pct / totals.bw_welds_5pct) * 100)
    : '0.00%';
  const rej10 = totals.bw_welds_10pct > 0
    ? formatPercent((totals.bw_reject_10pct / totals.bw_welds_10pct) * 100)
    : '0.00%';
  const rej100 = totals.bw_welds_100pct > 0
    ? formatPercent((totals.bw_reject_100pct / totals.bw_welds_100pct) * 100)
    : '0.00%';

  return (
    <View style={styles.rejectRateRow}>
      <Text style={[styles.summaryCell, { width: colWidths.nameStencil }]}>{''}</Text>
      <Text style={[styles.summaryCell, styles.tableCellBold, { width: colWidths.tierGroup }]}>
        Reject {rej5}
      </Text>
      <Text style={[styles.summaryCell, styles.tableCellBold, { width: colWidths.tierGroup }]}>
        Reject {rej10}
      </Text>
      <Text style={[styles.summaryCell, styles.tableCellBold, { width: colWidths.tierGroup }]}>
        Reject {rej100}
      </Text>
      <Text style={[styles.summaryCell, { width: colWidths.rejRate }]}>{''}</Text>
    </View>
  );
}

// BW NDE Completion % per Tier row (slate-700 bg, white text)
function BWNdeCompRow({ totals }: { totals: WelderSummaryTotals }) {
  return (
    <View style={styles.ndeCompRow}>
      <Text style={[styles.summaryCellWhite, { width: colWidths.nameStencil }]}>{''}</Text>
      <Text style={[styles.summaryCellWhite, styles.tableCellBold, { width: colWidths.tierGroup }]}>
        NDE Comp % {formatPercent(totals.bw_nde_comp_5pct)}
      </Text>
      <Text style={[styles.summaryCellWhite, styles.tableCellBold, { width: colWidths.tierGroup }]}>
        NDE Comp % {formatPercent(totals.bw_nde_comp_10pct)}
      </Text>
      <Text style={[styles.summaryCellWhite, styles.tableCellBold, { width: colWidths.tierGroup }]}>
        NDE Comp % {formatPercent(totals.bw_nde_comp_100pct)}
      </Text>
      <Text style={[styles.summaryCellWhite, { width: colWidths.rejRate }]}>{''}</Text>
    </View>
  );
}

// ============================================================================
// SW Components
// ============================================================================

function SWTableHeader() {
  return (
    <View style={styles.tableHeader}>
      <Text style={[styles.tableHeaderCell, { width: colWidths.name, textAlign: 'left' }]}>
        WELDER NAME
      </Text>
      <Text style={[styles.tableHeaderCell, { width: colWidths.stencil }]}>STEN. ID</Text>
      <Text style={[styles.tableHeaderCell, { width: colWidths.welds5 }]}>WELDS</Text>
      <Text style={[styles.tableHeaderCell, { width: colWidths.nde5 }]}>X-RAY</Text>
      <Text style={[styles.tableHeaderCellRed, { width: colWidths.rej5 }]}>REJ.</Text>
      <Text style={[styles.tableHeaderCell, { width: colWidths.welds10 }]}>WELDS</Text>
      <Text style={[styles.tableHeaderCell, { width: colWidths.nde10 }]}>X-RAY</Text>
      <Text style={[styles.tableHeaderCellRed, { width: colWidths.rej10 }]}>REJ.</Text>
      <Text style={[styles.tableHeaderCell, { width: colWidths.welds100 }]}>WELDS</Text>
      <Text style={[styles.tableHeaderCell, { width: colWidths.nde100 }]}>X-RAY</Text>
      <Text style={[styles.tableHeaderCellRed, { width: colWidths.rej100 }]}>REJ.</Text>
      <Text style={[styles.tableHeaderCellRed, { width: colWidths.rejRate }]}>REJ./WELDER</Text>
    </View>
  );
}

// SW tier group label row (5%SW | 10%SW | 100%SW)
function SWTierLabelRow() {
  return (
    <View style={styles.tableHeader}>
      <Text style={[styles.tableHeaderCell, { width: colWidths.name, textAlign: 'left' }]}>{''}</Text>
      <Text style={[styles.tableHeaderCell, { width: colWidths.stencil }]}>{''}</Text>
      <Text style={[styles.tableHeaderCell, { width: colWidths.tierGroup }]}>5% SW</Text>
      <Text style={[styles.tableHeaderCell, { width: colWidths.tierGroup }]}>10% SW</Text>
      <Text style={[styles.tableHeaderCell, { width: colWidths.tierGroup }]}>100% SW</Text>
      <Text style={[styles.tableHeaderCell, { width: colWidths.rejRate }]}>{''}</Text>
    </View>
  );
}

function SWDataRow({ row }: { row: WelderSummaryRow }) {
  return (
    <View style={styles.tableRow}>
      <Text style={[styles.tableCell, styles.tableCellLeft, { width: colWidths.name, color: '#2563eb' }]}>
        {row.welder_name}
      </Text>
      <Text style={[styles.tableCell, styles.tableCellBold, { width: colWidths.stencil }]}>{row.welder_stencil}</Text>

      {/* 5% SW */}
      <Text style={[styles.tableCell, { width: colWidths.welds5 }]}>{row.sw_welds_5pct || ''}</Text>
      <Text style={[styles.tableCell, { width: colWidths.nde5 }]}>{row.sw_nde_5pct || ''}</Text>
      <Text style={[styles.tableCell, styles.cellRejectBg, { width: colWidths.rej5 }]}>{row.sw_reject_5pct || ''}</Text>

      {/* 10% SW */}
      <Text style={[styles.tableCell, { width: colWidths.welds10 }]}>{row.sw_welds_10pct || ''}</Text>
      <Text style={[styles.tableCell, { width: colWidths.nde10 }]}>{row.sw_nde_10pct || ''}</Text>
      <Text style={[styles.tableCell, styles.cellRejectBg, { width: colWidths.rej10 }]}>{row.sw_reject_10pct || ''}</Text>

      {/* 100% SW */}
      <Text style={[styles.tableCell, { width: colWidths.welds100 }]}>{row.sw_welds_100pct || ''}</Text>
      <Text style={[styles.tableCell, { width: colWidths.nde100 }]}>{row.sw_nde_100pct || ''}</Text>
      <Text style={[styles.tableCell, styles.cellRejectBg, { width: colWidths.rej100 }]}>{row.sw_reject_100pct || ''}</Text>

      {/* Rejection Rate - yellow bg */}
      <Text style={[styles.tableCell, styles.tableCellBold, styles.cellRejRateBg, { width: colWidths.rejRate }]}>
        {formatPercent(row.sw_reject_rate)}
      </Text>
    </View>
  );
}

function SWTotalsRow({ totals }: { totals: WelderSummaryTotals }) {
  return (
    <View style={[styles.tableRow, styles.totalRow]}>
      <Text style={[styles.tableCell, styles.tableCellLeft, styles.tableCellBold, { width: colWidths.nameStencil, borderRightColor: '#cbd5e1' }]}>
        SW TOTALS
      </Text>

      {/* 5% SW Totals */}
      <Text style={[styles.tableCell, styles.tableCellBold, { width: colWidths.welds5, borderRightColor: '#cbd5e1' }]}>{totals.sw_welds_5pct}</Text>
      <Text style={[styles.tableCell, styles.tableCellBold, { width: colWidths.nde5, borderRightColor: '#cbd5e1' }]}>{totals.sw_nde_5pct}</Text>
      <Text style={[styles.tableCell, styles.tableCellBold, styles.cellRejectTotalBg, { width: colWidths.rej5, borderRightColor: '#cbd5e1' }]}>{totals.sw_reject_5pct}</Text>

      {/* 10% SW Totals */}
      <Text style={[styles.tableCell, styles.tableCellBold, { width: colWidths.welds10, borderRightColor: '#cbd5e1' }]}>{totals.sw_welds_10pct}</Text>
      <Text style={[styles.tableCell, styles.tableCellBold, { width: colWidths.nde10, borderRightColor: '#cbd5e1' }]}>{totals.sw_nde_10pct}</Text>
      <Text style={[styles.tableCell, styles.tableCellBold, styles.cellRejectTotalBg, { width: colWidths.rej10, borderRightColor: '#cbd5e1' }]}>{totals.sw_reject_10pct}</Text>

      {/* 100% SW Totals */}
      <Text style={[styles.tableCell, styles.tableCellBold, { width: colWidths.welds100, borderRightColor: '#cbd5e1' }]}>{totals.sw_welds_100pct}</Text>
      <Text style={[styles.tableCell, styles.tableCellBold, { width: colWidths.nde100, borderRightColor: '#cbd5e1' }]}>{totals.sw_nde_100pct}</Text>
      <Text style={[styles.tableCell, styles.tableCellBold, styles.cellRejectTotalBg, { width: colWidths.rej100, borderRightColor: '#cbd5e1' }]}>{totals.sw_reject_100pct}</Text>

      {/* Overall SW Rejection Rate - darker yellow */}
      <Text style={[styles.tableCell, styles.tableCellBold, styles.cellRejRateTotalBg, { width: colWidths.rejRate, borderRightColor: '#cbd5e1' }]}>
        {formatPercent(totals.sw_reject_rate)}
      </Text>
    </View>
  );
}

// SW Rejection Rate per Tier row (yellow-100 bg)
function SWRejectRateRow({ totals }: { totals: WelderSummaryTotals }) {
  const rej5 = totals.sw_welds_5pct > 0
    ? formatPercent((totals.sw_reject_5pct / totals.sw_welds_5pct) * 100)
    : '0.00%';
  const rej10 = totals.sw_welds_10pct > 0
    ? formatPercent((totals.sw_reject_10pct / totals.sw_welds_10pct) * 100)
    : '0.00%';
  const rej100 = totals.sw_welds_100pct > 0
    ? formatPercent((totals.sw_reject_100pct / totals.sw_welds_100pct) * 100)
    : '0.00%';

  return (
    <View style={styles.rejectRateRow}>
      <Text style={[styles.summaryCell, { width: colWidths.nameStencil }]}>{''}</Text>
      <Text style={[styles.summaryCell, styles.tableCellBold, { width: colWidths.tierGroup }]}>
        Reject {rej5}
      </Text>
      <Text style={[styles.summaryCell, styles.tableCellBold, { width: colWidths.tierGroup }]}>
        Reject {rej10}
      </Text>
      <Text style={[styles.summaryCell, styles.tableCellBold, { width: colWidths.tierGroup }]}>
        Reject {rej100}
      </Text>
      <Text style={[styles.summaryCell, { width: colWidths.rejRate }]}>{''}</Text>
    </View>
  );
}

// SW NDE Completion % per Tier row (slate-700 bg, white text)
function SWNdeCompRow({ totals }: { totals: WelderSummaryTotals }) {
  return (
    <View style={styles.ndeCompRow}>
      <Text style={[styles.summaryCellWhite, { width: colWidths.nameStencil }]}>{''}</Text>
      <Text style={[styles.summaryCellWhite, styles.tableCellBold, { width: colWidths.tierGroup }]}>
        NDE Comp % {formatPercent(totals.sw_nde_comp_5pct)}
      </Text>
      <Text style={[styles.summaryCellWhite, styles.tableCellBold, { width: colWidths.tierGroup }]}>
        NDE Comp % {formatPercent(totals.sw_nde_comp_10pct)}
      </Text>
      <Text style={[styles.summaryCellWhite, styles.tableCellBold, { width: colWidths.tierGroup }]}>
        NDE Comp % {formatPercent(totals.sw_nde_comp_100pct)}
      </Text>
      <Text style={[styles.summaryCellWhite, { width: colWidths.rejRate }]}>{''}</Text>
    </View>
  );
}

// ============================================================================
// Grand Total Section
// ============================================================================

function GrandTotalSection({ totals, welderCount }: { totals: WelderSummaryTotals; welderCount: number }) {
  return (
    <View>
      <Text style={styles.grandTotalTitle}>GRAND TOTAL (BW + SW COMBINED)</Text>
      <View style={styles.grandTotalContainer}>
        <View style={styles.grandTotalMetric}>
          <Text style={styles.grandTotalValue}>{welderCount}</Text>
          <Text style={styles.grandTotalLabel}>Welders</Text>
        </View>
        <View style={styles.grandTotalMetric}>
          <Text style={styles.grandTotalValue}>{totals.welds_total}</Text>
          <Text style={styles.grandTotalLabel}>Total Welds (BW + SW)</Text>
        </View>
        <View style={styles.grandTotalMetric}>
          <Text style={styles.grandTotalValue}>{totals.nde_total}</Text>
          <Text style={styles.grandTotalLabel}>X-Rays Performed</Text>
        </View>
        <View style={styles.grandTotalMetric}>
          <Text style={styles.grandTotalValue}>
            {formatPercent(totals.welds_total > 0 ? (totals.nde_total / totals.welds_total) * 100 : null)}
          </Text>
          <Text style={styles.grandTotalLabel}>NDE Comp Rate</Text>
        </View>
        <View style={styles.grandTotalMetric}>
          <Text style={styles.grandTotalValue}>{formatPercent(totals.reject_rate)}</Text>
          <Text style={styles.grandTotalLabel}>Overall Rejection Rate</Text>
        </View>
      </View>
    </View>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * WelderSummaryReportPDF Component
 */
export function WelderSummaryReportPDF({
  reportData,
  projectName,
  generatedDate,
  companyLogo,
}: WelderSummaryReportPDFProps) {
  const { rows, totals } = reportData;

  // Handle empty data
  if (!rows || rows.length === 0) {
    return (
      <Document>
        <Page size="A4" orientation="landscape" style={commonStyles.page}>
          <BrandedHeader
            logo={companyLogo}
            title="PipeTrak Welder Summary Report"
            projectName={projectName}
            dimensionLabel="Welder"
            generatedDate={generatedDate}
          />

          <View style={{ marginTop: 40, alignItems: 'center' }}>
            <Text style={commonStyles.body}>
              No data available for this report.
            </Text>
          </View>

          <ReportFooter showPageNumbers={true} />
        </Page>
      </Document>
    );
  }

  // Split data into pages if necessary
  const rowsPerPage = ROWS_PER_PAGE;
  const totalDataRows = rows.length;
  const pageCount = Math.ceil(totalDataRows / rowsPerPage);

  const pages: Array<{ data: WelderSummaryRow[]; includeTotals: boolean }> = [];
  for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
    const startIndex = pageIndex * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, totalDataRows);
    const pageData = rows.slice(startIndex, endIndex);

    // Include totals only on the last page
    const includeTotals = pageIndex === pageCount - 1;

    pages.push({
      data: pageData,
      includeTotals,
    });
  }

  return (
    <Document>
      {pages.map((page, pageIndex) => (
        <Page
          key={`page-${pageIndex}`}
          size="A4"
          orientation="landscape"
          style={[commonStyles.page, { padding: 20 }]}
        >
          {/* Header (repeated on each page) */}
          <BrandedHeader
            logo={companyLogo}
            title="PipeTrak Welder Summary Report"
            projectName={projectName}
            dimensionLabel="Welder"
            generatedDate={generatedDate}
          />

          {/* BW Section */}
          <Text style={styles.sectionTitleBW}>BUTT WELDS (BW)</Text>
          <View style={styles.table}>
            <BWTierLabelRow />
            <BWTableHeader />
            {page.data.map((row) => (
              <BWDataRow key={`bw-${row.welder_id}`} row={row} />
            ))}
            {page.includeTotals && (
              <>
                <BWTotalsRow totals={totals} />
                <BWRejectRateRow totals={totals} />
                <BWNdeCompRow totals={totals} />
              </>
            )}
          </View>

          {/* SW Section */}
          <Text style={styles.sectionTitleSW}>SOCKET WELDS (SW)</Text>
          <View style={styles.table}>
            <SWTierLabelRow />
            <SWTableHeader />
            {page.data.map((row) => (
              <SWDataRow key={`sw-${row.welder_id}`} row={row} />
            ))}
            {page.includeTotals && (
              <>
                <SWTotalsRow totals={totals} />
                <SWRejectRateRow totals={totals} />
                <SWNdeCompRow totals={totals} />
              </>
            )}
          </View>

          {/* Grand Total (last page only) */}
          {page.includeTotals && (
            <GrandTotalSection totals={totals} welderCount={rows.length} />
          )}

          {/* Footer (repeated on each page) */}
          <ReportFooter showPageNumbers={true} />
        </Page>
      ))}
    </Document>
  );
}
