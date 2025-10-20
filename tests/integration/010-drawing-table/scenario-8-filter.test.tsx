/**
 * Integration Test: Scenario 8 - Filter by Progress Status
 * Feature: 010-let-s-spec
 *
 * Tests FR-026 (Status Filtering)
 *
 * Verifies:
 * - Status filter shows correct number of drawings based on avg_percent_complete
 * - "Not Started" shows only 0% drawings
 * - "In Progress" shows >0% and <100% drawings
 * - "Complete" shows only 100% drawings
 * - Filters combine with search correctly
 * - URL params sync properly (?status=in-progress)
 *
 * NOTE: This test focuses on the drawing COUNT rather than individual drawing visibility
 * because the DrawingTable uses virtualization which may not render all rows immediately.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DrawingComponentTablePage } from '@/pages/DrawingComponentTablePage'
import type { DrawingRow } from '@/types/drawing-table.types'

// ============================================================================
// Mock Data
// ============================================================================

const mockDrawings: DrawingRow[] = [
  {
    id: 'drawing-1',
    project_id: 'project-1',
    drawing_no_norm: 'P-001',
    drawing_no_raw: 'P-001',
    title: 'Main Process Line',
    rev: 'A',
    is_retired: false,
    total_components: 25,
    completed_components: 2,
    avg_percent_complete: 8, // In progress (>0% and <100%)
  },
  {
    id: 'drawing-2',
    project_id: 'project-1',
    drawing_no_norm: 'P-002',
    drawing_no_raw: 'P-002',
    title: 'Drain Line',
    rev: 'B',
    is_retired: false,
    total_components: 1,
    completed_components: 1,
    avg_percent_complete: 100, // Complete (100%)
  },
  {
    id: 'drawing-3',
    project_id: 'project-1',
    drawing_no_norm: 'P-003',
    drawing_no_raw: 'P-003',
    title: 'Utility Connection',
    rev: null,
    is_retired: false,
    total_components: 10,
    completed_components: 0,
    avg_percent_complete: 0, // Not started (0%)
  },
]

// ============================================================================
// Mocks
// ============================================================================

// Mock ProjectContext
vi.mock('@/contexts/ProjectContext', () => ({
  useProject: () => ({
    selectedProjectId: 'project-1',
    selectedProject: { id: 'project-1', name: 'Test Project' },
  }),
}))

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com' },
    session: { access_token: 'mock-token' },
  }),
}))

// Mock useDrawingsWithProgress hook
vi.mock('@/hooks/useDrawingsWithProgress', () => ({
  useDrawingsWithProgress: vi.fn(() => ({
    data: mockDrawings,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  })),
}))

// Mock useComponentsByDrawings hook
vi.mock('@/hooks/useComponentsByDrawings', () => ({
  useComponentsByDrawings: vi.fn(() => ({
    componentsMap: new Map(),
  })),
}))

// Mock useUpdateMilestone hook
vi.mock('@/hooks/useUpdateMilestone', () => ({
  useUpdateMilestone: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}))

// ============================================================================
// Helper Functions
// ============================================================================

function renderWithProviders(ui: React.ReactElement, initialUrl = '/component-progress') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialUrl]}>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  )
}

// ============================================================================
// Tests
// ============================================================================

describe('Scenario 8: Filter by Progress Status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Status Filter - In Progress', () => {
    it('shows only in-progress drawings (>0% and <100%)', async () => {
      renderWithProviders(
        <DrawingComponentTablePage />,
        '/component-progress?status=in-progress'
      )

      await waitFor(() => {
        expect(screen.getByText('Component Progress')).toBeInTheDocument()
      })

      // Counter should show 1 of 3 (only P-001 with 8% matches in-progress filter)
      await waitFor(() => {
        expect(screen.getByText(/Showing 1 of 3 drawings/i)).toBeInTheDocument()
      })
    })

    it('shows correct count with URL param ?status=in-progress', async () => {
      renderWithProviders(
        <DrawingComponentTablePage />,
        '/component-progress?status=in-progress'
      )

      await waitFor(() => {
        expect(screen.getByText(/Showing 1 of 3 drawings/i)).toBeInTheDocument()
      })
    })
  })

  describe('Status Filter - Complete', () => {
    it('shows only complete drawings (100%)', async () => {
      renderWithProviders(
        <DrawingComponentTablePage />,
        '/component-progress?status=complete'
      )

      await waitFor(() => {
        expect(screen.getByText('Component Progress')).toBeInTheDocument()
      })

      // Counter should show 1 of 3 (only P-002 with 100% matches complete filter)
      await waitFor(() => {
        expect(screen.getByText(/Showing 1 of 3 drawings/i)).toBeInTheDocument()
      })
    })

    it('shows correct count with URL param ?status=complete', async () => {
      renderWithProviders(
        <DrawingComponentTablePage />,
        '/component-progress?status=complete'
      )

      await waitFor(() => {
        expect(screen.getByText(/Showing 1 of 3 drawings/i)).toBeInTheDocument()
      })
    })
  })

  describe('Status Filter - Not Started', () => {
    it('shows only not-started drawings (0%)', async () => {
      renderWithProviders(
        <DrawingComponentTablePage />,
        '/component-progress?status=not-started'
      )

      await waitFor(() => {
        expect(screen.getByText('Component Progress')).toBeInTheDocument()
      })

      // Counter should show 1 of 3 (only P-003 with 0% matches not-started filter)
      await waitFor(() => {
        expect(screen.getByText(/Showing 1 of 3 drawings/i)).toBeInTheDocument()
      })
    })

    it('shows correct count with URL param ?status=not-started', async () => {
      renderWithProviders(
        <DrawingComponentTablePage />,
        '/component-progress?status=not-started'
      )

      await waitFor(() => {
        expect(screen.getByText(/Showing 1 of 3 drawings/i)).toBeInTheDocument()
      })
    })
  })

  describe('Status Filter - All', () => {
    it('shows all drawings when filter is "all"', async () => {
      renderWithProviders(
        <DrawingComponentTablePage />,
        '/component-progress?status=all'
      )

      await waitFor(() => {
        expect(screen.getByText('Component Progress')).toBeInTheDocument()
      })

      // Counter should show 3 of 3 (all drawings visible)
      await waitFor(() => {
        expect(screen.getByText(/Showing 3 of 3 drawings/i)).toBeInTheDocument()
      })
    })

    it('shows all drawings when no status param (default)', async () => {
      renderWithProviders(
        <DrawingComponentTablePage />,
        '/component-progress'
      )

      await waitFor(() => {
        expect(screen.getByText('Component Progress')).toBeInTheDocument()
      })

      // Counter should show 3 of 3 (default shows all)
      await waitFor(() => {
        expect(screen.getByText(/Showing 3 of 3 drawings/i)).toBeInTheDocument()
      })
    })

    it('defaults to showing all when status param is removed', async () => {
      renderWithProviders(
        <DrawingComponentTablePage />,
        '/component-progress'
      )

      await waitFor(() => {
        expect(screen.getByText(/Showing 3 of 3 drawings/i)).toBeInTheDocument()
      })
    })
  })

  describe('Combined Search + Status Filter', () => {
    it('applies both search and status filters together', async () => {
      renderWithProviders(
        <DrawingComponentTablePage />,
        '/component-progress?search=P-001&status=in-progress'
      )

      await waitFor(() => {
        expect(screen.getByText('Component Progress')).toBeInTheDocument()
      })

      // Counter should show 1 of 3 (only P-001 matches both filters)
      await waitFor(() => {
        expect(screen.getByText(/Showing 1 of 3 drawings/i)).toBeInTheDocument()
      })
    })

    it('shows 0 when filters have no matches', async () => {
      renderWithProviders(
        <DrawingComponentTablePage />,
        '/component-progress?search=P-002&status=not-started'
      )

      await waitFor(() => {
        expect(screen.getByText('Component Progress')).toBeInTheDocument()
      })

      // Should show empty state (P-002 is complete 100%, not not-started 0%)
      // The page will show EmptyDrawingsState component
      await waitFor(() => {
        const counter = screen.queryByText(/Showing \d+ of \d+ drawings/i)
        // When empty, the counter won't display or will show "Showing 0 of 3 drawings"
        expect(
          counter === null || counter.textContent?.includes('0 of')
        ).toBe(true)
      })
    })

    it('search filters within status-filtered results', async () => {
      renderWithProviders(
        <DrawingComponentTablePage />,
        '/component-progress?search=P-&status=in-progress'
      )

      await waitFor(() => {
        expect(screen.getByText('Component Progress')).toBeInTheDocument()
      })

      // Counter should show 1 of 3 (only P-001 matches both filters)
      // Search "P-" matches all, but status filter reduces to in-progress only (P-001)
      await waitFor(() => {
        expect(screen.getByText(/Showing 1 of 3 drawings/i)).toBeInTheDocument()
      })
    })
  })

  describe('Status Filter Logic Validation', () => {
    it('not-started filter logic: avg_percent_complete === 0', async () => {
      renderWithProviders(
        <DrawingComponentTablePage />,
        '/component-progress?status=not-started'
      )

      // Only drawings with exactly 0% should be counted
      await waitFor(() => {
        expect(screen.getByText(/Showing 1 of 3 drawings/i)).toBeInTheDocument()
      })
    })

    it('in-progress filter logic: 0 < avg_percent_complete < 100', async () => {
      renderWithProviders(
        <DrawingComponentTablePage />,
        '/component-progress?status=in-progress'
      )

      // Only drawings with >0% and <100% should be counted
      await waitFor(() => {
        expect(screen.getByText(/Showing 1 of 3 drawings/i)).toBeInTheDocument()
      })
    })

    it('complete filter logic: avg_percent_complete === 100', async () => {
      renderWithProviders(
        <DrawingComponentTablePage />,
        '/component-progress?status=complete'
      )

      // Only drawings with exactly 100% should be counted
      await waitFor(() => {
        expect(screen.getByText(/Showing 1 of 3 drawings/i)).toBeInTheDocument()
      })
    })

    it('all filter logic: no filtering applied', async () => {
      renderWithProviders(
        <DrawingComponentTablePage />,
        '/component-progress?status=all'
      )

      // All drawings should be counted
      await waitFor(() => {
        expect(screen.getByText(/Showing 3 of 3 drawings/i)).toBeInTheDocument()
      })
    })
  })

  describe('Filter UI Interaction', () => {
    it('renders status filter dropdown', async () => {
      renderWithProviders(<DrawingComponentTablePage />)

      await waitFor(() => {
        expect(screen.getByText('Component Progress')).toBeInTheDocument()
      })

      // Status filter dropdown should be present (combobox role from Radix Select)
      const filterDropdown = screen.getByRole('combobox', { name: /filter by status/i })
      expect(filterDropdown).toBeInTheDocument()
      expect(filterDropdown).toHaveTextContent('All Drawings')
    })

    it('shows drawing count when filtered', async () => {
      renderWithProviders(
        <DrawingComponentTablePage />,
        '/component-progress?status=in-progress'
      )

      await waitFor(() => {
        expect(screen.getByText('Component Progress')).toBeInTheDocument()
      })

      // Should show "Showing 1 of 3 drawings"
      expect(screen.getByText(/Showing 1 of 3 drawings/i)).toBeInTheDocument()
    })

    it('shows correct filter value in dropdown', async () => {
      renderWithProviders(
        <DrawingComponentTablePage />,
        '/component-progress?status=in-progress'
      )

      await waitFor(() => {
        expect(screen.getByText(/Showing 1 of 3 drawings/i)).toBeInTheDocument()
      })

      // Status dropdown should show current filter value
      const filterDropdown = screen.getByRole('combobox', { name: /filter by status/i })
      expect(filterDropdown).toHaveTextContent('In Progress (>0%)')
    })
  })

  describe('Edge Cases', () => {
    it('handles drawings with exactly 0% progress', async () => {
      renderWithProviders(
        <DrawingComponentTablePage />,
        '/component-progress?status=not-started'
      )

      await waitFor(() => {
        expect(screen.getByText(/Showing 1 of 3 drawings/i)).toBeInTheDocument()
      })
    })

    it('handles drawings with exactly 100% progress', async () => {
      renderWithProviders(
        <DrawingComponentTablePage />,
        '/component-progress?status=complete'
      )

      await waitFor(() => {
        expect(screen.getByText(/Showing 1 of 3 drawings/i)).toBeInTheDocument()
      })
    })

    it('handles drawings with partial progress (1-99%)', async () => {
      renderWithProviders(
        <DrawingComponentTablePage />,
        '/component-progress?status=in-progress'
      )

      await waitFor(() => {
        expect(screen.getByText(/Showing 1 of 3 drawings/i)).toBeInTheDocument()
      })

      // 8% should be classified as "in-progress"
    })

    it('handles invalid status param (defaults to "all")', async () => {
      renderWithProviders(
        <DrawingComponentTablePage />,
        '/component-progress?status=invalid-status'
      )

      await waitFor(() => {
        expect(screen.getByText('Component Progress')).toBeInTheDocument()
      })

      // Should default to showing all drawings (3 of 3)
      await waitFor(() => {
        expect(screen.getByText(/Showing 3 of 3 drawings/i)).toBeInTheDocument()
      })
    })

    it('handles URL with multiple query params', async () => {
      renderWithProviders(
        <DrawingComponentTablePage />,
        '/component-progress?status=in-progress&expanded=drawing-1'
      )

      await waitFor(() => {
        expect(screen.getByText(/Showing 1 of 3 drawings/i)).toBeInTheDocument()
      })

      // Status filter should work alongside other query params
    })
  })
})
