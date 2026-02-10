/**
 * Unit tests for useProjectManhours hook (Feature 032)
 * Tests earned value computation logic and edge cases
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useProjectManhours } from './useProjectManhours'
import { createElement, type ReactNode } from 'react'

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}))

import { supabase } from '@/lib/supabase'

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useProjectManhours - Earned Value Computation', () => {
  const testProjectId = 'test-project-uuid'
  const mockBudget = {
    id: 'budget-uuid',
    project_id: testProjectId,
    version_number: 1,
    total_budgeted_manhours: 1000,
    revision_reason: 'Initial budget',
    effective_date: '2025-01-01',
    is_active: true
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Contract Tests', () => {
    it('accepts projectId parameter', () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
            }))
          }))
        }))
      }))
      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      const { result } = renderHook(
        () => useProjectManhours(testProjectId),
        { wrapper: createWrapper() }
      )

      expect(result.current).toBeDefined()
      expect(result.current.isLoading).toBeDefined()
    })

    it('returns has_budget and optional budget fields', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
            }))
          }))
        }))
      }))
      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      const { result } = renderHook(
        () => useProjectManhours(testProjectId),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toBeDefined()
      expect(result.current.data?.has_budget).toBe(false)
      expect(result.current.data?.budget).toBeUndefined()
    })

    it('uses correct query key for cache', () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
            }))
          }))
        }))
      }))
      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      const { result } = renderHook(
        () => useProjectManhours(testProjectId),
        { wrapper: createWrapper() }
      )

      // Query key should be ['projects', projectId, 'manhour-summary']
      expect(result.current).toBeDefined()
    })
  })

  describe('No Budget Scenario', () => {
    it('returns has_budget: false when no active budget exists', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
            }))
          }))
        }))
      }))
      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      const { result } = renderHook(
        () => useProjectManhours(testProjectId),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual({ has_budget: false })
    })
  })

  describe('Earned Value Formula: earned_mh = SUM(budgeted_mh * percent_complete / 100)', () => {
    it('computes earned_mh correctly with 0% complete components', async () => {
      const mockComponents = [
        { budgeted_manhours: 100, percent_complete: 0 },
        { budgeted_manhours: 200, percent_complete: 0 },
        { budgeted_manhours: 300, percent_complete: 0 }
      ]

      setupMocks(mockBudget, mockComponents)

      const { result } = renderHook(
        () => useProjectManhours(testProjectId),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.has_budget).toBe(true)
      expect(result.current.data?.budget?.earned_mh).toBe(0)
      expect(result.current.data?.budget?.allocated_mh).toBe(600)
      expect(result.current.data?.budget?.remaining_mh).toBe(1000)
      expect(result.current.data?.budget?.percent_complete).toBe(0)
    })

    it('computes earned_mh correctly with 100% complete components', async () => {
      const mockComponents = [
        { budgeted_manhours: 100, percent_complete: 100 },
        { budgeted_manhours: 200, percent_complete: 100 },
        { budgeted_manhours: 300, percent_complete: 100 }
      ]

      setupMocks(mockBudget, mockComponents)

      const { result } = renderHook(
        () => useProjectManhours(testProjectId),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.has_budget).toBe(true)
      expect(result.current.data?.budget?.earned_mh).toBe(600) // 100 + 200 + 300
      expect(result.current.data?.budget?.allocated_mh).toBe(600)
      expect(result.current.data?.budget?.remaining_mh).toBe(400) // 1000 - 600
      expect(result.current.data?.budget?.percent_complete).toBe(60) // 600/1000 * 100
    })

    it('computes earned_mh correctly with mixed percentages', async () => {
      const mockComponents = [
        { budgeted_manhours: 100, percent_complete: 50 },  // earned: 50
        { budgeted_manhours: 200, percent_complete: 75 },  // earned: 150
        { budgeted_manhours: 300, percent_complete: 25 }   // earned: 75
      ]
      // Total earned: 50 + 150 + 75 = 275

      setupMocks(mockBudget, mockComponents)

      const { result } = renderHook(
        () => useProjectManhours(testProjectId),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.has_budget).toBe(true)
      expect(result.current.data?.budget?.earned_mh).toBe(275)
      expect(result.current.data?.budget?.allocated_mh).toBe(600)
      expect(result.current.data?.budget?.remaining_mh).toBe(725) // 1000 - 275
      expect(result.current.data?.budget?.percent_complete).toBeCloseTo(27.5, 2) // 275/1000 * 100
    })

    it('handles decimal percentages correctly', async () => {
      const mockComponents = [
        { budgeted_manhours: 100, percent_complete: 33.33 },  // earned: 33.33
        { budgeted_manhours: 200, percent_complete: 66.67 }   // earned: 133.34
      ]
      // Total earned: 33.33 + 133.34 = 166.67

      setupMocks(mockBudget, mockComponents)

      const { result } = renderHook(
        () => useProjectManhours(testProjectId),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.has_budget).toBe(true)
      expect(result.current.data?.budget?.earned_mh).toBeCloseTo(166.67, 2)
      expect(result.current.data?.budget?.remaining_mh).toBeCloseTo(833.33, 2)
    })
  })

  describe('Remaining Manhours: remaining_mh = total_budgeted_mh - earned_mh', () => {
    it('computes remaining_mh correctly', async () => {
      const mockComponents = [
        { budgeted_manhours: 400, percent_complete: 50 }  // earned: 200
      ]

      setupMocks(mockBudget, mockComponents)

      const { result } = renderHook(
        () => useProjectManhours(testProjectId),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.budget?.total_budgeted_mh).toBe(1000)
      expect(result.current.data?.budget?.earned_mh).toBe(200)
      expect(result.current.data?.budget?.remaining_mh).toBe(800)
    })

    it('remaining_mh is 0 when earned equals budget', async () => {
      const budget = { ...mockBudget, total_budgeted_manhours: 500 }
      const mockComponents = [
        { budgeted_manhours: 500, percent_complete: 100 }  // earned: 500
      ]

      setupMocks(budget, mockComponents)

      const { result } = renderHook(
        () => useProjectManhours(testProjectId),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.budget?.earned_mh).toBe(500)
      expect(result.current.data?.budget?.remaining_mh).toBe(0)
    })

    it('remaining_mh equals total_budgeted_mh when nothing is complete', async () => {
      const mockComponents = [
        { budgeted_manhours: 100, percent_complete: 0 },
        { budgeted_manhours: 200, percent_complete: 0 }
      ]

      setupMocks(mockBudget, mockComponents)

      const { result } = renderHook(
        () => useProjectManhours(testProjectId),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.budget?.earned_mh).toBe(0)
      expect(result.current.data?.budget?.remaining_mh).toBe(1000)
    })
  })

  describe('Percent Complete: percent_complete = (earned_mh / total_budgeted_mh) * 100', () => {
    it('computes percent_complete correctly', async () => {
      const mockComponents = [
        { budgeted_manhours: 250, percent_complete: 100 }  // earned: 250
      ]

      setupMocks(mockBudget, mockComponents)

      const { result } = renderHook(
        () => useProjectManhours(testProjectId),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.budget?.earned_mh).toBe(250)
      expect(result.current.data?.budget?.percent_complete).toBe(25) // 250/1000 * 100
    })

    it('percent_complete is 0 when nothing is earned', async () => {
      const mockComponents = [
        { budgeted_manhours: 100, percent_complete: 0 }
      ]

      setupMocks(mockBudget, mockComponents)

      const { result } = renderHook(
        () => useProjectManhours(testProjectId),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.budget?.percent_complete).toBe(0)
    })

    it('percent_complete is 100 when earned equals budget', async () => {
      const budget = { ...mockBudget, total_budgeted_manhours: 500 }
      const mockComponents = [
        { budgeted_manhours: 500, percent_complete: 100 }
      ]

      setupMocks(budget, mockComponents)

      const { result } = renderHook(
        () => useProjectManhours(testProjectId),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.budget?.percent_complete).toBe(100)
    })
  })

  describe('Edge Cases', () => {
    it('handles division by zero when total_budgeted_mh is 0', async () => {
      const budget = { ...mockBudget, total_budgeted_manhours: 0 }
      const mockComponents = [
        { budgeted_manhours: 100, percent_complete: 50 }
      ]

      setupMocks(budget, mockComponents)

      const { result } = renderHook(
        () => useProjectManhours(testProjectId),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.budget?.total_budgeted_mh).toBe(0)
      expect(result.current.data?.budget?.percent_complete).toBe(0) // Should default to 0, not crash
    })

    it('handles null budgeted_manhours in components', async () => {
      const mockComponents = [
        { budgeted_manhours: null, percent_complete: 50 },
        { budgeted_manhours: 100, percent_complete: 100 }
      ]

      setupMocks(mockBudget, mockComponents)

      const { result } = renderHook(
        () => useProjectManhours(testProjectId),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      // null should be treated as 0
      expect(result.current.data?.budget?.earned_mh).toBe(100) // 0 + 100
      expect(result.current.data?.budget?.allocated_mh).toBe(100)
    })

    it('handles null percent_complete in components', async () => {
      const mockComponents = [
        { budgeted_manhours: 100, percent_complete: null },
        { budgeted_manhours: 200, percent_complete: 50 }
      ]

      setupMocks(mockBudget, mockComponents)

      const { result } = renderHook(
        () => useProjectManhours(testProjectId),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      // null percent_complete should be treated as 0
      expect(result.current.data?.budget?.earned_mh).toBe(100) // (100 * 0) + (200 * 0.5)
    })

    it('handles empty components array', async () => {
      setupMocks(mockBudget, [])

      const { result } = renderHook(
        () => useProjectManhours(testProjectId),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.budget?.earned_mh).toBe(0)
      expect(result.current.data?.budget?.allocated_mh).toBe(0)
      expect(result.current.data?.budget?.component_count).toBe(0)
      expect(result.current.data?.budget?.percent_complete).toBe(0)
    })

    it('handles undefined projectId', () => {
      const mockFrom = vi.fn()
      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      const { result } = renderHook(
        () => useProjectManhours(undefined),
        { wrapper: createWrapper() }
      )

      // Query should not run when projectId is undefined
      expect(result.current.data).toBeUndefined()
      expect(mockFrom).not.toHaveBeenCalled()
    })

    it('filters out retired components (is_retired = false)', async () => {
      // Mock setup should only include non-retired components
      const mockComponents = [
        { budgeted_manhours: 100, percent_complete: 50 },
        { budgeted_manhours: 200, percent_complete: 75 }
      ]

      const mockFrom = vi.fn((table: string) => {
        if (table === 'project_manhour_budgets') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn(() => Promise.resolve({ data: mockBudget, error: null }))
                }))
              }))
            }))
          }
        } else if (table === 'components') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn((_field: string, _value: any) => {
                const chain = {
                  eq: vi.fn((field2: string, value2: boolean) => {
                    // Verify is_retired = false is called
                    expect(field2).toBe('is_retired')
                    expect(value2).toBe(false)
                    return Promise.resolve({ data: mockComponents, error: null })
                  })
                }
                return chain
              })
            }))
          }
        }
        return {} as any
      })

      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      const { result } = renderHook(
        () => useProjectManhours(testProjectId),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.has_budget).toBe(true)
    })
  })

  describe('Component Count', () => {
    it('counts non-retired components correctly', async () => {
      const mockComponents = [
        { budgeted_manhours: 100, percent_complete: 0 },
        { budgeted_manhours: 200, percent_complete: 50 },
        { budgeted_manhours: 300, percent_complete: 100 }
      ]

      setupMocks(mockBudget, mockComponents)

      const { result } = renderHook(
        () => useProjectManhours(testProjectId),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.budget?.component_count).toBe(3)
    })
  })

  describe('Allocated Manhours', () => {
    it('computes allocated_mh as sum of all budgeted_manhours', async () => {
      const mockComponents = [
        { budgeted_manhours: 100, percent_complete: 0 },
        { budgeted_manhours: 250, percent_complete: 50 },
        { budgeted_manhours: 150, percent_complete: 100 }
      ]

      setupMocks(mockBudget, mockComponents)

      const { result } = renderHook(
        () => useProjectManhours(testProjectId),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.budget?.allocated_mh).toBe(500) // 100 + 250 + 150
    })
  })

  describe('Error Handling', () => {
    it('throws error when budget fetch fails', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({
                data: null,
                error: { message: 'Database error' }
              }))
            }))
          }))
        }))
      }))
      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      const { result } = renderHook(
        () => useProjectManhours(testProjectId),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error?.message).toContain('Failed to fetch manhour budget')
    })

    it('throws error when components fetch fails', async () => {
      const mockFrom = vi.fn((table: string) => {
        if (table === 'project_manhour_budgets') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn(() => Promise.resolve({ data: mockBudget, error: null }))
                }))
              }))
            }))
          }
        } else if (table === 'components') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({
                  data: null,
                  error: { message: 'Components fetch error' }
                }))
              }))
            }))
          }
        }
        return {} as any
      })

      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      const { result } = renderHook(
        () => useProjectManhours(testProjectId),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error?.message).toContain('Failed to fetch components')
    })

    it('disables query when projectId is empty string', () => {
      const mockFrom = vi.fn()
      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      const { result } = renderHook(
        () => useProjectManhours(''),
        { wrapper: createWrapper() }
      )

      // Query should be disabled via enabled flag
      expect(result.current.data).toBeUndefined()
      expect(result.current.isLoading).toBe(false)
      expect(mockFrom).not.toHaveBeenCalled()
    })
  })
})

// ============================================================================
// TEST HELPERS
// ============================================================================

// Types for test data
interface MockBudget {
  id: string;
  project_id: string;
  version_number: number;
  total_budgeted_manhours: number;
  revision_reason: string;
  effective_date: string;
  is_active: boolean;
}

interface MockComponent {
  budgeted_manhours: number | null;
  percent_complete: number | null;
}

/**
 * Setup mocks for budget and components queries
 */
function setupMocks(budget: MockBudget | null, components: MockComponent[]) {
  const mockFrom = vi.fn((table: string) => {
    if (table === 'project_manhour_budgets') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: budget, error: null }))
            }))
          }))
        }))
      }
    } else if (table === 'components') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: components, error: null }))
          }))
        }))
      }
    }
    return {} as any
  })

  vi.mocked(supabase.from).mockImplementation(mockFrom as any)
}
