import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PartialMilestoneInput } from './PartialMilestoneInput'
import type { MilestoneConfig, ComponentRow } from '@/types/drawing-table.types'

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('PartialMilestoneInput - Event Propagation', () => {
  const mockMilestone: MilestoneConfig = {
    name: 'Install',
    isDiscrete: false,
  }

  const mockOnUpdate = vi.fn()
  const mockParentKeyDown = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Enter Key Event Propagation', () => {
    it('should stop event propagation when Enter key is pressed', () => {
      // Render input inside a parent with keyboard handler (simulating ComponentRow)
      const { container } = render(
        <div
          onKeyDown={mockParentKeyDown}
          data-testid="parent-container"
        >
          <PartialMilestoneInput
            milestone={mockMilestone}
            currentValue={50}
            onUpdate={mockOnUpdate}
            disabled={false}
          />
        </div>
      )

      const input = screen.getByRole('spinbutton')

      // Change value and press Enter
      fireEvent.change(input, { target: { value: '75' } })
      fireEvent.keyDown(input, { key: 'Enter', bubbles: true })

      // Verify input handler was called
      expect(mockOnUpdate).toHaveBeenCalledWith(75)

      // BUG: This assertion will FAIL because event propagates to parent
      expect(mockParentKeyDown).not.toHaveBeenCalled()
    })

    it('should not trigger parent row click when Enter pressed on valid input', () => {
      const mockRowClick = vi.fn()

      render(
        <div
          role="row"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              mockRowClick()
            }
          }}
        >
          <PartialMilestoneInput
            milestone={mockMilestone}
            currentValue={50}
            onUpdate={mockOnUpdate}
            disabled={false}
          />
        </div>
      )

      const input = screen.getByRole('spinbutton')
      fireEvent.change(input, { target: { value: '80' } })
      fireEvent.keyDown(input, { key: 'Enter', bubbles: true })

      // Value should save
      expect(mockOnUpdate).toHaveBeenCalledWith(80)

      // BUG: Row click should NOT fire, but it will
      expect(mockRowClick).not.toHaveBeenCalled()
    })

    it('should not trigger parent handlers when Enter pressed with same value', () => {
      render(
        <div onKeyDown={mockParentKeyDown}>
          <PartialMilestoneInput
            milestone={mockMilestone}
            currentValue={50}
            onUpdate={mockOnUpdate}
            disabled={false}
          />
        </div>
      )

      const input = screen.getByRole('spinbutton')

      // Press Enter without changing value
      fireEvent.keyDown(input, { key: 'Enter', bubbles: true })

      // onUpdate should not be called (value didn't change)
      expect(mockOnUpdate).not.toHaveBeenCalled()

      // BUG: Parent handler should still not be called
      expect(mockParentKeyDown).not.toHaveBeenCalled()
    })

    it('should not trigger parent handlers when Enter pressed with invalid value', () => {
      render(
        <div onKeyDown={mockParentKeyDown}>
          <PartialMilestoneInput
            milestone={mockMilestone}
            currentValue={50}
            onUpdate={mockOnUpdate}
            disabled={false}
          />
        </div>
      )

      const input = screen.getByRole('spinbutton')

      // Type invalid value (>100)
      fireEvent.change(input, { target: { value: '150' } })
      fireEvent.keyDown(input, { key: 'Enter', bubbles: true })

      // onUpdate should not be called (invalid value)
      expect(mockOnUpdate).not.toHaveBeenCalled()

      // BUG: Parent handler should not be called even for invalid values
      expect(mockParentKeyDown).not.toHaveBeenCalled()
    })
  })

  describe('Escape Key Event Propagation', () => {
    it('should stop event propagation when Escape key is pressed', () => {
      render(
        <div onKeyDown={mockParentKeyDown}>
          <PartialMilestoneInput
            milestone={mockMilestone}
            currentValue={50}
            onUpdate={mockOnUpdate}
            disabled={false}
          />
        </div>
      )

      const input = screen.getByRole('spinbutton')

      // Change value and press Escape
      fireEvent.change(input, { target: { value: '75' } })
      fireEvent.keyDown(input, { key: 'Escape', bubbles: true })

      // onUpdate should not be called (Escape cancels)
      expect(mockOnUpdate).not.toHaveBeenCalled()

      // BUG: Parent handler should not be called
      expect(mockParentKeyDown).not.toHaveBeenCalled()
    })

    it('should not trigger parent close handler when Escape cancels edit', () => {
      const mockCloseModal = vi.fn()

      render(
        <div
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              mockCloseModal()
            }
          }}
        >
          <PartialMilestoneInput
            milestone={mockMilestone}
            currentValue={50}
            onUpdate={mockOnUpdate}
            disabled={false}
          />
        </div>
      )

      const input = screen.getByRole('spinbutton')

      // Focus input and press Escape
      fireEvent.focus(input)
      fireEvent.keyDown(input, { key: 'Escape', bubbles: true })

      // BUG: Escape should cancel the input edit, not close parent modal
      expect(mockCloseModal).not.toHaveBeenCalled()
    })
  })

  describe('Event Propagation with Multiple Inputs', () => {
    it('should not trigger parent when navigating between inputs with Enter', () => {
      const mockParentHandler = vi.fn()

      render(
        <div
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              mockParentHandler()
            }
          }}
        >
          <PartialMilestoneInput
            milestone={{ name: 'Install', isDiscrete: false }}
            currentValue={25}
            onUpdate={vi.fn()}
            disabled={false}
          />
          <PartialMilestoneInput
            milestone={{ name: 'Punch', isDiscrete: false }}
            currentValue={50}
            onUpdate={vi.fn()}
            disabled={false}
          />
          <PartialMilestoneInput
            milestone={{ name: 'Tested', isDiscrete: false }}
            currentValue={75}
            onUpdate={vi.fn()}
            disabled={false}
          />
        </div>
      )

      const inputs = screen.getAllByRole('spinbutton')

      // Press Enter on first input (should advance to second)
      fireEvent.keyDown(inputs[0], { key: 'Enter', bubbles: true })

      // BUG: Parent handler should not fire during input navigation
      expect(mockParentHandler).not.toHaveBeenCalled()
    })
  })

  describe('Original Functionality (Regression Prevention)', () => {
    it('should save value and call onUpdate when Enter pressed', () => {
      render(
        <PartialMilestoneInput
          milestone={mockMilestone}
          currentValue={50}
          onUpdate={mockOnUpdate}
          disabled={false}
        />
      )

      const input = screen.getByRole('spinbutton')
      fireEvent.change(input, { target: { value: '75' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      expect(mockOnUpdate).toHaveBeenCalledWith(75)
    })

    it('should cancel edit and revert value when Escape pressed', () => {
      render(
        <PartialMilestoneInput
          milestone={mockMilestone}
          currentValue={50}
          onUpdate={mockOnUpdate}
          disabled={false}
        />
      )

      const input = screen.getByRole('spinbutton') as HTMLInputElement

      // Change value
      fireEvent.change(input, { target: { value: '75' } })
      expect(input.value).toBe('75')

      // Press Escape
      fireEvent.keyDown(input, { key: 'Escape' })

      // Value should revert
      expect(input.value).toBe('50')
      expect(mockOnUpdate).not.toHaveBeenCalled()
    })

    it('should validate values (0-100 range)', () => {
      render(
        <PartialMilestoneInput
          milestone={mockMilestone}
          currentValue={50}
          onUpdate={mockOnUpdate}
          disabled={false}
        />
      )

      const input = screen.getByRole('spinbutton')

      // Try invalid value > 100
      fireEvent.change(input, { target: { value: '150' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      // Should not call onUpdate
      expect(mockOnUpdate).not.toHaveBeenCalled()

      // Should show error state
      expect(input).toHaveAttribute('aria-invalid', 'true')
    })
  })
})

describe('PartialMilestoneInput - Helper Text (Feature 027)', () => {
  const mockMilestone: MilestoneConfig = {
    name: 'Install',
    weight: 20,
    order: 2,
    is_partial: true,
    requires_welder: false,
  }

  const mockOnUpdate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // T034: Test helper text rendering for aggregate threaded pipe
  describe('Helper Text Rendering', () => {
    it('should show helper text for aggregate threaded pipe components', () => {
      const aggregateComponent: Partial<ComponentRow> = {
        id: 'component-1',
        component_type: 'threaded_pipe',
        identity_key: { pipe_id: '1-AGG' },
        attributes: {
          total_linear_feet: 100,
        },
      }

      render(
        <PartialMilestoneInput
          milestone={mockMilestone}
          currentValue={50}
          onUpdate={mockOnUpdate}
          disabled={false}
          component={aggregateComponent as ComponentRow}
        />
      )

      // Helper text should be visible
      expect(screen.getByText('50 LF of 100 LF')).toBeInTheDocument()
    })

    it('should update helper text when user types new value', () => {
      const aggregateComponent: Partial<ComponentRow> = {
        id: 'component-1',
        component_type: 'threaded_pipe',
        identity_key: { pipe_id: '1-AGG' },
        attributes: {
          total_linear_feet: 100,
        },
      }

      render(
        <PartialMilestoneInput
          milestone={mockMilestone}
          currentValue={50}
          onUpdate={mockOnUpdate}
          disabled={false}
          component={aggregateComponent as ComponentRow}
        />
      )

      // Initial helper text
      expect(screen.getByText('50 LF of 100 LF')).toBeInTheDocument()

      // Change value
      const input = screen.getByRole('spinbutton')
      fireEvent.change(input, { target: { value: '75' } })

      // Helper text should update immediately
      expect(screen.getByText('75 LF of 100 LF')).toBeInTheDocument()
      expect(screen.queryByText('50 LF of 100 LF')).not.toBeInTheDocument()
    })
  })

  // T035: Test helper text calculation (75% of 100 = 75 LF)
  describe('Helper Text Calculation', () => {
    it('should calculate linear feet correctly (75% of 100 = 75 LF)', () => {
      const aggregateComponent: Partial<ComponentRow> = {
        id: 'component-1',
        component_type: 'threaded_pipe',
        identity_key: { pipe_id: '1-AGG' },
        attributes: {
          total_linear_feet: 100,
        },
      }

      render(
        <PartialMilestoneInput
          milestone={mockMilestone}
          currentValue={75}
          onUpdate={mockOnUpdate}
          disabled={false}
          component={aggregateComponent as ComponentRow}
        />
      )

      expect(screen.getByText('75 LF of 100 LF')).toBeInTheDocument()
    })

    it('should round linear feet to nearest integer (50% of 150 = 75 LF)', () => {
      const aggregateComponent: Partial<ComponentRow> = {
        id: 'component-1',
        component_type: 'threaded_pipe',
        identity_key: { pipe_id: '1-AGG' },
        attributes: {
          total_linear_feet: 150,
        },
      }

      render(
        <PartialMilestoneInput
          milestone={mockMilestone}
          currentValue={50}
          onUpdate={mockOnUpdate}
          disabled={false}
          component={aggregateComponent as ComponentRow}
        />
      )

      expect(screen.getByText('75 LF of 150 LF')).toBeInTheDocument()
    })

    it('should handle decimal percentages (33% of 100 = 33 LF)', () => {
      const aggregateComponent: Partial<ComponentRow> = {
        id: 'component-1',
        component_type: 'threaded_pipe',
        identity_key: { pipe_id: '1-AGG' },
        attributes: {
          total_linear_feet: 100,
        },
      }

      render(
        <PartialMilestoneInput
          milestone={mockMilestone}
          currentValue={33}
          onUpdate={mockOnUpdate}
          disabled={false}
          component={aggregateComponent as ComponentRow}
        />
      )

      expect(screen.getByText('33 LF of 100 LF')).toBeInTheDocument()
    })

    it('should show 0 LF for 0% complete', () => {
      const aggregateComponent: Partial<ComponentRow> = {
        id: 'component-1',
        component_type: 'threaded_pipe',
        identity_key: { pipe_id: '1-AGG' },
        attributes: {
          total_linear_feet: 100,
        },
      }

      render(
        <PartialMilestoneInput
          milestone={mockMilestone}
          currentValue={0}
          onUpdate={mockOnUpdate}
          disabled={false}
          component={aggregateComponent as ComponentRow}
        />
      )

      expect(screen.getByText('0 LF of 100 LF')).toBeInTheDocument()
    })

    it('should show full LF for 100% complete', () => {
      const aggregateComponent: Partial<ComponentRow> = {
        id: 'component-1',
        component_type: 'threaded_pipe',
        identity_key: { pipe_id: '1-AGG' },
        attributes: {
          total_linear_feet: 100,
        },
      }

      render(
        <PartialMilestoneInput
          milestone={mockMilestone}
          currentValue={100}
          onUpdate={mockOnUpdate}
          disabled={false}
          component={aggregateComponent as ComponentRow}
        />
      )

      expect(screen.getByText('100 LF of 100 LF')).toBeInTheDocument()
    })
  })

  // T036: Test helper text hidden for non-aggregate components
  describe('Helper Text Visibility', () => {
    it('should hide helper text for non-aggregate threaded pipe (no -AGG suffix)', () => {
      const regularComponent: Partial<ComponentRow> = {
        id: 'component-1',
        component_type: 'threaded_pipe',
        identity_key: { pipe_id: '1' }, // No -AGG suffix
        attributes: {
          total_linear_feet: 100,
        },
      }

      render(
        <PartialMilestoneInput
          milestone={mockMilestone}
          currentValue={50}
          onUpdate={mockOnUpdate}
          disabled={false}
          component={regularComponent as ComponentRow}
        />
      )

      // Helper text should NOT be visible
      expect(screen.queryByText(/LF of/)).not.toBeInTheDocument()
    })

    it('should hide helper text for non-threaded pipe components', () => {
      const valveComponent: Partial<ComponentRow> = {
        id: 'component-1',
        component_type: 'valve',
        identity_key: {
          drawing_norm: 'P-001',
          commodity_code: 'VBALL-001',
          size: '2',
          seq: 1,
        },
        attributes: {},
      }

      render(
        <PartialMilestoneInput
          milestone={mockMilestone}
          currentValue={50}
          onUpdate={mockOnUpdate}
          disabled={false}
          component={valveComponent as ComponentRow}
        />
      )

      // Helper text should NOT be visible
      expect(screen.queryByText(/LF of/)).not.toBeInTheDocument()
    })

    it('should hide helper text when component prop is not provided', () => {
      render(
        <PartialMilestoneInput
          milestone={mockMilestone}
          currentValue={50}
          onUpdate={mockOnUpdate}
          disabled={false}
        />
      )

      // Helper text should NOT be visible (backward compatibility)
      expect(screen.queryByText(/LF of/)).not.toBeInTheDocument()
    })

    it('should hide helper text when total_linear_feet is missing', () => {
      const aggregateComponent: Partial<ComponentRow> = {
        id: 'component-1',
        component_type: 'threaded_pipe',
        identity_key: { pipe_id: '1-AGG' },
        attributes: {}, // Missing total_linear_feet
      }

      render(
        <PartialMilestoneInput
          milestone={mockMilestone}
          currentValue={50}
          onUpdate={mockOnUpdate}
          disabled={false}
          component={aggregateComponent as ComponentRow}
        />
      )

      // Helper text should NOT be visible
      expect(screen.queryByText(/LF of/)).not.toBeInTheDocument()
    })
  })
})
