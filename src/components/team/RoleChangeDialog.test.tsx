/**
 * Component Test: RoleChangeDialog
 * Feature: 016-team-management-ui (User Story 4)
 *
 * Tests RoleChangeDialog component:
 * - Role selection dropdown
 * - Confirmation flow
 * - Error state display
 * - Cancel behavior
 */

import { render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { RoleChangeDialog } from './RoleChangeDialog'
import { vi } from 'vitest'
import type { Role } from '@/types/team.types'

describe('RoleChangeDialog Component', () => {
  const mockOnConfirm = vi.fn()
  const mockOnCancel = vi.fn()

  const defaultProps = {
    open: true,
    memberName: 'John Doe',
    currentRole: 'viewer' as Role,
    onConfirm: mockOnConfirm,
    onCancel: mockOnCancel,
    isLoading: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render dialog with member name in title', () => {
      render(<RoleChangeDialog {...defaultProps} />)

      expect(screen.getByText(/change role/i)).toBeInTheDocument()
      expect(screen.getByText(/john doe/i)).toBeInTheDocument()
    })

    it('should not render when open is false', () => {
      render(<RoleChangeDialog {...defaultProps} open={false} />)

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should display current role as selected option', () => {
      render(<RoleChangeDialog {...defaultProps} currentRole="admin" />)

      // The current role should be pre-selected in the dropdown
      expect(screen.getByRole('combobox')).toHaveValue('admin')
    })
  })

  describe('Role Selection', () => {
    it('should display all available roles in dropdown', async () => {
      const user = userEvent.setup()
      render(<RoleChangeDialog {...defaultProps} />)

      const roleSelector = screen.getByRole('combobox')
      await user.click(roleSelector)

      await waitFor(() => {
        expect(screen.getByText('Owner')).toBeInTheDocument()
        expect(screen.getByText('Admin')).toBeInTheDocument()
        expect(screen.getByText('Project Manager')).toBeInTheDocument()
        expect(screen.getByText('Foreman')).toBeInTheDocument()
        expect(screen.getByText('QC Inspector')).toBeInTheDocument()
        expect(screen.getByText('Welder')).toBeInTheDocument()
        expect(screen.getByText('Viewer')).toBeInTheDocument()
      })
    })

    it('should allow selecting a different role', async () => {
      const user = userEvent.setup()
      render(<RoleChangeDialog {...defaultProps} currentRole="viewer" />)

      const roleSelector = screen.getByRole('combobox')
      await user.click(roleSelector)

      const adminOption = await screen.findByText('Admin')
      await user.click(adminOption)

      // Verify the new role is selected
      expect(roleSelector).toHaveValue('admin')
    })

    it('should enable confirm button when role is changed', async () => {
      const user = userEvent.setup()
      render(<RoleChangeDialog {...defaultProps} currentRole="viewer" />)

      const confirmButton = screen.getByRole('button', { name: /confirm|update/i })

      // Should be disabled initially (no change)
      expect(confirmButton).toBeDisabled()

      // Change role
      const roleSelector = screen.getByRole('combobox')
      await user.click(roleSelector)

      const adminOption = await screen.findByText('Admin')
      await user.click(adminOption)

      // Should be enabled after change
      await waitFor(() => {
        expect(confirmButton).not.toBeDisabled()
      })
    })
  })

  describe('Confirmation Flow', () => {
    it('should call onConfirm with new role when confirmed', async () => {
      const user = userEvent.setup()
      render(<RoleChangeDialog {...defaultProps} currentRole="viewer" />)

      const roleSelector = screen.getByRole('combobox')
      await user.click(roleSelector)

      const adminOption = await screen.findByText('Admin')
      await user.click(adminOption)

      const confirmButton = screen.getByRole('button', { name: /confirm|update/i })
      await user.click(confirmButton)

      expect(mockOnConfirm).toHaveBeenCalledWith('admin')
    })

    it('should not call onConfirm if role is unchanged', async () => {
      const user = userEvent.setup()
      render(<RoleChangeDialog {...defaultProps} currentRole="admin" />)

      const confirmButton = screen.getByRole('button', { name: /confirm|update/i })

      // Button should be disabled
      expect(confirmButton).toBeDisabled()

      // Try to click (shouldn't work)
      await user.click(confirmButton)

      expect(mockOnConfirm).not.toHaveBeenCalled()
    })

    it('should show loading state during submission', () => {
      render(<RoleChangeDialog {...defaultProps} isLoading={true} />)

      const confirmButton = screen.getByRole('button', { name: /confirm|update/i })

      expect(confirmButton).toBeDisabled()
      expect(screen.getByText(/updating/i)).toBeInTheDocument()
    })
  })

  describe('Cancel Behavior', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup()
      render(<RoleChangeDialog {...defaultProps} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(mockOnCancel).toHaveBeenCalled()
    })

    it('should call onCancel when pressing ESC key', async () => {
      const user = userEvent.setup()
      render(<RoleChangeDialog {...defaultProps} />)

      await user.keyboard('{Escape}')

      expect(mockOnCancel).toHaveBeenCalled()
    })

    it('should reset role selection on cancel', async () => {
      const user = userEvent.setup()
      render(<RoleChangeDialog {...defaultProps} currentRole="viewer" />)

      // Change role
      const roleSelector = screen.getByRole('combobox')
      await user.click(roleSelector)

      const adminOption = await screen.findByText('Admin')
      await user.click(adminOption)

      // Cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(mockOnCancel).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<RoleChangeDialog {...defaultProps} />)

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
      expect(dialog).toHaveAttribute('aria-labelledby')
    })

    it('should trap focus within dialog', async () => {
      const user = userEvent.setup()
      render(<RoleChangeDialog {...defaultProps} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      const confirmButton = screen.getByRole('button', { name: /confirm|update/i })

      // Tab should cycle through focusable elements
      await user.tab()
      expect(screen.getByRole('combobox')).toHaveFocus()

      await user.tab()
      expect(confirmButton).toHaveFocus()

      await user.tab()
      expect(cancelButton).toHaveFocus()
    })

    it('should have descriptive button labels', () => {
      render(<RoleChangeDialog {...defaultProps} />)

      expect(screen.getByRole('button', { name: /confirm|update role/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })
  })

  describe('Warning Messages', () => {
    it('should display warning when changing from owner role', () => {
      render(<RoleChangeDialog {...defaultProps} currentRole="owner" />)

      expect(
        screen.getByText(/changing from owner/i)
      ).toBeInTheDocument()
    })

    it('should display warning about last owner protection', () => {
      render(<RoleChangeDialog {...defaultProps} currentRole="owner" />)

      expect(
        screen.getByText(/organization must have at least one owner/i)
      ).toBeInTheDocument()
    })
  })

  describe('Keyboard Navigation', () => {
    it('should allow navigating roles with arrow keys', async () => {
      const user = userEvent.setup()
      render(<RoleChangeDialog {...defaultProps} currentRole="viewer" />)

      const roleSelector = screen.getByRole('combobox')
      await user.click(roleSelector)

      // Navigate with arrow keys
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{Enter}')

      expect(mockOnConfirm).not.toHaveBeenCalled() // Not confirmed yet
    })

    it('should confirm on Enter when confirm button is focused', async () => {
      const user = userEvent.setup()
      render(<RoleChangeDialog {...defaultProps} currentRole="viewer" />)

      // Change role first
      const roleSelector = screen.getByRole('combobox')
      await user.click(roleSelector)

      const adminOption = await screen.findByText('Admin')
      await user.click(adminOption)

      // Focus confirm button and press Enter
      const confirmButton = screen.getByRole('button', { name: /confirm|update/i })
      confirmButton.focus()
      await user.keyboard('{Enter}')

      expect(mockOnConfirm).toHaveBeenCalledWith('admin')
    })
  })
})
