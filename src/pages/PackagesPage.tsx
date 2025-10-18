import { Layout } from '@/components/Layout';
import { useState } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { usePackageReadiness, PackageFilters as PackageFiltersType } from '@/hooks/usePackageReadiness';
import { PackageCard } from '@/components/packages/PackageCard';
import { PackageFilters } from '@/components/packages/PackageFilters';
import { EmptyState } from '@/components/EmptyState';
import { Package, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PackagesPage() {
  const { selectedProjectId } = useProject();
  const [filters, setFilters] = useState<PackageFiltersType>({ status: 'all', sortBy: 'name' });
  const { data: packages, isLoading, isError, error, refetch } = usePackageReadiness(
    selectedProjectId || '',
    filters
  );

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

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Test Package Readiness</h1>
          <p className="text-gray-600 mt-1">Track package completion and turnover readiness</p>
        </div>

        <PackageFilters onFilterChange={setFilters} />

        {packages.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No test packages found"
            description="Create your first test package to start tracking turnover readiness."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.map((pkg) => (
              <PackageCard key={pkg.id} package={pkg} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
