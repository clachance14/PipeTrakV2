/**
 * API Contracts: Component Metadata Editing
 *
 * Feature: 020-component-metadata-editing
 * Date: 2025-10-28 (Updated: 2025-10-29)
 *
 * This file defines TypeScript types and interfaces for the component metadata
 * editing feature. These contracts serve as the single source of truth for
 * data shapes used across hooks, components, and API calls.
 *
 * UPDATED: Added version field for optimistic locking (concurrent edit detection)
 */

// ============================================================================
// Database Entity Types (from Supabase schema)
// ============================================================================

/**
 * Component entity from components table
 */
export interface Component {
  id: string
  drawing_number: string
  component_identity: string
  component_type: string
  size: string | null

  // Metadata assignments (nullable)
  area_id: string | null
  system_id: string | null
  test_package_id: string | null

  // Joined relations (optional, depends on query)
  area?: Area
  system?: System
  test_package?: TestPackage

  // Audit fields
  version: number           // **NEW**: Integer version for optimistic locking
  last_updated_at: string  // ISO 8601 timestamp
  organization_id: string
  project_id: string
}

/**
 * Area entity from areas table
 */
export interface Area {
  id: string
  name: string
  project_id: string
  organization_id: string
  created_by: string
  created_at: string  // ISO 8601 timestamp
}

/**
 * System entity from systems table
 */
export interface System {
  id: string
  name: string
  project_id: string
  organization_id: string
  created_by: string
  created_at: string  // ISO 8601 timestamp
}

/**
 * Test Package entity from test_packages table
 */
export interface TestPackage {
  id: string
  name: string
  project_id: string
  organization_id: string
  created_by: string
  created_at: string  // ISO 8601 timestamp
}

// ============================================================================
// Mutation Parameter Types
// ============================================================================

/**
 * Parameters for updating component metadata
 *
 * Used by: useUpdateComponentMetadata hook
 *
 * @example
 * ```typescript
 * mutation.mutate({
 *   componentId: 'uuid-123',
 *   version: 5,  // **NEW**: Current version for optimistic locking
 *   area_id: 'area-uuid-456',
 *   system_id: null,  // Clears system assignment
 *   test_package_id: 'tp-uuid-789'
 * })
 * ```
 */
export interface UpdateComponentMetadataParams {
  componentId: string
  version: number               // **NEW**: Current version for optimistic locking
  area_id: string | null        // null clears assignment
  system_id: string | null      // null clears assignment
  test_package_id: string | null // null clears assignment
}

/**
 * Parameters for creating a new Area
 *
 * Used by: useCreateArea hook
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
  name: string        // Trimmed, validated for uniqueness (case-insensitive)
  project_id: string
}

/**
 * Parameters for creating a new System
 *
 * Used by: useCreateSystem hook
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
  name: string        // Trimmed, validated for uniqueness (case-insensitive)
  project_id: string
}

/**
 * Parameters for creating a new Test Package
 *
 * Used by: useCreateTestPackage hook
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
  name: string        // Trimmed, validated for uniqueness (case-insensitive)
  project_id: string
}

// ============================================================================
// Component Props Types
// ============================================================================

/**
 * Props for MetadataEditForm component
 */
export interface MetadataEditFormProps {
  component: Component
  projectId: string
  onSave: (params: UpdateComponentMetadataParams) => void
  onCancel: () => void
}

/**
 * Props for ComponentDetailView (extended for metadata editing)
 */
export interface ComponentDetailViewProps {
  componentId: string
  showMetadataEdit?: boolean   // Default: false (view-only mode)
  onMetadataUpdate?: (params: UpdateComponentMetadataParams) => void
  onClose?: () => void
}

/**
 * Props for DrawingTable (extended for component click handling)
 */
