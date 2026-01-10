/**
 * PackageCompletionReportPDF Component
 * Feature 030: Test Package Workflow - PDF export for completion report
 *
 * Complete multi-page PDF document for package completion/turnover report.
 * Formatted for 8.5 x 11 inch (US Letter) paper.
 *
 * Document Structure:
 * - Page 1: Cover page with executive summary, certificate reference, key approvals
 * - Page 2+: Component and support summary tables
 * - Page 3+: Drawing-by-drawing details with optional weld logs
 *
 * Features:
 * - Package metadata (name, test type, target date, status)
 * - Executive summary with key metrics
 * - Test certificate reference (or pending state)
 * - Workflow sign-offs for key stages
 * - Component summary table (drawing, type, identity, quantity)
 * - Support summary table (commodity code, size, quantity)
 * - Drawing groups with component lists
 * - Configurable weld detail level (summary vs full log)
 * - Multi-page support with headers/footers
 *
 * @example
 * ```tsx
 * <PackageCompletionReportPDF
 *   reportData={packageCompletionReport}
 *   projectName="Pipeline Project 2025"
 *   generatedDate="2025-01-24"
 *   companyLogo="data:image/png;base64,..."
 *   certificate={certificate}
 *   workflowStages={stages}
 *   includeWeldDetails={true}
 * />
 * ```
 */

import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { BrandedHeader } from '../layout/BrandedHeader';
import { ReportFooter } from '../layout/ReportFooter';
import { CoverPage } from './CoverPage';
import { DrawingDetailSection } from './DrawingDetailSection';
import { commonStyles } from '../styles/commonStyles';
import type { PackageCompletionReport } from '@/types/packageReport';
import type { PackageWorkflowStage } from '@/types/workflow.types';

interface PackageCompletionReportPDFProps {
  reportData: PackageCompletionReport;
  projectName: string;
  generatedDate: string;
  companyLogo?: string;
  /** Workflow stages for sign-off display */
  workflowStages?: PackageWorkflowStage[];
  /** Include full weld log details (default: false) */
  includeWeldDetails?: boolean;
}

const styles = StyleSheet.create({
  statusBadge: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6 12',
    borderRadius: 4,
    marginVertical: 8,
    alignSelf: 'flex-start',
  },
  statusDraft: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  statusFinal: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  statusTextDraft: {
    color: '#92400E',
  },
  statusTextFinal: {
    color: '#065F46',
  },
  metadataSection: {
    marginTop: 16,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 4,
  },
  metadataRow: {
    display: 'flex',
    flexDirection: 'row',
    marginBottom: 8,
  },
  metadataLabel: {
    fontSize: 9,
    color: '#6B7280',
    fontWeight: 'bold',
    width: 100,
  },
  metadataValue: {
    fontSize: 9,
    color: '#111827',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  tableHeader: {
    display: 'flex',
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    padding: 8,
  },
  tableRow: {
    display: 'flex',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    padding: 8,
  },
  tableCell: {
    fontSize: 8,
    color: '#111827',
  },
  tableHeaderCell: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#374151',
    textTransform: 'uppercase',
  },
  emptyState: {
    padding: 24,
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 9,
  },
  pageTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  drawingsPageTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 8,
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#334155',
  },
});

