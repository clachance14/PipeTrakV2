/**
 * Test Suite: useUpdateWeldSpecs Hook
 *
 * Tests for updating weld specification fields (type, size, schedule, base_metal, spec)
 * Uses RPC (update_field_weld_specs) for audit logging.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { useUpdateWeldSpecs } from './useUpdateWeldSpecs'
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

describe('useUpdateWeldSpecs hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Successful Update', () => {
    it('updates weld specs via RPC', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: { success: true },
        error: null
      })

      const { result } = renderHook(() => useUpdateWeldSpecs(), {
        wrapper: createWrapper()
      })

      result.current.mutate({
        field_weld_id: 'field-weld-uuid',
        weld_type: 'SW',
        weld_size: '4"',
        schedule: '40',
        base_metal: 'CS',
        spec: 'A106-B',
        user_id: 'user-uuid'
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(supabase.rpc).toHaveBeenCalledWith('update_field_weld_specs', {
        p_field_weld_id: 'field-weld-uuid',
        p_weld_type: 'SW',
        p_weld_size: '4"',
        p_schedule: '40',
        p_base_metal: 'CS',
        p_spec: 'A106-B',
        p_user_id: 'user-uuid'
      })
    })

    it('passes null for optional fields', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: { success: true },
        error: null
      })

      const { result } = renderHook(() => useUpdateWeldSpecs(), {
        wrapper: createWrapper()
      })

      result.current.mutate({
        field_weld_id: 'field-weld-uuid',
        weld_type: 'BW',
        weld_size: '2"',
        schedule: null,
        base_metal: null,
        spec: null,
        user_id: 'user-uuid'
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(supabase.rpc).toHaveBeenCalledWith('update_field_weld_specs', {
        p_field_weld_id: 'field-weld-uuid',
        p_weld_type: 'BW',
        p_weld_size: '2"',
        p_schedule: '',
        p_base_metal: '',
        p_spec: '',
        p_user_id: 'user-uuid'
      })
    })
  })

  describe('Error Handling', () => {
    it('handles RPC error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Field weld not found', code: 'PGRST116' }
      })

      const { result } = renderHook(() => useUpdateWeldSpecs(), {
        wrapper: createWrapper()
      })

      result.current.mutate({
        field_weld_id: 'non-existent-uuid',
        weld_type: 'BW',
        weld_size: '2"',
        schedule: null,
        base_metal: null,
        spec: null,
        user_id: 'user-uuid'
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error?.message).toContain('Failed to update weld specifications')
    })

    it('handles access denied error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Access denied: user does not have permission', code: '42501' }
      })

      const { result } = renderHook(() => useUpdateWeldSpecs(), {
        wrapper: createWrapper()
      })

      result.current.mutate({
        field_weld_id: 'inaccessible-uuid',
        weld_type: 'BW',
        weld_size: '2"',
        schedule: null,
        base_metal: null,
        spec: null,
        user_id: 'user-uuid'
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

      const { result } = renderHook(() => useUpdateWeldSpecs(), {
        wrapper
      })

      result.current.mutate({
        field_weld_id: 'weld-uuid',
        weld_type: 'FW',
        weld_size: '6"',
        schedule: '80',
        base_metal: 'SS',
        spec: 'A312-TP304',
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
    })
  })
})
