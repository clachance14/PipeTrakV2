/**
 * PackageWorkflowReportPDF Component
 *
 * Single-page PDF document for completed package workflow.
 * Displays all workflow stages, data, approvals, and completion dates.
 *
 * Features:
 * - Package information header
 * - All workflow stages with completion status
 * - Stage-specific data fields
 * - Sign-offs with names and dates
 * - Portrait A4 orientation
 *
 * @example
 * ```tsx
 * <PackageWorkflowReportPDF
 *   packageData={{
 *     name: 'TP-1',
 *     description: 'Test Package 1',
 *     test_type: 'Hydrostatic Test',
 *     target_date: '2025-12-31'
 *   }}
 *   workflowStages={[...]}
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
import type { PackageWorkflowStage, StageData } from '@/types/workflow.types';
import type { PackageWorkflowPDFOptions } from '@/stores/usePackageWorkflowCustomizationStore';

interface PackageData {
  name: string;
  description: string | null;
  test_type: string | null;
  target_date: string | null;
  requires_coating: boolean | null;
  requires_insulation: boolean | null;
}

interface PackageWorkflowReportPDFProps {
  packageData: PackageData;
  workflowStages: PackageWorkflowStage[];
  projectName: string;
  generatedDate: string;
  companyLogo?: string;
  options?: PackageWorkflowPDFOptions;
}

const styles = StyleSheet.create({
  section: {
    marginTop: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1f2937',
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: 4,
  },
  infoGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  infoItem: {
    width: '48%',
    marginBottom: 8,
  },
  label: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 2,
  },
  value: {
    fontSize: 10,
    color: '#111827',
    fontWeight: 'bold',
  },
  stageContainer: {
    marginBottom: 16,
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
    border: '1px solid #e5e7eb',
  },
  stageTitleRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stageTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#111827',
  },
  statusBadge: {
    fontSize: 8,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 3,
    textTransform: 'uppercase',
  },
  statusCompleted: {
    backgroundColor: '#10b981',
    color: '#ffffff',
  },
  statusSkipped: {
    backgroundColor: '#f59e0b',
    color: '#ffffff',
  },
  statusNotStarted: {
    backgroundColor: '#9ca3af',
    color: '#ffffff',
  },
  stageData: {
    marginTop: 8,
    paddingTop: 8,
    borderTop: '1px solid #d1d5db',
  },
  dataRow: {
    display: 'flex',
    flexDirection: 'row',
    marginBottom: 4,
  },
  dataLabel: {
    fontSize: 9,
    color: '#6b7280',
    width: '35%',
  },
  dataValue: {
    fontSize: 9,
    color: '#111827',
    width: '65%',
  },
  signOffs: {
    marginTop: 8,
    paddingTop: 8,
    borderTop: '1px solid #d1d5db',
  },
  signOffTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 4,
  },
  signOffRow: {
    display: 'flex',
    flexDirection: 'row',
    marginBottom: 3,
  },
});

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getStatusBadgeStyle(status: string) {
  switch (status) {
    case 'completed':
      return [styles.statusBadge, styles.statusCompleted];
    case 'skipped':
      return [styles.statusBadge, styles.statusSkipped];
    default:
      return [styles.statusBadge, styles.statusNotStarted];
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'skipped':
      return 'Skipped';
    case 'in_progress':
      return 'In Progress';
    default:
      return 'Not Started';
  }
}

function renderStageData(
  stageData: StageData | null,
  showStageData: boolean = true
) {
  if (!stageData || !showStageData) return null;

  const dataFields: { label: string; value: string }[] = [];

  switch (stageData.stage) {
    case 'pre_hydro':
      dataFields.push(
        { label: 'Inspector', value: stageData.inspector || '—' },
        { label: 'NDE Complete', value: stageData.nde_complete ? 'Yes' : 'No' }
      );
      break;
    case 'test_acceptance':
      dataFields.push(
        {
          label: 'Gauge Numbers',
          value: stageData.gauge_numbers?.join(', ') || '—',
        },
        {
          label: 'Calibration Dates',
          value: stageData.calibration_dates?.join(', ') || '—',
        },
        { label: 'Time Held (min)', value: String(stageData.time_held || '—') }
      );
      break;
    case 'drain_flush':
      dataFields.push(
        { label: 'Drain Date', value: stageData.drain_date ? formatDate(stageData.drain_date) : '—' },
        { label: 'Flush Date', value: stageData.flush_date ? formatDate(stageData.flush_date) : '—' }
      );
      break;
    case 'post_hydro':
      dataFields.push(
        {
          label: 'Inspection Date',
          value: stageData.inspection_date ? formatDate(stageData.inspection_date) : '—',
        },
        { label: 'Defects Found', value: stageData.defects_found ? 'Yes' : 'No' }
      );
      if (stageData.defects_found && stageData.defect_description) {
        dataFields.push({
          label: 'Defect Description',
          value: stageData.defect_description,
        });
      }
      break;
    case 'protective_coatings':
      dataFields.push(
        { label: 'Coating Type', value: stageData.coating_type || '—' },
        { label: 'Client Paint Spec', value: stageData.client_paint_spec || '—' }
      );
      break;
    case 'insulation':
      dataFields.push(
        { label: 'Insulation Type', value: stageData.insulation_type || '—' },
        { label: 'Insulation Spec', value: stageData.insulation_spec || '—' }
      );
      break;
    case 'final_acceptance':
      dataFields.push({ label: 'Final Notes', value: stageData.final_notes || '—' });
      break;
  }

  return (
    <View style={styles.stageData}>
      {dataFields.map((field, index) => (
        <View key={index} style={styles.dataRow}>
          <Text style={styles.dataLabel}>{field.label}:</Text>
          <Text style={styles.dataValue}>{field.value}</Text>
        </View>
      ))}
    </View>
  );
}

function renderSignOffs(stage: PackageWorkflowStage, showSignOffs: boolean = true) {
  if (!stage.signoffs || stage.status !== 'completed' || !showSignOffs) return null;

  const signOffs = [];

  if (stage.signoffs.qc_rep) {
    signOffs.push({
      role: 'QC Representative',
      name: stage.signoffs.qc_rep.name,
      date: formatDate(stage.signoffs.qc_rep.date),
    });
  }

  if (stage.signoffs.client_rep) {
    signOffs.push({
      role: 'Client Representative',
      name: stage.signoffs.client_rep.name,
      date: formatDate(stage.signoffs.client_rep.date),
    });
  }

  if (stage.signoffs.mfg_rep) {
    signOffs.push({
      role: 'MFG Representative',
      name: stage.signoffs.mfg_rep.name,
      date: formatDate(stage.signoffs.mfg_rep.date),
    });
  }

  if (signOffs.length === 0) return null;

  return (
    <View style={styles.signOffs}>
      <Text style={styles.signOffTitle}>Sign-offs:</Text>
      {signOffs.map((signOff, index) => (
        <View key={index} style={styles.signOffRow}>
          <Text style={styles.dataLabel}>{signOff.role}:</Text>
          <Text style={styles.dataValue}>
            {signOff.name} ({signOff.date})
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * PackageWorkflowReportPDF Component
 */
