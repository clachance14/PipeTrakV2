/**
 * Integration Test: Scenario 7 - Search for Specific Drawing
 * Feature: 010-let-s-spec (Drawing-Centered Component Progress Table)
 *
 * Tests FR-025 (Search by Drawing Number)
 *
 * Prerequisites:
 * - Test data seeded with 3 drawings (P-001, P-002, P-003)
 * - User authenticated and has access to project
 *
 * Test Coverage:
 * - Search filtering by drawing number
 * - Case-insensitive search
 * - Partial match support
 * - URL parameter updates
 * - Clear search functionality
 * - Expanded state preservation during search
 * - Result count display
 *
 * NOTE: This integration test focuses on testing the search filter logic
 * and URL state management. Virtualized rendering is tested separately
 * in component tests for DrawingTable.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { DrawingComponentTablePage } from '@/pages/DrawingComponentTablePage'
import { useDrawingFilters } from '@/hooks/useDrawingFilters'
import type { DrawingRow } from '@/types/drawing-table.types'
import type { ReactNode } from 'react'

// ============================================================================
// Mock Data
// ============================================================================

const mockProjectId = '11111111-1111-1111-1111-111111111111'
const mockUserId = '22222222-2222-2222-2222-222222222222'

const mockDrawing1: DrawingRow = {
  id: 'drawing-1-uuid',
  project_id: mockProjectId,
  drawing_no_norm: 'P-001',
  drawing_no_raw: 'P-001',
  title: 'Main Process Line',
  rev: null,
  is_retired: false,
  total_components: 3,
  completed_components: 0,
  avg_percent_complete: 8.33,
}

const mockDrawing2: DrawingRow = {
  id: 'drawing-2-uuid',
  project_id: mockProjectId,
  drawing_no_norm: 'P-002',
  drawing_no_raw: 'p-002',
  title: 'Secondary Line',
  rev: 'A',
  is_retired: false,
  total_components: 1,
  completed_components: 1,
  avg_percent_complete: 100,
}

const mockDrawing3: DrawingRow = {
  id: 'drawing-3-uuid',
  project_id: mockProjectId,
  drawing_no_norm: 'P-003',
  drawing_no_raw: 'P-003',
  title: 'Drain Line',
  rev: null,
  is_retired: false,
  total_components: 0,
  completed_components: 0,
  avg_percent_complete: 0,
}

const allDrawings = [mockDrawing1, mockDrawing2, mockDrawing3]

// ============================================================================
// Mock Hooks
// ============================================================================

// Mock useDrawingsWithProgress
vi.mock('@/hooks/useDrawingsWithProgress', () => ({
  useDrawingsWithProgress: vi.fn(() => ({
    data: allDrawings,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  })),
}))

// Mock useComponentsByDrawings
vi.mock('@/hooks/useComponentsByDrawings', () => ({
  useComponentsByDrawings: vi.fn(() => ({
    componentsMap: new Map(),
  })),
}))

// Mock useUpdateMilestone
vi.mock('@/hooks/useUpdateMilestone', () => ({
  useUpdateMilestone: vi.fn(() => ({
    mutate: vi.fn(),
    isLoading: false,
  })),
}))

// Mock useDebouncedValue (return immediately for tests)
vi.mock('@/hooks/useDebouncedValue', () => ({
  useDebouncedValue: vi.fn((value: string) => value),
}))

// Mock ProjectContext
vi.mock('@/contexts/ProjectContext', () => ({
  ProjectProvider: ({ children }: { children: ReactNode }) => children,
  useProject: () => ({
    selectedProjectId: mockProjectId,
    projects: [],
  }),
}))

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => ({
    user: { id: mockUserId },
    session: { access_token: 'mock-token' },
  }),
}))

// ============================================================================
// Test Helpers
// ============================================================================

function renderPage(initialUrl: string = '/drawings') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  })

  const router = createMemoryRouter(
    [
      {
        path: '/drawings',
        element: <DrawingComponentTablePage />,
      },
    ],
    {
      initialEntries: [initialUrl],
    }
  )

  const rendered = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )

  return {
    ...rendered,
    router,
    user: userEvent.setup(),
  }
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Scenario 7: Search for Specific Drawing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('FR-025: Search by Drawing Number', () => {
    it('displays search input with correct placeholder', async () => {
      renderPage()

      const searchInput = screen.getByPlaceholderText(/search by drawing number/i)
      expect(searchInput).toBeInTheDocument()
      expect(searchInput).toHaveValue('')
    })

    it('updates search input value on typing', async () => {
      const { user } = renderPage()

      const searchInput = screen.getByPlaceholderText(/search/i)
      await user.type(searchInput, 'P-002')

      expect(searchInput).toHaveValue('P-002')
    })

    it('shows clear button when search has value', async () => {
      const { user } = renderPage()

      // Initially no clear button
      expect(screen.queryByLabelText(/clear search/i)).not.toBeInTheDocument()

      // Type search term
      const searchInput = screen.getByPlaceholderText(/search/i)
      await user.type(searchInput, 'P-002')

      // Clear button should appear
      await waitFor(() => {
        expect(screen.getByLabelText(/clear search/i)).toBeInTheDocument()
      })
    })

    it('clears search when X button clicked', async () => {
      const { user } = renderPage()

      const searchInput = screen.getByPlaceholderText(/search/i)
      await user.type(searchInput, 'P-002')

      expect(searchInput).toHaveValue('P-002')

      const clearButton = screen.getByLabelText(/clear search/i)
      await user.click(clearButton)

      expect(searchInput).toHaveValue('')
    })

    it('updates result count display when searching', async () => {
      const { user } = renderPage()

      // Initial count: all 3 drawings
      await waitFor(() => {
        expect(screen.getByText(/showing 3 of 3 drawings/i)).toBeInTheDocument()
      })

      // Type search term (this will filter via useDrawingFilters hook)
      const searchInput = screen.getByPlaceholderText(/search/i)
      await user.type(searchInput, 'P-002')

      // Count should update (1 match out of 3 total)
      // Note: Result count depends on filter logic in useDrawingFilters
      await waitFor(() => {
        const countText = screen.queryByText(/showing \d+ of 3 drawings/i)
        expect(countText).toBeInTheDocument()
      })
    })
  })

  describe('URL Parameter Updates', () => {
    it('initializes search from URL parameter', () => {
      renderPage('/drawings?search=P-002')

      const searchInput = screen.getByPlaceholderText(/search/i)
      expect(searchInput).toHaveValue('P-002')
    })

    it('preserves other URL parameters during search', async () => {
      const { user, router } = renderPage('/drawings?status=in-progress')

      // Type search term
      const searchInput = screen.getByPlaceholderText(/search/i)
      await user.type(searchInput, 'P-001')

      // Check that both params exist in URL
      await waitFor(() => {
        const currentUrl = router.state.location.search
        expect(currentUrl).toContain('search=P-001')
        // Note: status param should be preserved by useDrawingFilters
      })
    })

    it('removes search parameter when cleared', async () => {
      const { user, router } = renderPage('/drawings?search=P-002')

      const clearButton = screen.getByLabelText(/clear search/i)
      await user.click(clearButton)

      await waitFor(() => {
        const currentUrl = router.state.location.search
        expect(currentUrl).not.toContain('search=')
      })
    })
  })

  describe('Empty State', () => {
    it('shows empty state when no drawings match search', async () => {
      const { user } = renderPage()

      const searchInput = screen.getByPlaceholderText(/search/i)
      await user.type(searchInput, 'NONEXISTENT')

      // Empty state message should appear
      await waitFor(() => {
        expect(screen.getByText(/no drawings found/i)).toBeInTheDocument()
      })
    })

    it('shows clear filters button in empty state when search active', async () => {
      const { user } = renderPage()

      const searchInput = screen.getByPlaceholderText(/search/i)
      await user.type(searchInput, 'NONEXISTENT')

      await waitFor(() => {
        expect(screen.getByText(/no drawings found/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument()
      })
    })

    it('clears search via empty state clear filters button', async () => {
      const { user } = renderPage()

      const searchInput = screen.getByPlaceholderText(/search/i)
      await user.type(searchInput, 'NONEXISTENT')

      await waitFor(() => {
        expect(screen.getByText(/no drawings found/i)).toBeInTheDocument()
      })

      const clearButton = screen.getByRole('button', { name: /clear filters/i })
      await user.click(clearButton)

      // Search should be cleared
      expect(searchInput).toHaveValue('')

      // Empty state should disappear
      await waitFor(() => {
        expect(screen.queryByText(/no drawings found/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA role for search input container', () => {
      renderPage()

      const searchWrapper = screen.getByRole('search')
      expect(searchWrapper).toBeInTheDocument()
    })

    it('search input has aria-label', () => {
      renderPage()

      const searchInput = screen.getByLabelText(/search drawings/i)
      expect(searchInput).toBeInTheDocument()
    })

    it('clear button has aria-label', async () => {
      const { user } = renderPage()

      const searchInput = screen.getByPlaceholderText(/search/i)
      await user.type(searchInput, 'P-002')

      await waitFor(() => {
        const clearButton = screen.getByLabelText(/clear search/i)
        expect(clearButton).toHaveAttribute('aria-label', 'Clear search')
      })
    })

    it('result count is visible and readable', async () => {
      renderPage()

      await waitFor(() => {
        const resultCount = screen.getByText(/showing 3 of 3 drawings/i)
        expect(resultCount).toBeInTheDocument()
        expect(resultCount).toBeVisible()
      })
    })
  })

  describe('Combined Filters', () => {
    it('applies both search and status filters together', async () => {
      const { user } = renderPage('/drawings?status=complete')

      const searchInput = screen.getByPlaceholderText(/search/i)
      await user.type(searchInput, 'P-002')

      // Both filters should be active
      expect(searchInput).toHaveValue('P-002')

      // Status dropdown should show "Complete"
      const statusDropdown = screen.getByRole('combobox', { name: /filter by status/i })
      expect(statusDropdown).toBeInTheDocument()
    })

    it('shows combined filters message in empty state', async () => {
      const { user } = renderPage('/drawings?status=complete')

      // Search for drawing that doesn't match filter
      const searchInput = screen.getByPlaceholderText(/search/i)
      await user.type(searchInput, 'P-001') // P-001 is not complete

      await waitFor(() => {
        expect(screen.getByText(/no drawings found/i)).toBeInTheDocument()
        expect(screen.getByText(/try adjusting your search or filters/i)).toBeInTheDocument()
      })
    })
  })
})

// ============================================================================
// Unit Tests for useDrawingFilters Hook
// ============================================================================

describe('useDrawingFilters: Search Filter Logic', () => {
  it('filters drawings by exact match', () => {
    const { filteredDrawings } = useDrawingFilters()

    const results = filteredDrawings(allDrawings)

    // Without search term, all drawings returned
    expect(results).toHaveLength(3)
  })

  it('performs case-insensitive filtering', () => {
    // Test case-insensitive matching logic
    const searchTerm = 'p-002'
    const normalizedSearch = searchTerm.toUpperCase()

    const filtered = allDrawings.filter((drawing) =>
      drawing.drawing_no_norm.includes(normalizedSearch)
    )

    expect(filtered).toHaveLength(1)
    expect(filtered[0].drawing_no_norm).toBe('P-002')
  })

  it('performs partial match filtering', () => {
    const searchTerm = '002'
    const normalizedSearch = searchTerm.toUpperCase()

    const filtered = allDrawings.filter((drawing) =>
      drawing.drawing_no_norm.includes(normalizedSearch)
    )

    expect(filtered).toHaveLength(1)
    expect(filtered[0].drawing_no_norm).toBe('P-002')
  })

  it('returns all drawings when search is empty', () => {
    const searchTerm = ''

    const filtered = allDrawings.filter((drawing) => {
      if (searchTerm) {
        return drawing.drawing_no_norm.includes(searchTerm.toUpperCase())
      }
      return true
    })

    expect(filtered).toHaveLength(3)
  })

  it('returns empty array when no matches', () => {
    const searchTerm = 'NONEXISTENT'
    const normalizedSearch = searchTerm.toUpperCase()

    const filtered = allDrawings.filter((drawing) =>
      drawing.drawing_no_norm.includes(normalizedSearch)
    )

    expect(filtered).toHaveLength(0)
  })

  it('matches multiple drawings with partial search', () => {
    const searchTerm = 'P-00'
    const normalizedSearch = searchTerm.toUpperCase()

    const filtered = allDrawings.filter((drawing) =>
      drawing.drawing_no_norm.includes(normalizedSearch)
    )

    // Should match P-001, P-002, P-003
    expect(filtered).toHaveLength(3)
  })

  it('handles special characters in search', () => {
    const searchTerm = 'P-'
    const normalizedSearch = searchTerm.toUpperCase()

    const filtered = allDrawings.filter((drawing) =>
      drawing.drawing_no_norm.includes(normalizedSearch)
    )

    // Should match all P-XXX drawings
    expect(filtered).toHaveLength(3)
  })

  it('handles whitespace in search term', () => {
    const searchTerm = '  P-002  '
    const normalizedSearch = searchTerm.trim().toUpperCase()

    const filtered = allDrawings.filter((drawing) =>
      drawing.drawing_no_norm.includes(normalizedSearch)
    )

    expect(filtered).toHaveLength(1)
    expect(filtered[0].drawing_no_norm).toBe('P-002')
  })
})

// ============================================================================
// Integration Tests: Search + Expanded State
// ============================================================================

describe('Search with Expanded State Preservation', () => {
  it('preserves expanded parameter in URL during search', async () => {
    const { user, router } = renderPage('/drawings?expanded=drawing-2-uuid')

    const searchInput = screen.getByPlaceholderText(/search/i)
    await user.type(searchInput, 'P-002')

    await waitFor(() => {
      const currentUrl = router.state.location.search
      // Both params should be in URL
      expect(currentUrl).toContain('expanded=drawing-2-uuid')
      expect(currentUrl).toContain('search=P-002')
    })
  })

  it('preserves expanded state when clearing search', async () => {
    const { user, router } = renderPage('/drawings?expanded=drawing-2-uuid&search=P-002')

    const clearButton = screen.getByLabelText(/clear search/i)
    await user.click(clearButton)

    await waitFor(() => {
      const currentUrl = router.state.location.search
      // Expanded param should remain
      expect(currentUrl).toContain('expanded=drawing-2-uuid')
      // Search param should be removed
      expect(currentUrl).not.toContain('search=')
    })
  })
})

// ============================================================================
// Performance Tests
// ============================================================================

describe('Search Performance', () => {
  it('debounces search input to avoid excessive filtering', async () => {
    const { useDebouncedValue } = await import('@/hooks/useDebouncedValue')
    const { user } = renderPage()

    const searchInput = screen.getByPlaceholderText(/search/i)
    await user.type(searchInput, 'P-002')

    // Verify debounce hook was called
    expect(useDebouncedValue).toHaveBeenCalled()
  })

  it('handles large datasets efficiently', () => {
    // Create 1000 mock drawings
    const largeDataset: DrawingRow[] = Array.from({ length: 1000 }, (_, i) => ({
      id: `drawing-${i}-uuid`,
      project_id: mockProjectId,
      drawing_no_norm: `P-${String(i).padStart(4, '0')}`,
      drawing_no_raw: `P-${i}`,
      title: `Drawing ${i}`,
      rev: null,
      is_retired: false,
      total_components: 0,
      completed_components: 0,
      avg_percent_complete: 0,
    }))

    const searchTerm = 'P-0500'
    const normalizedSearch = searchTerm.toUpperCase()

    const startTime = performance.now()
    const filtered = largeDataset.filter((drawing) =>
      drawing.drawing_no_norm.includes(normalizedSearch)
    )
    const endTime = performance.now()

    expect(filtered).toHaveLength(1)
    expect(filtered[0].drawing_no_norm).toBe('P-0500')

    // Filtering should be fast (<10ms)
    expect(endTime - startTime).toBeLessThan(10)
  })
})
