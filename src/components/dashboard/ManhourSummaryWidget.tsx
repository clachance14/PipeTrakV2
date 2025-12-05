/**
 * ManhourSummaryWidget - Dashboard widget showing project manhour summary
 *
 * Feature: 032-manhour-earned-value
 *
 * Display states:
 * 1. Loading: Show skeleton loader
 * 2. No permission: Return null (don't render)
 * 3. No budget: Show "Configure Budget" prompt with link to settings
 * 4. Has budget: Show summary grid (2x2)
 *
 * Summary grid layout:
 * - Budgeted: {total_budgeted_mh} MH
 * - Earned: {earned_mh} MH
 * - Remaining: {remaining_mh} MH
 * - Complete: {percent_complete}%
 *
 * @example
 * ```tsx
 * <ManhourSummaryWidget />
 * ```
 */

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useProjectManhours } from '@/hooks/useProjectManhours';
import { useManhourPermissions } from '@/lib/permissions/manhour-permissions';
import { useProject } from '@/contexts/ProjectContext';
import { Link } from 'react-router-dom';
import { Settings } from 'lucide-react';

interface ManhourSummaryWidgetProps {
  projectId?: string; // Optional, can use from context
}

/**
 * ManhourSummaryWidget component
 *
 * Displays project manhour summary for authorized users (Owner, Admin, PM).
 *
 * @param projectId - Optional project UUID (defaults to selected project from context)
 */
export function ManhourSummaryWidget({ projectId: projectIdProp }: ManhourSummaryWidgetProps) {
  const { selectedProjectId } = useProject();
  const { canViewManhours } = useManhourPermissions();
  const projectId = projectIdProp || selectedProjectId;
  const { data: summary, isLoading, isError } = useProjectManhours(projectId || undefined);

  // Hide widget for unauthorized users
  if (!canViewManhours) return null;

  // Error state
  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Manhour Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">
            Failed to load manhour data
          </p>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Manhour Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-16 bg-gray-100 rounded animate-pulse" />
            <div className="h-16 bg-gray-100 rounded animate-pulse" />
            <div className="h-16 bg-gray-100 rounded animate-pulse" />
            <div className="h-16 bg-gray-100 rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // No budget configured
  if (!summary?.has_budget || !summary.budget) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Manhour Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            No manhour budget configured for this project.
          </p>
          <Link
            to={`/projects/${projectId}/settings/manhours`}
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <Settings className="h-4 w-4" />
            Configure Budget
          </Link>
        </CardContent>
      </Card>
    );
  }

  // TypeScript now knows budget exists
  const budget = summary.budget;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manhour Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Budgeted</p>
            <p className="text-2xl font-semibold">
              {Math.round(budget.total_budgeted_mh).toLocaleString()} MH
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Earned</p>
            <p className="text-2xl font-semibold">
              {Math.round(budget.earned_mh).toLocaleString()} MH
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Remaining</p>
            <p className="text-2xl font-semibold">
              {Math.round(budget.remaining_mh).toLocaleString()} MH
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Complete</p>
            <p className="text-2xl font-semibold">
              {budget.percent_complete.toFixed(1)}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
