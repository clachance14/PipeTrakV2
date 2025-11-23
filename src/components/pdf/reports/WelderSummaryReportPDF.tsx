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
 * - Totals and calculated summary rows
 * - Empty state handling
 * - Landscape A4 orientation
 *
 * @example
 * ```tsx
 * <WelderSummaryReportPDF
 *   reportData={{
 *     rows: [{ welder_name: 'John Doe', bw_welds_5pct: 10, ... }],
 *     totals: { bw_welds_5pct: 100, ... },
 *     generatedAt: new Date(),
 *     filters: {...}
 *   }}
 *   projectName="Pipeline Project 2025"
 *   generatedDate="2025-01-21"
 *   companyLogo="data:image/png;base64,..." // Optional
 * />
 * ```
 */

import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { BrandedHeader } from '../layout/BrandedHeader';
import { ReportFooter } from '../layout/ReportFooter';
import { commonStyles } from '../styles/commonStyles';
import type { WelderSummaryReportPDFProps } from '@/types/pdf-components';
import type { WelderSummaryRow, WelderSummaryTotals } from '@/types/weldSummary';

const ROWS_PER_PAGE = 30; // Fewer rows due to wider table

// PDF-specific styles for welder summary table
const styles = StyleSheet.create({
  table: {
    marginTop: 12,
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#334155', // slate-700
    borderBottomWidth: 1,
    borderBottomColor: '#475569',
    borderBottomStyle: 'solid',
  },
  tableHeaderCell: {
    color: '#ffffff',
    fontSize: 7,
    fontWeight: 'bold',
    padding: 4,
    textAlign: 'center',
    borderRightWidth: 1,
    borderRightColor: '#475569',
    borderRightStyle: 'solid',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    borderBottomStyle: 'solid',
  },
  tableCell: {
    fontSize: 7,
    padding: 3,
    textAlign: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
    borderRightStyle: 'solid',
  },
  tableCellLeft: {
    textAlign: 'left',
  },
  tableCellBold: {
    fontWeight: 'bold',
  },
  totalRow: {
    backgroundColor: '#f1f5f9', // slate-100
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: '#dbeafe', // blue-100
    padding: 6,
    marginTop: 8,
    marginBottom: 4,
  },
  summaryRow: {
    backgroundColor: '#fef3c7', // yellow-100
    fontSize: 7,
  },
});

// Column widths (percentages) - 11 columns total
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

// BW Table Header
function BWTableHeader() {
  return (
    <View style={styles.tableHeader}>
      <Text style={[styles.tableHeaderCell, { width: colWidths.name, textAlign: 'left' }]}>
        WELDER NAME
      </Text>
      <Text style={[styles.tableHeaderCell, { width: colWidths.stencil }]}>STEN. ID</Text>
      <Text style={[styles.tableHeaderCell, { width: colWidths.tierGroup }]}>
        5% BW (W/X/R)
      </Text>
      <Text style={[styles.tableHeaderCell, { width: colWidths.tierGroup }]}>
        10% BW (W/X/R)
      </Text>
      <Text style={[styles.tableHeaderCell, { width: colWidths.tierGroup }]}>
        100% BW (W/X/R)
      </Text>
      <Text style={[styles.tableHeaderCell, { width: colWidths.rejRate }]}>REJ/WELDER</Text>
    </View>
  );
}

// BW Data Row
function BWDataRow({ row }: { row: WelderSummaryRow }) {
  return (
    <View style={styles.tableRow}>
      <Text style={[styles.tableCell, styles.tableCellLeft, { width: colWidths.name }]}>
        {row.welder_name}
      </Text>
      <Text style={[styles.tableCell, { width: colWidths.stencil }]}>{row.welder_stencil}</Text>

      {/* 5% BW */}
      <Text style={[styles.tableCell, { width: colWidths.welds5 }]}>{row.bw_welds_5pct || ''}</Text>
      <Text style={[styles.tableCell, { width: colWidths.nde5 }]}>{row.bw_nde_5pct || ''}</Text>
      <Text style={[styles.tableCell, { width: colWidths.rej5 }]}>{row.bw_reject_5pct || ''}</Text>

      {/* 10% BW */}
      <Text style={[styles.tableCell, { width: colWidths.welds10 }]}>{row.bw_welds_10pct || ''}</Text>
      <Text style={[styles.tableCell, { width: colWidths.nde10 }]}>{row.bw_nde_10pct || ''}</Text>
      <Text style={[styles.tableCell, { width: colWidths.rej10 }]}>{row.bw_reject_10pct || ''}</Text>

      {/* 100% BW */}
      <Text style={[styles.tableCell, { width: colWidths.welds100 }]}>{row.bw_welds_100pct || ''}</Text>
      <Text style={[styles.tableCell, { width: colWidths.nde100 }]}>{row.bw_nde_100pct || ''}</Text>
      <Text style={[styles.tableCell, { width: colWidths.rej100 }]}>{row.bw_reject_100pct || ''}</Text>

      {/* Rejection Rate */}
      <Text style={[styles.tableCell, styles.tableCellBold, { width: colWidths.rejRate }]}>
        {formatPercent(row.bw_reject_rate)}
      </Text>
    </View>
  );
}

