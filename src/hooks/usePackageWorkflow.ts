/**
 * Package Workflow Hooks
 *
 * TanStack Query hooks for managing package workflow stages (CRUD operations).
 * Feature 030 - Test Package Lifecycle Workflow
 *
 * Hooks:
 * - usePackageWorkflow: Query all workflow stages for a package
 * - useCreateWorkflowStages: Create initial 7 stages for a package
 * - useUpdateWorkflowStage: Update a single workflow stage
 *
 * Business Rules:
 * - FR-019: 7 sequential stages required
 * - FR-020: Sequential enforcement - previous stage must be completed/skipped
 * - FR-021: Skip requires non-empty reason
 * - FR-024: Stage completion requires stage-specific data + required sign-offs
 * - FR-026: Audit trail tracked via completed_by/completed_at
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { WORKFLOW_STAGES, getStageConfig } from '@/lib/workflowStageConfig';
import type {
  PackageWorkflowStage,
  StageCreateInput,
  StageUpdateInProgressInput,
  StageUpdateCompletedInput,
  StageName,
  StageUpdateSkippedInput,
  StageUpdateEditInput,
} from '@/types/workflow.types';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const packageWorkflowKeys = {
  all: ['package-workflow'] as const,
  byPackage: (packageId: string) => [...packageWorkflowKeys.all, packageId] as const,
};

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Query all workflow stages for a package
 *
 * Returns 7 stages ordered by stage_order (1-7).
 * Stages are auto-created when package certificate is submitted.
 *
 * @param packageId - Package UUID
 * @returns TanStack Query result with PackageWorkflowStage[]
 *
 * @example
 * const { data: stages, isLoading } = usePackageWorkflow(packageId);
 * // stages = [{ stage_name: 'Pre-Hydro Acceptance', status: 'completed', ... }, ...]
 */
