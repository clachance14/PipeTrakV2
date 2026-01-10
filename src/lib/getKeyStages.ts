/**
 * Get Key Workflow Stages for PDF Report
 *
 * Dynamically detects the most important stages from a package's workflow
 * for display on the completion report cover page.
 *
 * Logic:
 * 1. First stage (whatever it is for this test type)
 * 2. Any test-related stage (contains "Test" in name)
 * 3. Final Package Acceptance stage
 *
 * This handles different test types that may have different stage configurations.
 */

import type { PackageWorkflowStage } from '@/types/workflow.types';

/**
 * Extract key stages from workflow for cover page display
 *
 * @param stages - All workflow stages for a package (ordered by stage_order)
 * @returns Array of 1-3 key stages for display
 *
 * @example
 * const keyStages = getKeyStages(workflowStages);
 * // Returns: [Pre-Hydro Acceptance, Test Acceptance, Final Package Acceptance]
 * // Or for Pneumatic: [Pre-Test Acceptance, Pneumatic Test, Final Package Acceptance]
 */
export function getKeyStages(
  stages: PackageWorkflowStage[] | undefined | null
): PackageWorkflowStage[] {
  if (!stages || stages.length === 0) {
    return [];
  }

  const keyStages: PackageWorkflowStage[] = [];
  const addedIds = new Set<string>();

  // 1. First stage (whatever it is for this test type)
  const firstStage = stages.find((s) => s.stage_order === 1);
  if (firstStage) {
    keyStages.push(firstStage);
    addedIds.add(firstStage.id);
  }

  // 2. Any test-related stage (prioritize "Test Acceptance" if exists)
  const testAcceptanceStage = stages.find(
    (s) => s.stage_name === 'Test Acceptance' && !addedIds.has(s.id)
  );

  if (testAcceptanceStage) {
    keyStages.push(testAcceptanceStage);
    addedIds.add(testAcceptanceStage.id);
  } else {
    // Fallback: find any stage with "test" in name (case-insensitive)
    const anyTestStage = stages.find(
      (s) => s.stage_name.toLowerCase().includes('test') && !addedIds.has(s.id)
    );
    if (anyTestStage) {
      keyStages.push(anyTestStage);
      addedIds.add(anyTestStage.id);
    }
  }

  // 3. Final Package Acceptance stage
  const finalStage = stages.find(
    (s) => s.stage_name === 'Final Package Acceptance' && !addedIds.has(s.id)
  );
  if (finalStage) {
    keyStages.push(finalStage);
    addedIds.add(finalStage.id);
  }

  // Sort by stage_order to ensure correct display order
  return keyStages.sort((a, b) => a.stage_order - b.stage_order);
}

/**
 * Format stage completion info for display
 *
 * @param stage - Workflow stage to format
 * @returns Object with formatted display strings including rep names from signoffs
 */
export function formatStageForDisplay(stage: PackageWorkflowStage): {
  name: string;
  status: 'completed' | 'skipped' | 'pending';
  companyRep: string | null;
  clientRep: string | null;
  completedDate: string | null;
} {
  // Extract rep names from signoffs JSONB field
  const companyRep = stage.signoffs?.qc_rep?.name ?? null;
  const clientRep = stage.signoffs?.client_rep?.name ?? null;

  const completedDate =
    stage.status === 'completed' && stage.completed_at
      ? new Date(stage.completed_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'UTC',
        })
      : null;

  return {
    name: stage.stage_name,
    status:
      stage.status === 'completed'
        ? 'completed'
        : stage.status === 'skipped'
          ? 'skipped'
          : 'pending',
    companyRep,
    clientRep,
    completedDate,
  };
}

/**
 * Calculate overall workflow completion for display
 *
 * @param stages - All workflow stages
 * @returns Summary object with counts and percentage
 */
export function getWorkflowSummary(stages: PackageWorkflowStage[] | undefined | null): {
  totalStages: number;
  completedStages: number;
  skippedStages: number;
  percentComplete: number;
  isComplete: boolean;
} {
  if (!stages || stages.length === 0) {
    return {
      totalStages: 0,
      completedStages: 0,
      skippedStages: 0,
      percentComplete: 0,
      isComplete: false,
    };
  }

  const totalStages = stages.length;
  const completedStages = stages.filter((s) => s.status === 'completed').length;
  const skippedStages = stages.filter((s) => s.status === 'skipped').length;

  // Workflow is complete when all stages are either completed or skipped
  const isComplete = completedStages + skippedStages === totalStages;

  // Percentage based on completed (not skipped) stages
  const percentComplete =
    totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;

  return {
    totalStages,
    completedStages,
    skippedStages,
    percentComplete,
    isComplete,
  };
}
