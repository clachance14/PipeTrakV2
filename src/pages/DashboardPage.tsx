import { Layout } from '@/components/Layout';
import { Link } from 'react-router-dom';
import { useProject } from '@/contexts/ProjectContext';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ProgressRing } from '@/components/dashboard/ProgressRing';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import {
  LayoutDashboard,
  Package,
  AlertCircle,
  Box,
  Wrench,
  Upload,
  BarChart
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export function DashboardPage() {
  const { selectedProjectId } = useProject();
  const { data: metrics, isLoading, isError, error } = useDashboardMetrics(selectedProjectId || '');

  // No project selected
  if (!selectedProjectId) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center py-12">
            <LayoutDashboard className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Project Selected</h3>
            <p className="text-sm text-muted-foreground text-center mb-4 max-w-md">
              Please select a project from the dropdown to view the dashboard.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-40 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  // Error state
  if (isError || !metrics) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load dashboard</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {error?.message || 'An unexpected error occurred'}
            </p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Overall Progress */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-4">Overall Progress</h3>
            <div className="flex items-center justify-center mb-2">
              <ProgressRing progress={metrics.overallProgress} />
            </div>
            <p className="text-center text-sm text-gray-600">
              {metrics.componentCount.toLocaleString()} component{metrics.componentCount !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Packages Ready */}
          <MetricCard
            title="Packages Ready"
            value={metrics.readyPackages}
            icon={Package}
          />

          {/* Needs Review */}
          <MetricCard
            title="Needs Review"
            value={metrics.needsReviewCount}
            icon={AlertCircle}
            badge={metrics.needsReviewCount}
          />

          {/* Component Count */}
          <MetricCard
            title="Total Components"
            value={metrics.componentCount.toLocaleString()}
            icon={Box}
          />
        </div>

        {/* Quick Access Grid */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Access</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              to="/components"
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Box className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Components</h3>
                  <p className="text-sm text-gray-600">Track milestones</p>
                </div>
              </div>
            </Link>

            <Link
              to="/packages"
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Package className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Test Packages</h3>
                  <p className="text-sm text-gray-600">Readiness view</p>
                </div>
              </div>
            </Link>

            <Link
              to="/needs-review"
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow relative"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-100 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Needs Review</h3>
                  <p className="text-sm text-gray-600">Resolve items</p>
                </div>
              </div>
              {metrics.needsReviewCount > 0 && (
                <div className="absolute top-4 right-4 px-2 py-1 bg-amber-500 text-white text-xs font-semibold rounded-full">
                  {metrics.needsReviewCount > 99 ? '99+' : metrics.needsReviewCount}
                </div>
              )}
            </Link>

            <Link
              to="/welders"
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Wrench className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Welders</h3>
                  <p className="text-sm text-gray-600">Manage directory</p>
                </div>
              </div>
            </Link>

            <Link
              to="/imports"
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-100 rounded-lg">
                  <Upload className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Imports</h3>
                  <p className="text-sm text-gray-600">Upload data</p>
                </div>
              </div>
            </Link>

            <div className="bg-white rounded-lg shadow p-6 opacity-50 cursor-not-allowed">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gray-100 rounded-lg">
                  <BarChart className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Reports</h3>
                  <p className="text-sm text-gray-600">Coming soon</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <ActivityFeed activities={metrics.recentActivity} />
      </div>
    </Layout>
  );
}
