/**
 * Test Suite: useUpdateWelderAssignment Hook
 *
 * Tests for updating welder assignment on existing field welds
 * without affecting milestone state.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { useUpdateWelderAssignment } from './useUpdateWelderAssignment'
import { supabase } from '@/lib/supabase'

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            maybeSingle: vi.fn()
          }))
        }))
      }))
    }))
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
    it('updates welder assignment via Supabase update', async () => {
      // Arrange: Mock successful update response
      const mockResponse = {
        id: 'field-weld-uuid',
        component_id: 'comp-uuid',
        welder_id: 'new-welder-uuid',
        date_welded: '2025-01-20'
      }

      const maybeSingleMock = vi.fn().mockResolvedValue({
        data: mockResponse,
        error: null
      })

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              maybeSingle: maybeSingleMock
            })
          })
        })
      } as any)

      // Act: Render hook and trigger mutation
      const { result } = renderHook(() => useUpdateWelderAssignment(), {
        wrapper: createWrapper()
      })

      const payload = {
        field_weld_id: 'field-weld-uuid',
        welder_id: 'new-welder-uuid',
        date_welded: '2025-01-20'
      }

      result.current.mutate(payload)

      // Assert: Mutation succeeds
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(supabase.from).toHaveBeenCalledWith('field_welds')
      expect(result.current.data).toEqual(mockResponse)
    })

    it('updates welder_id and date_welded fields only', async () => {
      // Arrange
      const mockResponse = {
        id: 'field-weld-uuid',
        component_id: 'comp-uuid',
        welder_id: 'corrected-welder-uuid',
        date_welded: '2025-01-18'
      }

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: mockResponse,
              error: null
            })
          })
        })
      })

      vi.mocked(supabase.from).mockReturnValue({
        update: updateMock
      } as any)

      // Act
      const { result } = renderHook(() => useUpdateWelderAssignment(), {
        wrapper: createWrapper()
      })

      result.current.mutate({
        field_weld_id: 'field-weld-uuid',
        welder_id: 'corrected-welder-uuid',
        date_welded: '2025-01-18'
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Assert: Only welder_id and date_welded are updated
      expect(updateMock).toHaveBeenCalledWith({
        welder_id: 'corrected-welder-uuid',
        date_welded: '2025-01-18'
      })
    })
  })

  describe('Error Handling', () => {
    it('handles database error', async () => {
      // Arrange: Mock error response
      const mockError = {
        message: 'Row not found',
        code: 'PGRST116'
      }

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: mockError
              })
            })
          })
        })
      } as any)

      // Act
      const { result } = renderHook(() => useUpdateWelderAssignment(), {
        wrapper: createWrapper()
      })

      result.current.mutate({
        field_weld_id: 'non-existent-uuid',
        welder_id: 'welder-uuid',
        date_welded: '2025-01-20'
      })

      // Assert: Error state is set
      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error?.message).toContain('Failed to update welder assignment')
    })

    it('handles field weld not found (null data)', async () => {
      // Arrange: Mock null data response (RLS denied or not found)
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null
              })
            })
          })
        })
      } as any)

      // Act
      const { result } = renderHook(() => useUpdateWelderAssignment(), {
        wrapper: createWrapper()
      })

      result.current.mutate({
        field_weld_id: 'inaccessible-uuid',
        welder_id: 'welder-uuid',
        date_welded: '2025-01-20'
      })

      // Assert: Error about not found/access denied
      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error?.message).toContain('not found or access denied')
    })
  })

  describe('Query Invalidation', () => {
    it('invalidates field-weld and field-welds queries on success', async () => {
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

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: 'weld-uuid', component_id: 'comp-uuid' },
                error: null
              })
            })
          })
        })
      } as any)

      // Act
      const { result } = renderHook(() => useUpdateWelderAssignment(), {
        wrapper
      })

      result.current.mutate({
        field_weld_id: 'weld-uuid',
        welder_id: 'welder-uuid',
        date_welded: '2025-01-20'
      })

      // Assert: Both query keys are invalidated
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(invalidateQueriesSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['field-weld'] })
      )
      expect(invalidateQueriesSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['field-welds'] })
      )
    })
  })
})
