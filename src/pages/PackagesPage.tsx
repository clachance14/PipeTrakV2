import { Layout } from '@/components/Layout';
import { useState } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { usePackageReadiness } from '@/hooks/usePackages';
import { PackageCard } from '@/components/packages/PackageCard';
import { PackageEditDialog } from '@/components/packages/PackageEditDialog';
import { PackageCreateDialog } from '@/components/packages/PackageCreateDialog';
import { EmptyState } from '@/components/EmptyState';
import { Package, AlertCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Package as PackageType } from '@/types/package.types';

export function PackagesPage() {
  const { selectedProjectId } = useProject();

  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PackageType | null>(null);

  const { data: packagesData, isLoading, isError, error, refetch } = usePackageReadiness(
    selectedProjectId || ''
  );

  const handleEdit = (pkg: PackageType) => {
    setSelectedPackage(pkg);
    setEditDialogOpen(true);
  };

  // No project selected
  if (!selectedProjectId) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <EmptyState
            icon={Package}
            title="No Project Selected"
            description="Please select a project from the dropdown to view test packages."
          />
        </div>
      </Layout>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Test Package Readiness</h1>
            <p className="text-gray-600 mt-1">Track package completion and turnover readiness</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-100 rounded-lg animate-pulse" />
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
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load packages</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {error?.message || 'An unexpected error occurred'}
            </p>
            <Button onClick={() => refetch()}>Retry</Button>
          </div>
        </div>
      </Layout>
    );
  }

  // Transform data for cards
  // Note: description field added in migration 00028
  // Note: Stats (total_components, avg_percent_complete, etc.) may be 0/null if
  //       mv_package_readiness hasn't been refreshed yet after package creation
  const packages = packagesData?.map((row) => {
    const rowWithDescription = row as typeof row & { description?: string | null };
    const avgProgress = row.avg_percent_complete ?? 0;
    const totalComponents = Number(row.total_components) || 0;
    const blockerCount = Number(row.blocker_count) || 0;

    return {
      id: row.package_id!,
      name: row.package_name!,
      description: rowWithDescription.description || null,
      progress: Math.round(avgProgress),
      componentCount: totalComponents,
      blockerCount: blockerCount,
      targetDate: row.target_date || undefined,
      statusColor: (blockerCount > 0
        ? 'amber'
        : avgProgress === 100 && totalComponents > 0
        ? 'green'
        : 'blue') as 'green' | 'blue' | 'amber',
      // Full package data for editing
      packageData: {
        id: row.package_id!,
        project_id: row.project_id!,
        name: row.package_name!,
        description: rowWithDescription.description || null,
        target_date: row.target_date,
        created_at: '', // Not needed for edit
      } as PackageType,
    };
  });

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Test Package Readiness</h1>
            <p className="text-gray-600 mt-1">Track package completion and turnover readiness</p>
          </div>
          {selectedProjectId && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Package
            </Button>
          )}
        </div>

        {!packages || packages.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No test packages found"
            description="Create your first test package to start tracking turnover readiness."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.map((pkg) => (
              <PackageCard
                key={pkg.id}
                package={pkg}
                onEdit={() => handleEdit(pkg.packageData)}
              />
            ))}
          </div>
        )}

        {/* Create Package Dialog (Feature 030 - with drawing assignment) */}
        {selectedProjectId && (
          <PackageCreateDialog
            projectId={selectedProjectId}
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
          />
        )}

        {/* Edit Package Dialog */}
        {selectedProjectId && selectedPackage && (
          <PackageEditDialog
            mode="edit"
            projectId={selectedProjectId}
            package={selectedPackage}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
          />
        )}
      </div>
    </Layout>
  );
}
