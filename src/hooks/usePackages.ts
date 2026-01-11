/**
 * TanStack Query hooks for test packages (Feature 012)
 * Provides CRUD operations with optimistic updates
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { Database } from '@/types/database.types';
import type {
  CreatePackagePayload,
  UpdatePackagePayload,
  UpdatePackageResponse,
  PackageComponent,
} from '@/types/package.types';
import { calculateDuplicateCounts, createIdentityGroupKey } from '@/lib/calculateDuplicateCounts';

type PackageReadinessRow = Database['public']['Views']['mv_package_readiness']['Row'];

/** Extended row type with manhour data */
export type PackageReadinessRowWithManhours = PackageReadinessRow & {
  budgeted_manhours?: number | null;
};

/**
 * Query package readiness data for a project
 * Returns all test packages with stats from materialized view (if available)
 *
 * NOTE: Queries test_packages table directly to ensure ALL packages appear immediately,
 * even if mv_package_readiness hasn't been refreshed yet. Stats are merged from the
 * materialized view client-side.
 */
export function usePackageReadiness(
  projectId: string
) {
  // Main query for package readiness
  const query = useQuery({
    queryKey: ['package-readiness', projectId],
    queryFn: async () => {
      // Query 1: Get all test packages (authoritative source)
      const { data: packagesData, error: packagesError } = await supabase
        .from('test_packages')
        .select('id, project_id, name, description, target_date')
        .eq('project_id', projectId)
        .order('name', { ascending: true });

      if (packagesError) throw packagesError;

      // Query 2: Get component stats directly (real-time, no materialized view)
      const { data: componentsData, error: componentsError } = await supabase
        .from('components')
        .select('id, test_package_id, percent_complete, last_updated_at')
        .eq('project_id', projectId)
        .eq('is_retired', false);

      if (componentsError) throw componentsError;

      // Query 3: Get blocker counts from needs_review
      // Note: Avoid .in() with large arrays (hits URL length limits ~2000 chars)
      // Instead, query by project_id + status and filter client-side
      const { data: blockersData, error: blockersError } = await supabase
        .from('needs_review')
        .select('id, component_id')
        .eq('project_id', projectId)
        .eq('status', 'pending');

      if (blockersError) throw blockersError;

      // Filter to only blockers for components in this project (client-side)
      const componentIdsSet = new Set((componentsData || []).map(c => c.id));
      const filteredBlockers = (blockersData || []).filter(b =>
        b.component_id && componentIdsSet.has(b.component_id)
      );

      // Calculate stats per package
      type PackageStats = {
        total_components: number;
        completed_components: number;
        avg_percent_complete: number | null;
        blocker_count: number;
        last_activity_at: string | null;
        _sum_percent?: number; // Temporary for average calculation
      };

      const statsMap = new Map<string, PackageStats>();

      // Group components by package
      (componentsData || []).forEach((component) => {
        if (!component.test_package_id) return; // Skip unassigned components

        const packageId = component.test_package_id;
        const existing = statsMap.get(packageId) || {
          total_components: 0,
          completed_components: 0,
          avg_percent_complete: null,
          blocker_count: 0,
          last_activity_at: null,
          _sum_percent: 0, // Temporary for average calculation
        };

        existing.total_components++;
        if (component.percent_complete === 100) {
          existing.completed_components++;
        }
        existing._sum_percent = (existing._sum_percent || 0) + (component.percent_complete || 0);

        // Track latest activity
        if (component.last_updated_at && (!existing.last_activity_at || component.last_updated_at > existing.last_activity_at)) {
          existing.last_activity_at = component.last_updated_at;
        }

        statsMap.set(packageId, existing);
      });

      // Calculate averages and blocker counts
      statsMap.forEach((stats, packageId) => {
        const total = stats.total_components;
        stats.avg_percent_complete = total > 0 ? (stats._sum_percent || 0) / total : null;
        delete stats._sum_percent;

        // Count blockers for this package's components
        stats.blocker_count = filteredBlockers.filter((blocker) => {
          const component = componentsData?.find(c => c.id === blocker.component_id);
          return component?.test_package_id === packageId;
        }).length;
      });

      // Merge packages with stats, defaulting to 0/null if stats not available
      const merged: PackageReadinessRow[] = (packagesData || []).map((pkg) => {
        const stats = statsMap.get(pkg.id);

        return {
          package_id: pkg.id,
          project_id: pkg.project_id,
          package_name: pkg.name,
          description: pkg.description,
          target_date: pkg.target_date,
          total_components: stats?.total_components ?? 0,
          completed_components: stats?.completed_components ?? 0,
          avg_percent_complete: stats?.avg_percent_complete ?? null,
          blocker_count: stats?.blocker_count ?? 0,
          last_activity_at: stats?.last_activity_at ?? null,
        } as PackageReadinessRow;
      });

      return merged;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes (view refreshes every 60s)
  });

  // Separate query for manhour data (permission-gated at UI level)
  const manhourQuery = useQuery({
    queryKey: ['package-manhours', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_manhour_progress_by_test_package')
        .select('test_package_id, mh_budget')
        .eq('project_id', projectId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
    staleTime: 60 * 1000, // 1 minute
  });

  // Create manhour lookup map
  const manhourMap = useMemo(() => {
    const map = new Map<string, number>();
    if (manhourQuery.data) {
      for (const row of manhourQuery.data) {
        if (row.test_package_id) {
          map.set(row.test_package_id, row.mh_budget || 0);
        }
      }
    }
    return map;
  }, [manhourQuery.data]);

  // Merge manhour data into results
  const mergedData = useMemo(() => {
    if (!query.data) return undefined;
    return query.data.map((pkg) => ({
      ...pkg,
      budgeted_manhours: manhourMap.get(pkg.package_id || '') ?? null,
    })) as PackageReadinessRowWithManhours[];
  }, [query.data, manhourMap]);

  return {
    ...query,
    data: mergedData,
    manhourMap,
  };
}

/**
 * Create a new test package with optimistic updates
 * Calls create_test_package RPC function
 */
export function useCreatePackage(
  projectId: string
): UseMutationResult<string, Error, CreatePackagePayload> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreatePackagePayload) => {
      // Note: create_test_package RPC added in migration 00028
      const { data, error } = await supabase.rpc('create_test_package' as any, payload);

      if (error) throw error;
      if (!data) throw new Error('No package ID returned');
      return data as string;
    },
    onMutate: async (newPackage) => {
      // Cancel outbound refetches
      await queryClient.cancelQueries({ queryKey: ['package-readiness', projectId] });

      // Snapshot previous value
      const previous = queryClient.getQueryData<PackageReadinessRow[]>([
        'package-readiness',
        projectId,
      ]);

      // Optimistically update to the new value
      if (previous) {
        // Note: description field added in migration 00028
        type ExtendedRow = PackageReadinessRow & { description?: string | null };
        queryClient.setQueryData<ExtendedRow[]>(
          ['package-readiness', projectId],
          [
            ...previous,
            {
              package_id: 'temp-id-' + Date.now(),
              project_id: newPackage.p_project_id,
              package_name: newPackage.p_name,
              description: newPackage.p_description || null,
              target_date: newPackage.p_target_date || null,
              total_components: 0,
              completed_components: 0,
              avg_percent_complete: null,
              blocker_count: 0,
              last_activity_at: null,
            } as ExtendedRow,
          ]
        );
      }

      return { previous };
    },
    onError: (err, _variables, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(['package-readiness', projectId], context.previous);
      }
      toast.error('Failed to create package: ' + err.message);
    },
    onSuccess: () => {
      toast.success('Package created successfully');
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['package-readiness', projectId] });
    },
  });
}

