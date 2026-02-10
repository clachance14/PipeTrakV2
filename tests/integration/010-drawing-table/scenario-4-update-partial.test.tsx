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
      identityDisplay: 'VBALU-001 2"',
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
      identityDisplay: 'EL90-150 2"',
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
      identityDisplay: 'PIPE-SCH40 1"',
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
  const _mockProgressDataAfter = [
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
      expect(screen.getByText('PIPE-SCH40 1"')).toBeInTheDocument()
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

  // ========================================
  // US1: Direct Numeric Entry Tests
  // ========================================

  it('renders threaded pipe with inline numeric inputs', async () => {
    await renderWithExpandedDrawing()

    // Find the threaded pipe component row
    const pipeRow = screen.getByText('PIPE-SCH40 1"').closest('[role="row"]')
    expect(pipeRow).toBeInTheDocument()

    // Verify 5 partial milestone inputs display (Fabricate, Install, Erect, Connect, Support)
    const inputs = within(pipeRow!).getAllByRole('spinbutton')
    expect(inputs).toHaveLength(5)

    // Verify Fabricate input shows current value of 50
    const fabricateInput = within(pipeRow!).getByLabelText(/Fabricate milestone/)
    expect(fabricateInput).toHaveValue(50)

    // Verify Install input exists and shows 0
    const installInput = within(pipeRow!).getByLabelText(/Install milestone/)
    expect(installInput).toHaveValue(0)
  })

  it('updates milestone on Enter key press', async () => {
    const user = await renderWithExpandedDrawing()

    // Find the threaded pipe component row
    const pipeRow = screen.getByText('PIPE-SCH40 1"').closest('[role="row"]')!

    // Find Fabricate input (currently 50)
    const fabricateInput = within(pipeRow).getByLabelText(/Fabricate milestone/)

    // Click input to focus
    await user.click(fabricateInput)

    // Type new value
    await user.clear(fabricateInput)
    await user.type(fabricateInput, '75')

    // Press Enter to save
    await user.keyboard('{Enter}')

    // Verify RPC was called with correct value
    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('update_component_milestone', {
        p_component_id: 'comp-3-uuid',
        p_milestone_name: 'Fabricate',
        p_new_value: 75,
        p_user_id: 'user-1-uuid',
      })
    })

    // Verify success toast shown
    expect(toast.success).toHaveBeenCalled()
  })

  it('updates milestone on blur event', async () => {
    const user = await renderWithExpandedDrawing()

    // Find the threaded pipe component row
    const pipeRow = screen.getByText('PIPE-SCH40 1"').closest('[role="row"]')!

    // Find Install input (currently 0)
    const installInput = within(pipeRow).getByLabelText(/Install milestone/)

    // Click input to focus
    await user.click(installInput)

    // Type new value
    await user.clear(installInput)
    await user.type(installInput, '80')

    // Click outside to trigger blur
    await user.click(document.body)

    // Verify RPC was called with correct value
    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('update_component_milestone', {
        p_component_id: 'comp-3-uuid',
        p_milestone_name: 'Install',
        p_new_value: 80,
        p_user_id: 'user-1-uuid',
      })
    })

    // Verify input returns to default state (not focused)
    expect(installInput).not.toHaveFocus()
  })

  it('cancels edit on Escape key press', async () => {
    const user = await renderWithExpandedDrawing()

    // Find the threaded pipe component row
    const pipeRow = screen.getByText('PIPE-SCH40 1"').closest('[role="row"]')!

    // Find Fabricate input (currently 50)
    const fabricateInput = within(pipeRow).getByLabelText(/Fabricate milestone/)

    // Click input to focus
    await user.click(fabricateInput)

    // Type new value
    await user.clear(fabricateInput)
    await user.type(fabricateInput, '75')

    // Press Escape to cancel
    await user.keyboard('{Escape}')

    // Verify input reverted to previous value
    expect(fabricateInput).toHaveValue(50)

    // Verify input lost focus
    expect(fabricateInput).not.toHaveFocus()

    // Verify RPC was NOT called
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  // ========================================
  // US2: Input Validation Tests
  // ========================================

  it('shows error for value >100', async () => {
    const user = await renderWithExpandedDrawing()

    const pipeRow = screen.getByText('PIPE-SCH40 1"').closest('[role="row"]')!
    const fabricateInput = within(pipeRow).getByLabelText(/Fabricate milestone/)

    await user.click(fabricateInput)
    await user.clear(fabricateInput)
    await user.type(fabricateInput, '150')
    await user.click(document.body) // Blur

    // Verify error toast shown
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('Value must be between 0-100')
    )

    // Verify input shows red border
    expect(fabricateInput).toHaveClass('border-red-500')

    // Wait for auto-revert after 2 seconds
    await waitFor(() => {
      expect(fabricateInput).toHaveValue(50) // Reverted to previous
    }, { timeout: 2500 })
  })

  it('shows error for negative value', async () => {
    const user = await renderWithExpandedDrawing()

    const pipeRow = screen.getByText('PIPE-SCH40 1"').closest('[role="row"]')!
    const installInput = within(pipeRow).getByLabelText(/Install milestone/)

    await user.click(installInput)
    await user.clear(installInput)
    await user.type(installInput, '-10')
    await user.click(document.body) // Blur

    // Verify error toast shown
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('Value must be between 0-100')
    )

    // Verify input reverts to previous value
    await waitFor(() => {
      expect(installInput).toHaveValue(0)
    }, { timeout: 2500 })
  })

  it('reverts to previous on empty input', async () => {
    const user = await renderWithExpandedDrawing()

    const pipeRow = screen.getByText('PIPE-SCH40 1"').closest('[role="row"]')!
    const fabricateInput = within(pipeRow).getByLabelText(/Fabricate milestone/)

    await user.click(fabricateInput)
    await user.clear(fabricateInput)
    await user.click(document.body) // Blur with empty value

    // Should revert to previous value silently (no error toast)
    expect(fabricateInput).toHaveValue(50)
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('rounds decimal values', async () => {
    const user = await renderWithExpandedDrawing()

    const pipeRow = screen.getByText('PIPE-SCH40 1"').closest('[role="row"]')!
    const fabricateInput = within(pipeRow).getByLabelText(/Fabricate milestone/)

    await user.click(fabricateInput)
    await user.clear(fabricateInput)
    await user.type(fabricateInput, '75.5')
    await user.keyboard('{Enter}')

    // Verify RPC was called with rounded value
    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('update_component_milestone', {
        p_component_id: 'comp-3-uuid',
        p_milestone_name: 'Fabricate',
        p_new_value: 76, // Rounded from 75.5
        p_user_id: 'user-1-uuid',
      })
    })
  })

  it('normalizes leading zeros', async () => {
    const user = await renderWithExpandedDrawing()

    const pipeRow = screen.getByText('PIPE-SCH40 1"').closest('[role="row"]')!
    const fabricateInput = within(pipeRow).getByLabelText(/Fabricate milestone/)

    await user.click(fabricateInput)
    await user.clear(fabricateInput)
    await user.type(fabricateInput, '075')
    await user.keyboard('{Enter}')

    // Verify RPC was called with normalized value
    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('update_component_milestone', {
        p_component_id: 'comp-3-uuid',
        p_milestone_name: 'Fabricate',
        p_new_value: 75, // Normalized from 075
        p_user_id: 'user-1-uuid',
      })
    })
  })

})
