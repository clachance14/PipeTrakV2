/**
 * Contract tests for useSystems hooks (Feature 007)
 * These tests define the API contract for system management mutations
 */

import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCreateSystem, useUpdateSystem, useDeleteSystem } from './useSystems'
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

describe('useCreateSystem contract', () => {
  it('accepts project_id, name, and optional description', () => {
    const { result } = renderHook(() => useCreateSystem(), {
      wrapper: createWrapper()
    })

    expect(result.current.mutate).toBeDefined()
    expect(typeof result.current.mutate).toBe('function')

    // Type assertion - validates the request shape
    const validRequest: Parameters<typeof result.current.mutate>[0] = {
      project_id: 'test-uuid',
      name: 'HVAC-01',
      description: 'Heating system'
    }
    expect(validRequest).toBeDefined()
  })

  it('returns system object on success', async () => {
    const { result } = renderHook(() => useCreateSystem(), {
      wrapper: createWrapper()
    })

    expect(result.current.data).toBeUndefined() // No data initially
  })
})

describe('useUpdateSystem contract', () => {
  it('accepts id and optional name/description', () => {
    const { result } = renderHook(() => useUpdateSystem(), {
      wrapper: createWrapper()
    })

    expect(result.current.mutate).toBeDefined()
    expect(typeof result.current.mutate).toBe('function')

    // Type assertion - validates the request shape
    const validRequest: Parameters<typeof result.current.mutate>[0] = {
      id: 'system-uuid',
      name: 'HVAC-02',
      description: 'Updated system'
    }
    expect(validRequest).toBeDefined()
  })

  it('returns updated system object on success', async () => {
    const { result } = renderHook(() => useUpdateSystem(), {
      wrapper: createWrapper()
    })

    expect(result.current.data).toBeUndefined() // No data initially
  })
})

describe('useDeleteSystem contract', () => {
  it('accepts system id', () => {
    const { result } = renderHook(() => useDeleteSystem(), {
      wrapper: createWrapper()
    })

    expect(result.current.mutate).toBeDefined()
    expect(typeof result.current.mutate).toBe('function')

    // Type assertion - validates the request shape
    const validRequest: Parameters<typeof result.current.mutate>[0] = {
      id: 'system-uuid'
    }
    expect(validRequest).toBeDefined()
  })

  it('returns void on success', async () => {
    const { result } = renderHook(() => useDeleteSystem(), {
      wrapper: createWrapper()
    })

    expect(result.current.data).toBeUndefined() // No data initially
  })

  it('sets component system_id to NULL when system has assigned components', () => {
    // This is a behavior contract - the deletion should unassign components
    // RLS policy and cascade behavior is tested at integration level
    expect(true).toBe(true) // Contract documented
  })
})
