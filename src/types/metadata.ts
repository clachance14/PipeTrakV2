/**
 * Component Metadata Editing Types
 *
 * Feature: 020-component-metadata-editing
 * Date: 2025-10-29
 *
 * This file defines TypeScript types and interfaces for the component metadata
 * editing feature. These types serve as the single source of truth for data shapes
 * used across hooks, components, and API calls.
 *
 * Extracted from: specs/020-component-metadata-editing/contracts/metadata-api.ts
 */

// ============================================================================
// Database Entity Types (from Supabase schema)
// ============================================================================

/**
 * Component entity from components table
 *
 * Represents a pipe component with metadata assignments and audit tracking.
 */
export interface Component {
  /** Unique identifier (UUID) */
  id: string
  /** Drawing reference number */
  drawing_number: string
  /** Component identity (e.g., "P-001-ST-2.5") */
  component_identity: string
  /** Component type (e.g., "Elbow", "Tee", "Pipe") */
  component_type: string
  /** Component size (e.g., "2.5\"", null if not applicable) */
  size: string | null

  /** Metadata assignments (nullable) */
  area_id: string | null
  system_id: string | null
  test_package_id: string | null

  /** Joined relations (optional, depends on query) */
  area?: Area
  system?: System
  test_package?: TestPackage

  /** Audit fields */
  /** Integer version for optimistic locking and concurrent edit detection */
  version: number
  /** ISO 8601 timestamp of last update */
  last_updated_at: string
  /** Organization ID (multi-tenant support) */
  organization_id: string
  /** Project ID within organization */
  project_id: string
}

/**
 * Area entity from areas table
 *
 * Represents a project area (e.g., "North Wing", "Building A")
 */
export interface Area {
  /** Unique identifier (UUID) */
  id: string
  /** Display name */
  name: string
  /** Project ID within organization */
  project_id: string
  /** Organization ID */
  organization_id: string
  /** User ID who created this area */
  created_by: string
  /** ISO 8601 creation timestamp */
  created_at: string
}

/**
 * System entity from systems table
 *
 * Represents a project system (e.g., "HVAC", "Plumbing", "Electrical")
 */
export interface System {
  /** Unique identifier (UUID) */
  id: string
  /** Display name */
  name: string
  /** Project ID within organization */
  project_id: string
  /** Organization ID */
  organization_id: string
  /** User ID who created this system */
  created_by: string
  /** ISO 8601 creation timestamp */
  created_at: string
}

/**
 * Test Package entity from test_packages table
 *
 * Represents a test package grouping (e.g., "TP-01", "Acceptance Test Package")
 */
export interface TestPackage {
  /** Unique identifier (UUID) */
  id: string
  /** Display name */
  name: string
  /** Project ID within organization */
  project_id: string
  /** Organization ID */
  organization_id: string
  /** User ID who created this test package */
  created_by: string
  /** ISO 8601 creation timestamp */
  created_at: string
}

// ============================================================================
// Mutation Parameter Types
// ============================================================================

/**
 * Parameters for updating component metadata
 *
 * Used to save changes to a component's area, system, and test package assignments.
 * The `version` field enables optimistic locking to detect concurrent edits.
 *
 * @example
 * ```typescript
 * mutation.mutate({
 *   componentId: 'uuid-123',
 *   version: 5,
 *   area_id: 'area-uuid-456',
 *   system_id: null,  // Clears system assignment
 *   test_package_id: 'tp-uuid-789'
 * })
 * ```
 */
export interface UpdateComponentMetadataParams {
  /** Component ID to update */
  componentId: string
  /** Current version for optimistic locking (prevents concurrent edit conflicts) */
  version: number
  /** Area ID (null clears assignment) */
  area_id: string | null
  /** System ID (null clears assignment) */
  system_id: string | null
  /** Test Package ID (null clears assignment) */
  test_package_id: string | null
}

/**
 * Parameters for creating a new Area
 *
 * Used by the useCreateArea hook to create a new area within a project.
 *
 * @example
 * ```typescript
 * mutation.mutate({
 *   name: 'North Wing',
 *   project_id: currentProjectId
 * })
 * ```
 */
export interface CreateAreaParams {
  /** Trimmed, validated for uniqueness (case-insensitive) */
  name: string
  /** Project ID within organization */
  project_id: string
}

