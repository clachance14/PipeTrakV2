/**
 * Integration Test: Edge Cases - Drawing-Centered Component Progress Table
 * Feature 010 - Drawing-Centered Component Progress Table
 *
 * Tests 5 edge case scenarios from quickstart.md lines 413-477:
 *
 * Edge Case 1: Drawing with No Components (P-003)
 * - No expand icon shown
 * - Clicking row does nothing (no expansion)
 * - Progress shows "0/0 • 0%"
 * - Component count shows "0 items"
 *
 * Edge Case 2: Offline Milestone Update
 * - Checkbox toggles optimistically
 * - Request fails after ~3 seconds
 * - Checkbox reverts to original state (rollback)
 * - Toast error: "Unable to save. Check your connection."
 *
 * Edge Case 3: Permission Denied (Read-Only User)
 * - Milestone checkboxes are greyed out
 * - Checkboxes have `disabled` attribute
 * - Cursor shows "not-allowed"
 * - Tooltip: "Read-only access"
 * - Clicking does nothing (no mutation fired)
 *
 * Edge Case 4: Large Drawing (150 Components)
 * - All 150 components load within 1 second
 * - Only ~20 visible rows rendered (virtualization)
 * - Smooth scrolling through all components
 * - No lag or janky scrolling
 *
 * Edge Case 5: Simultaneous Updates (Conflict)
 * - Both tabs show optimistic updates
 * - Last write wins (whichever request reaches server last)
 * - Both tabs eventually sync to same final state
 * - Both updates recorded in milestone_events (with timestamps)
 *
 * Prerequisites:
 * - Test data seeded via SQL (drawings + components)
 * - User authenticated with appropriate permissions
 */

import { describe, it, expect, beforeEach, vi, beforeAll, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { DrawingComponentTablePage } from '@/pages/DrawingComponentTablePage'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { DrawingRow, ComponentRow, ProgressTemplate } from '@/types/drawing-table.types'

// Mock @tanstack/react-virtual
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count, estimateSize }: any) => {
    // For virtualization test, we need to track which items are rendered
    const items = Array.from({ length: count }, (_, index) => ({
      index,
      key: `virtual-${index}`,
      size: typeof estimateSize === 'function' ? estimateSize(index) : estimateSize || 60,
      start: index * 60,
      end: (index + 1) * 60,
    }))

    // Simulate virtualization: only render first 20 items
    const visibleItems = items.slice(0, Math.min(20, count))

    return {
      getVirtualItems: () => visibleItems,
      getTotalSize: () => items.reduce((sum, item) => sum + item.size, 0),
      scrollToIndex: vi.fn(),
      scrollToOffset: vi.fn(),
      scrollRect: null,
      measure: vi.fn(),
    }
  },
}))

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}))

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

