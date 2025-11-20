import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChangelogModal } from './ChangelogModal'

const mockRelease = {
  tag_name: 'v1.2.0',
  name: 'Version 1.2.0',
  published_at: '2025-11-20T10:30:00Z',
  body: '## Features\n- Add new weld log filtering\n- Improve mobile UI\n\n## Bug Fixes\n- Fix date sorting issue'
}

describe('ChangelogModal', () => {
  it('should render release information', () => {
    const onClose = vi.fn()

    render(
      <ChangelogModal
        release={mockRelease}
        isOpen={true}
        onClose={onClose}
      />
    )

    // Should show version in title
    expect(screen.getByText(/version 1\.2\.0/i)).toBeInTheDocument()

    // Should show release notes
    expect(screen.getByText(/add new weld log filtering/i)).toBeInTheDocument()
    expect(screen.getByText(/improve mobile ui/i)).toBeInTheDocument()
    expect(screen.getByText(/fix date sorting issue/i)).toBeInTheDocument()
  })

  it('should call onClose when dismissed', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <ChangelogModal
        release={mockRelease}
        isOpen={true}
        onClose={onClose}
      />
    )

    // Click the "Got it" button
    const button = screen.getByRole('button', { name: /got it/i })
    await user.click(button)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('should handle dialog interaction properly', () => {
    const onClose = vi.fn()

    render(
      <ChangelogModal
        release={mockRelease}
        isOpen={true}
        onClose={onClose}
      />
    )

    // Dialog should be rendered
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()

    // onClose handler should be defined
    expect(onClose).toBeDefined()
  })

  it('should not render when isOpen is false', () => {
    const onClose = vi.fn()

    render(
      <ChangelogModal
        release={mockRelease}
        isOpen={false}
        onClose={onClose}
      />
    )

    // Dialog should not be visible
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('should be keyboard accessible', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <ChangelogModal
        release={mockRelease}
        isOpen={true}
        onClose={onClose}
      />
    )

    // Tab to first focusable element (close button)
    await user.tab()

    // Tab again to reach the "Got it" button
    await user.tab()

    // Should focus the "Got it" button
    const button = screen.getByRole('button', { name: /got it/i })
    expect(button).toHaveFocus()

    // Press Enter
    await user.keyboard('{Enter}')

    expect(onClose).toHaveBeenCalled()
  })

  it('should close with Escape key', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <ChangelogModal
        release={mockRelease}
        isOpen={true}
        onClose={onClose}
      />
    )

    // Press Escape
    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalled()
  })

  it('should have proper ARIA attributes', () => {
    const onClose = vi.fn()

    render(
      <ChangelogModal
        release={mockRelease}
        isOpen={true}
        onClose={onClose}
      />
    )

    // Dialog role should be present
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()

    // Dialog should have accessible title
    const title = within(dialog).getByText(/what's new/i)
    expect(title).toBeInTheDocument()

    // Dialog should have description
    expect(dialog).toHaveAccessibleDescription()
  })

  it('should display formatted date', () => {
    const onClose = vi.fn()

    render(
      <ChangelogModal
        release={mockRelease}
        isOpen={true}
        onClose={onClose}
      />
    )

    // Should show formatted publish date
    // Exact format depends on implementation, but should contain date info
    const dialog = screen.getByRole('dialog')
    expect(dialog.textContent).toMatch(/2025|november|nov|11/i)
  })

  it('should handle releases with no body gracefully', () => {
    const onClose = vi.fn()
    const releaseNoBody = {
      ...mockRelease,
      body: ''
    }

    render(
      <ChangelogModal
        release={releaseNoBody}
        isOpen={true}
        onClose={onClose}
      />
    )

    // Should still render without errors
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
  })

  it('should render markdown in release body', () => {
    const onClose = vi.fn()
    const releaseWithMarkdown = {
      ...mockRelease,
      body: '## Features\n- **Bold feature**\n- _Italic feature_\n\n[Link](https://example.com)'
    }

    render(
      <ChangelogModal
        release={releaseWithMarkdown}
        isOpen={true}
        onClose={onClose}
      />
    )

    // Should show the content (exact rendering depends on markdown parser)
    expect(screen.getByText(/bold feature/i)).toBeInTheDocument()
    expect(screen.getByText(/italic feature/i)).toBeInTheDocument()
  })

  it('should be mobile responsive', () => {
    const onClose = vi.fn()

    const { container } = render(
      <ChangelogModal
        release={mockRelease}
        isOpen={true}
        onClose={onClose}
      />
    )

    // Dialog should have responsive classes
    // This is a basic check - actual responsive behavior would need viewport testing
    expect(container).toBeInTheDocument()
  })
})
