/**
 * Test Suite: useClearWelderAssignment Hook
 *
 * Tests for clearing welder assignment from field welds
 * when rolling back the "Weld Complete" milestone.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { useClearWelderAssignment } from './useClearWelderAssignment'
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

describe('useClearWelderAssignment hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Successful Clear', () => {
    it('clears welder_id and date_welded by setting them to null', async () => {
      // Arrange: Mock successful update response
      const mockResponse = {
        id: 'field-weld-uuid',
        component_id: 'comp-uuid'
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

      // Act: Render hook and trigger mutation
      const { result } = renderHook(() => useClearWelderAssignment(), {
        wrapper: createWrapper()
      })

      result.current.mutate({ field_weld_id: 'field-weld-uuid' })

      // Assert: Mutation succeeds and clears fields
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(supabase.from).toHaveBeenCalledWith('field_welds')
      expect(updateMock).toHaveBeenCalledWith({
        welder_id: null,
        date_welded: null
      })
      expect(result.current.data).toEqual(mockResponse)
    })

    it('returns component_id for cache invalidation purposes', async () => {
      // Arrange
      const mockResponse = {
        id: 'field-weld-uuid',
        component_id: 'component-uuid-123'
      }

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: mockResponse,
                error: null
              })
            })
          })
        })
      } as any)

      // Act
      const { result } = renderHook(() => useClearWelderAssignment(), {
        wrapper: createWrapper()
      })

      result.current.mutate({ field_weld_id: 'field-weld-uuid' })

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data?.component_id).toBe('component-uuid-123')
    })
  })

  describe('Error Handling', () => {
    it('handles database error', async () => {
      // Arrange
      const mockError = {
        message: 'Permission denied',
        code: '42501'
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
      const { result } = renderHook(() => useClearWelderAssignment(), {
        wrapper: createWrapper()
      })

      result.current.mutate({ field_weld_id: 'field-weld-uuid' })

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error?.message).toContain('Failed to clear welder assignment')
    })

    it('handles field weld not found (null data with no error)', async () => {
      // Arrange: RLS might hide row, returning null
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
      const { result } = renderHook(() => useClearWelderAssignment(), {
        wrapper: createWrapper()
      })

      result.current.mutate({ field_weld_id: 'non-existent-uuid' })

      // Assert
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
      const { result } = renderHook(() => useClearWelderAssignment(), {
        wrapper
      })

      result.current.mutate({ field_weld_id: 'weld-uuid' })

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

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Error', code: '42501' }
              })
            })
          })
        })
      } as any)

      // Act
      const { result } = renderHook(() => useClearWelderAssignment(), {
        wrapper
      })

      result.current.mutate({ field_weld_id: 'weld-uuid' })

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
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockImplementation(() =>
                new Promise(resolve =>
                  setTimeout(() => resolve({
                    data: { id: 'weld-uuid', component_id: 'comp-uuid' },
                    error: null
                  }), 50)
                )
              )
            })
          })
        })
      } as any)

      // Act
      const { result } = renderHook(() => useClearWelderAssignment(), {
        wrapper
      })

      result.current.mutate({ field_weld_id: 'weld-uuid' })

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
})
