/**
 * Unit Tests: FieldWeldRow Component (T045)
 * Tests field weld row display with milestones and actions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FieldWeldRow } from './FieldWeldRow'
import type { ComponentRow } from '@/types/drawing-table.types'
import * as useFieldWeldModule from '@/hooks/useFieldWeld'
import * as useAuthModule from '@/contexts/AuthContext'

// Mock the modal component to avoid Radix portal complexity in tests
vi.mock('@/components/drawing-table/RollbackConfirmationModal', () => ({
  RollbackConfirmationModal: ({ isOpen, onClose, onConfirm, componentName, milestoneName }: any) => (
    isOpen ? (
      <div data-testid="rollback-modal">
        <div>Confirm Milestone Rollback</div>
        <div>Component: {componentName}</div>
        <div>Milestone: {milestoneName}</div>
        <button onClick={() => onConfirm({ reason: 'data_entry_error', reasonLabel: 'Data entry error' })}>
          Confirm Rollback
        </button>
        <button onClick={onClose}>Cancel</button>
      </div>
    ) : null
  )
}))

describe('FieldWeldRow', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })
    vi.clearAllMocks()

    // Mock useAuth
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' },
      signIn: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      isLoading: false
    })
  })

  const mockComponent: ComponentRow = {
    id: 'comp-1',
    project_id: 'proj-1',
    drawing_id: 'drawing-1',
    component_type: 'field_weld',
    identity_key: { weld_number: 'W-001' },
    current_milestones: {
      'Weld Complete': 100,
      'Visual Inspection': 100,
      'NDE': 0
    },
    percent_complete: 66,
    created_at: '2024-01-01T00:00:00Z',
    last_updated_at: '2024-01-15T00:00:00Z',
    last_updated_by: 'user-1',
    is_retired: false,
    template: {
      id: 'template-1',
      component_type: 'field_weld',
      version: 1,
      workflow_type: 'discrete',
      milestones_config: [
        { name: 'Weld Complete', weight: 40, order: 1, is_partial: false, requires_welder: true },
        { name: 'Visual Inspection', weight: 30, order: 2, is_partial: false, requires_welder: false },
        { name: 'NDE', weight: 30, order: 3, is_partial: false, requires_welder: false }
      ]
    },
    identityDisplay: 'W-001',
    canUpdate: true
  }

  const mockFieldWeld = {
    id: 'weld-1',
    component_id: 'comp-1',
    weld_type: 'BW',
    weld_size: '2"',
    welder: { stencil: 'K-07', name: 'John Smith' },
    date_welded: '2024-01-15',
    nde_type: 'RT',
    nde_result: 'PASS',
    status: 'active',
    percent_complete: 66,
    is_repair: false,
  }

  const renderComponent = (
    component = mockComponent,
    onMilestoneUpdate = vi.fn(),
    fieldWeld = mockFieldWeld
  ) => {
    // Mock useFieldWeld - allow override for specific tests
    vi.spyOn(useFieldWeldModule, 'useFieldWeld').mockReturnValue({
      data: fieldWeld,
      isLoading: false,
      error: null,
      refetch: vi.fn()
    } as any)

    return {
      ...render(
        <QueryClientProvider client={queryClient}>
          <FieldWeldRow
            component={component}
            projectId="proj-1"
            onMilestoneUpdate={onMilestoneUpdate}
          />
        </QueryClientProvider>
      ),
      onMilestoneUpdate
    }
  }

  it('renders all weld columns', () => {
    renderComponent()

    expect(screen.getByText('W-001')).toBeInTheDocument()
    expect(screen.getByText(/butt weld/i)).toBeInTheDocument()
    expect(screen.getByText(/2"/)).toBeInTheDocument()
    expect(screen.getByText('K-07')).toBeInTheDocument()
    expect(screen.getByText(/01\/14/)).toBeInTheDocument() // Date formatted as MM/DD
    expect(screen.getByText(/radiographic testing/i)).toBeInTheDocument()
    expect(screen.getByText(/pass/i)).toBeInTheDocument()
  })

  it('displays welder info correctly', () => {
    renderComponent()
    expect(screen.getByText('K-07')).toBeInTheDocument()
  })

  it('NDE status shows correct formatting', () => {
    renderComponent()
    expect(screen.getByText(/radiographic testing/i)).toBeInTheDocument()
    expect(screen.getByText(/pass/i)).toBeInTheDocument()
  })

  it('status badges show correct colors', () => {
    const { container } = renderComponent()
    // Active should have blue background
    expect(container.querySelector('.bg-blue-100')).toBeInTheDocument()
  })

  it('progress bar shows percentage', () => {
    renderComponent()
    expect(screen.getByText(/66%/)).toBeInTheDocument()
  })

  it('action buttons visible only on active welds', () => {
    renderComponent()
    expect(screen.getByRole('button', { name: /assign welder/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /record NDE/i })).toBeInTheDocument()
  })

  it('action buttons hidden on rejected welds', () => {
    // Pass rejected weld to renderComponent
    const rejectedFieldWeld = { ...mockFieldWeld, status: 'rejected' as const }
    renderComponent(mockComponent, vi.fn(), rejectedFieldWeld)

    expect(screen.queryByRole('button', { name: /assign welder/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /record NDE/i })).not.toBeInTheDocument()
  })

  describe('Rollback Modal Integration', () => {
    it('should open modal when unchecking a completed milestone', async () => {
      const user = userEvent.setup()
      const onMilestoneUpdate = vi.fn()

      renderComponent(mockComponent, onMilestoneUpdate)

      // Expand to show milestones
      const expandButton = screen.getByRole('button', { name: /expand/i })
      await user.click(expandButton)

      // Find and click the "Visual Inspection" checkbox (currently 100, unchecking to 0)
      const checkbox = screen.getByRole('checkbox', { name: /visual inspection/i })
      await user.click(checkbox)

      // Modal should open
      await waitFor(() => {
        expect(screen.getByTestId('rollback-modal')).toBeInTheDocument()
      })

      // Verify modal shows correct info
      expect(screen.getByText('Component: W-001')).toBeInTheDocument()
      expect(screen.getByText('Milestone: Visual Inspection')).toBeInTheDocument()

      // onMilestoneUpdate should NOT be called yet
      expect(onMilestoneUpdate).not.toHaveBeenCalled()
    })

    it('should call onMilestoneUpdate with reason after modal confirmation', async () => {
      const user = userEvent.setup()
      const onMilestoneUpdate = vi.fn()

      renderComponent(mockComponent, onMilestoneUpdate)

      // Expand to show milestones
      const expandButton = screen.getByRole('button', { name: /expand/i })
      await user.click(expandButton)

      // Click checkbox to uncheck
      const checkbox = screen.getByRole('checkbox', { name: /visual inspection/i })
      await user.click(checkbox)

      // Wait for modal
      await waitFor(() => {
        expect(screen.getByTestId('rollback-modal')).toBeInTheDocument()
      })

      // Click confirm button
      const confirmButton = screen.getByRole('button', { name: /confirm rollback/i })
      await user.click(confirmButton)

      // Now onMilestoneUpdate should be called with rollback reason
      await waitFor(() => {
        expect(onMilestoneUpdate).toHaveBeenCalledWith(
          'comp-1',
          'Visual Inspection',
          0,
          expect.objectContaining({
            reason: 'data_entry_error',
            reasonLabel: 'Data entry error'
          })
        )
      })

      // Modal should close
      expect(screen.queryByTestId('rollback-modal')).not.toBeInTheDocument()
    })

    it('should NOT open modal when checking an unchecked milestone (forward progress)', async () => {
      const user = userEvent.setup()
      const onMilestoneUpdate = vi.fn()

      renderComponent(mockComponent, onMilestoneUpdate)

      // Expand to show milestones
      const expandButton = screen.getByRole('button', { name: /expand/i })
      await user.click(expandButton)

      // Click the unchecked "NDE" checkbox (currently 0, checking to 100)
      // The aria-label is "NDE milestone"
      const checkbox = screen.getByRole('checkbox', { name: /nde milestone/i })
      await user.click(checkbox)

      // Modal should NOT open
      expect(screen.queryByTestId('rollback-modal')).not.toBeInTheDocument()

      // onMilestoneUpdate should be called immediately with 3 args (no rollbackReason)
      await waitFor(() => {
        expect(onMilestoneUpdate).toHaveBeenCalledWith('comp-1', 'NDE', 100)
      })
    })

    it('should cancel rollback when modal is closed', async () => {
      const user = userEvent.setup()
      const onMilestoneUpdate = vi.fn()

      renderComponent(mockComponent, onMilestoneUpdate)

      // Expand to show milestones
      const expandButton = screen.getByRole('button', { name: /expand/i })
      await user.click(expandButton)

      // Click checkbox to uncheck
      const checkbox = screen.getByRole('checkbox', { name: /visual inspection/i })
      await user.click(checkbox)

      // Wait for modal
      await waitFor(() => {
        expect(screen.getByTestId('rollback-modal')).toBeInTheDocument()
      })

      // Click cancel button
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByTestId('rollback-modal')).not.toBeInTheDocument()
      })

      // onMilestoneUpdate should NOT be called
      expect(onMilestoneUpdate).not.toHaveBeenCalled()
    })

    it('should handle "Weld Complete" special case before rollback check', async () => {
      const user = userEvent.setup()
      const onMilestoneUpdate = vi.fn()

      // Create component with unchecked "Weld Complete"
      const componentWithUnfinishedWeld: ComponentRow = {
        ...mockComponent,
        current_milestones: {
          'Weld Complete': 0,
          'Visual Inspection': 0,
          'NDE': 0
        }
      }

      renderComponent(componentWithUnfinishedWeld, onMilestoneUpdate)

      // Expand to show milestones
      const expandButton = screen.getByRole('button', { name: /expand/i })
      await user.click(expandButton)

      // Click "Weld Complete" checkbox (value === true will trigger special case)
      const checkbox = screen.getByRole('checkbox', { name: /weld complete milestone/i })
      await user.click(checkbox)

      // Should trigger inline welder assignment (NOT modal, NOT onMilestoneUpdate)
      expect(screen.queryByTestId('rollback-modal')).not.toBeInTheDocument()
      expect(onMilestoneUpdate).not.toHaveBeenCalled()

      // Should show inline welder assignment UI (look for "Welder:" label text or combobox)
      await waitFor(() => {
        expect(screen.getByText(/^welder:$/i)).toBeInTheDocument()
      })
    })
  })
})
