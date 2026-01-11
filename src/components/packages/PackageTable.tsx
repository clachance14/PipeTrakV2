import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Edit, AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PackageCardData } from './PackageCard';

export interface PackageTableProps {
  packages: PackageCardData[];
  onEdit?: (pkgId: string) => void;
  showManhours?: boolean; // Permission-gated manhour display
}

type SortField = 'name' | 'description' | 'status' | 'progress' | 'testReadyPercent' | 'componentCount' | 'blockerCount' | 'targetDate' | 'budgetedManhours';
type SortDirection = 'asc' | 'desc';

/**
 * Package table component with sortable columns
 * Shows packages in a data table with columns for name, description, status, progress, components, blockers, and target date
 * All columns are sortable by clicking the column header
 */
export function PackageTable({ packages, onEdit, showManhours }: PackageTableProps) {
  const navigate = useNavigate();

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort packages
  const sortedPackages = useMemo(() => {
    const sorted = [...packages];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          // Natural sort (handles numbers within strings correctly)
          comparison = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
          break;
        case 'description':
          // Case-insensitive sort
          comparison = (a.description || '').localeCompare(b.description || '', undefined, { sensitivity: 'base' });
          break;
        case 'status':
          comparison = a.statusColor.localeCompare(b.statusColor);
          break;
        case 'progress':
          comparison = a.progress - b.progress;
          break;
        case 'testReadyPercent':
          comparison = (a.testReadyPercent ?? 0) - (b.testReadyPercent ?? 0);
          break;
        case 'componentCount':
          comparison = a.componentCount - b.componentCount;
          break;
        case 'blockerCount':
          comparison = a.blockerCount - b.blockerCount;
          break;
        case 'targetDate':
          if (!a.targetDate && !b.targetDate) comparison = 0;
          else if (!a.targetDate) comparison = 1;
          else if (!b.targetDate) comparison = -1;
          else comparison = new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
          break;
        case 'budgetedManhours': {
          // Nulls/zeros last, then sort descending (highest MH first)
          const aMh = a.budgetedManhours || 0;
          const bMh = b.budgetedManhours || 0;
          comparison = aMh - bMh;
          break;
        }
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [packages, sortField, sortDirection]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4 inline ml-1" />
    ) : (
      <ChevronDown className="w-4 h-4 inline ml-1" />
    );
  };

  const getStatusBadge = (statusColor: 'green' | 'blue' | 'amber') => {
    const classes = {
      green: 'bg-green-100 text-green-800',
      blue: 'bg-blue-100 text-blue-800',
      amber: 'bg-amber-100 text-amber-800'
    };

    const labels = {
      green: 'Complete',
      blue: 'In Progress',
      amber: 'Blocked'
    };

    return (
      <span className={cn('inline-flex items-center px-2 py-1 rounded-md text-xs font-medium', classes[statusColor])}>
        {labels[statusColor]}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('name')}
              >
                Package <SortIcon field="name" />
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('description')}
              >
                Description <SortIcon field="description" />
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('status')}
              >
                Status <SortIcon field="status" />
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('progress')}
              >
                Progress <SortIcon field="progress" />
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('testReadyPercent')}
              >
                Test Ready <SortIcon field="testReadyPercent" />
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('componentCount')}
              >
                Components <SortIcon field="componentCount" />
              </th>
              {showManhours && (
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('budgetedManhours')}
                >
                  Manhours <SortIcon field="budgetedManhours" />
                </th>
              )}
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('blockerCount')}
              >
                Blockers <SortIcon field="blockerCount" />
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('targetDate')}
              >
                Target Date <SortIcon field="targetDate" />
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedPackages.map((pkg) => (
              <tr
                key={pkg.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => navigate(`/packages/${pkg.id}/components`)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-900">{pkg.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                  {pkg.description || '—'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(pkg.statusColor)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full transition-all duration-300', {
                          'bg-green-500': pkg.statusColor === 'green',
                          'bg-blue-500': pkg.statusColor === 'blue',
                          'bg-amber-500': pkg.statusColor === 'amber'
                        })}
                        style={{ width: `${pkg.progress}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 min-w-[3rem] text-right">
                      {pkg.progress}%
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {pkg.postHydroComponents && pkg.postHydroComponents > 0 ? (
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-green-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 transition-all duration-300"
                          style={{ width: `${pkg.testReadyPercent ?? 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-green-600 min-w-[3rem] text-right">
                        {Math.round(pkg.testReadyPercent ?? 0)}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">—</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {pkg.componentCount}
                </td>
                {showManhours && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {pkg.budgetedManhours && pkg.budgetedManhours > 0
                      ? Math.round(pkg.budgetedManhours)
                      : '—'}
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap">
                  {pkg.blockerCount > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded-md text-xs font-medium">
                      <AlertTriangle className="h-3 w-3" />
                      {pkg.blockerCount}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-500">—</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {pkg.targetDate ? new Date(pkg.targetDate).toLocaleDateString() : '—'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  {onEdit && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(pkg.id);
                      }}
                      aria-label="Edit package"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Empty state */}
        {sortedPackages.length === 0 && (
          <div className="text-center py-12 bg-gray-50">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No packages found</h3>
            <p className="mt-1 text-sm text-gray-500">No packages available</p>
          </div>
        )}
      </div>
    </div>
  );
}
