/**
 * PackageCompletionReportPDF Component
 * Feature 030: Test Package Workflow - PDF export for completion report
 *
 * Complete PDF document for package completion/turnover report.
 * Formatted for 8.5 x 11 inch (US Letter) paper.
 *
 * Features:
 * - Package metadata (name, test type, target date, status)
 * - Component summary table (drawing, type, identity, quantity)
 * - Support summary table (commodity code, size, quantity)
 * - Drawing groups with component lists
 * - Multi-page support with headers/footers
 *
 * @example
 * ```tsx
 * <PackageCompletionReportPDF
 *   reportData={packageCompletionReport}
 *   projectName="Pipeline Project 2025"
 *   generatedDate="2025-01-24"
 *   companyLogo="data:image/png;base64,..."
 * />
 * ```
 */

import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { BrandedHeader } from '../layout/BrandedHeader';
import { ReportFooter } from '../layout/ReportFooter';
import { commonStyles } from '../styles/commonStyles';
import type { PackageCompletionReport } from '@/types/packageReport';

interface PackageCompletionReportPDFProps {
  reportData: PackageCompletionReport;
  projectName: string;
  generatedDate: string;
  companyLogo?: string;
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
});

export function PackageCompletionReportPDF({
  reportData,
  projectName,
  generatedDate,
  companyLogo,
}: PackageCompletionReportPDFProps) {
  const { package_name, test_type, target_date, is_draft, component_summary, support_summary } =
    reportData;

  return (
    <Document>
      <Page size="LETTER" style={commonStyles.page}>
        <BrandedHeader
          logo={companyLogo}
          title="Package Completion Report"
          projectName={projectName}
          dimensionLabel={package_name}
          generatedDate={generatedDate}
        />

        {/* Status Badge */}
        <View
          style={[styles.statusBadge, is_draft ? styles.statusDraft : styles.statusFinal]}
        >
          <Text style={[styles.statusText, is_draft ? styles.statusTextDraft : styles.statusTextFinal]}>
            {is_draft ? 'DRAFT' : 'FINAL'}
          </Text>
        </View>

        {/* Package Metadata */}
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

        {/* Component Summary Table */}
        <Text style={styles.sectionTitle}>Component Summary</Text>
        {component_summary.length === 0 ? (
          <View style={styles.emptyState}>
            <Text>No components in this package</Text>
          </View>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Drawing</Text>
              <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Type</Text>
              <Text style={[styles.tableHeaderCell, { width: '40%' }]}>Identity</Text>
              <Text style={[styles.tableHeaderCell, { width: '15%', textAlign: 'right' }]}>
                Quantity
              </Text>
            </View>
            {component_summary.map((row, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: '25%' }]}>{row.drawing_no_norm}</Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>{row.component_type}</Text>
                <Text style={[styles.tableCell, { width: '40%' }]}>{row.identity_display}</Text>
                <Text style={[styles.tableCell, { width: '15%', textAlign: 'right' }]}>
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
    </Document>
  );
}
