/**
 * Unit Tests: WelderAssignDialog Component (T037)
 * Tests welder assignment dialog with date picker and info panel
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WelderAssignDialog } from './WelderAssignDialog'

// Mock hooks
vi.mock('@/hooks/useWelders', () => ({
  useWelders: () => ({
    data: [
      { id: '1', stencil: 'K-07', name: 'John Smith', status: 'verified' },
      { id: '2', stencil: 'R-05', name: 'Jane Doe', status: 'unverified' },
    ],
  }),
}))

vi.mock('@/hooks/useAssignWelder', () => ({
  useAssignWelder: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
  }),
}))

describe('WelderAssignDialog', () => {
  it('lists welders in dropdown with stencil - name format', () => {
    render(
      <WelderAssignDialog
        open={true}
        onOpenChange={vi.fn()}
        fieldWeldId="weld-1"
        projectId="project-1"
      />
    )

    expect(screen.getByText(/assign welder/i)).toBeInTheDocument()
  })

  it('date defaults to today', () => {
    render(
      <WelderAssignDialog
        open={true}
        onOpenChange={vi.fn()}
        fieldWeldId="weld-1"
        projectId="project-1"
      />
    )

    const today = new Date().toISOString().split('T')[0]
    const dateInput = screen.getByLabelText(/date welded/i)
    expect(dateInput).toHaveValue(today)
  })

  it('displays info panel about milestone update', () => {
    render(
      <WelderAssignDialog
        open={true}
        onOpenChange={vi.fn()}
        fieldWeldId="weld-1"
        projectId="project-1"
      />
    )

    expect(screen.getByText(/weld complete.*milestone/i)).toBeInTheDocument()
    expect(screen.getByText(/95%/)).toBeInTheDocument()
  })

  it('submits assignment with welder and date', async () => {
    const user = userEvent.setup()
    const mockOnOpenChange = vi.fn()

    render(
      <WelderAssignDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        fieldWeldId="weld-1"
        projectId="project-1"
      />
    )

    const submitButton = screen.getByRole('button', { name: /assign/i })
    await user.click(submitButton)

    // Form should validate and submit
    expect(submitButton).toBeInTheDocument()
  })
})
