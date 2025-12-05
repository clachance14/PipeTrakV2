/**
 * useProjectManhours Hook - Project-level manhour budget tracking with earned value
 *
 * Feature: 032-manhour-earned-value
 * Fetches project-level manhour summary with computed earned value metrics.
 *
 * Query:
 * - useProjectManhours(projectId): Get project manhour summary with budget and earned value
 *
 * Returns:
 * - has_budget: boolean - Whether the project has an active budget
 * - budget?: BudgetSummary - Budget details with earned value metrics (if has_budget is true)
 *
 * Query Key: ['projects', projectId, 'manhour-summary']
 * Cache: 1 minute (staleTime: 60_000)
 *
 * @example
 * const { data, isLoading, error } = useProjectManhours(projectId);
 * if (data?.has_budget) {
 *   console.log('Earned MH:', data.budget.earned_mh);
 *   console.log('% Complete:', data.budget.percent_complete);
 * }
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Budget summary with earned value metrics
 */
interface BudgetSummary {
  id: string;
  version_number: number;
  total_budgeted_mh: number;
  allocated_mh: number;
  earned_mh: number;
  remaining_mh: number;
  percent_complete: number;
  component_count: number;
  revision_reason: string;
  effective_date: string;
}

/**
 * Project manhour summary result
 */
export interface ProjectManhourSummary {
  has_budget: boolean;
  budget?: BudgetSummary;
}

// ============================================================================
// QUERY
// ============================================================================

/**
 * useProjectManhours - Query project-level manhour summary with earned value
 *
 * @param projectId - Project UUID
 * @returns UseQueryResult<ProjectManhourSummary, Error>
 *
 * Query Key: ['projects', projectId, 'manhour-summary']
 * Cache: 1 minute (staleTime: 60_000)
 *
 * Logic:
 * 1. Fetch active budget from project_manhour_budgets
 * 2. If no budget, return { has_budget: false }
 * 3. If budget exists, query components to compute:
 *    - allocated_mh = SUM of budgeted_manhours
 *    - earned_mh = SUM of budgeted_manhours * percent_complete / 100
 *    - remaining_mh = total_budgeted_mh - earned_mh
 *    - percent_complete = earned_mh / total_budgeted_mh * 100
 *    - component_count = COUNT of non-retired components
 *
 * @example
 * const { data, isLoading, error } = useProjectManhours('project-uuid');
 * if (data?.has_budget) {
 *   console.log('Budget:', data.budget.total_budgeted_mh);
 *   console.log('Earned:', data.budget.earned_mh);
 * }
 */
export function useProjectManhours(
  projectId: string | undefined
): UseQueryResult<ProjectManhourSummary, Error> {
  return useQuery({
    queryKey: ['projects', projectId, 'manhour-summary'],
    queryFn: async (): Promise<ProjectManhourSummary> => {
      if (!projectId) {
        throw new Error('Project ID is required');
      }

      // Step 1: Fetch active budget
      const { data: budgetData, error: budgetError } = await supabase
        .from('project_manhour_budgets')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .maybeSingle();

      if (budgetError) {
        throw new Error(`Failed to fetch manhour budget: ${budgetError.message}`);
      }

      // Step 2: No budget - return early
      if (!budgetData) {
        return { has_budget: false };
      }

      // Step 3: Query components for earned value calculation
      const { data: components, error: componentsError } = await supabase
        .from('components')
        .select('budgeted_manhours, percent_complete')
        .eq('project_id', projectId)
        .eq('is_retired', false);

      if (componentsError) {
        throw new Error(`Failed to fetch components: ${componentsError.message}`);
      }

      // Step 4: Compute metrics
      const componentsList = components || [];
      const component_count = componentsList.length;

      const allocated_mh = componentsList.reduce((sum, c) => {
        return sum + (c.budgeted_manhours || 0);
      }, 0);

      const earned_mh = componentsList.reduce((sum, c) => {
        const budgeted = c.budgeted_manhours || 0;
        const pct = c.percent_complete || 0;
        return sum + (budgeted * pct / 100.0);
      }, 0);

      const total_budgeted_mh = budgetData.total_budgeted_manhours;
      const remaining_mh = total_budgeted_mh - earned_mh;
      const percent_complete = total_budgeted_mh > 0
        ? (earned_mh / total_budgeted_mh) * 100
        : 0;

      // Step 5: Build response
      return {
        has_budget: true,
        budget: {
          id: budgetData.id,
          version_number: budgetData.version_number,
          total_budgeted_mh: budgetData.total_budgeted_manhours,
          allocated_mh,
          earned_mh,
          remaining_mh,
          percent_complete,
          component_count,
          revision_reason: budgetData.revision_reason,
          effective_date: budgetData.effective_date,
        },
      };
    },
    staleTime: 60_000, // 1 minute
    enabled: !!projectId, // Only run query if projectId is provided
  });
}
