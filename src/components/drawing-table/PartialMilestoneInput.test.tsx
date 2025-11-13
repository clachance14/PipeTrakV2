import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PartialMilestoneInput } from './PartialMilestoneInput'
import type { MilestoneConfig } from '@/types/drawing-table.types'

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
