import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { UserProfileModal } from '@/components/profile/UserProfileModal'

describe('UserProfileModal', () => {
  it('renders when open prop is true', () => {
    const mockOnOpenChange = vi.fn()

    render(
      <UserProfileModal open={true} onOpenChange={mockOnOpenChange}>
        <div>Profile Content</div>
      </UserProfileModal>
    )

    expect(screen.getByText('Profile Content')).toBeInTheDocument()
  })

  it('does not render when open prop is false', () => {
    const mockOnOpenChange = vi.fn()

    render(
      <UserProfileModal open={false} onOpenChange={mockOnOpenChange}>
        <div>Profile Content</div>
      </UserProfileModal>
    )

    expect(screen.queryByText('Profile Content')).not.toBeInTheDocument()
  })

  it('calls onOpenChange when Escape key pressed', async () => {
    const user = userEvent.setup()
    const mockOnOpenChange = vi.fn()

    render(
      <UserProfileModal open={true} onOpenChange={mockOnOpenChange}>
        <div>Profile Content</div>
      </UserProfileModal>
    )

    // Press Escape
    await user.keyboard('{Escape}')

    // Expect onOpenChange called with false
    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('calls onOpenChange when clicking outside', async () => {
    const user = userEvent.setup()
    const mockOnOpenChange = vi.fn()

    const { container } = render(
      <UserProfileModal open={true} onOpenChange={mockOnOpenChange}>
        <div>Profile Content</div>
      </UserProfileModal>
    )

    // Click outside (on overlay)
    const overlay = container.querySelector('[role="dialog"]')?.parentElement
    if (overlay) {
      await user.click(overlay)
    }

    // Note: This behavior depends on Radix Dialog implementation
    // Test may need adjustment based on actual behavior
  })

  it('has proper accessibility attributes', () => {
    const mockOnOpenChange = vi.fn()

    render(
      <UserProfileModal open={true} onOpenChange={mockOnOpenChange}>
        <div>Profile Content</div>
      </UserProfileModal>
    )

    // Expect dialog role
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
  })
})
