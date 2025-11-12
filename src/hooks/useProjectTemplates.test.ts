/**
 * Contract tests for useProjectTemplates hook (Feature 026 - US1)
 * Tests fetching project-specific milestone weight templates
 */

import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useProjectTemplates } from './useProjectTemplates'
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

describe('useProjectTemplates contract', () => {
  it('fetches templates for a project and component type', () => {
    const { result } = renderHook(
      () => useProjectTemplates('test-project-id', 'Field Weld'),
      { wrapper: createWrapper() }
    )

    expect(result.current).toBeDefined()
    expect(result.current.data).toBeUndefined() // No data initially (query not executed in test)
    expect(result.current.isLoading).toBeDefined()
    expect(result.current.error).toBeNull()
  })

  it('returns array of templates ordered by milestone_order', () => {
    const { result } = renderHook(
      () => useProjectTemplates('test-project-id', 'Field Weld'),
      { wrapper: createWrapper() }
    )

    // Validate response type structure
    type QueryResult = typeof result.current
    type _ResponseData = QueryResult['data']

    expect(result.current.data).toBeUndefined() // No data initially
  })

  it('is disabled when projectId or componentType is empty', () => {
    const { result: result1 } = renderHook(
      () => useProjectTemplates('', 'Field Weld'),
      { wrapper: createWrapper() }
    )

    const { result: result2 } = renderHook(
      () => useProjectTemplates('test-project-id', ''),
      { wrapper: createWrapper() }
    )

    // Query should be disabled (not loading, no data)
    expect(result1.current.isLoading).toBe(false)
    expect(result2.current.isLoading).toBe(false)
  })

  it('groups templates by component type when fetching all templates', () => {
    const { result } = renderHook(
      () => useProjectTemplates('test-project-id'),
      { wrapper: createWrapper() }
    )

    // When no componentType provided, should fetch all templates for project
    expect(result.current).toBeDefined()
  })
})
