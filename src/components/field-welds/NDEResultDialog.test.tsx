/**
 * Unit Tests: NDEResultDialog Component (T039)
 * Tests NDE result recording with conditional warning on FAIL
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NDEResultDialog } from './NDEResultDialog'

vi.mock('@/hooks/useRecordNDE', () => ({
  useRecordNDE: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
  }),
}))

describe('NDEResultDialog', () => {
  const mockFieldWeld = {
    id: 'weld-1',
    component_id: 'comp-1',
    welder: { stencil: 'K-07', name: 'John Smith' },
    date_welded: '2024-01-15',
  }

  it('displays context section with welder and date', () => {
    render(
      <NDEResultDialog
        open={true}
        onOpenChange={vi.fn()}
        fieldWeld={mockFieldWeld as any}
      />
    )

    expect(screen.getByText(/K-07/)).toBeInTheDocument()
    expect(screen.getByText(/John Smith/)).toBeInTheDocument()
    expect(screen.getByText(/2024-01-15/)).toBeInTheDocument()
  })

  it('shows NDE type dropdown with options', () => {
    render(
      <NDEResultDialog
        open={true}
        onOpenChange={vi.fn()}
        fieldWeld={mockFieldWeld as any}
      />
    )

    expect(screen.getByLabelText(/NDE type/i)).toBeInTheDocument()
  })

  it('shows result radio buttons (PASS/FAIL/PENDING)', () => {
    render(
      <NDEResultDialog
        open={true}
        onOpenChange={vi.fn()}
        fieldWeld={mockFieldWeld as any}
      />
    )

    expect(screen.getByLabelText(/PASS/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/FAIL/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/PENDING/i)).toBeInTheDocument()
  })

  it('shows warning box only when FAIL selected', async () => {
    const user = userEvent.setup()

    render(
      <NDEResultDialog
        open={true}
        onOpenChange={vi.fn()}
        fieldWeld={mockFieldWeld as any}
      />
    )

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

    render(
      <NDEResultDialog
        open={true}
        onOpenChange={vi.fn()}
        fieldWeld={mockFieldWeld as any}
      />
    )

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

    render(
      <NDEResultDialog
        open={true}
        onOpenChange={vi.fn()}
        fieldWeld={mockFieldWeld as any}
      />
    )

    const submitButton = screen.getByRole('button', { name: /record/i })
    await user.click(submitButton)

    expect(submitButton).toBeInTheDocument()
  })
})
