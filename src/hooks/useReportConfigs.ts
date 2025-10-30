/**
 * TanStack Query hooks for report_configs table (Feature 019)
 * Provides CRUD operations for saved report configurations
 */

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';
import type { ReportConfig, CreateReportConfigInput, UpdateReportConfigInput } from '@/types/reports';

type ReportConfigRow = Database['public']['Tables']['report_configs']['Row'];
type ReportConfigInsert = Database['public']['Tables']['report_configs']['Insert'];
type ReportConfigUpdate = Database['public']['Tables']['report_configs']['Update'];

/**
 * Transform database row to ReportConfig interface
 */
function transformReportConfig(row: ReportConfigRow): ReportConfig {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    description: row.description || undefined,
    groupingDimension: row.grouping_dimension as 'area' | 'system' | 'test_package',
    hierarchicalGrouping: row.hierarchical_grouping,
    componentTypeFilter: row.component_type_filter,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    createdBy: row.created_by,
  };
}

/**
 * Query all report configs for a project
 * Ordered by most recently updated first
 */
export function useReportConfigs(projectId: string): UseQueryResult<ReportConfig[], Error> {
  return useQuery({
    queryKey: ['projects', projectId, 'report-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('report_configs')
        .select('*')
        .eq('project_id', projectId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(transformReportConfig);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes (configs rarely change)
    enabled: !!projectId, // Only run query if projectId is provided
  });
}

/**
 * Create a new report configuration
 * Validates unique name within project (enforced by idx_report_configs_project_name)
 */
export function useCreateReportConfig(): UseMutationResult<
  ReportConfig,
  Error,
  CreateReportConfigInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateReportConfigInput) => {
      const insert: ReportConfigInsert = {
        project_id: input.projectId,
        name: input.name,
        description: input.description || null,
        grouping_dimension: input.groupingDimension,
        hierarchical_grouping: input.hierarchicalGrouping ?? false,
        component_type_filter: input.componentTypeFilter ?? null,
      };

      const { data, error } = await supabase
        .from('report_configs')
        .insert(insert)
        .select()
        .single();

      if (error) throw error;
      return transformReportConfig(data);
    },
    onSuccess: (data) => {
      // Invalidate report configs list for this project
      queryClient.invalidateQueries({
        queryKey: ['projects', data.projectId, 'report-configs'],
      });
    },
  });
}

/**
 * Update an existing report configuration
 * All fields except id are optional
 */
export function useUpdateReportConfig(): UseMutationResult<
  ReportConfig,
  Error,
  { id: string } & UpdateReportConfigInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const update: ReportConfigUpdate = {};

      if (updates.name !== undefined) update.name = updates.name;
      if (updates.description !== undefined) update.description = updates.description || null;
      if (updates.groupingDimension !== undefined) update.grouping_dimension = updates.groupingDimension;
      if (updates.hierarchicalGrouping !== undefined) update.hierarchical_grouping = updates.hierarchicalGrouping;
      if (updates.componentTypeFilter !== undefined) update.component_type_filter = updates.componentTypeFilter;

      // Always update updated_at timestamp
      update.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('report_configs')
        .update(update)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return transformReportConfig(data);
    },
    onSuccess: (data) => {
      // Invalidate report configs list for this project
      queryClient.invalidateQueries({
        queryKey: ['projects', data.projectId, 'report-configs'],
      });
    },
  });
}

/**
 * Delete a report configuration
 * RLS policies enforce that users can only delete their own configs
 */
export function useDeleteReportConfig(): UseMutationResult<
  void,
  Error,
  { id: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }) => {
      const { error } = await supabase
        .from('report_configs')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate all report configs queries
      queryClient.invalidateQueries({
        queryKey: ['projects'],
      });
    },
  });
}
