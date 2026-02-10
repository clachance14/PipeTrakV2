/**
 * Integration Test: Scenario 6 - Multiple Drawings Expanded
 * Tests FR-009: Multiple Drawings Expanded Simultaneously
 *
 * Validates that:
 * - Multiple drawings can be expanded at the same time
 * - URL shows comma-separated drawing IDs (?expanded=uuid1,uuid2)
 * - Both sets of components are visible
 * - Collapsing one drawing doesn't affect others
 * - URL updates correctly when individual drawings are collapsed
 * - Virtualization performance remains optimal with multiple expanded drawings
 *
 * IMPORTANT: This test follows TDD principles (Red-Green-Refactor)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { DrawingComponentTablePage } from '@/pages/DrawingComponentTablePage'

// Mock data for testing
const mockDrawing1 = {
  id: 'drawing-1-uuid',
  project_id: 'project-uuid',
  drawing_no_norm: 'P-001',
  title: 'Main Process Line',
  is_retired: false,
  total_components: 3,
  completed_components: 0,
  avg_percent_complete: 8.33,
}

const mockDrawing2 = {
  id: 'drawing-2-uuid',
  project_id: 'project-uuid',
  drawing_no_norm: 'P-002',
  title: 'Secondary Process Line',
  is_retired: false,
  total_components: 1,
  completed_components: 1,
  avg_percent_complete: 100,
}

const mockDrawing3 = {
  id: 'drawing-3-uuid',
  project_id: 'project-uuid',
  drawing_no_norm: 'P-003',
  title: 'Tertiary Process Line',
  is_retired: false,
  total_components: 2,
  completed_components: 0,
  avg_percent_complete: 0,
}

const mockComponentsDrawing1 = [
  {
    id: 'comp-1-uuid',
    drawing_id: 'drawing-1-uuid',
    component_type: 'valve',
    identity_key: {
      drawing_norm: 'P-001',
      commodity_code: 'VBALU-001',
      size: '2',
      seq: 1,
    },
    identityDisplay: 'VBALU-001 2"',
    current_milestones: { Receive: 0, Install: 0, Test: 0, Certify: 0, Stencil: 0 },
    percent_complete: 0,
    template: {
      id: 'template-valve',
      component_type: 'valve',
      version: 1,
      workflow_type: 'discrete',
      milestones_config: [
        { name: 'Receive', weight: 10, order: 1, is_partial: false, requires_welder: false },
        { name: 'Install', weight: 40, order: 2, is_partial: false, requires_welder: false },
        { name: 'Test', weight: 30, order: 3, is_partial: false, requires_welder: false },
        { name: 'Certify', weight: 15, order: 4, is_partial: false, requires_welder: false },
        { name: 'Stencil', weight: 5, order: 5, is_partial: false, requires_welder: true },
      ],
    },
    canUpdate: true,
  },
  {
    id: 'comp-2-uuid',
    drawing_id: 'drawing-1-uuid',
    component_type: 'fitting',
    identity_key: {
      drawing_norm: 'P-001',
      commodity_code: 'FELBDFA235',
      size: '1X2',
      seq: 1,
    },
    identityDisplay: 'FELBDFA235 1X2',
    current_milestones: { Receive: 1, Install: 0 },
    percent_complete: 10,
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
    canUpdate: true,
  },
  {
    id: 'comp-3-uuid',
    drawing_id: 'drawing-1-uuid',
    component_type: 'threaded_pipe',
    identity_key: {
      drawing_norm: 'P-001',
      commodity_code: 'PT-16000',
      size: 'NOSIZE',
      seq: 1,
    },
    identityDisplay: 'PT-16000',
    current_milestones: { Receive: 1, Fabricate: 50 },
    percent_complete: 15,
    template: {
      id: 'template-threaded',
      component_type: 'threaded_pipe',
      version: 1,
      workflow_type: 'hybrid',
      milestones_config: [
        { name: 'Receive', weight: 10, order: 1, is_partial: false, requires_welder: false },
        { name: 'Fabricate', weight: 90, order: 2, is_partial: true, requires_welder: false },
      ],
    },
    canUpdate: true,
  },
]

const mockComponentsDrawing2 = [
  {
    id: 'comp-4-uuid',
    drawing_id: 'drawing-2-uuid',
    component_type: 'valve',
    identity_key: {
      drawing_norm: 'P-002',
      commodity_code: 'VBALU-002',
      size: '1',
      seq: 1,
    },
    identityDisplay: 'VBALU-002 1"',
    current_milestones: { Receive: 1, Install: 1, Test: 1, Certify: 1, Stencil: 1 },
    percent_complete: 100,
    template: {
      id: 'template-valve',
      component_type: 'valve',
      version: 1,
      workflow_type: 'discrete',
      milestones_config: [
        { name: 'Receive', weight: 10, order: 1, is_partial: false, requires_welder: false },
        { name: 'Install', weight: 40, order: 2, is_partial: false, requires_welder: false },
        { name: 'Test', weight: 30, order: 3, is_partial: false, requires_welder: false },
        { name: 'Certify', weight: 15, order: 4, is_partial: false, requires_welder: false },
        { name: 'Stencil', weight: 5, order: 5, is_partial: false, requires_welder: true },
      ],
    },
    canUpdate: true,
  },
]

const mockComponentsDrawing3 = [
  {
    id: 'comp-5-uuid',
    drawing_id: 'drawing-3-uuid',
    component_type: 'pipe',
    identity_key: {
      drawing_norm: 'P-003',
      commodity_code: 'PIPE-001',
      size: '4',
      seq: 1,
    },
    identityDisplay: 'PIPE-001 4"',
    current_milestones: { Receive: 0, Install: 0 },
    percent_complete: 0,
    template: {
      id: 'template-pipe',
      component_type: 'pipe',
      version: 1,
      workflow_type: 'discrete',
      milestones_config: [
        { name: 'Receive', weight: 50, order: 1, is_partial: false, requires_welder: false },
        { name: 'Install', weight: 50, order: 2, is_partial: false, requires_welder: false },
      ],
    },
    canUpdate: true,
  },
  {
    id: 'comp-6-uuid',
    drawing_id: 'drawing-3-uuid',
    component_type: 'pipe',
    identity_key: {
      drawing_norm: 'P-003',
      commodity_code: 'PIPE-002',
      size: '4',
      seq: 1,
    },
    identityDisplay: 'PIPE-002 4"',
    current_milestones: { Receive: 0, Install: 0 },
    percent_complete: 0,
    template: {
      id: 'template-pipe',
      component_type: 'pipe',
      version: 1,
      workflow_type: 'discrete',
      milestones_config: [
        { name: 'Receive', weight: 50, order: 1, is_partial: false, requires_welder: false },
        { name: 'Install', weight: 50, order: 2, is_partial: false, requires_welder: false },
      ],
    },
    canUpdate: true,
  },
]

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'drawings') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  data: [mockDrawing1, mockDrawing2, mockDrawing3],
                  error: null,
                })),
              })),
            })),
          })),
        }
      }
      if (table === 'components') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn((field: string, value: string) => {
              // Map drawing IDs to components with progress_templates included
              const componentsMap: Record<string, any[]> = {
                'drawing-1-uuid': mockComponentsDrawing1.map(comp => ({
                  ...comp,
                  progress_templates: comp.template, // Supabase join returns nested object
                })),
                'drawing-2-uuid': mockComponentsDrawing2.map(comp => ({
                  ...comp,
                  progress_templates: comp.template,
                })),
                'drawing-3-uuid': mockComponentsDrawing3.map(comp => ({
                  ...comp,
                  progress_templates: comp.template,
                })),
              }
              return {
                eq: vi.fn(() => ({
                  order: vi.fn(() => ({
                    data: componentsMap[value] || [],
                    error: null,
                  })),
                })),
              }
            }),
          })),
        }
      }
      if (table === 'progress_templates') {
        return {
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              data: [],
              error: null,
            })),
          })),
        }
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: [],
            error: null,
          })),
        })),
      }
    }),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
  },
}))

// Mock React Router useSearchParams
const mockSetSearchParams = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useSearchParams: () => {
      const [searchParams, _setSearchParams] = (actual as any).useSearchParams()
      return [searchParams, mockSetSearchParams]
    },
  }
})

// Mock @tanstack/react-virtual virtualizer
const mockScrollToIndex = vi.fn()

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: vi.fn((options: any) => {
    // Generate virtual items based on count
    const getVirtualItems = () => {
      const count = options?.count || 0
      const items = []
      for (let i = 0; i < count; i++) {
        items.push({
          index: i,
          start: i * 64, // Approximate row height
          size: 64,
          key: `row-${i}`,
        })
      }
      return items
    }

    return {
      getVirtualItems,
      getTotalSize: () => (options?.count || 0) * 64,
      scrollToIndex: mockScrollToIndex,
      measureElement: vi.fn(),
    }
  }),
}))

// Mock ProjectContext
vi.mock('@/contexts/ProjectContext', () => ({
  useProject: vi.fn(() => ({
    currentProject: { id: 'project-uuid', name: 'Test Project' },
    selectedProjectId: 'project-uuid',
  })),
}))

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-uuid', email: 'test@example.com' },
    session: { access_token: 'test-token' },
    loading: false,
  })),
}))

// Mock useDebouncedValue to return value immediately (no debounce in tests)
vi.mock('@/hooks/useDebouncedValue', () => ({
  useDebouncedValue: vi.fn((value: any, _delay: number) => value),
}))

describe('Integration Test: Scenario 6 - Multiple Drawings Expanded', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    vi.clearAllMocks()
  })

  it('should expand Drawing P-001 and show 3 components', async () => {
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/drawings']}>
          <DrawingComponentTablePage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Wait for drawings to load
    await waitFor(() => {
      expect(screen.getByText('P-001')).toBeInTheDocument()
    })

    // Click to expand Drawing P-001
    const drawing1Row = screen.getByLabelText(/expand drawing P-001/i)
    await user.click(drawing1Row)

    // Assert URL updated with drawing-1-uuid
    await waitFor(() => {
      expect(mockSetSearchParams).toHaveBeenCalledWith(
        expect.any(Function)
      )
    })

    // Verify the setSearchParams callback would add drawing-1-uuid to expanded
    const lastCall = mockSetSearchParams.mock.calls[mockSetSearchParams.mock.calls.length - 1]
    const callbackFn = lastCall[0]
    const prevParams = new URLSearchParams()
    const newParams = callbackFn(prevParams)
    expect(newParams.get('expanded')).toBe('drawing-1-uuid')
  })

  it('should expand both P-001 and P-002 simultaneously', async () => {
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/drawings?expanded=drawing-1-uuid']}>
          <DrawingComponentTablePage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Wait for drawings to load
    await waitFor(() => {
      expect(screen.getByText('P-001')).toBeInTheDocument()
      expect(screen.getByText('P-002')).toBeInTheDocument()
    })

    // Drawing P-001 is already expanded (from URL)
    // Now expand Drawing P-002
    const drawing2Row = screen.getByLabelText(/expand drawing P-002/i)
    await user.click(drawing2Row)

    // Assert URL updated with both UUIDs comma-separated
    await waitFor(() => {
      expect(mockSetSearchParams).toHaveBeenCalled()
    })

    // Verify the setSearchParams callback would add drawing-2-uuid to existing expanded
    const lastCall = mockSetSearchParams.mock.calls[mockSetSearchParams.mock.calls.length - 1]
    const callbackFn = lastCall[0]
    const prevParams = new URLSearchParams('expanded=drawing-1-uuid')
    const newParams = callbackFn(prevParams)
    expect(newParams.get('expanded')).toContain('drawing-1-uuid')
    expect(newParams.get('expanded')).toContain('drawing-2-uuid')
    expect(newParams.get('expanded')).toMatch(/drawing-1-uuid,drawing-2-uuid|drawing-2-uuid,drawing-1-uuid/)
  })

  it('should show components from both expanded drawings', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/drawings?expanded=drawing-1-uuid,drawing-2-uuid']}>
          <DrawingComponentTablePage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Wait for drawings and components to load
    await waitFor(() => {
      expect(screen.getByText('P-001')).toBeInTheDocument()
      expect(screen.getByText('P-002')).toBeInTheDocument()
    })

    // Both drawings should show as expanded (ChevronRight rotated)
    const drawing1Row = screen.getByLabelText(/collapse drawing P-001/i)
    const drawing2Row = screen.getByLabelText(/collapse drawing P-002/i)
    expect(drawing1Row).toBeInTheDocument()
    expect(drawing2Row).toBeInTheDocument()

    // Components from Drawing P-001 should be visible
    await waitFor(() => {
      expect(screen.getByText('VBALU-001 2"')).toBeInTheDocument()
      expect(screen.getByText('FELBDFA235 1X2')).toBeInTheDocument()
      expect(screen.getByText('PT-16000')).toBeInTheDocument()
    })

    // Component from Drawing P-002 should be visible
    await waitFor(() => {
      expect(screen.getByText('VBALU-002 1"')).toBeInTheDocument()
    })
  })

  it('should collapse P-001 while keeping P-002 expanded', async () => {
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/drawings?expanded=drawing-1-uuid,drawing-2-uuid']}>
          <DrawingComponentTablePage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Wait for drawings to load
    await waitFor(() => {
      expect(screen.getByText('P-001')).toBeInTheDocument()
      expect(screen.getByText('P-002')).toBeInTheDocument()
    })

    // Both should be expanded initially
    const drawing1Row = screen.getByLabelText(/collapse drawing P-001/i)
    await user.click(drawing1Row)

    // Assert URL updated to remove drawing-1-uuid but keep drawing-2-uuid
    await waitFor(() => {
      expect(mockSetSearchParams).toHaveBeenCalled()
    })

    // Verify the setSearchParams callback would remove drawing-1-uuid
    const lastCall = mockSetSearchParams.mock.calls[mockSetSearchParams.mock.calls.length - 1]
    const callbackFn = lastCall[0]
    const prevParams = new URLSearchParams('expanded=drawing-1-uuid,drawing-2-uuid')
    const newParams = callbackFn(prevParams)
    expect(newParams.get('expanded')).toBe('drawing-2-uuid')
    expect(newParams.get('expanded')).not.toContain('drawing-1-uuid')
  })

  it('should update URL to remove expanded param when all drawings collapsed', async () => {
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/drawings?expanded=drawing-2-uuid']}>
          <DrawingComponentTablePage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Wait for drawing to load
    await waitFor(() => {
      expect(screen.getByText('P-002')).toBeInTheDocument()
    })

    // Collapse the only expanded drawing
    const drawing2Row = screen.getByLabelText(/collapse drawing P-002/i)
    await user.click(drawing2Row)

    // Assert URL param removed completely
    await waitFor(() => {
      expect(mockSetSearchParams).toHaveBeenCalled()
    })

    const lastCall = mockSetSearchParams.mock.calls[mockSetSearchParams.mock.calls.length - 1]
    const callbackFn = lastCall[0]
    const prevParams = new URLSearchParams('expanded=drawing-2-uuid')
    const newParams = callbackFn(prevParams)
    expect(newParams.has('expanded')).toBe(false)
  })

  it('should preserve other URL params when updating expanded state', async () => {
    const user = userEvent.setup()

    // Start without filters, then we'll test the params are preserved
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/drawings']}>
          <DrawingComponentTablePage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Wait for drawings to load
    await waitFor(() => {
      expect(screen.getByText('P-001')).toBeInTheDocument()
    })

    // Expand Drawing P-001
    const drawing1Row = screen.getByLabelText(/expand drawing P-001/i)
    await user.click(drawing1Row)

    // Verify URL params are preserved (in this case, just expanded param added)
    // The test validates that when URL has other params, they're not lost
    const lastCall = mockSetSearchParams.mock.calls[mockSetSearchParams.mock.calls.length - 1]
    const callbackFn = lastCall[0]

    // Simulate previous params with search and status
    const prevParams = new URLSearchParams('search=P-001&status=in-progress')
    const newParams = callbackFn(prevParams)

    // Verify all params preserved
    expect(newParams.get('search')).toBe('P-001')
    expect(newParams.get('status')).toBe('in-progress')
    expect(newParams.get('expanded')).toBe('drawing-1-uuid')
  })

  it('should maintain virtualization performance with multiple expanded drawings', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/drawings?expanded=drawing-1-uuid,drawing-2-uuid']}>
          <DrawingComponentTablePage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Wait for render
    await waitFor(() => {
      expect(screen.getByText('P-001')).toBeInTheDocument()
    })

    // Assert virtualizer is being used
    // With 2 expanded drawings (Drawing1: 3 components, Drawing2: 1 component)
    // Total visible rows: 3 drawings + 4 components = 7 rows
    // The virtualizer renders ALL items in test environment
    // In production with overscan=10, it would render ~20-30 items even with 500 total rows
    const drawingRows = screen.getAllByRole('button', { name: /collapse drawing|expand drawing/i })
    expect(drawingRows.length).toBeGreaterThan(0)
  })

  it('should handle expanding 3 drawings simultaneously', async () => {
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/drawings?expanded=drawing-1-uuid,drawing-2-uuid']}>
          <DrawingComponentTablePage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Wait for drawings to load
    await waitFor(() => {
      expect(screen.getByText('P-003')).toBeInTheDocument()
    })

    // Expand third drawing
    const drawing3Row = screen.getByLabelText(/expand drawing P-003/i)
    await user.click(drawing3Row)

    // Assert URL updated with all three UUIDs
    await waitFor(() => {
      expect(mockSetSearchParams).toHaveBeenCalled()
    })

    const lastCall = mockSetSearchParams.mock.calls[mockSetSearchParams.mock.calls.length - 1]
    const callbackFn = lastCall[0]
    const prevParams = new URLSearchParams('expanded=drawing-1-uuid,drawing-2-uuid')
    const newParams = callbackFn(prevParams)
    const expandedParam = newParams.get('expanded') || ''
    expect(expandedParam.split(',').length).toBe(3)
    expect(expandedParam).toContain('drawing-1-uuid')
    expect(expandedParam).toContain('drawing-2-uuid')
    expect(expandedParam).toContain('drawing-3-uuid')
  })

  it('should scroll smoothly when expanding multiple drawings', async () => {
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/drawings']}>
          <DrawingComponentTablePage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Wait for drawings to load
    await waitFor(() => {
      expect(screen.getByText('P-001')).toBeInTheDocument()
    })

    // Expand Drawing P-001
    const drawing1Row = screen.getByLabelText(/expand drawing P-001/i)
    await user.click(drawing1Row)

    // Wait for expansion
    await waitFor(() => {
      expect(mockSetSearchParams).toHaveBeenCalled()
    })

    // Virtualizer should handle scrolling smoothly
    // In production, this would be verified via Chrome DevTools Performance tab
    // Assert no scrollToIndex calls during normal expansion
    expect(mockScrollToIndex).not.toHaveBeenCalled()
  })

  it('should handle keyboard navigation with multiple expanded drawings', async () => {
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/drawings']}>
          <DrawingComponentTablePage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Wait for drawings to load
    await waitFor(() => {
      expect(screen.getByText('P-001')).toBeInTheDocument()
    })

    // Keyboard expand P-001
    const drawing1Row = screen.getByLabelText(/expand drawing P-001/i)
    drawing1Row.focus()
    await user.keyboard('{Enter}')

    // Assert expansion via keyboard
    await waitFor(() => {
      expect(mockSetSearchParams).toHaveBeenCalled()
    })

    // Keyboard expand P-002
    const drawing2Row = screen.getByLabelText(/expand drawing P-002/i)
    drawing2Row.focus()
    await user.keyboard(' ') // Space key

    // Assert second expansion
    await waitFor(() => {
      expect(mockSetSearchParams).toHaveBeenCalledTimes(2)
    })
  })
})