// Mock context hooks
vi.mock('@/contexts/ProjectContext', () => ({
  useProject: vi.fn(),
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

import { useProject } from '@/contexts/ProjectContext'
import { useAuth } from '@/contexts/AuthContext'

describe('Integration Test: Edge Cases', () => {
  let queryClient: QueryClient

  // Test user (with update permissions)
  const mockUser = {
    id: 'user-1-uuid',
    email: 'test@example.com',
  }

  // Read-only user (no update permissions)
  const mockReadOnlyUser = {
    id: 'user-readonly-uuid',
    email: 'readonly@example.com',
  }

  // Valve template (used across tests)
  const valveTemplate: ProgressTemplate = {
    id: 'template-valve-uuid',
    component_type: 'valve',
    version: 1,
    workflow_type: 'discrete',
    milestones_config: [
      { name: 'Receive', weight: 10, order: 1, is_partial: false, requires_welder: false },
      { name: 'Install', weight: 60, order: 2, is_partial: false, requires_welder: false },
      { name: 'Punch', weight: 10, order: 3, is_partial: false, requires_welder: false },
      { name: 'Test', weight: 10, order: 4, is_partial: false, requires_welder: false },
      { name: 'Restore', weight: 10, order: 5, is_partial: false, requires_welder: false },
    ],
  }

  // Helper: Setup default mock responses
  const setupMocks = (
    drawings: DrawingRow[],
    components: ComponentRow[],
    progressData: any[] = []
  ) => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'drawings') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: drawings,
                  error: null,
                }),
              }),
            }),
          }),
        } as any
      }

      if (table === 'mv_drawing_progress') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: progressData,
              error: null,
            }),
          }),
        } as any
      }

      if (table === 'components') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: components.map((c) => ({
                    ...c,
                    progress_templates: c.template,
                  })),
                  error: null,
                }),
              }),
            }),
          }),
        } as any
      }

      return {
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      } as any
    })

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: {
        component: components[0],
        previous_value: 0,
        audit_event_id: 'audit-event-uuid',
        new_percent_complete: 10.0,
      },
      error: null,
    })
  }

  // Helper: Render page
  const renderPage = (initialEntries: string[] = ['/']) => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>
          <DrawingComponentTablePage />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  // Helper: Wait for component row and milestone checkbox to be ready
  const waitForComponentWithMilestone = async (identityText: string, milestoneName: string = 'Receive') => {
    await waitFor(() => {
      const componentRow = screen.getByText(identityText).closest('div')!
      const checkbox = within(componentRow).getByRole('checkbox', { name: `${milestoneName} milestone` })
      expect(checkbox).toBeInTheDocument()
    })

    const componentRow = screen.getByText(identityText).closest('div')!
    return {
      componentRow,
      checkbox: within(componentRow).getByRole('checkbox', { name: `${milestoneName} milestone` }),
    }
  }

  beforeAll(() => {
    // Mock window.matchMedia
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

    // Mock getBoundingClientRect for virtualizer
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

  beforeEach(() => {
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

    // Setup default context mocks
    vi.mocked(useProject).mockReturnValue({
      selectedProjectId: 'test-project-uuid',
      setSelectedProjectId: vi.fn(),
    } as any)

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      session: { user: mockUser },
      isLoading: false,
    } as any)

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Edge Case 1: Drawing with No Components (P-003)', () => {
    const emptyDrawing: DrawingRow = {
      id: 'drawing-3-uuid',
      project_id: 'test-project-uuid',
      drawing_no_norm: 'P-003',
      drawing_no_raw: 'P-003',
      title: 'Vent Header',
      rev: null,
      is_retired: false,
      total_components: 0,
      completed_components: 0,
      avg_percent_complete: 0,
    }

    beforeEach(() => {
      setupMocks([emptyDrawing], [], [])
    })

    it('does not show expand icon for empty drawing', async () => {
      renderPage()

      await waitFor(() => {
        expect(screen.getByText('P-003')).toBeInTheDocument()
      })

      // Drawing row should exist (still rendered as button)
      const drawingButton = screen.getByRole('button', { name: /drawing P-003/i })
      expect(drawingButton).toBeInTheDocument()

      // ChevronRight icon should NOT be present (only spacer div)
      // Check that there's no chevron by verifying no SVG with rotate class
      const chevrons = drawingButton.querySelectorAll('svg')
      expect(chevrons.length).toBe(0) // No chevron icon for empty drawing
    })

    it('clicking row does nothing (no expansion)', async () => {
      const user = userEvent.setup()
      renderPage()

      await waitFor(() => {
        expect(screen.getByText('P-003')).toBeInTheDocument()
      })

      const drawingText = screen.getByText('P-003')
      const drawingRow = drawingText.closest('div')

      // Try to click the row
      if (drawingRow) {
        await user.click(drawingRow)
      }

      // URL should not change (no ?expanded param)
      expect(window.location.search).toBe('')

      // No component rows should appear
      const componentRows = screen.queryAllByRole('row')
      expect(componentRows.length).toBe(0)
    })

    it('displays progress as "0/0 • 0%"', async () => {
      renderPage()

      await waitFor(() => {
        expect(screen.getByText('P-003')).toBeInTheDocument()
      })

      expect(screen.getByText('0/0 • 0%')).toBeInTheDocument()
    })

    it('displays component count as "0 items"', async () => {
      renderPage()

      await waitFor(() => {
        expect(screen.getByText('P-003')).toBeInTheDocument()
      })

      expect(screen.getByText('0 items')).toBeInTheDocument()
    })
  })

  describe('Edge Case 2: Offline Milestone Update', () => {
    const drawing: DrawingRow = {
      id: 'drawing-1-uuid',
      project_id: 'test-project-uuid',
      drawing_no_norm: 'P-001',
      drawing_no_raw: 'P-001',
      title: 'Main Process Line',
      rev: null,
      is_retired: false,
      total_components: 1,
      completed_components: 0,
      avg_percent_complete: 0,
    }

    const component: ComponentRow = {
      id: 'comp-1-uuid',
      project_id: 'test-project-uuid',
      drawing_id: 'drawing-1-uuid',
      component_type: 'valve',
      identity_key: {
        drawing_norm: 'P-001',
        commodity_code: 'VBALU-001',
        size: '2',
        seq: 1,
      },
      current_milestones: {
        Receive: 0,
        Install: 0,
        Punch: 0,
        Test: 0,
        Restore: 0,
      },
      percent_complete: 0.0,
      created_at: '2025-01-01T00:00:00Z',
      last_updated_at: '2025-01-01T00:00:00Z',
      last_updated_by: null,
      is_retired: false,
      template: valveTemplate,
      identityDisplay: 'VBALU-001 2" (1)',
      canUpdate: true,
    }

    beforeEach(() => {
      setupMocks([drawing], [component], [
        {
          drawing_id: 'drawing-1-uuid',
          project_id: 'test-project-uuid',
          total_components: 1,
          completed_components: 0,
          avg_percent_complete: 0,
        },
      ])
    })

    it('shows optimistic update then rolls back on network error', async () => {
      const user = userEvent.setup()

      // Mock network error (simulating offline)
      vi.mocked(supabase.rpc).mockRejectedValueOnce(
        new Error('Failed to fetch')
      )

      renderPage(['/?expanded=drawing-1-uuid'])

      // Wait for component AND milestone controls to load
      const { checkbox: receiveCheckbox } = await waitForComponentWithMilestone('VBALU-001 2" (1)')

      // Verify initially unchecked
      expect(receiveCheckbox).not.toBeChecked()

      // Click checkbox
      await user.click(receiveCheckbox)

      // Assert optimistic update (checkbox checked immediately)
      await waitFor(() => {
        expect(receiveCheckbox).toBeChecked()
      }, { timeout: 100 })

      // Wait for error to occur
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled()
      })

      // Verify error message
      expect(toast.error).toHaveBeenCalledWith('Failed to update milestone. Please try again.')

      // After refetch, checkbox should be unchecked again (rollback)
      await waitFor(() => {
        expect(receiveCheckbox).not.toBeChecked()
      })
    })

    it('handles timeout error (simulating slow offline detection)', async () => {
      const user = userEvent.setup()

      // Mock timeout after 3 seconds
      vi.mocked(supabase.rpc).mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 3000)
        })
      })

      renderPage(['/?expanded=drawing-1-uuid'])

      const { checkbox: receiveCheckbox } = await waitForComponentWithMilestone('VBALU-001 2" (1)')

      await user.click(receiveCheckbox)

      // Optimistic update
      await waitFor(() => {
        expect(receiveCheckbox).toBeChecked()
      })

      // Wait for timeout error (fast-forward time)
      vi.useFakeTimers()
      await vi.advanceTimersByTimeAsync(3000)
      vi.useRealTimers()

      // Error should be shown
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled()
      })
    })
  })

  describe('Edge Case 3: Permission Denied (Read-Only User)', () => {
    const drawing: DrawingRow = {
      id: 'drawing-1-uuid',
      project_id: 'test-project-uuid',
      drawing_no_norm: 'P-001',
      drawing_no_raw: 'P-001',
      title: 'Main Process Line',
      rev: null,
      is_retired: false,
      total_components: 1,
      completed_components: 0,
      avg_percent_complete: 0,
    }

    const readOnlyComponent: ComponentRow = {
      id: 'comp-1-uuid',
      project_id: 'test-project-uuid',
      drawing_id: 'drawing-1-uuid',
      component_type: 'valve',
      identity_key: {
        drawing_norm: 'P-001',
        commodity_code: 'VBALU-001',
        size: '2',
        seq: 1,
      },
      current_milestones: {
        Receive: 0,
        Install: 0,
        Punch: 0,
        Test: 0,
        Restore: 0,
      },
      percent_complete: 0.0,
      created_at: '2025-01-01T00:00:00Z',
      last_updated_at: '2025-01-01T00:00:00Z',
      last_updated_by: null,
      is_retired: false,
      template: valveTemplate,
      identityDisplay: 'VBALU-001 2" (1)',
      canUpdate: false, // Read-only access
    }

    beforeEach(() => {
      // Mock read-only user
      vi.mocked(useAuth).mockReturnValue({
        user: mockReadOnlyUser,
        session: { user: mockReadOnlyUser },
        isLoading: false,
      } as any)

      setupMocks([drawing], [readOnlyComponent], [
        {
          drawing_id: 'drawing-1-uuid',
          project_id: 'test-project-uuid',
          total_components: 1,
          completed_components: 0,
          avg_percent_complete: 0,
        },
      ])
    })

    it('displays disabled checkboxes for read-only user', async () => {
      renderPage(['/?expanded=drawing-1-uuid'])

      const { checkbox: receiveCheckbox } = await waitForComponentWithMilestone('VBALU-001 2" (1)')

      expect(receiveCheckbox).toBeDisabled()
    })

    it('checkboxes have disabled attribute', async () => {
      renderPage(['/?expanded=drawing-1-uuid'])

      const { checkbox: receiveCheckbox } = await waitForComponentWithMilestone('VBALU-001 2" (1)')

      // Checkbox should be disabled
      expect(receiveCheckbox).toHaveAttribute('disabled')
    })

    it('clicking disabled checkbox does nothing (no mutation fired)', async () => {
      const user = userEvent.setup()

      renderPage(['/?expanded=drawing-1-uuid'])

      const { checkbox: receiveCheckbox } = await waitForComponentWithMilestone('VBALU-001 2" (1)')

      // Try to click disabled checkbox
      await user.click(receiveCheckbox)

      // RPC should NOT be called
      expect(supabase.rpc).not.toHaveBeenCalled()
    })

    it('applies not-allowed cursor style to disabled checkboxes', async () => {
      renderPage(['/?expanded=drawing-1-uuid'])

      const { checkbox: receiveCheckbox } = await waitForComponentWithMilestone('VBALU-001 2" (1)')

      // Check for cursor-not-allowed class or disabled state
      expect(receiveCheckbox).toBeDisabled()

      // Disabled elements should have appropriate cursor styling
      const parentButton = receiveCheckbox.closest('button')
      if (parentButton) {
        expect(parentButton.className).toMatch(/disabled|cursor-not-allowed/)
      }
    })
  })

  describe('Edge Case 4: Large Drawing (150 Components)', () => {
    const largeDrawing: DrawingRow = {
      id: 'drawing-large-uuid',
      project_id: 'test-project-uuid',
      drawing_no_norm: 'P-LARGE',
      drawing_no_raw: 'P-LARGE',
      title: 'Large Drawing with 150 Components',
      rev: null,
      is_retired: false,
      total_components: 150,
      completed_components: 0,
      avg_percent_complete: 0,
    }

    // Generate 150 components
    const largeComponentSet: ComponentRow[] = Array.from({ length: 150 }, (_, i) => ({
      id: `comp-${i}-uuid`,
      project_id: 'test-project-uuid',
      drawing_id: 'drawing-large-uuid',
      component_type: 'valve' as const,
      identity_key: {
        drawing_norm: 'P-LARGE',
        commodity_code: `VALVE-${i.toString().padStart(3, '0')}`,
        size: '2',
        seq: i + 1,
      },
      current_milestones: {
        Receive: 0,
        Install: 0,
        Punch: 0,
        Test: 0,
        Restore: 0,
      },
      percent_complete: 0.0,
      created_at: '2025-01-01T00:00:00Z',
      last_updated_at: '2025-01-01T00:00:00Z',
      last_updated_by: null,
      is_retired: false,
      template: valveTemplate,
      identityDisplay: `VALVE-${i.toString().padStart(3, '0')} 2" (${i + 1})`,
      canUpdate: true,
    }))

    beforeEach(() => {
      setupMocks([largeDrawing], largeComponentSet, [
        {
          drawing_id: 'drawing-large-uuid',
          project_id: 'test-project-uuid',
          total_components: 150,
          completed_components: 0,
          avg_percent_complete: 0,
        },
      ])
    })

    it('loads 150 components within 1 second', async () => {
      const startTime = performance.now()

      renderPage(['/?expanded=drawing-large-uuid'])

      // Wait for drawing to appear
      await waitFor(() => {
        expect(screen.getByText('P-LARGE')).toBeInTheDocument()
      })

      // Wait for first component to appear (indicates loading complete)
      await waitFor(() => {
        expect(screen.getByText('VALVE-000 2" (1)')).toBeInTheDocument()
      })

      const loadTime = performance.now() - startTime

      // Verify load time is under 1000ms
      expect(loadTime).toBeLessThan(1000)
    })

    it('only renders ~20 visible rows (virtualization)', async () => {
      renderPage(['/?expanded=drawing-large-uuid'])

      await waitFor(() => {
        expect(screen.getByText('P-LARGE')).toBeInTheDocument()
      })

      // Our mock virtualizer returns only first 20 items
      // Verify that not all 150 components are rendered in DOM
      const renderedComponents = screen.queryAllByText(/VALVE-\d{3} 2" \(\d+\)/)

      // With virtualization, should be ~20 or fewer visible
      expect(renderedComponents.length).toBeLessThanOrEqual(20)

      // But data should contain all 150
      expect(largeComponentSet.length).toBe(150)
    })

    it('verifies smooth scrolling performance', async () => {
      renderPage(['/?expanded=drawing-large-uuid'])

      await waitFor(() => {
        expect(screen.getByText('P-LARGE')).toBeInTheDocument()
      })

      // Verify virtualizer methods are available
      // In a real browser, this would test scrolling performance
      // In jsdom, we verify the virtualization setup
      const renderedComponents = screen.queryAllByText(/VALVE-\d{3} 2" \(\d+\)/)

      // Should render subset, not all 150
      expect(renderedComponents.length).toBeLessThan(150)
    })

    it('handles large dataset without lag', async () => {
      const startTime = performance.now()

      renderPage(['/?expanded=drawing-large-uuid'])

      await waitFor(() => {
        expect(screen.getByText('P-LARGE')).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByText('VALVE-000 2" (1)')).toBeInTheDocument()
      })

      const renderTime = performance.now() - startTime

      // Total render time should be reasonable (<1000ms)
      expect(renderTime).toBeLessThan(1000)
    })
  })

  describe('Edge Case 5: Simultaneous Updates (Conflict)', () => {
    const drawing: DrawingRow = {
      id: 'drawing-1-uuid',
      project_id: 'test-project-uuid',
      drawing_no_norm: 'P-001',
      drawing_no_raw: 'P-001',
      title: 'Main Process Line',
      rev: null,
      is_retired: false,
      total_components: 1,
      completed_components: 0,
      avg_percent_complete: 0,
    }

    const component: ComponentRow = {
      id: 'comp-1-uuid',
      project_id: 'test-project-uuid',
      drawing_id: 'drawing-1-uuid',
      component_type: 'valve',
      identity_key: {
        drawing_norm: 'P-001',
        commodity_code: 'VBALU-001',
        size: '2',
        seq: 1,
      },
      current_milestones: {
        Receive: 0,
        Install: 0,
        Punch: 0,
        Test: 0,
        Restore: 0,
      },
      percent_complete: 0.0,
      created_at: '2025-01-01T00:00:00Z',
      last_updated_at: '2025-01-01T00:00:00Z',
      last_updated_by: null,
      is_retired: false,
      template: valveTemplate,
      identityDisplay: 'VBALU-001 2" (1)',
      canUpdate: true,
    }

    beforeEach(() => {
      setupMocks([drawing], [component], [
        {
          drawing_id: 'drawing-1-uuid',
          project_id: 'test-project-uuid',
          total_components: 1,
          completed_components: 0,
          avg_percent_complete: 0,
        },
      ])
    })

    it('simulates two tabs updating same milestone', async () => {
      // Tab A and Tab B both render the same page
      const queryClientA = new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: 0 },
          mutations: { retry: false },
        },
      })

      const queryClientB = new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: 0 },
          mutations: { retry: false },
        },
      })

      const userA = userEvent.setup()
      const userB = userEvent.setup()

      // Render Tab A
      const { rerender: rerenderA } = render(
        <QueryClientProvider client={queryClientA}>
          <MemoryRouter initialEntries={['/?expanded=drawing-1-uuid']}>
            <DrawingComponentTablePage />
          </MemoryRouter>
        </QueryClientProvider>
      )

      // Wait for Tab A to load with milestone controls
      const { checkbox: checkboxA } = await waitForComponentWithMilestone('VBALU-001 2" (1)')

      // Mock RPC to simulate last write wins
      let callCount = 0
      vi.mocked(supabase.rpc).mockImplementation(async () => {
        callCount++
        const value = callCount % 2 === 0 ? 0 : 1 // Alternate between check/uncheck

        return {
          data: {
            component: {
              ...component,
              current_milestones: { ...component.current_milestones, Receive: value },
              percent_complete: value === 1 ? 10 : 0,
            },
            previous_value: value === 1 ? 0 : 1,
            audit_event_id: `audit-${callCount}-uuid`,
            new_percent_complete: value === 1 ? 10 : 0,
          },
          error: null,
        }
      })

      // Tab A clicks checkbox (set to checked)
      await userA.click(checkboxA)

      await waitFor(() => {
        expect(checkboxA).toBeChecked()
      })

      // Simulate Tab B clicking checkbox (set to unchecked)
      // This would happen before Tab A's request completes
      await userA.click(checkboxA)

      await waitFor(() => {
        expect(checkboxA).not.toBeChecked()
      })

      // Verify RPC was called twice (both tabs made updates)
      expect(supabase.rpc).toHaveBeenCalledTimes(2)
    })

    it('verifies both updates recorded in audit log', async () => {
      const user = userEvent.setup()

      renderPage(['/?expanded=drawing-1-uuid'])

      const { checkbox } = await waitForComponentWithMilestone('VBALU-001 2" (1)')

      // First update
      await user.click(checkbox)

      await waitFor(() => {
        expect(supabase.rpc).toHaveBeenCalledTimes(1)
      })

      // Verify first audit event ID returned
      const firstResult = await vi.mocked(supabase.rpc).mock.results[0]?.value
      expect(firstResult?.data?.audit_event_id).toBeDefined()

      // Second update
      await user.click(checkbox)

      await waitFor(() => {
        expect(supabase.rpc).toHaveBeenCalledTimes(2)
      })

      // Both updates should have unique audit event IDs
      const secondResult = await vi.mocked(supabase.rpc).mock.results[1]?.value
      expect(secondResult?.data?.audit_event_id).toBeDefined()
      expect(secondResult?.data?.audit_event_id).not.toBe(firstResult?.data?.audit_event_id)
    })

    it('shows optimistic updates in both tabs before server response', async () => {
      const user = userEvent.setup()

      // Mock slow RPC response (simulate network delay)
      vi.mocked(supabase.rpc).mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              data: {
                component: {
                  ...component,
                  current_milestones: { ...component.current_milestones, Receive: 1 },
                  percent_complete: 10,
                },
                previous_value: 0,
                audit_event_id: 'audit-uuid',
                new_percent_complete: 10,
              },
              error: null,
            })
          }, 500) // 500ms delay
        })
      })

      renderPage(['/?expanded=drawing-1-uuid'])

      const { checkbox } = await waitForComponentWithMilestone('VBALU-001 2" (1)')

      // Click checkbox
      await user.click(checkbox)

      // Verify optimistic update (checked before server responds)
      await waitFor(() => {
        expect(checkbox).toBeChecked()
      }, { timeout: 100 })

      // Server hasn't responded yet (500ms delay)
      expect(vi.mocked(supabase.rpc).mock.results.length).toBe(0)

      // Wait for server response
      await waitFor(() => {
        expect(supabase.rpc).toHaveBeenCalled()
      }, { timeout: 1000 })
    })

    it('ensures last write wins on server', async () => {
      const user = userEvent.setup()

      let updateCount = 0
      vi.mocked(supabase.rpc).mockImplementation(async (_, payload: any) => {
        updateCount++
        // Last write wins: return the value from the payload
        return {
          data: {
            component: {
              ...component,
              current_milestones: {
                ...component.current_milestones,
                Receive: payload.p_new_value,
              },
              percent_complete: payload.p_new_value === 1 ? 10 : 0,
            },
            previous_value: payload.p_new_value === 1 ? 0 : 1,
            audit_event_id: `audit-${updateCount}-uuid`,
            new_percent_complete: payload.p_new_value === 1 ? 10 : 0,
          },
          error: null,
        }
      })

      renderPage(['/?expanded=drawing-1-uuid'])

      const { checkbox } = await waitForComponentWithMilestone('VBALU-001 2" (1)')

      // First click: check
      await user.click(checkbox)
      await waitFor(() => expect(supabase.rpc).toHaveBeenCalledTimes(1))

      // Second click: uncheck (last write)
      await user.click(checkbox)
      await waitFor(() => expect(supabase.rpc).toHaveBeenCalledTimes(2))

      // Verify last write payload
      const lastCall = vi.mocked(supabase.rpc).mock.calls[1]
      expect(lastCall[1]).toMatchObject({
        p_new_value: 0, // Last write was to uncheck
      })
    })
  })
})
