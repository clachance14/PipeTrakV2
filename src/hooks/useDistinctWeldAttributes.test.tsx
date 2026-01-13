import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useDistinctWeldAttributes } from './useDistinctWeldAttributes'
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

describe('useDistinctWeldAttributes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns distinct values for each field', async () => {
    const mockData = [
      { weld_size: '2"', spec: 'HC05', schedule: 'STD', base_metal: 'CS' },
      { weld_size: '2"', spec: 'HC05', schedule: 'XS', base_metal: 'CS' },
      { weld_size: '4"', spec: 'HC08', schedule: 'STD', base_metal: 'SS' },
    ]

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }),
    } as any)

    const { result } = renderHook(() => useDistinctWeldAttributes('project-123'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.weldSizes).toEqual(['2"', '4"'])
    expect(result.current.data?.specs).toEqual(['HC05', 'HC08'])
    expect(result.current.data?.schedules).toEqual(['STD', 'XS'])
    expect(result.current.data?.baseMetals).toEqual(['CS', 'SS'])
  })

  it('excludes null and empty values', async () => {
    const mockData = [
      { weld_size: '2"', spec: 'HC05', schedule: null, base_metal: '' },
      { weld_size: null, spec: null, schedule: 'STD', base_metal: 'CS' },
    ]

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }),
    } as any)

    const { result } = renderHook(() => useDistinctWeldAttributes('project-123'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.weldSizes).toEqual(['2"'])
    expect(result.current.data?.specs).toEqual(['HC05'])
    expect(result.current.data?.schedules).toEqual(['STD'])
    expect(result.current.data?.baseMetals).toEqual(['CS'])
  })

  it('sorts weld sizes numerically using sortWeldSizes', async () => {
    const mockData = [
      { weld_size: '10"', spec: null, schedule: null, base_metal: null },
      { weld_size: '2"', spec: null, schedule: null, base_metal: null },
      { weld_size: '1"', spec: null, schedule: null, base_metal: null },
    ]

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }),
    } as any)

    const { result } = renderHook(() => useDistinctWeldAttributes('project-123'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Should be sorted numerically: 1, 2, 10 (not alphabetically: 1, 10, 2)
    expect(result.current.data?.weldSizes).toEqual(['1"', '2"', '10"'])
  })

  it('is disabled when projectId is empty', () => {
    const { result } = renderHook(() => useDistinctWeldAttributes(''), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('queries field_welds table with project_id filter', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    })

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
    } as any)

    renderHook(() => useDistinctWeldAttributes('project-abc'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(supabase.from).toHaveBeenCalled())

    expect(supabase.from).toHaveBeenCalledWith('field_welds')
    expect(mockSelect).toHaveBeenCalledWith('weld_size, spec, schedule, base_metal')
  })
})
