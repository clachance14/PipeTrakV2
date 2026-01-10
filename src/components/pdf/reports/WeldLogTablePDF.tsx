/**
 * WeldLogTablePDF Component
 * Feature 030: Enhanced Package Completion Report PDF
 *
 * Renders weld log table with pagination support.
 * Automatically chunks data into 30-row pages to prevent
 * overly long tables that break PDF rendering.
 *
 * @example
 * ```tsx
 * <WeldLogTablePDF welds={weldLogEntries} />
 * <WeldLogTablePDF welds={weldLogEntries} pageSize={25} />
 * ```
 */

import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { colors } from '../styles/commonStyles';
import type { WeldLogEntry } from '@/types/packageReport';

export interface WeldLogTablePDFProps {
  welds: WeldLogEntry[];
  /** Rows per page chunk (default: 30) */
  pageSize?: number;
  /** Show section title (default: true) */
  showTitle?: boolean;
}

const styles = StyleSheet.create({
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
    marginBottom: 8,
  },
  tableHeader: {
    display: 'flex',
    flexDirection: 'row',
    backgroundColor: colors.slate700,
    padding: 6,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tableHeaderCell: {
    fontSize: 7,
    fontWeight: 'bold',
    color: 'white',
    textTransform: 'uppercase',
  },
  tableRow: {
    display: 'flex',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    padding: 5,
  },
  tableRowLast: {
    display: 'flex',
    flexDirection: 'row',
    padding: 5,
  },
  tableRowAlt: {
    display: 'flex',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    padding: 5,
    backgroundColor: '#F9FAFB',
  },
  tableCell: {
    fontSize: 7,
    color: colors.slate600,
  },
  ndePass: {
    color: '#059669',
    fontWeight: 'bold',
    fontStyle: 'normal' as const,
  },
  ndeFail: {
    color: '#DC2626',
    fontWeight: 'bold',
    fontStyle: 'normal' as const,
  },
  ndePending: {
    color: '#D97706',
    fontStyle: 'normal' as const,
  },
  ndeNotRequired: {
    color: colors.slate500,
    fontStyle: 'italic' as const,
  },
  emptyState: {
    padding: 12,
    textAlign: 'center',
    color: colors.slate500,
    fontSize: 9,
    fontStyle: 'italic',
    backgroundColor: '#F9FAFB',
    borderRadius: 4,
  },
  pageInfo: {
    fontSize: 7,
    color: colors.slate500,
    textAlign: 'right',
    marginBottom: 4,
  },
});

/**
 * Format date for display
 */
function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: '2-digit',
      timeZone: 'UTC',
    });
  } catch {
    return '-';
  }
}

/**
 * Chunk array into pages
 * Guards against invalid size to prevent infinite loops
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const safeSize = Number.isFinite(size) && size > 0 ? Math.floor(size) : 1;
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += safeSize) {
    chunks.push(array.slice(i, i + safeSize));
  }
  return chunks;
}

export function WeldLogTablePDF({
  welds,
  pageSize = 30,
  showTitle = true,
}: WeldLogTablePDFProps) {
  if (welds.length === 0) {
    return (
      <>
        {showTitle && <Text style={styles.sectionLabel}>Weld Log</Text>}
        <View style={styles.emptyState}>
          <Text>No welds in this section</Text>
        </View>
      </>
    );
  }

  // Chunk welds into pages
  const pages = chunkArray(welds, pageSize);
  const showPageInfo = pages.length > 1;

  return (
    <>
      {showTitle && <Text style={styles.sectionLabel}>Weld Log</Text>}

      {pages.map((pageWelds, pageIndex) => (
        <View key={pageIndex} wrap={pageIndex > 0}>
          {showPageInfo && (
            <Text style={styles.pageInfo}>
              Page {pageIndex + 1} of {pages.length} ({welds.length} total welds)
            </Text>
          )}

          <View style={styles.table}>
            {/* Header - repeated on each page chunk */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: '12%' }]}>Weld #</Text>
              <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Component</Text>
              <Text style={[styles.tableHeaderCell, { width: '10%' }]}>Type</Text>
              <Text style={[styles.tableHeaderCell, { width: '13%' }]}>Welder</Text>
              <Text style={[styles.tableHeaderCell, { width: '12%' }]}>Date</Text>
              <Text style={[styles.tableHeaderCell, { width: '10%' }]}>NDE Req</Text>
              <Text style={[styles.tableHeaderCell, { width: '10%' }]}>NDE Type</Text>
              <Text style={[styles.tableHeaderCell, { width: '10%' }]}>Result</Text>
              <Text style={[styles.tableHeaderCell, { width: '8%' }]}>Date</Text>
            </View>

            {/* Data rows */}
            {pageWelds.map((weld, index) => {
              const isLast = index === pageWelds.length - 1;
              const isAlt = index % 2 === 1;

              // Determine NDE result styling and text
              const getNdeResultStyle = () => {
                if (!weld.nde_required) return styles.ndeNotRequired;
                if (weld.nde_result === 'PASS') return styles.ndePass;
                if (weld.nde_result === 'FAIL') return styles.ndeFail;
                return styles.ndePending;
              };

              const getNdeResultText = () => {
                if (!weld.nde_required) return '-';
                if (weld.nde_result === 'PASS') return 'PASS';
                if (weld.nde_result === 'FAIL') return 'FAIL';
                return 'Pending';
              };

              return (
                <View
                  key={weld.id}
                  style={
                    isLast
                      ? styles.tableRowLast
                      : isAlt
                        ? styles.tableRowAlt
                        : styles.tableRow
                  }
                >
                  <Text style={[styles.tableCell, { width: '12%' }]}>
                    {weld.weld_display_name}
                  </Text>
                  <Text style={[styles.tableCell, { width: '15%' }]}>
                    {String(weld.component_identity_key ?? '')}
                  </Text>
                  <Text style={[styles.tableCell, { width: '10%' }]}>{weld.weld_type || '-'}</Text>
                  <Text style={[styles.tableCell, { width: '13%' }]}>
                    {weld.welder_name || '-'}
                  </Text>
                  <Text style={[styles.tableCell, { width: '12%' }]}>
                    {formatDate(weld.date_welded)}
                  </Text>
                  <Text style={[styles.tableCell, { width: '10%' }]}>
                    {weld.nde_required ? 'Yes' : 'No'}
                  </Text>
                  <Text style={[styles.tableCell, { width: '10%' }]}>
                    {weld.nde_required ? weld.nde_type || '-' : '-'}
                  </Text>
                  <Text style={[styles.tableCell, { width: '10%' }, getNdeResultStyle()]}>
                    {getNdeResultText()}
                  </Text>
                  <Text style={[styles.tableCell, { width: '8%' }]}>
                    {weld.nde_required ? formatDate(weld.nde_date) : '-'}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </>
  );
}