// BW Totals Row
function BWTotalsRow({ totals }: { totals: WelderSummaryTotals }) {
  return (
    <View style={[styles.tableRow, styles.totalRow]}>
      <Text style={[styles.tableCell, styles.tableCellLeft, styles.tableCellBold, { width: colWidths.nameStencil }]}>
        BW TOTALS
      </Text>

      {/* 5% BW Totals */}
      <Text style={[styles.tableCell, styles.tableCellBold, { width: colWidths.welds5 }]}>{totals.bw_welds_5pct}</Text>
      <Text style={[styles.tableCell, styles.tableCellBold, { width: colWidths.nde5 }]}>{totals.bw_nde_5pct}</Text>
      <Text style={[styles.tableCell, styles.tableCellBold, { width: colWidths.rej5 }]}>{totals.bw_reject_5pct}</Text>

      {/* 10% BW Totals */}
      <Text style={[styles.tableCell, styles.tableCellBold, { width: colWidths.welds10 }]}>{totals.bw_welds_10pct}</Text>
      <Text style={[styles.tableCell, styles.tableCellBold, { width: colWidths.nde10 }]}>{totals.bw_nde_10pct}</Text>
      <Text style={[styles.tableCell, styles.tableCellBold, { width: colWidths.rej10 }]}>{totals.bw_reject_10pct}</Text>

      {/* 100% BW Totals */}
      <Text style={[styles.tableCell, styles.tableCellBold, { width: colWidths.welds100 }]}>{totals.bw_welds_100pct}</Text>
      <Text style={[styles.tableCell, styles.tableCellBold, { width: colWidths.nde100 }]}>{totals.bw_nde_100pct}</Text>
      <Text style={[styles.tableCell, styles.tableCellBold, { width: colWidths.rej100 }]}>{totals.bw_reject_100pct}</Text>

      {/* Overall BW Rejection Rate */}
      <Text style={[styles.tableCell, styles.tableCellBold, { width: colWidths.rejRate }]}>
        {formatPercent(totals.bw_reject_rate)}
      </Text>
    </View>
  );
}

// SW Table Header
function SWTableHeader() {
  return (
    <View style={styles.tableHeader}>
      <Text style={[styles.tableHeaderCell, { width: colWidths.name, textAlign: 'left' }]}>
        WELDER NAME
      </Text>
      <Text style={[styles.tableHeaderCell, { width: colWidths.stencil }]}>STEN. ID</Text>
      <Text style={[styles.tableHeaderCell, { width: colWidths.tierGroup }]}>
        5% SW (W/X/R)
      </Text>
      <Text style={[styles.tableHeaderCell, { width: colWidths.tierGroup }]}>
        10% SW (W/X/R)
      </Text>
      <Text style={[styles.tableHeaderCell, { width: colWidths.tierGroup }]}>
        100% SW (W/X/R)
      </Text>
      <Text style={[styles.tableHeaderCell, { width: colWidths.rejRate }]}>REJ/WELDER</Text>
    </View>
  );
}

