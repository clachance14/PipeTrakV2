/**
 * Workflow Stage Configuration
 *
 * Static configuration for 7-stage test package workflow (FR-019).
 * Defines stage order, required sign-offs, and workflow progression logic.
 *
 * Configuration:
 * - WORKFLOW_STAGES: Array of 7 stage configurations with required sign-offs
 * - getStageConfig: Retrieve configuration for a specific stage
 * - getNextStage: Determine next stage in sequential workflow
 */

import type { StageName, StageConfig } from '@/types/workflow.types';

// ============================================================================
// STAGE CONFIGURATION
// ============================================================================

/**
 * 7-Stage Workflow Configuration (FR-019)
 *
 * Each stage has:
 * - name: Official stage name (matches StageName type)
 * - order: Sequential order (1-7)
 * - required_signoffs: Sign-offs required to complete stage (FR-024)
 * - optional_signoffs: Sign-offs that can be added but not required
 *
 * Stages are sequential - previous stage must be completed (or skipped) before next stage is available.
 */
export const WORKFLOW_STAGES: StageConfig[] = [
  {
    name: 'Pre-Hydro Acceptance',
    order: 1,
    required_signoffs: ['qc_rep'],
    optional_signoffs: [],
  },
  {
    name: 'Test Acceptance',
    order: 2,
    required_signoffs: ['qc_rep', 'client_rep'],
    optional_signoffs: [],
  },
  {
    name: 'Drain/Flush Acceptance',
    order: 3,
    required_signoffs: ['qc_rep'],
    optional_signoffs: [],
  },
  {
    name: 'Post-Hydro Acceptance',
    order: 4,
    required_signoffs: ['qc_rep'],
    optional_signoffs: [],
  },
  {
    name: 'Protective Coatings Acceptance',
    order: 5,
    required_signoffs: ['qc_rep'],
    optional_signoffs: [],
  },
  {
    name: 'Insulation Acceptance',
    order: 6,
    required_signoffs: ['qc_rep'],
    optional_signoffs: [],
  },
  {
    name: 'Final Package Acceptance',
    order: 7,
    required_signoffs: ['qc_rep', 'client_rep', 'mfg_rep'],
    optional_signoffs: [],
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get stage configuration by name
 *
 * Retrieves static configuration for a specific workflow stage.
 * Throws error if stage name is invalid.
 *
 * @param stageName - Stage name (1 of 7 valid stages)
 * @returns Stage configuration object
 * @throws Error if stage name not found
 *
 * @example
 * getStageConfig('Pre-Hydro Acceptance')
 * // { name: 'Pre-Hydro Acceptance', order: 1, required_signoffs: ['qc_rep'], optional_signoffs: [] }
 *
 * getStageConfig('Invalid Stage')
 * // throws Error: Unknown stage: Invalid Stage
 */
export function getStageConfig(stageName: StageName): StageConfig {
  const config = WORKFLOW_STAGES.find((s) => s.name === stageName);
  if (!config) throw new Error(`Unknown stage: ${stageName}`);
  return config;
}

/**
 * Get next stage in workflow sequence (FR-020)
 *
 * Returns the next stage in the 7-stage sequence, or null if current stage is final.
 * Used for sequential workflow enforcement.
 *
 * @param currentStage - Current stage name
 * @returns Next stage name, or null if at final stage
 *
 * @example
 * getNextStage('Pre-Hydro Acceptance')
 * // 'Test Acceptance'
 *
 * getNextStage('Final Package Acceptance')
 * // null (final stage)
 *
 * getNextStage('Invalid Stage')
 * // null (stage not found)
 */
export function getNextStage(currentStage: StageName): StageName | null {
  const currentIndex = WORKFLOW_STAGES.findIndex((s) => s.name === currentStage);
  if (currentIndex === -1 || currentIndex === WORKFLOW_STAGES.length - 1) {
    return null;
  }
  const nextStage = WORKFLOW_STAGES[currentIndex + 1];
  return nextStage ? nextStage.name : null;
}

/**
 * Get previous stage in workflow sequence
 *
 * Returns the previous stage in the 7-stage sequence, or null if current stage is first.
 * Useful for workflow navigation and breadcrumbs.
 *
 * @param currentStage - Current stage name
 * @returns Previous stage name, or null if at first stage
 *
 * @example
 * getPreviousStage('Test Acceptance')
 * // 'Pre-Hydro Acceptance'
 *
 * getPreviousStage('Pre-Hydro Acceptance')
 * // null (first stage)
 */
export function getPreviousStage(currentStage: StageName): StageName | null {
  const currentIndex = WORKFLOW_STAGES.findIndex((s) => s.name === currentStage);
  if (currentIndex <= 0) {
    return null;
  }
  const prevStage = WORKFLOW_STAGES[currentIndex - 1];
  return prevStage ? prevStage.name : null;
}

/**
 * Check if stage is final stage
 *
 * Returns true if stage is 'Final Package Acceptance' (order 7).
 *
 * @param stageName - Stage name to check
 * @returns True if final stage, false otherwise
 *
 * @example
 * isFinalStage('Final Package Acceptance')
 * // true
 *
 * isFinalStage('Pre-Hydro Acceptance')
 * // false
 */
export function isFinalStage(stageName: StageName): boolean {
  return stageName === 'Final Package Acceptance';
}

/**
 * Get stage by order number
 *
 * Returns stage configuration by order (1-7).
 * Useful for stepper UI navigation.
 *
 * @param order - Stage order (1-7)
 * @returns Stage configuration, or undefined if order out of range
 *
 * @example
 * getStageByOrder(1)
 * // { name: 'Pre-Hydro Acceptance', order: 1, ... }
 *
 * getStageByOrder(8)
 * // undefined (out of range)
 */
export function getStageByOrder(order: number): StageConfig | undefined {
  return WORKFLOW_STAGES.find((s) => s.order === order);
}

// ============================================================================
// EXPORTS
// ============================================================================

export const workflowStageConfigUtils = {
  WORKFLOW_STAGES,
  getStageConfig,
  getNextStage,
  getPreviousStage,
  isFinalStage,
  getStageByOrder,
};

export default workflowStageConfigUtils;
