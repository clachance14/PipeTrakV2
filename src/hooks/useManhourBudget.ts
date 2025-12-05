/**
 * TanStack Query hooks for manhour budget management (Feature 032)
 * Provides CRUD operations for project manhour budgets with auto-distribution
 */

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type ProjectManhourBudget = Database['public']['Tables']['project_manhour_budgets']['Row'];

export interface CreateManhourBudgetInput {
  projectId: string;
  totalBudgetedManhours: number;
  revisionReason: string;
  effectiveDate?: string; // ISO 8601 date, defaults to today
}

export interface CreateManhourBudgetResponse {
  success: boolean;
  budget_id?: string;
  version_number?: number;
  distribution_summary?: {
    total_components: number;
    components_allocated: number;
    components_with_warnings: number;
    total_weight: number;
    total_allocated_mh: number;
  };
  warnings?: Array<{
    component_id: string;
    message: string;
  }>;
  error?: string;
  message?: string;
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * useManhourBudget - Get active manhour budget for a project
 *
 * @param projectId - Project UUID
 * @returns UseQueryResult<ProjectManhourBudget | null, Error>
 *
 * Query Key: ['projects', projectId, 'manhour-budget']
 * RLS: Filtered by user's project access
 * Cache: 5 minutes
 *
 * @example
 * const { data: budget, isLoading } = useManhourBudget(projectId);
 */
export function useManhourBudget(projectId: string): UseQueryResult<ProjectManhourBudget | null, Error> {
  return useQuery({
    queryKey: ['projects', projectId, 'manhour-budget'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_manhour_budgets')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to fetch manhour budget: ${error.message}`);
      }

      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!projectId,
  });
}

/**
 * useBudgetVersionHistory - Get all budget versions for a project
 *
 * @param projectId - Project UUID
 * @returns UseQueryResult<ProjectManhourBudget[], Error>
 *
 * Query Key: ['projects', projectId, 'budget-history']
 * Returns all budget versions ordered by version_number DESC
 * Cache: 5 minutes
 *
 * @example
 * const { data: history } = useBudgetVersionHistory(projectId);
 */
export function useBudgetVersionHistory(projectId: string): UseQueryResult<ProjectManhourBudget[], Error> {
  return useQuery({
    queryKey: ['projects', projectId, 'budget-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_manhour_budgets')
        .select('*')
        .eq('project_id', projectId)
        .order('version_number', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch budget history: ${error.message}`);
      }

      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!projectId,
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * useCreateManhourBudget - Create new manhour budget and distribute to components
 *
 * Calls the create_manhour_budget RPC which:
 * 1. Validates user permission (Owner/Admin/PM only)
 * 2. Creates budget record
 * 3. Calculates component weights
 * 4. Distributes manhours proportionally
 * 5. Returns summary with warnings for zero-weight components
 *
 * @returns UseMutationResult with RPC response
 *
 * Invalidates:
 * - ['projects', projectId, 'manhour-budget']
 * - ['projects', projectId, 'budget-history']
 * - ['components'] (budgeted_manhours updated)
 *
 * @example
 * const { mutate: createBudget, isPending, error } = useCreateManhourBudget();
 * createBudget({
 *   projectId: 'uuid',
 *   totalBudgetedManhours: 10000,
 *   revisionReason: 'Initial budget',
 *   effectiveDate: '2025-01-01'
 * });
 */
export function useCreateManhourBudget(): UseMutationResult<
  CreateManhourBudgetResponse,
  Error,
  CreateManhourBudgetInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateManhourBudgetInput) => {
      const { data, error } = await supabase.rpc('create_manhour_budget', {
        p_project_id: input.projectId,
        p_total_budgeted_manhours: input.totalBudgetedManhours,
        p_revision_reason: input.revisionReason,
        p_effective_date: input.effectiveDate || new Date().toISOString().split('T')[0],
      });

      if (error) {
        throw new Error(`Failed to create manhour budget: ${error.message}`);
      }

      // Cast the response to our expected type
      const response = data as unknown as CreateManhourBudgetResponse;

      // Check if RPC returned error response
      if (response && !response.success) {
        throw new Error(response.message || 'Failed to create budget');
      }

      return response;
    },
    onSuccess: (_result, variables) => {
      // Invalidate budget queries
      queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'manhour-budget'],
      });
      queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'budget-history'],
      });

      // Invalidate components since budgeted_manhours was updated
      queryClient.invalidateQueries({
        queryKey: ['components'],
      });

      // Invalidate summary queries (earned value calculations)
      queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'summary'],
      });
    },
  });
}
