import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SortableColumnHeader } from './SortableColumnHeader'

describe('SortableColumnHeader', () => {
  it('renders with custom field type', () => {
    const onSort = vi.fn()

    // Test with a type that's NOT from drawing-table.types to verify generics work
    type CustomField = 'identity_key' | 'drawing' | 'area'
    const field: CustomField = 'identity_key'

    render(
      <SortableColumnHeader<CustomField>
        label="Test Column"
        field={field}
        currentSortField={field}
        currentSortDirection="asc"
        onSort={onSort}
      />
    )

    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('calls onSort with correct field when clicked', async () => {
    const user = userEvent.setup()
    const onSort = vi.fn()

    render(
      <SortableColumnHeader
        label="Test Column"
        field="custom_field"
        currentSortField="other_field"
        currentSortDirection="asc"
        onSort={onSort}
      />
    )

    await user.click(screen.getByRole('button'))

    expect(onSort).toHaveBeenCalledWith('custom_field', 'asc')
  })

  it('toggles from ascending to descending', async () => {
    const user = userEvent.setup()
    const onSort = vi.fn()

    render(
      <SortableColumnHeader
        label="Test Column"
        field="custom_field"
        currentSortField="custom_field"
        currentSortDirection="asc"
        onSort={onSort}
      />
    )

    await user.click(screen.getByRole('button'))

    expect(onSort).toHaveBeenCalledWith('custom_field', 'desc')
  })

  it('shows correct sort icon for ascending', () => {
    const onSort = vi.fn()

    render(
      <SortableColumnHeader
        label="Test Column"
        field="custom_field"
        currentSortField="custom_field"
        currentSortDirection="asc"
        onSort={onSort}
      />
    )

    const button = screen.getByRole('button')
    expect(button).toHaveTextContent('Test Column')
    expect(button.querySelector('span[aria-hidden="true"]')).toBeInTheDocument()
  })

  it('shows correct sort icon for descending', () => {
    const onSort = vi.fn()

    render(
      <SortableColumnHeader
        label="Test Column"
        field="custom_field"
        currentSortField="custom_field"
        currentSortDirection="desc"
        onSort={onSort}
      />
    )

    const button = screen.getByRole('button')
    expect(button).toHaveTextContent('Test Column')
    expect(button.querySelector('span[aria-hidden="true"]')).toBeInTheDocument()
  })

  it('supports keyboard navigation with Enter', async () => {
    const user = userEvent.setup()
    const onSort = vi.fn()

    render(
      <SortableColumnHeader
        label="Test Column"
        field="custom_field"
        currentSortField="other_field"
        currentSortDirection="asc"
        onSort={onSort}
      />
    )

    const button = screen.getByRole('button')
    button.focus()
    await user.keyboard('{Enter}')

    expect(onSort).toHaveBeenCalledWith('custom_field', 'asc')
  })

  it('supports keyboard navigation with Space', async () => {
    const user = userEvent.setup()
    const onSort = vi.fn()

    render(
      <SortableColumnHeader
        label="Test Column"
        field="custom_field"
        currentSortField="other_field"
        currentSortDirection="asc"
        onSort={onSort}
      />
    )

    const button = screen.getByRole('button')
    button.focus()
    await user.keyboard(' ')

    expect(onSort).toHaveBeenCalledWith('custom_field', 'asc')
  })
})
