import { CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/PermissionGate';
import { cn } from '@/lib/utils';

export type WelderStatus = 'verified' | 'unverified';

export interface WelderRow {
  id: string;
  name: string;
  stencil: string;
  status: WelderStatus;
  weldCount: number;
  verifiedAt?: string;
  verifiedBy?: string;
}

export interface WelderTableProps {
  welders: WelderRow[];
  onVerify: (id: string) => void;
  onAdd: () => void;
}

/**
 * Welder table component with status badges, weld counts, and actions
 * Shows verification status and allows adding/verifying welders
 */
export function WelderTable({ welders, onVerify, onAdd }: WelderTableProps) {
  return (
    <div className="space-y-4">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Welders</h2>
        <PermissionGate permission="can_manage_welders">
          <Button onClick={onAdd}>Add Welder</Button>
        </PermissionGate>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stencil
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Weld Count
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Verified Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {welders.map((welder) => (
              <tr key={welder.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {welder.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                  {welder.stencil}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {welder.status === 'verified' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-md text-xs font-medium">
                      <CheckCircle className="h-3 w-3" />
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded-md text-xs font-medium">
                      <XCircle className="h-3 w-3" />
                      Unverified
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {welder.weldCount}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {welder.verifiedAt
                    ? new Date(welder.verifiedAt).toLocaleDateString()
                    : '—'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  {welder.status === 'unverified' && (
                    <PermissionGate permission="can_manage_welders">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onVerify(welder.id)}
                      >
                        Verify
                      </Button>
                    </PermissionGate>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
