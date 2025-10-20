import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useDrawingsWithProgress } from './useDrawingsWithProgress'

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: mockDrawingsData, error: null }))
          }))
        }))
      }))
    }))
  }
}))

const mockDrawingsData = [
  {
    id: 'drawing-1-uuid',
    project_id: 'project-uuid',
    drawing_no_norm: 'P-001',
    drawing_no_raw: 'P-001',
    title: 'Main Process Line',
    rev: 'A',
    is_retired: false,
    mv_drawing_progress: {
      total_components: 3,
      completed_components: 0,
      avg_percent_complete: 8.33
    }
  },
  {
    id: 'drawing-2-uuid',
    project_id: 'project-uuid',
    drawing_no_norm: 'P-002',
    drawing_no_raw: 'P-002',
    title: 'Drain Line',
    rev: 'B',
    is_retired: false,
    mv_drawing_progress: {
      total_components: 1,
      completed_components: 1,
      avg_percent_complete: 100.00
    }
  },
  {
    id: 'drawing-3-uuid',
    project_id: 'project-uuid',
    drawing_no_norm: 'P-003',
    drawing_no_raw: 'P-003',
    title: null,
    rev: null,
    is_retired: false,
    mv_drawing_progress: {
      total_components: 0,
      completed_components: 0,
      avg_percent_complete: 0
    }
  },
]

describe('useDrawingsWithProgress', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    })
    vi.clearAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  it('returns UseQueryResult containing DrawingRow[]', async () => {
    const { result } = renderHook(() => useDrawingsWithProgress('project-uuid'), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(Array.isArray(result.current.data)).toBe(true)
    expect(result.current.data).toHaveLength(3)
  })

  it('uses correct query key with project_id', async () => {
    const { result } = renderHook(() => useDrawingsWithProgress('project-uuid'), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const cacheKeys = Array.from(queryClient.getQueryCache().getAll().map(q => q.queryKey))
    expect(cacheKeys).toContainEqual(['drawings-with-progress', { project_id: 'project-uuid' }])
  })

  it('sets staleTime to 2 minutes', async () => {
    const { result } = renderHook(() => useDrawingsWithProgress('project-uuid'), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const query = queryClient.getQueryCache().find({
      queryKey: ['drawings-with-progress', { project_id: 'project-uuid' }]
    })
    expect(query?.options.staleTime).toBe(2 * 60 * 1000) // 2 minutes
  })

  it('filters by project_id and is_retired=false', async () => {
    const { supabase } = await import('@/lib/supabase')
    const eqMock = vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: mockDrawingsData, error: null }))
      }))
    }))

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: eqMock
      }))
    } as any)

    const { result } = renderHook(() => useDrawingsWithProgress('project-uuid'), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(eqMock).toHaveBeenCalledWith('project_id', 'project-uuid')
    expect(eqMock).toHaveBeenCalledWith('is_retired', false)
  })

  it('sorts drawings by drawing_no_norm ascending', async () => {
    const { result } = renderHook(() => useDrawingsWithProgress('project-uuid'), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const drawings = result.current.data!
    expect(drawings[0].drawing_no_norm).toBe('P-001')
    expect(drawings[1].drawing_no_norm).toBe('P-002')
    expect(drawings[2].drawing_no_norm).toBe('P-003')
  })

  it('joins mv_drawing_progress view data', async () => {
    const { result } = renderHook(() => useDrawingsWithProgress('project-uuid'), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const firstDrawing = result.current.data![0]
    expect(firstDrawing).toHaveProperty('total_components')
    expect(firstDrawing).toHaveProperty('completed_components')
    expect(firstDrawing).toHaveProperty('avg_percent_complete')

    expect(firstDrawing.total_components).toBe(3)
    expect(firstDrawing.completed_components).toBe(0)
    expect(firstDrawing.avg_percent_complete).toBe(8.33)
  })

  it('includes all drawing fields', async () => {
    const { result } = renderHook(() => useDrawingsWithProgress('project-uuid'), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const drawing = result.current.data![0]
    expect(drawing).toHaveProperty('id')
    expect(drawing).toHaveProperty('project_id')
    expect(drawing).toHaveProperty('drawing_no_norm')
    expect(drawing).toHaveProperty('drawing_no_raw')
    expect(drawing).toHaveProperty('title')
    expect(drawing).toHaveProperty('rev')
    expect(drawing).toHaveProperty('is_retired')
  })

  it('handles drawings with null title', async () => {
    const { result } = renderHook(() => useDrawingsWithProgress('project-uuid'), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const drawingWithNullTitle = result.current.data!.find(d => d.drawing_no_norm === 'P-003')
    expect(drawingWithNullTitle?.title).toBeNull()
  })

  it('handles drawings with 0 components', async () => {
    const { result } = renderHook(() => useDrawingsWithProgress('project-uuid'), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const emptyDrawing = result.current.data!.find(d => d.drawing_no_norm === 'P-003')
    expect(emptyDrawing?.total_components).toBe(0)
    expect(emptyDrawing?.completed_components).toBe(0)
    expect(emptyDrawing?.avg_percent_complete).toBe(0)
  })

  it('provides isLoading state during fetch', () => {
    const { result } = renderHook(() => useDrawingsWithProgress('project-uuid'), { wrapper })

    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBeUndefined()
  })

  it('provides error state on fetch failure', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: null, error: new Error('Database error') }))
          }))
        }))
      }))
    } as any)

    queryClient.clear()

    const { result } = renderHook(() => useDrawingsWithProgress('project-uuid'), { wrapper })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeDefined()
    expect(result.current.data).toBeUndefined()
  })

  it('refetches on window focus', async () => {
    const { result } = renderHook(() => useDrawingsWithProgress('project-uuid'), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const query = queryClient.getQueryCache().find({
      queryKey: ['drawings-with-progress', { project_id: 'project-uuid' }]
    })
    expect(query?.options.refetchOnWindowFocus).toBe(true)
  })

  it('returns empty array when user has no access (RLS filtering)', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      }))
    } as any)

    queryClient.clear()

    const { result } = renderHook(() => useDrawingsWithProgress('unauthorized-project'), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual([])
  })
})
