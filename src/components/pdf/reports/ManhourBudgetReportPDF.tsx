/**
 * ManhourBudgetReportPDF Component
 *
 * Complete PDF document for manhour budget report.
 * Shows budget distribution per milestone (no earned values).
 *
 * Features:
 * - Multi-page support (splits data into 50-row pages)
 * - Repeated headers and footers on each page
 * - Grand total only on last page
 * - Empty state handling
 * - Landscape A4 orientation
 */

import { Document, Page, View, Text } from '@react-pdf/renderer';
import { BrandedHeader } from '../layout/BrandedHeader';
import { ReportFooter } from '../layout/ReportFooter';
import { Table } from '../tables/Table';
import { commonStyles } from '../styles/commonStyles';
import {
  transformManhourBudgetToTableProps,
  getComponentProgressDimensionLabel,
} from '@/lib/pdfUtils';
import type { ManhourReportData, GroupingDimension } from '@/types/reports';

const ROWS_PER_PAGE = 50;

interface ManhourBudgetReportPDFProps {
  reportData: ManhourReportData;
  projectName: string;
  dimension: GroupingDimension;
  generatedDate: string;
  companyLogo?: string;
  subtitle?: string;
}

export function ManhourBudgetReportPDF({
  reportData,
  projectName,
  dimension,
  generatedDate,
  companyLogo,
  subtitle,
}: ManhourBudgetReportPDFProps) {
  const tableProps = transformManhourBudgetToTableProps(reportData, dimension);
  const dimensionLabel = getComponentProgressDimensionLabel(dimension);
  const reportTitle = 'PipeTrak Manhour Budget Report';

  // Handle empty data
  if (!reportData.rows || reportData.rows.length === 0) {
    return (
      <Document>
        <Page size="A4" orientation="landscape" style={commonStyles.page}>
          <BrandedHeader
            logo={companyLogo}
            title={reportTitle}
            subtitle={subtitle}
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
          <BrandedHeader
            logo={companyLogo}
            title={reportTitle}
            subtitle={subtitle}
            projectName={projectName}
            dimensionLabel={dimensionLabel}
            generatedDate={generatedDate}
          />

          <Table
            columns={tableProps.columns}
            data={page.data}
            grandTotal={page.grandTotal}
            highlightGrandTotal={tableProps.highlightGrandTotal}
          />

          <ReportFooter showPageNumbers={true} />
        </Page>
      ))}
    </Document>
  );
}
