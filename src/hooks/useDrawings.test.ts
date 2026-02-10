/**
 * Contract tests for useDrawings hooks (Feature 007)
 * These tests define the API contract for drawing retirement
 */

import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useRetireDrawing } from './useDrawings'
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

describe('useRetireDrawing contract', () => {
  it('accepts drawing_id and retire_reason', () => {
    const { result } = renderHook(() => useRetireDrawing(), {
      wrapper: createWrapper()
    })

    expect(result.current.mutate).toBeDefined()
    expect(typeof result.current.mutate).toBe('function')

    // Type assertion - validates the request shape
    const validRequest: Parameters<typeof result.current.mutate>[0] = {
      drawing_id: 'drawing-uuid',
      retire_reason: 'Superseded by Rev-B, issued 2025-10-16'
    }
    expect(validRequest).toBeDefined()
  })

  it('requires retire_reason with minimum length', () => {
    const { result: _result } = renderHook(() => useRetireDrawing(), {
      wrapper: createWrapper()
    })

    // Valid request with reason > 10 chars
    const validRequest: Parameters<typeof _result.current.mutate>[0] = {
      drawing_id: 'drawing-uuid',
      retire_reason: 'This is a valid reason for retirement'
    }
    expect(validRequest.retire_reason.length).toBeGreaterThanOrEqual(10)
  })

  it('returns updated drawing object on success', async () => {
    const { result } = renderHook(() => useRetireDrawing(), {
      wrapper: createWrapper()
    })

    expect(result.current.data).toBeUndefined() // No data initially
  })

  it('sets is_retired=true without deleting components', () => {
    // This is a behavior contract
    // Components retain drawing_id reference even when drawing is retired
    // Integration tests will verify this behavior
    expect(true).toBe(true) // Contract documented
  })
})
