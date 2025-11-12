/**
 * Tests for useUpdateProject hook
 * Updates project name and description
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useUpdateProject } from './useUpdateProject'
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

describe('useUpdateProject', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates project name and description', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({
      data: { id: 'project-1', name: 'Updated Name', description: 'Updated Description' },
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

    const { result } = renderHook(() => useUpdateProject(), {
      wrapper: createWrapper()
    })

    result.current.mutate({
      projectId: 'project-1',
      name: 'Updated Name',
      description: 'Updated Description',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockUpdate).toHaveBeenCalled()
  })

  it('handles update errors', async () => {
    const mockError = new Error('Update failed')

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

    const { result } = renderHook(() => useUpdateProject(), {
      wrapper: createWrapper()
    })

    result.current.mutate({
      projectId: 'project-1',
      name: 'Updated Name',
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toEqual(mockError)
  })

  it('allows nullable description', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({
      data: { id: 'project-1', name: 'Updated Name', description: null },
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

    const { result } = renderHook(() => useUpdateProject(), {
      wrapper: createWrapper()
    })

    result.current.mutate({
      projectId: 'project-1',
      name: 'Updated Name',
      description: null,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })
})
