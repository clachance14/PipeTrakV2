/**
 * TanStack Query hook for updating project template weights (Feature 026 - User Story 2)
 * Provides mutation for updating milestone weights with validation and optimistic locking
 */

import { useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface MilestoneWeight {
  milestone_name: string;
  weight: number;
}

interface UpdateTemplateWeightsParams {
  componentType: string;
  weights: MilestoneWeight[];
  applyToExisting: boolean;
  lastUpdated: string; // ISO timestamp for optimistic locking
}

interface UpdateTemplateWeightsResult {
  success: boolean;
  affected_count: number;
  audit_id: string;
}

/**
 * Validate that all weights are between 0 and 100
 */
function validateWeightRange(weights: MilestoneWeight[]): void {
  for (const { milestone_name, weight } of weights) {
    if (weight < 0 || weight > 100) {
      throw new Error(
        `Weight for "${milestone_name}" must be between 0 and 100 (got ${weight})`
      );
    }
  }
}

/**
 * Validate that weights sum to exactly 100
 */
function validateWeightSum(weights: MilestoneWeight[]): void {
  const total = weights.reduce((sum, { weight }) => sum + weight, 0);
  if (total !== 100) {
    throw new Error(
      `Weights must sum to exactly 100% (current total: ${total}%)`
    );
  }
}

/**
 * Update project template weights for a component type
 * Validates weight range (0-100) and sum (must equal 100)
 * Implements optimistic locking via timestamp comparison
 * Optionally recalculates existing components when applyToExisting is true
 *
 * @param projectId - Project UUID
 * @returns Mutation hook with update function
 */
export function useUpdateProjectTemplates(
  projectId: string
): UseMutationResult<
  UpdateTemplateWeightsResult,
  Error,
  UpdateTemplateWeightsParams
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ componentType, weights, applyToExisting, lastUpdated }) => {
      // Client-side validation before calling RPC
      validateWeightRange(weights);
      validateWeightSum(weights);

      // Call RPC function to update weights
      const { data, error } = await supabase.rpc('update_project_template_weights', {
        p_project_id: projectId,
        p_component_type: componentType,
        p_new_weights: weights as any, // Bypass type checking for new function
        p_apply_to_existing: applyToExisting,
        p_last_updated: lastUpdated,
      });

      if (error) {
        // Handle specific error codes
        if (error.code === 'CONCURRENT_EDIT' || error.message?.includes('modified by another user')) {
          throw new Error('Templates have been modified by another user. Please reload and try again.');
        }
        throw error;
      }

      if (!data) {
        throw new Error('Update failed: No data returned from server');
      }

      // Safely parse the JSON response
      const result = data as unknown as UpdateTemplateWeightsResult;
      return result;
    },
    onSuccess: () => {
      // Invalidate project templates query to refetch updated weights
      queryClient.invalidateQueries({
        queryKey: ['projectTemplates', projectId],
      });

      // Invalidate ALL component queries (both list and individual component queries)
      // This ensures ComponentDetailView refetches with updated milestone weights
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return key === 'components' || key === 'projects' || key === 'effective-template';
        },
      });
    },
  });
}
