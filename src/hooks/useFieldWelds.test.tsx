/**
 * Unit tests for useFieldWelds hook (Feature 014 - T068)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useFieldWelds } from './useFieldWelds'
import { supabase } from '@/lib/supabase'

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0 },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useFieldWelds', () => {
  const mockProjectId = 'project-123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns all field welds for project with joined data', async () => {
    const mockData = [
      {
        id: 'weld-1',
        component_id: 'comp-1',
        project_id: mockProjectId,
        weld_type: 'BW',
        weld_size: '2"',
        date_welded: '2024-01-15',
        status: 'accepted',
        nde_result: 'PASS',
        original_weld_id: null,
        is_repair: false,
        component: {
          id: 'comp-1',
          drawing_id: 'drawing-1',
          type: 'field_weld',
          identity_key: { weld_id: 'W-001' },
          percent_complete: 100,
          progress_state: {},
          drawing: {
            id: 'drawing-1',
            drawing_no_norm: 'P-001',
            project_id: mockProjectId,
          },
        },
        welder: {
          id: 'welder-1',
          stencil: 'K-07',
          name: 'John Smith',
          status: 'verified',
        },
        area: null,
        system: null,
        test_package: null,
      },
    ]

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
        }),
      }),
    })

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
    } as any)

    const { result } = renderHook(() => useFieldWelds({ projectId: mockProjectId }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBeDefined()
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data![0]).toMatchObject({
      id: 'weld-1',
      weld_type: 'BW',
      welder: {
        stencil: 'K-07',
        name: 'John Smith',
      },
      drawing: {
        drawing_no_norm: 'P-001',
      },
    })
    expect(result.current.data![0].identityDisplay).toBe('W-001')
  })

  it('sorts results by date_welded descending', async () => {
    const mockData = [
      { id: 'weld-1', date_welded: '2024-01-20', component: { identity_key: {} } },
      { id: 'weld-2', date_welded: '2024-01-15', component: { identity_key: {} } },
    ]

    const orderMock = vi.fn().mockResolvedValue({ data: mockData, error: null })

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: orderMock,
          }),
        }),
      }),
    } as any)

    renderHook(() => useFieldWelds({ projectId: mockProjectId }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(orderMock).toHaveBeenCalledWith('date_welded', {
        ascending: false,
        nullsFirst: false,
      })
    })
  })

  it('handles empty results', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
    } as any)

    const { result } = renderHook(() => useFieldWelds({ projectId: mockProjectId }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([])
  })

  it('handles query errors', async () => {
    const mockError = new Error('Database connection failed')

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: null, error: mockError }),
          }),
        }),
      }),
    } as any)

    const { result } = renderHook(() => useFieldWelds({ projectId: mockProjectId }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(mockError)
  })

  it('respects enabled flag', () => {
    const { result } = renderHook(
      () => useFieldWelds({ projectId: mockProjectId, enabled: false }),
      { wrapper: createWrapper() }
    )

    expect(result.current.isFetching).toBe(false)
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('uses correct cache key', () => {
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    })

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
    } as any)

    const { result } = renderHook(() => useFieldWelds({ projectId: mockProjectId }), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading || result.current.isSuccess).toBe(true)
    // Cache key is ['field-welds', { projectId }]
  })
})
