/**
 * Test Suite: useComponentMetadata Hook (T019)
 *
 * Feature: 020-component-metadata-editing
 * Date: 2025-10-29
 *
 * Tests for fetching a single component with metadata relations (area, system, test_package).
 * Uses TanStack Query for caching and state management.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { useComponentMetadata } from './useComponentMetadata'
import { supabase } from '@/lib/supabase'
import type { Component, Area, System, TestPackage } from '@/types/metadata'

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

// Test data fixtures
const mockArea: Area = {
  id: 'area-uuid-1',
  name: 'North Wing',
  project_id: 'project-uuid',
  organization_id: 'org-uuid',
  created_by: 'user-uuid',
  created_at: '2025-10-29T10:00:00Z'
}

const mockSystem: System = {
  id: 'system-uuid-1',
  name: 'HVAC',
  project_id: 'project-uuid',
  organization_id: 'org-uuid',
  created_by: 'user-uuid',
  created_at: '2025-10-29T10:00:00Z'
}

const mockTestPackage: TestPackage = {
  id: 'tp-uuid-1',
  name: 'TP-01',
  project_id: 'project-uuid',
  organization_id: 'org-uuid',
  created_by: 'user-uuid',
  created_at: '2025-10-29T10:00:00Z'
}

const mockComponent: Component = {
  id: 'component-uuid-1',
  drawing_number: 'DWG-001',
  component_identity: 'P-001-ST-2.5',
  component_type: 'Pipe',
  size: '2.5"',
  area_id: mockArea.id,
  system_id: mockSystem.id,
  test_package_id: mockTestPackage.id,
  area: mockArea,
  system: mockSystem,
  test_package: mockTestPackage,
  version: 1,
  last_updated_at: '2025-10-29T10:00:00Z',
  organization_id: 'org-uuid',
  project_id: 'project-uuid'
}

describe('useComponentMetadata hook (T019)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches component by ID with metadata relations', async () => {
    // Arrange: Mock successful fetch
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: mockComponent,
          error: null
        })
      })
    })

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect
    } as any)

    // Act: Render hook
    const { result } = renderHook(
      () => useComponentMetadata('component-uuid-1'),
      { wrapper: createWrapper() }
    )

    // Assert: Initial loading state
    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBeUndefined()

    // Wait for query to complete
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // Assert: Data returned
    expect(result.current.data).toEqual(mockComponent)
    expect(result.current.data?.area).toEqual(mockArea)
    expect(result.current.data?.system).toEqual(mockSystem)
    expect(result.current.data?.test_package).toEqual(mockTestPackage)
  })

  it('joins area, system, test_package relations in query', async () => {
    // Arrange: Mock select
    const mockSingle = vi.fn().mockResolvedValue({
      data: mockComponent,
      error: null
    })
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect
    } as any)

    // Act: Render hook
    renderHook(() => useComponentMetadata('component-uuid-1'), {
      wrapper: createWrapper()
    })

    // Wait for query
    await waitFor(() => {
      expect(mockSelect).toHaveBeenCalled()
    })

    // Assert: Correct query structure with joins
    expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('area:areas(*)'))
    expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('system:systems(*)'))
    expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('test_package:test_packages(*)'))
    expect(mockEq).toHaveBeenCalledWith('id', 'component-uuid-1')
    expect(mockSingle).toHaveBeenCalled()
  })

  it('returns loading state while fetching', () => {
    // Arrange: Mock pending query
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockReturnValue(new Promise(() => {})) // Never resolves
      })
    })

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect
    } as any)

    // Act: Render hook
    const { result } = renderHook(
      () => useComponentMetadata('component-uuid-1'),
      { wrapper: createWrapper() }
    )

    // Assert: Loading state
    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBeUndefined()
    expect(result.current.error).toBeNull()
  })

  it('returns error state on fetch failure', async () => {
    // Arrange: Mock error response
    const mockError = new Error('Database connection failed')
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: mockError
        })
      })
    })

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect
    } as any)

    // Act: Render hook
    const { result } = renderHook(
      () => useComponentMetadata('component-uuid-1'),
      { wrapper: createWrapper() }
    )

    // Wait for error
    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    // Assert: Error state
    expect(result.current.error).toEqual(mockError)
    expect(result.current.data).toBeUndefined()
  })

  it('caches data with TanStack Query using correct query key', async () => {
    // Arrange: Mock successful fetch
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: mockComponent,
          error: null
        })
      })
    })

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect
    } as any)

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false }
      }
    })

    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children)

    // Act: Render hook
    const { result } = renderHook(
      () => useComponentMetadata('component-uuid-1'),
      { wrapper }
    )

    // Wait for success
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // Assert: Data cached with correct key
    const cachedData = queryClient.getQueryData(['component', 'component-uuid-1'])
    expect(cachedData).toEqual(mockComponent)
  })

  it('uses query key pattern: ["component", componentId]', async () => {
    // Arrange: Mock successful fetch
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: mockComponent,
          error: null
        })
      })
    })

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect
    } as any)

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false }
      }
    })

    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children)

    // Act: Render hook
    renderHook(() => useComponentMetadata('test-component-id'), { wrapper })

    // Wait for query
    await waitFor(() => {
      expect(mockSelect).toHaveBeenCalled()
    })

    // Assert: Query key structure
    const queryCache = queryClient.getQueryCache()
    const queries = queryCache.getAll()
    const componentQuery = queries.find(q =>
      Array.isArray(q.queryKey) &&
      q.queryKey[0] === 'component' &&
      q.queryKey[1] === 'test-component-id'
    )

    expect(componentQuery).toBeDefined()
    expect(componentQuery?.queryKey).toEqual(['component', 'test-component-id'])
  })

  it('handles component with null metadata assignments', async () => {
    // Arrange: Component with no metadata assigned
    const componentWithoutMetadata: Component = {
      ...mockComponent,
      area_id: null,
      system_id: null,
      test_package_id: null,
      area: undefined,
      system: undefined,
      test_package: undefined
    }

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: componentWithoutMetadata,
          error: null
        })
      })
    })

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect
    } as any)

    // Act: Render hook
    const { result } = renderHook(
      () => useComponentMetadata('component-uuid-1'),
      { wrapper: createWrapper() }
    )

    // Wait for success
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // Assert: Null metadata handled correctly
    expect(result.current.data?.area_id).toBeNull()
    expect(result.current.data?.system_id).toBeNull()
    expect(result.current.data?.test_package_id).toBeNull()
  })
})
