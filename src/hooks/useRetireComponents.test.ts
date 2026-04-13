/**
 * Test Suite: useRetireComponents Hook
 *
 * Tests for retiring (soft-deleting) components via RPC.
 * Covers happy path, error handling, toast notifications,
 * and query invalidation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { useRetireComponents } from './useRetireComponents'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

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

describe('useRetireComponents hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Successful Retirement', () => {
    it('calls supabase.rpc with correct params for a single component', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: null
      })

      const { result } = renderHook(() => useRetireComponents(), {
        wrapper: createWrapper()
      })

      result.current.mutate({
        component_ids: ['comp-uuid-1'],
        user_id: 'user-uuid'
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(supabase.rpc).toHaveBeenCalledWith('retire_components', {
        p_component_ids: ['comp-uuid-1'],
        p_user_id: 'user-uuid',
        p_reason: undefined
      })
    })

    it('calls supabase.rpc with correct params for multiple components', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: null
      })

      const { result } = renderHook(() => useRetireComponents(), {
        wrapper: createWrapper()
      })

      result.current.mutate({
        component_ids: ['comp-uuid-1', 'comp-uuid-2', 'comp-uuid-3'],
        user_id: 'user-uuid',
        reason: 'Imported by mistake'
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(supabase.rpc).toHaveBeenCalledWith('retire_components', {
        p_component_ids: ['comp-uuid-1', 'comp-uuid-2', 'comp-uuid-3'],
        p_user_id: 'user-uuid',
        p_reason: 'Imported by mistake'
      })
    })

    it('shows success toast with correct count for single component', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: null
      })

      const { result } = renderHook(() => useRetireComponents(), {
        wrapper: createWrapper()
      })

      result.current.mutate({
        component_ids: ['comp-uuid-1'],
        user_id: 'user-uuid'
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(toast.success).toHaveBeenCalledWith('1 component(s) deleted')
    })

    it('shows success toast with correct count for multiple components', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: null
      })

      const { result } = renderHook(() => useRetireComponents(), {
        wrapper: createWrapper()
      })

      result.current.mutate({
        component_ids: ['comp-uuid-1', 'comp-uuid-2', 'comp-uuid-3'],
        user_id: 'user-uuid'
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(toast.success).toHaveBeenCalledWith('3 component(s) deleted')
    })
  })

  describe('Error Handling', () => {
    it('throws and shows error toast on RPC failure', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Access denied', code: '42501' }
      })

      const { result } = renderHook(() => useRetireComponents(), {
        wrapper: createWrapper()
      })

      result.current.mutate({
        component_ids: ['comp-uuid-1'],
        user_id: 'viewer-uuid'
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error?.message).toContain('Access denied')
      expect(toast.error).toHaveBeenCalledWith(
        'Failed to delete component(s): Access denied'
      )
    })

    it('does not show success toast on error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Some error', code: 'P0001' }
      })

      const { result } = renderHook(() => useRetireComponents(), {
        wrapper: createWrapper()
      })

      result.current.mutate({
        component_ids: ['comp-uuid-1'],
        user_id: 'user-uuid'
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(toast.success).not.toHaveBeenCalled()
    })
  })

  describe('Query Invalidation', () => {
    it('invalidates all related queries on success', async () => {
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
        error: null
      })

      const { result } = renderHook(() => useRetireComponents(), {
        wrapper
      })

      result.current.mutate({
        component_ids: ['comp-uuid-1', 'comp-uuid-2'],
        user_id: 'user-uuid'
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(invalidateQueriesSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['components'] })
      )
      expect(invalidateQueriesSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['drawing-progress'] })
      )
      expect(invalidateQueriesSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['drawings-with-progress'] })
      )
      expect(invalidateQueriesSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['package-readiness'] })
      )
      expect(invalidateQueriesSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['manhour-progress'] })
      )
    })
  })
})
