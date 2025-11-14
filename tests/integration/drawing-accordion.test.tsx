import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DrawingComponentTablePage } from '@/pages/DrawingComponentTablePage'

// Mock data
const mockDrawings = [
  {
    id: 'dwg-1',
    drawing_no_norm: 'DWG-001',
    drawing_title: 'Test Drawing 1',
    total_components: 5,
    completed_components: 2,
    avg_percent_complete: 40,
    area: { id: 'area-1', name: 'Area 1' },
    system: { id: 'sys-1', name: 'System 1' },
    test_package: null
  },
  {
    id: 'dwg-2',
    drawing_no_norm: 'DWG-002',
    drawing_title: 'Test Drawing 2',
    total_components: 3,
    completed_components: 1,
    avg_percent_complete: 33,
    area: { id: 'area-1', name: 'Area 1' },
    system: { id: 'sys-2', name: 'System 2' },
    test_package: null
  }
]

// Mock hooks
vi.mock('@/hooks/useDrawingsWithProgress', () => ({
  useDrawingsWithProgress: () => ({
    data: mockDrawings,
    isLoading: false,
    error: null
  })
}))

vi.mock('@/hooks/useComponentsByDrawings', () => ({
  useComponentsByDrawings: () => ({
    componentsMap: new Map(),
    isLoading: false,
    error: null
  })
}))

// Mock auth context
vi.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({
    session: {
      user: { id: 'user-1', email: 'test@example.com' }
    },
    loading: false,
    user: { id: 'user-1', email: 'test@example.com' },
    currentProject: { id: 'project-1', name: 'Test Project' },
    hasPermission: () => true
  })
}))

// Mock project context
vi.mock('@/contexts/ProjectContext', () => ({
  ProjectProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useProject: () => ({
    selectedProjectId: 'project-1',
    selectedProject: { id: 'project-1', name: 'Test Project' }
  })
}))

vi.mock('@/hooks/useUpdateMilestone', () => ({
  useUpdateMilestone: () => ({
    mutate: vi.fn(),
    isPending: false
  })
}))

vi.mock('@/hooks/useAreas', () => ({
  useAreas: () => ({ data: [], isLoading: false })
}))

vi.mock('@/hooks/useSystems', () => ({
  useSystems: () => ({ data: [], isLoading: false })
}))

vi.mock('@/hooks/usePackages', () => ({
  usePackages: () => ({ data: [], isLoading: false })
}))

vi.mock('@/hooks/useTestPackages', () => ({
  useTestPackages: () => ({ data: [], isLoading: false })
}))

vi.mock('@/hooks/useMobileDetection', () => ({
  useMobileDetection: () => false
}))

vi.mock('@/hooks/useDrawingFilters', () => ({
  useDrawingFilters: () => ({
    searchTerm: '',
    statusFilter: 'all',
    sortField: 'drawing_number',
    sortDirection: 'asc',
    setSearch: vi.fn(),
    setStatusFilter: vi.fn(),
    setSort: vi.fn(),
    filterAndSortDrawings: (drawings: any[]) => drawings
  })
}))