/**
 * Parameters for creating a new System
 *
 * Used by the useCreateSystem hook to create a new system within a project.
 *
 * @example
 * ```typescript
 * mutation.mutate({
 *   name: 'Drain System',
 *   project_id: currentProjectId
 * })
 * ```
 */
export interface CreateSystemParams {
  /** Trimmed, validated for uniqueness (case-insensitive) */
  name: string
  /** Project ID within organization */
  project_id: string
}

/**
 * Parameters for creating a new Test Package
 *
 * Used by the useCreateTestPackage hook to create a new test package within a project.
 *
 * @example
 * ```typescript
 * mutation.mutate({
 *   name: 'TP-12',
 *   project_id: currentProjectId
 * })
 * ```
 */
export interface CreateTestPackageParams {
  /** Trimmed, validated for uniqueness (case-insensitive) */
  name: string
  /** Project ID within organization */
  project_id: string
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Validation error for metadata creation
 *
 * Represents a single validation failure when creating or updating metadata.
 */
export interface MetadataValidationError {
  /** Field that failed validation: area, system, or test_package */
  field: 'area' | 'system' | 'test_package'
  /** Human-readable error message */
  message: string
  /** Error classification: duplicate name, empty name, or invalid input */
  type: 'duplicate' | 'empty' | 'invalid'
}

/**
 * Result of duplicate name check
 *
 * Returned by duplicate detection utilities to indicate if a name is already in use.
 */
export interface DuplicateCheckResult {
  /** Whether the name is already in use */
  isDuplicate: boolean
  /** The existing item if isDuplicate is true */
  existingItem?: Area | System | TestPackage
}

// ============================================================================
// Combobox Option Types
// ============================================================================

/**
 * Option for metadata combobox
 *
 * Represents a single option in a metadata selector dropdown, supporting
 * existing items, the "(None)" option, and "Create new..." sentinel.
 */
export interface MetadataOption {
  /** Option value: UUID for existing items, null for "(None)", "__create_new__" for creation */
  value: string | null
  /** Display label shown in dropdown */
  label: string
  /** Option type classification */
  type: 'existing' | 'none' | 'create-new'
}

/**
 * Helper to convert Area to MetadataOption
 *
 * Transforms an Area entity into a combobox option for display in selectors.
 *
 * @param area - Area entity to convert (requires id and name properties)
 * @returns MetadataOption with existing type
 *
 * @example
 * ```typescript
 * const options = areas.map(areaToOption)
 * ```
 */
export function areaToOption(area: { id: string; name: string }): MetadataOption {
  return {
    value: area.id,
    label: area.name,
    type: 'existing'
  }
}

/**
 * Helper to convert System to MetadataOption
 *
 * Transforms a System entity into a combobox option for display in selectors.
 *
 * @param system - System entity to convert (requires id and name properties)
 * @returns MetadataOption with existing type
 *
 * @example
 * ```typescript
 * const options = systems.map(systemToOption)
 * ```
 */
export function systemToOption(system: { id: string; name: string }): MetadataOption {
  return {
    value: system.id,
    label: system.name,
    type: 'existing'
  }
}

/**
 * Helper to convert TestPackage to MetadataOption
 *
 * Transforms a TestPackage entity into a combobox option for display in selectors.
 *
 * @param testPackage - TestPackage entity to convert (requires id and name properties)
 * @returns MetadataOption with existing type
 *
 * @example
 * ```typescript
 * const options = testPackages.map(testPackageToOption)
 * ```
 */
export function testPackageToOption(testPackage: { id: string; name: string }): MetadataOption {
  return {
    value: testPackage.id,
    label: testPackage.name,
    type: 'existing'
  }
}

/**
 * Special "(None)" option for clearing assignments
 *
 * Used in metadata selectors to allow users to clear (remove) a metadata assignment.
 * This constant should be added to combobox options to enable the "clear" behavior.
 *
 * @example
 * ```typescript
 * const options = [
 *   NONE_OPTION,
 *   ...areas.map(areaToOption)
 * ]
 * ```
 */
export const NONE_OPTION: MetadataOption = {
  value: null,
  label: '(None)',
  type: 'none'
}

/**
 * Special "Create new..." option
 *
 * Creates a sentinel option that triggers inline creation flow. When selected,
 * the form should enter creation mode for the specified metadata type.
 *
 * @param type - Type of metadata to create: area, system, or test_package
 * @returns MetadataOption with create-new type
 *
 * @example
 * ```typescript
 * const areaOptions = [
 *   NONE_OPTION,
 *   ...areas.map(areaToOption),
 *   createNewOption('area')  // Add at end
 * ]
 * ```
 */
export function createNewOption(type: 'area' | 'system' | 'test_package'): MetadataOption {
  const labels = {
    area: 'Create new Area...',
    system: 'Create new System...',
    test_package: 'Create new Test Package...'
  }

  return {
    value: '__create_new__',  // Special sentinel value
    label: labels[type],
    type: 'create-new'
  }
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error codes for metadata operations
 *
 * Standardized error codes for structured error handling and user-friendly messaging.
 */
export enum MetadataErrorCode {
  /** A metadata entry with the same name already exists */
  DUPLICATE_NAME = 'DUPLICATE_NAME',
  /** The provided name is empty or whitespace-only */
  EMPTY_NAME = 'EMPTY_NAME',
  /** Component was updated by another user (version mismatch in optimistic locking) */
  CONCURRENT_UPDATE = 'CONCURRENT_UPDATE',
  /** Selected metadata no longer exists (was deleted) */
  METADATA_NOT_FOUND = 'METADATA_NOT_FOUND',
  /** User lacks permission to perform this operation */
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  /** Network or connection error */
  NETWORK_ERROR = 'NETWORK_ERROR',
  /** Unexpected error without specific code */
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Structured error for metadata operations
 *
 * Custom error class providing typed error information for metadata-related failures.
 * Includes error code, message, and optional details for debugging.
 *
 * @example
 * ```typescript
 * try {
 *   await updateMetadata(params)
 * } catch (err) {
 *   if (err instanceof MetadataError) {
 *     if (err.code === MetadataErrorCode.CONCURRENT_UPDATE) {
 *       showMessage('Please refresh and try again')
 *     }
 *   }
 * }
 * ```
 */
export class MetadataError extends Error {
  /**
   * Creates a new MetadataError
   *
   * @param code - Error code for structured handling
   * @param message - Human-readable error message
   * @param details - Optional debugging information
   */
  constructor(
    public code: MetadataErrorCode,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'MetadataError'
  }
}

/**
 * User-friendly error messages
 *
 * Maps error codes to human-readable messages for display in the UI.
 * All messages are written for end-user comprehension, not developers.
 *
 * @example
 * ```typescript
 * const message = ERROR_MESSAGES[error.code]
 * ```
 */
export const ERROR_MESSAGES: Record<MetadataErrorCode, string> = {
  [MetadataErrorCode.DUPLICATE_NAME]: 'A metadata entry with this name already exists',
  [MetadataErrorCode.EMPTY_NAME]: 'Name cannot be empty',
  [MetadataErrorCode.CONCURRENT_UPDATE]: 'Component was updated by another user. Please refresh.',
  [MetadataErrorCode.METADATA_NOT_FOUND]: 'Selected metadata no longer exists. Please refresh and try again.',
  [MetadataErrorCode.PERMISSION_DENIED]: "You don't have permission to modify this component",
  [MetadataErrorCode.NETWORK_ERROR]: 'Failed to save changes. Please check your connection and retry.',
  [MetadataErrorCode.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.'
}

// ============================================================================
// State Types
// ============================================================================

/**
 * State for MetadataEditForm component
 *
 * Tracks the form state including current selections, creation mode flags,
 * and validation errors for metadata editing.
 */
export interface MetadataFormState {
  /** Currently selected area ID (null if not assigned) */
  area_id: string | null
  /** Currently selected system ID (null if not assigned) */
  system_id: string | null
  /** Currently selected test package ID (null if not assigned) */
  test_package_id: string | null
  /** Whether the form is in "create new area" mode */
  isCreatingArea: boolean
  /** Whether the form is in "create new system" mode */
  isCreatingSystem: boolean
  /** Whether the form is in "create new test package" mode */
  isCreatingTestPackage: boolean
  /** Accumulated validation errors from form operations */
  validationErrors: MetadataValidationError[]
}

/**
 * Initial state for MetadataEditForm
 *
 * Creates form state initialized with the component's current metadata assignments.
 * This ensures the form starts with the component's actual state.
 *
 * @param component - Component entity to initialize form from
 * @returns MetadataFormState with component's current assignments
 *
 * @example
 * ```typescript
 * const [formState, setFormState] = useState(() =>
 *   createInitialFormState(component)
 * )
 * ```
 */
export function createInitialFormState(component: Component): MetadataFormState {
  return {
    area_id: component.area_id,
    system_id: component.system_id,
    test_package_id: component.test_package_id,
    isCreatingArea: false,
    isCreatingSystem: false,
    isCreatingTestPackage: false,
    validationErrors: []
  }
}

// ============================================================================
// Utility Functions & Type Guards
// ============================================================================

/**
 * Type guard to check if value is valid metadata ID
 *
 * Validates that a value is a non-empty string and not the "create new" sentinel.
 * Useful for distinguishing real IDs from special option values.
 *
 * @param value - Value to check
 * @returns true if value is a valid UUID-like metadata ID
 *
 * @example
 * ```typescript
 * if (isValidMetadataId(option.value)) {
 *   // Safe to use value as an ID
 * }
 * ```
 */
export function isValidMetadataId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value !== '__create_new__'
}

/**
 * Type guard to check if option is "Create new..." sentinel
 *
 * Identifies when a user has selected the special "create new" option,
 * triggering inline creation flow.
 *
 * @param option - MetadataOption to check
 * @returns true if option is the "create new" sentinel
 *
 * @example
 * ```typescript
 * if (isCreateNewOption(selectedOption)) {
 *   setIsCreatingArea(true)
 * }
 * ```
 */
export function isCreateNewOption(option: MetadataOption): boolean {
  return option.type === 'create-new' && option.value === '__create_new__'
}

/**
 * Type guard to check if option is "(None)" option
 *
 * Identifies the special "(None)" option used to clear assignments.
 * Distinct from null selections in a standard dropdown.
 *
 * @param option - MetadataOption to check
 * @returns true if option is the "(None)" option
 *
 * @example
 * ```typescript
 * if (isNoneOption(selectedOption)) {
 *   // User is clearing this assignment
 *   formState.area_id = null
 * }
 * ```
 */
export function isNoneOption(option: MetadataOption): boolean {
  return option.type === 'none' && option.value === null
}

/**
 * Extract metadata changes from form state vs original component
 *
 * Compares the form's current state to the component's original values
 * and returns only the fields that have changed. Returns null if no changes.
 *
 * @param component - Original component entity
 * @param formState - Current form state
 * @returns Partial UpdateComponentMetadataParams with only changed fields, or null
 *
 * @example
 * ```typescript
 * const changes = extractMetadataChanges(component, formState)
 * if (changes) {
 *   mutation.mutate({
 *     componentId: component.id,
 *     version: component.version,
 *     ...changes
 *   })
 * }
 * ```
 */
export function extractMetadataChanges(
  component: Component,
  formState: MetadataFormState
): Partial<UpdateComponentMetadataParams> | null {
  const changes: Partial<UpdateComponentMetadataParams> = {}
  let hasChanges = false

  if (formState.area_id !== component.area_id) {
    changes.area_id = formState.area_id
    hasChanges = true
  }

  if (formState.system_id !== component.system_id) {
    changes.system_id = formState.system_id
    hasChanges = true
  }

  if (formState.test_package_id !== component.test_package_id) {
    changes.test_package_id = formState.test_package_id
    hasChanges = true
  }

  return hasChanges ? changes : null
}

/**
 * Validate metadata name (used before creation)
 *
 * Performs validation on a proposed metadata name:
 * - Checks for empty/whitespace-only input
 * - Checks for duplicate names (case-insensitive)
 *
 * Returns null if validation passes, or a MetadataValidationError if it fails.
 *
 * @param name - Name to validate
 * @param existingNames - List of existing names to check against
 * @returns Validation error if validation fails, null if validation passes
 *
 * @example
 * ```typescript
 * const error = validateMetadataName(userInput, existingAreas.map(a => a.name))
 * if (error) {
 *   setFormErrors([error])
 * }
 * ```
 */
export function validateMetadataName(
  name: string,
  existingNames: string[]
): MetadataValidationError | null {
  const trimmedName = name.trim()

  // Check empty
  if (trimmedName.length === 0) {
    return {
      field: 'area',  // Generic, will be overridden by caller
      message: 'Name cannot be empty',
      type: 'empty'
    }
  }

  // Check duplicate (case-insensitive)
  const isDuplicate = existingNames.some(
    existingName => existingName.trim().toLowerCase() === trimmedName.toLowerCase()
  )

  if (isDuplicate) {
    return {
      field: 'area',  // Generic, will be overridden by caller
      message: `A metadata entry named "${trimmedName}" already exists`,
      type: 'duplicate'
    }
  }

  return null
}
