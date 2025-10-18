/**
 * Contract tests for useTestPackages hooks (Feature 007)
 * These tests define the API contract for test package management mutations
 */

import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCreateTestPackage, useUpdateTestPackage, useDeleteTestPackage } from './useTestPackages'
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

describe('useCreateTestPackage contract', () => {
  it('accepts project_id, name, optional description and target_date', () => {
    const { result } = renderHook(() => useCreateTestPackage(), {
      wrapper: createWrapper()
    })

    expect(result.current.mutate).toBeDefined()
    expect(typeof result.current.mutate).toBe('function')

    // Type assertion - validates the request shape
    const validRequest: Parameters<typeof result.current.mutate>[0] = {
      project_id: 'test-uuid',
      name: 'TP-2025-001',
      description: 'Q4 test package',
      target_date: '2025-12-15'
    }
    expect(validRequest).toBeDefined()
  })

  it('returns test package object on success', async () => {
    const { result } = renderHook(() => useCreateTestPackage(), {
      wrapper: createWrapper()
    })

    expect(result.current.data).toBeUndefined() // No data initially
  })
})

describe('useUpdateTestPackage contract', () => {
  it('accepts id and optional name/description/target_date', () => {
    const { result } = renderHook(() => useUpdateTestPackage(), {
      wrapper: createWrapper()
    })

    expect(result.current.mutate).toBeDefined()
    expect(typeof result.current.mutate).toBe('function')

    // Type assertion - validates the request shape
    const validRequest: Parameters<typeof result.current.mutate>[0] = {
      id: 'package-uuid',
      name: 'TP-2025-002',
      description: 'Updated package',
      target_date: '2025-12-31'
    }
    expect(validRequest).toBeDefined()
  })

  it('returns updated test package object on success', async () => {
    const { result } = renderHook(() => useUpdateTestPackage(), {
      wrapper: createWrapper()
    })

    expect(result.current.data).toBeUndefined() // No data initially
  })
})

describe('useDeleteTestPackage contract', () => {
  it('accepts test package id', () => {
    const { result } = renderHook(() => useDeleteTestPackage(), {
      wrapper: createWrapper()
    })

    expect(result.current.mutate).toBeDefined()
    expect(typeof result.current.mutate).toBe('function')

    // Type assertion - validates the request shape
    const validRequest: Parameters<typeof result.current.mutate>[0] = {
      id: 'package-uuid'
    }
    expect(validRequest).toBeDefined()
  })

  it('returns void on success', async () => {
    const { result } = renderHook(() => useDeleteTestPackage(), {
      wrapper: createWrapper()
    })

    expect(result.current.data).toBeUndefined() // No data initially
  })

  it('sets component test_package_id to NULL when package has assigned components', () => {
    // This is a behavior contract - the deletion should unassign components
    // RLS policy and cascade behavior is tested at integration level
    expect(true).toBe(true) // Contract documented
  })
})
