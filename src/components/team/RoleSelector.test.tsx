import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RoleSelector } from './RoleSelector'
describe('RoleSelector', () => {
  it('renders all role options', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <RoleSelector
        value="viewer"
        onChange={onChange}
        currentUserRole="owner"
      />
    )

    // Open the select
    await user.click(screen.getByRole('combobox'))

    // Check that all roles are present (may have multiple due to Radix UI rendering)
    expect(screen.getAllByText('Owner').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Admin').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Project Manager').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Foreman').length).toBeGreaterThan(0)
    expect(screen.getAllByText('QC Inspector').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Welder').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Viewer').length).toBeGreaterThan(0)
  })

  it('hides owner role for non-owners', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <RoleSelector
        value="viewer"
        onChange={onChange}
        currentUserRole="admin"
      />
    )

    // Open the select
    await user.click(screen.getByRole('combobox'))

    // Owner should not be available
    expect(screen.queryByText('Owner')).not.toBeInTheDocument()

    // Other roles should be available (may have multiple due to Radix UI)
    expect(screen.getAllByText('Admin').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Viewer').length).toBeGreaterThan(0)
  })

  it('calls onChange when role is selected', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <RoleSelector
        value="viewer"
        onChange={onChange}
        currentUserRole="owner"
      />
    )

    await user.click(screen.getByRole('combobox'))
    // Click the first Admin option in the dropdown
    const adminOptions = screen.getAllByText('Admin')
    await user.click(adminOptions[adminOptions.length - 1]) // Click the last one (in dropdown)

    expect(onChange).toHaveBeenCalledWith('admin')
  })

  it('shows role descriptions', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <RoleSelector
        value="viewer"
        onChange={onChange}
        currentUserRole="owner"
      />
    )

    await user.click(screen.getByRole('combobox'))

    // Check descriptions are present (may have multiple due to Radix UI)
    expect(screen.getAllByText(/full access including billing/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/read-only access/i).length).toBeGreaterThan(0)
  })

  it('can be disabled', () => {
    const onChange = vi.fn()

    render(
      <RoleSelector
        value="viewer"
        onChange={onChange}
        currentUserRole="owner"
        disabled={true}
      />
    )

    const select = screen.getByRole('combobox')
    expect(select).toBeDisabled()
  })
})
