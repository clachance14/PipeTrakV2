import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useUpdateMilestone } from './useUpdateMilestone'
import type { MilestoneUpdatePayload } from '@/types/drawing-table.types'

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}))

// Mock validateMilestoneUpdate
vi.mock('@/lib/validateMilestoneUpdate', () => ({
  validateMilestoneUpdate: vi.fn(() => ({ valid: true })),
}))

const mockSuccessResponse = {
  component: {
    id: 'comp-1-uuid',
    current_milestones: { Receive: true },
    percent_complete: 10,
  },
  previous_value: false,
  audit_event_id: 'audit-uuid',
  new_percent_complete: 10,
}

describe('useUpdateMilestone', () => {
  let queryClient: QueryClient

  // Helper to get the mocked RPC function
  const getMockRpc = async () => {
    const { supabase } = await import('@/lib/supabase')
    return vi.mocked(supabase.rpc)
  }

  beforeEach(async () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
        mutations: {
          retry: false,
        },
      },
    })
    vi.clearAllMocks()

    // Get the mocked supabase instance
    const mockRpc = await getMockRpc()
    mockRpc.mockResolvedValue({ data: mockSuccessResponse, error: null })
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  it('returns UseMutationResult', () => {
    const { result } = renderHook(() => useUpdateMilestone(), { wrapper })

    expect(result.current).toHaveProperty('mutate')
    expect(result.current).toHaveProperty('mutateAsync')
    expect(result.current).toHaveProperty('isPending')
    expect(result.current).toHaveProperty('isSuccess')
    expect(result.current).toHaveProperty('isError')
  })

  it('calls Supabase RPC update_component_milestone', async () => {
    const { result } = renderHook(() => useUpdateMilestone(), { wrapper })

    const payload: MilestoneUpdatePayload = {
      component_id: 'comp-1-uuid',
      milestone_name: 'Receive',
      value: true,
      user_id: 'user-uuid',
    }

    await act(async () => {
      await result.current.mutateAsync(payload)
    })

    const mockRpc = await getMockRpc(); expect(mockRpc).toHaveBeenCalledWith('update_component_milestone', {
      p_component_id: 'comp-1-uuid',
      p_milestone_name: 'Receive',
      p_new_value: true,
      p_user_id: 'user-uuid',
    })
  })

  it('returns MilestoneUpdateResponse on success', async () => {
    const { result } = renderHook(() => useUpdateMilestone(), { wrapper })

    const payload: MilestoneUpdatePayload = {
      component_id: 'comp-1-uuid',
      milestone_name: 'Receive',
      value: true,
      user_id: 'user-uuid',
    }

    await act(async () => {
      await result.current.mutateAsync(payload)
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockSuccessResponse)
  })

  it('handles discrete milestone update (boolean)', async () => {
    const { result } = renderHook(() => useUpdateMilestone(), { wrapper })

    const payload: MilestoneUpdatePayload = {
      component_id: 'comp-1-uuid',
      milestone_name: 'Install',
      value: false,
      user_id: 'user-uuid',
    }

    await act(async () => {
      await result.current.mutateAsync(payload)
    })

    const mockRpc = await getMockRpc(); expect(mockRpc).toHaveBeenCalledWith('update_component_milestone', {
      p_component_id: 'comp-1-uuid',
      p_milestone_name: 'Install',
      p_new_value: false,
      p_user_id: 'user-uuid',
    })
  })

  it('handles partial milestone update (number)', async () => {
    const { result } = renderHook(() => useUpdateMilestone(), { wrapper })

    const payload: MilestoneUpdatePayload = {
      component_id: 'comp-2-uuid',
      milestone_name: 'Fabricate',
      value: 75,
      user_id: 'user-uuid',
    }

    await act(async () => {
      await result.current.mutateAsync(payload)
    })

    const mockRpc = await getMockRpc(); expect(mockRpc).toHaveBeenCalledWith('update_component_milestone', {
      p_component_id: 'comp-2-uuid',
      p_milestone_name: 'Fabricate',
      p_new_value: 75,
      p_user_id: 'user-uuid',
    })
  })

  it('invalidates related queries on success', async () => {
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useUpdateMilestone(), { wrapper })

    const payload: MilestoneUpdatePayload = {
      component_id: 'comp-1-uuid',
      milestone_name: 'Receive',
      value: true,
      user_id: 'user-uuid',
    }

    await act(async () => {
      await result.current.mutateAsync(payload)
    })

    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalled()
    })

    // Should invalidate drawing-level queries (not components, since we update it directly via setQueriesData)
    expect(invalidateQueriesSpy).not.toHaveBeenCalledWith({ queryKey: ['components'] })
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['drawing-progress'] })
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['drawings-with-progress'] })
  })

  it('shows error toast on failure', async () => {
    const { toast } = await import('sonner')
    const mockRpc = await getMockRpc(); mockRpc.mockResolvedValue({ data: null, error: new Error('Database error') })

    const { result } = renderHook(() => useUpdateMilestone(), { wrapper })

    const payload: MilestoneUpdatePayload = {
      component_id: 'comp-1-uuid',
      milestone_name: 'Receive',
      value: true,
      user_id: 'user-uuid',
    }

    await act(async () => {
      try {
        await result.current.mutateAsync(payload)
      } catch (error) {
        // Expected to throw
      }
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(toast.error).toHaveBeenCalled()
  })

  it('provides isPending state during mutation', async () => {
    // Make RPC slow to observe pending state
    const mockRpc = await getMockRpc(); mockRpc.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ data: mockSuccessResponse, error: null }), 100)))

    const { result } = renderHook(() => useUpdateMilestone(), { wrapper })

    const payload: MilestoneUpdatePayload = {
      component_id: 'comp-1-uuid',
      milestone_name: 'Receive',
      value: true,
      user_id: 'user-uuid',
    }

    act(() => {
      result.current.mutate(payload)
    })

    // Should be pending immediately
    expect(result.current.isPending).toBe(true)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.isPending).toBe(false)
  })

  it('handles component not found error', async () => {
    const mockRpc = await getMockRpc(); mockRpc.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'Component not found' },
    })

    const { result } = renderHook(() => useUpdateMilestone(), { wrapper })

    const payload: MilestoneUpdatePayload = {
      component_id: 'nonexistent-uuid',
      milestone_name: 'Receive',
      value: true,
      user_id: 'user-uuid',
    }

    await act(async () => {
      try {
        await result.current.mutateAsync(payload)
      } catch (error) {
        // Expected to throw
      }
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })

  it('handles permission denied error', async () => {
    const mockRpc = await getMockRpc(); mockRpc.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'Permission denied' },
    })

    const { result } = renderHook(() => useUpdateMilestone(), { wrapper })

    const payload: MilestoneUpdatePayload = {
      component_id: 'comp-1-uuid',
      milestone_name: 'Receive',
      value: true,
      user_id: 'user-uuid',
    }

    await act(async () => {
      try {
        await result.current.mutateAsync(payload)
      } catch (error) {
        // Expected to throw
      }
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })

  it('handles network error', async () => {
    const mockRpc = await getMockRpc(); mockRpc.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useUpdateMilestone(), { wrapper })

    const payload: MilestoneUpdatePayload = {
      component_id: 'comp-1-uuid',
      milestone_name: 'Receive',
      value: true,
      user_id: 'user-uuid',
    }

    await act(async () => {
      try {
        await result.current.mutateAsync(payload)
      } catch (error) {
        // Expected to throw
      }
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeDefined()
  })

  it('can be called multiple times sequentially', async () => {
    const { result } = renderHook(() => useUpdateMilestone(), { wrapper })

    const payload1: MilestoneUpdatePayload = {
      component_id: 'comp-1-uuid',
      milestone_name: 'Receive',
      value: true,
      user_id: 'user-uuid',
    }

    const payload2: MilestoneUpdatePayload = {
      component_id: 'comp-1-uuid',
      milestone_name: 'Install',
      value: true,
      user_id: 'user-uuid',
    }

    await act(async () => {
      await result.current.mutateAsync(payload1)
      await result.current.mutateAsync(payload2)
    })

    const mockRpc = await getMockRpc(); expect(mockRpc).toHaveBeenCalledTimes(2)
  })
})
