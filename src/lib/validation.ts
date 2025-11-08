/**
 * Validation Utilities for Sprint 1 Core Foundation
 *
 * Client-side validation helpers that mirror database-level validation logic.
 * Used by TanStack Query hooks before submitting data to Supabase.
 *
 * Validation Functions:
 * - validateComponentIdentityKey: Validate identity_key structure matches component_type (FR-041)
 * - validateProgressTemplateWeights: Validate milestone weights total exactly 100% (FR-042)
 * - validateWelderStencil: Validate welder stencil format (FR-043)
 * - validateDrawingNumber: Validate drawing number format (FR-044)
 * - validatePercentComplete: Validate percent complete range (FR-046)
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type ComponentType =
  | 'spool'
  | 'field_weld'
  | 'support'
  | 'valve'
  | 'fitting'
  | 'flange'
  | 'instrument'
  | 'tubing'
  | 'hose'
  | 'misc_component'
  | 'threaded_pipe';

export interface IdentityKey {
  // Spool
  spool_id?: string;

  // Field Weld
  weld_number?: string;

  // Support, valve, fitting, flange, instrument, tubing, hose, misc_component, threaded_pipe
  drawing_norm?: string;
  commodity_code?: string;
  size?: string;
  seq?: number;
}

export interface MilestoneConfig {
  name: string;
  weight: number;
  order: number;
  is_partial?: boolean;
  requires_welder?: boolean;
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate component identity_key structure matches component_type (FR-041)
 *
 * Mirrors the database-level validate_component_identity_key() function.
 *
 * @param componentType - One of 11 component types
 * @param identityKey - Component identity key object
 * @returns true if valid, false otherwise
 *
 * @example
 * validateComponentIdentityKey('spool', { spool_id: 'SP-001' }) // true
 * validateComponentIdentityKey('spool', { weld_number: 'W-001' }) // false
 * validateComponentIdentityKey('support', { drawing_norm: 'P-001', commodity_code: 'CS-2', size: '2IN', seq: 1 }) // true
 */
export function validateComponentIdentityKey(
  componentType: ComponentType,
  identityKey: IdentityKey
): boolean {
  switch (componentType) {
    case 'spool':
      return (
        typeof identityKey.spool_id === 'string' &&
        identityKey.spool_id.length > 0
      );

    case 'field_weld':
      return (
        typeof identityKey.weld_number === 'string' &&
        identityKey.weld_number.length > 0
      );

    case 'support':
    case 'valve':
    case 'fitting':
    case 'flange':
    case 'instrument':
    case 'tubing':
    case 'hose':
    case 'misc_component':
      return (
        typeof identityKey.drawing_norm === 'string' &&
        identityKey.drawing_norm.length > 0 &&
        typeof identityKey.commodity_code === 'string' &&
        identityKey.commodity_code.length > 0 &&
        typeof identityKey.size === 'string' &&
        identityKey.size.length > 0 &&
        typeof identityKey.seq === 'number' &&
        identityKey.seq >= 0
      );

    case 'threaded_pipe':
      return (
        typeof identityKey.drawing_norm === 'string' &&
        identityKey.drawing_norm.length > 0 &&
        typeof identityKey.commodity_code === 'string' &&
        identityKey.commodity_code.length > 0 &&
        typeof identityKey.size === 'string' &&
        identityKey.size.length > 0 &&
        identityKey.seq !== undefined
      );

    default:
      return false;
  }
}

/**
 * Validate progress template milestone weights total exactly 100% (FR-042)
 *
 * Mirrors the database-level validate_milestone_weights() function.
 *
 * @param milestonesConfig - Array of milestone configuration objects
 * @returns true if weights total 100.00, false otherwise
 *
 * @example
 * validateProgressTemplateWeights([
 *   { name: 'Receive', weight: 5, order: 1 },
 *   { name: 'Erect', weight: 40, order: 2 },
 *   { name: 'Connect', weight: 40, order: 3 },
 *   { name: 'Punch', weight: 5, order: 4 },
 *   { name: 'Test', weight: 5, order: 5 },
 *   { name: 'Restore', weight: 5, order: 6 }
 * ]) // true (total = 100)
 *
 * validateProgressTemplateWeights([
 *   { name: 'Receive', weight: 5, order: 1 },
 *   { name: 'Erect', weight: 40, order: 2 },
 *   { name: 'Connect', weight: 40, order: 3 },
 *   { name: 'Punch', weight: 5, order: 4 },
 *   { name: 'Test', weight: 5, order: 5 },
 *   { name: 'Restore', weight: 2, order: 6 }
 * ]) // false (total = 97)
 */
