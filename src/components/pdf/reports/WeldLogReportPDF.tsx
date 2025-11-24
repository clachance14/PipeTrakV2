/**
 * WeldLogReportPDF Component
 *
 * Complete PDF document for weld log export.
 * Displays all field welds with comprehensive details.
 *
 * Features:
 * - Multi-page support (splits data into 50-row pages)
 * - Repeated headers and footers on each page
 * - Empty state handling
 * - Landscape A4 orientation (12 columns)
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

import { Document, Page, View, Text } from '@react-pdf/renderer';
import { BrandedHeader } from '../layout/BrandedHeader';
import { ReportFooter } from '../layout/ReportFooter';
import { TableHeader } from '../tables/TableHeader';
import { TableRow } from '../tables/TableRow';
import { commonStyles } from '../styles/commonStyles';
import type { EnrichedFieldWeld } from '@/hooks/useFieldWelds';
import type { TableColumnDefinition } from '@/types/pdf-components';

/**
 * Layout constants for fixed positioning
 * These define the spacing for repeated headers/footers across pages
 */
const LAYOUT = {
  PAGE_MARGIN: 40,                    // Left/right margins
  BRANDED_HEADER_TOP: 20,             // Branded header position from top
  BRANDED_HEADER_HEIGHT: 50,          // Estimated branded header height
  TABLE_HEADER_TOP: 70,               // Table header position from top
  TABLE_HEADER_HEIGHT: 26,            // Table header padding (8*2) + font (10)
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
 * Transform weld log data to table props format
 */
function transformWeldsToTableProps(welds: EnrichedFieldWeld[]) {
  // Define column headers and formatting
  const columns: TableColumnDefinition[] = [
    { key: 'weldId', label: 'Weld ID', width: '10%', align: 'left', format: 'text' },
    { key: 'drawing', label: 'Drawing', width: '10%', align: 'left', format: 'text' },
    { key: 'welder', label: 'Welder', width: '12%', align: 'left', format: 'text' },
    { key: 'dateWelded', label: 'Date Welded', width: '8%', align: 'left', format: 'text' },
    { key: 'weldType', label: 'Type', width: '5%', align: 'center', format: 'text' },
    { key: 'size', label: 'Size', width: '6%', align: 'center', format: 'text' },
    { key: 'ndeResult', label: 'NDE Result', width: '7%', align: 'center', format: 'text' },
    { key: 'progress', label: 'Progress %', width: '8%', align: 'right', format: 'percentage' },
    { key: 'status', label: 'Status', width: '7%', align: 'center', format: 'text' },
    { key: 'area', label: 'Area', width: '9%', align: 'left', format: 'text' },
    { key: 'system', label: 'System', width: '9%', align: 'left', format: 'text' },
    { key: 'testPackage', label: 'Test Package', width: '9%', align: 'left', format: 'text' },
  ];

  // Transform weld data to table rows
  const data = welds.map((weld) => ({
    weldId: weld.identityDisplay,
    drawing: weld.drawing.drawing_no_norm,
    welder: formatWelder(weld.welder),
    dateWelded: formatDate(weld.date_welded),
    weldType: weld.weld_type,
    size: weld.weld_size || '-',
    ndeResult: weld.nde_result || '-',
    progress: weld.component.percent_complete / 100, // Convert to decimal for percentage format
    status: weld.status,
    area: weld.area?.name || '-',
    system: weld.system?.name || '-',
    testPackage: weld.test_package?.name || '-',
  }));

  return { columns, data };
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

  const { columns, data } = transformWeldsToTableProps(welds);

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
        <View fixed style={{
          position: 'absolute',
          top: LAYOUT.TABLE_HEADER_TOP,
          left: LAYOUT.PAGE_MARGIN,
          right: LAYOUT.PAGE_MARGIN,
        }}>
          <TableHeader columns={columns} />
        </View>

        {/* Table Body - Flows across pages automatically with proper spacing */}
        <View style={{
          marginLeft: LAYOUT.PAGE_MARGIN,
          marginRight: LAYOUT.PAGE_MARGIN,
          marginTop: SPACING.TABLE_BODY_MARGIN_TOP,
        }}>
          {data.map((row, index) => (
            <TableRow
              key={`row-${index}`}
              columns={columns}
              data={row}
              highlighted={false}
            />
          ))}
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
