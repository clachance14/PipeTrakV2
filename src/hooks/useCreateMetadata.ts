/**
 * Hooks: useCreateArea, useCreateSystem, useCreateTestPackage (T034, T036, T038)
 *
 * Feature: 020-component-metadata-editing
 * Date: 2025-10-29
 *
 * TanStack Query mutation hooks for creating new metadata entries inline.
 * Used by SearchableCombobox when users select "Create new...".
 *
 * Features:
 * - Client-side validation (empty name check)
 * - Trimming whitespace from names
 * - Duplicate detection via database unique constraints
 * - Query cache invalidation on success
 * - Structured error handling with MetadataError
 *
 * @example
 * ```typescript
 * const createArea = useCreateArea()
 *
 * createArea.mutate({
 *   name: 'North Wing',
 *   project_id: currentProjectId
 * })
 *
 * if (createArea.isSuccess) {
 *   console.log('Created:', createArea.data.id)
 * }
 *
 * if (createArea.isError) {
 *   const error = createArea.error as MetadataError
 *   if (error.code === MetadataErrorCode.DUPLICATE_NAME) {
 *     showMessage('Area already exists')
 *   }
 * }
 * ```
 */

import { useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  MetadataError,
  MetadataErrorCode,
  ERROR_MESSAGES,
  type CreateAreaParams,
  type CreateSystemParams,
  type CreateTestPackageParams,
  type Area,
  type System,
  type TestPackage
} from '@/types/metadata'

/**
 * Mutation hook for creating a new Area
 *
 * Features:
 * - Client-side validation: checks for empty names before INSERT
 * - Trims whitespace from name
 * - Handles database duplicate constraint (PostgreSQL error 23505)
 * - Invalidates ['areas', projectId] query cache on success
 *
 * @returns TanStack Query mutation result
 *
 * Error Handling:
 * - Empty/whitespace-only name → MetadataError with EMPTY_NAME code
 * - Duplicate name (unique constraint) → MetadataError with DUPLICATE_NAME code
 * - Other errors → Propagates database error directly
 *
 * Query Invalidation:
 * - On success: Invalidates ['areas', projectId] to trigger refetch
 * - Ensures dropdown updates immediately with new entry
 */
export function useCreateArea(): UseMutationResult<Area, Error, CreateAreaParams> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: CreateAreaParams) => {
      const trimmedName = params.name.trim()

      // Client-side validation: empty name
      if (trimmedName.length === 0) {
        throw new MetadataError(
          MetadataErrorCode.EMPTY_NAME,
          ERROR_MESSAGES[MetadataErrorCode.EMPTY_NAME]
        )
      }

      // Insert with trimmed name
      const { data, error } = await supabase
        .from('areas')
        .insert({
          name: trimmedName,
          project_id: params.project_id
        })
        .select()
        .single()

      if (error) {
        // Check for unique constraint violation (PostgreSQL error code 23505)
        if (error.code === '23505') {
          throw new MetadataError(
            MetadataErrorCode.DUPLICATE_NAME,
            `Area '${trimmedName}' already exists`
          )
        }
        throw error
      }

      // Database schema doesn't include organization_id and created_by in Row type
      // These fields may be populated by triggers/defaults but aren't in the type definition
      return data as unknown as Area
    },

    onSuccess: (data) => {
      // Invalidate areas query to refetch with new entry
      queryClient.invalidateQueries({ queryKey: ['areas', data.project_id] })
    }
  })
}

/**
 * Mutation hook for creating a new System
 *
 * Features:
 * - Client-side validation: checks for empty names before INSERT
 * - Trims whitespace from name
 * - Handles database duplicate constraint (PostgreSQL error 23505)
 * - Invalidates ['systems', projectId] query cache on success
 *
 * @returns TanStack Query mutation result
 *
 * Error Handling:
 * - Empty/whitespace-only name → MetadataError with EMPTY_NAME code
 * - Duplicate name (unique constraint) → MetadataError with DUPLICATE_NAME code
 * - Other errors → Propagates database error directly
 *
 * Query Invalidation:
 * - On success: Invalidates ['systems', projectId] to trigger refetch
 * - Ensures dropdown updates immediately with new entry
 */
export function useCreateSystem(): UseMutationResult<System, Error, CreateSystemParams> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: CreateSystemParams) => {
      const trimmedName = params.name.trim()

      // Client-side validation: empty name
      if (trimmedName.length === 0) {
        throw new MetadataError(
          MetadataErrorCode.EMPTY_NAME,
          ERROR_MESSAGES[MetadataErrorCode.EMPTY_NAME]
        )
      }

      // Insert with trimmed name
      const { data, error } = await supabase
        .from('systems')
        .insert({
          name: trimmedName,
          project_id: params.project_id
        })
        .select()
        .single()

      if (error) {
        // Check for unique constraint violation (PostgreSQL error code 23505)
        if (error.code === '23505') {
          throw new MetadataError(
            MetadataErrorCode.DUPLICATE_NAME,
            `System '${trimmedName}' already exists`
          )
        }
        throw error
      }

      // Database schema doesn't include organization_id and created_by in Row type
      // These fields may be populated by triggers/defaults but aren't in the type definition
      return data as unknown as System
    },

    onSuccess: (data) => {
      // Invalidate systems query to refetch with new entry
      queryClient.invalidateQueries({ queryKey: ['systems', data.project_id] })
    }
  })
}

/**
 * Mutation hook for creating a new Test Package
 *
 * Features:
 * - Client-side validation: checks for empty names before INSERT
 * - Trims whitespace from name
 * - Handles database duplicate constraint (PostgreSQL error 23505)
 * - Invalidates ['test-packages', projectId] query cache on success
 *
 * @returns TanStack Query mutation result
 *
 * Error Handling:
 * - Empty/whitespace-only name → MetadataError with EMPTY_NAME code
 * - Duplicate name (unique constraint) → MetadataError with DUPLICATE_NAME code
 * - Other errors → Propagates database error directly
 *
 * Query Invalidation:
 * - On success: Invalidates ['test-packages', projectId] to trigger refetch
 * - Ensures dropdown updates immediately with new entry
 */
export function useCreateTestPackage(): UseMutationResult<
  TestPackage,
  Error,
  CreateTestPackageParams
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: CreateTestPackageParams) => {
      const trimmedName = params.name.trim()

      // Client-side validation: empty name
      if (trimmedName.length === 0) {
        throw new MetadataError(
          MetadataErrorCode.EMPTY_NAME,
          ERROR_MESSAGES[MetadataErrorCode.EMPTY_NAME]
        )
      }

      // Insert with trimmed name
      const { data, error } = await supabase
        .from('test_packages')
        .insert({
          name: trimmedName,
          project_id: params.project_id
        })
        .select()
        .single()

      if (error) {
        // Check for unique constraint violation (PostgreSQL error code 23505)
        if (error.code === '23505') {
          throw new MetadataError(
            MetadataErrorCode.DUPLICATE_NAME,
            `Test Package '${trimmedName}' already exists`
          )
        }
        throw error
      }

      // Database schema doesn't include organization_id and created_by in Row type
      // These fields may be populated by triggers/defaults but aren't in the type definition
      return data as unknown as TestPackage
    },

    onSuccess: (data) => {
      // Invalidate test-packages query to refetch with new entry
      queryClient.invalidateQueries({ queryKey: ['test-packages', data.project_id] })
    }
  })
}