export function validateProgressTemplateWeights(
  milestonesConfig: MilestoneConfig[]
): boolean {
  const totalWeight = milestonesConfig.reduce(
    (sum, milestone) => sum + milestone.weight,
    0
  );

  return totalWeight === 100;
}

/**
 * Validate welder stencil format (FR-043)
 *
 * Stencil must be uppercase alphanumeric with optional hyphens, 2-12 characters.
 *
 * @param stencil - Welder stencil string
 * @returns true if valid format, false otherwise
 *
 * @example
 * validateWelderStencil('JD42') // true
 * validateWelderStencil('AB-99') // true
 * validateWelderStencil('A') // false (too short)
 * validateWelderStencil('ABCDEFGHIJKLM') // false (too long)
 * validateWelderStencil('jd42') // false (not uppercase, but normalization should handle this)
 */
export function validateWelderStencil(stencil: string): boolean {
  const stencilRegex = /^[A-Z0-9-]{2,12}$/;
  return stencilRegex.test(stencil);
}

/**
 * Normalize welder stencil (UPPER, TRIM)
 *
 * Mirrors the database-level normalization logic.
 *
 * @param stencil - Raw welder stencil
 * @returns Normalized stencil (uppercase, trimmed)
 *
 * @example
 * normalizeWelderStencil('jd42') // 'JD42'
 * normalizeWelderStencil('  AB-99  ') // 'AB-99'
 */
export function normalizeWelderStencil(stencil: string): string {
  return stencil.trim().toUpperCase();
}

/**
 * Validate drawing number format (FR-044)
 *
 * Drawing number must be non-empty after trimming.
 *
 * @param drawingNoRaw - Raw drawing number
 * @returns true if valid format, false otherwise
 *
 * @example
 * validateDrawingNumber('P-001') // true
 * validateDrawingNumber('  P-001  ') // true (trimmed)
 * validateDrawingNumber('') // false
 * validateDrawingNumber('   ') // false
 */
export function validateDrawingNumber(drawingNoRaw: string): boolean {
  return drawingNoRaw.trim().length > 0;
}

/**
 * Normalize drawing number (UPPER, TRIM)
 *
 * Mirrors the database-level normalize_drawing_number() function.
 *
 * @param drawingNoRaw - Raw drawing number
 * @returns Normalized drawing number (uppercase, trimmed)
 *
 * @example
 * normalizeDrawingNumber('p-001') // 'P-001'
 * normalizeDrawingNumber('  P-001  ') // 'P-001'
 */
export function normalizeDrawingNumber(drawingNoRaw: string): string {
  return drawingNoRaw.trim().toUpperCase().replace(/\s+/g, ' ');
}

/**
 * Validate percent complete range (FR-046)
 *
 * Percent must be between 0.00 and 100.00 (inclusive).
 *
 * @param percent - Percent complete value
 * @returns true if in valid range, false otherwise
 *
 * @example
 * validatePercentComplete(0) // true
 * validatePercentComplete(50.5) // true
 * validatePercentComplete(100) // true
 * validatePercentComplete(-1) // false
 * validatePercentComplete(100.01) // false
 */
export function validatePercentComplete(percent: number): boolean {
  return percent >= 0.0 && percent <= 100.0;
}

/**
 * Validate weld ID number format (FR-055)
 *
 * Weld ID must be a positive number, supports repairs with decimal notation (42.0, 42.1, 42.2).
 *
 * @param weldIdNumber - Weld ID number
 * @returns true if valid format, false otherwise
 *
 * @example
 * validateWeldIdNumber(42.0) // true (original weld)
 * validateWeldIdNumber(42.1) // true (first repair)
 * validateWeldIdNumber(42.2) // true (second repair)
 * validateWeldIdNumber(-1) // false (negative)
 * validateWeldIdNumber(0) // false (zero not allowed)
 */
