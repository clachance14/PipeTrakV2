import { ReactNode } from 'react';
import { Layout } from '@/components/Layout';
import { Link } from 'react-router-dom';
import { useProject } from '@/contexts/ProjectContext';
import { useDashboardMetrics, type DashboardMetrics } from '@/hooks/useDashboardMetrics';
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
  BarChart,
  LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type MetricConfig = {
  title: string;
  icon: LucideIcon;
  getValue: (metrics: DashboardMetrics) => string | number;
  getBadge?: (metrics: DashboardMetrics) => number | undefined;
};

type QuickLink = {
  title: string;
  description: string;
  icon: LucideIcon;
  to: string;
  iconBg: string;
  iconColor: string;
  getBadge?: (metrics: DashboardMetrics) => number | undefined;
};

const quickLinks: QuickLink[] = [
  {
    title: 'Components',
    description: 'Track milestones',
    icon: Box,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    to: '/components',
  },
  {
    title: 'Test Packages',
    description: 'Readiness view',
    icon: Package,
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    to: '/packages',
  },
  {
    title: 'Needs Review',
    description: 'Resolve items',
    icon: AlertCircle,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    to: '/needs-review',
    getBadge: (metrics) => metrics.needsReviewCount,
  },
  {
    title: 'Welders',
    description: 'Manage directory',
    icon: Wrench,
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    to: '/welders',
  },
  {
    title: 'Imports',
    description: 'Upload data',
    icon: Upload,
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    to: '/imports',
  },
  {
    title: 'Reports',
    description: 'Progress reports',
    icon: BarChart,
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-600',
    to: '/reports',
  },
];

const metricConfigs: MetricConfig[] = [
  {
    title: 'Packages Ready',
    icon: Package,
    getValue: (metrics) => metrics.readyPackages,
  },
  {
    title: 'Needs Review',
    icon: AlertCircle,
    getValue: (metrics) => metrics.needsReviewCount,
    getBadge: (metrics) => metrics.needsReviewCount,
  },
  {
    title: 'Total Components',
    icon: Box,
    getValue: (metrics) => metrics.componentCount.toLocaleString(),
  },
];

export function DashboardPage() {
  const { selectedProjectId } = useProject();
  const { data: metrics, isLoading, isError, error } = useDashboardMetrics(selectedProjectId || '');

  // No project selected
  if (!selectedProjectId) {
    return (
      <Layout>
        <DashboardState
          icon={LayoutDashboard}
          title="No Project Selected"
          description="Please select a project from the dropdown to view the dashboard."
        />
      </Layout>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Layout>
        <DashboardSkeleton />
      </Layout>
    );
  }

  // Error state
  if (isError || !metrics) {
    return (
      <Layout>
        <DashboardState
          icon={AlertCircle}
          title="Failed to load dashboard"
          description={error?.message || 'An unexpected error occurred'}
          action={<Button onClick={() => window.location.reload()}>Retry</Button>}
        />
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

          {metricConfigs.map((config) => (
            <MetricCard
              key={config.title}
              title={config.title}
              value={config.getValue(metrics)}
              icon={config.icon}
              badge={config.getBadge?.(metrics)}
            />
          ))}
        </div>

        {/* Quick Access Grid */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Access</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickLinks.map(({ title, description, icon: Icon, iconBg, iconColor, to, getBadge }) => {
              const badge = getBadge?.(metrics);
              return (
                <Link
                  key={title}
                  to={to}
                  className="relative bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-4">
                    <div className={`rounded-lg p-3 ${iconBg}`}>
                      <Icon className={`h-6 w-6 ${iconColor}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{title}</h3>
                      <p className="text-sm text-gray-600">{description}</p>
                    </div>
                  </div>
                  {badge !== undefined && badge > 0 && (
                    <div className="absolute top-4 right-4 px-2 py-1 bg-amber-500 text-white text-xs font-semibold rounded-full">
                      {badge > 99 ? '99+' : badge}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <ActivityFeed activities={metrics.recentActivity} />
      </div>
    </Layout>
  );
}

interface DashboardStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

function DashboardState({ icon: Icon, title, description, action }: DashboardStateProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Icon className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-md">{description}</p>
        {action}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-40 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );
}
