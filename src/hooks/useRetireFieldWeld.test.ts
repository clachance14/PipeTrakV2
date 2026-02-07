/**
 * Test Suite: useRetireFieldWeld Hook
 *
 * Tests for retiring (soft-deleting) a field weld via RPC.
 * Covers happy path, blocked retirement (repair exists), missing reason,
 * and query invalidation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { useRetireFieldWeld } from './useRetireFieldWeld'
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

describe('useRetireFieldWeld hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Successful Retirement', () => {
    it('retires a field weld via RPC', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: { success: true },
        error: null
      })

      const { result } = renderHook(() => useRetireFieldWeld(), {
        wrapper: createWrapper()
      })

      result.current.mutate({
        field_weld_id: 'field-weld-uuid',
        retire_reason: 'Weld was created in error during initial import',
        user_id: 'user-uuid'
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(supabase.rpc).toHaveBeenCalledWith('retire_field_weld', {
        p_field_weld_id: 'field-weld-uuid',
        p_retire_reason: 'Weld was created in error during initial import',
        p_user_id: 'user-uuid'
      })
    })
  })

  describe('Error Handling', () => {
    it('handles repair weld blocking retirement', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Cannot retire: repair welds exist for this weld', code: 'P0001' }
      })

      const { result } = renderHook(() => useRetireFieldWeld(), {
        wrapper: createWrapper()
      })

      result.current.mutate({
        field_weld_id: 'weld-with-repairs',
        retire_reason: 'This should be blocked because repair exists',
        user_id: 'user-uuid'
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error?.message).toContain('repair welds exist')
    })

    it('handles missing reason error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Retire reason must be at least 10 characters', code: 'P0001' }
      })

      const { result } = renderHook(() => useRetireFieldWeld(), {
        wrapper: createWrapper()
      })

      result.current.mutate({
        field_weld_id: 'field-weld-uuid',
        retire_reason: 'short',
        user_id: 'user-uuid'
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error?.message).toContain('at least 10 characters')
    })

    it('handles access denied error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Access denied: insufficient role to retire a field weld', code: '42501' }
      })

      const { result } = renderHook(() => useRetireFieldWeld(), {
        wrapper: createWrapper()
      })

      result.current.mutate({
        field_weld_id: 'field-weld-uuid',
        retire_reason: 'This should be blocked by permissions',
        user_id: 'viewer-uuid'
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error?.message).toContain('Access denied')
    })
  })

  describe('Query Invalidation', () => {
    it('invalidates related queries on success', async () => {
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

      const { result } = renderHook(() => useRetireFieldWeld(), {
        wrapper
      })

      result.current.mutate({
        field_weld_id: 'weld-uuid',
        retire_reason: 'Weld was incorrectly created during CSV import',
        user_id: 'user-uuid'
      })

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
      expect(invalidateQueriesSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['has-repair-weld'] })
      )
    })
  })
})
