/**
 * Test Suite: useUpdateComponentIdentity Hook
 *
 * Tests for updating identity_key and attribute fields on a component
 * and its siblings via RPC.
 * Covers happy path, error handling, toast notifications, and query invalidation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { useUpdateComponentIdentity } from './useUpdateComponentIdentity'
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

describe('useUpdateComponentIdentity hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Successful Update', () => {
    it('calls supabase.rpc with correct params', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: { success: true },
        error: null
      })

      const { result } = renderHook(() => useUpdateComponentIdentity(), {
        wrapper: createWrapper()
      })

      result.current.mutate({
        component_id: 'component-uuid',
        identity_changes: { tag_number: 'FV-1001' },
        attribute_changes: { size: '2"' },
        user_id: 'user-uuid'
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(supabase.rpc).toHaveBeenCalledWith('update_component_identity', {
        p_component_id: 'component-uuid',
        p_identity_changes: { tag_number: 'FV-1001' },
        p_attribute_changes: { size: '2"' },
        p_user_id: 'user-uuid'
      })
    })

    it('shows success toast on successful update', async () => {
      const { toast } = await import('sonner')

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: { success: true },
        error: null
      })

      const { result } = renderHook(() => useUpdateComponentIdentity(), {
        wrapper: createWrapper()
      })

      result.current.mutate({
        component_id: 'component-uuid',
        identity_changes: {},
        attribute_changes: { size: '4"' },
        user_id: 'user-uuid'
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(toast.success).toHaveBeenCalledWith('Component updated successfully')
    })
  })

  describe('Error Handling', () => {
    it('throws and shows error toast when RPC returns error', async () => {
      const { toast } = await import('sonner')

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Component not found', code: 'P0002' }
      })

      const { result } = renderHook(() => useUpdateComponentIdentity(), {
        wrapper: createWrapper()
      })

      result.current.mutate({
        component_id: 'nonexistent-uuid',
        identity_changes: {},
        attribute_changes: {},
        user_id: 'user-uuid'
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error?.message).toContain('Component not found')
      expect(toast.error).toHaveBeenCalledWith(
        'Failed to update component: Component not found'
      )
    })

    it('handles access denied error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Access denied: insufficient permissions', code: '42501' }
      })

      const { result } = renderHook(() => useUpdateComponentIdentity(), {
        wrapper: createWrapper()
      })

      result.current.mutate({
        component_id: 'component-uuid',
        identity_changes: { tag_number: 'FV-1002' },
        attribute_changes: {},
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

      const { result } = renderHook(() => useUpdateComponentIdentity(), {
        wrapper
      })

      result.current.mutate({
        component_id: 'component-uuid',
        identity_changes: { tag_number: 'FV-1001' },
        attribute_changes: {},
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
