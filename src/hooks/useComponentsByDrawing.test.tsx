import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useComponentsByDrawing } from './useComponentsByDrawing'

// Mock formatIdentityKey utility
vi.mock('@/lib/formatIdentityKey', () => ({
  formatIdentityKey: vi.fn((key, type) => {
    if (type === 'instrument') {
      return `${key.commodity_code} ${key.size}`
    }
    return `${key.commodity_code} ${key.size} (${key.seq})`
  })
}))

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: mockComponentsData, error: null }))
          }))
        }))
      }))
    }))
  }
}))

const mockComponentsData = [
  {
    id: 'comp-1-uuid',
    project_id: 'project-uuid',
    drawing_id: 'drawing-1-uuid',
    component_type: 'valve',
    identity_key: { drawing_norm: 'P-001', commodity_code: 'VBALU-001', size: '2', seq: 1 },
    current_milestones: { Receive: false, Install: false, Punch: false, Test: false, Restore: false },
    percent_complete: 0,
    created_at: '2025-01-01T00:00:00Z',
    last_updated_at: '2025-01-01T00:00:00Z',
    last_updated_by: null,
    is_retired: false,
    progress_templates: {
      id: 'template-valve-id',
      component_type: 'valve',
      version: 1,
      workflow_type: 'discrete',
      milestones_config: [
        { name: 'Receive', weight: 10, order: 1, is_partial: false, requires_welder: false },
        { name: 'Install', weight: 60, order: 2, is_partial: false, requires_welder: true },
        { name: 'Punch', weight: 10, order: 3, is_partial: false, requires_welder: false },
        { name: 'Test', weight: 15, order: 4, is_partial: false, requires_welder: false },
        { name: 'Restore', weight: 5, order: 5, is_partial: false, requires_welder: false },
      ]
    }
  },
  {
    id: 'comp-2-uuid',
    project_id: 'project-uuid',
    drawing_id: 'drawing-1-uuid',
    component_type: 'fitting',
    identity_key: { drawing_norm: 'P-001', commodity_code: 'EL90-150', size: '2', seq: 2 },
    current_milestones: { Receive: true, Install: false, Punch: false, Test: false, Restore: false },
    percent_complete: 10,
    created_at: '2025-01-01T00:00:00Z',
    last_updated_at: '2025-01-02T00:00:00Z',
    last_updated_by: 'user-uuid',
    is_retired: false,
    progress_templates: {
      id: 'template-fitting-id',
      component_type: 'fitting',
      version: 1,
      workflow_type: 'discrete',
      milestones_config: [
        { name: 'Receive', weight: 10, order: 1, is_partial: false, requires_welder: false },
      ]
    }
  },
]

describe('useComponentsByDrawing', () => {
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

  it('returns UseQueryResult containing ComponentRow[]', async () => {
    const { result } = renderHook(
      () => useComponentsByDrawing('drawing-1-uuid', true),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(Array.isArray(result.current.data)).toBe(true)
    expect(result.current.data).toHaveLength(2)
  })

  it('uses correct query key with drawing_id', async () => {
    const { result } = renderHook(
      () => useComponentsByDrawing('drawing-1-uuid', true),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const cacheKeys = Array.from(queryClient.getQueryCache().getAll().map(q => q.queryKey))
    expect(cacheKeys).toContainEqual(['components', { drawing_id: 'drawing-1-uuid' }])
  })

  it('sets staleTime to 2 minutes', async () => {
    const { result } = renderHook(
      () => useComponentsByDrawing('drawing-1-uuid', true),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const query = queryClient.getQueryCache().find({
      queryKey: ['components', { drawing_id: 'drawing-1-uuid' }]
    })
    expect(query?.options.staleTime).toBe(2 * 60 * 1000)
  })

  it('only fetches when enabled=true', async () => {
    const { result } = renderHook(
      () => useComponentsByDrawing('drawing-1-uuid', false),
      { wrapper }
    )

    // Should not initiate fetch
    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toBeUndefined()
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('does not fetch when drawingId is null', async () => {
    const { result } = renderHook(
      () => useComponentsByDrawing(null, true),
      { wrapper }
    )

    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toBeUndefined()
  })

  it('filters by drawing_id and is_retired=false', async () => {
    const { supabase } = await import('@/lib/supabase')
    const eqMock = vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: mockComponentsData, error: null }))
      }))
    }))

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: eqMock
      }))
    } as any)

    const { result } = renderHook(
      () => useComponentsByDrawing('drawing-1-uuid', true),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(eqMock).toHaveBeenCalledWith('drawing_id', 'drawing-1-uuid')
    expect(eqMock).toHaveBeenCalledWith('is_retired', false)
  })

  it('sorts components by identity_key->seq', async () => {
    const { result } = renderHook(
      () => useComponentsByDrawing('drawing-1-uuid', true),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const components = result.current.data!
    expect(components[0].identity_key.seq).toBe(1)
    expect(components[1].identity_key.seq).toBe(2)
  })

  it('joins progress_templates table', async () => {
    const { result } = renderHook(
      () => useComponentsByDrawing('drawing-1-uuid', true),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const component = result.current.data![0]
    expect(component).toHaveProperty('template')
    expect(component.template).toHaveProperty('id')
    expect(component.template).toHaveProperty('component_type')
    expect(component.template).toHaveProperty('milestones_config')
  })

  it('computes identityDisplay using formatIdentityKey', async () => {
    const { result } = renderHook(
      () => useComponentsByDrawing('drawing-1-uuid', true),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const components = result.current.data!
    expect(components[0].identityDisplay).toBe('VBALU-001 2 (1)')
    expect(components[1].identityDisplay).toBe('EL90-150 2 (2)')
  })

  it('sets canUpdate permission field', async () => {
    const { result } = renderHook(
      () => useComponentsByDrawing('drawing-1-uuid', true),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const component = result.current.data![0]
    expect(component).toHaveProperty('canUpdate')
    expect(typeof component.canUpdate).toBe('boolean')
  })

  it('provides isLoading state during fetch', () => {
    const { result } = renderHook(
      () => useComponentsByDrawing('drawing-1-uuid', true),
      { wrapper }
    )

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

    const { result } = renderHook(
      () => useComponentsByDrawing('drawing-1-uuid', true),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeDefined()
  })

  it('returns empty array when drawing has no components', async () => {
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

    const { result } = renderHook(
      () => useComponentsByDrawing('empty-drawing-uuid', true),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual([])
  })

  it('lazy loading: enables fetch when enabled changes from false to true', async () => {
    const { result, rerender } = renderHook(
      ({ enabled }) => useComponentsByDrawing('drawing-1-uuid', enabled),
      { wrapper, initialProps: { enabled: false } }
    )

    // Initially disabled
    expect(result.current.fetchStatus).toBe('idle')

    // Enable lazy loading
    rerender({ enabled: true })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toHaveLength(2)
  })
})
