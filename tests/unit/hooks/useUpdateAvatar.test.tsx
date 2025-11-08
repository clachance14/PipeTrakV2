import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useUpdateAvatar } from '@/hooks/useUpdateAvatar'
import { supabase } from '@/lib/supabase'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn()
    },
    from: vi.fn()
  }
}))

describe('useUpdateAvatar', () => {
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

  it('uploads file to storage and updates database', async () => {
    const mockFile = new File(['avatar'], 'avatar.png', { type: 'image/png' })

    // Mock storage upload
    vi.mocked(supabase.storage.from).mockReturnValue({
      upload: vi.fn().mockResolvedValue({
        error: null,
        data: { path: '123/avatar.png' }
      }),
      getPublicUrl: vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/avatars/123/avatar.png' }
      })
    } as any)

    // Mock database update
    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: '123',
                avatar_url: 'https://example.com/avatars/123/avatar.png'
              },
              error: null
            })
          })
        })
      })
    } as any)

    const { result } = renderHook(() => useUpdateAvatar(), { wrapper })

    result.current.mutate({ userId: '123', file: mockFile })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.avatar_url).toBe('https://example.com/avatars/123/avatar.png')
  })

  it('handles storage upload error', async () => {
    const mockFile = new File(['avatar'], 'avatar.png', { type: 'image/png' })
    const mockError = new Error('Storage error')

    vi.mocked(supabase.storage.from).mockReturnValue({
      upload: vi.fn().mockResolvedValue({
        error: mockError,
        data: null
      })
    } as any)

    const { result } = renderHook(() => useUpdateAvatar(), { wrapper })

    result.current.mutate({ userId: '123', file: mockFile })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeTruthy()
  })

  it('handles database update error', async () => {
    const mockFile = new File(['avatar'], 'avatar.png', { type: 'image/png' })

    // Mock successful upload
    vi.mocked(supabase.storage.from).mockReturnValue({
      upload: vi.fn().mockResolvedValue({
        error: null,
        data: { path: '123/avatar.png' }
      }),
      getPublicUrl: vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/avatars/123/avatar.png' }
      })
    } as any)

    // Mock database error
    const mockDbError = new Error('Database error')
    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: mockDbError
            })
          })
        })
      })
    } as any)

    const { result } = renderHook(() => useUpdateAvatar(), { wrapper })

    result.current.mutate({ userId: '123', file: mockFile })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })

  it('invalidates user profile cache on success', async () => {
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const mockFile = new File(['avatar'], 'avatar.png', { type: 'image/png' })

    vi.mocked(supabase.storage.from).mockReturnValue({
      upload: vi.fn().mockResolvedValue({
        error: null,
        data: { path: '123/avatar.png' }
      }),
      getPublicUrl: vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/avatars/123/avatar.png' }
      })
    } as any)

    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: '123', avatar_url: 'https://example.com' },
              error: null
            })
          })
        })
      })
    } as any)

    const { result } = renderHook(() => useUpdateAvatar(), { wrapper })

    result.current.mutate({ userId: '123', file: mockFile })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['userProfile'] })
  })
})
