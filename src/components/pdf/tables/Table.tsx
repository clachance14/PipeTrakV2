/**
 * Table Component
 *
 * Complete PDF table with header, data rows, and optional grand total.
 * Composes TableHeader and TableRow components into a full table structure.
 *
 * @example
 * ```tsx
 * <Table
 *   columns={[
 *     { key: 'name', label: 'Name', width: '50%', align: 'left' },
 *     { key: 'total', label: 'Total', width: '25%', align: 'right', format: 'number' },
 *     { key: 'percent', label: 'Percent', width: '25%', align: 'right', format: 'percentage' }
 *   ]}
 *   data={[
 *     { name: 'Area A', total: 100, percent: 0.857 },
 *     { name: 'Area B', total: 50, percent: 0.714 }
 *   ]}
 *   grandTotal={{ name: 'Total', total: 150, percent: 0.800 }}
 *   highlightGrandTotal={true}
 * />
 * ```
 */

import { View } from '@react-pdf/renderer';
import { TableHeader } from './TableHeader';
import { TableRow } from './TableRow';
import type { TableProps } from '@/types/pdf-components';

/**
 * Table Component
 *
 * @param props - Component props
 * @param props.columns - Column definitions for the table
 * @param props.data - Array of data rows
 * @param props.grandTotal - Optional grand total row (appears at bottom)
 * @param props.highlightGrandTotal - Whether to highlight the grand total row (default: true)
 */
export function Table({
  columns,
  data,
  grandTotal,
  highlightGrandTotal = true,
}: TableProps) {
  return (
    <View style={{ marginTop: 10 }}>
      {/* Table Header */}
      <TableHeader columns={columns} />

      {/* Table Body */}
      {data.map((row, index) => (
        <TableRow
          key={`row-${index}`}
          columns={columns}
          data={row}
          highlighted={false}
        />
      ))}

      {/* Grand Total (optional) */}
      {grandTotal && (
        <TableRow
          columns={columns}
          data={grandTotal}
          highlighted={highlightGrandTotal}
        />
      )}
    </View>
  );
}
