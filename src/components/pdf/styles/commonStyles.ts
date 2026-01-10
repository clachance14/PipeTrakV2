/**
 * Shared PDF Styles
 * Common styles used across all PDF components
 * Uses @react-pdf/renderer StyleSheet API
 */

import { StyleSheet } from '@react-pdf/renderer';

/**
 * Project color palette (matching project design system)
 */
export const colors = {
  slate700: '#334155',  // Header backgrounds
  slate600: '#475569',  // Body text
  slate500: '#64748b',  // Subtle text
  slate50: '#f8fafc',   // Light backgrounds
  white: '#ffffff',     // Header text, white backgrounds
} as const;

/**
 * Common PDF styles
 * Organized by component concern
 */
export const commonStyles = StyleSheet.create({
  // Page layout
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: colors.slate600,
  },

  // Typography
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.slate700,
    marginBottom: 4,
  },

  subtitle: {
    fontSize: 12,
    color: colors.slate500,
    marginBottom: 8,
  },

  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.slate700,
    marginTop: 16,
    marginBottom: 8,
  },

  body: {
    fontSize: 10,
    color: colors.slate600,
    lineHeight: 1.4,
  },

  // Table styles
  tableHeader: {
    backgroundColor: colors.slate700,
    color: colors.white,
    fontWeight: 'bold',
    flexDirection: 'row',
    padding: 6,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },

  tableRow: {
    flexDirection: 'row',
    padding: 6,
    borderBottom: `1px solid ${colors.slate50}`,
  },

  tableRowHighlighted: {
    flexDirection: 'row',
    padding: 6,
    backgroundColor: colors.slate50,
    fontWeight: 'bold',
    borderBottom: `1px solid ${colors.slate700}`,
  },

  tableCell: {
    fontSize: 10,
    color: colors.slate600,
  },

  tableCellHeader: {
    fontSize: 10,
    color: colors.white,
    fontWeight: 'bold',
  },

  // Text alignment utilities
  alignLeft: {
    textAlign: 'left',
  },

  alignCenter: {
    textAlign: 'center',
  },

  alignRight: {
    textAlign: 'right',
  },

  // Layout utilities
  flexRow: {
    flexDirection: 'row',
  },

  flexColumn: {
    flexDirection: 'column',
  },

  spaceBetween: {
    justifyContent: 'space-between',
  },

  // Header/Footer
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottom: `2px solid ${colors.slate700}`,
  },

  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 10,
    borderTop: `1px solid ${colors.slate500}`,
    fontSize: 8,
    color: colors.slate500,
  },

  // Logo
  logo: {
    width: 100,
    height: 50,
    objectFit: 'contain',
  },
});
