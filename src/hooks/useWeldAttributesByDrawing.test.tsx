import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useWeldAttributesByDrawing } from './useWeldAttributesByDrawing'
import { supabase } from '@/lib/supabase'
import type { ReactNode } from 'react'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useWeldAttributesByDrawing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns distinct values for welds on a specific drawing', async () => {
    const mockData = [
      { weld_size: '2"', spec: 'HC05', schedule: 'STD', base_metal: 'CS', component: { drawing_id: 'drawing-123' } },
      { weld_size: '2"', spec: 'HC05', schedule: 'XS', base_metal: 'CS', component: { drawing_id: 'drawing-123' } },
      { weld_size: '4"', spec: 'HC08', schedule: 'STD', base_metal: 'SS', component: { drawing_id: 'drawing-123' } },
    ]

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }),
    } as any)

    const { result } = renderHook(() => useWeldAttributesByDrawing('drawing-123'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.weldSizes).toEqual(['2"', '4"'])
    expect(result.current.data?.specs).toEqual(['HC05', 'HC08'])
    expect(result.current.data?.schedules).toEqual(['STD', 'XS'])
    expect(result.current.data?.baseMetals).toEqual(['CS', 'SS'])
  })

  it('joins through components to get drawing_id', async () => {
    const mockEq = vi.fn().mockResolvedValue({ data: [], error: null })
    const mockSelect = vi.fn().mockReturnValue({
      eq: mockEq,
    })

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
    } as any)

    renderHook(() => useWeldAttributesByDrawing('drawing-abc'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(supabase.from).toHaveBeenCalled())

    expect(supabase.from).toHaveBeenCalledWith('field_welds')
    // Should select with join through components
    expect(mockSelect).toHaveBeenCalledWith(
      expect.stringContaining('component:components')
    )
    // Should filter by component.drawing_id
    expect(mockEq).toHaveBeenCalledWith('component.drawing_id', 'drawing-abc')
  })

  it('is disabled when drawingId is null', () => {
    const { result } = renderHook(() => useWeldAttributesByDrawing(null), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('is disabled when drawingId is empty string', () => {
    const { result } = renderHook(() => useWeldAttributesByDrawing(''), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('sorts weld sizes numerically', async () => {
    const mockData = [
      { weld_size: '10"', spec: null, schedule: null, base_metal: null, component: { drawing_id: 'd' } },
      { weld_size: '2"', spec: null, schedule: null, base_metal: null, component: { drawing_id: 'd' } },
      { weld_size: '1"', spec: null, schedule: null, base_metal: null, component: { drawing_id: 'd' } },
    ]

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }),
    } as any)

    const { result } = renderHook(() => useWeldAttributesByDrawing('drawing-123'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.weldSizes).toEqual(['1"', '2"', '10"'])
  })

  it('returns empty arrays when drawing has no welds', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    } as any)

    const { result } = renderHook(() => useWeldAttributesByDrawing('drawing-no-welds'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.weldSizes).toEqual([])
    expect(result.current.data?.specs).toEqual([])
    expect(result.current.data?.schedules).toEqual([])
    expect(result.current.data?.baseMetals).toEqual([])
  })
})
