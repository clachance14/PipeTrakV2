/**
 * WeldLogReportPDF Component
 *
 * Complete PDF document for weld log export.
 * Displays all field welds with comprehensive details.
 *
 * Features:
 * - Multi-page support with automatic page breaks
 * - Repeated headers and footers on each page
 * - Empty state handling
 * - Landscape A4 orientation (10 columns)
 * - Uses @ag-media/react-pdf-table for consistent column alignment
 *
 * @example
 * ```tsx
 * <WeldLogReportPDF
 *   welds={[
 *     { identityDisplay: 'W-1', drawing: { drawing_no_norm: 'P-001' }, ... }
 *   ]}
 *   projectName="Pipeline Project 2025"
 *   generatedDate="2025-01-21"
 *   companyLogo="data:image/png;base64,..." // Optional
 * />
 * ```
 */

import { Document, Page, View, Text, Font, StyleSheet } from '@react-pdf/renderer';
import { Table, TR, TD } from '@ag-media/react-pdf-table';
import { BrandedHeader } from '../layout/BrandedHeader';
import { ReportFooter } from '../layout/ReportFooter';
import { commonStyles, colors } from '../styles/commonStyles';
import type { EnrichedFieldWeld } from '@/hooks/useFieldWelds';

// Disable automatic hyphenation - words wrap whole or not at all
Font.registerHyphenationCallback((word) => [word]);

/**
 * Column weightings for ag-media table (must sum to 1.0)
 * These define the relative column widths for consistent alignment
 */
const COLUMN_WEIGHTINGS = [0.12, 0.12, 0.15, 0.10, 0.06, 0.04, 0.09, 0.10, 0.10, 0.12];

/**
 * Column definitions for header rendering
 */
const COLUMNS = [
  { key: 'weldId', label: 'Weld ID', align: 'left' as const },
  { key: 'drawing', label: 'Drawing', align: 'left' as const },
  { key: 'welder', label: 'Welder', align: 'left' as const },
  { key: 'dateWelded', label: 'Date Welded', align: 'left' as const },
  { key: 'weldType', label: 'Type', align: 'center' as const },
  { key: 'size', label: 'Size', align: 'center' as const },
  { key: 'ndeResult', label: 'NDE Result', align: 'center' as const },
  { key: 'area', label: 'Area', align: 'left' as const },
  { key: 'system', label: 'System', align: 'left' as const },
  { key: 'testPackage', label: 'Test Package', align: 'left' as const },
];

/**
 * Layout constants for fixed positioning
 * These define the spacing for repeated headers/footers across pages
 */
const LAYOUT = {
  PAGE_MARGIN: 40,                    // Left/right margins
  BRANDED_HEADER_TOP: 20,             // Branded header position from top
  BRANDED_HEADER_HEIGHT: 80,          // Estimated branded header height (logo + title + border)
  TABLE_HEADER_TOP: 110,              // Table header position from top (20 + 80 + 10px gap)
  TABLE_HEADER_HEIGHT: 40,            // Table header actual height (padding + text + flex spacing)
  FOOTER_BOTTOM: 20,                  // Footer position from bottom
  FOOTER_HEIGHT: 30,                  // Estimated footer height
} as const;

// Calculate derived spacing values
const SPACING = {
  // Page padding must clear the fixed table header on ALL pages
  PAGE_PADDING_TOP: LAYOUT.TABLE_HEADER_TOP + LAYOUT.TABLE_HEADER_HEIGHT + 4,
  PAGE_PADDING_BOTTOM: LAYOUT.FOOTER_HEIGHT + 20,
  // First page needs less margin since page padding already accounts for headers
  TABLE_BODY_MARGIN_TOP: 0,
} as const;

/**
 * Local styles for weld log table
 */
const tableStyles = StyleSheet.create({
  // Fixed header row that repeats on each page
  headerRow: {
    flexDirection: 'row',
    backgroundColor: colors.slate700,
    padding: 6,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  headerCell: {
    fontSize: 10,
    color: colors.white,
    fontWeight: 'bold',
  },
  // Body row - alternating backgrounds
  rowEven: {
    backgroundColor: colors.white,
  },
  rowOdd: {
    backgroundColor: colors.slate50,
  },
  // Body cells - clean look, no borders
  dataCell: {
    fontSize: 10,
    color: colors.slate600,
    padding: 6,
  },
  dataCellCenter: {
    fontSize: 10,
    color: colors.slate600,
    padding: 6,
    textAlign: 'center',
  },
});

export interface WeldLogReportPDFProps {
  welds: EnrichedFieldWeld[];
  projectName: string;
  generatedDate: string;
  companyLogo?: string;
}

/**
 * Format date string to locale date (e.g., "12/5/2024")
 */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return '-';
  }
}

/**
 * Format welder info (stencil - name)
 */
function formatWelder(welder: { stencil: string; name: string } | null): string {
  if (!welder) return 'Not Assigned';
  return `${welder.stencil} - ${welder.name}`;
}

