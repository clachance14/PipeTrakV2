/**
 * TableHeader Component
 *
 * Renders the header row of a PDF table with column labels.
 * Applies bold styling and background color from commonStyles.
 *
 * @example
 * ```tsx
 * <TableHeader
 *   columns={[
 *     { key: 'name', label: 'Name', width: '40%', align: 'left' },
 *     { key: 'count', label: 'Count', width: '30%', align: 'right', format: 'number' },
 *     { key: 'percent', label: 'Percent', width: '30%', align: 'right', format: 'percentage' }
 *   ]}
 * />
 * ```
 */

import { View, Text } from '@react-pdf/renderer';
import { commonStyles } from '../styles/commonStyles';
import type { TableHeaderProps } from '@/types/pdf-components';

/**
 * TableHeader Component
 *
 * @param props - Component props
 * @param props.columns - Column definitions with key, label, width, alignment, and format
 */
export function TableHeader({ columns }: TableHeaderProps) {
  return (
    <View style={commonStyles.tableHeader}>
      {columns.map((column) => (
        <View
          key={column.key}
          style={{
            width: column.width,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: column.align === 'right' ? 'flex-end' :
                           column.align === 'center' ? 'center' : 'flex-start',
          }}
        >
          <Text style={commonStyles.tableCellHeader}>
            {column.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
