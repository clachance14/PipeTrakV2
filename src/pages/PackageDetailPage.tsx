/**
 * Component: PackageDetailPage
 * Feature: 012-test-package-readiness
 *
 * Drill-down page showing all components in a test package.
 * Displays package header (name, description, progress) and component table.
 */

import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useProject } from '@/contexts/ProjectContext';
import { usePackageComponents, usePackageReadiness } from '@/hooks/usePackages';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';
import { ArrowLeft, Package, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PackageDetailPage() {
  const { packageId } = useParams<{ packageId: string }>();
  const { selectedProjectId } = useProject();
  const navigate = useNavigate();

  // Fetch package metadata for header
  const { data: packagesData, isLoading: packagesLoading } = usePackageReadiness(
    selectedProjectId || ''
  );

  // Fetch components in this package
  const {
    data: components,
    isLoading: componentsLoading,
    isError,
    error,
    refetch,
  } = usePackageComponents(packageId, selectedProjectId || '');

  // Find package metadata from readiness data
  // Note: description field added in migration 00028
  const foundPackage = packagesData?.find((pkg) => pkg.package_id === packageId);
  const packageData = foundPackage ? {
    ...foundPackage,
    description: (foundPackage as any).description || null,
  } : undefined;

  // No project selected
  if (!selectedProjectId) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <EmptyState
            icon={Package}
            title="No Project Selected"
            description="Please select a project from the dropdown to view test package details."
          />
        </div>
      </Layout>
    );
  }

  // Loading state
  if (packagesLoading || componentsLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <Button variant="ghost" onClick={() => navigate('/packages')} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Packages
            </Button>
            <div className="h-8 bg-gray-100 rounded w-1/3 animate-pulse mb-2" />
            <div className="h-4 bg-gray-100 rounded w-1/2 animate-pulse" />
          </div>
          <div className="space-y-2">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  // Error state
  if (isError) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Button variant="ghost" onClick={() => navigate('/packages')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Packages
          </Button>
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Failed to load package components
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {error?.message || 'An unexpected error occurred'}
            </p>
            <Button onClick={() => refetch()}>Retry</Button>
          </div>
        </div>
      </Layout>
    );
  }

  // Package not found
  if (!packageData) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Button variant="ghost" onClick={() => navigate('/packages')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Packages
          </Button>
          <EmptyState
            icon={Package}
            title="Package Not Found"
            description="The requested test package could not be found."
          />
        </div>
      </Layout>
    );
  }

  const progress = packageData.avg_percent_complete
    ? Math.round(packageData.avg_percent_complete)
    : 0;

  const statusColor =
    Number(packageData.blocker_count) > 0
      ? 'amber'
      : progress === 100
      ? 'green'
      : 'blue';

  const progressColorClass = {
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
  }[statusColor];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Back button */}
        <Button variant="ghost" onClick={() => navigate('/packages')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Packages
        </Button>

        {/* Package Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                {packageData.package_name}
              </h1>
              {packageData.description && (
                <p className="text-gray-600">{packageData.description}</p>
              )}
            </div>
            {packageData.target_date && (
              <div className="text-sm text-gray-600">
                Target: {new Date(packageData.target_date).toLocaleDateString()}
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600">Overall Progress</span>
              <span className="text-sm font-semibold text-gray-900">{progress}%</span>
            </div>
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn('h-full transition-all duration-300', progressColorClass)}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <span>{Number(packageData.total_components)} components</span>
            {Number(packageData.blocker_count) > 0 && (
              <span className="text-amber-600 font-medium">
                {packageData.blocker_count} blockers
              </span>
            )}
          </div>
        </div>

        {/* Components Table */}
        {!components || components.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No components in this package"
            description="Components will appear here once they are assigned to this test package."
          />
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                    Drawing
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                    Identity
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                    Progress
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                    Milestones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {components.map((component) => {
                  const componentProgress = component.percent_complete || 0;
                  const milestones = component.milestones_config || [];

                  return (
                    <tr key={component.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {component.drawing_no_norm || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {component.identityDisplay}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 capitalize">
                        {component.component_type}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500"
                              style={{ width: `${componentProgress}%` }}
                            />
                          </div>
                          <span className="text-gray-900 font-medium w-10 text-right">
                            {Math.round(componentProgress)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          {milestones.map((milestone) => {
                            const milestoneState = component.current_milestones?.[milestone.name];

                            // Determine completion state
                            let isComplete = false;
                            let isPartialProgress = false;
                            let progressPercent = 0;

                            if (milestone.is_partial) {
                              // Partial milestone (0-100)
                              progressPercent = typeof milestoneState === 'number' ? milestoneState : 0;
                              isComplete = progressPercent === 100;
                              isPartialProgress = progressPercent > 0 && progressPercent < 100;
                            } else {
                              // Discrete milestone (boolean)
                              isComplete = milestoneState === true;
                            }

                            return (
                              <div
                                key={milestone.name}
                                className={cn(
                                  'px-2 py-1 rounded text-xs font-medium',
                                  isComplete
                                    ? 'bg-green-500 text-white'
                                    : isPartialProgress
                                    ? 'bg-amber-400 text-amber-900'
                                    : 'bg-gray-200 text-gray-600'
                                )}
                                title={
                                  milestone.is_partial
                                    ? `${milestone.name}: ${progressPercent}%`
                                    : milestone.name
                                }
                              >
                                {milestone.name}
                                {milestone.is_partial && progressPercent > 0 && (
                                  <span className="ml-1">({progressPercent}%)</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
