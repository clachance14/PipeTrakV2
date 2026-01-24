/**
 * Test Suite: useUpdateWelderAssignment Hook
 *
 * Tests for updating welder assignment on existing field welds
 * without affecting milestone state.
 * Uses RPC (update_weld_assignment) for audit logging.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { useUpdateWelderAssignment } from './useUpdateWelderAssignment'
import { supabase } from '@/lib/supabase'

// Mock Supabase client with RPC
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn()
  }
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
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

describe('useUpdateWelderAssignment hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Successful Update', () => {
    it('updates welder assignment via RPC', async () => {
      // Arrange: Mock successful RPC response
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: { success: true },
        error: null
      })

      // Act: Render hook and trigger mutation
      const { result } = renderHook(() => useUpdateWelderAssignment(), {
        wrapper: createWrapper()
      })

      const payload = {
        field_weld_id: 'field-weld-uuid',
        welder_id: 'new-welder-uuid',
        date_welded: '2025-01-20',
        user_id: 'user-uuid'
      }

      result.current.mutate(payload)

      // Assert: Mutation succeeds
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(supabase.rpc).toHaveBeenCalledWith('update_weld_assignment', {
        p_field_weld_id: 'field-weld-uuid',
        p_welder_id: 'new-welder-uuid',
        p_date_welded: '2025-01-20',
        p_user_id: 'user-uuid'
      })

      // Verify returned data
      expect(result.current.data).toEqual({
        id: 'field-weld-uuid',
        welder_id: 'new-welder-uuid',
        date_welded: '2025-01-20'
      })
    })

    it('passes correct parameters to RPC', async () => {
      // Arrange
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: { success: true },
        error: null
      })

      // Act
      const { result } = renderHook(() => useUpdateWelderAssignment(), {
        wrapper: createWrapper()
      })

      result.current.mutate({
        field_weld_id: 'field-weld-uuid',
        welder_id: 'corrected-welder-uuid',
        date_welded: '2025-01-18',
        user_id: 'auth-user-uuid'
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Assert: RPC called with correct parameters
      expect(supabase.rpc).toHaveBeenCalledWith('update_weld_assignment', {
        p_field_weld_id: 'field-weld-uuid',
        p_welder_id: 'corrected-welder-uuid',
        p_date_welded: '2025-01-18',
        p_user_id: 'auth-user-uuid'
      })
    })
  })

  describe('Error Handling', () => {
    it('handles RPC error', async () => {
      // Arrange: Mock error response
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Field weld not found', code: 'PGRST116' }
      })

      // Act
      const { result } = renderHook(() => useUpdateWelderAssignment(), {
        wrapper: createWrapper()
      })

      result.current.mutate({
        field_weld_id: 'non-existent-uuid',
        welder_id: 'welder-uuid',
        date_welded: '2025-01-20',
        user_id: 'user-uuid'
      })

      // Assert: Error state is set
      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error?.message).toContain('Failed to update welder assignment')
    })

    it('handles access denied error', async () => {
      // Arrange: Mock permission error
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Access denied: user does not have permission', code: '42501' }
      })

      // Act
      const { result } = renderHook(() => useUpdateWelderAssignment(), {
        wrapper: createWrapper()
      })

      result.current.mutate({
        field_weld_id: 'inaccessible-uuid',
        welder_id: 'welder-uuid',
        date_welded: '2025-01-20',
        user_id: 'user-uuid'
      })

      // Assert: Error about access denied
      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error?.message).toContain('Access denied')
    })
  })

  describe('Query Invalidation', () => {
    it('invalidates field-weld, field-welds, and related queries on success', async () => {
      // Arrange
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false }
        }
      })

      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children)

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: { success: true },
        error: null
      })

      // Act
      const { result } = renderHook(() => useUpdateWelderAssignment(), {
        wrapper
      })

      result.current.mutate({
        field_weld_id: 'weld-uuid',
        welder_id: 'welder-uuid',
        date_welded: '2025-01-20',
        user_id: 'user-uuid'
      })

      // Assert: All related query keys are invalidated
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(invalidateQueriesSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['field-weld'] })
      )
      expect(invalidateQueriesSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['field-welds'] })
      )
      expect(invalidateQueriesSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['components'] })
      )
      expect(invalidateQueriesSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['drawings-with-progress'] })
      )
      expect(invalidateQueriesSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['package-readiness'] })
      )
    })
  })

  describe('Optimistic Updates', () => {
    it('optimistically updates welder data in cache', async () => {
      // Arrange
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false }
        }
      })

      // Pre-populate cache with existing field weld data
      queryClient.setQueryData(['field-weld', 'weld-uuid'], {
        id: 'weld-uuid',
        welder_id: 'old-welder-uuid',
        date_welded: '2025-01-15'
      })

      const setQueriesDataSpy = vi.spyOn(queryClient, 'setQueriesData')

      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children)

      // Create a delayed response to observe optimistic update
      vi.mocked(supabase.rpc).mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({
            data: { success: true },
            error: null
          }), 50)
        )
      )

      // Act
      const { result } = renderHook(() => useUpdateWelderAssignment(), {
        wrapper
      })

      result.current.mutate({
        field_weld_id: 'weld-uuid',
        welder_id: 'new-welder-uuid',
        date_welded: '2025-01-20',
        user_id: 'user-uuid'
      })

      // Assert: Optimistic update called
      await waitFor(() => {
        expect(setQueriesDataSpy).toHaveBeenCalled()
      })

      // Wait for success
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })
    })
  })
})
