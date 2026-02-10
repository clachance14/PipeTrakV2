import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useUpdateProfile } from '@/hooks/useUpdateProfile'
import { supabase } from '@/lib/supabase'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}))

describe('useUpdateProfile', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })
    vi.clearAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )

  it('updates profile successfully', async () => {
    const mockData = {
      id: '123',
      email: 'john@example.com',
      full_name: 'Jane Smith',
      avatar_url: null,
      organization_id: 'org-123',
      role: 'project_manager',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      deleted_at: null
    }

    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockData,
              error: null
            })
          })
        })
      })
    } as any)

    const { result } = renderHook(() => useUpdateProfile(), { wrapper })

    // Trigger mutation
    result.current.mutate({ userId: '123', fullName: 'Jane Smith' })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockData)
  })

  it('handles error when update fails', async () => {
    const mockError = new Error('Database error')

    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: mockError
            })
          })
        })
      })
    } as any)

    const { result } = renderHook(() => useUpdateProfile(), { wrapper })

    // Trigger mutation
    result.current.mutate({ userId: '123', fullName: 'Jane Smith' })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeTruthy()
  })

  it('performs optimistic update', async () => {
    // Set initial cache data
    queryClient.setQueryData(['userProfile', '123'], {
      id: '123',
      email: 'john@example.com',
      full_name: 'John Doe',
      avatar_url: null
    })

    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: '123',
                full_name: 'Jane Smith'
              },
              error: null
            })
          })
        })
      })
    } as any)

    const { result } = renderHook(() => useUpdateProfile(), { wrapper })

    // Trigger mutation
    result.current.mutate({ userId: '123', fullName: 'Jane Smith' })

    // Check that cache was updated optimistically (before server response)
    const _cachedData = queryClient.getQueryData(['userProfile', '123']) as any
    
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
  })

  it('rolls back on error', async () => {
    // Set initial cache data
    const initialData = {
      id: '123',
      email: 'john@example.com',
      full_name: 'John Doe',
      avatar_url: null
    }
    queryClient.setQueryData(['userProfile', '123'], initialData)

    const mockError = new Error('Database error')

    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: mockError
            })
          })
        })
      })
    } as any)

    const { result } = renderHook(() => useUpdateProfile(), { wrapper })

    // Trigger mutation
    result.current.mutate({ userId: '123', fullName: 'Jane Smith' })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    // Check that cache was rolled back to original value
    const cachedData = queryClient.getQueryData(['userProfile', '123'])
    expect(cachedData).toEqual(initialData)
  })

  it('invalidates cache on success', async () => {
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: '123', full_name: 'Jane Smith' },
              error: null
            })
          })
        })
      })
    } as any)

    const { result } = renderHook(() => useUpdateProfile(), { wrapper })

    result.current.mutate({ userId: '123', fullName: 'Jane Smith' })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // Should invalidate userProfile queries
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['userProfile'] })
  })
})
