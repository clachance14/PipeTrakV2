/**
 * Tests for useArchiveProject hook
 * Soft deletes projects by setting deleted_at timestamp
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useArchiveProject } from './useArchiveProject'
import { createElement, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
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

describe('useArchiveProject', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sets deleted_at timestamp', async () => {
    const now = new Date().toISOString()
    const mockUpdate = vi.fn().mockResolvedValue({
      data: { id: 'project-1', deleted_at: now },
      error: null,
    })

    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: mockUpdate,
          }),
        }),
      }),
    } as any)

    const { result } = renderHook(() => useArchiveProject(), {
      wrapper: createWrapper()
    })

    result.current.mutate('project-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockUpdate).toHaveBeenCalled()
  })

  it('handles archive errors', async () => {
    const mockError = new Error('Archive failed')

    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: mockError,
            }),
          }),
        }),
      }),
    } as any)

    const { result } = renderHook(() => useArchiveProject(), {
      wrapper: createWrapper()
    })

    result.current.mutate('project-1')

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toEqual(mockError)
  })

  it('invalidates projects query on success', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({
      data: { id: 'project-1', deleted_at: new Date().toISOString() },
      error: null,
    })

    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: mockUpdate,
          }),
        }),
      }),
    } as any)

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children)

    const { result } = renderHook(() => useArchiveProject(), { wrapper })

    result.current.mutate('project-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['projects'] })
  })
})
