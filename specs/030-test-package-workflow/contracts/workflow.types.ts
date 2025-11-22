/**
 * Workflow Domain Types
 *
 * TypeScript interfaces for package workflow stage entities.
 * See: specs/030-test-package-workflow/data-model.md
 */

/**
 * Stage Name Enum
 *
 * Valid values for stage_name column (FR-019: 7 sequential stages).
 * Matches CHECK constraint in migration 00123.
 */
export type StageName =
  | 'Pre-Hydro Acceptance'
  | 'Test Acceptance'
  | 'Drain/Flush Acceptance'
  | 'Post-Hydro Acceptance'
  | 'Protective Coatings Acceptance'
  | 'Insulation Acceptance'
  | 'Final Package Acceptance';

/**
 * Stage Status Enum
 *
 * Valid values for status column.
 * Matches CHECK constraint in migration 00123.
 */
export type StageStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';

/**
 * Sign-Off
 *
 * Individual sign-off record (stored in signoffs JSONB).
 * See research.md Decision 5.
 */
export interface SignOff {
  name: string;
  date: string; // ISO 8601 date string
  user_id: string;
}

/**
 * Stage Sign-Offs
 *
 * All possible sign-offs for a stage (stored in signoffs JSONB).
 * Initially, only QC users can provide all sign-off types (FR-023).
 */
export interface StageSignOffs {
  qc_rep?: SignOff;
  client_rep?: SignOff;
  mfg_rep?: SignOff;
}

/**
 * Pre-Hydro Stage Data
 *
 * Stage-specific fields for Pre-Hydro Acceptance.
 * Stored in stage_data JSONB column.
 */
export interface PreHydroStageData {
  stage: 'pre_hydro';
  inspector: string;
  nde_complete: boolean;
}

/**
 * Test Acceptance Stage Data
 *
 * Stage-specific fields for Test Acceptance.
 * Stored in stage_data JSONB column.
 */
export interface TestAcceptanceStageData {
  stage: 'test_acceptance';
  gauge_numbers: string[];
  calibration_dates: string[]; // ISO 8601 date strings
  time_held: number; // Minutes
}

/**
 * Drain/Flush Stage Data
 *
 * Stage-specific fields for Drain/Flush Acceptance.
 * Stored in stage_data JSONB column.
 */
export interface DrainFlushStageData {
  stage: 'drain_flush';
  drain_date: string; // ISO 8601 date string
  flush_date: string; // ISO 8601 date string
}

/**
 * Post-Hydro Stage Data
 *
 * Stage-specific fields for Post-Hydro Acceptance.
 * Stored in stage_data JSONB column.
 */
export interface PostHydroStageData {
  stage: 'post_hydro';
  inspection_date: string; // ISO 8601 date string
  defects_found: boolean;
  defect_description?: string;
}

/**
 * Protective Coatings Stage Data
 *
 * Stage-specific fields for Protective Coatings Acceptance.
 * Stored in stage_data JSONB column.
 */
export interface ProtectiveCoatingsStageData {
  stage: 'protective_coatings';
  coating_type: string;
  application_date: string; // ISO 8601 date string
  cure_date: string; // ISO 8601 date string
}

/**
 * Insulation Stage Data
 *
 * Stage-specific fields for Insulation Acceptance.
 * Stored in stage_data JSONB column.
 */
export interface InsulationStageData {
  stage: 'insulation';
  insulation_type: string;
  installation_date: string; // ISO 8601 date string
}

/**
 * Final Acceptance Stage Data
 *
 * Stage-specific fields for Final Package Acceptance.
 * Stored in stage_data JSONB column.
 */
export interface FinalAcceptanceStageData {
  stage: 'final_acceptance';
  final_notes: string;
}

/**
 * Stage Data Union
 *
 * Discriminated union of all stage-specific data types.
 * Enables type-safe access to stage_data JSONB field.
 */
export type StageData =
  | PreHydroStageData
  | TestAcceptanceStageData
  | DrainFlushStageData
  | PostHydroStageData
  | ProtectiveCoatingsStageData
  | InsulationStageData
  | FinalAcceptanceStageData;

/**
 * Package Workflow Stage
 *
 * Represents one step in the 7-stage testing workflow.
 * Corresponds to database table: package_workflow_stages
 */
export interface PackageWorkflowStage {
  id: string;
  package_id: string;
  stage_name: StageName;
  stage_order: number; // 1-7
  status: StageStatus;
  stage_data: StageData | null;
  signoffs: StageSignOffs | null;
  skip_reason: string | null;
  completed_by: string | null;
  completed_at: string | null; // ISO 8601 timestamp
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
}

/**
 * Stage Create Input
 *
 * Input for creating workflow stage (usually auto-created when package certificate submitted).
 */
export interface StageCreateInput {
  package_id: string;
  stage_name: StageName;
  stage_order: number;
  status?: StageStatus; // Default: 'not_started'
}

/**
 * Stage Update Input (In Progress)
 *
 * Input for marking stage as in progress (user clicked stage).
 */
export interface StageUpdateInProgressInput {
  status: 'in_progress';
}

/**
 * Stage Update Input (Completed)
 *
 * Input for marking stage as completed (all required fields + sign-offs provided).
 * FR-024: Requires sign-offs and stage-specific data.
 */
export interface StageUpdateCompletedInput {
  status: 'completed';
  stage_data: StageData;
  signoffs: StageSignOffs;
  completed_by: string; // User ID
  completed_at: string; // ISO 8601 timestamp
}

/**
 * Stage Update Input (Skipped)
 *
 * Input for marking stage as skipped (FR-021: reason required).
 */
export interface StageUpdateSkippedInput {
  status: 'skipped';
  skip_reason: string; // Required, non-empty
}

/**
 * Stage Update Input (Edit)
 *
 * Input for editing completed stage (FR-026: audit trail).
 * Allows updating stage_data and signoffs only.
 */
export interface StageUpdateEditInput {
  stage_data?: StageData;
  signoffs?: StageSignOffs;
}

/**
 * Stage Configuration
 *
 * Static configuration for each workflow stage.
 * Defines required sign-offs and field validation rules.
 */
export interface StageConfig {
  name: StageName;
  order: number;
  required_signoffs: Array<'qc_rep' | 'client_rep' | 'mfg_rep'>;
  optional_signoffs: Array<'qc_rep' | 'client_rep' | 'mfg_rep'>;
}

/**
 * Workflow Progress Summary
 *
 * Computed summary of workflow stage progress for a package.
 */
export interface WorkflowProgressSummary {
  package_id: string;
  total_stages: number; // Always 7
  completed_stages: number;
  skipped_stages: number;
  current_stage: StageName | null; // First non-completed, non-skipped stage
  percent_complete: number; // 0-100%
  can_proceed: boolean; // True if next stage available or all completed
}
