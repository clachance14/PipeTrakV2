import type {
  MilestoneUpdatePayload,
  ProgressTemplate,
  ValidationResult,
} from '@/types/drawing-table.types'

/**
 * Validates a milestone update payload against a progress template
 *
 * Validation rules:
 * - Milestone name must exist in template
 * - Discrete milestones (is_partial=false) must have boolean values
 * - Partial milestones (is_partial=true) must have numeric values 0-100
 * - No NaN or Infinity values allowed
 *
 * @param payload - The milestone update payload to validate
 * @param template - The progress template for this component type
 * @returns ValidationResult - { valid: true } or { valid: false, error: string }
 */
export function validateMilestoneUpdate(
  payload: MilestoneUpdatePayload,
  template: ProgressTemplate
): ValidationResult {
  const { milestone_name, value } = payload

  // Check for empty milestone name
  if (!milestone_name || milestone_name.trim() === '') {
    return { valid: false, error: 'Milestone name cannot be empty' }
  }

  // Find milestone configuration in template
  const milestoneConfig = template.milestones_config.find(
    (m) => m.name === milestone_name
  )

  if (!milestoneConfig) {
    return {
      valid: false,
      error: `Milestone "${milestone_name}" not found in template`,
    }
  }

  // Validate based on milestone type
  if (milestoneConfig.is_partial) {
    // Partial milestone: must be a number 0-100
    if (typeof value !== 'number') {
      return {
        valid: false,
        error: `Milestone "${milestone_name}" requires a number value (0-100)`,
      }
    }

    // Check for NaN or Infinity
    if (!Number.isFinite(value)) {
      return {
        valid: false,
        error: `Milestone "${milestone_name}": value must be between 0-100`,
      }
    }

    // Check range
    if (value < 0 || value > 100) {
      return {
        valid: false,
        error: `Milestone "${milestone_name}": value must be between 0-100`,
      }
    }

    return { valid: true }
  } else {
    // Discrete milestone: must be a boolean
    if (typeof value !== 'boolean') {
      return {
        valid: false,
        error: `Milestone "${milestone_name}" requires a boolean value`,
      }
    }

    return { valid: true }
  }
}