// SW Data Row
function SWDataRow({ row }: { row: WelderSummaryRow }) {
  return (
    <View style={styles.tableRow}>
      <Text style={[styles.tableCell, styles.tableCellLeft, { width: colWidths.name }]}>
        {row.welder_name}
      </Text>
      <Text style={[styles.tableCell, { width: colWidths.stencil }]}>{row.welder_stencil}</Text>

      {/* 5% SW */}
      <Text style={[styles.tableCell, { width: colWidths.welds5 }]}>{row.sw_welds_5pct || ''}</Text>
      <Text style={[styles.tableCell, { width: colWidths.nde5 }]}>{row.sw_nde_5pct || ''}</Text>
      <Text style={[styles.tableCell, { width: colWidths.rej5 }]}>{row.sw_reject_5pct || ''}</Text>

      {/* 10% SW */}
      <Text style={[styles.tableCell, { width: colWidths.welds10 }]}>{row.sw_welds_10pct || ''}</Text>
      <Text style={[styles.tableCell, { width: colWidths.nde10 }]}>{row.sw_nde_10pct || ''}</Text>
      <Text style={[styles.tableCell, { width: colWidths.rej10 }]}>{row.sw_reject_10pct || ''}</Text>

      {/* 100% SW */}
      <Text style={[styles.tableCell, { width: colWidths.welds100 }]}>{row.sw_welds_100pct || ''}</Text>
      <Text style={[styles.tableCell, { width: colWidths.nde100 }]}>{row.sw_nde_100pct || ''}</Text>
      <Text style={[styles.tableCell, { width: colWidths.rej100 }]}>{row.sw_reject_100pct || ''}</Text>

      {/* Rejection Rate */}
      <Text style={[styles.tableCell, styles.tableCellBold, { width: colWidths.rejRate }]}>
        {formatPercent(row.sw_reject_rate)}
      </Text>
    </View>
  );
}

// SW Totals Row
function SWTotalsRow({ totals }: { totals: WelderSummaryTotals }) {
  return (
    <View style={[styles.tableRow, styles.totalRow]}>
      <Text style={[styles.tableCell, styles.tableCellLeft, styles.tableCellBold, { width: colWidths.nameStencil }]}>
        SW TOTALS
      </Text>

      {/* 5% SW Totals */}
      <Text style={[styles.tableCell, styles.tableCellBold, { width: colWidths.welds5 }]}>{totals.sw_welds_5pct}</Text>
      <Text style={[styles.tableCell, styles.tableCellBold, { width: colWidths.nde5 }]}>{totals.sw_nde_5pct}</Text>
      <Text style={[styles.tableCell, styles.tableCellBold, { width: colWidths.rej5 }]}>{totals.sw_reject_5pct}</Text>

      {/* 10% SW Totals */}
      <Text style={[styles.tableCell, styles.tableCellBold, { width: colWidths.welds10 }]}>{totals.sw_welds_10pct}</Text>
      <Text style={[styles.tableCell, styles.tableCellBold, { width: colWidths.nde10 }]}>{totals.sw_nde_10pct}</Text>
      <Text style={[styles.tableCell, styles.tableCellBold, { width: colWidths.rej10 }]}>{totals.sw_reject_10pct}</Text>

      {/* 100% SW Totals */}
      <Text style={[styles.tableCell, styles.tableCellBold, { width: colWidths.welds100 }]}>{totals.sw_welds_100pct}</Text>
      <Text style={[styles.tableCell, styles.tableCellBold, { width: colWidths.nde100 }]}>{totals.sw_nde_100pct}</Text>
      <Text style={[styles.tableCell, styles.tableCellBold, { width: colWidths.rej100 }]}>{totals.sw_reject_100pct}</Text>

      {/* Overall SW Rejection Rate */}
      <Text style={[styles.tableCell, styles.tableCellBold, { width: colWidths.rejRate }]}>
        {formatPercent(totals.sw_reject_rate)}
      </Text>
    </View>
  );
}

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
          style={commonStyles.page}
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
          <Text style={styles.sectionTitle}>BUTT WELDS (BW)</Text>
          <View style={styles.table}>
            <BWTableHeader />
            {page.data.map((row) => (
              <BWDataRow key={`bw-${row.welder_id}`} row={row} />
            ))}
            {page.includeTotals && <BWTotalsRow totals={totals} />}
          </View>

          {/* SW Section */}
          <Text style={styles.sectionTitle}>SOCKET WELDS (SW)</Text>
          <View style={styles.table}>
            <SWTableHeader />
            {page.data.map((row) => (
              <SWDataRow key={`sw-${row.welder_id}`} row={row} />
            ))}
            {page.includeTotals && <SWTotalsRow totals={totals} />}
          </View>

          {/* Footer (repeated on each page) */}
          <ReportFooter showPageNumbers={true} />
        </Page>
      ))}
    </Document>
  );
}
