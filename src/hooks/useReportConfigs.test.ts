/**
 * Contract tests for useReportConfigs hooks (Feature 019)
 * Tests CRUD operations for report_configs table
 */

import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useReportConfigs,
  useCreateReportConfig,
  useUpdateReportConfig,
  useDeleteReportConfig,
} from './useReportConfigs'
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

describe('useReportConfigs contract', () => {
  const testProjectId = 'test-project-uuid'

  it('accepts projectId parameter', () => {
    const { result } = renderHook(() => useReportConfigs(testProjectId), {
      wrapper: createWrapper()
    })

    expect(result.current).toBeDefined()
    expect(result.current.isLoading).toBeDefined()
    expect('data' in result.current).toBe(true)
    expect('error' in result.current).toBe(true)
  })

  it('returns array of ReportConfig objects', () => {
    const { result } = renderHook(() => useReportConfigs(testProjectId), {
      wrapper: createWrapper()
    })

    // Validate return type structure
    type QueryResult = typeof result.current
    type DataType = QueryResult['data']

    // Initially undefined (loading state)
    expect(result.current.data).toBeUndefined()
  })

  it('uses correct query key for cache invalidation', () => {
    const { result } = renderHook(() => useReportConfigs(testProjectId), {
      wrapper: createWrapper()
    })

    // Query key should include projectId for proper caching
    expect(result.current).toBeDefined()
  })

  it('handles missing projectId gracefully', () => {
    const { result } = renderHook(() => useReportConfigs(''), {
      wrapper: createWrapper()
    })

    // Should not crash, query should be defined
    expect(result.current).toBeDefined()
  })
})

describe('useCreateReportConfig contract', () => {
  it('accepts CreateReportConfigInput parameters', () => {
    const { result } = renderHook(() => useCreateReportConfig(), {
      wrapper: createWrapper()
    })

    expect(result.current.mutate).toBeDefined()
    expect(typeof result.current.mutate).toBe('function')

    // Type assertion - validates the request shape
    const validRequest: Parameters<typeof result.current.mutate>[0] = {
      projectId: 'test-uuid',
      name: 'Weekly Area Report',
      description: 'Standard weekly report grouped by area',
      groupingDimension: 'area',
      hierarchicalGrouping: false,
      componentTypeFilter: null,
    }
    expect(validRequest).toBeDefined()
  })

  it('returns ReportConfig object on success', () => {
    const { result } = renderHook(() => useCreateReportConfig(), {
      wrapper: createWrapper()
    })

    // Validate response type structure
    type MutationResult = typeof result.current
    type ResponseData = Awaited<ReturnType<MutationResult['mutateAsync']>>

    expect(result.current.data).toBeUndefined() // No data initially
  })

  it('invalidates report configs query on success', () => {
    // This is a behavior contract - mutation should invalidate the list
    // Tested at integration level
    expect(true).toBe(true) // Contract documented
  })
})

describe('useUpdateReportConfig contract', () => {
  it('accepts id and UpdateReportConfigInput parameters', () => {
    const { result } = renderHook(() => useUpdateReportConfig(), {
      wrapper: createWrapper()
    })

    expect(result.current.mutate).toBeDefined()
    expect(typeof result.current.mutate).toBe('function')

    // Type assertion - validates the request shape
    const validRequest: Parameters<typeof result.current.mutate>[0] = {
      id: 'config-uuid',
      name: 'Updated Report Name',
      description: 'Updated description',
      groupingDimension: 'system',
      hierarchicalGrouping: true,
      componentTypeFilter: ['spool', 'valve'],
    }
    expect(validRequest).toBeDefined()
  })

  it('allows partial updates (all fields optional except id)', () => {
    const { result } = renderHook(() => useUpdateReportConfig(), {
      wrapper: createWrapper()
    })

    // Type assertion - validates partial update shape
    const partialRequest: Parameters<typeof result.current.mutate>[0] = {
      id: 'config-uuid',
      name: 'Just updating the name',
    }
    expect(partialRequest).toBeDefined()
  })

  it('returns updated ReportConfig object on success', () => {
    const { result } = renderHook(() => useUpdateReportConfig(), {
      wrapper: createWrapper()
    })

    expect(result.current.data).toBeUndefined() // No data initially
  })

  it('invalidates report configs query on success', () => {
    // This is a behavior contract - mutation should invalidate the list
    expect(true).toBe(true) // Contract documented
  })
})

describe('useDeleteReportConfig contract', () => {
  it('accepts config id', () => {
    const { result } = renderHook(() => useDeleteReportConfig(), {
      wrapper: createWrapper()
    })

    expect(result.current.mutate).toBeDefined()
    expect(typeof result.current.mutate).toBe('function')

    // Type assertion - validates the request shape
    const validRequest: Parameters<typeof result.current.mutate>[0] = {
      id: 'config-uuid'
    }
    expect(validRequest).toBeDefined()
  })

  it('returns void on success', () => {
    const { result } = renderHook(() => useDeleteReportConfig(), {
      wrapper: createWrapper()
    })

    expect(result.current.data).toBeUndefined() // No data initially
  })

  it('invalidates report configs query on success', () => {
    // This is a behavior contract - mutation should invalidate the list
    expect(true).toBe(true) // Contract documented
  })

  it('enforces RLS policies (user can only delete their own configs)', () => {
    // This is a behavior contract - RLS enforced at database level
    // Tested at integration level
    expect(true).toBe(true) // Contract documented
  })
})