/**
 * Update a test package with optimistic updates
 * Calls update_test_package RPC function
 */
export function useUpdatePackage(
  projectId: string
): UseMutationResult<UpdatePackageResponse, Error, UpdatePackagePayload> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdatePackagePayload) => {
      // Note: update_test_package RPC added in migration 00028
      const { data, error } = await supabase.rpc('update_test_package' as any, payload);

      if (error) throw error;
      if (!data) throw new Error('No response from update_test_package');

      // Check if RPC returned an error
      const response = data as UpdatePackageResponse;
      if ('error' in response) {
        throw new Error(response.error);
      }

      return response;
    },
    onMutate: async (updatedPackage) => {
      // Cancel outbound refetches
      await queryClient.cancelQueries({ queryKey: ['package-readiness', projectId] });

      // Snapshot previous value
      const previous = queryClient.getQueryData<PackageReadinessRow[]>([
        'package-readiness',
        projectId,
      ]);

      // Optimistically update
      if (previous) {
        // Note: description field added in migration 00028
        type ExtendedRow = PackageReadinessRow & { description?: string | null };
        queryClient.setQueryData<ExtendedRow[]>(
          ['package-readiness', projectId],
          previous.map((pkg) => {
            const extPkg = pkg as ExtendedRow;
            return pkg.package_id === updatedPackage.p_package_id
              ? {
                  ...extPkg,
                  package_name: updatedPackage.p_name || pkg.package_name,
                  description:
                    updatedPackage.p_description !== undefined
                      ? updatedPackage.p_description
                      : extPkg.description,
                  target_date:
                    updatedPackage.p_target_date !== undefined
                      ? updatedPackage.p_target_date
                      : pkg.target_date,
                }
              : extPkg;
          })
        );
      }

      return { previous };
    },
    onError: (err, _variables, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(['package-readiness', projectId], context.previous);
      }
      toast.error('Failed to update package: ' + err.message);
    },
    onSuccess: () => {
      toast.success('Package updated successfully');
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['package-readiness', projectId] });
    },
  });
}

