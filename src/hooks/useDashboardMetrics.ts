/**
 * Dashboard metrics aggregation hook
 * Feature: 008-we-just-planned (Authenticated Pages with Real Data)
 * Aggregates metrics from components, packages, and needs_review for dashboard display
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useComponents } from './useComponents';
import { useNeedsReview } from './useNeedsReview';

/**
 * Activity item structure for recent activity feed
 */
interface ActivityItem {
  id: string;
  user_initials: string;
  description: string;
  timestamp: string; // ISO 8601
}

/**
 * Dashboard metrics data structure
 */
export interface DashboardMetrics {
  overallProgress: number; // 0-100
  componentCount: number;
  readyPackages: number;
  needsReviewCount: number;
  recentActivity: ActivityItem[];
}

/**
 * Fake audit log implementation (audit_log table doesn't exist yet)
 * Returns empty array until audit_log is implemented
 */
function useAuditLog(projectId: string): { data: ActivityItem[] } {
  return { data: [] };
}

/**
 * Hook to aggregate dashboard metrics for a project
 * Combines data from multiple sources:
 * - Components: overall progress percentage
 * - Package readiness view: ready packages count
 * - Needs review: pending items count
 * - Audit log: recent activity (stubbed for now)
 *
 * @param projectId - The project to fetch metrics for
 * @returns TanStack Query result with DashboardMetrics
 */
export function useDashboardMetrics(
  projectId: string
): UseQueryResult<DashboardMetrics, Error> {
  // Fetch all components for the project
  const componentsQuery = useComponents(projectId);

  // Fetch needs review items (defaults to status='pending')
  const needsReviewQuery = useNeedsReview(projectId);

  // Fetch package readiness from materialized view
  const packageReadinessQuery = useQuery({
    queryKey: ['projects', projectId, 'package-readiness'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_package_readiness')
        .select('*')
        .eq('project_id', projectId);

      if (error) throw error;
      return data || [];
    },
    staleTime: 60 * 1000, // 1 minute (matches materialized view refresh)
  });

  // Fake audit log (returns empty array)
  const auditLogData = useAuditLog(projectId);

  // Compute aggregated metrics from all queries
  const data = useMemo(() => {
    // Don't compute if any query is still loading
    if (
      componentsQuery.isLoading ||
      needsReviewQuery.isLoading ||
      packageReadinessQuery.isLoading
    ) {
      return undefined;
    }

    const components = componentsQuery.data || [];
    const needsReview = needsReviewQuery.data || [];
    const packages = packageReadinessQuery.data || [];
    const recentActivity = auditLogData.data || [];

    // Calculate overall progress (average of all components' percent_complete)
    const overallProgress =
      components.length > 0
        ? components.reduce((sum, c) => sum + (c.percent_complete || 0), 0) /
          components.length
        : 0;

    // Count ready packages (avg_percent_complete = 100)
    const readyPackages = packages.filter(
      (p) => p.avg_percent_complete === 100
    ).length;

    const metrics: DashboardMetrics = {
      overallProgress: Math.round(overallProgress * 100) / 100, // Round to 2 decimals
      componentCount: components.length,
      readyPackages,
      needsReviewCount: needsReview.length,
      recentActivity: recentActivity.slice(0, 10), // Limit to 10 items max
    };

    return metrics;
  }, [
    componentsQuery.isLoading,
    componentsQuery.data,
    needsReviewQuery.isLoading,
    needsReviewQuery.data,
    packageReadinessQuery.isLoading,
    packageReadinessQuery.data,
    auditLogData.data,
  ]);

  // Return a UseQueryResult-like object
  const isLoading =
    componentsQuery.isLoading ||
    needsReviewQuery.isLoading ||
    packageReadinessQuery.isLoading;

  const isError =
    componentsQuery.isError ||
    needsReviewQuery.isError ||
    packageReadinessQuery.isError;

  const error =
    componentsQuery.error ||
    needsReviewQuery.error ||
    packageReadinessQuery.error;

  return {
    data,
    isLoading,
    isError,
    error: error || null,
    refetch: async () => {
      await Promise.all([
        componentsQuery.refetch(),
        needsReviewQuery.refetch(),
        packageReadinessQuery.refetch(),
      ]);
      return { data, error: error || null } as any;
    },
  } as UseQueryResult<DashboardMetrics, Error>;
}
