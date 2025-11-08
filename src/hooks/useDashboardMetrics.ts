/**
 * Dashboard metrics aggregation hook
 * Feature: 008-we-just-planned (Authenticated Pages with Real Data)
 * Aggregates metrics from components, packages, and needs_review for dashboard display
 */

import { useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { useMemo, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useComponents } from './useComponents';
import { useNeedsReview } from './useNeedsReview';
import { ActivityItem } from '@/types/activity';

// Activity feed query configuration (T003)
const ACTIVITY_FEED_STALE_TIME = 30 * 1000; // 30 seconds

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
 * Fetch recent activity from vw_recent_activity view
 * T006-T008: Real TanStack Query implementation
 *
 * @param projectId - The project to fetch activities for
 * @returns Query result with ActivityItem[] data, loading state, and error
 */
function useAuditLog(projectId: string): {
  data: ActivityItem[];
  isLoading: boolean;
  error: Error | null;
} {
  const queryClient = useQueryClient();

  // T007: TanStack Query configuration with proper query key and stale time
  const query = useQuery({
    queryKey: ['projects', projectId, 'recent-activity'],
    queryFn: async () => {
      // T006: Fetch from vw_recent_activity with project_id filter and LIMIT 10
      // Cast to any because view isn't in generated types yet
      const { data, error } = await supabase
        .from('vw_recent_activity' as any)
        .select('id, user_initials, description, timestamp')
        .eq('project_id', projectId)
        .order('timestamp', { ascending: false })
        .limit(10);

      if (error) throw error;

      // T008: Transform view data to ActivityItem[] format
      return (data || []).map((row: any) => ({
        id: row.id,
        user_initials: row.user_initials,
        description: row.description,
        timestamp: row.timestamp,
      })) as ActivityItem[];
    },
    staleTime: ACTIVITY_FEED_STALE_TIME,
    enabled: !!projectId, // Only fetch when projectId is provided
  });

  // T017: Realtime subscription to milestone_events INSERTs
  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel('milestone_events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'milestone_events',
        },
        () => {
          // Invalidate query to trigger refetch
          queryClient.invalidateQueries({
            queryKey: ['projects', projectId, 'recent-activity'],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, queryClient]);

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
  };
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

  // T009: Use real audit log data
  const auditLogQuery = useAuditLog(projectId);

  // Compute aggregated metrics from all queries
  const data = useMemo(() => {
    // Don't compute if any query is still loading
    if (
      componentsQuery.isLoading ||
      needsReviewQuery.isLoading ||
      packageReadinessQuery.isLoading ||
      auditLogQuery.isLoading
    ) {
      return undefined;
    }

    const components = componentsQuery.data || [];
    const needsReview = needsReviewQuery.data || [];
    const packages = packageReadinessQuery.data || [];
    const recentActivity = auditLogQuery.data || [];

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
    auditLogQuery.isLoading,
    auditLogQuery.data,
  ]);

  // Return a UseQueryResult-like object
  const isLoading =
    componentsQuery.isLoading ||
    needsReviewQuery.isLoading ||
    packageReadinessQuery.isLoading ||
    auditLogQuery.isLoading;

  const isError =
    componentsQuery.isError ||
    needsReviewQuery.isError ||
    packageReadinessQuery.isError ||
    !!auditLogQuery.error;

  const error =
    componentsQuery.error ||
    needsReviewQuery.error ||
    packageReadinessQuery.error ||
    auditLogQuery.error;

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
        auditLogQuery.isLoading ? Promise.resolve() : Promise.resolve(),
      ]);
      return { data, error: error || null } as any;
    },
  } as UseQueryResult<DashboardMetrics, Error>;
}
