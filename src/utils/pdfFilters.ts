import { PackageWorkflowStage, StageStatus } from '@/types/workflow.types';
import { PackageWorkflowPDFOptions } from '@/stores/usePackageWorkflowCustomizationStore';

/**
 * Apply filters to workflow stages based on PDF export options
 *
 * @param stages - Array of workflow stages to filter
 * @param options - PDF customization options (optional)
 * @returns Filtered array of stages
 * @throws Error if no stages match the filters
 */
export function applyStageFilters(
  stages: PackageWorkflowStage[],
  options?: PackageWorkflowPDFOptions
): PackageWorkflowStage[] {
  if (!options) return stages;

  let filtered = [...stages];

  // Filter by status (if not 'all')
  if (options.stageStatusFilter !== 'all') {
    const statusMap: Record<string, StageStatus> = {
      'completed': 'completed',
      'in-progress': 'in_progress',
      'not-started': 'not_started',
    };

    const targetStatus = statusMap[options.stageStatusFilter];
    if (targetStatus) {
      filtered = filtered.filter((stage) => stage.status === targetStatus);
    }
  }

  // Exclude skipped stages if needed
  if (!options.includeSkippedStages) {
    filtered = filtered.filter((stage) => stage.status !== 'skipped');
  }

  // Validate result
  if (filtered.length === 0) {
    throw new Error('No stages match the selected filters. Please adjust your settings.');
  }

  return filtered;
}

/**
 * Validate that at least one content section is enabled
 *
 * @param options - PDF customization options
 * @returns true if any content is enabled
 */
export function hasAnyContentEnabled(options: PackageWorkflowPDFOptions): boolean {
  // Check if package info section is enabled
  const hasPackageInfo =
    options.includePackageInfo &&
    (options.includeDescription ||
      options.includeTestType ||
      options.includeTargetDate ||
      options.includeRequirements);

  // Check if workflow stages will be shown (after filtering)
  const hasWorkflowStages = true; // Stages always shown unless all filtered out

  // At least one section must be enabled
  return hasPackageInfo || hasWorkflowStages;
}

/**
 * Validate custom text field lengths
 *
 * @param options - PDF customization options
 * @returns Validation error message or null if valid
 */
export function validateCustomTextFields(
  options: PackageWorkflowPDFOptions
): string | null {
  if (options.customTitle && options.customTitle.length > 100) {
    return 'Custom title must be 100 characters or less';
  }

  if (options.customHeaderText && options.customHeaderText.length > 200) {
    return 'Custom header text must be 200 characters or less';
  }

  if (options.customNotes && options.customNotes.length > 1000) {
    return 'Custom notes must be 1000 characters or less';
  }

  return null;
}

/**
 * Validate all PDF customization options
 *
 * @param options - PDF customization options
 * @returns Validation error message or null if valid
 */
export function validatePDFOptions(
  options: PackageWorkflowPDFOptions
): string | null {
  // Check content sections
  if (!hasAnyContentEnabled(options)) {
    return 'At least one content section must be enabled';
  }

  // Check text field lengths
  const textFieldError = validateCustomTextFields(options);
  if (textFieldError) {
    return textFieldError;
  }

  return null;
}
