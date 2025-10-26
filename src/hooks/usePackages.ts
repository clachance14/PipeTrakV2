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
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { Database } from '@/types/database.types';
import type {
  CreatePackagePayload,
  UpdatePackagePayload,
  UpdatePackageResponse,
  PackageComponent,
} from '@/types/package.types';

type PackageReadinessRow = Database['public']['Views']['mv_package_readiness']['Row'];

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
): UseQueryResult<PackageReadinessRow[], Error> {
  return useQuery({
    queryKey: ['package-readiness', projectId],
    queryFn: async () => {
      // Query 1: Get all test packages (authoritative source)
      const { data: packagesData, error: packagesError } = await supabase
        .from('test_packages')
        .select('id, project_id, name, description, target_date')
        .eq('project_id', projectId)
        .order('name', { ascending: true });

      if (packagesError) throw packagesError;

      // Query 2: Get stats from materialized view (may be stale)
      const { data: statsData, error: statsError } = await supabase
        .from('mv_package_readiness')
        .select('*')
        .eq('project_id', projectId);

      if (statsError) throw statsError;

      // Create a map of stats by package_id for quick lookup
      const statsMap = new Map(
        (statsData || []).map((stat) => [stat.package_id, stat])
      );

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

      // Transform to PackageComponent format
      const components: PackageComponent[] = allData.map((row: any) => ({
        id: row.id,
        drawing_id: row.drawing_id,
        drawing_no_norm: row.drawings?.drawing_no_norm || null,
        drawing_test_package_id: row.drawings?.test_package_id || null,
        component_type: row.component_type,
        identity_key: row.identity_key,
        identityDisplay: formatIdentityKey(row.identity_key, row.component_type),
        test_package_id: row.test_package_id,
        percent_complete: row.percent_complete,
        current_milestones: row.current_milestones,
        progress_template_id: row.progress_template_id,
        milestones_config: row.progress_templates?.milestones_config || [],
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
 */
function formatIdentityKey(key: any, type: string): string {
  if (!key) return 'Unknown';

  const { commodity_code, size, seq } = key;
  const sizeDisplay = size && size !== 'NOSIZE' ? ` ${size}` : '';

  // Instruments don't show sequential suffix
  if (type === 'instrument') {
    return `${commodity_code}${sizeDisplay}`;
  }

  // Others show (seq)
  return `${commodity_code}${sizeDisplay} (${seq || 1})`;
}
