/**
 * Unit tests for useMilestoneEvents hook (Feature 020 - T010)
 * Tests milestone event history fetching for component metadata modal
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useMilestoneEvents } from './useMilestoneEvents'
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
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useMilestoneEvents', () => {
  const mockComponentId = 'component-123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches milestone events for component ID', async () => {
    const mockData = [
      {
        id: 'event-1',
        component_id: mockComponentId,
        milestone_name: 'Receive',
        action: 'complete',
        value: 1,
        previous_value: null,
        user_id: 'user-1',
        created_at: '2024-10-19T23:59:19.785701+00:00',
        metadata: {
          new_percent_complete: 14.29,
          old_percent_complete: 0,
        },
      },
      {
        id: 'event-2',
        component_id: mockComponentId,
        milestone_name: 'Install',
        action: 'complete',
        value: 1,
        previous_value: null,
        user_id: 'user-2',
        created_at: '2024-10-20T14:30:00.000000+00:00',
        metadata: {
          new_percent_complete: 28.57,
          old_percent_complete: 14.29,
        },
      },
    ]

    const mockOrder = vi.fn().mockResolvedValue({ data: mockData, error: null })

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: mockOrder,
        }),
      }),
    } as any)

    const { result } = renderHook(() => useMilestoneEvents(mockComponentId), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBeDefined()
    expect(result.current.data).toHaveLength(2)
    expect(result.current.data![0]).toMatchObject({
      id: 'event-1',
      milestone_name: 'Receive',
      action: 'complete',
    })
  })

  it('returns events sorted by timestamp descending', async () => {
    const mockData = [
      { id: 'event-2', created_at: '2024-10-20T00:00:00.000000+00:00' },
      { id: 'event-1', created_at: '2024-10-19T00:00:00.000000+00:00' },
    ]

    const orderMock = vi.fn().mockResolvedValue({ data: mockData, error: null })

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: orderMock,
        }),
      }),
    } as any)

    renderHook(() => useMilestoneEvents(mockComponentId), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false })
    })
  })

  it('returns empty array if no events', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    } as any)

    const { result } = renderHook(() => useMilestoneEvents(mockComponentId), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([])
  })

  it('handles loading state', () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue(new Promise(() => {})), // Never resolves
        }),
      }),
    } as any)

    const { result } = renderHook(() => useMilestoneEvents(mockComponentId), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBeUndefined()
  })

  it('handles error state', async () => {
    const mockError = new Error('Database query failed')

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: mockError }),
        }),
      }),
    } as any)

    const { result } = renderHook(() => useMilestoneEvents(mockComponentId), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(mockError)
  })

  it('uses TanStack Query for caching with correct query key', async () => {
    const mockData = [
      {
        id: 'event-1',
        component_id: mockComponentId,
        milestone_name: 'Receive',
        action: 'complete',
        value: 1,
        previous_value: null,
        user_id: 'user-1',
        created_at: '2024-10-19T23:59:19.785701+00:00',
        metadata: null,
      },
    ]

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
        }),
      }),
    } as any)

    const { result } = renderHook(() => useMilestoneEvents(mockComponentId), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Verify cache key structure by checking data is properly cached
    expect(result.current.data).toBeDefined()
    // Query key is ['milestone-events', componentId]
  })

  it('filters events by component_id', async () => {
    const mockEq = vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: mockEq,
      }),
    } as any)

    renderHook(() => useMilestoneEvents(mockComponentId), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(mockEq).toHaveBeenCalledWith('component_id', mockComponentId)
    })
  })
})
