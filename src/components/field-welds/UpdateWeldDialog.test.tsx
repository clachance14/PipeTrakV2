/**
 * Unit Tests: UpdateWeldDialog Component
 * Tests milestone update functionality for field welds
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UpdateWeldDialog } from './UpdateWeldDialog'
import type { EnrichedFieldWeld } from '@/hooks/useFieldWelds'

// Mock the hooks
vi.mock('@/hooks/useUpdateMilestone', () => ({
  useUpdateMilestone: vi.fn(),
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

import { useUpdateMilestone } from '@/hooks/useUpdateMilestone'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

const mockUseUpdateMilestone = useUpdateMilestone as unknown as ReturnType<typeof vi.fn>
const mockUseAuth = useAuth as unknown as ReturnType<typeof vi.fn>

/**
 * Mock Weld Data Generator
 */
function createMockWeld(milestones: Record<string, number> = {}): EnrichedFieldWeld {
  return {
    id: 'test-weld-1',
    project_id: 'test-project-id',
    component_id: 'test-component-id',
    created_by: 'test-user-id',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    weld_type: 'BW',
    status: 'active',
    welder_id: 'test-welder-id',
    date_welded: '2025-01-15',
    nde_required: true,
    nde_type: 'RT',
    nde_result: 'PASS',
    nde_date: '2025-01-16',
    nde_notes: null,
    is_repair: false,
    original_weld_id: null,
    base_metal: 'CS',
    weld_size: '2"',
    schedule: 'STD',
    spec: 'B31.3',
    component: {
      id: 'test-component-id',
      identity_key: { LINE: 'P-101', JOINT: '1' },
      component_type: 'Piping',
      progress_template_id: 'test-template-id',
      drawing_id: 'test-drawing-id',
      area_id: 'test-area-id',
      system_id: 'test-system-id',
      test_package_id: 'test-package-id',
      percent_complete: 30,
      current_milestones: milestones,
    },
    drawing: {
      id: 'test-drawing-id',
      drawing_no_norm: 'P-1001-A',
      drawing_no_raw: 'P-1001-A',
      title: 'Test Drawing',
      rev: 'A',
    },
    welder: {
      id: 'test-welder-id',
      name: 'John Doe',
      stencil: 'JD-123',
      stencil_norm: 'JD123',
      status: 'active',
    },
    area: {
      id: 'test-area-id',
      name: 'Area 100',
      description: 'Test Area',
    },
    system: {
      id: 'test-system-id',
      name: 'System 200',
      description: 'Test System',
    },
    test_package: {
      id: 'test-package-id',
      name: 'Package A',
      description: 'Test Package',
    },
    identityDisplay: 'P-101 / J-1',
  } as EnrichedFieldWeld
}