/**
 * Transform weld data to row format
 */
function transformWeldToRow(weld: EnrichedFieldWeld) {
  return {
    weldId: weld.identityDisplay,
    drawing: weld.drawing.drawing_no_norm,
    welder: formatWelder(weld.welder),
    dateWelded: formatDate(weld.date_welded),
    weldType: weld.weld_type,
    size: weld.weld_size || '-',
    ndeResult: weld.nde_result || '-',
    area: weld.area?.name || '-',
    system: weld.system?.name || '-',
    testPackage: weld.test_package?.name || '-',
  };
}

/**
 * WeldLogReportPDF Component
 */
export function WeldLogReportPDF({
  welds,
  projectName,
  generatedDate,
  companyLogo,
}: WeldLogReportPDFProps) {
  // Handle empty data
  if (!welds || welds.length === 0) {
    return (
      <Document>
        <Page size="A4" orientation="landscape" style={commonStyles.page}>
          <BrandedHeader
            logo={companyLogo}
            title="PipeTrak Weld Log"
            projectName={projectName}
            dimensionLabel={`${welds.length} Welds`}
            generatedDate={generatedDate}
          />

          <View style={{ marginTop: 40, alignItems: 'center' }}>
            <Text style={commonStyles.body}>
              No welds available in the weld log.
            </Text>
          </View>

          <ReportFooter showPageNumbers={true} />
        </Page>
      </Document>
    );
  }

  // Transform weld data
  const data = welds.map(transformWeldToRow);

  return (
    <Document>
      <Page
        size="A4"
        orientation="landscape"
        style={{
          ...commonStyles.page,
          paddingTop: SPACING.PAGE_PADDING_TOP,
          paddingBottom: SPACING.PAGE_PADDING_BOTTOM,
        }}
      >
        {/* Branded Header - Fixed at top of every page */}
        <View fixed style={{
          position: 'absolute',
          top: LAYOUT.BRANDED_HEADER_TOP,
          left: LAYOUT.PAGE_MARGIN,
          right: LAYOUT.PAGE_MARGIN,
        }}>
          <BrandedHeader
            logo={companyLogo}
            title="PipeTrak Weld Log"
            projectName={projectName}
            dimensionLabel={`${welds.length} Welds`}
            generatedDate={generatedDate}
          />
        </View>

        {/* Table Header - Fixed, repeats on every page below branded header */}
        {/* Uses same weightings as ag-media Table body for perfect column alignment */}
        <View fixed style={{
          position: 'absolute',
          top: LAYOUT.TABLE_HEADER_TOP,
          left: LAYOUT.PAGE_MARGIN,
          right: LAYOUT.PAGE_MARGIN,
        }}>
          <View style={tableStyles.headerRow}>
            {COLUMNS.map((col, i) => (
              <View
                key={col.key}
                style={{
                  width: `${(COLUMN_WEIGHTINGS[i] ?? 0.1) * 100}%`,
                  paddingHorizontal: 2,
                }}
              >
                <Text style={{
                  ...tableStyles.headerCell,
                  textAlign: col.align,
                }}>
                  {col.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Table Body - Uses @ag-media/react-pdf-table for consistent column alignment */}
        <View style={{
          marginLeft: LAYOUT.PAGE_MARGIN,
          marginRight: LAYOUT.PAGE_MARGIN,
          marginTop: SPACING.TABLE_BODY_MARGIN_TOP,
        }}>
          <Table weightings={COLUMN_WEIGHTINGS}>
            {data.map((row, index) => (
              <TR
                key={`row-${index}`}
                style={index % 2 === 0 ? tableStyles.rowEven : tableStyles.rowOdd}
                wrap={false}
              >
                <TD style={tableStyles.dataCell}>{row.weldId}</TD>
                <TD style={tableStyles.dataCell}>{row.drawing}</TD>
                <TD style={tableStyles.dataCell}>{row.welder}</TD>
                <TD style={tableStyles.dataCell}>{row.dateWelded}</TD>
                <TD style={tableStyles.dataCellCenter}>{row.weldType}</TD>
                <TD style={tableStyles.dataCellCenter}>{row.size}</TD>
                <TD style={tableStyles.dataCellCenter}>{row.ndeResult}</TD>
                <TD style={tableStyles.dataCell}>{row.area}</TD>
                <TD style={tableStyles.dataCell}>{row.system}</TD>
                <TD style={tableStyles.dataCell}>{row.testPackage}</TD>
              </TR>
            ))}
          </Table>
        </View>

        {/* Footer - Fixed at bottom of every page */}
        <View fixed style={{
          position: 'absolute',
          bottom: LAYOUT.FOOTER_BOTTOM,
          left: LAYOUT.PAGE_MARGIN,
          right: LAYOUT.PAGE_MARGIN,
        }}>
          <ReportFooter showPageNumbers={true} />
        </View>
      </Page>
    </Document>
  );
}