export function validateWeldIdNumber(weldIdNumber: number): boolean {
  return weldIdNumber > 0;
}

/**
 * Calculate next repair weld ID number
 *
 * Given a parent weld ID, calculate the next repair sequence number.
 *
 * @param parentWeldIdNumber - Parent weld ID number (e.g., 42.0)
 * @param currentRepairSequence - Current repair sequence (0 for original, 1+ for repairs)
 * @returns Next repair weld ID number (e.g., 42.1, 42.2)
 *
 * @example
 * calculateNextRepairWeldId(42.0, 0) // 42.1 (first repair)
 * calculateNextRepairWeldId(42.0, 1) // 42.2 (second repair)
 */
export function calculateNextRepairWeldId(
  parentWeldIdNumber: number,
  currentRepairSequence: number
): number {
  const baseWeldId = Math.floor(parentWeldIdNumber);
  const nextRepairSequence = currentRepairSequence + 1;
  return baseWeldId + nextRepairSequence / 10;
}

/**
 * Validates a metadata name for creation (Areas, Systems, Test Packages)
 *
 * Checks for empty names and duplicate entries (case-insensitive comparison).
 *
 * @param name - The name to validate (will be trimmed)
 * @param existingNames - Array of existing names to check against (case-insensitive)
 * @returns Validation result object with isValid boolean and optional error message
 *
 * @example
 * validateMetadataName('Area A', ['Area B', 'Area C'])
 * // { isValid: true }
 *
 * validateMetadataName('Area A', ['Area A', 'Area B'])
 * // { isValid: false, error: 'A metadata entry named "Area A" already exists' }
 *
 * validateMetadataName('   ', [])
 * // { isValid: false, error: 'Name cannot be empty' }
 */
export function validateMetadataName(
  name: string,
  existingNames: string[]
): { isValid: boolean; error?: string } {
  const trimmedName = name.trim();

  // Check if empty
  if (trimmedName.length === 0) {
    return { isValid: false, error: 'Name cannot be empty' };
  }

  // Check for duplicate (case-insensitive)
  const isDuplicate = existingNames.some(
    (existing) => existing.trim().toLowerCase() === trimmedName.toLowerCase()
  );

  if (isDuplicate) {
    return {
      isValid: false,
      error: `A metadata entry named "${trimmedName}" already exists`,
    };
  }

  return { isValid: true };
}

/**
 * Checks if a name already exists in a list (case-insensitive, trimmed)
 *
 * Useful for quick duplicate checks without full validation.
 *
 * @param name - The name to check
 * @param existingNames - Array of existing names to check against
 * @returns true if name exists, false otherwise
 *
 * @example
 * isDuplicateName('Area A', ['Area A', 'Area B']) // true
 * isDuplicateName('area a', ['Area A', 'Area B']) // true (case-insensitive)
 * isDuplicateName('Area C', ['Area A', 'Area B']) // false
 */
export function isDuplicateName(
  name: string,
  existingNames: string[]
): boolean {
  const trimmedName = name.trim().toLowerCase();
  return existingNames.some(
    (existing) => existing.trim().toLowerCase() === trimmedName
  );
}

/**
 * Normalizes a name for comparison (trim + lowercase)
 *
 * Useful for consistent name matching and storage.
 *
 * @param name - The name to normalize
 * @returns Normalized name (trimmed and lowercase)
 *
 * @example
 * normalizeName('  Area A  ') // 'area a'
 * normalizeName('SYSTEM X') // 'system x'
 */
export function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

// ============================================================================
// EXPORTS
// ============================================================================

export const validationUtils = {
  validateComponentIdentityKey,
  validateProgressTemplateWeights,
  validateWelderStencil,
  normalizeWelderStencil,
  validateDrawingNumber,
  normalizeDrawingNumber,
  validatePercentComplete,
  validateWeldIdNumber,
  calculateNextRepairWeldId,
  validateMetadataName,
  isDuplicateName,
  normalizeName,
};

export default validationUtils;