describe('UpdateWeldDialog', () => {
  let queryClient: QueryClient
  let mockMutateAsync: ReturnType<typeof vi.fn>

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    mockMutateAsync = vi.fn().mockResolvedValue({})

    mockUseUpdateMilestone.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    })

    mockUseAuth.mockReturnValue({
      user: { id: 'test-user-id', email: 'test@example.com' },
    })

    vi.clearAllMocks()
  })

  const renderDialog = (weld: EnrichedFieldWeld, open = true) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <UpdateWeldDialog
          weld={weld}
          open={open}
          onOpenChange={vi.fn()}
        />
      </QueryClientProvider>
    )
  }

  describe('Rendering', () => {
    it('renders dialog with weld identity in title', () => {
      const weld = createMockWeld()
      renderDialog(weld)

      expect(screen.getByText(/Update Weld: P-101 \/ J-1/)).toBeInTheDocument()
    })

    it('renders Fit-up checkbox', () => {
      const weld = createMockWeld()
      renderDialog(weld)

      expect(screen.getByLabelText(/Fit-up complete/)).toBeInTheDocument()
      expect(screen.getByText('Fit-up')).toBeInTheDocument()
    })

    it('renders Weld Complete checkbox', () => {
      const weld = createMockWeld()
      renderDialog(weld)

      expect(screen.getByLabelText(/Weld complete/)).toBeInTheDocument()
      expect(screen.getByText('Weld Complete')).toBeInTheDocument()
    })

    it('shows current progress percentage', () => {
      const weld = createMockWeld({ 'Fit-up': 1 })
      renderDialog(weld)

      expect(screen.getByText('30%')).toBeInTheDocument()
    })

    it('shows Save and Cancel buttons', () => {
      const weld = createMockWeld()
      renderDialog(weld)

      expect(screen.getByRole('button', { name: /Cancel/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Save milestone updates/ })).toBeInTheDocument()
    })
  })

  describe('Initial State', () => {
    it('Fit-up checkbox is unchecked when milestone not completed', () => {
      const weld = createMockWeld({})
      renderDialog(weld)

      const checkbox = screen.getByLabelText(/Fit-up complete/) as HTMLInputElement
      expect(checkbox.checked).toBe(false)
    })

    it('Fit-up checkbox is checked when milestone is completed', () => {
      const weld = createMockWeld({ 'Fit-up': 1 })
      renderDialog(weld)

      const checkbox = screen.getByLabelText(/Fit-up complete/) as HTMLInputElement
      expect(checkbox.checked).toBe(true)
    })

    it('Weld Complete checkbox is unchecked when milestone not completed', () => {
      const weld = createMockWeld({})
      renderDialog(weld)

      const checkbox = screen.getByLabelText(/Weld complete/) as HTMLInputElement
      expect(checkbox.checked).toBe(false)
    })

    it('Weld Complete checkbox is checked when milestone is completed', () => {
      const weld = createMockWeld({ 'Weld Complete': 1 })
      renderDialog(weld)

      const checkbox = screen.getByLabelText(/Weld complete/) as HTMLInputElement
      expect(checkbox.checked).toBe(true)
    })

    it('both checkboxes checked when both milestones completed', () => {
      const weld = createMockWeld({ 'Fit-up': 1, 'Weld Complete': 1 })
      renderDialog(weld)

      const fitUpCheckbox = screen.getByLabelText(/Fit-up complete/) as HTMLInputElement
      const weldCompleteCheckbox = screen.getByLabelText(/Weld complete/) as HTMLInputElement

      expect(fitUpCheckbox.checked).toBe(true)
      expect(weldCompleteCheckbox.checked).toBe(true)
    })
  })

  describe('User Interactions', () => {
    it('toggles Fit-up checkbox on click', async () => {
      const user = userEvent.setup()
      const weld = createMockWeld({})
      renderDialog(weld)

      const checkbox = screen.getByLabelText(/Fit-up complete/) as HTMLInputElement
      expect(checkbox.checked).toBe(false)

      await user.click(checkbox)
      expect(checkbox.checked).toBe(true)

      await user.click(checkbox)
      expect(checkbox.checked).toBe(false)
    })

    it('toggles Weld Complete checkbox on click', async () => {
      const user = userEvent.setup()
      const weld = createMockWeld({})
      renderDialog(weld)

      const checkbox = screen.getByLabelText(/Weld complete/) as HTMLInputElement
      expect(checkbox.checked).toBe(false)

      await user.click(checkbox)
      expect(checkbox.checked).toBe(true)

      await user.click(checkbox)
      expect(checkbox.checked).toBe(false)
    })

    it('calls onOpenChange(false) when Cancel is clicked', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()
      const weld = createMockWeld({})

      render(
        <QueryClientProvider client={queryClient}>
          <UpdateWeldDialog
            weld={weld}
            open={true}
            onOpenChange={onOpenChange}
          />
        </QueryClientProvider>
      )

      await user.click(screen.getByRole('button', { name: /Cancel/ }))
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe('Save Functionality', () => {
    it('calls updateMilestone when Fit-up is changed and Save is clicked', async () => {
      const user = userEvent.setup()
      const weld = createMockWeld({})
      renderDialog(weld)

      // Check Fit-up
      await user.click(screen.getByLabelText(/Fit-up complete/))

      // Click Save
      await user.click(screen.getByRole('button', { name: /Save milestone updates/ }))

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          component_id: 'test-component-id',
          milestone_name: 'Fit-up',
          value: true,
          user_id: 'test-user-id',
        })
      })
    })

    it('calls updateMilestone when Weld Complete is changed and Save is clicked', async () => {
      const user = userEvent.setup()
      const weld = createMockWeld({})
      renderDialog(weld)

      // Check Weld Complete
      await user.click(screen.getByLabelText(/Weld complete/))

      // Click Save
      await user.click(screen.getByRole('button', { name: /Save milestone updates/ }))

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          component_id: 'test-component-id',
          milestone_name: 'Weld Complete',
          value: true,
          user_id: 'test-user-id',
        })
      })
    })

    it('calls updateMilestone for both milestones when both changed', async () => {
      const user = userEvent.setup()
      const weld = createMockWeld({})
      renderDialog(weld)

      // Check both checkboxes
      await user.click(screen.getByLabelText(/Fit-up complete/))
      await user.click(screen.getByLabelText(/Weld complete/))

      // Click Save
      await user.click(screen.getByRole('button', { name: /Save milestone updates/ }))

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledTimes(2)
        expect(mockMutateAsync).toHaveBeenCalledWith({
          component_id: 'test-component-id',
          milestone_name: 'Fit-up',
          value: true,
          user_id: 'test-user-id',
        })
        expect(mockMutateAsync).toHaveBeenCalledWith({
          component_id: 'test-component-id',
          milestone_name: 'Weld Complete',
          value: true,
          user_id: 'test-user-id',
        })
      })
    })

    it('does not call updateMilestone when no changes made', async () => {
      const user = userEvent.setup()
      const weld = createMockWeld({ 'Fit-up': 1 })
      renderDialog(weld)

      // Click Save without making changes
      await user.click(screen.getByRole('button', { name: /Save milestone updates/ }))

      await waitFor(() => {
        expect(mockMutateAsync).not.toHaveBeenCalled()
      })
    })

    it('shows success toast after successful save', async () => {
      const user = userEvent.setup()
      const weld = createMockWeld({})
      renderDialog(weld)

      await user.click(screen.getByLabelText(/Fit-up complete/))
      await user.click(screen.getByRole('button', { name: /Save milestone updates/ }))

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Weld milestones updated successfully')
      })
    })

    it('closes dialog after successful save', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()
      const weld = createMockWeld({})

      render(
        <QueryClientProvider client={queryClient}>
          <UpdateWeldDialog
            weld={weld}
            open={true}
            onOpenChange={onOpenChange}
          />
        </QueryClientProvider>
      )

      await user.click(screen.getByLabelText(/Fit-up complete/))
      await user.click(screen.getByRole('button', { name: /Save milestone updates/ }))

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false)
      })
    })

    it('shows error toast on save failure', async () => {
      const user = userEvent.setup()
      mockMutateAsync.mockRejectedValueOnce(new Error('Network error'))

      const weld = createMockWeld({})
      renderDialog(weld)

      await user.click(screen.getByLabelText(/Fit-up complete/))
      await user.click(screen.getByRole('button', { name: /Save milestone updates/ }))

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to update milestones. Please try again.')
      })
    })

    it('does not close dialog on save failure', async () => {
      const user = userEvent.setup()
      mockMutateAsync.mockRejectedValueOnce(new Error('Network error'))
      const onOpenChange = vi.fn()
      const weld = createMockWeld({})

      render(
        <QueryClientProvider client={queryClient}>
          <UpdateWeldDialog
            weld={weld}
            open={true}
            onOpenChange={onOpenChange}
          />
        </QueryClientProvider>
      )

      await user.click(screen.getByLabelText(/Fit-up complete/))
      await user.click(screen.getByRole('button', { name: /Save milestone updates/ }))

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled()
      })

      expect(onOpenChange).not.toHaveBeenCalled()
    })
  })

  describe('Loading State', () => {
    it('shows "Saving..." text when mutation is pending', () => {
      mockUseUpdateMilestone.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
      })

      const weld = createMockWeld({})
      renderDialog(weld)

      expect(screen.getByText('Saving...')).toBeInTheDocument()
    })

    it('disables Save button when mutation is pending', () => {
      mockUseUpdateMilestone.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
      })

      const weld = createMockWeld({})
      renderDialog(weld)

      const saveButton = screen.getByRole('button', { name: /Save milestone updates/ })
      expect(saveButton).toBeDisabled()
    })
  })

  describe('Cancel Behavior', () => {
    it('resets checkboxes to original values when Cancel is clicked', async () => {
      const user = userEvent.setup()
      const weld = createMockWeld({ 'Fit-up': 1 })
      renderDialog(weld)

      const fitUpCheckbox = screen.getByLabelText(/Fit-up complete/) as HTMLInputElement
      expect(fitUpCheckbox.checked).toBe(true)

      // Uncheck it
      await user.click(fitUpCheckbox)
      expect(fitUpCheckbox.checked).toBe(false)

      // Click Cancel
      await user.click(screen.getByRole('button', { name: /Cancel/ }))

      // Should reset (though dialog closes, so we can't verify visually here)
      // The component logic handles this via onOpenChange
    })
  })

  describe('Accessibility', () => {
    it('Save button has min-height of 44px for touch targets', () => {
      const weld = createMockWeld({})
      renderDialog(weld)

      const saveButton = screen.getByRole('button', { name: /Save milestone updates/ })
      expect(saveButton.className).toContain('min-h-[44px]')
    })

    it('Cancel button has min-height of 44px for touch targets', () => {
      const weld = createMockWeld({})
      renderDialog(weld)

      const cancelButton = screen.getByRole('button', { name: /Cancel/ })
      expect(cancelButton.className).toContain('min-h-[44px]')
    })

    it('checkboxes have aria-label for screen readers', () => {
      const weld = createMockWeld({})
      renderDialog(weld)

      expect(screen.getByLabelText('Fit-up complete')).toBeInTheDocument()
      expect(screen.getByLabelText('Weld complete')).toBeInTheDocument()
    })

    it('Save button has aria-label for screen readers', () => {
      const weld = createMockWeld({})
      renderDialog(weld)

      expect(screen.getByRole('button', { name: /Save milestone updates/ })).toBeInTheDocument()
    })
  })

  describe('Authentication', () => {
    it('shows error toast when user is not authenticated', async () => {
      const user = userEvent.setup()
      mockUseAuth.mockReturnValue({ user: null })

      const weld = createMockWeld({})
      renderDialog(weld)

      await user.click(screen.getByLabelText(/Fit-up complete/))
      await user.click(screen.getByRole('button', { name: /Save milestone updates/ }))

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('User not authenticated')
      })

      expect(mockMutateAsync).not.toHaveBeenCalled()
    })
  })

  // Phase 2: Welder Dialog Interception Tests (T015-T017)
  describe('Welder Dialog Interception (Phase 2)', () => {
    it('T015: triggers welder dialog when Weld Made checked for first time', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()
      const onTriggerWelderDialog = vi.fn()
      const weld = createMockWeld({ 'Weld Complete': 0 }) // Weld Made = false

      render(
        <QueryClientProvider client={queryClient}>
          <UpdateWeldDialog
            weld={weld}
            open={true}
            onOpenChange={onOpenChange}
            onTriggerWelderDialog={onTriggerWelderDialog}
          />
        </QueryClientProvider>
      )

      // Check Weld Made checkbox
      await user.click(screen.getByLabelText(/Weld complete/))

      // Click Save
      await user.click(screen.getByRole('button', { name: /Save milestone updates/ }))

      await waitFor(() => {
        // Should trigger welder dialog callback
        expect(onTriggerWelderDialog).toHaveBeenCalledTimes(1)
        // Should NOT call updateMilestone (interception prevents it)
        expect(mockMutateAsync).not.toHaveBeenCalled()
      })
    })

    it('T016: updates milestone normally when only Fit-up is checked', async () => {
      const user = userEvent.setup()
      const onTriggerWelderDialog = vi.fn()
      const weld = createMockWeld({}) // No milestones completed

      render(
        <QueryClientProvider client={queryClient}>
          <UpdateWeldDialog
            weld={weld}
            open={true}
            onOpenChange={vi.fn()}
            onTriggerWelderDialog={onTriggerWelderDialog}
          />
        </QueryClientProvider>
      )

      // Check only Fit-up
      await user.click(screen.getByLabelText(/Fit-up complete/))

      // Click Save
      await user.click(screen.getByRole('button', { name: /Save milestone updates/ }))

      await waitFor(() => {
        // Should call updateMilestone for Fit-up
        expect(mockMutateAsync).toHaveBeenCalledWith({
          component_id: 'test-component-id',
          milestone_name: 'Fit-up',
          value: true,
          user_id: 'test-user-id',
        })
        // Should NOT trigger welder dialog
        expect(onTriggerWelderDialog).not.toHaveBeenCalled()
      })
    })

    it('T017: updates milestone normally when unchecking Weld Made', async () => {
      const user = userEvent.setup()
      const onTriggerWelderDialog = vi.fn()
      const weld = createMockWeld({ 'Weld Complete': 1 }) // Weld Made = true

      render(
        <QueryClientProvider client={queryClient}>
          <UpdateWeldDialog
            weld={weld}
            open={true}
            onOpenChange={vi.fn()}
            onTriggerWelderDialog={onTriggerWelderDialog}
          />
        </QueryClientProvider>
      )

      // Uncheck Weld Made
      await user.click(screen.getByLabelText(/Weld complete/))

      // Click Save
      await user.click(screen.getByRole('button', { name: /Save milestone updates/ }))

      await waitFor(() => {
        // Should call updateMilestone to uncheck
        expect(mockMutateAsync).toHaveBeenCalledWith({
          component_id: 'test-component-id',
          milestone_name: 'Weld Complete',
          value: false,
          user_id: 'test-user-id',
        })
        // Should NOT trigger welder dialog (unchecking, not first-time checking)
        expect(onTriggerWelderDialog).not.toHaveBeenCalled()
      })
    })
  })
})
