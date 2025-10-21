/**
 * Package readiness hook with filtering and sorting
 * Feature: 008-we-just-planned (Authenticated Pages with Real Data)
 * Queries mv_package_readiness materialized view and transforms to view models
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Status color options for package cards
 */
type StatusColor = 'green' | 'amber' | 'blue';

/**
 * Package card view model for UI display
 */
export interface PackageCard {
  id: string;
  name: string;
  progress: number; // 0-100
  componentCount: number;
  blockerCount: number;
  targetDate: string | null; // ISO 8601 date
  statusColor: StatusColor;
}

/**
 * Filter options for package readiness
 */
export interface PackageReadinessFilters {
  status?: 'all' | 'ready' | 'in_progress' | 'blocked';
  search?: string; // Search in package name
  sortBy?: 'name' | 'progress' | 'target_date';
}

/**
 * Determine status color based on progress and blockers
 * - progress === 100 → green (ready)
 * - blocker_count > 0 → amber (blocked)
 * - else → blue (in progress)
 */
function getStatusColor(progress: number, blockerCount: number): StatusColor {
  if (progress === 100) return 'green';
  if (blockerCount > 0) return 'amber';
  return 'blue';
}

/**
 * Hook to query and filter package readiness data
 * Fetches from mv_package_readiness materialized view
 * Applies client-side filtering and sorting
 *
 * @param projectId - The project to fetch packages for
 * @param filters - Optional filters for status, search, and sorting
 * @returns TanStack Query result with PackageCard array
 */
export function usePackageReadiness(
  projectId: string,
  filters?: PackageReadinessFilters
): UseQueryResult<PackageCard[], Error> {
  const query = useQuery({
    queryKey: ['projects', projectId, 'package-readiness', 'raw'],
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

  // Transform and filter data
  const processedData = useMemo(() => {
    if (!query.data) return [];

    // Transform raw data to PackageCard view models
    let cards: PackageCard[] = query.data.map((row) => ({
      id: row.package_id || '',
      name: row.package_name || '',
      progress: row.avg_percent_complete || 0,
      componentCount: row.total_components || 0,
      blockerCount: row.blocker_count || 0,
      targetDate: row.target_date,
      statusColor: getStatusColor(
        row.avg_percent_complete || 0,
        row.blocker_count || 0
      ),
    }));

    // Apply status filter
    if (filters?.status && filters.status !== 'all') {
      cards = cards.filter((card) => {
        switch (filters.status) {
          case 'ready':
            return card.progress === 100;
          case 'blocked':
            return card.blockerCount > 0;
          case 'in_progress':
            return card.progress < 100 && card.blockerCount === 0;
          default:
            return true;
        }
      });
    }

    // Apply search filter (case-insensitive partial match)
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      cards = cards.filter((card) =>
        card.name.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    if (filters?.sortBy) {
      cards = [...cards].sort((a, b) => {
        switch (filters.sortBy) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'progress':
            return b.progress - a.progress; // Descending (highest first)
          case 'target_date':
            // Nulls last, then sort ascending
            if (!a.targetDate && !b.targetDate) return 0;
            if (!a.targetDate) return 1;
            if (!b.targetDate) return -1;
            return a.targetDate.localeCompare(b.targetDate);
          default:
            return 0;
        }
      });
    }

    return cards;
  }, [query.data, filters]);

  return {
    ...query,
    data: processedData,
  } as UseQueryResult<PackageCard[], Error>;
}