export function PackageWorkflowReportPDF({
  packageData,
  workflowStages,
  projectName,
  generatedDate,
  companyLogo,
  options,
}: PackageWorkflowReportPDFProps) {
  // Determine report title (custom or default)
  const reportTitle = options?.customTitle || 'Test Package Workflow Report';

  // Determine what to show based on options (defaults to true if no options)
  const showPackageInfo = options?.includePackageInfo !== false;
  const showDescription = options?.includeDescription !== false;
  const showTestType = options?.includeTestType !== false;
  const showTargetDate = options?.includeTargetDate !== false;
  const showRequirements = options?.includeRequirements !== false;
  const showStageData = options?.showStageData !== false;
  const showSignOffs = options?.showSignOffs !== false;

  return (
    <Document>
      <Page size="A4" style={commonStyles.page}>
        <BrandedHeader
          logo={companyLogo}
          title={reportTitle}
          projectName={projectName}
          dimensionLabel={`Package: ${packageData.name}`}
          generatedDate={generatedDate}
        />

        {/* Custom Header Text */}
        {options?.customHeaderText && (
          <View style={styles.section}>
            <Text style={styles.value}>{options.customHeaderText}</Text>
          </View>
        )}

        {/* Package Information */}
        {showPackageInfo && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Package Information</Text>
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.label}>Package Name</Text>
                <Text style={styles.value}>{packageData.name}</Text>
              </View>

              {showTestType && packageData.test_type && (
                <View style={styles.infoItem}>
                  <Text style={styles.label}>Test Type</Text>
                  <Text style={styles.value}>{packageData.test_type}</Text>
                </View>
              )}

              {showDescription && packageData.description && (
                <View style={[styles.infoItem, { width: '100%' }]}>
                  <Text style={styles.label}>Description</Text>
                  <Text style={styles.value}>{packageData.description}</Text>
                </View>
              )}

              {showTargetDate && packageData.target_date && (
                <View style={styles.infoItem}>
                  <Text style={styles.label}>Target Date</Text>
                  <Text style={styles.value}>{formatDate(packageData.target_date)}</Text>
                </View>
              )}

              {showRequirements && (
                <>
                  <View style={styles.infoItem}>
                    <Text style={styles.label}>Requires Coating</Text>
                    <Text style={styles.value}>{packageData.requires_coating ? 'Yes' : 'No'}</Text>
                  </View>

                  <View style={styles.infoItem}>
                    <Text style={styles.label}>Requires Insulation</Text>
                    <Text style={styles.value}>{packageData.requires_insulation ? 'Yes' : 'No'}</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        )}

        {/* Workflow Stages */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workflow Stages</Text>
          {workflowStages.map((stage, index) => (
            <View key={index} style={styles.stageContainer}>
              <View style={styles.stageTitleRow}>
                <Text style={styles.stageTitle}>
                  {stage.stage_order}. {stage.stage_name}
                </Text>
                <Text style={getStatusBadgeStyle(stage.status)}>
                  {getStatusLabel(stage.status)}
                </Text>
              </View>

              {stage.status === 'skipped' && stage.skip_reason && (
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>Skip Reason:</Text>
                  <Text style={styles.dataValue}>{stage.skip_reason}</Text>
                </View>
              )}

              {stage.status === 'completed' && stage.completed_at && (
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>Completed:</Text>
                  <Text style={styles.dataValue}>{formatDate(stage.completed_at)}</Text>
                </View>
              )}

              {renderStageData(stage.stage_data, showStageData)}
              {renderSignOffs(stage, showSignOffs)}
            </View>
          ))}
        </View>

        {/* Custom Notes */}
        {options?.customNotes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Notes</Text>
            <Text style={styles.value}>{options.customNotes}</Text>
          </View>
        )}

        <ReportFooter />
      </Page>
    </Document>
  );
}
