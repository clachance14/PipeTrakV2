/**
 * Integration Test: Scenario 5 - Collapse Drawing
 * Tests FR-008 (Collapse Interaction)
 *
 * Verifies that clicking an expanded drawing collapses it, updates URL,
 * preserves data changes, and maintains scroll position.
 *
 * From: specs/010-let-s-spec/quickstart.md lines 267-297
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, useSearchParams } from 'react-router-dom'
import type { DrawingRow, ComponentRow } from '@/types/drawing-table.types'

// Mock Supabase first (before any imports that use it)
vi.mock('@/lib/supabase', () => {
  const mockFrom = vi.fn()
  const mockRpc = vi.fn()

  return {
    supabase: {
      from: mockFrom,
      rpc: mockRpc,
    },
    mockSupabaseFrom: mockFrom,
    mockSupabaseRpc: mockRpc,
  }
})

// Mock contexts
vi.mock('@/contexts/ProjectContext', () => ({
  useProject: () => ({
    selectedProjectId: 'test-project-id',
  }),
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
  }),
}))

// Import page component AFTER mocks
import { DrawingComponentTablePage } from '@/pages/DrawingComponentTablePage'
import { supabase } from '@/lib/supabase'

// Get mock functions for manipulation in tests
const mockSupabaseFrom = (supabase as any).from
const mockSupabaseRpc = (supabase as any).rpc

describe('Integration Test: Scenario 5 - Collapse Drawing', () => {
  let queryClient: QueryClient

  // Test data
  const mockDrawings: DrawingRow[] = [
    {
      id: 'drawing-1-uuid',
      project_id: 'test-project-id',
      drawing_no_norm: 'P-001',
      drawing_no_raw: 'P-001',
      title: 'Main Process Line',
      rev: 'A',
      is_retired: false,
      total_components: 3,
      completed_components: 0,
      avg_percent_complete: 8.33,
    },
    {
      id: 'drawing-2-uuid',
      project_id: 'test-project-id',
      drawing_no_norm: 'P-002',
      drawing_no_raw: 'P-002',
      title: 'Secondary Line',
      rev: 'B',
      is_retired: false,
      total_components: 2,
      completed_components: 1,
      avg_percent_complete: 50,
    },
  ]

  const mockComponents: ComponentRow[] = [
    {
      id: 'comp-1',
      project_id: 'test-project-id',
      drawing_id: 'drawing-1-uuid',
      component_type: 'valve',
      identity_key: {
        drawing_norm: 'P-001',
        commodity_code: 'VBALU-001',
        size: '2',
        seq: 1,
      },
      current_milestones: {
        Receive: 1, // Updated earlier in scenario
      },
      percent_complete: 10,
      template: {
        id: 'template-valve',
        component_type: 'valve',
        version: 1,
        workflow_type: 'discrete',
        milestones_config: [
          { name: 'Receive', weight: 10, order: 1, is_partial: false, requires_welder: false },
          { name: 'Install', weight: 40, order: 2, is_partial: false, requires_welder: false },
          { name: 'Test', weight: 50, order: 3, is_partial: false, requires_welder: false },
        ],
      },
      identityDisplay: 'VBALU-001 2"',
      canUpdate: true,
      created_at: '2025-10-19T00:00:00Z',
      last_updated_at: '2025-10-19T01:00:00Z',
      last_updated_by: 'test-user-id',
      is_retired: false,
    },
    {
      id: 'comp-2',
      project_id: 'test-project-id',
      drawing_id: 'drawing-1-uuid',
      component_type: 'fitting',
      identity_key: {
        drawing_norm: 'P-001',
        commodity_code: 'FELBOW-001',
        size: '2',
        seq: 1,
      },
      current_milestones: {},
      percent_complete: 0,
      template: {
        id: 'template-fitting',
        component_type: 'fitting',
        version: 1,
        workflow_type: 'discrete',
        milestones_config: [
          { name: 'Receive', weight: 50, order: 1, is_partial: false, requires_welder: false },
          { name: 'Install', weight: 50, order: 2, is_partial: false, requires_welder: false },
        ],
      },
      identityDisplay: 'FELBOW-001 2"',
      canUpdate: true,
      created_at: '2025-10-19T00:00:00Z',
      last_updated_at: '2025-10-19T00:00:00Z',
      last_updated_by: null,
      is_retired: false,
    },
  ]

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    // Reset mocks
    mockSupabaseFrom.mockReset()
    mockSupabaseRpc.mockReset()

    // Mock drawings query
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'drawings') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: mockDrawings,
            error: null,
          }),
        }
      }

      // Mock components query
      if (table === 'components') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: mockComponents,
            error: null,
          }),
        }
      }

      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
    })
  })

  it('collapses expanded drawing and updates URL', async () => {
    const user = userEvent.setup()

    // Start with P-001 already expanded in URL
    const initialUrl = '/drawings?expanded=drawing-1-uuid'

    let currentSearchParams: URLSearchParams | null = null

    // Wrapper component to capture search params
    function TestWrapper({ children }: { children: React.ReactNode }) {
      const [searchParams] = useSearchParams()
      currentSearchParams = searchParams
      return <>{children}</>
    }

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialUrl]}>
          <TestWrapper>
            <DrawingComponentTablePage />
          </TestWrapper>
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Wait for data to load and drawing to expand
    await waitFor(() => {
      expect(screen.getByText('P-001')).toBeInTheDocument()
    })

    // Verify drawing is expanded (chevron rotated, components visible)
    await waitFor(() => {
      const chevron = screen.getByLabelText(/collapse drawing p-001/i).querySelector('svg')
      expect(chevron).toHaveClass('rotate-90')
      expect(screen.getByText('VBALU-001 2"')).toBeInTheDocument()
      expect(screen.getByText('FELBOW-001 2"')).toBeInTheDocument()
    })

    // Verify URL contains expanded parameter
    expect(currentSearchParams?.get('expanded')).toBe('drawing-1-uuid')

    // STEP 2: Click Drawing P-001 row again to collapse
    const drawingRow = screen.getByLabelText(/collapse drawing p-001/i)
    await user.click(drawingRow)

    // ASSERTION 1: ChevronRight rotates back to point right
    await waitFor(() => {
      const chevron = screen.getByLabelText(/expand drawing p-001/i).querySelector('svg')
      expect(chevron).not.toHaveClass('rotate-90')
    })

    // ASSERTION 2: Component rows disappear
    await waitFor(() => {
      expect(screen.queryByText('VBALU-001 2"')).not.toBeInTheDocument()
      expect(screen.queryByText('FELBOW-001 2"')).not.toBeInTheDocument()
    })

    // ASSERTION 3: URL updates to remove drawing ID
    await waitFor(() => {
      expect(currentSearchParams?.get('expanded')).toBeNull()
    })

    // ASSERTION 4: Drawing row remains visible
    expect(screen.getByText('P-001')).toBeInTheDocument()
    expect(screen.getByText('Main Process Line')).toBeInTheDocument()

    // ASSERTION 5: Progress summary shows updated value from earlier milestone changes
    // Drawing P-001 had a milestone updated (Receive checked on valve component)
    // Progress should reflect 10% completion on that component
    expect(screen.getByText(/0\/3 • 8%/)).toBeInTheDocument()
  })

  it('preserves milestone updates when re-expanding drawing', async () => {
    const user = userEvent.setup()

    const initialUrl = '/drawings?expanded=drawing-1-uuid'

    let currentSearchParams: URLSearchParams | null = null

    function TestWrapper({ children }: { children: React.ReactNode }) {
      const [searchParams] = useSearchParams()
      currentSearchParams = searchParams
      return <>{children}</>
    }

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialUrl]}>
          <TestWrapper>
            <DrawingComponentTablePage />
          </TestWrapper>
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Wait for expanded drawing with components
    await waitFor(() => {
      expect(screen.getByText('VBALU-001 2"')).toBeInTheDocument()
    })

    // Verify component shows updated milestone (Receive is checked from earlier scenario)
    const receiveCheckbox = screen.getByRole('checkbox', { name: /receive/i })
    expect(receiveCheckbox).toBeChecked()

    // Collapse the drawing
    const drawingRow = screen.getByLabelText(/collapse drawing p-001/i)
    await user.click(drawingRow)

    // Wait for collapse
    await waitFor(() => {
      expect(screen.queryByText('VBALU-001 2"')).not.toBeInTheDocument()
    })

    // Re-expand the drawing
    const collapsedDrawingRow = screen.getByLabelText(/expand drawing p-001/i)
    await user.click(collapsedDrawingRow)

    // Wait for components to reappear
    await waitFor(() => {
      expect(screen.getByText('VBALU-001 2"')).toBeInTheDocument()
    })

    // ASSERTION: Milestone updates persist (Receive checkbox still checked)
    await waitFor(() => {
      const receiveCheckboxAfterReExpand = screen.getByRole('checkbox', { name: /receive/i })
      expect(receiveCheckboxAfterReExpand).toBeChecked()
    })

    // Verify URL updated correctly
    expect(currentSearchParams?.get('expanded')).toBe('drawing-1-uuid')
  })

  it('maintains scroll position when collapsing drawing', async () => {
    const user = userEvent.setup()

    const initialUrl = '/drawings?expanded=drawing-1-uuid'

    const scrollSpy = vi.fn()

    function TestWrapper({ children }: { children: React.ReactNode }) {
      const [_searchParams] = useSearchParams()
      return <>{children}</>
    }

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialUrl]}>
          <TestWrapper>
            <DrawingComponentTablePage />
          </TestWrapper>
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('P-001')).toBeInTheDocument()
    })

    // Wait for components to appear
    await waitFor(() => {
      expect(screen.getByText('VBALU-001 2"')).toBeInTheDocument()
    })

    // Find the scrollable container
    const scrollContainer = container.querySelector('[style*="overflow"]') as HTMLElement
    expect(scrollContainer).toBeTruthy()

    // Set initial scroll position
    if (scrollContainer) {
      scrollContainer.scrollTop = 100
      scrollContainer.addEventListener('scroll', scrollSpy)
    }

    const initialScrollTop = scrollContainer?.scrollTop || 0

    // Collapse the drawing
    const drawingRow = screen.getByLabelText(/collapse drawing p-001/i)
    await user.click(drawingRow)

    // Wait for collapse
    await waitFor(() => {
      expect(screen.queryByText('VBALU-001 2"')).not.toBeInTheDocument()
    })

    // ASSERTION: Scroll position maintained (within reasonable threshold)
    // Note: Virtualization may adjust scroll slightly, allow 10px tolerance
    const finalScrollTop = scrollContainer?.scrollTop || 0
    expect(Math.abs(finalScrollTop - initialScrollTop)).toBeLessThanOrEqual(10)
  })

  it('keeps other expanded drawings open when collapsing one', async () => {
    const user = userEvent.setup()

    // Start with both drawings expanded
    const initialUrl = '/drawings?expanded=drawing-1-uuid,drawing-2-uuid'

    let currentSearchParams: URLSearchParams | null = null

    function TestWrapper({ children }: { children: React.ReactNode }) {
      const [searchParams] = useSearchParams()
      currentSearchParams = searchParams
      return <>{children}</>
    }

    // Mock components for drawing-2
    const mockComponentsDrawing2: ComponentRow[] = [
      {
        id: 'comp-3',
        project_id: 'test-project-id',
        drawing_id: 'drawing-2-uuid',
        component_type: 'valve',
        identity_key: {
          drawing_norm: 'P-002',
          commodity_code: 'VGATE-002',
          size: '1',
          seq: 1,
        },
        current_milestones: {},
        percent_complete: 0,
        template: {
          id: 'template-valve',
          component_type: 'valve',
          version: 1,
          workflow_type: 'discrete',
          milestones_config: [
            { name: 'Receive', weight: 10, order: 1, is_partial: false, requires_welder: false },
            { name: 'Install', weight: 40, order: 2, is_partial: false, requires_welder: false },
            { name: 'Test', weight: 50, order: 3, is_partial: false, requires_welder: false },
          ],
        },
        identityDisplay: 'VGATE-002 1"',
        canUpdate: true,
        created_at: '2025-10-19T00:00:00Z',
        last_updated_at: '2025-10-19T00:00:00Z',
        last_updated_by: null,
        is_retired: false,
      },
    ]

    // Update mock to return different components based on drawing_id
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'drawings') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: mockDrawings,
            error: null,
          }),
        }
      }

      if (table === 'components') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn((field: string, value: string) => {
            if (field === 'drawing_id') {
              const componentsToReturn =
                value === 'drawing-1-uuid' ? mockComponents : mockComponentsDrawing2
              return {
                order: vi.fn().mockResolvedValue({
                  data: componentsToReturn,
                  error: null,
                }),
              }
            }
            return {
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }
          }),
          order: vi.fn().mockResolvedValue({
            data: mockComponents,
            error: null,
          }),
        }
      }

      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialUrl]}>
          <TestWrapper>
            <DrawingComponentTablePage />
          </TestWrapper>
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Wait for both drawings to expand
    await waitFor(() => {
      expect(screen.getByText('P-001')).toBeInTheDocument()
      expect(screen.getByText('P-002')).toBeInTheDocument()
    })

    // Wait for components from both drawings to appear
    await waitFor(() => {
      expect(screen.getByText('VBALU-001 2"')).toBeInTheDocument()
      expect(screen.getByText('VGATE-002 1"')).toBeInTheDocument()
    })

    // Verify URL has both drawings
    expect(currentSearchParams?.get('expanded')).toBe('drawing-1-uuid,drawing-2-uuid')

    // Collapse Drawing P-001
    const drawing1Row = screen.getByLabelText(/collapse drawing p-001/i)
    await user.click(drawing1Row)

    // ASSERTION 1: P-001 components disappear
    await waitFor(() => {
      expect(screen.queryByText('VBALU-001 2"')).not.toBeInTheDocument()
      expect(screen.queryByText('FELBOW-001 2"')).not.toBeInTheDocument()
    })

    // ASSERTION 2: P-002 components remain visible
    expect(screen.getByText('VGATE-002 1"')).toBeInTheDocument()

    // ASSERTION 3: P-002 chevron still rotated
    const drawing2Chevron = screen.getByLabelText(/collapse drawing p-002/i).querySelector('svg')
    expect(drawing2Chevron).toHaveClass('rotate-90')

    // ASSERTION 4: URL updated to only contain drawing-2-uuid
    await waitFor(() => {
      expect(currentSearchParams?.get('expanded')).toBe('drawing-2-uuid')
    })
  })

  it('handles collapse via keyboard (Enter key)', async () => {
    const user = userEvent.setup()

    const initialUrl = '/drawings?expanded=drawing-1-uuid'

    let currentSearchParams: URLSearchParams | null = null

    function TestWrapper({ children }: { children: React.ReactNode }) {
      const [searchParams] = useSearchParams()
      currentSearchParams = searchParams
      return <>{children}</>
    }

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialUrl]}>
          <TestWrapper>
            <DrawingComponentTablePage />
          </TestWrapper>
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Wait for expanded drawing
    await waitFor(() => {
      expect(screen.getByText('VBALU-001 2"')).toBeInTheDocument()
    })

    // Focus on drawing row and press Enter
    const drawingRow = screen.getByLabelText(/collapse drawing p-001/i)
    drawingRow.focus()
    await user.keyboard('{Enter}')

    // ASSERTION: Drawing collapses
    await waitFor(() => {
      expect(screen.queryByText('VBALU-001 2"')).not.toBeInTheDocument()
    })

    // Verify URL updated
    await waitFor(() => {
      expect(currentSearchParams?.get('expanded')).toBeNull()
    })
  })

  it('handles collapse via keyboard (Space key)', async () => {
    const user = userEvent.setup()

    const initialUrl = '/drawings?expanded=drawing-1-uuid'

    let currentSearchParams: URLSearchParams | null = null

    function TestWrapper({ children }: { children: React.ReactNode }) {
      const [searchParams] = useSearchParams()
      currentSearchParams = searchParams
      return <>{children}</>
    }

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialUrl]}>
          <TestWrapper>
            <DrawingComponentTablePage />
          </TestWrapper>
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Wait for expanded drawing
    await waitFor(() => {
      expect(screen.getByText('VBALU-001 2"')).toBeInTheDocument()
    })

    // Focus on drawing row and press Space
    const drawingRow = screen.getByLabelText(/collapse drawing p-001/i)
    drawingRow.focus()
    await user.keyboard(' ')

    // ASSERTION: Drawing collapses
    await waitFor(() => {
      expect(screen.queryByText('VBALU-001 2"')).not.toBeInTheDocument()
    })

    // Verify URL updated
    await waitFor(() => {
      expect(currentSearchParams?.get('expanded')).toBeNull()
    })
  })
})
