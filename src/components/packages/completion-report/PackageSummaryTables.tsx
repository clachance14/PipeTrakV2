/**
 * Package Summary Tables Component
 * Feature 030: Package Completion Report - Component and Support summaries
 *
 * Displays package-level summary tables for components and supports.
 */

import type { ComponentSummaryRow, SupportSummaryRow } from '@/types/packageReport';

interface PackageSummaryTablesProps {
  componentSummary: ComponentSummaryRow[];
  supportSummary: SupportSummaryRow[];
}

export function PackageSummaryTables({
  componentSummary,
  supportSummary,
}: PackageSummaryTablesProps) {
  return (
    <div className="space-y-6 mb-6">
      {/* Component Summary Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Component Summary</h3>
        </div>
        <div className="overflow-x-auto">
          {componentSummary.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              No components in this package
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Identity
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {componentSummary.map((row, index) => (
                  <tr key={`${row.component_type}-${row.identity_display}-${index}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {row.component_type}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {row.identity_display}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                      {row.quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Support Summary Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Support Summary</h3>
        </div>
        <div className="overflow-x-auto">
          {supportSummary.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              No supports in this package
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commodity Code
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {supportSummary.map((row, index) => (
                  <tr key={`${row.commodity_code}-${row.size}-${index}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {row.commodity_code}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {row.size}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                      {row.quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
