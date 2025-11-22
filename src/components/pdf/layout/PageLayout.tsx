/**
 * PageLayout Component
 *
 * Wrapper component that combines header, content, and footer for PDF pages.
 * Simplifies page creation by handling common layout structure.
 *
 * @example
 * ```tsx
 * <PageLayout
 *   size="A4"
 *   orientation="landscape"
 *   headerProps={{
 *     title: "My Report",
 *     projectName: "Project X",
 *     dimensionLabel: "By Area",
 *     generatedDate: "2025-01-21"
 *   }}
 *   footerProps={{ showPageNumbers: true }}
 * >
 *   <View><Text>Report content here</Text></View>
 * </PageLayout>
 * ```
 */

import { Page, View } from '@react-pdf/renderer';
import { BrandedHeader } from './BrandedHeader';
import { ReportFooter } from './ReportFooter';
import { commonStyles } from '../styles/commonStyles';
import type { PageLayoutProps } from '@/types/pdf-components';

/**
 * PageLayout Component
 *
 * @param props - Component props
 * @param props.size - Page size (default: "A4")
 * @param props.orientation - Page orientation ("portrait" or "landscape")
 * @param props.showHeader - Whether to render header (default: true)
 * @param props.showFooter - Whether to render footer (default: true)
 * @param props.headerProps - Props for BrandedHeader component
 * @param props.footerProps - Props for ReportFooter component
 * @param props.children - Page content
 */
export function PageLayout({
  size = 'A4',
  orientation,
  showHeader = true,
  showFooter = true,
  headerProps,
  footerProps,
  children,
}: PageLayoutProps) {
  return (
    <Page size={size} orientation={orientation} style={commonStyles.page}>
      {/* Header (optional) */}
      {showHeader && headerProps && (
        <BrandedHeader {...headerProps} />
      )}

      {/* Content */}
      <View style={{ flex: 1 }}>
        {children}
      </View>

      {/* Footer (optional) */}
      {showFooter && footerProps && (
        <ReportFooter {...footerProps} />
      )}
    </Page>
  );
}
