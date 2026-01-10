/**
 * WorkflowSignoffsTable Component
 * Feature 030: Enhanced Package Completion Report PDF
 *
 * Displays workflow sign-offs in a table format.
 * Supports showing all stages or just key stages.
 *
 * @example
 * ```tsx
 * // All stages
 * <WorkflowSignoffsTable stages={workflowStages} showAll />
 *
 * // Key stages only (default)
 * <WorkflowSignoffsTable stages={workflowStages} />
 * ```
 */

import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { colors } from '../styles/commonStyles';
import { getKeyStages, formatStageForDisplay } from '@/lib/getKeyStages';
import type { PackageWorkflowStage } from '@/types/workflow.types';

export interface WorkflowSignoffsTableProps {
  stages: PackageWorkflowStage[];
  /** Show all stages instead of just key stages (default: false) */
  showAll?: boolean;
  /** Custom title (default: "Key Approvals" or "Workflow Approvals") */
  title?: string;
}

const styles = StyleSheet.create({
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
  table: {
    display: 'flex',
    flexDirection: 'column',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 4,
  },
  tableHeader: {
    display: 'flex',
    flexDirection: 'row',
    backgroundColor: colors.slate700,
    padding: 8,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tableHeaderCell: {
    fontSize: 9,
    color: 'white',
    fontWeight: 'bold',
  },
  tableRow: {
    display: 'flex',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    padding: 8,
  },
  tableRowLast: {
    display: 'flex',
    flexDirection: 'row',
    padding: 8,
  },
  tableCell: {
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
  statusInProgress: {
    color: '#3B82F6',
  },
  emptyState: {
    padding: 16,
    textAlign: 'center',
    color: colors.slate500,
    fontSize: 9,
    fontStyle: 'italic',
  },
});

export function WorkflowSignoffsTable({
  stages,
  showAll = false,
  title,
}: WorkflowSignoffsTableProps) {
  // Determine which stages to show
  const displayStages = showAll ? stages : getKeyStages(stages);

  // Determine title
  const sectionTitle = title || (showAll ? 'Workflow Approvals' : 'Key Approvals');

  if (displayStages.length === 0) {
    return (
      <>
        <Text style={styles.sectionTitle}>{sectionTitle}</Text>
        <View style={styles.emptyState}>
          <Text>No workflow stages available</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Text style={styles.sectionTitle}>{sectionTitle}</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { width: '28%' }]}>Stage</Text>
          <Text style={[styles.tableHeaderCell, { width: '17%' }]}>Status</Text>
          <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Company Rep</Text>
          <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Client Rep</Text>
          <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Date</Text>
        </View>
        {displayStages.map((stage, index) => {
          const formatted = formatStageForDisplay(stage);
          const isLast = index === displayStages.length - 1;

          let statusStyle = styles.statusPending;
          let statusText = 'Pending';

          if (formatted.status === 'completed') {
            statusStyle = styles.statusCompleted;
            statusText = 'Completed';
          } else if (formatted.status === 'skipped') {
            statusStyle = styles.statusSkipped;
            statusText = 'Skipped';
          } else if (stage.status === 'in_progress') {
            statusStyle = styles.statusInProgress;
            statusText = 'In Progress';
          }

          return (
            <View key={stage.id} style={isLast ? styles.tableRowLast : styles.tableRow}>
              <Text style={[styles.tableCell, { width: '28%' }]}>{formatted.name}</Text>
              <Text style={[styles.tableCell, { width: '17%' }, statusStyle]}>{statusText}</Text>
              <Text style={[styles.tableCell, { width: '20%' }]}>
                {formatted.companyRep || '-'}
              </Text>
              <Text style={[styles.tableCell, { width: '20%' }]}>
                {formatted.clientRep || '-'}
              </Text>
              <Text style={[styles.tableCell, { width: '15%' }]}>
                {formatted.completedDate || '-'}
              </Text>
            </View>
          );
        })}
      </View>
    </>
  );
}
