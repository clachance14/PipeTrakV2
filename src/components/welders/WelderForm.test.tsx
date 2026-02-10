/**
 * Unit Tests: WelderForm Component (T035)
 * Tests form validation, submission, and error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WelderForm } from './WelderForm'
import { useWelders } from '@/hooks/useWelders'
import { toast } from 'sonner'

// Mock dependencies
vi.mock('@/hooks/useWelders')
vi.mock('sonner')

describe('WelderForm', () => {
  const mockMutateAsync = vi.fn()
  const mockOnOpenChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useWelders).mockReturnValue({
      createWelderMutation: {
        mutateAsync: mockMutateAsync,
        isPending: false,
      },
    } as any)
  })

  it('validates stencil with correct regex pattern', async () => {
    const user = userEvent.setup()
    render(<WelderForm projectId="project-1" open={true} onOpenChange={mockOnOpenChange} />)

    const stencilInput = screen.getByLabelText(/stencil/i)
    const submitButton = screen.getByRole('button', { name: /create/i })

    // Test invalid stencil (too short)
    await user.type(stencilInput, 'K')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/must be 2-12 characters/i)).toBeInTheDocument()
    })

    // Clear and test invalid characters
    await user.clear(stencilInput)
    await user.type(stencilInput, 'K@07')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/must be 2-12 characters/i)).toBeInTheDocument()
    })
  })

  it('accepts valid stencil formats', async () => {
    const user = userEvent.setup()
    mockMutateAsync.mockResolvedValueOnce({})

    render(<WelderForm projectId="project-1" open={true} onOpenChange={mockOnOpenChange} />)

    const stencilInput = screen.getByLabelText(/stencil/i)
    const nameInput = screen.getByLabelText(/name/i)

    // Test valid stencil patterns
    const validStencils = ['K-07', 'R05', 'ABC-123', 'XY']

    for (const validStencil of validStencils) {
      await user.clear(stencilInput)
      await user.clear(nameInput)
      await user.type(stencilInput, validStencil.toLowerCase()) // Should convert to uppercase
      await user.type(nameInput, 'Test Welder')

      const submitButton = screen.getByRole('button', { name: /create/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            stencil: validStencil.toUpperCase(),
          })
        )
      })

      vi.clearAllMocks()
      mockMutateAsync.mockResolvedValueOnce({})
    }
  })

  it('auto-converts stencil to uppercase', async () => {
    const user = userEvent.setup()
    render(<WelderForm projectId="project-1" open={true} onOpenChange={mockOnOpenChange} />)

    const stencilInput = screen.getByLabelText(/stencil/i)

    await user.type(stencilInput, 'k-07')

    expect(stencilInput).toHaveValue('K-07')
  })

  it('shows inline validation errors', async () => {
    const user = userEvent.setup()
    render(<WelderForm projectId="project-1" open={true} onOpenChange={mockOnOpenChange} />)

    const stencilInput = screen.getByLabelText(/stencil/i)
    const _nameInput = screen.getByLabelText(/name/i)
    const submitButton = screen.getByRole('button', { name: /create/i })

    // Leave fields empty and submit
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/stencil is required/i)).toBeInTheDocument()
      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
    })

    // Fill stencil with invalid format
    await user.type(stencilInput, 'X')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/must be 2-12 characters/i)).toBeInTheDocument()
    })

    // Fix stencil, leave name empty
    await user.clear(stencilInput)
    await user.type(stencilInput, 'K-07')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.queryByText(/must be 2-12 characters/i)).not.toBeInTheDocument()
      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
    })
  })

  it('submits valid data successfully', async () => {
    const user = userEvent.setup()
    mockMutateAsync.mockResolvedValueOnce({})

    render(<WelderForm projectId="project-1" open={true} onOpenChange={mockOnOpenChange} />)

    const stencilInput = screen.getByLabelText(/stencil/i)
    const nameInput = screen.getByLabelText(/name/i)
    const submitButton = screen.getByRole('button', { name: /create/i })

    await user.type(stencilInput, 'K-07')
    await user.type(nameInput, 'John Smith')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        project_id: 'project-1',
        stencil: 'K-07',
        name: 'John Smith',
        status: 'unverified',
      })
    })
  })

  it('closes dialog on successful submission', async () => {
    const user = userEvent.setup()
    mockMutateAsync.mockResolvedValueOnce({})

    render(<WelderForm projectId="project-1" open={true} onOpenChange={mockOnOpenChange} />)

    const stencilInput = screen.getByLabelText(/stencil/i)
    const nameInput = screen.getByLabelText(/name/i)
    const submitButton = screen.getByRole('button', { name: /create/i })

    await user.type(stencilInput, 'K-07')
    await user.type(nameInput, 'John Smith')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('shows success toast notification', async () => {
    const user = userEvent.setup()
    mockMutateAsync.mockResolvedValueOnce({})

    render(<WelderForm projectId="project-1" open={true} onOpenChange={mockOnOpenChange} />)

    const stencilInput = screen.getByLabelText(/stencil/i)
    const nameInput = screen.getByLabelText(/name/i)
    const submitButton = screen.getByRole('button', { name: /create/i })

    await user.type(stencilInput, 'K-07')
    await user.type(nameInput, 'John Smith')
    await user.click(submitButton)

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Welder created successfully',
        expect.objectContaining({
          description: 'K-07 - John Smith has been added to the project',
        })
      )
    })
  })

  it('shows error toast notification on failure', async () => {
    const user = userEvent.setup()
    mockMutateAsync.mockRejectedValueOnce(new Error('Duplicate stencil'))

    render(<WelderForm projectId="project-1" open={true} onOpenChange={mockOnOpenChange} />)

    const stencilInput = screen.getByLabelText(/stencil/i)
    const nameInput = screen.getByLabelText(/name/i)
    const submitButton = screen.getByRole('button', { name: /create/i })

    await user.type(stencilInput, 'K-07')
    await user.type(nameInput, 'John Smith')
    await user.click(submitButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Error creating welder',
        expect.objectContaining({
          description: 'Duplicate stencil',
        })
      )
    })

    // Dialog should NOT close on error
    expect(mockOnOpenChange).not.toHaveBeenCalled()
  })

  it('cancels and closes dialog', async () => {
    const user = userEvent.setup()
    render(<WelderForm projectId="project-1" open={true} onOpenChange={mockOnOpenChange} />)

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('resets form on cancel', async () => {
    const user = userEvent.setup()
    render(<WelderForm projectId="project-1" open={true} onOpenChange={mockOnOpenChange} />)

    const stencilInput = screen.getByLabelText(/stencil/i)
    const nameInput = screen.getByLabelText(/name/i)

    // Fill form
    await user.type(stencilInput, 'K-07')
    await user.type(nameInput, 'John Smith')

    // Trigger validation error
    await user.clear(stencilInput)
    await user.click(screen.getByRole('button', { name: /create/i }))

    await waitFor(() => {
      expect(screen.getByText(/stencil is required/i)).toBeInTheDocument()
    })

    // Cancel should clear errors
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    // Reopen form (simulate)
    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('disables submit button while submitting', async () => {
    vi.mocked(useWelders).mockReturnValue({
      createWelderMutation: {
        mutateAsync: mockMutateAsync,
        isPending: true,
      },
    } as any)

    render(<WelderForm projectId="project-1" open={true} onOpenChange={mockOnOpenChange} />)

    const submitButton = screen.getByRole('button', { name: /creating/i })

    expect(submitButton).toBeDisabled()
  })

  it('trims whitespace from inputs', async () => {
    const user = userEvent.setup()
    mockMutateAsync.mockResolvedValueOnce({})

    render(<WelderForm projectId="project-1" open={true} onOpenChange={mockOnOpenChange} />)

    const stencilInput = screen.getByLabelText(/stencil/i)
    const nameInput = screen.getByLabelText(/name/i)

    await user.type(stencilInput, '  K-07  ')
    await user.type(nameInput, '  John Smith  ')

    const submitButton = screen.getByRole('button', { name: /create/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          stencil: 'K-07',
          name: 'John Smith',
        })
      )
    })
  })
})
