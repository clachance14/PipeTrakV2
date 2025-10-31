/**
 * TanStack Query hooks for test_packages table (Feature 005)
 * Provides CRUD operations + materialized view access for package readiness dashboard
 */

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

type TestPackage = Database['public']['Tables']['test_packages']['Row'];

interface PackageReadiness {
  package_id: string | null;
  project_id: string | null;
  package_name: string | null;
  target_date: string | null;
  total_components: number | null;
  completed_components: number | null;
  avg_percent_complete: number | null;
  blocker_count: number | null;
  last_activity_at: string | null;
}

/**
 * Query test packages for a project
 */
export function useTestPackages(projectId: string): UseQueryResult<TestPackage[], Error> {
  return useQuery({
    queryKey: ['projects', projectId, 'test-packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_packages')
        .select('*')
        .eq('project_id', projectId)
        .order('target_date', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!projectId, // Only fetch when projectId is provided
  });
}

/**
 * Query package readiness from materialized view
 * Requires can_view_dashboards permission (enforced by RLS)
 * Data refreshed every 60 seconds via pg_cron
 */
export function usePackageReadiness(packageId: string): UseQueryResult<PackageReadiness, Error> {
  return useQuery({
    queryKey: ['test-packages', packageId, 'readiness'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_package_readiness')
        .select('*')
        .eq('package_id', packageId)
        .single();

      if (error) throw error;
      return data;
    },
    staleTime: 60 * 1000, // 1 minute (matches materialized view refresh interval)
  });
}

/**
 * Create a new test package
 */
export function useCreateTestPackage(): UseMutationResult<
  TestPackage,
  Error,
  {
    project_id: string;
    name: string;
    description?: string;
    target_date?: string; // ISO 8601 date
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newPackage) => {
      const { data, error } = await supabase
        .from('test_packages')
        .insert(newPackage)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate test packages list for this project
      queryClient.invalidateQueries({
        queryKey: ['projects', data.project_id, 'test-packages'],
      });
    },
  });
}

/**
 * Update an existing test package
 */
export function useUpdateTestPackage(): UseMutationResult<
  TestPackage,
  Error,
  {
    id: string;
    name?: string;
    description?: string;
    target_date?: string;
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('test_packages')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate test packages list for this project
      queryClient.invalidateQueries({
        queryKey: ['projects', data.project_id, 'test-packages'],
      });
    },
  });
}

/**
 * Delete a test package
 * Sets component.test_package_id to NULL for any assigned components
 */
export function useDeleteTestPackage(): UseMutationResult<
  void,
  Error,
  {
    id: string;
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }) => {
      const { error } = await supabase
        .from('test_packages')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate all test packages queries
      queryClient.invalidateQueries({
        queryKey: ['projects'],
      });
      // Also invalidate components since test_package_id may have changed
      queryClient.invalidateQueries({
        queryKey: ['components'],
      });
    },
  });
}
