/**
 * DrawingDetailSection Component
 * Feature 030: Enhanced Package Completion Report PDF
 *
 * Renders per-drawing content including:
 * - Drawing header with counts
 * - Component table
 * - NDE summary
 * - Optional weld log (based on includeWeldDetails flag)
 *
 * Uses wrap={false} on headers to prevent orphaned titles.
 *
 * @example
 * ```tsx
 * <DrawingDetailSection
 *   drawing={drawingGroup}
 *   includeWeldDetails={true}
 * />
 * ```
 */

import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { colors } from '../styles/commonStyles';
import { WeldLogTablePDF } from './WeldLogTablePDF';
import { aggregateComponentsForDisplay } from '@/lib/formatComponentIdentity';
import type { DrawingGroup } from '@/types/packageReport';

export interface DrawingDetailSectionProps {
  drawing: DrawingGroup;
  /** Include full weld log details (default: false) */
  includeWeldDetails?: boolean;
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    backgroundColor: colors.slate700,
    padding: 10,
    borderRadius: 4,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 9,
    color: '#CBD5E1',
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.slate700,
    marginTop: 12,
    marginBottom: 6,
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
    backgroundColor: '#F3F4F6',
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableHeaderCell: {
    fontSize: 8,
    fontWeight: 'bold',
    color: colors.slate700,
    textTransform: 'uppercase',
  },
  tableRow: {
    display: 'flex',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    padding: 6,
  },
  tableRowLast: {
    display: 'flex',
    flexDirection: 'row',
    padding: 6,
  },
  tableCell: {
    fontSize: 8,
    color: colors.slate600,
  },
  emptyState: {
    padding: 16,
    textAlign: 'center',
    color: colors.slate500,
    fontSize: 9,
    fontStyle: 'italic',
    backgroundColor: '#F9FAFB',
    borderRadius: 4,
  },
  noWelds: {
    padding: 12,
    textAlign: 'center',
    color: colors.slate500,
    fontSize: 9,
    fontStyle: 'italic',
    backgroundColor: '#F9FAFB',
    borderRadius: 4,
    marginTop: 8,
  },
});

export function DrawingDetailSection({
  drawing,
  includeWeldDetails = false,
}: DrawingDetailSectionProps) {
  const {
    drawing_no_norm,
    npd,
    piping_spec,
    component_count,
    unique_supports_count,
    components,
    nde_summary,
    weld_log,
  } = drawing;

  // Filter out supports for component table (supports shown separately)
  const nonSupportComponents = components.filter((c) => c.component_type !== 'support');

  // Aggregate identical components for display (e.g., 3x CV-26C02 | 2")
  const aggregatedComponents = aggregateComponentsForDisplay(nonSupportComponents);

  return (
    <View style={styles.container}>
      {/* Drawing Header - wrap={false} keeps header with first content */}
      <View style={styles.header} wrap={false}>
        <Text style={styles.headerTitle}>Drawing: {drawing_no_norm}</Text>
        <Text style={styles.headerSubtitle}>
          {npd && `NPD: ${npd}`}
          {npd && piping_spec && ' | '}
          {piping_spec && `Spec: ${piping_spec}`}
          {(npd || piping_spec) && ' | '}
          {component_count} Component{component_count !== 1 ? 's' : ''} |{' '}
          {unique_supports_count} Support{unique_supports_count !== 1 ? 's' : ''} |{' '}
          {nde_summary.total_welds} Weld{nde_summary.total_welds !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Component Table */}
      {aggregatedComponents.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Components</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Type</Text>
              <Text style={[styles.tableHeaderCell, { width: '55%' }]}>Identity</Text>
              <Text style={[styles.tableHeaderCell, { width: '20%', textAlign: 'right' }]}>Qty</Text>
            </View>
            {aggregatedComponents.map((component, index) => {
              const isLast = index === aggregatedComponents.length - 1;
              return (
                <View
                  key={`${component.component_type}-${component.identity_display}`}
                  style={isLast ? styles.tableRowLast : styles.tableRow}
                >
                  <Text style={[styles.tableCell, { width: '25%' }]}>{component.component_type}</Text>
                  <Text style={[styles.tableCell, { width: '55%' }]}>{component.identity_display}</Text>
                  <Text style={[styles.tableCell, { width: '20%', textAlign: 'right' }]}>
                    {component.quantity > 1 ? component.quantity : ''}
                  </Text>
                </View>
              );
            })}
          </View>
        </>
      )}

      {nonSupportComponents.length === 0 && (
        <View style={styles.emptyState}>
          <Text>No piping components in this drawing (supports only)</Text>
        </View>
      )}

      {/* Weld Log (conditional) */}
      {includeWeldDetails && weld_log.length > 0 && (
        <WeldLogTablePDF welds={weld_log} />
      )}

      {includeWeldDetails && weld_log.length === 0 && (
        <View style={styles.noWelds}>
          <Text>No welds in this drawing</Text>
        </View>
      )}
    </View>
  );
}
