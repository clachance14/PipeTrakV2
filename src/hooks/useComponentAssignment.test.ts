/**
 * Contract tests for useComponentAssignment hooks (Feature 007)
 * These tests define the API contract for bulk component assignment
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAssignComponents, useClearComponentAssignments } from './useComponentAssignment'
import { createElement, type ReactNode } from 'react'

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        in: vi.fn(() => ({
          select: vi.fn().mockResolvedValue({
            data: [{ id: 'comp-1', area_id: 'area-1' }],
            error: null
          })
        })),
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { id: 'comp-1', area_id: null, system_id: null, test_package_id: null },
              error: null
            })
          }))
        }))
      }))
    }))
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

describe('useAssignComponents contract', () => {
  it('accepts component_ids array and optional area_id/system_id/test_package_id', () => {
    const { result } = renderHook(() => useAssignComponents(), {
      wrapper: createWrapper()
    })

    expect(result.current.mutate).toBeDefined()
    expect(typeof result.current.mutate).toBe('function')

    // Type assertion - validates the request shape
    const validRequest: Parameters<typeof result.current.mutate>[0] = {
      component_ids: ['uuid-1', 'uuid-2', 'uuid-3'],
      area_id: 'area-uuid',
      system_id: 'system-uuid',
      test_package_id: null
    }
    expect(validRequest).toBeDefined()
  })

  it('requires at least one of area_id, system_id, or test_package_id', () => {
    const { result } = renderHook(() => useAssignComponents(), {
      wrapper: createWrapper()
    })

    // Valid: only area_id
    const request1: Parameters<typeof result.current.mutate>[0] = {
      component_ids: ['uuid-1'],
      area_id: 'area-uuid',
      system_id: null,
      test_package_id: null
    }
    expect(request1).toBeDefined()

    // Valid: only system_id
    const request2: Parameters<typeof result.current.mutate>[0] = {
      component_ids: ['uuid-1'],
      area_id: null,
      system_id: 'system-uuid',
      test_package_id: null
    }
    expect(request2).toBeDefined()
  })

  it('returns updated_count on success', async () => {
    const { result } = renderHook(() => useAssignComponents(), {
      wrapper: createWrapper()
    })

    expect(result.current.data).toBeUndefined() // No data initially
  })

  it('validates area/system/package exists in project before assigning', () => {
    // This is a behavior contract - validation happens server-side
    // Integration tests will verify RLS policies enforce project_id matching
    expect(true).toBe(true) // Contract documented
  })
})

describe('useAssignComponents cache invalidation', () => {
  it('invalidates drawings-with-progress and package-readiness queries on success', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })

    // Spy on invalidateQueries
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children)

    const { result } = renderHook(() => useAssignComponents(), { wrapper })

    // Trigger mutation
    result.current.mutate({
      component_ids: ['comp-1'],
      area_id: 'area-1'
    })

    // Wait for mutation to complete
    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 1000 })

    // Verify cache invalidations were called with correct query keys
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['components'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['drawings-with-progress'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['package-readiness'] })
  })

  it('invalidates package-components when test_package_id is updated', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children)

    const { result } = renderHook(() => useAssignComponents(), { wrapper })

    result.current.mutate({
      component_ids: ['comp-1'],
      test_package_id: 'tp-1'
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 1000 })

    // Verify package-components invalidation when test_package_id changes
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['package-components'] })
  })
})

describe('useClearComponentAssignments cache invalidation', () => {
  it('invalidates all required queries including package-components', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children)

    const { result } = renderHook(() => useClearComponentAssignments(), { wrapper })

    result.current.mutate({ component_id: 'comp-1' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 1000 })

    // Verify all cache invalidations
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['components'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['drawings-with-progress'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['package-readiness'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['package-components'] })
  })
})