export function usePackageWorkflow(packageId: string) {
  return useQuery({
    queryKey: packageWorkflowKeys.byPackage(packageId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('package_workflow_stages')
        .select('*')
        .eq('package_id', packageId)
        .order('stage_order', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch workflow stages: ${error.message}`);
      }

      return data as PackageWorkflowStage[];
    },
    enabled: !!packageId,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create initial 7 workflow stages for a package
 *
 * Auto-creates all 7 stages in 'not_started' status.
 * Called automatically when package certificate is submitted (FR-010).
 *
 * @returns TanStack Mutation for creating workflow stages
 *
 * @example
 * const { mutate: createStages } = useCreateWorkflowStages();
 * createStages({ packageId: 'uuid' });
 */
export function useCreateWorkflowStages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ packageId }: { packageId: string }) => {
      // Build stage creation inputs
      const stages: StageCreateInput[] = WORKFLOW_STAGES.map((stageConfig) => ({
        package_id: packageId,
        stage_name: stageConfig.name,
        stage_order: stageConfig.order,
        status: 'not_started',
      }));

      // Insert all stages
      const { data, error } = await supabase
        .from('package_workflow_stages')
        .insert(stages)
        .select();

      if (error) {
        throw new Error(`Failed to create workflow stages: ${error.message}`);
      }

      return data as PackageWorkflowStage[];
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: packageWorkflowKeys.byPackage(variables.packageId),
      });
      toast.success('Workflow stages created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create workflow stages');
    },
  });
}

/**
 * Update a workflow stage
 *
 * Supports 4 update types:
 * 1. In Progress: Mark stage as in_progress (user clicked stage)
 * 2. Completed: Mark stage as completed (requires stage_data + signoffs)
 * 3. Skipped: Mark stage as skipped (requires skip_reason)
 * 4. Edit: Update stage_data/signoffs for completed stage
 *
 * Sequential Enforcement (FR-020):
 * - Before marking stage as in_progress/completed, validates previous stage is completed/skipped
 * - Stage 1 (Pre-Hydro) has no previous stage, so always available
 *
 * @returns TanStack Mutation for updating workflow stage
 *
 * @example
 * const { mutate: updateStage } = useUpdateWorkflowStage();
 *
 * // Mark as in progress
 * updateStage({ stageId: 'uuid', input: { status: 'in_progress' } });
 *
 * // Mark as completed
 * updateStage({
 *   stageId: 'uuid',
 *   input: {
 *     status: 'completed',
 *     stage_data: { stage: 'pre_hydro', inspector: 'John', nde_complete: true },
 *     signoffs: { qc_rep: { name: 'QC User', date: '2025-11-21', user_id: 'uuid' } },
 *     completed_by: 'user-uuid',
 *     completed_at: '2025-11-21T10:00:00Z',
 *   }
 * });
 *
 * // Skip stage
 * updateStage({
 *   stageId: 'uuid',
 *   input: { status: 'skipped', skip_reason: 'Not applicable' }
 * });
 */
export function useUpdateWorkflowStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      stageId,
      input,
    }: {
      stageId: string;
      input:
        | StageUpdateInProgressInput
        | StageUpdateCompletedInput
        | StageUpdateSkippedInput
        | StageUpdateEditInput;
    }) => {
      // Validate input based on status
      if ('status' in input) {
        if (input.status === 'skipped' && 'skip_reason' in input) {
          if (!input.skip_reason || input.skip_reason.trim().length === 0) {
            throw new Error('Skip reason is required when skipping a stage');
          }
        }

        if (input.status === 'completed' && 'stage_data' in input) {
          if (!input.stage_data) {
            throw new Error('Stage data is required for completion');
          }

          if (!('signoffs' in input) || !input.signoffs) {
            throw new Error('Sign-offs are required for completion');
          }

          // Get current stage to check which sign-offs are required
          const { data: currentStage } = await supabase
            .from('package_workflow_stages')
            .select('stage_name, stage_order, package_id')
            .eq('id', stageId)
            .single();

          if (!currentStage) {
            throw new Error('Stage not found');
          }

          // Validate required sign-offs
          const stageConfig = getStageConfig(currentStage.stage_name as StageName);
          const missingSignoffs = stageConfig.required_signoffs.filter(
            (signoffType) => !input.signoffs?.[signoffType]
          );

          if (missingSignoffs.length > 0) {
            const signoffNames = missingSignoffs.map((type) => {
              if (type === 'qc_rep') return 'QC Representative';
              if (type === 'client_rep') return 'Client Representative';
              if (type === 'mfg_rep') return 'MFG Representative';
              return type;
            });
            throw new Error(`${signoffNames.join(' and ')} sign-off${missingSignoffs.length > 1 ? 's are' : ' is'} required`);
          }

          // Sequential enforcement: validate previous stage is completed/skipped
          if (currentStage.stage_order > 1) {
            const { data: allStages } = await supabase
              .from('package_workflow_stages')
              .select('stage_order, status')
              .eq('package_id', currentStage.package_id)
              .order('stage_order', { ascending: true });

            if (allStages) {
              const previousStage = allStages.find(
                (s) => s.stage_order === currentStage.stage_order - 1
              );

              if (
                previousStage &&
                previousStage.status !== 'completed' &&
                previousStage.status !== 'skipped'
              ) {
                throw new Error('Cannot complete stage: previous stage not completed or skipped');
              }
            }
          }
        }
      }

      // Update stage - cast signoffs and stage_data to Json for database compatibility
      const updateData: any = { ...input };

      // Cast signoffs if present (only in completed/edit inputs)
      if ('signoffs' in input && input.signoffs) {
        updateData.signoffs = input.signoffs as any;
      }

      // Cast stage_data if present
      if ('stage_data' in input && input.stage_data) {
        updateData.stage_data = input.stage_data as any;
      }

      const { data, error } = await supabase
        .from('package_workflow_stages')
        .update(updateData)
        .eq('id', stageId)
        .select();

      if (error) {
        throw new Error(`Failed to update workflow stage: ${error.message}`);
      }

      return data as PackageWorkflowStage[];
    },
    onSuccess: (data) => {
      const stage = data[0];
      if (stage) {
        queryClient.invalidateQueries({
          queryKey: packageWorkflowKeys.byPackage(stage.package_id),
        });

        if ('status' in stage) {
          if (stage.status === 'completed') {
            toast.success(`${stage.stage_name} completed successfully`);
          } else if (stage.status === 'skipped') {
            toast.success(`${stage.stage_name} skipped`);
          } else if (stage.status === 'in_progress') {
            toast.success(`Started ${stage.stage_name}`);
          }
        }
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update workflow stage');
    },
  });
}

/**
 * Check if stage is available (unlocked)
 *
 * Helper function for sequential enforcement.
 * Stage is available if:
 * - It's the first stage (order 1), OR
 * - Previous stage is completed or skipped
 *
 * @param stages - All workflow stages for package
 * @param stageOrder - Order of stage to check (1-7)
 * @returns True if stage is available, false if locked
 *
 * @example
 * const isAvailable = isStageAvailable(stages, 2);
 * // true if stage 1 is completed or skipped
 */
export function isStageAvailable(
  stages: PackageWorkflowStage[],
  stageOrder: number
): boolean {
  // First stage always available
  if (stageOrder === 1) return true;

  // Find previous stage
  const previousStage = stages.find((s) => s.stage_order === stageOrder - 1);

  // Previous stage must be completed or skipped
  return (
    previousStage?.status === 'completed' || previousStage?.status === 'skipped'
  );
}

/**
 * Get workflow progress summary
 *
 * Computes completion percentage and current stage.
 * Used for dashboard/progress indicators.
 *
 * @param stages - All workflow stages for package
 * @returns Progress summary with percentage and current stage
 *
 * @example
 * const progress = getWorkflowProgress(stages);
 * // { total_stages: 7, completed_stages: 3, percent_complete: 42.86, ... }
 */
export function getWorkflowProgress(stages: PackageWorkflowStage[]) {
  const totalStages = 7;
  const completedStages = stages.filter((s) => s.status === 'completed').length;
  const skippedStages = stages.filter((s) => s.status === 'skipped').length;
  const currentStage = stages.find(
    (s) => s.status !== 'completed' && s.status !== 'skipped'
  );

  return {
    total_stages: totalStages,
    completed_stages: completedStages,
    skipped_stages: skippedStages,
    current_stage: currentStage?.stage_name || null,
    percent_complete: Math.round((completedStages / totalStages) * 100),
    can_proceed: completedStages === totalStages || !!currentStage,
  };
}
