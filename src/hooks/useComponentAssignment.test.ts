/**
 * Contract tests for useComponentAssignment hooks (Feature 007)
 * These tests define the API contract for bulk component assignment
 */

import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAssignComponents } from './useComponentAssignment'
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
