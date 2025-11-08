import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { useMilestoneHistory } from './useMilestoneHistory'
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              data: [
                {
                  id: 'event-1',
                  component_id: 'comp-1',
                  milestone_name: 'Install',
                  old_value: false,
                  new_value: true,
                  timestamp: '2025-10-31T12:00:00Z',
                  user_id: 'user-1',
                  user: { email: 'test@example.com', full_name: 'Test User' }
                }
              ],
              error: null
            }))
          }))
        }))
      }))
    }))
  }
}))

describe('useMilestoneHistory', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
  })

  const createWrapper = () => {
    return ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children)
  }

  it('fetches milestone history for component', async () => {
    const { result } = renderHook(() => useMilestoneHistory('comp-1'), {
      wrapper: createWrapper()
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(1)
    expect(result.current.data?.[0].milestone_name).toBe('Install')
    expect(result.current.data?.[0].user?.email).toBe('test@example.com')
  })

  it('handles errors gracefully', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              data: null,
              error: { message: 'Database error' }
            }))
          }))
        }))
      }))
    } as any)

    const { result } = renderHook(() => useMilestoneHistory('comp-1'), {
      wrapper: createWrapper()
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toContain('Failed to fetch milestone history')
  })
})
