/**
 * Test Suite: useCreateManualComponent Hook
 *
 * Tests for creating a manual component on a drawing via RPC.
 * Covers happy path, error handling, toast notifications,
 * and query invalidation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { useCreateManualComponent } from './useCreateManualComponent'
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

describe('useCreateManualComponent hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Successful Creation', () => {
    it('calls supabase.rpc with correct params', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: { components_created: 1 },
        error: null
      })

      const { result } = renderHook(() => useCreateManualComponent(), {
        wrapper: createWrapper()
      })

      result.current.mutate({
        drawing_id: 'drawing-uuid',
        project_id: 'project-uuid',
        component_type: 'valve',
        identity: { drawing_norm: 'P-001', commodity_code: 'VBALU', size: '2', seq: 1 },
        attributes: { spec: 'A5A' },
        user_id: 'user-uuid'
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(supabase.rpc).toHaveBeenCalledWith('create_manual_component', {
        p_drawing_id: 'drawing-uuid',
        p_project_id: 'project-uuid',
        p_component_type: 'valve',
        p_identity: { drawing_norm: 'P-001', commodity_code: 'VBALU', size: '2', seq: 1 },
        p_attributes: { spec: 'A5A' },
        p_user_id: 'user-uuid'
      })
    })

    it('shows success toast with component count', async () => {
      const { toast } = await import('sonner')

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: { components_created: 3 },
        error: null
      })

      const { result } = renderHook(() => useCreateManualComponent(), {
        wrapper: createWrapper()
      })

      result.current.mutate({
        drawing_id: 'drawing-uuid',
        project_id: 'project-uuid',
        component_type: 'support',
        identity: { drawing_norm: 'P-001', commodity_code: 'HGRSPT', size: '2', seq: 1 },
        attributes: {},
        user_id: 'user-uuid'
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(toast.success).toHaveBeenCalledWith('3 component(s) created')
    })

    it('shows success toast with fallback count of 1 when data has no components_created', async () => {
      const { toast } = await import('sonner')

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: null
      })

      const { result } = renderHook(() => useCreateManualComponent(), {
        wrapper: createWrapper()
      })

      result.current.mutate({
        drawing_id: 'drawing-uuid',
        project_id: 'project-uuid',
        component_type: 'flange',
        identity: { drawing_norm: 'P-001', commodity_code: 'FLANR', size: '2', seq: 1 },
        attributes: {},
        user_id: 'user-uuid'
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(toast.success).toHaveBeenCalledWith('1 component(s) created')
    })
  })

  describe('Error Handling', () => {
    it('throws and shows error toast on RPC error', async () => {
      const { toast } = await import('sonner')

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Drawing not found', code: 'P0001' }
      })

      const { result } = renderHook(() => useCreateManualComponent(), {
        wrapper: createWrapper()
      })

      result.current.mutate({
        drawing_id: 'bad-drawing-uuid',
        project_id: 'project-uuid',
        component_type: 'valve',
        identity: { drawing_norm: 'P-001', commodity_code: 'VBALU', size: '2', seq: 1 },
        attributes: {},
        user_id: 'user-uuid'
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error?.message).toContain('Drawing not found')
      expect(toast.error).toHaveBeenCalledWith(
        'Failed to create component: Drawing not found'
      )
    })

    it('handles access denied error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Access denied: insufficient permissions', code: '42501' }
      })

      const { result } = renderHook(() => useCreateManualComponent(), {
        wrapper: createWrapper()
      })

      result.current.mutate({
        drawing_id: 'drawing-uuid',
        project_id: 'project-uuid',
        component_type: 'valve',
        identity: { drawing_norm: 'P-001', commodity_code: 'VBALU', size: '2', seq: 1 },
        attributes: {},
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
        data: { components_created: 1 },
        error: null
      })

      const { result } = renderHook(() => useCreateManualComponent(), {
        wrapper
      })

      result.current.mutate({
        drawing_id: 'drawing-uuid',
        project_id: 'project-uuid',
        component_type: 'fitting',
        identity: { drawing_norm: 'P-001', commodity_code: 'ELBOW', size: '2', seq: 1 },
        attributes: {},
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
