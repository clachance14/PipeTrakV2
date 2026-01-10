/**
 * CertificateSection Component
 * Feature 030: Enhanced Package Completion Report PDF
 *
 * Displays test certificate reference information with pending fallback.
 * Shows certificate number, test parameters when available, or pending state.
 *
 * @example
 * ```tsx
 * <CertificateSection certificate={certificate} />
 * <CertificateSection certificate={null} /> // Shows pending state
 * ```
 */

import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { colors } from '../styles/commonStyles';
import type { PackageCertificate } from '@/hooks/usePackageCertificate';

export interface CertificateSectionProps {
  certificate: PackageCertificate | null;
  /** Show compact version without all details (default: false) */
  compact?: boolean;
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
  certificateSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
  },
  certificateRow: {
    display: 'flex',
    flexDirection: 'row',
    marginBottom: 6,
  },
  certificateRowLast: {
    display: 'flex',
    flexDirection: 'row',
  },
  certificateLabel: {
    fontSize: 9,
    color: colors.slate500,
    width: 120,
  },
  certificateValue: {
    fontSize: 9,
    color: colors.slate700,
    fontWeight: 'bold',
  },
  certificatePending: {
    backgroundColor: '#FEF3C7',
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
  },
  certificatePendingText: {
    fontSize: 9,
    color: '#92400E',
    fontStyle: 'italic',
  },
  compactContainer: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  compactItem: {
    display: 'flex',
    flexDirection: 'row',
    marginRight: 16,
  },
});

export function CertificateSection({ certificate, compact = false }: CertificateSectionProps) {
  if (!certificate) {
    return (
      <>
        <Text style={styles.sectionTitle}>Test Certificate</Text>
        <View style={styles.certificatePending}>
          <Text style={styles.certificatePendingText}>
            Test certificate pending. Certificate will be generated after test completion.
          </Text>
        </View>
      </>
    );
  }

  if (compact) {
    return (
      <>
        <Text style={styles.sectionTitle}>Test Certificate</Text>
        <View style={styles.certificateSection}>
          <View style={styles.compactContainer}>
            <View style={styles.compactItem}>
              <Text style={styles.certificateLabel}>Cert #:</Text>
              <Text style={styles.certificateValue}>{certificate.certificate_number}</Text>
            </View>
            <View style={styles.compactItem}>
              <Text style={styles.certificateLabel}>Pressure:</Text>
              <Text style={styles.certificateValue}>
                {certificate.test_pressure} {certificate.pressure_unit}
              </Text>
            </View>
            <View style={styles.compactItem}>
              <Text style={styles.certificateLabel}>Media:</Text>
              <Text style={styles.certificateValue}>{certificate.test_media}</Text>
            </View>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Text style={styles.sectionTitle}>Test Certificate</Text>
      <View style={styles.certificateSection}>
        <View style={styles.certificateRow}>
          <Text style={styles.certificateLabel}>Certificate Number:</Text>
          <Text style={styles.certificateValue}>{certificate.certificate_number}</Text>
        </View>
        <View style={styles.certificateRow}>
          <Text style={styles.certificateLabel}>Test Pressure:</Text>
          <Text style={styles.certificateValue}>
            {certificate.test_pressure} {certificate.pressure_unit}
          </Text>
        </View>
        <View style={styles.certificateRow}>
          <Text style={styles.certificateLabel}>Test Media:</Text>
          <Text style={styles.certificateValue}>{certificate.test_media}</Text>
        </View>
        <View style={styles.certificateRow}>
          <Text style={styles.certificateLabel}>Temperature:</Text>
          <Text style={styles.certificateValue}>
            {certificate.temperature}°{certificate.temperature_unit}
          </Text>
        </View>
        {certificate.client && (
          <View style={styles.certificateRow}>
            <Text style={styles.certificateLabel}>Client:</Text>
            <Text style={styles.certificateValue}>{certificate.client}</Text>
          </View>
        )}
        {certificate.client_spec && (
          <View style={styles.certificateRow}>
            <Text style={styles.certificateLabel}>Client Spec:</Text>
            <Text style={styles.certificateValue}>{certificate.client_spec}</Text>
          </View>
        )}
        {certificate.line_number && (
          <View style={styles.certificateRowLast}>
            <Text style={styles.certificateLabel}>Line Number:</Text>
            <Text style={styles.certificateValue}>{certificate.line_number}</Text>
          </View>
        )}
      </View>
    </>
  );
}
