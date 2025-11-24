/**
 * BrandedHeader Component
 *
 * Renders company logo, report title, project info at top of each PDF page.
 * Two-column layout: logo + title on left, metadata on right.
 *
 * @example
 * ```tsx
 * <BrandedHeader
 *   logo="data:image/png;base64,..." // Optional company logo
 *   title="PipeTrak Field Weld Progress Report"
 *   projectName="Pipeline Project 2025"
 *   dimensionLabel="By Area"
 *   generatedDate="2025-01-21"
 * />
 * ```
 */

import { View, Text, Image } from '@react-pdf/renderer';
import { commonStyles } from '../styles/commonStyles';
import type { BrandedHeaderProps } from '@/types/pdf-components';

/**
 * BrandedHeader Component
 *
 * @param props - Component props
 * @param props.logo - Optional base64-encoded company logo (PNG/JPEG, <50KB recommended)
 * @param props.title - Main report title
 * @param props.subtitle - Optional subtitle text
 * @param props.projectName - Project name displayed in metadata section
 * @param props.dimensionLabel - Report dimension (e.g., "By Area", "By System")
 * @param props.generatedDate - Report generation date (YYYY-MM-DD format)
 */
export function BrandedHeader({
  logo,
  title,
  subtitle,
  projectName,
  dimensionLabel,
  generatedDate,
}: BrandedHeaderProps) {
  return (
    <View style={commonStyles.headerContainer}>
      {/* Left side: Logo and title */}
      <View style={{ flexDirection: 'column', flex: 1 }}>
        {logo && (
          <Image
            src={logo}
            style={[commonStyles.logo, { marginBottom: 8 }]}
          />
        )}
        <Text style={commonStyles.title}>{title}</Text>
        {subtitle && (
          <Text style={commonStyles.subtitle}>{subtitle}</Text>
        )}
      </View>

      {/* Right side: Metadata */}
      <View style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
        <Text style={[commonStyles.body, { fontWeight: 'bold' }]}>
          {projectName}
        </Text>
        <Text style={[commonStyles.body, { marginTop: 4 }]}>
          Dimension: {dimensionLabel}
        </Text>
        <Text style={[commonStyles.body, { marginTop: 4 }]}>
          Generated: {generatedDate}
        </Text>
      </View>
    </View>
  );
}
