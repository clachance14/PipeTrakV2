/**
 * Test Suite: useClearWelderAssignment Hook
 *
 * Tests for clearing welder assignment from field welds
 * when rolling back the "Weld Complete" milestone or manually clearing.
 * Uses RPC (clear_weld_assignment) for audit logging.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { useClearWelderAssignment } from './useClearWelderAssignment'
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

describe('useClearWelderAssignment hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Successful Clear', () => {
    it('clears welder assignment via RPC', async () => {
      // Arrange: Mock successful RPC response
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: { success: true },
        error: null
      })

      // Act: Render hook and trigger mutation
      const { result } = renderHook(() => useClearWelderAssignment(), {
        wrapper: createWrapper()
      })

      result.current.mutate({
        field_weld_id: 'field-weld-uuid',
        user_id: 'user-uuid'
      })

      // Assert: Mutation succeeds
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(supabase.rpc).toHaveBeenCalledWith('clear_weld_assignment', {
        p_field_weld_id: 'field-weld-uuid',
        p_user_id: 'user-uuid',
        p_metadata: null
      })

      expect(result.current.data).toEqual({ success: true })
    })

    it('passes metadata with rollback reason to RPC', async () => {
      // Arrange
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: { success: true },
        error: null
      })

      // Act
      const { result } = renderHook(() => useClearWelderAssignment(), {
        wrapper: createWrapper()
      })

      result.current.mutate({
        field_weld_id: 'field-weld-uuid',
        user_id: 'user-uuid',
        metadata: {
          rollback_reason: 'incorrect_welder',
          rollback_reason_label: 'Incorrect welder assigned',
          rollback_details: 'Wrong stencil was selected'
        }
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Assert: RPC called with metadata
      expect(supabase.rpc).toHaveBeenCalledWith('clear_weld_assignment', {
        p_field_weld_id: 'field-weld-uuid',
        p_user_id: 'user-uuid',
        p_metadata: {
          rollback_reason: 'incorrect_welder',
          rollback_reason_label: 'Incorrect welder assigned',
          rollback_details: 'Wrong stencil was selected'
        }
      })
    })
  })

  describe('Error Handling', () => {
    it('handles RPC error', async () => {
      // Arrange
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Permission denied', code: '42501' }
      })

      // Act
      const { result } = renderHook(() => useClearWelderAssignment(), {
        wrapper: createWrapper()
      })

      result.current.mutate({
        field_weld_id: 'field-weld-uuid',
        user_id: 'user-uuid'
      })

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error?.message).toBe('Permission denied')
    })

    it('handles NDE exists error', async () => {
      // Arrange: Mock NDE block error
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Cannot clear assignment - NDE results exist. Clear NDE first.', code: 'P0001' }
      })

      // Act
      const { result } = renderHook(() => useClearWelderAssignment(), {
        wrapper: createWrapper()
      })

      result.current.mutate({
        field_weld_id: 'field-weld-uuid',
        user_id: 'user-uuid'
      })

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error?.message).toContain('NDE results exist')
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
      const { result } = renderHook(() => useClearWelderAssignment(), {
        wrapper
      })

      result.current.mutate({
        field_weld_id: 'weld-uuid',
        user_id: 'user-uuid'
      })

      // Assert
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

    it('does NOT invalidate queries on error', async () => {
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
        data: null,
        error: { message: 'Error', code: '42501' }
      })

      // Act
      const { result } = renderHook(() => useClearWelderAssignment(), {
        wrapper
      })

      result.current.mutate({
        field_weld_id: 'weld-uuid',
        user_id: 'user-uuid'
      })

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(invalidateQueriesSpy).not.toHaveBeenCalled()
    })
  })

  describe('Optimistic Updates', () => {
    it('optimistically clears welder data in cache', async () => {
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
        date_welded: '2025-01-15',
        welder: { stencil: 'ABC', name: 'John Doe' }
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
      const { result } = renderHook(() => useClearWelderAssignment(), {
        wrapper
      })

      result.current.mutate({
        field_weld_id: 'weld-uuid',
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

  describe('Toast Notifications', () => {
    it('shows success toast when metadata is provided (manual clear)', async () => {
      // Arrange
      const { toast } = await import('sonner')
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: { success: true },
        error: null
      })

      // Act
      const { result } = renderHook(() => useClearWelderAssignment(), {
        wrapper: createWrapper()
      })

      result.current.mutate({
        field_weld_id: 'weld-uuid',
        user_id: 'user-uuid',
        metadata: {
          rollback_reason: 'test',
          rollback_reason_label: 'Test Reason'
        }
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Assert: Success toast shown for manual clear
      expect(toast.success).toHaveBeenCalledWith('Welder assignment cleared')
    })

    it('does NOT show success toast without metadata (auto rollback)', async () => {
      // Arrange
      const { toast } = await import('sonner')
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: { success: true },
        error: null
      })

      // Act
      const { result } = renderHook(() => useClearWelderAssignment(), {
        wrapper: createWrapper()
      })

      result.current.mutate({
        field_weld_id: 'weld-uuid',
        user_id: 'user-uuid'
        // No metadata - simulates auto rollback
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Assert: No success toast for auto rollback
      expect(toast.success).not.toHaveBeenCalled()
    })
  })
})
