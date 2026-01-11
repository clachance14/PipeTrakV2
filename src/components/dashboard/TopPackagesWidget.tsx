/**
 * TopPackagesWidget Component
 *
 * Displays the top 5 packages by completion percentage on the dashboard.
 * Designed to fit in the summary cards grid (replaces "Packages Ready").
 */

import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { usePackageReadiness } from '@/hooks/usePackages';

export interface TopPackagesWidgetProps {
  projectId: string;
}

/** Number of packages to display in compact card view */
const MAX_PACKAGES = 5;

/**
 * Dashboard widget showing top packages by completion percentage.
 * Compact design to fit in the 4-column summary card grid.
 */
export function TopPackagesWidget({ projectId }: TopPackagesWidgetProps) {
  const { data: packages, isLoading } = usePackageReadiness(projectId);

  // Sort by avg_percent_complete DESC and take top packages
  const topPackages = packages
    ?.slice()
    .sort((a, b) => (b.avg_percent_complete ?? 0) - (a.avg_percent_complete ?? 0))
    .slice(0, MAX_PACKAGES);

  return (
    <Card className="p-6">
      {/* Header - matches MetricCard style */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">Top Packages</p>
        </div>
        <div className="p-3 bg-primary/10 rounded-lg">
          <Package className="h-6 w-6 text-primary" />
        </div>
      </div>

      {/* Content */}
      <div className="mt-3">
        {isLoading ? (
          <LoadingSkeleton />
        ) : !topPackages || topPackages.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-2">
            {topPackages.map((pkg) => (
              <PackageRow
                key={pkg.package_id}
                id={pkg.package_id ?? ''}
                name={pkg.package_name ?? 'Unnamed Package'}
                percent={pkg.avg_percent_complete ?? 0}
              />
            ))}
            {/* View All link */}
            <Link
              to="/packages"
              className="block text-xs text-center text-primary hover:text-primary/80 transition-colors pt-1"
            >
              View All
            </Link>
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * Compact package row with name and percentage
 */
function PackageRow({
  id,
  name,
  percent,
}: {
  id: string;
  name: string;
  percent: number;
}) {
  const roundedPercent = Math.round(percent);

  return (
    <Link
      to={`/packages/${id}/components`}
      className="flex items-center gap-2 py-1 rounded hover:bg-muted/50 transition-colors group"
    >
      <span className="flex-1 text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
        {name}
      </span>
      <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all"
          style={{ width: `${roundedPercent}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">
        {roundedPercent}%
      </span>
    </Link>
  );
}

/**
 * Loading skeleton for the widget
 */
function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(MAX_PACKAGES)].map((_, i) => (
        <div key={i} className="flex items-center gap-2 py-1">
          <div className="flex-1 h-3 bg-muted rounded animate-pulse" />
          <div className="w-12 h-1.5 bg-muted rounded animate-pulse" />
          <div className="w-8 h-3 bg-muted rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

/**
 * Empty state when no packages exist
 */
function EmptyState() {
  return (
    <div className="text-center py-2">
      <p className="text-sm text-muted-foreground">No packages yet</p>
      <Link
        to="/packages"
        className="text-xs text-primary hover:text-primary/80 transition-colors"
      >
        Create your first package
      </Link>
    </div>
  );
}
