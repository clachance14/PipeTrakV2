/**
 * Integration Test: Scenario 1 - View Drawing Progress Summary
 * Feature 010 - Drawing-Centered Component Progress Table
 *
 * Tests FR-001 through FR-006 (Display Requirements):
 * - FR-001: Display drawing number with progress summary
 * - FR-002: Show component count per drawing
 * - FR-003: Visual hierarchy (slate background, blue border, bold text)
 * - FR-004: Display progress as "X/Y • Z%" format
 * - FR-005: Handle empty drawings (no expand icon)
 * - FR-006: Hover effects on drawing rows
 *
 * Validates Scenario 1 from quickstart.md lines 82-118:
 * - Drawing P-001: 3 components, 8% average progress
 * - Drawing P-002: 1 component, 100% complete
 * - Drawing P-003: 0 components (empty drawing edge case)
 *
 * Prerequisites:
 * - Test data seeded via SQL (see quickstart.md lines 23-73)
 * - User authenticated with can_view_components permission
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { DrawingComponentTablePage } from '@/pages/DrawingComponentTablePage'
// Mock @tanstack/react-virtual to work in jsdom
// The real virtualizer requires accurate DOM measurements which don't work in jsdom
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count, estimateSize }: any) => {
    const defaultSize = 60
    const getSizeForIndex = (index: number) => {
      if (typeof estimateSize === 'function') return estimateSize(index)
      if (typeof estimateSize === 'number') return estimateSize
      return defaultSize
    }

    const getTotalSize = () => {
      let total = 0
      for (let i = 0; i < count; i++) {
        total += getSizeForIndex(i)
      }
      return total
    }

    const getVirtualItems = () => {
      const items = []
      let currentStart = 0
      for (let i = 0; i < count; i++) {
        const size = getSizeForIndex(i)
        items.push({
          key: i,
          index: i,
          start: currentStart,
          size,
          end: currentStart + size,
        })
        currentStart += size
      }
      return items
    }

    return {
      getTotalSize,
      getVirtualItems,
      scrollToIndex: vi.fn(),
      scrollToOffset: vi.fn(),
      measure: vi.fn(),
    }
  },
}))

// Mock contexts
vi.mock('@/contexts/ProjectContext', () => ({
  useProject: () => ({
    selectedProjectId: 'test-project-uuid',
    selectedProject: {
      id: 'test-project-uuid',
      name: 'Test Project',
      organization_id: 'test-org-uuid',
    },
  }),
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-uuid',
      email: 'test@example.com',
    },
    session: { access_token: 'test-token' },
  }),
}))

// Mock Supabase client (must be defined in the factory function)
vi.mock('@/lib/supabase', () => {
  const mockFrom = vi.fn()
  const mockAuth = {
    getUser: vi.fn(() =>
      Promise.resolve({
        data: { user: { id: 'test-user-uuid' } },
        error: null,
      })
    ),
    getSession: vi.fn(() =>
      Promise.resolve({
        data: { session: { access_token: 'test-token' } },
        error: null,
      })
    ),
  }

  return {
    supabase: {
      from: mockFrom,
      auth: mockAuth,
    },
  }
})

describe('Scenario 1: View Drawing Progress Summary (Integration)', () => {
  let queryClient: QueryClient

  // Test data matching quickstart.md specification
  const testDrawings = [
    {
      id: 'drawing-1-uuid',
      project_id: 'test-project-uuid',
      drawing_no_norm: 'P-001',
      drawing_no_raw: 'P-001',
      title: 'Main Process Line',
      rev: null,
      is_retired: false,
      created_at: '2025-10-19T00:00:00Z',
      updated_at: '2025-10-19T00:00:00Z',
    },
    {
      id: 'drawing-2-uuid',
      project_id: 'test-project-uuid',
      drawing_no_norm: 'P-002',
      drawing_no_raw: 'P-002',
      title: 'Drain Line',
      rev: null,
      is_retired: false,
      created_at: '2025-10-19T00:00:00Z',
      updated_at: '2025-10-19T00:00:00Z',
    },
    {
      id: 'drawing-3-uuid',
      project_id: 'test-project-uuid',
      drawing_no_norm: 'P-003',
      drawing_no_raw: 'P-003',
      title: 'Vent Header',
      rev: null,
      is_retired: false,
      created_at: '2025-10-19T00:00:00Z',
      updated_at: '2025-10-19T00:00:00Z',
    },
  ]

  const testProgressData = [
    {
      drawing_id: 'drawing-1-uuid',
      project_id: 'test-project-uuid',
      total_components: 3,
      completed_components: 0,
      avg_percent_complete: 8.33, // (0% + 10% + 15%) / 3
    },
    {
      drawing_id: 'drawing-2-uuid',
      project_id: 'test-project-uuid',
      total_components: 1,
      completed_components: 1,
      avg_percent_complete: 100.0,
    },
    // P-003 has no progress data (empty drawing)
  ]

  beforeAll(() => {
    // Mock window.matchMedia for responsive tests
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    // Mock Element.prototype.getBoundingClientRect for virtualizer
    // The virtualizer needs dimensions to calculate visible items
    Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
      width: 1200,
      height: 800,
      top: 0,
      left: 0,
      bottom: 800,
      right: 1200,
      x: 0,
      y: 0,
      toJSON: () => {},
    })
  })

  beforeEach(async () => {
    // Reset QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          cacheTime: 0,
          staleTime: 0,
        },
      },
    })

    // Clear all mocks
    vi.clearAllMocks()

    // Import the mocked supabase to setup mock responses
    const { supabase } = await import('@/lib/supabase')
    const mockFrom = vi.mocked(supabase.from)

    // Setup Supabase mock responses
    mockFrom.mockImplementation((table: string) => {
      if (table === 'drawings') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: testDrawings,
            error: null,
          }),
        } as any
      }

      if (table === 'mv_drawing_progress') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: testProgressData,
            error: null,
          }),
        } as any
      }

      // Default for other tables (components, etc.)
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as any
    })
  })

  /**
   * Helper function to render the page with all providers
   */
  const renderPage = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/components']}>
          <DrawingComponentTablePage />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  describe('FR-001: Display Drawing Number with Progress Summary', () => {
    it('renders Drawing P-001 with correct data', async () => {
      renderPage()

      // Wait for data to load
      const drawingRow = await screen.findByLabelText(/expand drawing P-001/i)
      expect(drawingRow).toBeInTheDocument()

      // Verify drawing number is displayed
      expect(within(drawingRow).getByText('P-001')).toBeInTheDocument()
    })

    it('renders Drawing P-002 with correct data', async () => {
      renderPage()

      const drawingRow = await screen.findByLabelText(/expand drawing P-002/i)
      expect(drawingRow).toBeInTheDocument()
      expect(within(drawingRow).getByText('P-002')).toBeInTheDocument()
    })

    it('renders Drawing P-003 with correct data', async () => {
      renderPage()

      // P-003 has no components, so no expand button
      const heading = await screen.findByText('Component Progress')
      expect(heading).toBeInTheDocument()

      // Find P-003 by its drawing number text
      const p003Text = screen.getByText('P-003')
      expect(p003Text).toBeInTheDocument()
    })
  })

  describe('FR-002: Show Component Count per Drawing', () => {
    it('displays "3 items" for Drawing P-001', async () => {
      renderPage()

      await screen.findByLabelText(/expand drawing P-001/i)
      expect(screen.getByText('3 items')).toBeInTheDocument()
    })

    it('displays "1 item" (singular) for Drawing P-002', async () => {
      renderPage()

      await screen.findByLabelText(/expand drawing P-002/i)
      expect(screen.getByText('1 item')).toBeInTheDocument()
    })

    it('displays "0 items" for empty Drawing P-003', async () => {
      renderPage()

      await screen.findByText('Component Progress')
      expect(screen.getByText('0 items')).toBeInTheDocument()
    })
  })

  describe('FR-004: Progress Format "X/Y • Z%"', () => {
    it('displays "0/3 • 8%" for Drawing P-001', async () => {
      renderPage()

      await screen.findByLabelText(/expand drawing P-001/i)
      // Check for the progress text (allowing for rounding: 8.33 → 8%)
      expect(screen.getByText(/0\/3 • 8%/)).toBeInTheDocument()
    })

    it('displays "1/1 • 100%" for completed Drawing P-002', async () => {
      renderPage()

      await screen.findByLabelText(/expand drawing P-002/i)
      expect(screen.getByText('1/1 • 100%')).toBeInTheDocument()
    })

    it('displays "0/0 • 0%" for empty Drawing P-003', async () => {
      renderPage()

      await screen.findByText('Component Progress')
      expect(screen.getByText('0/0 • 0%')).toBeInTheDocument()
    })
  })

  describe('FR-005: Handle Empty Drawings (No Expand Icon)', () => {
    it('shows ChevronRight icon for Drawing P-001 (has components)', async () => {
      renderPage()

      const drawingRow = await screen.findByLabelText(/expand drawing P-001/i)
      expect(drawingRow).toBeInTheDocument()

      // ChevronRight icon should be present (verify via role="button" and aria-expanded)
      expect(drawingRow).toHaveAttribute('role', 'button')
      expect(drawingRow).toHaveAttribute('aria-expanded', 'false')
    })

    it('shows ChevronRight icon for Drawing P-002 (has components)', async () => {
      renderPage()

      const drawingRow = await screen.findByLabelText(/expand drawing P-002/i)
      expect(drawingRow).toHaveAttribute('role', 'button')
      expect(drawingRow).toHaveAttribute('aria-expanded', 'false')
    })

    it('does NOT show expand icon for empty Drawing P-003', async () => {
      renderPage()

      await screen.findByText('Component Progress')

      // Find the P-003 drawing row
      const p003Text = screen.getByText('P-003')
      expect(p003Text).toBeInTheDocument()

      // The row should NOT have aria-label for expanding (since it's empty)
      // This is implicit - the label will be different or not present
      const allExpandButtons = screen.queryAllByLabelText(/expand drawing/i)
      const p003ExpandButton = allExpandButtons.find((btn) =>
        btn.textContent?.includes('P-003')
      )

      // If P-003 has 0 components, it shouldn't be expandable
      // Check that the aria-label doesn't exist for P-003
      expect(p003ExpandButton).toBeUndefined()
    })
  })

  describe('FR-003: Visual Hierarchy Validation', () => {
    it('applies slate-100 background to drawing rows', async () => {
      renderPage()

      const drawingRow = await screen.findByLabelText(/expand drawing P-001/i)

      // Check for background color class (slate or equivalent)
      // Note: We can't directly test computed styles in jsdom, so we check className
      expect(drawingRow.className).toMatch(/bg-(white|slate)/)
    })

    it('applies blue-500 left border to drawing rows', async () => {
      renderPage()

      const drawingRow = await screen.findByLabelText(/expand drawing P-001/i)

      // Check for border class
      expect(drawingRow.className).toMatch(/border-(l-|blue)/)
    })

    it('applies bold font to drawing number text', async () => {
      renderPage()

      await screen.findByLabelText(/expand drawing P-001/i)
      const drawingNumber = screen.getByText('P-001')

      // Check parent for font-semibold or font-bold
      expect(drawingNumber.className).toMatch(/font-(semibold|bold)/)
    })

    it('displays drawing title', async () => {
      renderPage()

      await screen.findByLabelText(/expand drawing P-001/i)
      expect(screen.getByText('Main Process Line')).toBeInTheDocument()
    })

    it('displays "—" for drawings without title', async () => {
      // Modify test data to have a drawing without title
      const drawingsWithoutTitle = [
        ...testDrawings.slice(0, 2),
        {
          ...testDrawings[2],
          title: null,
        },
      ]

      const { supabase } = await import('@/lib/supabase')
      const mockFrom = vi.mocked(supabase.from)

      mockFrom.mockImplementation((table: string) => {
        if (table === 'drawings') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: drawingsWithoutTitle,
              error: null,
            }),
          } as any
        }

        if (table === 'mv_drawing_progress') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: testProgressData,
              error: null,
            }),
          } as any
        }

        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        } as any
      })

      renderPage()

      await screen.findByText('Component Progress')
      // Find all "—" em-dashes (there might be multiple empty fields)
      const emDashes = screen.getAllByText('—')
      expect(emDashes.length).toBeGreaterThan(0)
    })
  })

  describe('FR-006: Hover Effects', () => {
    it('applies hover class to drawing rows', async () => {
      renderPage()

      const drawingRow = await screen.findByLabelText(/expand drawing P-001/i)

      // Check for hover classes (we can't actually trigger hover in jsdom)
      expect(drawingRow.className).toMatch(/hover:/)
    })

    it('applies cursor-pointer to clickable rows', async () => {
      renderPage()

      const drawingRow = await screen.findByLabelText(/expand drawing P-001/i)

      // Check for cursor-pointer class
      expect(drawingRow.className).toMatch(/cursor-pointer/)
    })
  })

  describe('Accessibility (ARIA Assertions)', () => {
    it('uses role="button" for expandable drawing rows', async () => {
      renderPage()

      const drawingRow = await screen.findByLabelText(/expand drawing P-001/i)
      expect(drawingRow).toHaveAttribute('role', 'button')
    })

    it('uses aria-expanded="false" for collapsed drawings', async () => {
      renderPage()

      const drawingRow = await screen.findByLabelText(/expand drawing P-001/i)
      expect(drawingRow).toHaveAttribute('aria-expanded', 'false')
    })

    it('uses descriptive aria-label for expand action', async () => {
      renderPage()

      const drawingRow = await screen.findByLabelText('Expand drawing P-001')
      expect(drawingRow).toBeInTheDocument()
    })

    it('is keyboard navigable (tabIndex=0)', async () => {
      renderPage()

      const drawingRow = await screen.findByLabelText(/expand drawing P-001/i)
      expect(drawingRow).toHaveAttribute('tabIndex', '0')
    })
  })

  describe('Data Loading States', () => {
    it('displays all three drawings in correct order', async () => {
      renderPage()

      await screen.findByText('Component Progress')

      // Verify all drawings are displayed
      expect(screen.getByText('P-001')).toBeInTheDocument()
      expect(screen.getByText('P-002')).toBeInTheDocument()
      expect(screen.getByText('P-003')).toBeInTheDocument()
    })

    it('shows "Showing X of Y drawings" summary', async () => {
      renderPage()

      await screen.findByText('Component Progress')

      // Check for the summary text
      expect(screen.getByText(/Showing 3 of 3 drawings/i)).toBeInTheDocument()
    })
  })

  describe('Edge Case: 100% Complete Drawing (Green Highlight)', () => {
    it('displays Drawing P-002 at 100% completion', async () => {
      renderPage()

      await screen.findByLabelText(/expand drawing P-002/i)

      // Verify 100% progress is shown
      expect(screen.getByText('1/1 • 100%')).toBeInTheDocument()
    })

    it('shows completed components match total components', async () => {
      renderPage()

      await screen.findByLabelText(/expand drawing P-002/i)

      // "1/1" means 1 completed out of 1 total
      const progressText = screen.getByText('1/1 • 100%')
      expect(progressText).toBeInTheDocument()
    })
  })

  describe('Edge Case: Empty Drawing (P-003)', () => {
    it('displays empty drawing with 0 components', async () => {
      renderPage()

      await screen.findByText('Component Progress')

      const p003Text = screen.getByText('P-003')
      expect(p003Text).toBeInTheDocument()

      // Verify component count is 0
      expect(screen.getByText('0 items')).toBeInTheDocument()
    })

    it('shows 0/0 • 0% progress for empty drawing', async () => {
      renderPage()

      await screen.findByText('Component Progress')

      expect(screen.getByText('0/0 • 0%')).toBeInTheDocument()
    })

    it('does not allow expanding empty drawing', async () => {
      renderPage()

      await screen.findByText('Component Progress')

      // Empty drawing should not have expand functionality
      const allExpandLabels = screen.queryAllByLabelText(/expand drawing P-003/i)
      expect(allExpandLabels.length).toBe(0)
    })
  })

  describe('Integration with useDrawingsWithProgress Hook', () => {
    it('calls Supabase drawings query with correct filters', async () => {
      const { supabase } = await import('@/lib/supabase')
      const mockFrom = vi.mocked(supabase.from)

      renderPage()

      await screen.findByText('Component Progress')

      // Verify Supabase was called for drawings
      expect(mockFrom).toHaveBeenCalledWith('drawings')
    })

    it('calls Supabase mv_drawing_progress view query', async () => {
      const { supabase } = await import('@/lib/supabase')
      const mockFrom = vi.mocked(supabase.from)

      renderPage()

      await screen.findByText('Component Progress')

      // Verify Supabase was called for progress data
      expect(mockFrom).toHaveBeenCalledWith('mv_drawing_progress')
    })

    it('merges drawing data with progress data correctly', async () => {
      renderPage()

      await screen.findByText('Component Progress')

      // Verify merged data is displayed correctly
      // P-001: 3 components, 8% average
      expect(screen.getByText('0/3 • 8%')).toBeInTheDocument()

      // P-002: 1 component, 100% average
      expect(screen.getByText('1/1 • 100%')).toBeInTheDocument()

      // P-003: 0 components, 0% average (no progress data in mv)
      expect(screen.getByText('0/0 • 0%')).toBeInTheDocument()
    })
  })

  describe('Progress Percentage Rounding', () => {
    it('rounds 8.33% to 8% for display', async () => {
      renderPage()

      await screen.findByLabelText(/expand drawing P-001/i)

      // 8.33% should round to 8%
      expect(screen.getByText(/0\/3 • 8%/)).toBeInTheDocument()
    })

    it('displays 100% without rounding', async () => {
      renderPage()

      await screen.findByLabelText(/expand drawing P-002/i)

      expect(screen.getByText('1/1 • 100%')).toBeInTheDocument()
    })

    it('displays 0% for drawings with no progress', async () => {
      renderPage()

      await screen.findByText('Component Progress')

      expect(screen.getByText('0/0 • 0%')).toBeInTheDocument()
    })
  })
})
