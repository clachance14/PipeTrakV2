/**
 * Test Suite: useCreateArea, useCreateSystem, useCreateTestPackage Hooks (T033, T035, T037)
 *
 * Feature: 020-component-metadata-editing
 * Date: 2025-10-29
 *
 * Tests for creating new metadata entries with client-side validation,
 * duplicate detection, and cache invalidation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { useCreateArea, useCreateSystem, useCreateTestPackage } from './useCreateMetadata'
import { supabase } from '@/lib/supabase'
import { MetadataError, MetadataErrorCode, ERROR_MESSAGES } from '@/types/metadata'
import type { CreateAreaParams, CreateSystemParams, CreateTestPackageParams, Area, System, TestPackage } from '@/types/metadata'

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

// Helper to create mock chain for .insert().select().single()
const createInsertMockChain = (singleResult: { data: any; error: any }) => {
  const mockSingle = vi.fn().mockResolvedValue(singleResult)
  const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
  const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })

  return { mockSingle, mockSelect, mockInsert }
}

describe('useCreateArea hook (T033)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates area with name and project_id', async () => {
    // Arrange: Mock successful insert
    const mockCreatedArea: Area = {
      id: 'area-uuid-1',
      name: 'North Wing',
      project_id: 'project-uuid',
      organization_id: 'org-uuid',
      created_by: 'user-uuid',
      created_at: '2025-10-29T10:00:00Z'
    }

    const { mockInsert } = createInsertMockChain({ data: mockCreatedArea, error: null })

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert
    } as any)

    // Act: Render hook and trigger mutation
    const { result } = renderHook(() => useCreateArea(), {
      wrapper: createWrapper()
    })

    const params: CreateAreaParams = {
      name: 'North Wing',
      project_id: 'project-uuid'
    }

    act(() => {
      result.current.mutate(params)
    })

    // Wait for mutation to complete
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // Assert: Insert called with correct fields
    expect(mockInsert).toHaveBeenCalledWith({
      name: 'North Wing',
      project_id: 'project-uuid'
    })
    expect(result.current.data).toEqual(mockCreatedArea)
  })

  it('returns created area with ID', async () => {
    // Arrange: Mock successful insert
    const mockCreatedArea: Area = {
      id: 'area-uuid-generated',
      name: 'Building A',
      project_id: 'project-uuid',
      organization_id: 'org-uuid',
      created_by: 'user-uuid',
      created_at: '2025-10-29T10:05:00Z'
    }

    const { mockInsert } = createInsertMockChain({ data: mockCreatedArea, error: null })

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert
    } as any)

    // Act: Render hook and trigger mutation
    const { result } = renderHook(() => useCreateArea(), {
      wrapper: createWrapper()
    })

    const params: CreateAreaParams = {
      name: 'Building A',
      project_id: 'project-uuid'
    }

    act(() => {
      result.current.mutate(params)
    })

    // Wait for success
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // Assert: Returned area includes generated ID
    expect(result.current.data?.id).toBe('area-uuid-generated')
    expect(result.current.data?.name).toBe('Building A')
  })

  it('validates name before creation', async () => {
    // Arrange: Create hook
    const { result } = renderHook(() => useCreateArea(), {
      wrapper: createWrapper()
    })

    const params: CreateAreaParams = {
      name: '',  // Empty name
      project_id: 'project-uuid'
    }

    // Act: Trigger mutation with empty name
    act(() => {
      result.current.mutate(params)
    })

    // Wait for error
    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    // Assert: EMPTY_NAME error thrown
    const error = result.current.error as MetadataError
    expect(error).toBeInstanceOf(MetadataError)
    expect(error.code).toBe(MetadataErrorCode.EMPTY_NAME)
    expect(error.message).toBe(ERROR_MESSAGES[MetadataErrorCode.EMPTY_NAME])
  })

  it('prevents duplicate names (case-insensitive)', async () => {
    // Arrange: Mock unique constraint violation (PostgreSQL error code 23505)
    const dbError = {
      code: '23505',
      message: 'duplicate key value violates unique constraint'
    }

    const { mockInsert } = createInsertMockChain({ data: null, error: dbError })

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert
    } as any)

    // Act: Render hook and trigger mutation
    const { result } = renderHook(() => useCreateArea(), {
      wrapper: createWrapper()
    })

    const params: CreateAreaParams = {
      name: 'Existing Area',
      project_id: 'project-uuid'
    }

    act(() => {
      result.current.mutate(params)
    })

    // Wait for error
    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    // Assert: DUPLICATE_NAME error thrown
    const error = result.current.error as MetadataError
    expect(error).toBeInstanceOf(MetadataError)
    expect(error.code).toBe(MetadataErrorCode.DUPLICATE_NAME)
    expect(error.message).toContain('Existing Area')
    expect(error.message).toContain('already exists')
  })

  it('trims whitespace from name', async () => {
    // Arrange: Mock successful insert
    const mockCreatedArea: Area = {
      id: 'area-uuid-1',
      name: 'Trimmed Name',  // No whitespace
      project_id: 'project-uuid',
      organization_id: 'org-uuid',
      created_by: 'user-uuid',
      created_at: '2025-10-29T10:00:00Z'
    }

    const { mockInsert } = createInsertMockChain({ data: mockCreatedArea, error: null })

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert
    } as any)

    // Act: Render hook and trigger mutation
    const { result } = renderHook(() => useCreateArea(), {
      wrapper: createWrapper()
    })

    const params: CreateAreaParams = {
      name: '  Trimmed Name  ',  // Leading and trailing whitespace
      project_id: 'project-uuid'
    }

    act(() => {
      result.current.mutate(params)
    })

    // Wait for success
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // Assert: Insert called with trimmed name
    expect(mockInsert).toHaveBeenCalledWith({
      name: 'Trimmed Name',
      project_id: 'project-uuid'
    })
  })

  it('invalidates areas query cache on success', async () => {
    // Arrange: Mock successful insert
    const mockCreatedArea: Area = {
      id: 'area-uuid-1',
      name: 'New Area',
      project_id: 'project-uuid',
      organization_id: 'org-uuid',
      created_by: 'user-uuid',
      created_at: '2025-10-29T10:00:00Z'
    }

    const { mockInsert } = createInsertMockChain({ data: mockCreatedArea, error: null })

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert
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
    const { result } = renderHook(() => useCreateArea(), { wrapper })

    const params: CreateAreaParams = {
      name: 'New Area',
      project_id: 'project-uuid'
    }

    act(() => {
      result.current.mutate(params)
    })

    // Wait for success
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // Assert: Query invalidated with correct key
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['areas', 'project-uuid'] })
  })

  it('handles database errors (network failure)', async () => {
    // Arrange: Mock network error
    const dbError = new Error('Network error')

    const { mockInsert } = createInsertMockChain({ data: null, error: dbError })

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert
    } as any)

    // Act: Render hook and trigger mutation
    const { result } = renderHook(() => useCreateArea(), {
      wrapper: createWrapper()
    })

    const params: CreateAreaParams = {
      name: 'New Area',
      project_id: 'project-uuid'
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

describe('useCreateSystem hook (T035)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates system with name and project_id', async () => {
    // Arrange: Mock successful insert
    const mockCreatedSystem: System = {
      id: 'system-uuid-1',
      name: 'HVAC',
      project_id: 'project-uuid',
      organization_id: 'org-uuid',
      created_by: 'user-uuid',
      created_at: '2025-10-29T10:00:00Z'
    }

    const { mockInsert } = createInsertMockChain({ data: mockCreatedSystem, error: null })

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert
    } as any)

    // Act: Render hook and trigger mutation
    const { result } = renderHook(() => useCreateSystem(), {
      wrapper: createWrapper()
    })

    const params: CreateSystemParams = {
      name: 'HVAC',
      project_id: 'project-uuid'
    }

    act(() => {
      result.current.mutate(params)
    })

    // Wait for mutation to complete
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // Assert: Insert called with correct fields
    expect(mockInsert).toHaveBeenCalledWith({
      name: 'HVAC',
      project_id: 'project-uuid'
    })
    expect(result.current.data).toEqual(mockCreatedSystem)
  })

  it('returns created system with ID', async () => {
    // Arrange: Mock successful insert
    const mockCreatedSystem: System = {
      id: 'system-uuid-generated',
      name: 'Plumbing',
      project_id: 'project-uuid',
      organization_id: 'org-uuid',
      created_by: 'user-uuid',
      created_at: '2025-10-29T10:05:00Z'
    }

    const { mockInsert } = createInsertMockChain({ data: mockCreatedSystem, error: null })

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert
    } as any)

    // Act: Render hook and trigger mutation
    const { result } = renderHook(() => useCreateSystem(), {
      wrapper: createWrapper()
    })

    const params: CreateSystemParams = {
      name: 'Plumbing',
      project_id: 'project-uuid'
    }

    act(() => {
      result.current.mutate(params)
    })

    // Wait for success
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // Assert: Returned system includes generated ID
    expect(result.current.data?.id).toBe('system-uuid-generated')
    expect(result.current.data?.name).toBe('Plumbing')
  })

  it('validates name before creation', async () => {
    // Arrange: Create hook
    const { result } = renderHook(() => useCreateSystem(), {
      wrapper: createWrapper()
    })

    const params: CreateSystemParams = {
      name: '   ',  // Whitespace-only name
      project_id: 'project-uuid'
    }

    // Act: Trigger mutation with whitespace-only name
    act(() => {
      result.current.mutate(params)
    })

    // Wait for error
    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    // Assert: EMPTY_NAME error thrown
    const error = result.current.error as MetadataError
    expect(error).toBeInstanceOf(MetadataError)
    expect(error.code).toBe(MetadataErrorCode.EMPTY_NAME)
    expect(error.message).toBe(ERROR_MESSAGES[MetadataErrorCode.EMPTY_NAME])
  })

  it('prevents duplicate names (case-insensitive)', async () => {
    // Arrange: Mock unique constraint violation
    const dbError = {
      code: '23505',
      message: 'duplicate key value violates unique constraint'
    }

    const { mockInsert } = createInsertMockChain({ data: null, error: dbError })

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert
    } as any)

    // Act: Render hook and trigger mutation
    const { result } = renderHook(() => useCreateSystem(), {
      wrapper: createWrapper()
    })

    const params: CreateSystemParams = {
      name: 'Existing System',
      project_id: 'project-uuid'
    }

    act(() => {
      result.current.mutate(params)
    })

    // Wait for error
    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    // Assert: DUPLICATE_NAME error thrown
    const error = result.current.error as MetadataError
    expect(error).toBeInstanceOf(MetadataError)
    expect(error.code).toBe(MetadataErrorCode.DUPLICATE_NAME)
    expect(error.message).toContain('Existing System')
  })

  it('trims whitespace from name', async () => {
    // Arrange: Mock successful insert
    const mockCreatedSystem: System = {
      id: 'system-uuid-1',
      name: 'Electrical',
      project_id: 'project-uuid',
      organization_id: 'org-uuid',
      created_by: 'user-uuid',
      created_at: '2025-10-29T10:00:00Z'
    }

    const { mockInsert } = createInsertMockChain({ data: mockCreatedSystem, error: null })

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert
    } as any)

    // Act: Render hook and trigger mutation
    const { result } = renderHook(() => useCreateSystem(), {
      wrapper: createWrapper()
    })

    const params: CreateSystemParams = {
      name: '  Electrical  ',
      project_id: 'project-uuid'
    }

    act(() => {
      result.current.mutate(params)
    })

    // Wait for success
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // Assert: Insert called with trimmed name
    expect(mockInsert).toHaveBeenCalledWith({
      name: 'Electrical',
      project_id: 'project-uuid'
    })
  })

  it('invalidates systems query cache on success', async () => {
    // Arrange: Mock successful insert
    const mockCreatedSystem: System = {
      id: 'system-uuid-1',
      name: 'New System',
      project_id: 'project-uuid',
      organization_id: 'org-uuid',
      created_by: 'user-uuid',
      created_at: '2025-10-29T10:00:00Z'
    }

    const { mockInsert } = createInsertMockChain({ data: mockCreatedSystem, error: null })

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert
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
    const { result } = renderHook(() => useCreateSystem(), { wrapper })

    const params: CreateSystemParams = {
      name: 'New System',
      project_id: 'project-uuid'
    }

    act(() => {
      result.current.mutate(params)
    })

    // Wait for success
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // Assert: Query invalidated with correct key
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['systems', 'project-uuid'] })
  })

  it('handles database errors', async () => {
    // Arrange: Mock database error
    const dbError = new Error('Connection timeout')

    const { mockInsert } = createInsertMockChain({ data: null, error: dbError })

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert
    } as any)

    // Act: Render hook and trigger mutation
    const { result } = renderHook(() => useCreateSystem(), {
      wrapper: createWrapper()
    })

    const params: CreateSystemParams = {
      name: 'New System',
      project_id: 'project-uuid'
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

describe('useCreateTestPackage hook (T037)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates test package with name and project_id', async () => {
    // Arrange: Mock successful insert
    const mockCreatedTestPackage: TestPackage = {
      id: 'tp-uuid-1',
      name: 'TP-01',
      project_id: 'project-uuid',
      organization_id: 'org-uuid',
      created_by: 'user-uuid',
      created_at: '2025-10-29T10:00:00Z'
    }

    const { mockInsert } = createInsertMockChain({ data: mockCreatedTestPackage, error: null })

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert
    } as any)

    // Act: Render hook and trigger mutation
    const { result } = renderHook(() => useCreateTestPackage(), {
      wrapper: createWrapper()
    })

    const params: CreateTestPackageParams = {
      name: 'TP-01',
      project_id: 'project-uuid'
    }

    act(() => {
      result.current.mutate(params)
    })

    // Wait for mutation to complete
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // Assert: Insert called with correct fields
    expect(mockInsert).toHaveBeenCalledWith({
      name: 'TP-01',
      project_id: 'project-uuid'
    })
    expect(result.current.data).toEqual(mockCreatedTestPackage)
  })

  it('returns created test package with ID', async () => {
    // Arrange: Mock successful insert
    const mockCreatedTestPackage: TestPackage = {
      id: 'tp-uuid-generated',
      name: 'Acceptance Test',
      project_id: 'project-uuid',
      organization_id: 'org-uuid',
      created_by: 'user-uuid',
      created_at: '2025-10-29T10:05:00Z'
    }

    const { mockInsert } = createInsertMockChain({ data: mockCreatedTestPackage, error: null })

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert
    } as any)

    // Act: Render hook and trigger mutation
    const { result } = renderHook(() => useCreateTestPackage(), {
      wrapper: createWrapper()
    })

    const params: CreateTestPackageParams = {
      name: 'Acceptance Test',
      project_id: 'project-uuid'
    }

    act(() => {
      result.current.mutate(params)
    })

    // Wait for success
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // Assert: Returned test package includes generated ID
    expect(result.current.data?.id).toBe('tp-uuid-generated')
    expect(result.current.data?.name).toBe('Acceptance Test')
  })

  it('validates name before creation', async () => {
    // Arrange: Create hook
    const { result } = renderHook(() => useCreateTestPackage(), {
      wrapper: createWrapper()
    })

    const params: CreateTestPackageParams = {
      name: '\t\n',  // Whitespace characters
      project_id: 'project-uuid'
    }

    // Act: Trigger mutation with whitespace name
    act(() => {
      result.current.mutate(params)
    })

    // Wait for error
    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    // Assert: EMPTY_NAME error thrown
    const error = result.current.error as MetadataError
    expect(error).toBeInstanceOf(MetadataError)
    expect(error.code).toBe(MetadataErrorCode.EMPTY_NAME)
    expect(error.message).toBe(ERROR_MESSAGES[MetadataErrorCode.EMPTY_NAME])
  })

  it('prevents duplicate names (case-insensitive)', async () => {
    // Arrange: Mock unique constraint violation
    const dbError = {
      code: '23505',
      message: 'duplicate key value violates unique constraint'
    }

    const { mockInsert } = createInsertMockChain({ data: null, error: dbError })

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert
    } as any)

    // Act: Render hook and trigger mutation
    const { result } = renderHook(() => useCreateTestPackage(), {
      wrapper: createWrapper()
    })

    const params: CreateTestPackageParams = {
      name: 'TP-12',
      project_id: 'project-uuid'
    }

    act(() => {
      result.current.mutate(params)
    })

    // Wait for error
    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    // Assert: DUPLICATE_NAME error thrown
    const error = result.current.error as MetadataError
    expect(error).toBeInstanceOf(MetadataError)
    expect(error.code).toBe(MetadataErrorCode.DUPLICATE_NAME)
    expect(error.message).toContain('TP-12')
  })

  it('trims whitespace from name', async () => {
    // Arrange: Mock successful insert
    const mockCreatedTestPackage: TestPackage = {
      id: 'tp-uuid-1',
      name: 'TP-05',
      project_id: 'project-uuid',
      organization_id: 'org-uuid',
      created_by: 'user-uuid',
      created_at: '2025-10-29T10:00:00Z'
    }

    const { mockInsert } = createInsertMockChain({ data: mockCreatedTestPackage, error: null })

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert
    } as any)

    // Act: Render hook and trigger mutation
    const { result } = renderHook(() => useCreateTestPackage(), {
      wrapper: createWrapper()
    })

    const params: CreateTestPackageParams = {
      name: '\n  TP-05  \n',
      project_id: 'project-uuid'
    }

    act(() => {
      result.current.mutate(params)
    })

    // Wait for success
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // Assert: Insert called with trimmed name
    expect(mockInsert).toHaveBeenCalledWith({
      name: 'TP-05',
      project_id: 'project-uuid'
    })
  })

  it('invalidates test_packages query cache on success', async () => {
    // Arrange: Mock successful insert
    const mockCreatedTestPackage: TestPackage = {
      id: 'tp-uuid-1',
      name: 'New Test Package',
      project_id: 'project-uuid',
      organization_id: 'org-uuid',
      created_by: 'user-uuid',
      created_at: '2025-10-29T10:00:00Z'
    }

    const { mockInsert } = createInsertMockChain({ data: mockCreatedTestPackage, error: null })

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert
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
    const { result } = renderHook(() => useCreateTestPackage(), { wrapper })

    const params: CreateTestPackageParams = {
      name: 'New Test Package',
      project_id: 'project-uuid'
    }

    act(() => {
      result.current.mutate(params)
    })

    // Wait for success
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // Assert: Query invalidated with correct key
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['test-packages', 'project-uuid'] })
  })

  it('handles database errors', async () => {
    // Arrange: Mock permission denied error
    const dbError = new Error('Permission denied')

    const { mockInsert } = createInsertMockChain({ data: null, error: dbError })

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert
    } as any)

    // Act: Render hook and trigger mutation
    const { result } = renderHook(() => useCreateTestPackage(), {
      wrapper: createWrapper()
    })

    const params: CreateTestPackageParams = {
      name: 'New Test Package',
      project_id: 'project-uuid'
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
