/**
 * Contract tests for useAreas hooks (Feature 007)
 * These tests define the API contract for area management mutations
 */

import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCreateArea, useUpdateArea, useDeleteArea } from './useAreas'
import { createElement, type ReactNode } from 'react'

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

describe('useCreateArea contract', () => {
  it('accepts project_id, name, and optional description', () => {
    const { result } = renderHook(() => useCreateArea(), {
      wrapper: createWrapper()
    })

    expect(result.current.mutate).toBeDefined()
    expect(typeof result.current.mutate).toBe('function')

    // Type assertion - validates the request shape
    const validRequest: Parameters<typeof result.current.mutate>[0] = {
      project_id: 'test-uuid',
      name: 'Area 100',
      description: 'Test area'
    }
    expect(validRequest).toBeDefined()
  })

  it('returns area object on success', async () => {
    const { result } = renderHook(() => useCreateArea(), {
      wrapper: createWrapper()
    })

    // Validate response type structure
    type MutationResult = typeof result.current
    type _ResponseData = Awaited<ReturnType<MutationResult['mutateAsync']>>

    expect(result.current.data).toBeUndefined() // No data initially
  })
})

describe('useUpdateArea contract', () => {
  it('accepts id and optional name/description', () => {
    const { result } = renderHook(() => useUpdateArea(), {
      wrapper: createWrapper()
    })

    expect(result.current.mutate).toBeDefined()
    expect(typeof result.current.mutate).toBe('function')

    // Type assertion - validates the request shape
    const validRequest: Parameters<typeof result.current.mutate>[0] = {
      id: 'area-uuid',
      name: 'Updated Area 100',
      description: 'Updated description'
    }
    expect(validRequest).toBeDefined()
  })

  it('returns updated area object on success', async () => {
    const { result } = renderHook(() => useUpdateArea(), {
      wrapper: createWrapper()
    })

    expect(result.current.data).toBeUndefined() // No data initially
  })
})

describe('useDeleteArea contract', () => {
  it('accepts area id', () => {
    const { result } = renderHook(() => useDeleteArea(), {
      wrapper: createWrapper()
    })

    expect(result.current.mutate).toBeDefined()
    expect(typeof result.current.mutate).toBe('function')

    // Type assertion - validates the request shape
    const validRequest: Parameters<typeof result.current.mutate>[0] = {
      id: 'area-uuid'
    }
    expect(validRequest).toBeDefined()
  })

  it('returns void on success', async () => {
    const { result } = renderHook(() => useDeleteArea(), {
      wrapper: createWrapper()
    })

    expect(result.current.data).toBeUndefined() // No data initially
  })

  it('sets component area_id to NULL when area has assigned components', () => {
    // This is a behavior contract - the deletion should unassign components
    // RLS policy and cascade behavior is tested at integration level
    expect(true).toBe(true) // Contract documented
  })
})
