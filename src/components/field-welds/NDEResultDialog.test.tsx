/**
 * Unit Tests: NDEResultDialog Component (T039)
 * Tests NDE result recording with conditional warning on FAIL
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NDEResultDialog } from './NDEResultDialog'

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    loading: false,
  }),
}))

vi.mock('@/hooks/useRecordNDE', () => ({
  useRecordNDE: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
  }),
}))

describe('NDEResultDialog', () => {
  const defaultProps = {
    fieldWeldId: 'weld-1',
    componentId: 'comp-1',
    weldIdentity: 'PW-55401 2OF3',
    welderName: 'John Smith (K-07)',
    dateWelded: '2024-01-15',
    open: true,
    onOpenChange: vi.fn(),
  }

  it('displays context section with weld ID, welder and date', () => {
    render(<NDEResultDialog {...defaultProps} />)

    expect(screen.getByText('PW-55401 2OF3')).toBeInTheDocument()
    expect(screen.getByText(/John Smith/)).toBeInTheDocument()
    expect(screen.getByText(/2024-01-15/)).toBeInTheDocument()
  })

  it('shows NDE type dropdown with options', () => {
    render(<NDEResultDialog {...defaultProps} />)

    expect(screen.getByLabelText(/NDE type/i)).toBeInTheDocument()
  })

  it('shows result radio buttons (PASS/FAIL/PENDING)', () => {
    render(<NDEResultDialog {...defaultProps} />)

    expect(screen.getByLabelText(/PASS/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/FAIL/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/PENDING/i)).toBeInTheDocument()
  })

  it('shows warning box only when FAIL selected', async () => {
    const user = userEvent.setup()

    render(<NDEResultDialog {...defaultProps} />)

    // Warning should not be visible initially
    expect(screen.queryByText(/WARNING.*Rejection/i)).not.toBeInTheDocument()

    // Select FAIL
    const failRadio = screen.getByLabelText(/FAIL/i)
    await user.click(failRadio)

    // Warning should now be visible
    expect(screen.getByText(/WARNING.*Rejection/i)).toBeInTheDocument()
  })

  it('hides warning when other option selected', async () => {
    const user = userEvent.setup()

    render(<NDEResultDialog {...defaultProps} />)

    // Select FAIL first
    await user.click(screen.getByLabelText(/FAIL/i))
    expect(screen.getByText(/WARNING.*Rejection/i)).toBeInTheDocument()

    // Select PASS
    await user.click(screen.getByLabelText(/PASS/i))

    // Warning should hide
    expect(screen.queryByText(/WARNING.*Rejection/i)).not.toBeInTheDocument()
  })

  it('submits NDE data with all fields', async () => {
    const user = userEvent.setup()

    render(<NDEResultDialog {...defaultProps} />)

    const submitButton = screen.getByRole('button', { name: /record/i })
    await user.click(submitButton)

    expect(submitButton).toBeInTheDocument()
  })

  describe('onSuccess callback', () => {
    it('calls onSuccess with NDE payload after successful submission', async () => {
      const user = userEvent.setup()
      const mockOnSuccess = vi.fn()
      const mockOnOpenChange = vi.fn()

      render(
        <NDEResultDialog
          fieldWeldId="weld-123"
          componentId="comp-456"
          welderName="Test Welder"
          dateWelded="2024-01-15"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      // Select NDE type - click the trigger first
      const typeSelect = screen.getByRole('combobox', { name: /NDE type/i })
      await user.click(typeSelect)
      const rtOption = screen.getByRole('option', { name: /RT/i })
      await user.click(rtOption)

      // Select PASS result
      const passRadio = screen.getByLabelText(/PASS/i)
      await user.click(passRadio)

      // Submit
      const submitButton = screen.getByRole('button', { name: /Record NDE Result/i })
      await user.click(submitButton)

      // onSuccess should be called with payload
      expect(mockOnSuccess).toHaveBeenCalledTimes(1)
      expect(mockOnSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          ndeType: 'RT',
          ndeResult: 'PASS',
          ndeDate: expect.any(String),
        })
      )
    })

    it('does not call onSuccess when dialog is cancelled', async () => {
      const user = userEvent.setup()
      const mockOnSuccess = vi.fn()
      const mockOnOpenChange = vi.fn()

      render(
        <NDEResultDialog
          fieldWeldId="weld-123"
          componentId="comp-456"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      // Click cancel
      const cancelButton = screen.getByRole('button', { name: /Cancel/i })
      await user.click(cancelButton)

      // onSuccess should NOT be called
      expect(mockOnSuccess).not.toHaveBeenCalled()
    })

    it('includes ndeNotes in onSuccess payload when provided', async () => {
      const user = userEvent.setup()
      const mockOnSuccess = vi.fn()

      render(
        <NDEResultDialog
          fieldWeldId="weld-123"
          componentId="comp-456"
          open={true}
          onOpenChange={vi.fn()}
          onSuccess={mockOnSuccess}
        />
      )

      // Select NDE type
      const typeSelect = screen.getByRole('combobox', { name: /NDE type/i })
      await user.click(typeSelect)
      await user.click(screen.getByRole('option', { name: /UT/i }))

      // Select PASS
      await user.click(screen.getByLabelText(/PASS/i))

      // Add notes (use shorter text and paste for speed)
      const notesInput = screen.getByPlaceholderText(/Additional inspection notes/i)
      await user.clear(notesInput)
      await user.type(notesInput, 'OK')

      // Submit
      await user.click(screen.getByRole('button', { name: /Record NDE Result/i }))

      // onSuccess should include notes
      expect(mockOnSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          ndeType: 'UT',
          ndeResult: 'PASS',
          ndeNotes: 'OK',
        })
      )
    }, 10000)
  })
})