vi.mock('@/hooks/useDrawingSelection', () => ({
  useDrawingSelection: () => ({
    selectedDrawingIds: new Set(),
    toggleDrawing: vi.fn(),
    selectAll: vi.fn(),
    clearSelection: vi.fn()
  })
}))

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0 },
      mutations: { retry: false }
    }
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('Drawing Accordion Integration', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/')
  })

  it('allows only one drawing expanded at a time', async () => {
    const user = userEvent.setup()

    renderWithProviders(<DrawingComponentTablePage />)

    // Wait for drawings to render by checking for expand buttons
    await waitFor(() => {
      const expandButtons = screen.getAllByLabelText(/expand drawing/i)
      expect(expandButtons.length).toBeGreaterThan(0)
    })

    // Expand first drawing
    const firstChevron = screen.getAllByLabelText(/expand drawing/i)[0]
    await user.click(firstChevron)

    await waitFor(() => {
      expect(window.location.search).toContain('expanded=')
      const params = new URLSearchParams(window.location.search)
      expect(params.get('expanded')).toBe('dwg-1')
    })

    // Expand second drawing
    const secondChevron = screen.getAllByLabelText(/expand drawing/i)[1]
    await user.click(secondChevron)

    await waitFor(() => {
      // Should have only one expanded param
      const params = new URLSearchParams(window.location.search)
      const expanded = params.get('expanded')
      expect(expanded).toBe('dwg-2')
      // Should not have multiple IDs
      expect(expanded?.split(',').length).toBe(1)
    })
  })

  it('collapses drawing when clicking already expanded drawing', async () => {
    const user = userEvent.setup()

    renderWithProviders(<DrawingComponentTablePage />)

    // Wait for drawings to render by checking for expand buttons
    await waitFor(() => {
      const expandButtons = screen.getAllByLabelText(/expand drawing/i)
      expect(expandButtons.length).toBeGreaterThan(0)
    })

    // Expand a drawing
    const chevron = screen.getAllByLabelText(/expand drawing/i)[0]
    await user.click(chevron)

    await waitFor(() => {
      expect(window.location.search).toContain('expanded=')
    })

    // Click same drawing again - should collapse it
    const expandedChevron = screen.getByLabelText(/collapse drawing/i)
    await user.click(expandedChevron)

    // URL should no longer have expanded param
    await waitFor(() => {
      expect(window.location.search).not.toContain('expanded=')
    })
  })

  it('applies sticky CSS when drawing expanded', async () => {
    const user = userEvent.setup()

    renderWithProviders(<DrawingComponentTablePage />)

    // Wait for drawings to render by checking for expand buttons
    await waitFor(() => {
      const expandButtons = screen.getAllByLabelText(/expand drawing/i)
      expect(expandButtons.length).toBeGreaterThan(0)
    })

    const chevron = screen.getAllByLabelText(/expand drawing/i)[0]
    await user.click(chevron)

    await waitFor(() => {
      // Find the expanded drawing row (has collapse label)
      const expandedRow = screen.getByLabelText(/collapse drawing/i).closest('[data-drawing-id]')
      expect(expandedRow).toBeInTheDocument()
      expect(expandedRow).toHaveClass('sticky')
      expect(expandedRow).toHaveClass('z-10')
    })
  })

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup()

    renderWithProviders(<DrawingComponentTablePage />)

    // Wait for drawings to render by checking for expand buttons
    await waitFor(() => {
      const expandButtons = screen.getAllByLabelText(/expand drawing/i)
      expect(expandButtons.length).toBeGreaterThan(0)
    })

    const chevron = screen.getAllByLabelText(/expand drawing/i)[0]
    chevron.focus()

    // Press Enter to expand first drawing
    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(window.location.search).toContain('expanded=')
    })

    // Press Enter on different drawing to switch expansion
    const secondChevron = screen.getAllByLabelText(/expand drawing/i)[1]
    secondChevron.focus()
    await user.keyboard('{Enter}')

    await waitFor(() => {
      const params = new URLSearchParams(window.location.search)
      const expanded = params.get('expanded')
      // Should be different drawing ID now
      expect(expanded).toBeTruthy()
      expect(expanded?.split(',').length).toBe(1)
    })
  })

  it('reads single ID from URL on mount', async () => {
    window.history.pushState({}, '', '?expanded=dwg-1')

    renderWithProviders(<DrawingComponentTablePage />)

    await waitFor(() => {
      // Should show the collapsed drawing
      const collapseButton = screen.getByLabelText(/collapse drawing dwg-001/i)
      expect(collapseButton).toBeInTheDocument()
    })
  })

  it('handles legacy multi-ID URLs by taking first ID', async () => {
    window.history.pushState({}, '', '?expanded=dwg-1,dwg-2,dwg-3')

    renderWithProviders(<DrawingComponentTablePage />)

    await waitFor(() => {
      const params = new URLSearchParams(window.location.search)
      const expanded = params.get('expanded')
      // After mount, should normalize to single ID
      expect(expanded).toBeTruthy()
      // First drawing should be expanded
      const collapseButton = screen.getByLabelText(/collapse drawing dwg-001/i)
      expect(collapseButton).toBeInTheDocument()
    })
  })
})
