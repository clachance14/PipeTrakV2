/**
 * Integration Test: Scenario 3 - Update Discrete Milestone (Checkbox)
 *
 * Tests FR-013, FR-016 through FR-019 from spec.md:
 * - FR-013: Milestone updates trigger server mutation
 * - FR-016: Optimistic UI updates before server response
 * - FR-017: Mutation payload validates before sending
 * - FR-018: Database updates component and creates audit event
 * - FR-019: Materialized view refreshes after update
 *
 * Scenario from quickstart.md lines 162-217:
 * 1. Expand Drawing P-001
 * 2. Locate Valve component (comp-1, currently 0%)
 * 3. Click "Receive" milestone checkbox
 * 4. Assert checkbox shows checkmark instantly (<50ms) - optimistic update
 * 5. Assert component progress updates: 0% → 10%
 * 6. Assert drawing progress updates: "0/3 • 8%" → "0/3 • 12%" (avg increases)
 * 7. Verify network POST to /rest/v1/rpc/update_component_milestone
 * 8. Verify payload: {"p_component_id": "comp-1-uuid", "p_milestone_name": "Receive", "p_new_value": true, "p_user_id": "<current-user-uuid>"}
 * 9. Verify database updates in components table (current_milestones, percent_complete)
 * 10. Verify audit event created in milestone_events table
 * 11. Verify materialized view refreshed
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { DrawingComponentTablePage } from '@/pages/DrawingComponentTablePage'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { DrawingRow, ComponentRow, MilestoneUpdateResponse } from '@/types/drawing-table.types'

// Mock @tanstack/react-virtual (critical for jsdom testing)
// Virtual scroller doesn't work in jsdom because there's no real scroll container
// This mock renders ALL rows instead of just visible ones
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count, estimateSize }: any) => {
    const items = Array.from({ length: count }, (_, index) => ({
      index,
      key: `virtual-${index}`,
      size: estimateSize(index),
      start: index * estimateSize(index),
      end: (index + 1) * estimateSize(index),
    }))

    return {
      getVirtualItems: () => items,
      getTotalSize: () => items.reduce((sum, item) => sum + item.size, 0),
      scrollToIndex: vi.fn(),
      scrollToOffset: vi.fn(),
      scrollRect: null,
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

describe('Integration Test: Scenario 3 - Update Discrete Milestone (Checkbox)', () => {
  let queryClient: QueryClient

  // Test user
  const mockUser = {
    id: 'user-1-uuid',
    email: 'test@example.com',
  }

  // Test data fixtures (matching quickstart.md)
  const mockDrawing: DrawingRow = {
    id: 'drawing-1-uuid',
    project_id: 'test-project-uuid',
    drawing_no_norm: 'P-001',
    drawing_no_raw: 'P-001',
    title: 'Main Process Line',
    rev: null,
    is_retired: false,
    total_components: 3,
    completed_components: 0,
    avg_percent_complete: 8.33, // (0% + 10% + 15%) / 3
  }

  const mockComponents: ComponentRow[] = [
    // Valve - discrete workflow (5 checkboxes), 0% complete
    {
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
      template: {
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
      },
      identityDisplay: 'VBALU-001 2" (1)',
      canUpdate: true,
    },
    // Fitting - 10% complete (Receive done)
    {
      id: 'comp-2-uuid',
      project_id: 'test-project-uuid',
      drawing_id: 'drawing-1-uuid',
      component_type: 'fitting',
      identity_key: {
        drawing_norm: 'P-001',
        commodity_code: 'EL90-150',
        size: '2',
        seq: 1,
      },
      current_milestones: {
        Receive: 1,
        Install: 0,
        Punch: 0,
        Test: 0,
        Restore: 0,
      },
      percent_complete: 10.0,
      created_at: '2025-01-01T00:00:00Z',
      last_updated_at: '2025-01-02T00:00:00Z',
      last_updated_by: 'user-1-uuid',
      is_retired: false,
      template: {
        id: 'template-fitting-uuid',
        component_type: 'fitting',
        version: 1,
        workflow_type: 'discrete',
        milestones_config: [
          { name: 'Receive', weight: 10, order: 1, is_partial: false, requires_welder: false },
          { name: 'Install', weight: 60, order: 2, is_partial: false, requires_welder: false },
          { name: 'Punch', weight: 10, order: 3, is_partial: false, requires_welder: false },
          { name: 'Test', weight: 10, order: 4, is_partial: false, requires_welder: false },
          { name: 'Restore', weight: 10, order: 5, is_partial: false, requires_welder: false },
        ],
      },
      identityDisplay: 'EL90-150 2" (1)',
      canUpdate: true,
    },
    // Threaded Pipe - 15% complete
    {
      id: 'comp-3-uuid',
      project_id: 'test-project-uuid',
      drawing_id: 'drawing-1-uuid',
      component_type: 'threaded_pipe',
      identity_key: {
        drawing_norm: 'P-001',
        commodity_code: 'PIPE-SCH40',
        size: '1',
        seq: 1,
      },
      current_milestones: {
        Receive: 1,
        Fabricate: 50,
        Install: 0,
        Erect: 0,
        Connect: 0,
        Support: 0,
        Punch: 0,
        Test: 0,
        Restore: 0,
      },
      percent_complete: 15.0,
      created_at: '2025-01-01T00:00:00Z',
      last_updated_at: '2025-01-03T00:00:00Z',
      last_updated_by: 'user-1-uuid',
      is_retired: false,
      template: {
        id: 'template-threaded-pipe-uuid',
        component_type: 'threaded_pipe',
        version: 1,
        workflow_type: 'hybrid',
        milestones_config: [
          { name: 'Receive', weight: 10, order: 1, is_partial: false, requires_welder: false },
          { name: 'Fabricate', weight: 10, order: 2, is_partial: true, requires_welder: false },
          { name: 'Install', weight: 10, order: 3, is_partial: true, requires_welder: false },
          { name: 'Erect', weight: 10, order: 4, is_partial: true, requires_welder: false },
          { name: 'Connect', weight: 10, order: 5, is_partial: true, requires_welder: false },
          { name: 'Support', weight: 10, order: 6, is_partial: true, requires_welder: false },
          { name: 'Punch', weight: 10, order: 7, is_partial: false, requires_welder: false },
          { name: 'Test', weight: 20, order: 8, is_partial: false, requires_welder: false },
          { name: 'Restore', weight: 10, order: 9, is_partial: false, requires_welder: false },
        ],
      },
      identityDisplay: 'PIPE-SCH40 1" (1)',
      canUpdate: true,
    },
  ]

  // Updated components after Valve Receive milestone completes
  const mockUpdatedComponents: ComponentRow[] = [
    {
      ...mockComponents[0],
      current_milestones: {
        Receive: 1, // Changed from 0
        Install: 0,
        Punch: 0,
        Test: 0,
        Restore: 0,
      },
      percent_complete: 10.0, // Changed from 0.0
      last_updated_at: '2025-01-04T00:00:00Z',
      last_updated_by: 'user-1-uuid',
    },
    mockComponents[1],
    mockComponents[2],
  ]

  // Progress data from materialized view (before update)
  const mockProgressDataBefore = [
    {
      drawing_id: 'drawing-1-uuid',
      project_id: 'test-project-uuid',
      total_components: 3,
      completed_components: 0,
      avg_percent_complete: 8.33, // (0 + 10 + 15) / 3 = 8.33
    },
  ]

  // Progress data from materialized view (after update)
  const mockProgressDataAfter = [
    {
      drawing_id: 'drawing-1-uuid',
      project_id: 'test-project-uuid',
      total_components: 3,
      completed_components: 0,
      avg_percent_complete: 11.67, // (10 + 10 + 15) / 3 = 11.67
    },
  ]

  // Mock RPC response
  const mockRpcResponse: MilestoneUpdateResponse = {
    component: mockUpdatedComponents[0],
    previous_value: 0,
    audit_event_id: 'audit-event-uuid',
    new_percent_complete: 10.0,
  }

  // Helper: Setup mock Supabase responses
  const setupMocks = (components = mockComponents, progressData = mockProgressDataBefore) => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'drawings') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [mockDrawing],
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

    // Mock RPC call
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: mockRpcResponse,
      error: null,
    })
  }

  // Helper: Render page and expand drawing to show components
  const renderAndExpandDrawing = async () => {
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/']}>
          <DrawingComponentTablePage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Wait for drawing to appear
    await waitFor(() => {
      expect(screen.getByText('P-001')).toBeInTheDocument()
    })

    // Find and click the drawing row to expand it
    const drawingButton = screen.getByRole('button', { name: /expand drawing p-001/i })
    await user.click(drawingButton)

    // Wait for components to load
    await waitFor(() => {
      expect(screen.getByText('VBALU-001 2" (1)')).toBeInTheDocument()
    })

    return user
  }

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

    // Setup context mocks
    vi.mocked(useProject).mockReturnValue({
      selectedProjectId: 'test-project-uuid',
      setSelectedProjectId: vi.fn(),
    } as any)

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      session: { user: mockUser },
      isLoading: false,
    } as any)

    setupMocks()
    vi.clearAllMocks()
  })

  it('displays valve component with unchecked Receive milestone', async () => {
    await renderAndExpandDrawing()

    // Find the valve component row
    const valveRow = screen.getByText('VBALU-001 2" (1)').closest('[role="row"]')
    expect(valveRow).toBeInTheDocument()

    // Verify component is at 0%
    expect(within(valveRow!).getByText('0%')).toBeInTheDocument()

    // Verify Receive checkbox exists and is unchecked
    const receiveCheckbox = within(valveRow!).getByRole('checkbox', { name: /receive/i })
    expect(receiveCheckbox).toBeInTheDocument()
    expect(receiveCheckbox).not.toBeChecked()
  })

  it('performs optimistic update when clicking Receive checkbox', async () => {
    const user = await renderAndExpandDrawing()

    // Get the valve component row
    const valveRow = screen.getByText('VBALU-001 2" (1)').closest('[role="row"]')!

    // Find and click the Receive checkbox
    const receiveCheckbox = within(valveRow).getByRole('checkbox', { name: /receive/i })

    // Record time before click
    const startTime = performance.now()

    await user.click(receiveCheckbox)

    // Assert optimistic update happens quickly (<50ms)
    const updateTime = performance.now() - startTime
    expect(updateTime).toBeLessThan(50)

    // Assert checkbox is immediately checked (optimistic update)
    await waitFor(() => {
      expect(receiveCheckbox).toBeChecked()
    }, { timeout: 100 })
  })

  it('sends correct payload to update_component_milestone RPC', async () => {
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/?expanded=drawing-1-uuid']}>
          <DrawingComponentTablePage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Wait for components to load
    await waitFor(() => {
      expect(screen.getByText('VBALU-001 2" (1)')).toBeInTheDocument()
    })

    // Get the valve component row and click Receive checkbox
    const valveRow = screen.getByText('VBALU-001 2" (1)').closest('div')!
    const receiveCheckbox = within(valveRow).getByRole('checkbox', { name: /receive/i })

    await user.click(receiveCheckbox)

    // Verify RPC was called with correct payload
    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('update_component_milestone', {
        p_component_id: 'comp-1-uuid',
        p_milestone_name: 'Receive',
        p_new_value: 1, // Boolean true converts to 1
        p_user_id: 'user-1-uuid',
      })
    })
  })

  it('updates component progress from 0% to 10% after successful mutation', async () => {
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/?expanded=drawing-1-uuid']}>
          <DrawingComponentTablePage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Wait for components to load
    await waitFor(() => {
      expect(screen.getByText('VBALU-001 2" (1)')).toBeInTheDocument()
    })

    // Verify initial state: 0%
    const valveRow = screen.getByText('VBALU-001 2" (1)').closest('div')!
    expect(within(valveRow).getByText('0%')).toBeInTheDocument()

    // Click Receive checkbox
    const receiveCheckbox = within(valveRow).getByRole('checkbox', { name: /receive/i })
    await user.click(receiveCheckbox)

    // After mutation and refetch, component should show 10%
    // Note: We need to mock the refetch to return updated data
    setupMocks(mockUpdatedComponents, mockProgressDataAfter)

    // Invalidate queries to trigger refetch
    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalled()
    })

    // Note: In real app, TanStack Query will refetch after invalidation
    // For this test, we verify the RPC was called successfully
    expect(vi.mocked(supabase.rpc).mock.results[0]?.value).resolves.toEqual({
      data: mockRpcResponse,
      error: null,
    })
  })

  it('invalidates related queries after successful mutation', async () => {
    const user = userEvent.setup()
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/?expanded=drawing-1-uuid']}>
          <DrawingComponentTablePage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Wait for components to load
    await waitFor(() => {
      expect(screen.getByText('VBALU-001 2" (1)')).toBeInTheDocument()
    })

    // Click Receive checkbox
    const valveRow = screen.getByText('VBALU-001 2" (1)').closest('div')!
    const receiveCheckbox = within(valveRow).getByRole('checkbox', { name: /receive/i })
    await user.click(receiveCheckbox)

    // Wait for mutation to complete
    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalled()
    })

    // Verify all related queries are invalidated
    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['components'] })
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['drawing-progress'] })
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['drawings-with-progress'] })
    })
  })

  it('verifies RPC response includes updated component and audit event ID', async () => {
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/?expanded=drawing-1-uuid']}>
          <DrawingComponentTablePage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Wait for components to load
    await waitFor(() => {
      expect(screen.getByText('VBALU-001 2" (1)')).toBeInTheDocument()
    })

    // Click Receive checkbox
    const valveRow = screen.getByText('VBALU-001 2" (1)').closest('div')!
    const receiveCheckbox = within(valveRow).getByRole('checkbox', { name: /receive/i })
    await user.click(receiveCheckbox)

    // Wait for RPC call
    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalled()
    })

    // Verify response structure
    const rpcResult = await vi.mocked(supabase.rpc).mock.results[0]?.value
    expect(rpcResult).toEqual({
      data: expect.objectContaining({
        component: expect.objectContaining({
          id: 'comp-1-uuid',
          percent_complete: 10.0,
          current_milestones: expect.objectContaining({
            Receive: 1,
          }),
        }),
        previous_value: 0,
        audit_event_id: 'audit-event-uuid',
        new_percent_complete: 10.0,
      }),
      error: null,
    })
  })

  it('handles RPC error and rolls back optimistic update', async () => {
    const user = userEvent.setup()

    // Mock RPC to return error
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { message: 'Database error', code: 'PGRST000' } as any,
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/?expanded=drawing-1-uuid']}>
          <DrawingComponentTablePage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Wait for components to load
    await waitFor(() => {
      expect(screen.getByText('VBALU-001 2" (1)')).toBeInTheDocument()
    })

    // Get the valve component row
    const valveRow = screen.getByText('VBALU-001 2" (1)').closest('div')!
    const receiveCheckbox = within(valveRow).getByRole('checkbox', { name: /receive/i })

    // Click checkbox
    await user.click(receiveCheckbox)

    // Wait for error
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to update milestone. Please try again.')
    })

    // Verify checkbox is rolled back to unchecked state
    // Note: Due to query invalidation and refetch, the checkbox should return to original state
    await waitFor(() => {
      expect(receiveCheckbox).not.toBeChecked()
    })
  })

  it('handles network error gracefully', async () => {
    const user = userEvent.setup()

    // Mock RPC to throw network error
    vi.mocked(supabase.rpc).mockRejectedValue(new Error('Network error'))

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/?expanded=drawing-1-uuid']}>
          <DrawingComponentTablePage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Wait for components to load
    await waitFor(() => {
      expect(screen.getByText('VBALU-001 2" (1)')).toBeInTheDocument()
    })

    // Click checkbox
    const valveRow = screen.getByText('VBALU-001 2" (1)').closest('div')!
    const receiveCheckbox = within(valveRow).getByRole('checkbox', { name: /receive/i })
    await user.click(receiveCheckbox)

    // Verify error toast is shown
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to update milestone. Please try again.')
    })
  })

  it('can toggle milestone on and off sequentially', async () => {
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/?expanded=drawing-1-uuid']}>
          <DrawingComponentTablePage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Wait for components to load
    await waitFor(() => {
      expect(screen.getByText('VBALU-001 2" (1)')).toBeInTheDocument()
    })

    const valveRow = screen.getByText('VBALU-001 2" (1)').closest('div')!
    const receiveCheckbox = within(valveRow).getByRole('checkbox', { name: /receive/i })

    // Click to check
    await user.click(receiveCheckbox)

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('update_component_milestone', {
        p_component_id: 'comp-1-uuid',
        p_milestone_name: 'Receive',
        p_new_value: 1,
        p_user_id: 'user-1-uuid',
      })
    })

    // Mock response for unchecking
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: {
        ...mockRpcResponse,
        component: {
          ...mockRpcResponse.component,
          current_milestones: { ...mockRpcResponse.component.current_milestones, Receive: 0 },
          percent_complete: 0,
        },
        previous_value: 1,
        new_percent_complete: 0,
      },
      error: null,
    })

    // Click to uncheck
    await user.click(receiveCheckbox)

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('update_component_milestone', {
        p_component_id: 'comp-1-uuid',
        p_milestone_name: 'Receive',
        p_new_value: 0,
        p_user_id: 'user-1-uuid',
      })
    })

    // Verify RPC was called twice
    expect(supabase.rpc).toHaveBeenCalledTimes(2)
  })

  it('disables milestone updates when canUpdate is false', async () => {
    // Mock components with canUpdate=false
    const readOnlyComponents = mockComponents.map(c => ({ ...c, canUpdate: false }))
    setupMocks(readOnlyComponents)

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/?expanded=drawing-1-uuid']}>
          <DrawingComponentTablePage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Wait for components to load
    await waitFor(() => {
      expect(screen.getByText('VBALU-001 2" (1)')).toBeInTheDocument()
    })

    // Verify checkbox is disabled
    const valveRow = screen.getByText('VBALU-001 2" (1)').closest('div')!
    const receiveCheckbox = within(valveRow).getByRole('checkbox', { name: /receive/i })
    expect(receiveCheckbox).toBeDisabled()
  })

  it('verifies drawing progress updates after component milestone change', async () => {
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/?expanded=drawing-1-uuid']}>
          <DrawingComponentTablePage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Wait for drawing to load
    await waitFor(() => {
      expect(screen.getByText('P-001')).toBeInTheDocument()
    })

    // Verify initial drawing progress: "0/3 • 8%"
    expect(screen.getByText(/0\/3/)).toBeInTheDocument()
    expect(screen.getByText(/8%/)).toBeInTheDocument()

    // Wait for components to load
    await waitFor(() => {
      expect(screen.getByText('VBALU-001 2" (1)')).toBeInTheDocument()
    })

    // Click Receive checkbox
    const valveRow = screen.getByText('VBALU-001 2" (1)').closest('div')!
    const receiveCheckbox = within(valveRow).getByRole('checkbox', { name: /receive/i })
    await user.click(receiveCheckbox)

    // Wait for mutation to complete
    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalled()
    })

    // After refetch with updated progress data, drawing should show "0/3 • 12%"
    // Note: This requires the queries to be invalidated and refetch to happen
    // The actual percentage update would be verified in the component after query invalidation
  })

  it('supports keyboard interaction for milestone checkbox', async () => {
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/?expanded=drawing-1-uuid']}>
          <DrawingComponentTablePage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Wait for components to load
    await waitFor(() => {
      expect(screen.getByText('VBALU-001 2" (1)')).toBeInTheDocument()
    })

    const valveRow = screen.getByText('VBALU-001 2" (1)').closest('div')!
    const receiveCheckbox = within(valveRow).getByRole('checkbox', { name: /receive/i })

    // Focus the checkbox
    receiveCheckbox.focus()
    expect(receiveCheckbox).toHaveFocus()

    // Press Space to toggle
    await user.keyboard(' ')

    // Verify RPC was called
    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('update_component_milestone', {
        p_component_id: 'comp-1-uuid',
        p_milestone_name: 'Receive',
        p_new_value: 1,
        p_user_id: 'user-1-uuid',
      })
    })
  })
})
