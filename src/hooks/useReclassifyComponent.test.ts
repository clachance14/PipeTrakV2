/**
 * Test Suite: useReclassifyComponent Hook
 *
 * Tests for reclassifying a component to a different type via RPC.
 * Covers happy path, error handling, toast notifications,
 * and query invalidation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { useReclassifyComponent } from './useReclassifyComponent'
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

describe('useReclassifyComponent hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Successful Reclassification', () => {
    it('calls supabase.rpc with correct params', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: { success: true },
        error: null
      })

      const { result } = renderHook(() => useReclassifyComponent(), {
        wrapper: createWrapper()
      })

      result.current.mutate({
        component_id: 'component-uuid',
        new_type: 'valve',
        user_id: 'user-uuid'
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(supabase.rpc).toHaveBeenCalledWith('reclassify_component', {
        p_component_id: 'component-uuid',
        p_new_type: 'valve',
        p_user_id: 'user-uuid'
      })
    })

    it('shows success toast on successful reclassification', async () => {
      const { toast } = await import('sonner')

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: { success: true },
        error: null
      })

      const { result } = renderHook(() => useReclassifyComponent(), {
        wrapper: createWrapper()
      })

      result.current.mutate({
        component_id: 'component-uuid',
        new_type: 'flange',
        user_id: 'user-uuid'
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(toast.success).toHaveBeenCalledWith('Component reclassified successfully')
    })
  })

  describe('Error Handling', () => {
    it('throws when RPC returns an error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Component not found', code: 'P0001' }
      })

      const { result } = renderHook(() => useReclassifyComponent(), {
        wrapper: createWrapper()
      })

      result.current.mutate({
        component_id: 'nonexistent-uuid',
        new_type: 'valve',
        user_id: 'user-uuid'
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error?.message).toContain('Component not found')
    })

    it('shows error toast on failure', async () => {
      const { toast } = await import('sonner')

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Access denied', code: '42501' }
      })

      const { result } = renderHook(() => useReclassifyComponent(), {
        wrapper: createWrapper()
      })

      result.current.mutate({
        component_id: 'component-uuid',
        new_type: 'valve',
        user_id: 'viewer-uuid'
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(toast.error).toHaveBeenCalledWith(
        'Failed to reclassify component: Access denied'
      )
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

      const { result } = renderHook(() => useReclassifyComponent(), {
        wrapper
      })

      result.current.mutate({
        component_id: 'component-uuid',
        new_type: 'support',
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
