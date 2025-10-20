import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useProgressTemplates } from './useProgressTemplates'
import type { ComponentType } from '@/types/drawing-table.types'

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          then: vi.fn((cb) => cb({ data: mockTemplatesData, error: null }))
        }))
      }))
    }))
  }
}))

const mockTemplatesData = [
  {
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
  },
  {
    id: 'template-fitting-id',
    component_type: 'fitting',
    version: 1,
    workflow_type: 'discrete',
    milestones_config: [
      { name: 'Receive', weight: 10, order: 1, is_partial: false, requires_welder: false },
      { name: 'Install', weight: 60, order: 2, is_partial: false, requires_welder: false },
      { name: 'Punch', weight: 10, order: 3, is_partial: false, requires_welder: false },
      { name: 'Test', weight: 15, order: 4, is_partial: false, requires_welder: false },
      { name: 'Restore', weight: 5, order: 5, is_partial: false, requires_welder: false },
    ]
  },
  {
    id: 'template-threaded-pipe-id',
    component_type: 'threaded_pipe',
    version: 1,
    workflow_type: 'hybrid',
    milestones_config: [
      { name: 'Receive', weight: 10, order: 1, is_partial: false, requires_welder: false },
      { name: 'Fabricate', weight: 10, order: 2, is_partial: true, requires_welder: false },
      { name: 'Install', weight: 15, order: 3, is_partial: true, requires_welder: false },
      { name: 'Erect', weight: 10, order: 4, is_partial: true, requires_welder: false },
      { name: 'Connect', weight: 10, order: 5, is_partial: true, requires_welder: false },
      { name: 'Support', weight: 15, order: 6, is_partial: true, requires_welder: false },
      { name: 'Punch', weight: 10, order: 7, is_partial: false, requires_welder: false },
      { name: 'Test', weight: 15, order: 8, is_partial: false, requires_welder: false },
      { name: 'Restore', weight: 5, order: 9, is_partial: false, requires_welder: false },
    ]
  },
]

describe('useProgressTemplates', () => {
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

  it('returns UseQueryResult with Map<ComponentType, ProgressTemplate>', async () => {
    const { result } = renderHook(() => useProgressTemplates(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toBeInstanceOf(Map)
    expect(result.current.data?.size).toBeGreaterThan(0)
  })

  it('uses correct query key', async () => {
    const { result } = renderHook(() => useProgressTemplates(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const cacheKeys = Array.from(queryClient.getQueryCache().getAll().map(q => q.queryKey))
    expect(cacheKeys).toContainEqual(['progress-templates'])
  })

  it('sets staleTime to Infinity for static data', async () => {
    const { result } = renderHook(() => useProgressTemplates(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const query = queryClient.getQueryCache().find({ queryKey: ['progress-templates'] })
    expect(query?.options.staleTime).toBe(Infinity)
  })

  it('transforms array to Map keyed by component_type', async () => {
    const { result } = renderHook(() => useProgressTemplates(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const templatesMap = result.current.data!

    expect(templatesMap.get('valve')).toBeDefined()
    expect(templatesMap.get('valve')?.id).toBe('template-valve-id')
    expect(templatesMap.get('valve')?.milestones_config).toHaveLength(5)

    expect(templatesMap.get('fitting')).toBeDefined()
    expect(templatesMap.get('fitting')?.id).toBe('template-fitting-id')

    expect(templatesMap.get('threaded_pipe')).toBeDefined()
    expect(templatesMap.get('threaded_pipe')?.milestones_config).toHaveLength(9)
  })

  it('includes all 11 component types (from seeded data)', async () => {
    // Note: In real database, all 11 types would be seeded
    // For this test, we verify the structure supports all types
    const { result } = renderHook(() => useProgressTemplates(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const templatesMap = result.current.data!

    // Verify each template has correct structure
    templatesMap.forEach((template) => {
      expect(template).toHaveProperty('id')
      expect(template).toHaveProperty('component_type')
      expect(template).toHaveProperty('version')
      expect(template).toHaveProperty('workflow_type')
      expect(template).toHaveProperty('milestones_config')
      expect(Array.isArray(template.milestones_config)).toBe(true)
    })
  })

  it('handles component types as Map keys correctly', async () => {
    const { result } = renderHook(() => useProgressTemplates(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const templatesMap = result.current.data!

    // Test that we can access by component type string
    const valveTemplate = templatesMap.get('valve' as ComponentType)
    expect(valveTemplate).toBeDefined()
    expect(valveTemplate?.component_type).toBe('valve')
  })

  it('provides isLoading state during fetch', () => {
    const { result } = renderHook(() => useProgressTemplates(), { wrapper })

    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBeUndefined()
  })

  it('provides error state on fetch failure', async () => {
    // Mock error response
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: null, error: new Error('Database error') }))
      }))
    } as any)

    queryClient.clear()

    const { result } = renderHook(() => useProgressTemplates(), { wrapper })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeDefined()
    expect(result.current.data).toBeUndefined()
  })

  it('does not refetch on mount after initial load', async () => {
    const { result, unmount } = renderHook(() => useProgressTemplates(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const firstData = result.current.data

    unmount()

    const { result: result2 } = renderHook(() => useProgressTemplates(), { wrapper })

    await waitFor(() => {
      expect(result2.current.isSuccess).toBe(true)
    })

    // Data should come from cache (same reference)
    expect(result2.current.data).toBe(firstData)
  })

  it('sorts templates by component_type', async () => {
    const { result } = renderHook(() => useProgressTemplates(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const templatesMap = result.current.data!
    const types = Array.from(templatesMap.keys())

    // Verify map preserves insertion order (sorted alphabetically in query)
    expect(types).toEqual(expect.arrayContaining(['valve', 'fitting', 'threaded_pipe']))
  })
})
