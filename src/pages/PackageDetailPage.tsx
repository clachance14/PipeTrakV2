/**
 * Component: PackageDetailPage
 * Feature: 030-test-package-workflow (User Stories 3 & 4)
 *
 * Drill-down page showing test package details with tabbed interface:
 * - Certificate: Form to fill out test certificate (US3)
 * - Workflow: 7-stage workflow stepper with sign-offs (US4)
 * - Components: List of all components in package
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useProject } from '@/contexts/ProjectContext';
import { usePackageComponents, usePackageReadiness, usePackageDetails } from '@/hooks/usePackages';
import { usePackageCertificate } from '@/hooks/usePackageCertificate';
import { PackageCertificateForm } from '@/components/packages/PackageCertificateForm';
import { PackageWorkflowStepper } from '@/components/packages/PackageWorkflowStepper';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/EmptyState';
import { ArrowLeft, Package, AlertCircle, FileText, ClipboardList, Boxes } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PackageCertificate } from '@/hooks/usePackageCertificate';

export function PackageDetailPage() {
  const { packageId } = useParams<{ packageId: string }>();
  const { selectedProjectId } = useProject();
  const navigate = useNavigate();
  const [editCertificate, setEditCertificate] = useState(false);

  // Fetch package metadata for header
  const { data: packagesData, isLoading: packagesLoading } = usePackageReadiness(
    selectedProjectId || ''
  );

  // Fetch package details (including test_type)
  const { data: packageDetails } = usePackageDetails(packageId);

  // Fetch certificate
  const { data: certificate } =
    usePackageCertificate(packageId);

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

        {/* Tabs */}
        <Tabs defaultValue="certificate" className="space-y-6">
          <TabsList>
            <TabsTrigger value="certificate">
              <FileText className="h-4 w-4 mr-2" />
              Certificate
              {certificate && (
                <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-green-500 rounded-full">
                  ✓
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="workflow">
              <ClipboardList className="h-4 w-4 mr-2" />
              Workflow
            </TabsTrigger>
            <TabsTrigger value="components">
              <Boxes className="h-4 w-4 mr-2" />
              Components ({components?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Certificate Tab */}
          <TabsContent value="certificate" className="space-y-6">
            {certificate && !editCertificate ? (
              <CertificateReadOnlyView
                certificate={certificate}
                onEdit={() => setEditCertificate(true)}
              />
            ) : (
              <PackageCertificateForm
                packageId={packageId!}
                projectId={selectedProjectId!}
                packageName={packageData.package_name || ''}
                packageTestType={(packageDetails?.test_type as any) || null}
                onSuccess={() => setEditCertificate(false)}
              />
            )}
          </TabsContent>

          {/* Workflow Tab */}
          <TabsContent value="workflow">
            {packageId && <PackageWorkflowStepper packageId={packageId} />}
          </TabsContent>

          {/* Components Tab */}
          <TabsContent value="components">
            {componentsLoading ? (
              <div className="text-center text-gray-500 py-8">Loading components...</div>
            ) : !components || components.length === 0 ? (
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
                              {milestones.map((milestone: any) => {
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
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

/**
 * Read-only certificate view with Edit button
 */
interface CertificateReadOnlyViewProps {
  certificate: PackageCertificate;
  onEdit: () => void;
}

function CertificateReadOnlyView({
  certificate,
  onEdit,
}: CertificateReadOnlyViewProps) {
  return (
    <div className="border rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Certificate Completed</h3>
          <p className="text-sm text-gray-500">
            Certificate #{certificate.certificate_number}
          </p>
        </div>
        <Button variant="outline" onClick={onEdit}>
          Edit Certificate
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="text-sm text-gray-500 mb-1">Test Pressure</div>
          <div className="text-base font-medium">
            {certificate.test_pressure} {certificate.pressure_unit}
          </div>
        </div>

        <div>
          <div className="text-sm text-gray-500 mb-1">Test Media</div>
          <div className="text-base font-medium">{certificate.test_media}</div>
        </div>

        <div>
          <div className="text-sm text-gray-500 mb-1">Temperature</div>
          <div className="text-base font-medium">
            {certificate.temperature} {certificate.temperature_unit}
          </div>
        </div>

        {certificate.client && (
          <div>
            <div className="text-sm text-gray-500 mb-1">Client</div>
            <div className="text-base font-medium">{certificate.client}</div>
          </div>
        )}

        {certificate.client_spec && (
          <div>
            <div className="text-sm text-gray-500 mb-1">Client Specification</div>
            <div className="text-base font-medium">{certificate.client_spec}</div>
          </div>
        )}

        {certificate.line_number && (
          <div>
            <div className="text-sm text-gray-500 mb-1">Line Number</div>
            <div className="text-base font-medium">{certificate.line_number}</div>
          </div>
        )}
      </div>
    </div>
  );
}