/**
 * Query components for a specific test package
 * Includes both directly assigned and inherited components
 */
export function usePackageComponents(
  packageId: string | undefined,
  projectId: string
): UseQueryResult<PackageComponent[], Error> {
  return useQuery({
    queryKey: ['package-components', { package_id: packageId, project_id: projectId }],
    queryFn: async () => {
      if (!packageId) return [];

      const selectFields = `
          id,
          drawing_id,
          drawings!inner (
            id,
            drawing_no_norm,
            test_package_id
          ),
          component_type,
          identity_key,
          test_package_id,
          percent_complete,
          current_milestones,
          progress_template_id,
          post_hydro_install,
          progress_templates!inner (
            milestones_config
          )
        `;

      // Query 1: Direct assignments (component.test_package_id = packageId)
      const { data: directData, error: directError } = await supabase
        .from('components')
        .select(selectFields)
        .eq('test_package_id', packageId)
        .eq('project_id', projectId)
        .eq('is_retired', false);

      if (directError) throw directError;

      // Query 2: Inherited assignments (component.test_package_id IS NULL)
      // Then filter client-side for drawing.test_package_id = packageId
      const { data: inheritedData, error: inheritedError } = await supabase
        .from('components')
        .select(selectFields)
        .is('test_package_id', null)
        .eq('project_id', projectId)
        .eq('is_retired', false);

      if (inheritedError) throw inheritedError;

      // Filter inherited components where drawing.test_package_id matches
      const filteredInherited = (inheritedData || []).filter(
        (row: any) => row.drawings?.test_package_id === packageId
      );

      // Combine both result sets
      const allData = [...(directData || []), ...filteredInherited];

      // Calculate duplicate counts for identity key numbering
      const duplicateCounts = calculateDuplicateCounts(allData as any);

      // Transform to PackageComponent format
      const components: PackageComponent[] = allData.map((row: any) => ({
        id: row.id,
        drawing_id: row.drawing_id,
        drawing_no_norm: row.drawings?.drawing_no_norm || null,
        drawing_test_package_id: row.drawings?.test_package_id || null,
        component_type: row.component_type,
        identity_key: row.identity_key,
        identityDisplay: formatIdentityKey(
          row.identity_key,
          row.component_type,
          duplicateCounts.get(createIdentityGroupKey(row.identity_key as any))
        ),
        test_package_id: row.test_package_id,
        percent_complete: row.percent_complete,
        current_milestones: row.current_milestones,
        progress_template_id: row.progress_template_id,
        milestones_config: row.progress_templates?.milestones_config || [],
        post_hydro_install: row.post_hydro_install || false,
      }));

      return components;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!packageId, // Only run if packageId is provided
  });
}

/**
 * Format identity key for display
 * Reuses logic from Feature 010
 * @param totalCount - Total number of components with matching identity (for proper numbering)
 */
function formatIdentityKey(key: any, type: string, totalCount = 1): string {
  if (!key) return 'Unknown';

  // Spools have unique spool_id - no "x of y" formatting needed
  if (type === 'spool' && 'spool_id' in key) {
    return key.spool_id;
  }

  // Field welds have unique weld_number - no "x of y" formatting needed
  if (type === 'field_weld' && 'weld_number' in key) {
    return key.weld_number;
  }

  const { commodity_code, size, seq } = key;
  const sizeDisplay = size && size !== 'NOSIZE' ? ` ${size}` : '';

  // Instruments don't show sequential suffix
  if (type === 'instrument') {
    return `${commodity_code}${sizeDisplay}`;
  }

  // Others show (seq) only if totalCount > 1
  if (totalCount > 1) {
    return `${commodity_code}${sizeDisplay} (${seq || 1})`;
  }

  // Single component - no suffix
  return `${commodity_code}${sizeDisplay}`;
}

/**
 * Query single test package details including test_type and test_pressure
 * Used for package detail page header and certificate form
 */
export function usePackageDetails(
  packageId: string | undefined
): UseQueryResult<{ id: string; name: string; description: string | null; test_type: string | null; target_date: string | null; requires_coating: boolean | null; requires_insulation: boolean | null; test_pressure: number | null; test_pressure_unit: string | null; created_at: string } | null, Error> {
  return useQuery({
    queryKey: ['package-details', packageId],
    queryFn: async () => {
      if (!packageId) return null;

      const { data, error } = await supabase
        .from('test_packages')
        .select('id, name, description, test_type, target_date, requires_coating, requires_insulation, test_pressure, test_pressure_unit, created_at')
        .eq('id', packageId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!packageId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
