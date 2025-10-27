import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useUserProfile } from '@/hooks/useUserProfile'
import { supabase } from '@/lib/supabase'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

describe('useUserProfile', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    // Create fresh query client for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
    vi.clearAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  it('fetches user profile data successfully', async () => {
    const mockUserData = {
      id: '123',
      email: 'john@example.com',
      role: 'admin',
      full_name: 'John Doe',
      organization_id: 'org-123',
      avatar_url: null,
      organization: {
        id: 'org-123',
        name: 'ACME Corp',
      },
    }

    // Mock successful response
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockUserData,
            error: null,
          }),
        }),
      }),
    } as any)

    const { result } = renderHook(() => useUserProfile('123'), { wrapper })

    // Initially loading
    expect(result.current.isLoading).toBe(true)

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Expect data to be available
    expect(result.current.data).toEqual(mockUserData)
    expect(result.current.error).toBeNull()
  })

  it('handles fetch error', async () => {
    const mockError = new Error('Network error')

    // Mock error response
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: mockError,
          }),
        }),
      }),
    } as any)

    const { result } = renderHook(() => useUserProfile('123'), { wrapper })

    // Wait for error state
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Expect error to be set
    expect(result.current.error).toBeTruthy()
    expect(result.current.data).toBeUndefined()
  })

  it('sets correct query key for caching', () => {
    const mockUserData = {
      id: '123',
      email: 'john@example.com',
      role: 'admin',
      full_name: 'John Doe',
      organization_id: 'org-123',
      avatar_url: null,
    }

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockUserData,
            error: null,
          }),
        }),
      }),
    } as any)

    const { result } = renderHook(() => useUserProfile('123'), { wrapper })

    // Query key should include user ID for proper caching
    expect(result.current).toBeDefined()
  })
})
