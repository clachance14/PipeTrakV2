/**
 * ComponentsTable - Basic read-only component list for Sprint 1
 *
 * Feature: 005-sprint-1-core (T026)
 * Purpose: Validate useComponents hook integration with database
 *
 * Features:
 * - Display components in table format (4 columns)
 * - Filter by component_type (11 types) and is_retired
 * - Client-side sorting (percent_complete, last_updated_at)
 * - 100 row limit (no virtualization for Sprint 1)
 * - Loading and error states
 */

import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useComponents, type ComponentType } from '@/hooks/useComponents';

// Component types from progress templates (FR-041)
const COMPONENT_TYPES: ComponentType[] = [
  'spool',
  'field_weld',
  'support',
  'valve',
  'fitting',
  'flange',
  'instrument',
  'threaded_pipe',
  'tubing',
  'hose',
  'misc_component',
];

export function ComponentsTable() {
  const { projectId } = useParams<{ projectId: string }>();
  const [componentType, setComponentType] = useState<ComponentType | undefined>();
  const [isRetired, setIsRetired] = useState(false);
  const [sortBy, setSortBy] = useState<'percent_complete' | 'last_updated_at'>('last_updated_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Query components with filters
  const { data: components, isLoading, error } = useComponents(projectId!, {
    component_type: componentType,
    is_retired: isRetired,
  });

  // Client-side sorting (useComponents doesn't support order_by yet)
  const sortedComponents = useMemo(() => {
    if (!components) return [];

    const sorted = [...components].sort((a, b) => {
      if (sortBy === 'percent_complete') {
        const diff = a.percent_complete - b.percent_complete;
        return sortOrder === 'asc' ? diff : -diff;
      }

      // Sort by last_updated_at
      const dateA = new Date(a.last_updated_at).getTime();
      const dateB = new Date(b.last_updated_at).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

    return sorted.slice(0, 100); // Enforce 100 row limit
  }, [components, sortBy, sortOrder]);

  // Format component type for display
  const formatComponentType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Handle sort column click
  const handleSort = (column: 'percent_complete' | 'last_updated_at') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder(column === 'percent_complete' ? 'desc' : 'desc');
    }
  };

  if (!projectId) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error: No project selected</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Components</h1>
          <p className="text-sm text-gray-600 mt-1">
            Showing {sortedComponents.length} of {components?.length || 0} components
            {components && components.length > 100 && ' (limited to 100 rows)'}
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-4">
            {/* Component Type Dropdown */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Component Type
              </label>
              <select
                value={componentType || ''}
                onChange={(e) => setComponentType((e.target.value || undefined) as ComponentType | undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Types</option>
                {COMPONENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {formatComponentType(type)}
                  </option>
                ))}
              </select>
            </div>

            {/* Is Retired Toggle */}
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRetired}
                  onChange={(e) => setIsRetired(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Show Retired</span>
              </label>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading components...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-red-800">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-semibold">Error loading components</span>
            </div>
            <p className="mt-2 text-sm text-red-700">{error.message}</p>
          </div>
        )}

        {/* Components Table */}
        {!isLoading && !error && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Component Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Identity Key
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('percent_complete')}
                  >
                    <div className="flex items-center gap-1">
                      % Complete
                      {sortBy === 'percent_complete' && (
                        <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('last_updated_at')}
                  >
                    <div className="flex items-center gap-1">
                      Last Updated
                      {sortBy === 'last_updated_at' && (
                        <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedComponents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      No components found. Try adjusting your filters.
                    </td>
                  </tr>
                ) : (
                  sortedComponents.map((component) => (
                    <tr key={component.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatComponentType(component.component_type)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <pre className="text-xs font-mono bg-gray-50 rounded p-2 overflow-auto max-w-md">
                          {JSON.stringify(component.identity_key, null, 2)}
                        </pre>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${Math.min(component.percent_complete, 100)}%` }}
                            />
                          </div>
                          <span className="font-medium">{component.percent_complete.toFixed(2)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(component.last_updated_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
