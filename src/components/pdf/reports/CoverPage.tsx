/**
 * CoverPage Component
 * Feature 030: Enhanced Package Completion Report PDF
 *
 * Renders the cover page with executive summary, test certificate reference,
 * and key workflow approvals for the Package Completion Report.
 *
 * Layout:
 * - Header: Logo + title
 * - Status badge (Draft/Final)
 * - Executive summary metrics table
 * - Test certificate reference
 * - Key approvals (workflow sign-offs)
 *
 * @example
 * ```tsx
 * <CoverPage
 *   reportData={packageCompletionReport}
 *   projectName="Pipeline Project 2025"
 *   generatedDate="2025-01-24"
 *   certificate={certificate}
 *   workflowStages={stages}
 *   companyLogo="data:image/png;base64,..."
 * />
 * ```
 */

import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { BrandedHeader } from '../layout/BrandedHeader';
import { colors } from '../styles/commonStyles';
import { getKeyStages, formatStageForDisplay, getWorkflowSummary } from '@/lib/getKeyStages';
import type { PackageCompletionReport } from '@/types/packageReport';
import type { PackageWorkflowStage } from '@/types/workflow.types';

export interface CoverPageProps {
  reportData: PackageCompletionReport;
  projectName: string;
  generatedDate: string;
  workflowStages: PackageWorkflowStage[];
  companyLogo?: string;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statusBadge: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8 16',
    borderRadius: 4,
    marginTop: 12,
    marginBottom: 20,
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
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusTextDraft: {
    color: '#92400E',
  },
  statusTextFinal: {
    color: '#065F46',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.slate700,
    marginTop: 20,
    marginBottom: 10,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate700,
  },
  summaryTable: {
    display: 'flex',
    flexDirection: 'column',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 16,
  },
  summaryRow: {
    display: 'flex',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    padding: 10,
  },
  summaryRowLast: {
    display: 'flex',
    flexDirection: 'row',
    padding: 10,
  },
  summaryLabel: {
    fontSize: 10,
    color: colors.slate600,
    width: '50%',
    fontWeight: 'bold',
  },
  summaryValue: {
    fontSize: 10,
    color: colors.slate700,
    width: '50%',
    textAlign: 'right',
  },
  metricHighlight: {
    fontWeight: 'bold',
  },
  approvalsTable: {
    display: 'flex',
    flexDirection: 'column',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 4,
  },
  approvalHeader: {
    display: 'flex',
    flexDirection: 'row',
    backgroundColor: colors.slate700,
    padding: 8,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  approvalHeaderCell: {
    fontSize: 9,
    color: 'white',
    fontWeight: 'bold',
  },
  approvalRow: {
    display: 'flex',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    padding: 8,
  },
  approvalRowLast: {
    display: 'flex',
    flexDirection: 'row',
    padding: 8,
  },
  approvalCell: {
    fontSize: 9,
    color: colors.slate600,
  },
  statusCompleted: {
    color: '#059669',
    fontWeight: 'bold',
  },
  statusSkipped: {
    color: '#6B7280',
    fontStyle: 'italic',
  },
  statusPending: {
    color: '#D97706',
  },
});

export function CoverPage({
  reportData,
  projectName,
  generatedDate,
  workflowStages,
  companyLogo,
}: CoverPageProps) {
  const {
    package_name,
    test_type,
    is_draft,
    total_components,
    overall_nde_summary,
    test_pressure,
    test_pressure_unit,
    piping_spec,
  } = reportData;

  // Get workflow summary for progress display
  const workflowSummary = getWorkflowSummary(workflowStages);

  // Get key stages for approvals
  const keyStages = getKeyStages(workflowStages);

  return (
    <View style={styles.container}>
      <BrandedHeader
        logo={companyLogo}
        title="Package Completion Report"
        projectName={projectName}
        dimensionLabel={package_name}
        generatedDate={generatedDate}
      />

      {/* Status Badge */}
      <View style={[styles.statusBadge, is_draft ? styles.statusDraft : styles.statusFinal]}>
        <Text style={[styles.statusText, is_draft ? styles.statusTextDraft : styles.statusTextFinal]}>
          {is_draft ? 'DRAFT' : 'FINAL'}
        </Text>
      </View>

      {/* Executive Summary */}
      <Text style={styles.sectionTitle}>Executive Summary</Text>
      <View style={styles.summaryTable}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Package Name</Text>
          <Text style={styles.summaryValue}>{package_name}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Test Type</Text>
          <Text style={styles.summaryValue}>{test_type || 'Not specified'}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Test Pressure</Text>
          <Text style={styles.summaryValue}>
            {test_pressure != null ? `${test_pressure} ${test_pressure_unit || 'PSIG'}` : 'Not specified'}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Piping Spec</Text>
          <Text style={styles.summaryValue}>{piping_spec || 'Not specified'}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Components</Text>
          <Text style={styles.summaryValue}>{total_components}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Welds</Text>
          <Text style={styles.summaryValue}>{overall_nde_summary.total_welds}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>X-rays Completed</Text>
          <Text style={styles.summaryValue}>
            {overall_nde_summary.nde_pass_count + overall_nde_summary.nde_fail_count}
          </Text>
        </View>
        <View style={styles.summaryRowLast}>
          <Text style={styles.summaryLabel}>Workflow Progress</Text>
          <Text style={[styles.summaryValue, styles.metricHighlight]}>
            {workflowSummary.completedStages}/{workflowSummary.totalStages}{' '}
            {workflowSummary.isComplete ? '(Complete)' : ''}
          </Text>
        </View>
      </View>

      {/* Key Approvals */}
      {keyStages.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Key Approvals</Text>
          <View style={styles.approvalsTable}>
            <View style={styles.approvalHeader}>
              <Text style={[styles.approvalHeaderCell, { width: '28%' }]}>Stage</Text>
              <Text style={[styles.approvalHeaderCell, { width: '17%' }]}>Status</Text>
              <Text style={[styles.approvalHeaderCell, { width: '20%' }]}>Company Rep</Text>
              <Text style={[styles.approvalHeaderCell, { width: '20%' }]}>Client Rep</Text>
              <Text style={[styles.approvalHeaderCell, { width: '15%' }]}>Date</Text>
            </View>
            {keyStages.map((stage, index) => {
              const formatted = formatStageForDisplay(stage);
              const isLast = index === keyStages.length - 1;

              return (
                <View key={stage.id} style={isLast ? styles.approvalRowLast : styles.approvalRow}>
                  <Text style={[styles.approvalCell, { width: '28%' }]}>{formatted.name}</Text>
                  <Text
                    style={[
                      styles.approvalCell,
                      { width: '17%' },
                      formatted.status === 'completed'
                        ? styles.statusCompleted
                        : formatted.status === 'skipped'
                          ? styles.statusSkipped
                          : styles.statusPending,
                    ]}
                  >
                    {formatted.status === 'completed'
                      ? 'Completed'
                      : formatted.status === 'skipped'
                        ? 'Skipped'
                        : 'Pending'}
                  </Text>
                  <Text style={[styles.approvalCell, { width: '20%' }]}>
                    {formatted.companyRep || '-'}
                  </Text>
                  <Text style={[styles.approvalCell, { width: '20%' }]}>
                    {formatted.clientRep || '-'}
                  </Text>
                  <Text style={[styles.approvalCell, { width: '15%' }]}>
                    {formatted.completedDate || '-'}
                  </Text>
                </View>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}
