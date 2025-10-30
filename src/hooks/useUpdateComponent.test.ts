/**
 * Test Suite: useUpdateComponent Hook (T021)
 *
 * Feature: 020-component-metadata-editing
 * Date: 2025-10-29
 *
 * Tests for updating component metadata with optimistic locking and optimistic updates.
 * Handles concurrent edit detection via version field.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { useUpdateComponent } from './useUpdateComponent'
import { supabase } from '@/lib/supabase'
import { MetadataError, MetadataErrorCode, ERROR_MESSAGES } from '@/types/metadata'
import type { UpdateComponentMetadataParams, Component } from '@/types/metadata'

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}))

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

// Helper to create mock chain for .update().eq().eq().select().single()
const createUpdateMockChain = (singleResult: { data: any; error: any }) => {
  const mockSingle = vi.fn().mockResolvedValue(singleResult)
  const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
  const mockEqVersion = vi.fn().mockReturnValue({ select: mockSelect })
  const mockEqId = vi.fn().mockReturnValue({ eq: mockEqVersion })
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqId })

  return { mockSingle, mockSelect, mockEqVersion, mockEqId, mockUpdate }
}

// Test data
const mockUpdatedComponent: Component = {
  id: 'component-uuid-1',
  drawing_number: 'DWG-001',
  component_identity: 'P-001-ST-2.5',
  component_type: 'Pipe',
  size: '2.5"',
  area_id: 'area-uuid-new',
  system_id: 'system-uuid-new',
  test_package_id: 'tp-uuid-new',
  version: 2, // Version incremented
  last_updated_at: '2025-10-29T10:05:00Z',
  organization_id: 'org-uuid',
  project_id: 'project-uuid'
}

describe('useUpdateComponent hook (T021)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates component metadata fields', async () => {
    // Arrange: Mock successful update with full chain
    const { mockUpdate } = createUpdateMockChain({ data: mockUpdatedComponent, error: null })

    vi.mocked(supabase.from).mockReturnValue({
      update: mockUpdate
    } as any)

    // Act: Render hook and trigger mutation
    const { result } = renderHook(() => useUpdateComponent(), {
      wrapper: createWrapper()
    })

    const params: UpdateComponentMetadataParams = {
      componentId: 'component-uuid-1',
      version: 1,
      area_id: 'area-uuid-new',
      system_id: 'system-uuid-new',
      test_package_id: 'tp-uuid-new'
    }

    act(() => {
      result.current.mutate(params)
    })

    // Wait for mutation to complete
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // Assert: Update called with correct fields
    expect(mockUpdate).toHaveBeenCalledWith({
      area_id: 'area-uuid-new',
      system_id: 'system-uuid-new',
      test_package_id: 'tp-uuid-new'
    })
    expect(result.current.data).toEqual(mockUpdatedComponent)
  })

  it('includes version in WHERE clause for optimistic locking', async () => {
    // Arrange: Mock update chain
    const { mockUpdate, mockEqId, mockEqVersion } = createUpdateMockChain({
      data: mockUpdatedComponent,
      error: null
    })

    vi.mocked(supabase.from).mockReturnValue({
      update: mockUpdate
    } as any)

    // Act: Render hook and trigger mutation
    const { result } = renderHook(() => useUpdateComponent(), {
      wrapper: createWrapper()
    })

    const params: UpdateComponentMetadataParams = {
      componentId: 'component-uuid-1',
      version: 1,
      area_id: 'area-uuid-new',
      system_id: null,
      test_package_id: null
    }

    act(() => {
      result.current.mutate(params)
    })

    // Wait for mutation
    await waitFor(() => {
      expect(mockEqId).toHaveBeenCalled()
    })

    // Assert: Both ID and version used in WHERE clause
    expect(mockEqId).toHaveBeenCalledWith('id', 'component-uuid-1')
    expect(mockEqVersion).toHaveBeenCalledWith('version', 1)
  })

  it('returns 0 rows (null data) when version mismatches', async () => {
    // Arrange: Mock version mismatch - no rows updated
    const { mockUpdate } = createUpdateMockChain({ data: null, error: null })

    vi.mocked(supabase.from).mockReturnValue({
      update: mockUpdate
    } as any)

    // Act: Render hook and trigger mutation
    const { result } = renderHook(() => useUpdateComponent(), {
      wrapper: createWrapper()
    })

    const params: UpdateComponentMetadataParams = {
      componentId: 'component-uuid-1',
      version: 1, // Stale version
      area_id: 'area-uuid-new',
      system_id: null,
      test_package_id: null
    }

    act(() => {
      result.current.mutate(params)
    })

    // Wait for mutation to fail
    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    // Assert: No data returned
    expect(result.current.data).toBeUndefined()
  })

  it('throws CONCURRENT_UPDATE error on version mismatch', async () => {
    // Arrange: Mock version mismatch
    const { mockUpdate } = createUpdateMockChain({ data: null, error: null })

    vi.mocked(supabase.from).mockReturnValue({
      update: mockUpdate
    } as any)

    // Act: Render hook and trigger mutation
    const { result } = renderHook(() => useUpdateComponent(), {
      wrapper: createWrapper()
    })

    const params: UpdateComponentMetadataParams = {
      componentId: 'component-uuid-1',
      version: 1,
      area_id: 'area-uuid-new',
      system_id: null,
      test_package_id: null
    }

    act(() => {
      result.current.mutate(params)
    })

    // Wait for error
    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    // Assert: CONCURRENT_UPDATE error thrown
    const error = result.current.error as MetadataError
    expect(error).toBeInstanceOf(MetadataError)
    expect(error.code).toBe(MetadataErrorCode.CONCURRENT_UPDATE)
    expect(error.message).toBe(ERROR_MESSAGES[MetadataErrorCode.CONCURRENT_UPDATE])
  })

  it('implements optimistic updates via onMutate', async () => {
    // Arrange: Mock slow update to observe optimistic state
    // Create custom mock for delayed response
    const mockSingle = vi.fn().mockImplementation(
      () => new Promise(resolve =>
        setTimeout(() => resolve({ data: mockUpdatedComponent, error: null }), 100)
      )
    )
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
    const mockEqVersion = vi.fn().mockReturnValue({ select: mockSelect })
    const mockEqId = vi.fn().mockReturnValue({ eq: mockEqVersion })
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqId })

    vi.mocked(supabase.from).mockReturnValue({
      update: mockUpdate
    } as any)

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })

    // Seed cache with original component
    const originalComponent: Component = {
      ...mockUpdatedComponent,
      version: 1,
      area_id: 'area-uuid-old',
      system_id: 'system-uuid-old',
      test_package_id: 'tp-uuid-old'
    }
    queryClient.setQueryData(['component', 'component-uuid-1'], originalComponent)

    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children)

    // Act: Render hook and trigger mutation
    const { result } = renderHook(() => useUpdateComponent(), { wrapper })

    const params: UpdateComponentMetadataParams = {
      componentId: 'component-uuid-1',
      version: 1,
      area_id: 'area-uuid-new',
      system_id: 'system-uuid-new',
      test_package_id: 'tp-uuid-new'
    }

    act(() => {
      result.current.mutate(params)
    })

    // Assert: Optimistic update applied immediately
    await waitFor(() => {
      const cachedData = queryClient.getQueryData(['component', 'component-uuid-1']) as Component
      expect(cachedData.area_id).toBe('area-uuid-new')
      expect(cachedData.system_id).toBe('system-uuid-new')
      expect(cachedData.test_package_id).toBe('tp-uuid-new')
    })
  })

  it('rollback on error via onError', async () => {
    // Arrange: Mock error during update
    const { mockUpdate } = createUpdateMockChain({ data: null, error: null })

    vi.mocked(supabase.from).mockReturnValue({
      update: mockUpdate
    } as any)

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })

    // Seed cache with original component
    const originalComponent: Component = {
      ...mockUpdatedComponent,
      version: 1,
      area_id: 'area-uuid-old',
      system_id: 'system-uuid-old',
      test_package_id: 'tp-uuid-old'
    }
    queryClient.setQueryData(['component', 'component-uuid-1'], originalComponent)

    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children)

    // Act: Render hook and trigger mutation
    const { result } = renderHook(() => useUpdateComponent(), { wrapper })

    const params: UpdateComponentMetadataParams = {
      componentId: 'component-uuid-1',
      version: 1,
      area_id: 'area-uuid-new',
      system_id: null,
      test_package_id: null
    }

    act(() => {
      result.current.mutate(params)
    })

    // Wait for error
    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    // Assert: Cache rolled back to original values
    const cachedData = queryClient.getQueryData(['component', 'component-uuid-1']) as Component
    expect(cachedData).toEqual(originalComponent)
    expect(cachedData.area_id).toBe('area-uuid-old')
    expect(cachedData.system_id).toBe('system-uuid-old')
  })

  it('invalidates queries on success', async () => {
    // Arrange: Mock successful update
    const { mockUpdate } = createUpdateMockChain({ data: mockUpdatedComponent, error: null })

    vi.mocked(supabase.from).mockReturnValue({
      update: mockUpdate
    } as any)

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children)

    // Act: Render hook and trigger mutation
    const { result } = renderHook(() => useUpdateComponent(), { wrapper })

    const params: UpdateComponentMetadataParams = {
      componentId: 'component-uuid-1',
      version: 1,
      area_id: 'area-uuid-new',
      system_id: null,
      test_package_id: null
    }

    act(() => {
      result.current.mutate(params)
    })

    // Wait for success
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // Assert: Queries invalidated
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['components'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['drawings-with-progress'] })
  })

  it('handles null assignments (clearing metadata)', async () => {
    // Arrange: Mock update with nulls
    const componentWithNulls: Component = {
      ...mockUpdatedComponent,
      area_id: null,
      system_id: null,
      test_package_id: null
    }

    const { mockUpdate } = createUpdateMockChain({ data: componentWithNulls, error: null })

    vi.mocked(supabase.from).mockReturnValue({
      update: mockUpdate
    } as any)

    // Act: Render hook and trigger mutation
    const { result } = renderHook(() => useUpdateComponent(), {
      wrapper: createWrapper()
    })

    const params: UpdateComponentMetadataParams = {
      componentId: 'component-uuid-1',
      version: 1,
      area_id: null, // Clear area
      system_id: null, // Clear system
      test_package_id: null // Clear test package
    }

    act(() => {
      result.current.mutate(params)
    })

    // Wait for success
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // Assert: Null values handled correctly
    expect(mockUpdate).toHaveBeenCalledWith({
      area_id: null,
      system_id: null,
      test_package_id: null
    })
    expect(result.current.data).toEqual(componentWithNulls)
  })

  it('handles database errors (network failure)', async () => {
    // Arrange: Mock database error
    const dbError = new Error('Network error')
    const { mockUpdate } = createUpdateMockChain({ data: null, error: dbError })

    vi.mocked(supabase.from).mockReturnValue({
      update: mockUpdate
    } as any)

    // Act: Render hook and trigger mutation
    const { result } = renderHook(() => useUpdateComponent(), {
      wrapper: createWrapper()
    })

    const params: UpdateComponentMetadataParams = {
      componentId: 'component-uuid-1',
      version: 1,
      area_id: 'area-uuid-new',
      system_id: null,
      test_package_id: null
    }

    act(() => {
      result.current.mutate(params)
    })

    // Wait for error
    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    // Assert: Database error propagated
    expect(result.current.error).toEqual(dbError)
  })
})
