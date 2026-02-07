/**
 * Test Suite: useReassignWeldDrawing Hook
 *
 * Tests for reassigning a field weld to a different drawing.
 * Uses RPC (reassign_field_weld_drawing) with audit logging.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { useReassignWeldDrawing } from './useReassignWeldDrawing'
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

describe('useReassignWeldDrawing hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Successful Reassignment', () => {
    it('reassigns weld drawing via RPC', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: { success: true },
        error: null
      })

      const { result } = renderHook(() => useReassignWeldDrawing(), {
        wrapper: createWrapper()
      })

      result.current.mutate({
        field_weld_id: 'field-weld-uuid',
        new_drawing_id: 'new-drawing-uuid',
        user_id: 'user-uuid'
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(supabase.rpc).toHaveBeenCalledWith('reassign_field_weld_drawing', {
        p_field_weld_id: 'field-weld-uuid',
        p_new_drawing_id: 'new-drawing-uuid',
        p_user_id: 'user-uuid'
      })
    })
  })

  describe('Error Handling', () => {
    it('handles welder-already-assigned error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Cannot reassign drawing: a welder has already been assigned to this weld', code: 'P0001' }
      })

      const { result } = renderHook(() => useReassignWeldDrawing(), {
        wrapper: createWrapper()
      })

      result.current.mutate({
        field_weld_id: 'field-weld-uuid',
        new_drawing_id: 'new-drawing-uuid',
        user_id: 'user-uuid'
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error?.message).toContain('welder has already been assigned')
    })

    it('handles duplicate weld number error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Duplicate weld number: weld FW-001 already exists on drawing DWG-100', code: 'P0001' }
      })

      const { result } = renderHook(() => useReassignWeldDrawing(), {
        wrapper: createWrapper()
      })

      result.current.mutate({
        field_weld_id: 'field-weld-uuid',
        new_drawing_id: 'new-drawing-uuid',
        user_id: 'user-uuid'
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error?.message).toContain('Duplicate weld number')
    })

    it('handles access denied error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Access denied: user does not have permission', code: '42501' }
      })

      const { result } = renderHook(() => useReassignWeldDrawing(), {
        wrapper: createWrapper()
      })

      result.current.mutate({
        field_weld_id: 'inaccessible-uuid',
        new_drawing_id: 'new-drawing-uuid',
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

      const { result } = renderHook(() => useReassignWeldDrawing(), {
        wrapper
      })

      result.current.mutate({
        field_weld_id: 'weld-uuid',
        new_drawing_id: 'drawing-uuid',
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
