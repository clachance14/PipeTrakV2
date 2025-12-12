/**
 * FieldWeldReportPDF Component
 *
 * Complete PDF document for field weld progress report.
 * Supports all 4 dimensions: area, system, test_package, welder.
 *
 * Features:
 * - Multi-page support (splits data into 50-row pages)
 * - Repeated headers and footers on each page
 * - Grand total only on last page
 * - Empty state handling
 * - Landscape A4 orientation
 *
 * @example
 * ```tsx
 * <FieldWeldReportPDF
 *   reportData={{
 *     rows: [{ name: 'Area A', total: 100, completed: 85, ... }],
 *     grandTotal: { name: 'Total', total: 100, completed: 85, ... }
 *   }}
 *   projectName="Pipeline Project 2025"
 *   dimension="area"
 *   generatedDate="2025-01-21"
 *   companyLogo="data:image/png;base64,..." // Optional
 * />
 * ```
 */

import { Document, Page, View, Text } from '@react-pdf/renderer';
import { BrandedHeader } from '../layout/BrandedHeader';
import { ReportFooter } from '../layout/ReportFooter';
import { Table } from '../tables/Table';
import { commonStyles } from '../styles/commonStyles';
import { transformToTableProps, getDimensionLabel, hasNonZeroRepairRate } from '@/lib/pdfUtils';
import type { FieldWeldReportPDFProps } from '@/types/pdf-components';

const ROWS_PER_PAGE = 50; // Split into multiple pages if > 50 rows

/**
 * FieldWeldReportPDF Component
 *
 * @param props - Component props
 * @param props.reportData - Field weld report data (rows and grand total)
 * @param props.projectName - Project name displayed in header
 * @param props.dimension - Report dimension: 'area' | 'system' | 'test_package' | 'welder'
 * @param props.generatedDate - Report generation date (YYYY-MM-DD)
 * @param props.companyLogo - Optional base64-encoded company logo
 */
export function FieldWeldReportPDF({
  reportData,
  projectName,
  dimension,
  generatedDate,
  companyLogo,
}: FieldWeldReportPDFProps) {
  // Determine if repair rate column should be shown (hide if ALL rows have 0% repair rate)
  const includeRepairRate = hasNonZeroRepairRate(reportData);
  const tableProps = transformToTableProps(reportData, dimension, includeRepairRate);
  const dimensionLabel = getDimensionLabel(dimension);

  // Handle empty data
  if (!reportData.rows || reportData.rows.length === 0) {
    return (
      <Document>
        <Page size="A4" orientation="landscape" style={commonStyles.page}>
          <BrandedHeader
            logo={companyLogo}
            title="PipeTrak Field Weld Progress Report"
            projectName={projectName}
            dimensionLabel={dimensionLabel}
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
  const totalDataRows = tableProps.data.length;
  const pageCount = Math.ceil(totalDataRows / rowsPerPage);

  const pages = [];
  for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
    const startIndex = pageIndex * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, totalDataRows);
    const pageData = tableProps.data.slice(startIndex, endIndex);

    // Include grand total only on the last page
    const includeGrandTotal = pageIndex === pageCount - 1;

    pages.push({
      data: pageData,
      grandTotal: includeGrandTotal ? tableProps.grandTotal : undefined,
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
            title="PipeTrak Field Weld Progress Report"
            projectName={projectName}
            dimensionLabel={dimensionLabel}
            generatedDate={generatedDate}
          />

          {/* Table (with page-specific data) */}
          <Table
            columns={tableProps.columns}
            data={page.data}
            grandTotal={page.grandTotal}
            highlightGrandTotal={tableProps.highlightGrandTotal}
          />

          {/* Footer (repeated on each page) */}
          <ReportFooter showPageNumbers={true} />
        </Page>
      ))}
    </Document>
  );
}
