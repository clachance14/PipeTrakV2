/**
 * Contract tests for useUpdateProjectTemplates hook (Feature 026 - User Story 2)
 * These tests define the API contract for updating project template weights
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useUpdateProjectTemplates } from './useUpdateProjectTemplates'
import { createElement, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
  },
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

describe('useUpdateProjectTemplates contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('accepts project_id, component_type, weights array, apply_to_existing flag, and last_updated timestamp', () => {
    const { result } = renderHook(() => useUpdateProjectTemplates('project-123'), {
      wrapper: createWrapper()
    })

    expect(result.current.mutate).toBeDefined()
    expect(typeof result.current.mutate).toBe('function')

    // Type assertion - validates the request shape
    const validRequest: Parameters<typeof result.current.mutate>[0] = {
      componentType: 'Field Weld',
      weights: [
        { milestone_name: 'Fit-Up', weight: 10 },
        { milestone_name: 'Weld Made', weight: 70 },
        { milestone_name: 'Punch', weight: 10 },
        { milestone_name: 'Test', weight: 5 },
        { milestone_name: 'Restore', weight: 5 }
      ],
      applyToExisting: false,
      lastUpdated: '2025-11-10T10:00:00Z'
    }
    expect(validRequest).toBeDefined()
  })

  it('calls update_project_template_weights RPC with correct parameters', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: {
        success: true,
        affected_count: 0,
        audit_id: 'audit-uuid'
      },
      error: null
    })
    vi.mocked(supabase.rpc).mockImplementation(mockRpc)

    const { result } = renderHook(() => useUpdateProjectTemplates('project-123'), {
      wrapper: createWrapper()
    })

    const weights = [
      { milestone_name: 'Fit-Up', weight: 10 },
      { milestone_name: 'Weld Made', weight: 70 },
      { milestone_name: 'Punch', weight: 10 },
      { milestone_name: 'Test', weight: 5 },
      { milestone_name: 'Restore', weight: 5 }
    ]

    result.current.mutate({
      componentType: 'Field Weld',
      weights,
      applyToExisting: false,
      lastUpdated: '2025-11-10T10:00:00Z'
    })

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('update_project_template_weights', {
        p_project_id: 'project-123',
        p_component_type: 'Field Weld',
        p_new_weights: weights,
        p_apply_to_existing: false,
        p_last_updated: '2025-11-10T10:00:00Z'
      })
    })
  })

  it('validates that weights sum to 100 before calling RPC', async () => {
    const { result } = renderHook(() => useUpdateProjectTemplates('project-123'), {
      wrapper: createWrapper()
    })

    const invalidWeights = [
      { milestone_name: 'Fit-Up', weight: 10 },
      { milestone_name: 'Weld Made', weight: 60 },
      { milestone_name: 'Punch', weight: 10 },
      { milestone_name: 'Test', weight: 15 },
      { milestone_name: 'Restore', weight: 10 } // Total = 105, not 100
    ]

    result.current.mutate({
      componentType: 'Field Weld',
      weights: invalidWeights,
      applyToExisting: false,
      lastUpdated: '2025-11-10T10:00:00Z'
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
      expect(result.current.error?.message).toContain('sum to exactly 100')
    })

    // Should NOT call RPC if validation fails
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('returns affected_count and audit_id on success', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: {
        success: true,
        affected_count: 42,
        audit_id: 'audit-uuid-123'
      },
      error: null
    })
    vi.mocked(supabase.rpc).mockImplementation(mockRpc)

    const { result } = renderHook(() => useUpdateProjectTemplates('project-123'), {
      wrapper: createWrapper()
    })

    const weights = [
      { milestone_name: 'Fit-Up', weight: 10 },
      { milestone_name: 'Weld Made', weight: 70 },
      { milestone_name: 'Punch', weight: 10 },
      { milestone_name: 'Test', weight: 5 },
      { milestone_name: 'Restore', weight: 5 }
    ]

    result.current.mutate({
      componentType: 'Field Weld',
      weights,
      applyToExisting: true,
      lastUpdated: '2025-11-10T10:00:00Z'
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
      expect(result.current.data).toEqual({
        success: true,
        affected_count: 42,
        audit_id: 'audit-uuid-123'
      })
    })
  })

  it('throws error when concurrent edit detected (optimistic locking)', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: null,
      error: {
        message: 'Templates have been modified by another user. Please reload and try again.',
        code: 'CONCURRENT_EDIT'
      }
    })
    vi.mocked(supabase.rpc).mockImplementation(mockRpc)

    const { result } = renderHook(() => useUpdateProjectTemplates('project-123'), {
      wrapper: createWrapper()
    })

    const weights = [
      { milestone_name: 'Fit-Up', weight: 10 },
      { milestone_name: 'Weld Made', weight: 70 },
      { milestone_name: 'Punch', weight: 10 },
      { milestone_name: 'Test', weight: 5 },
      { milestone_name: 'Restore', weight: 5 }
    ]

    result.current.mutate({
      componentType: 'Field Weld',
      weights,
      applyToExisting: false,
      lastUpdated: '2025-11-10T09:00:00Z' // Old timestamp
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
      expect(result.current.error?.message).toContain('modified by another user')
    })
  })

  it('invalidates projectTemplates query on successful update', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: {
        success: true,
        affected_count: 0,
        audit_id: 'audit-uuid'
      },
      error: null
    })
    vi.mocked(supabase.rpc).mockImplementation(mockRpc)

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })

    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children)

    const { result } = renderHook(() => useUpdateProjectTemplates('project-123'), {
      wrapper
    })

    const weights = [
      { milestone_name: 'Fit-Up', weight: 10 },
      { milestone_name: 'Weld Made', weight: 70 },
      { milestone_name: 'Punch', weight: 10 },
      { milestone_name: 'Test', weight: 5 },
      { milestone_name: 'Restore', weight: 5 }
    ]

    result.current.mutate({
      componentType: 'Field Weld',
      weights,
      applyToExisting: false,
      lastUpdated: '2025-11-10T10:00:00Z'
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['projectTemplates', 'project-123']
    })
  })

  it('validates individual weight range (0-100)', async () => {
    const { result } = renderHook(() => useUpdateProjectTemplates('project-123'), {
      wrapper: createWrapper()
    })

    const invalidWeights = [
      { milestone_name: 'Fit-Up', weight: -10 }, // Invalid: negative
      { milestone_name: 'Weld Made', weight: 110 }, // Invalid: >100
    ]

    result.current.mutate({
      componentType: 'Field Weld',
      weights: invalidWeights,
      applyToExisting: false,
      lastUpdated: '2025-11-10T10:00:00Z'
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
      expect(result.current.error?.message).toContain('0 and 100')
    })

    // Should NOT call RPC if validation fails
    expect(supabase.rpc).not.toHaveBeenCalled()
  })
})