export function PackageCompletionReportPDF({
  reportData,
  projectName,
  generatedDate,
  companyLogo,
  workflowStages,
  includeWeldDetails = false,
}: PackageCompletionReportPDFProps) {
  const {
    package_name,
    test_type,
    target_date,
    is_draft,
    component_summary,
    support_summary,
    drawing_groups,
  } = reportData;

  // Determine if we have extended data (for enhanced report)
  const hasExtendedData = workflowStages !== undefined;

  return (
    <Document>
      {/* Page 1: Cover Page (if extended data available) */}
      {hasExtendedData && (
        <Page size="LETTER" style={commonStyles.page}>
          <CoverPage
            reportData={reportData}
            projectName={projectName}
            generatedDate={generatedDate}
            workflowStages={workflowStages}
            companyLogo={companyLogo}
          />
          <ReportFooter showPageNumbers={true} />
        </Page>
      )}

      {/* Page 2+: Summary Tables */}
      <Page size="LETTER" style={commonStyles.page}>
        <BrandedHeader
          logo={companyLogo}
          title="Package Completion Report"
          subtitle={hasExtendedData ? 'Summary Tables' : undefined}
          projectName={projectName}
          dimensionLabel={package_name}
          generatedDate={generatedDate}
        />

        {/* Status Badge (only if not using cover page) */}
        {!hasExtendedData && (
          <View
            style={[styles.statusBadge, is_draft ? styles.statusDraft : styles.statusFinal]}
          >
            <Text
              style={[
                styles.statusText,
                is_draft ? styles.statusTextDraft : styles.statusTextFinal,
              ]}
            >
              {is_draft ? 'DRAFT' : 'FINAL'}
            </Text>
          </View>
        )}

        {/* Package Metadata (only if not using cover page) */}
        {!hasExtendedData && (
          <View style={styles.metadataSection}>
            <View style={styles.metadataRow}>
              <Text style={styles.metadataLabel}>Test Type:</Text>
              <Text style={styles.metadataValue}>{test_type || 'Not specified'}</Text>
            </View>
            <View style={styles.metadataRow}>
              <Text style={styles.metadataLabel}>Target Date:</Text>
              <Text style={styles.metadataValue}>
                {target_date
                  ? new Date(target_date).toLocaleDateString('en-US', { timeZone: 'UTC' })
                  : 'Not set'}
              </Text>
            </View>
          </View>
        )}

        {/* Component Summary Table */}
        <Text style={styles.sectionTitle}>Component Summary</Text>
        {component_summary.length === 0 ? (
          <View style={styles.emptyState}>
            <Text>No components in this package</Text>
          </View>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Type</Text>
              <Text style={[styles.tableHeaderCell, { width: '55%' }]}>Identity</Text>
              <Text style={[styles.tableHeaderCell, { width: '20%', textAlign: 'right' }]}>
                Quantity
              </Text>
            </View>
            {component_summary.map((row, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: '25%' }]}>{row.component_type}</Text>
                <Text style={[styles.tableCell, { width: '55%' }]}>{row.identity_display}</Text>
                <Text style={[styles.tableCell, { width: '20%', textAlign: 'right' }]}>
                  {row.quantity}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Support Summary Table */}
        <Text style={styles.sectionTitle}>Support Summary</Text>
        {support_summary.length === 0 ? (
          <View style={styles.emptyState}>
            <Text>No supports in this package</Text>
          </View>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: '40%' }]}>Commodity Code</Text>
              <Text style={[styles.tableHeaderCell, { width: '40%' }]}>Size</Text>
              <Text style={[styles.tableHeaderCell, { width: '20%', textAlign: 'right' }]}>
                Quantity
              </Text>
            </View>
            {support_summary.map((row, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: '40%' }]}>{row.commodity_code}</Text>
                <Text style={[styles.tableCell, { width: '40%' }]}>{row.size}</Text>
                <Text style={[styles.tableCell, { width: '20%', textAlign: 'right' }]}>
                  {row.quantity}
                </Text>
              </View>
            ))}
          </View>
        )}

        <ReportFooter showPageNumbers={true} />
      </Page>

      {/* Page 3+: Drawing Details (only if drawings exist) */}
      {drawing_groups.length > 0 && (
        <Page size="LETTER" style={commonStyles.page}>
          <BrandedHeader
            logo={companyLogo}
            title="Package Completion Report"
            subtitle="Drawing Details"
            projectName={projectName}
            dimensionLabel={package_name}
            generatedDate={generatedDate}
          />

          <Text style={styles.drawingsPageTitle}>
            Drawing Details ({drawing_groups.length} drawing
            {drawing_groups.length !== 1 ? 's' : ''})
          </Text>

          {drawing_groups.map((drawing) => (
            <DrawingDetailSection
              key={drawing.drawing_id}
              drawing={drawing}
              includeWeldDetails={includeWeldDetails}
            />
          ))}

          <ReportFooter showPageNumbers={true} />
        </Page>
      )}
    </Document>
  );
}
