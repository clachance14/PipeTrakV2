/**
 * ReportFooter Component
 *
 * Renders page numbers and optional company info at bottom of each PDF page.
 * Uses @react-pdf/renderer's fixed positioning to appear on every page.
 *
 * @example
 * ```tsx
 * <ReportFooter
 *   companyInfo="Acme Corporation"
 *   showPageNumbers={true}
 * />
 * ```
 */

import { View, Text } from '@react-pdf/renderer';
import { commonStyles } from '../styles/commonStyles';
import type { ReportFooterProps } from '@/types/pdf-components';

/**
 * ReportFooter Component
 *
 * @param props - Component props
 * @param props.companyInfo - Optional company name/info displayed on left
 * @param props.showPageNumbers - Whether to display "Page X of Y" on right (default: true)
 */
export function ReportFooter({
  companyInfo,
  showPageNumbers = true,
}: ReportFooterProps) {
  return (
    <View style={commonStyles.footerContainer} fixed>
      {/* Left side: Company info */}
      <View>
        {companyInfo && (
          <Text>{companyInfo}</Text>
        )}
      </View>

      {/* Right side: Page numbers */}
      <View>
        {showPageNumbers && (
          <Text render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          } />
        )}
      </View>
    </View>
  );
}
