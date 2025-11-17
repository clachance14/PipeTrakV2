/**
 * Test Suite: useCreateUnplannedWeld Hook (T016-T018)
 *
 * Feature: 028-add-unplanned-welds
 * Date: 2025-11-17
 *
 * Tests for creating unplanned field welds with TanStack Query mutation,
 * RPC call handling, and cache invalidation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { useCreateUnplannedWeld } from './useCreateUnplannedWeld'
import { supabase } from '@/lib/supabase'

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn()
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

describe('useCreateUnplannedWeld hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('T016: Successful Mutation', () => {
    it('creates unplanned weld via RPC and returns field_weld and component', async () => {
      // Arrange: Mock successful RPC response
      const mockResponse = {
        field_weld: {
          id: 'weld-uuid-1',
          component_id: 'comp-uuid-1',
          project_id: 'project-uuid',
          weld_type: 'BW',
          weld_size: '2"',
          spec: 'HC05',
          schedule: null,
          base_metal: null,
          notes: null,
          status: 'active',
          created_by: 'user-uuid',
          created_at: '2025-11-17T10:00:00Z'
        },
        component: {
          id: 'comp-uuid-1',
          project_id: 'project-uuid',
          drawing_id: 'drawing-uuid',
          component_type: 'field_weld',
          identity_key: { weld_number: 'W-051' },
          area_id: 'area-uuid',
          system_id: 'system-uuid',
          test_package_id: null,
          percent_complete: 0,
          created_by: 'user-uuid'
        }
      }

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockResponse,
        error: null
      } as any)

      // Act: Render hook and trigger mutation
      const { result } = renderHook(() => useCreateUnplannedWeld(), {
        wrapper: createWrapper()
      })

      const params = {
        projectId: 'project-uuid',
        drawingId: 'drawing-uuid',
        weldNumber: 'W-051',
        weldType: 'BW' as const,
        weldSize: '2"',
        spec: 'HC05'
      }

      result.current.mutate(params)

      // Assert: Mutation succeeds and returns correct data
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(supabase.rpc).toHaveBeenCalledWith('create_unplanned_weld', {
        p_project_id: 'project-uuid',
        p_drawing_id: 'drawing-uuid',
        p_weld_number: 'W-051',
        p_weld_type: 'BW',
        p_weld_size: '2"',
        p_spec: 'HC05',
        p_schedule: undefined,
        p_base_metal: undefined,
        p_notes: undefined
      })

      expect(result.current.data).toEqual(mockResponse)
      expect(result.current.data?.field_weld.id).toBe('weld-uuid-1')
      expect(result.current.data?.component.id).toBe('comp-uuid-1')
    })

    it('creates unplanned weld with optional fields (schedule, base_metal, notes)', async () => {
      // Arrange: Mock successful RPC response with optional fields
      const mockResponse = {
        field_weld: {
          id: 'weld-uuid-2',
          component_id: 'comp-uuid-2',
          project_id: 'project-uuid',
          weld_type: 'SW',
          weld_size: '1"',
          spec: 'HC05',
          schedule: 'XS',
          base_metal: 'CS',
          notes: 'Field change per client request',
          status: 'active',
          created_by: 'user-uuid',
          created_at: '2025-11-17T10:00:00Z'
        },
        component: {
          id: 'comp-uuid-2',
          project_id: 'project-uuid',
          drawing_id: 'drawing-uuid',
          component_type: 'field_weld',
          identity_key: { weld_number: 'W-052' },
          area_id: 'area-uuid',
          system_id: 'system-uuid',
          test_package_id: 'test-pkg-uuid',
          percent_complete: 0,
          created_by: 'user-uuid'
        }
      }

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockResponse,
        error: null
      } as any)

      // Act: Render hook and trigger mutation with optional fields
      const { result } = renderHook(() => useCreateUnplannedWeld(), {
        wrapper: createWrapper()
      })

      const params = {
        projectId: 'project-uuid',
        drawingId: 'drawing-uuid',
        weldNumber: 'W-052',
        weldType: 'SW' as const,
        weldSize: '1"',
        spec: 'HC05',
        schedule: 'XS',
        baseMetal: 'CS',
        notes: 'Field change per client request'
      }

      result.current.mutate(params)

      // Assert: Mutation includes optional parameters
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(supabase.rpc).toHaveBeenCalledWith('create_unplanned_weld', {
        p_project_id: 'project-uuid',
        p_drawing_id: 'drawing-uuid',
        p_weld_number: 'W-052',
        p_weld_type: 'SW',
        p_weld_size: '1"',
        p_spec: 'HC05',
        p_schedule: 'XS',
        p_base_metal: 'CS',
        p_notes: 'Field change per client request'
      })

      expect(result.current.data?.field_weld.schedule).toBe('XS')
      expect(result.current.data?.field_weld.base_metal).toBe('CS')
      expect(result.current.data?.field_weld.notes).toBe('Field change per client request')
    })
  })

  describe('T017: Loading and Error States', () => {
    it('shows loading state during mutation', async () => {
      // Arrange: Mock RPC with delayed response
      vi.mocked(supabase.rpc).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ data: null, error: null }), 100))
      )

      // Act: Render hook and trigger mutation
      const { result } = renderHook(() => useCreateUnplannedWeld(), {
        wrapper: createWrapper()
      })

      const params = {
        projectId: 'project-uuid',
        drawingId: 'drawing-uuid',
        weldNumber: 'W-053',
        weldType: 'FW' as const,
        weldSize: '1/2"',
        spec: 'HC05'
      }

      result.current.mutate(params)

      // Assert: Loading state is true during mutation
      await waitFor(() => {
        expect(result.current.isPending).toBe(true)
      })

      // Wait for completion
      await waitFor(() => {
        expect(result.current.isPending).toBe(false)
      })
    })

    it('handles RPC error and sets error state', async () => {
      // Arrange: Mock RPC error
      const mockError = {
        message: 'Duplicate weld number: W-054 already exists in project',
        code: '23505'
      }

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: mockError
      } as any)

      // Act: Render hook and trigger mutation
      const { result } = renderHook(() => useCreateUnplannedWeld(), {
        wrapper: createWrapper()
      })

      const params = {
        projectId: 'project-uuid',
        drawingId: 'drawing-uuid',
        weldNumber: 'W-054',
        weldType: 'TW' as const,
        weldSize: '3"',
        spec: 'HC05'
      }

      result.current.mutate(params)

      // Assert: Error state is set
      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeTruthy()
      expect(result.current.data).toBeUndefined()
    })

    it('handles network error and sets error state', async () => {
      // Arrange: Mock network error
      vi.mocked(supabase.rpc).mockRejectedValue(new Error('Network error'))

      // Act: Render hook and trigger mutation
      const { result } = renderHook(() => useCreateUnplannedWeld(), {
        wrapper: createWrapper()
      })

      const params = {
        projectId: 'project-uuid',
        drawingId: 'drawing-uuid',
        weldNumber: 'W-055',
        weldType: 'BW' as const,
        weldSize: '4"',
        spec: 'HC05'
      }

      result.current.mutate(params)

      // Assert: Error state is set for network failure
      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeInstanceOf(Error)
    })
  })

  describe('T018: Query Invalidation', () => {
    it('invalidates field-welds queries on successful creation', async () => {
      // Arrange: Create QueryClient with spy
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false }
        }
      })

      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children)

      const mockResponse = {
        field_weld: { id: 'weld-uuid-1', component_id: 'comp-uuid-1' },
        component: { id: 'comp-uuid-1', project_id: 'project-uuid' }
      }

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockResponse,
        error: null
      } as any)

      // Act: Render hook and trigger mutation
      const { result } = renderHook(() => useCreateUnplannedWeld(), {
        wrapper
      })

      const params = {
        projectId: 'project-uuid',
        drawingId: 'drawing-uuid',
        weldNumber: 'W-056',
        weldType: 'BW' as const,
        weldSize: '2"',
        spec: 'HC05'
      }

      result.current.mutate(params)

      // Assert: Queries are invalidated on success
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(invalidateQueriesSpy).toHaveBeenCalled()
      // Check that field-welds query key was invalidated
      expect(invalidateQueriesSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: expect.arrayContaining(['field-welds']) })
      )
    })

    it('does NOT invalidate queries on error', async () => {
      // Arrange: Create QueryClient with spy
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false }
        }
      })

      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children)

      const mockError = {
        message: 'Permission denied',
        code: '42501'
      }

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: mockError
      } as any)

      // Act: Render hook and trigger mutation
      const { result } = renderHook(() => useCreateUnplannedWeld(), {
        wrapper
      })

      const params = {
        projectId: 'project-uuid',
        drawingId: 'drawing-uuid',
        weldNumber: 'W-057',
        weldType: 'SW' as const,
        weldSize: '1"',
        spec: 'HC05'
      }

      result.current.mutate(params)

      // Assert: Queries are NOT invalidated on error
      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(invalidateQueriesSpy).not.toHaveBeenCalled()
    })
  })
})
