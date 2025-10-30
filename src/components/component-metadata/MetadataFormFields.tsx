/**
 * MetadataFormFields Component
 *
 * Feature: 020-component-metadata-editing
 * Task: T024 - Implement MetadataFormFields component
 * Date: 2025-10-29
 *
 * Renders three searchable comboboxes for editing component metadata:
 * - Area
 * - System
 * - Test Package
 *
 * Each combobox loads options from the corresponding hook (useAreas, useSystems, useTestPackages)
 * and displays them in a virtualized dropdown. Supports "(None)" option to clear assignments.
 */

import { useAreas, useCreateArea } from '@/hooks/useAreas'
import { useSystems, useCreateSystem } from '@/hooks/useSystems'
import { useTestPackages, useCreateTestPackage } from '@/hooks/useTestPackages'
import { SearchableCombobox } from './SearchableCombobox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  areaToOption,
  systemToOption,
  testPackageToOption,
  NONE_OPTION,
  createNewOption,
  type MetadataOption
} from '@/types/metadata'

export interface MetadataFormFieldsProps {
  /** Component ID being edited */
  componentId: string
  /** Project ID to load metadata options from */
  projectId: string
  /** Currently selected area ID (null if not assigned) */
  areaId: string | null
  /** Currently selected system ID (null if not assigned) */
  systemId: string | null
  /** Currently selected test package ID (null if not assigned) */
  testPackageId: string | null
  /** Callback fired when area selection changes */
  onAreaChange: (value: string | null) => void
  /** Callback fired when system selection changes */
  onSystemChange: (value: string | null) => void
  /** Callback fired when test package selection changes */
  onTestPackageChange: (value: string | null) => void
  /** Whether comboboxes should be disabled (e.g., during save) */
  disabled?: boolean
  /** Whether to render as view-only (static text instead of comboboxes) */
  viewOnly?: boolean
}

/**
 * MetadataFormFields Component
 *
 * Provides three searchable comboboxes for editing component metadata assignments.
 * Automatically loads options from the backend and handles loading/error states.
 *
 * @example
 * ```tsx
 * <MetadataFormFields
 *   componentId={component.id}
 *   projectId={component.project_id}
 *   areaId={formState.area_id}
 *   systemId={formState.system_id}
 *   testPackageId={formState.test_package_id}
 *   onAreaChange={(value) => setFormState({ ...formState, area_id: value })}
 *   onSystemChange={(value) => setFormState({ ...formState, system_id: value })}
 *   onTestPackageChange={(value) => setFormState({ ...formState, test_package_id: value })}
 *   disabled={isSaving}
 * />
 * ```
 */
export function MetadataFormFields({
  componentId,
  projectId,
  areaId,
  systemId,
  testPackageId,
  onAreaChange,
  onSystemChange,
  onTestPackageChange,
  disabled = false,
  viewOnly = false
}: MetadataFormFieldsProps) {
  // Load metadata options
  const {
    data: areas,
    isLoading: areasLoading,
    isError: areasError,
    error: areasErrorObj
  } = useAreas(projectId)

  const {
    data: systems,
    isLoading: systemsLoading,
    isError: systemsError,
    error: systemsErrorObj
  } = useSystems(projectId)

  const {
    data: testPackages,
    isLoading: testPackagesLoading,
    isError: testPackagesError,
    error: testPackagesErrorObj
  } = useTestPackages(projectId)

  // Create hooks
  const createArea = useCreateArea()
  const createSystem = useCreateSystem()
  const createTestPackage = useCreateTestPackage()

  // Build options lists with "(None)" option first and "Create new..." option last
  const areaOptions: MetadataOption[] = [
    NONE_OPTION,
    ...(areas?.map(areaToOption) || []),
    createNewOption('area')
  ]

  const systemOptions: MetadataOption[] = [
    NONE_OPTION,
    ...(systems?.map(systemToOption) || []),
    createNewOption('system')
  ]

  const testPackageOptions: MetadataOption[] = [
    NONE_OPTION,
    ...(testPackages?.map(testPackageToOption) || []),
    createNewOption('test_package')
  ]

  // Find selected metadata names for view-only mode
  const selectedAreaName = areas?.find(a => a.id === areaId)?.name || '(None)'
  const selectedSystemName = systems?.find(s => s.id === systemId)?.name || '(None)'
  const selectedTestPackageName = testPackages?.find(tp => tp.id === testPackageId)?.name || '(None)'

  return (
    <div className="space-y-4">
      {/* Area Selection */}
      <div className="space-y-2">
        <label
          id={`area-label-${componentId}`}
          htmlFor={`area-combobox-${componentId}`}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Area
        </label>
        {areasError ? (
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load areas: {areasErrorObj?.message || 'Unknown error'}
            </AlertDescription>
          </Alert>
        ) : viewOnly ? (
          <div className="text-base text-foreground">{selectedAreaName}</div>
        ) : (
          <SearchableCombobox
            options={areaOptions}
            value={areaId}
            onChange={onAreaChange}
            onCreateNew={async (name) => {
              const result = await createArea.mutateAsync({
                name,
                project_id: projectId
              })
              return result
            }}
            placeholder="Select area..."
            emptyMessage="No areas found"
            createNewLabel="Create new Area..."
            disabled={disabled || areasLoading}
            className="w-full"
            aria-labelledby={`area-label-${componentId}`}
          />
        )}
      </div>

      {/* System Selection */}
      <div className="space-y-2">
        <label
          id={`system-label-${componentId}`}
          htmlFor={`system-combobox-${componentId}`}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          System
        </label>
        {systemsError ? (
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load systems: {systemsErrorObj?.message || 'Unknown error'}
            </AlertDescription>
          </Alert>
        ) : viewOnly ? (
          <div className="text-base text-foreground">{selectedSystemName}</div>
        ) : (
          <SearchableCombobox
            options={systemOptions}
            value={systemId}
            onChange={onSystemChange}
            onCreateNew={async (name) => {
              const result = await createSystem.mutateAsync({
                name,
                project_id: projectId
              })
              return result
            }}
            placeholder="Select system..."
            emptyMessage="No systems found"
            createNewLabel="Create new System..."
            disabled={disabled || systemsLoading}
            className="w-full"
            aria-labelledby={`system-label-${componentId}`}
          />
        )}
      </div>

      {/* Test Package Selection */}
      <div className="space-y-2">
        <label
          id={`test-package-label-${componentId}`}
          htmlFor={`test-package-combobox-${componentId}`}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Test Package
        </label>
        {testPackagesError ? (
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load test packages: {testPackagesErrorObj?.message || 'Unknown error'}
            </AlertDescription>
          </Alert>
        ) : viewOnly ? (
          <div className="text-base text-foreground">{selectedTestPackageName}</div>
        ) : (
          <SearchableCombobox
            options={testPackageOptions}
            value={testPackageId}
            onChange={onTestPackageChange}
            onCreateNew={async (name) => {
              const result = await createTestPackage.mutateAsync({
                name,
                project_id: projectId
              })
              return result
            }}
            placeholder="Select test package..."
            emptyMessage="No test packages found"
            createNewLabel="Create new Test Package..."
            disabled={disabled || testPackagesLoading}
            className="w-full"
            aria-labelledby={`test-package-label-${componentId}`}
          />
        )}
      </div>
    </div>
  )
}
