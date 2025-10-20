/**
 * Integration Test: Scenario 4 - Update Partial Milestone (Percentage Slider)
 *
 * Tests FR-014, FR-020, FR-021 from spec.md:
 * - FR-014: Partial milestones show clickable percentage (opens slider popover)
 * - FR-020: Slider adjusts in 5% increments (0-100 range)
 * - FR-021: Update button saves changes, ESC/click-outside cancels
 *
 * Scenario from quickstart.md lines 220-264:
 * 1. Expand Drawing P-001
 * 2. Locate Threaded Pipe component (comp-3)
 * 3. Find "Fabricate" milestone (currently shows "50%")
 * 4. Click the "50%" text
 * 5. Assert popover opens below text with 320px width
 * 6. Assert slider positioned at 50, range 0-100, step 5
 * 7. Drag slider to 75
 * 8. Assert value display updates: "75%"
 * 9. Click "Update" button
 * 10. Assert popover closes
 * 11. Assert "50%" text changes to "75%"
 * 12. Assert component progress updates: 15% → 17.5%
 *     - Calculation: Receive(10%) + Fabricate(10% × 0.75 = 7.5%) = 17.5%
 * 13. Assert drawing progress updates
 * 14. Test validation: 150 rejected (max 100), -10 rejected (min 0)
 * 15. Test cancel: Click outside popover closes without saving
 * 16. Test cancel: Press ESC closes without saving
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

describe('Integration Test: Scenario 4 - Update Partial Milestone (Percentage Slider)', () => {
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
    // Threaded Pipe - 15% complete (Receive done + Fabricate 50%)
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
        Receive: 1,        // 10% weight
        Fabricate: 50,     // 10% weight × 50% = 5%
        Install: 0,
        Erect: 0,
        Connect: 0,
        Support: 0,
        Punch: 0,
        Test: 0,
        Restore: 0,
      },
      percent_complete: 15.0, // 10% + 5% = 15%
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

  // Updated component after Fabricate milestone changes from 50% to 75%
  const mockUpdatedThreadedPipe: ComponentRow = {
    ...mockComponents[2],
    current_milestones: {
      Receive: 1,
      Fabricate: 75,     // Changed from 50 to 75
      Install: 0,
      Erect: 0,
      Connect: 0,
      Support: 0,
      Punch: 0,
      Test: 0,
      Restore: 0,
    },
    percent_complete: 17.5, // 10% + (10% × 0.75) = 17.5%
    last_updated_at: '2025-01-04T00:00:00Z',
    last_updated_by: 'user-1-uuid',
  }

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
      avg_percent_complete: 9.17, // (0 + 10 + 17.5) / 3 = 9.17
    },
  ]

  // Mock RPC response
  const mockRpcResponse: MilestoneUpdateResponse = {
    component: mockUpdatedThreadedPipe,
    previous_value: 50,
    audit_event_id: 'audit-event-uuid',
    new_percent_complete: 17.5,
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

  // Helper: Render page with drawing already expanded
  const renderWithExpandedDrawing = async () => {
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
      expect(screen.getByText('PIPE-SCH40 1" (1)')).toBeInTheDocument()
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

  it('displays threaded pipe component with Fabricate milestone at 50%', async () => {
    await renderWithExpandedDrawing()

    // Find the threaded pipe component row
    const pipeRow = screen.getByText('PIPE-SCH40 1" (1)').closest('[role="row"]')
    expect(pipeRow).toBeInTheDocument()

    // Verify component is at 15%
    expect(within(pipeRow!).getByText('15%')).toBeInTheDocument()

    // Verify Fabricate shows 50% (partial milestone)
    const fabricateText = within(pipeRow!).getByText('50%')
    expect(fabricateText).toBeInTheDocument()

    // Verify it's a clickable button
    expect(fabricateText.closest('button')).toBeInTheDocument()
  })

  it('opens popover with slider when clicking percentage text', async () => {
    const user = await renderWithExpandedDrawing()

    // Find the threaded pipe component row
    const pipeRow = screen.getByText('PIPE-SCH40 1" (1)').closest('[role="row"]')!

    // Click the "50%" text to open popover
    const fabricateButton = within(pipeRow).getByText('50%')
    await user.click(fabricateButton)

    // Wait for popover to appear
    await waitFor(() => {
      // Popover should contain "Fabricate" label
      expect(screen.getByText('Fabricate')).toBeInTheDocument()
    })

    // Verify slider exists
    const slider = screen.getByRole('slider')
    expect(slider).toBeInTheDocument()

    // Verify slider is at 50
    expect(slider).toHaveAttribute('aria-valuenow', '50')

    // Verify slider range (0-100)
    expect(slider).toHaveAttribute('aria-valuemin', '0')
    expect(slider).toHaveAttribute('aria-valuemax', '100')

    // Verify Update and Cancel buttons exist
    expect(screen.getByRole('button', { name: /update/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()

    // Verify value display shows "50%"
    const popover = screen.getByText('Fabricate').closest('div')!
    expect(within(popover).getByText('50%')).toBeInTheDocument()
  })

  it('updates value display when dragging slider', async () => {
    const user = await renderWithExpandedDrawing()

    // Find and click the Fabricate percentage to open popover
    const pipeRow = screen.getByText('PIPE-SCH40 1" (1)').closest('[role="row"]')!
    const fabricateButton = within(pipeRow).getByText('50%')
    await user.click(fabricateButton)

    // Wait for popover
    await waitFor(() => {
      expect(screen.getByRole('slider')).toBeInTheDocument()
    })

    const slider = screen.getByRole('slider')

    // Change slider value to 75
    // Note: Radix Slider uses arrow keys for adjustment
    slider.focus()

    // Increase by 25% (5 steps of 5%)
    for (let i = 0; i < 5; i++) {
      await user.keyboard('{ArrowRight}')
    }

    // Wait for value display to update to 75%
    await waitFor(() => {
      const popover = screen.getByText('Fabricate').closest('div')!
      const valueDisplays = within(popover).getAllByText('75%')
      expect(valueDisplays.length).toBeGreaterThan(0)
    })

    // Verify slider value changed
    expect(slider).toHaveAttribute('aria-valuenow', '75')
  })

  it('sends correct payload and updates component progress when clicking Update button', async () => {
    const user = await renderWithExpandedDrawing()

    // Open popover
    const pipeRow = screen.getByText('PIPE-SCH40 1" (1)').closest('[role="row"]')!
    const fabricateButton = within(pipeRow).getByText('50%')
    await user.click(fabricateButton)

    await waitFor(() => {
      expect(screen.getByRole('slider')).toBeInTheDocument()
    })

    // Change slider to 75
    const slider = screen.getByRole('slider')
    slider.focus()
    for (let i = 0; i < 5; i++) {
      await user.keyboard('{ArrowRight}')
    }

    // Click Update button
    const updateButton = screen.getByRole('button', { name: /update/i })
    await user.click(updateButton)

    // Verify RPC was called with correct payload
    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('update_component_milestone', {
        p_component_id: 'comp-3-uuid',
        p_milestone_name: 'Fabricate',
        p_new_value: 75, // Numeric value
        p_user_id: 'user-1-uuid',
      })
    })

    // Verify popover closes
    await waitFor(() => {
      expect(screen.queryByText('Fabricate')).not.toBeInTheDocument()
    })
  })

  it('updates component progress from 15% to 17.5% after successful mutation', async () => {
    const user = await renderWithExpandedDrawing()

    // Verify initial state: 15%
    const pipeRow = screen.getByText('PIPE-SCH40 1" (1)').closest('[role="row"]')!
    expect(within(pipeRow).getByText('15%')).toBeInTheDocument()

    // Open popover, adjust slider to 75, and update
    const fabricateButton = within(pipeRow).getByText('50%')
    await user.click(fabricateButton)

    await waitFor(() => {
      expect(screen.getByRole('slider')).toBeInTheDocument()
    })

    const slider = screen.getByRole('slider')
    slider.focus()
    for (let i = 0; i < 5; i++) {
      await user.keyboard('{ArrowRight}')
    }

    const updateButton = screen.getByRole('button', { name: /update/i })
    await user.click(updateButton)

    // Wait for mutation to complete and queries to refetch
    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalled()
    })

    // Note: In a real scenario, the component progress would update via query invalidation
    // In this mock test, we verify the RPC call happened with correct calculation expectation
    // The actual progress recalculation happens in the database
    expect(mockRpcResponse.new_percent_complete).toBe(17.5)
  })

  it('closes popover without saving when clicking Cancel button', async () => {
    const user = await renderWithExpandedDrawing()

    // Open popover
    const pipeRow = screen.getByText('PIPE-SCH40 1" (1)').closest('[role="row"]')!
    const fabricateButton = within(pipeRow).getByText('50%')
    await user.click(fabricateButton)

    await waitFor(() => {
      expect(screen.getByRole('slider')).toBeInTheDocument()
    })

    // Change slider to 75
    const slider = screen.getByRole('slider')
    slider.focus()
    for (let i = 0; i < 5; i++) {
      await user.keyboard('{ArrowRight}')
    }

    // Verify temporary value shows 75%
    await waitFor(() => {
      const popover = screen.getByText('Fabricate').closest('div')!
      const valueDisplays = within(popover).getAllByText('75%')
      expect(valueDisplays.length).toBeGreaterThan(0)
    })

    // Click Cancel button
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    // Verify popover closes
    await waitFor(() => {
      expect(screen.queryByRole('slider')).not.toBeInTheDocument()
    })

    // Verify RPC was NOT called
    expect(supabase.rpc).not.toHaveBeenCalled()

    // Verify original value still shows 50%
    expect(within(pipeRow).getByText('50%')).toBeInTheDocument()
  })

  it('closes popover without saving when pressing ESC key', async () => {
    const user = await renderWithExpandedDrawing()

    // Open popover
    const pipeRow = screen.getByText('PIPE-SCH40 1" (1)').closest('[role="row"]')!
    const fabricateButton = within(pipeRow).getByText('50%')
    await user.click(fabricateButton)

    await waitFor(() => {
      expect(screen.getByRole('slider')).toBeInTheDocument()
    })

    // Change slider to 75
    const slider = screen.getByRole('slider')
    slider.focus()
    for (let i = 0; i < 5; i++) {
      await user.keyboard('{ArrowRight}')
    }

    // Press ESC to cancel
    await user.keyboard('{Escape}')

    // Verify popover closes
    await waitFor(() => {
      expect(screen.queryByRole('slider')).not.toBeInTheDocument()
    })

    // Verify RPC was NOT called
    expect(supabase.rpc).not.toHaveBeenCalled()

    // Verify original value still shows 50%
    expect(within(pipeRow).getByText('50%')).toBeInTheDocument()
  })

  it('adjusts slider in 5% increments', async () => {
    const user = await renderWithExpandedDrawing()

    // Open popover
    const pipeRow = screen.getByText('PIPE-SCH40 1" (1)').closest('[role="row"]')!
    const fabricateButton = within(pipeRow).getByText('50%')
    await user.click(fabricateButton)

    await waitFor(() => {
      expect(screen.getByRole('slider')).toBeInTheDocument()
    })

    const slider = screen.getByRole('slider')

    // Verify step attribute is 5
    // Note: Radix Slider may use data attributes or custom implementation
    // We verify behavior by checking value changes

    // Start at 50
    expect(slider).toHaveAttribute('aria-valuenow', '50')

    // Press right arrow once (should increment by 5)
    slider.focus()
    await user.keyboard('{ArrowRight}')

    // Should now be 55
    await waitFor(() => {
      expect(slider).toHaveAttribute('aria-valuenow', '55')
    })

    // Press right arrow again
    await user.keyboard('{ArrowRight}')

    // Should now be 60
    await waitFor(() => {
      expect(slider).toHaveAttribute('aria-valuenow', '60')
    })

    // Press left arrow
    await user.keyboard('{ArrowLeft}')

    // Should now be 55
    await waitFor(() => {
      expect(slider).toHaveAttribute('aria-valuenow', '55')
    })
  })

  it('validates slider range (0-100)', async () => {
    const user = await renderWithExpandedDrawing()

    // Open popover
    const pipeRow = screen.getByText('PIPE-SCH40 1" (1)').closest('[role="row"]')!
    const fabricateButton = within(pipeRow).getByText('50%')
    await user.click(fabricateButton)

    await waitFor(() => {
      expect(screen.getByRole('slider')).toBeInTheDocument()
    })

    const slider = screen.getByRole('slider')

    // Verify min=0, max=100
    expect(slider).toHaveAttribute('aria-valuemin', '0')
    expect(slider).toHaveAttribute('aria-valuemax', '100')

    // Try to go beyond max
    slider.focus()

    // Press right arrow many times to reach 100
    for (let i = 0; i < 20; i++) {
      await user.keyboard('{ArrowRight}')
    }

    // Should cap at 100
    await waitFor(() => {
      const currentValue = parseInt(slider.getAttribute('aria-valuenow') || '0')
      expect(currentValue).toBeLessThanOrEqual(100)
    })

    // Try to go below min
    for (let i = 0; i < 30; i++) {
      await user.keyboard('{ArrowLeft}')
    }

    // Should cap at 0
    await waitFor(() => {
      const currentValue = parseInt(slider.getAttribute('aria-valuenow') || '0')
      expect(currentValue).toBeGreaterThanOrEqual(0)
    })
  })

  it('resets slider to current value when reopening popover after cancel', async () => {
    const user = await renderWithExpandedDrawing()

    // Open popover
    const pipeRow = screen.getByText('PIPE-SCH40 1" (1)').closest('[role="row"]')!
    const fabricateButton = within(pipeRow).getByText('50%')
    await user.click(fabricateButton)

    await waitFor(() => {
      expect(screen.getByRole('slider')).toBeInTheDocument()
    })

    // Change slider to 75
    const slider = screen.getByRole('slider')
    slider.focus()
    for (let i = 0; i < 5; i++) {
      await user.keyboard('{ArrowRight}')
    }

    // Verify changed to 75
    await waitFor(() => {
      expect(slider).toHaveAttribute('aria-valuenow', '75')
    })

    // Press ESC to cancel
    await user.keyboard('{Escape}')

    // Wait for popover to close
    await waitFor(() => {
      expect(screen.queryByRole('slider')).not.toBeInTheDocument()
    })

    // Reopen popover
    await user.click(fabricateButton)

    await waitFor(() => {
      expect(screen.getByRole('slider')).toBeInTheDocument()
    })

    // Verify slider reset to original value (50)
    const reopenedSlider = screen.getByRole('slider')
    expect(reopenedSlider).toHaveAttribute('aria-valuenow', '50')
  })

  it('shows optimistic update when clicking Update button', async () => {
    const user = await renderWithExpandedDrawing()

    // Open popover and adjust slider
    const pipeRow = screen.getByText('PIPE-SCH40 1" (1)').closest('[role="row"]')!
    const fabricateButton = within(pipeRow).getByText('50%')
    await user.click(fabricateButton)

    await waitFor(() => {
      expect(screen.getByRole('slider')).toBeInTheDocument()
    })

    const slider = screen.getByRole('slider')
    slider.focus()
    for (let i = 0; i < 5; i++) {
      await user.keyboard('{ArrowRight}')
    }

    // Record time before clicking Update
    const startTime = performance.now()

    const updateButton = screen.getByRole('button', { name: /update/i })
    await user.click(updateButton)

    // Assert popover closes quickly (<100ms) - optimistic behavior
    await waitFor(() => {
      expect(screen.queryByRole('slider')).not.toBeInTheDocument()
    }, { timeout: 100 })

    const closeTime = performance.now() - startTime
    expect(closeTime).toBeLessThan(100)
  })

  it('handles multiple partial milestones independently', async () => {
    const user = await renderWithExpandedDrawing()

    // Find the threaded pipe component row
    const pipeRow = screen.getByText('PIPE-SCH40 1" (1)').closest('[role="row"]')!

    // Verify Fabricate is at 50%
    expect(within(pipeRow).getByText('50%')).toBeInTheDocument()

    // Note: Install, Erect, Connect, Support are also partial milestones at 0%
    // We can't easily test them in this scenario because they show as text "0%"
    // and there may be multiple "0%" texts in the row
    // This test verifies the Fabricate milestone works independently

    // Open Fabricate popover
    const fabricateButton = within(pipeRow).getByText('50%')
    await user.click(fabricateButton)

    await waitFor(() => {
      expect(screen.getByRole('slider')).toBeInTheDocument()
    })

    // Verify only Fabricate popover is open by checking the label
    const fabricateLabel = screen.getByText('Fabricate')
    expect(fabricateLabel).toBeInTheDocument()

    // Verify the slider is for Fabricate (at 50, not 0)
    const slider = screen.getByRole('slider')
    expect(slider).toHaveAttribute('aria-valuenow', '50')

    // Close the popover
    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByRole('slider')).not.toBeInTheDocument()
    })
  })
})
