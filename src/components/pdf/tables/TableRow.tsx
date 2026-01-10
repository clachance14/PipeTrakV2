/**
 * TableRow Component
 *
 * Renders a single data row in a PDF table with formatted cells.
 * Supports multiple format types: text, number (with commas), percentage, and decimal.
 * Optionally highlights the row (e.g., for grand totals).
 *
 * @example
 * ```tsx
 * <TableRow
 *   columns={[
 *     { key: 'name', label: 'Name', width: '40%', align: 'left' },
 *     { key: 'count', label: 'Count', width: '30%', align: 'right', format: 'number' }
 *   ]}
 *   data={{ name: 'Area A', count: 1234 }}
 *   highlighted={false}
 * />
 * // Renders: "Area A" | "1,234"
 * ```
 */

import { View, Text } from '@react-pdf/renderer';
import { commonStyles } from '../styles/commonStyles';
import type { TableRowProps } from '@/types/pdf-components';

/**
 * Format cell value according to column format type
 *
 * @param value - Raw cell value (string, number, or null)
 * @param format - Format type: 'text' | 'number' | 'percentage' | 'decimal'
 * @returns Formatted string representation
 *
 * @example
 * formatCellValue(1234, 'number') // "1,234"
 * formatCellValue(0.857, 'percentage') // "85.7%"
 * formatCellValue(3.14159, 'decimal') // "3.1"
 * formatCellValue(null, 'text') // "-"
 */
function formatCellValue(
  value: string | number | null,
  format: 'text' | 'number' | 'percentage' | 'decimal' = 'text'
): string {
  if (value === null || value === undefined) return '-';

  switch (format) {
    case 'text':
      return String(value);

    case 'number':
      return typeof value === 'number'
        ? value.toLocaleString('en-US', { maximumFractionDigits: 0 })
        : String(value);

    case 'percentage':
      return typeof value === 'number'
        ? `${value.toFixed(1)}%`
        : String(value);

    case 'decimal':
      return typeof value === 'number'
        ? value.toFixed(1)
        : String(value);

    default:
      return String(value);
  }
}

/**
 * TableRow Component
 *
 * @param props - Component props
 * @param props.columns - Column definitions with format and alignment settings
 * @param props.data - Row data object with keys matching column keys
 * @param props.highlighted - Whether to apply highlighted styling (default: false)
 */
export function TableRow({ columns, data, highlighted = false }: TableRowProps) {
  const rowStyle = highlighted ? commonStyles.tableRowHighlighted : commonStyles.tableRow;

  return (
    <View style={rowStyle}>
      {columns.map((column) => {
        const cellValue = data[column.key] ?? null;
        const formattedValue = formatCellValue(cellValue, column.format);

        return (
          <View
            key={column.key}
            style={{
              width: column.width,
              flexShrink: 0,
              flexGrow: 0,
              flexBasis: column.width,
              overflow: 'hidden',
              paddingHorizontal: 2,
            }}
          >
            <Text style={{
              ...commonStyles.tableCell,
              textAlign: column.align || 'left',
            }}>
              {formattedValue}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
