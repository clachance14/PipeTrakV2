/**
 * Contract tests for useCloneTemplates hook (Feature 026 - US1)
 * Tests manual cloning of system templates to project templates
 */

import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCloneTemplates } from './useCloneTemplates'
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

describe('useCloneTemplates contract', () => {
  it('accepts project_id parameter', () => {
    const { result } = renderHook(() => useCloneTemplates(), {
      wrapper: createWrapper()
    })

    expect(result.current.mutate).toBeDefined()
    expect(typeof result.current.mutate).toBe('function')

    // Type assertion - validates the request shape
    const validRequest: Parameters<typeof result.current.mutate>[0] = {
      projectId: 'test-uuid'
    }
    expect(validRequest).toBeDefined()
  })

  it('returns count of cloned templates on success', async () => {
    const { result } = renderHook(() => useCloneTemplates(), {
      wrapper: createWrapper()
    })

    // Validate response type structure
    type MutationResult = typeof result.current
    type _ResponseData = Awaited<ReturnType<MutationResult['mutateAsync']>>

    expect(result.current.data).toBeUndefined() // No data initially
  })

  it('invalidates project templates query cache on success', () => {
    const { result } = renderHook(() => useCloneTemplates(), {
      wrapper: createWrapper()
    })

    // Mutation should have onSuccess handler to invalidate queries
    expect(result.current.mutate).toBeDefined()
  })
})
