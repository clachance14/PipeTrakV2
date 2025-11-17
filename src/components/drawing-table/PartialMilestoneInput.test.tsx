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

describe('PartialMilestoneInput - No Duplicate Saves', () => {
  const mockMilestone: MilestoneConfig = {
    name: 'Install',
    isDiscrete: false,
  }

  const mockOnUpdate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should only call onUpdate ONCE when Enter is pressed (not twice from Enter + blur)', () => {
    render(
      <div>
        <PartialMilestoneInput
          milestone={mockMilestone}
          currentValue={50}
          onUpdate={mockOnUpdate}
          disabled={false}
        />
        <PartialMilestoneInput
          milestone={{ name: 'Punch', isDiscrete: false }}
          currentValue={0}
          onUpdate={vi.fn()}
          disabled={false}
        />
      </div>
    )

    const firstInput = screen.getAllByRole('spinbutton')[0]

    // Change value and press Enter
    fireEvent.change(firstInput, { target: { value: '75' } })
    fireEvent.keyDown(firstInput, { key: 'Enter' })

    // Focus should move to next input, triggering blur on first input
    // But onUpdate should only be called ONCE, not twice
    expect(mockOnUpdate).toHaveBeenCalledTimes(1)
    expect(mockOnUpdate).toHaveBeenCalledWith(75)
  })

  it('should only call onUpdate ONCE when Enter is pressed on last input (no next input)', () => {
    render(
      <PartialMilestoneInput
        milestone={mockMilestone}
        currentValue={50}
        onUpdate={mockOnUpdate}
        disabled={false}
      />
    )

    const input = screen.getByRole('spinbutton')

    // Change value and press Enter (no next input to focus)
    fireEvent.change(input, { target: { value: '80' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    // onUpdate should only be called ONCE
    expect(mockOnUpdate).toHaveBeenCalledTimes(1)
    expect(mockOnUpdate).toHaveBeenCalledWith(80)
  })

  it('should call onUpdate when clicking away (blur) after typing', () => {
    render(
      <div>
        <PartialMilestoneInput
          milestone={mockMilestone}
          currentValue={50}
          onUpdate={mockOnUpdate}
          disabled={false}
        />
        <button>Outside</button>
      </div>
    )

    const input = screen.getByRole('spinbutton')

    // Change value and blur (click away) without pressing Enter
    fireEvent.change(input, { target: { value: '60' } })
    fireEvent.blur(input)

    // onUpdate should be called from blur
    expect(mockOnUpdate).toHaveBeenCalledTimes(1)
    expect(mockOnUpdate).toHaveBeenCalledWith(60)
  })

  it('should NOT call onUpdate when pressing Enter with same value', () => {
    render(
      <PartialMilestoneInput
        milestone={mockMilestone}
        currentValue={50}
        onUpdate={mockOnUpdate}
        disabled={false}
      />
    )

    const input = screen.getByRole('spinbutton')

    // Press Enter without changing value
    fireEvent.keyDown(input, { key: 'Enter' })

    // onUpdate should NOT be called (value didn't change)
    expect(mockOnUpdate).not.toHaveBeenCalled()
  })

  it('should NOT create duplicate events when rapidly navigating with Enter', () => {
    const onUpdate1 = vi.fn()
    const onUpdate2 = vi.fn()
    const onUpdate3 = vi.fn()

    render(
      <div>
        <PartialMilestoneInput
          milestone={{ name: 'Fabricate', isDiscrete: false }}
          currentValue={0}
          onUpdate={onUpdate1}
          disabled={false}
        />
        <PartialMilestoneInput
          milestone={{ name: 'Install', isDiscrete: false }}
          currentValue={0}
          onUpdate={onUpdate2}
          disabled={false}
        />
        <PartialMilestoneInput
          milestone={{ name: 'Punch', isDiscrete: false }}
          currentValue={0}
          onUpdate={onUpdate3}
          disabled={false}
        />
      </div>
    )

    const inputs = screen.getAllByRole('spinbutton')

    // Type in first input and press Enter (moves to second)
    fireEvent.change(inputs[0], { target: { value: '25' } })
    fireEvent.keyDown(inputs[0], { key: 'Enter' })

    // Type in second input and press Enter (moves to third)
    fireEvent.change(inputs[1], { target: { value: '50' } })
    fireEvent.keyDown(inputs[1], { key: 'Enter' })

    // Type in third input and press Enter (no next input)
    fireEvent.change(inputs[2], { target: { value: '75' } })
    fireEvent.keyDown(inputs[2], { key: 'Enter' })

    // Each onUpdate should be called exactly ONCE
    expect(onUpdate1).toHaveBeenCalledTimes(1)
    expect(onUpdate1).toHaveBeenCalledWith(25)

    expect(onUpdate2).toHaveBeenCalledTimes(1)
    expect(onUpdate2).toHaveBeenCalledWith(50)

    expect(onUpdate3).toHaveBeenCalledTimes(1)
    expect(onUpdate3).toHaveBeenCalledWith(75)
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
          variant="compact"
        />
      )

      // Helper text should be visible
      expect(screen.getByText(/50.*100 LF/)).toBeInTheDocument()
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
          variant="compact"
        />
      )

      // Initial helper text
      expect(screen.getByText(/50.*100 LF/)).toBeInTheDocument()

      // Change value
      const input = screen.getByRole('spinbutton')
      fireEvent.change(input, { target: { value: '75' } })

      // Helper text should update immediately
      expect(screen.getByText(/75.*100 LF/)).toBeInTheDocument()
      expect(screen.queryByText(/50.*100 LF/)).not.toBeInTheDocument()
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
          variant="compact"
        />
      )

      expect(screen.getByText(/75.*100 LF/)).toBeInTheDocument()
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
          variant="compact"
        />
      )

      expect(screen.getByText(/75.*150 LF/)).toBeInTheDocument()
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
          variant="compact"
        />
      )

      expect(screen.getByText(/33.*100 LF/)).toBeInTheDocument()
    })

    it('should hide helper text for 0% complete (spec: only show when value > 0)', () => {
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
          variant="compact"
        />
      )

      // Per component code line 271: only show when localValue > 0
      expect(screen.queryByText(/LF/)).not.toBeInTheDocument()
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
          variant="compact"
        />
      )

      expect(screen.getByText(/100.*100 LF/)).toBeInTheDocument()
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