export interface DrawingTableProps {
  // ... existing props
  onComponentClick?: (componentId: string) => void
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Validation error for metadata creation
 */
export interface MetadataValidationError {
  field: 'area' | 'system' | 'test_package'
  message: string
  type: 'duplicate' | 'empty' | 'invalid'
}

/**
 * Result of duplicate name check
 */
export interface DuplicateCheckResult {
  isDuplicate: boolean
  existingItem?: Area | System | TestPackage
}

// ============================================================================
// Combobox Option Types
// ============================================================================

/**
 * Option for metadata combobox
 */
export interface MetadataOption {
  value: string | null  // null for "(None)" option
  label: string
  type: 'existing' | 'none' | 'create-new'
}

/**
 * Helper to convert Area to MetadataOption
 */
export function areaToOption(area: Area): MetadataOption {
  return {
    value: area.id,
    label: area.name,
    type: 'existing'
  }
}

/**
 * Helper to convert System to MetadataOption
 */
export function systemToOption(system: System): MetadataOption {
  return {
    value: system.id,
    label: system.name,
    type: 'existing'
  }
}

/**
 * Helper to convert TestPackage to MetadataOption
 */
export function testPackageToOption(testPackage: TestPackage): MetadataOption {
  return {
    value: testPackage.id,
    label: testPackage.name,
    type: 'existing'
  }
}

/**
 * Special "(None)" option for clearing assignments
 */
export const NONE_OPTION: MetadataOption = {
  value: null,
  label: '(None)',
  type: 'none'
}

/**
 * Special "Create new..." option
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
// Hook Return Types
// ============================================================================

/**
 * Return type for useUpdateComponentMetadata hook
 */
export type UseUpdateComponentMetadataResult = {
  mutate: (params: UpdateComponentMetadataParams) => void
  mutateAsync: (params: UpdateComponentMetadataParams) => Promise<Component>
  isLoading: boolean
  isError: boolean
  error: Error | null
  reset: () => void
}

/**
 * Return type for useCreateArea hook
 */
export type UseCreateAreaResult = {
  mutate: (params: CreateAreaParams) => void
  mutateAsync: (params: CreateAreaParams) => Promise<Area>
  isLoading: boolean
  isError: boolean
  error: Error | null
  reset: () => void
}

/**
 * Return type for useCreateSystem hook
 */
export type UseCreateSystemResult = {
  mutate: (params: CreateSystemParams) => void
  mutateAsync: (params: CreateSystemParams) => Promise<System>
  isLoading: boolean
  isError: boolean
  error: Error | null
  reset: () => void
}

/**
 * Return type for useCreateTestPackage hook
 */
export type UseCreateTestPackageResult = {
  mutate: (params: CreateTestPackageParams) => void
  mutateAsync: (params: CreateTestPackageParams) => Promise<TestPackage>
  isLoading: boolean
  isError: boolean
  error: Error | null
  reset: () => void
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error codes for metadata operations
 */
export enum MetadataErrorCode {
  DUPLICATE_NAME = 'DUPLICATE_NAME',
  EMPTY_NAME = 'EMPTY_NAME',
  CONCURRENT_UPDATE = 'CONCURRENT_UPDATE',
  METADATA_NOT_FOUND = 'METADATA_NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Structured error for metadata operations
 */
export class MetadataError extends Error {
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
 */
export interface MetadataFormState {
  area_id: string | null
  system_id: string | null
  test_package_id: string | null
  isCreatingArea: boolean
  isCreatingSystem: boolean
  isCreatingTestPackage: boolean
  validationErrors: MetadataValidationError[]
}

/**
 * Initial state for MetadataEditForm
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
// Utility Types
// ============================================================================

/**
 * Type guard to check if value is valid metadata ID
 */
export function isValidMetadataId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value !== '__create_new__'
}

/**
 * Type guard to check if option is "Create new..." sentinel
 */
export function isCreateNewOption(option: MetadataOption): boolean {
  return option.type === 'create-new' && option.value === '__create_new__'
}

/**
 * Type guard to check if option is "(None)" option
 */
export function isNoneOption(option: MetadataOption): boolean {
  return option.type === 'none' && option.value === null
}

/**
 * Extract metadata changes from form state vs original component
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
