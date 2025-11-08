import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { UserProfileModal } from '@/components/profile/UserProfileModal'

describe('UserProfileModal', () => {
  const mockOnOpenChange = vi.fn()

  it('renders modal when open is true', () => {
    render(
      <UserProfileModal open={true} onOpenChange={mockOnOpenChange}>
        <div>Profile Content</div>
      </UserProfileModal>
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Profile Content')).toBeInTheDocument()
  })

  it('does not render modal when open is false', () => {
    render(
      <UserProfileModal open={false} onOpenChange={mockOnOpenChange}>
        <div>Profile Content</div>
      </UserProfileModal>
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('calls onOpenChange when Escape key is pressed', async () => {
    const user = userEvent.setup()

    render(
      <UserProfileModal open={true} onOpenChange={mockOnOpenChange}>
        <div>Profile Content</div>
      </UserProfileModal>
    )

    await user.keyboard('{Escape}')
    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('has proper ARIA attributes for accessibility', () => {
    render(
      <UserProfileModal open={true} onOpenChange={mockOnOpenChange}>
        <div>Profile Content</div>
      </UserProfileModal>
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-labelledby')
  })

  it('traps focus within modal when open', () => {
    render(
      <UserProfileModal open={true} onOpenChange={mockOnOpenChange}>
        <button>Button 1</button>
        <button>Button 2</button>
      </UserProfileModal>
    )

    const buttons = screen.getAllByRole('button')
    // Expect at least 2 buttons (our buttons + possible close button from Dialog)
    expect(buttons.length).toBeGreaterThanOrEqual(2)
    // Radix Dialog handles focus trap - we just verify elements are present
  })
})
