/**
 * Package Validation Utilities
 *
 * Client-side validation helpers for test package workflow.
 * Used before submitting certificate and assignment data to Supabase.
 *
 * Validation Functions:
 * - validateCertificate: Validate certificate form fields (FR-016)
 * - validateComponentAssignments: Check component uniqueness via Supabase query (FR-012, FR-013)
 */

import { supabase } from '@/lib/supabase';
import type { CertificateValidationErrors } from '@/types/certificate.types';
import type { ComponentAssignmentConflict } from '@/types/assignment.types';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Certificate validation input
 *
 * Partial certificate data for validation (supports draft and complete modes).
 */
export interface CertificateValidationInput {
  test_pressure?: number | null;
  test_media?: string | null;
  temperature?: number | null;
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate certificate form fields (FR-016)
 *
 * Checks required fields for certificate completion.
 * Returns structured validation errors for form display.
 *
 * @param input - Partial certificate data
 * @returns Validation errors object (empty if all valid)
 */
export function validateCertificate(
  input: CertificateValidationInput
): CertificateValidationErrors {
  const errors: CertificateValidationErrors = {};

  // Validate test_pressure (must be > 0)
  if (!input.test_pressure || input.test_pressure <= 0) {
    errors.test_pressure = ['Test pressure must be greater than 0'];
  }

  // Validate test_media (must be non-empty string)
  if (!input.test_media || input.test_media.trim().length === 0) {
    errors.test_media = ['Test media is required'];
  }

  // Validate temperature (must be > -273°C, absolute zero)
  if (input.temperature === null || input.temperature === undefined) {
    errors.temperature = ['Temperature is required'];
  } else if (input.temperature <= -273) {
    errors.temperature = ['Temperature must be above absolute zero (-273°C)'];
  }

  return errors;
}

/**
 * Check if certificate validation errors object has any errors
 *
 * @param errors - Validation errors object from validateCertificate
 * @returns True if errors exist, false otherwise
 */
export function hasValidationErrors(errors: CertificateValidationErrors): boolean {
  return Object.keys(errors).length > 0;
}

/**
 * Validate component assignments for uniqueness (FR-012, FR-013)
 *
 * Queries database to check if any components are already assigned to other packages.
 * Returns conflicts with details about current package assignments.
 *
 * @param packageId - Package ID to assign components to
 * @param componentIds - Array of component IDs to validate
 * @returns Array of conflicts (empty if all components can be assigned)
 */
export async function validateComponentAssignments(
  packageId: string,
  componentIds: string[]
): Promise<ComponentAssignmentConflict[]> {
  // Query components that are already assigned to other packages
  const { data, error } = await supabase
    .from('components')
    .select('id, test_package_id, identity_key, component_type, test_packages!test_package_id(name)')
    .in('id', componentIds)
    .not('test_package_id', 'is', null)
    .neq('test_package_id', packageId);

  if (error) throw error;

  // Map conflicts to structured error format
  return (data || []).map((component: any) => {
    const packageName = Array.isArray(component.test_packages)
      ? component.test_packages[0]?.name
      : component.test_packages?.name;

    return {
      component_id: component.id,
      component_identity: formatComponentIdentity({
        component_type: component.component_type,
        identity_key: component.identity_key as Record<string, unknown>,
      }),
      current_package_id: component.test_package_id!,
      current_package_name: packageName || 'Unknown',
      error_message: `Component already assigned to package "${packageName || 'Unknown'}"`,
    };
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format component identity for display (internal helper)
 *
 * Generates human-readable identity string from component data.
 */
function formatComponentIdentity(component: {
  component_type: string;
  identity_key: Record<string, unknown>;
}): string {
  const { component_type } = component;
  const identityKey = component.identity_key;

  switch (component_type) {
    case 'field_weld':
      return `Weld ${identityKey.weld_number || 'Unknown'}`;
    case 'spool':
      return `Spool ${identityKey.spool_id || 'Unknown'}`;
    case 'support':
    case 'valve':
    case 'fitting':
    case 'flange':
    case 'instrument':
    case 'tubing':
    case 'hose':
    case 'misc_component':
    case 'threaded_pipe':
      return `${component_type.charAt(0).toUpperCase() + component_type.slice(1).replace('_', ' ')} ${identityKey.seq || 'Unknown'}`;
    default:
      return `Component ${identityKey.id || 'Unknown'}`;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const packageValidationUtils = {
  validateCertificate,
  hasValidationErrors,
  validateComponentAssignments,
};

export default packageValidationUtils;
