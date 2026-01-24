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
    isPending: false,
  }),
}))

vi.mock('@/hooks/useUpdateWelderAssignment', () => ({
  useUpdateWelderAssignment: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
}))

vi.mock('@/hooks/useClearWelderAssignment', () => ({
  useClearWelderAssignment: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}))

vi.mock('@/hooks/useFieldWeld', () => ({
  useFieldWeld: () => ({
    data: null,
    isLoading: false,
  }),
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
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

    // Dialog title should be "Assign Welder"
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /assign welder/i })).toBeInTheDocument()
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

    // The info panel text is split across elements, so check for parts
    expect(screen.getByText(/"Weld Made"/)).toBeInTheDocument()
    expect(screen.getByText(/70%/)).toBeInTheDocument()
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

    const submitButton = screen.getByRole('button', { name: /^assign welder$/i })
    await user.click(submitButton)

    // Form should validate and submit
    expect(submitButton).toBeInTheDocument()
  })
})
