import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { ComponentsBulkActions, ComponentsBulkActionsProps } from './ComponentsBulkActions'

describe('ComponentsBulkActions', () => {
  const defaultProps: ComponentsBulkActionsProps = {
    selectionMode: false,
    onToggleSelectionMode: vi.fn(),
    selectedCount: 0,
    onClearSelection: vi.fn(),
    onMarkReceived: vi.fn(),
    isProcessing: false,
  }

  it('renders selection mode toggle button', () => {
    render(<ComponentsBulkActions {...defaultProps} />)

    const toggle = screen.getByRole('button', { name: /selection off/i })
    expect(toggle).toBeInTheDocument()
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
  })

  it('renders "Selection Off" label when mode is off', () => {
    render(<ComponentsBulkActions {...defaultProps} />)

    expect(screen.getByText('Selection Off')).toBeInTheDocument()
  })

  it('shows toggle as pressed when selectionMode is true', () => {
    render(<ComponentsBulkActions {...defaultProps} selectionMode={true} />)

    const toggle = screen.getByRole('button', { name: /selection on/i })
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
  })

  it('calls onToggleSelectionMode when toggle button is clicked', async () => {
    const onToggleSelectionMode = vi.fn()
    const user = userEvent.setup()

    render(
      <ComponentsBulkActions
        {...defaultProps}
        onToggleSelectionMode={onToggleSelectionMode}
      />
    )

    const toggle = screen.getByRole('button', { name: /selection off/i })
    await user.click(toggle)

    expect(onToggleSelectionMode).toHaveBeenCalledTimes(1)
  })

  it('does not show selection count when count is 0', () => {
    render(<ComponentsBulkActions {...defaultProps} selectedCount={0} />)

    expect(screen.queryByText(/selected/)).not.toBeInTheDocument()
  })

  it('shows selection count when count is greater than 0 and selection mode is on', () => {
    render(<ComponentsBulkActions {...defaultProps} selectionMode={true} selectedCount={3} />)

    expect(screen.getByText('3 selected')).toBeInTheDocument()
  })

  it('updates selection count display when count changes', () => {
    const { rerender } = render(
      <ComponentsBulkActions {...defaultProps} selectionMode={true} selectedCount={1} />
    )

    expect(screen.getByText('1 selected')).toBeInTheDocument()

    rerender(<ComponentsBulkActions {...defaultProps} selectionMode={true} selectedCount={5} />)

    expect(screen.getByText('5 selected')).toBeInTheDocument()
  })

  it('does not show Clear button when selection mode is off', () => {
    render(
      <ComponentsBulkActions
        {...defaultProps}
        selectionMode={false}
        selectedCount={3}
      />
    )

    expect(screen.queryByText('Clear')).not.toBeInTheDocument()
  })

  it('does not show Clear button when selection mode is on but count is 0', () => {
    render(
      <ComponentsBulkActions
        {...defaultProps}
        selectionMode={true}
        selectedCount={0}
      />
    )

    expect(screen.queryByText('Clear')).not.toBeInTheDocument()
  })

  it('shows Clear button when selection mode is on and count > 0', () => {
    render(
      <ComponentsBulkActions
        {...defaultProps}
        selectionMode={true}
        selectedCount={3}
      />
    )

    expect(screen.getByText('Clear')).toBeInTheDocument()
  })

  it('calls onClearSelection when Clear button is clicked', async () => {
    const onClearSelection = vi.fn()
    const user = userEvent.setup()

    render(
      <ComponentsBulkActions
        {...defaultProps}
        selectionMode={true}
        selectedCount={3}
        onClearSelection={onClearSelection}
      />
    )

    const clearButton = screen.getByText('Clear')
    await user.click(clearButton)

    expect(onClearSelection).toHaveBeenCalledTimes(1)
  })

  it('does not show Mark Received button when selection mode is off', () => {
    render(
      <ComponentsBulkActions
        {...defaultProps}
        selectionMode={false}
        selectedCount={3}
      />
    )

    expect(screen.queryByText('Mark Received')).not.toBeInTheDocument()
  })

  it('does not show Mark Received button when selection mode is on but count is 0', () => {
    render(
      <ComponentsBulkActions
        {...defaultProps}
        selectionMode={true}
        selectedCount={0}
      />
    )

    expect(screen.queryByText('Mark Received')).not.toBeInTheDocument()
  })

  it('shows Mark Received button when selection mode is on and count > 0', () => {
    render(
      <ComponentsBulkActions
        {...defaultProps}
        selectionMode={true}
        selectedCount={3}
      />
    )

    expect(screen.getByText('Mark Received')).toBeInTheDocument()
  })

  it('calls onMarkReceived when Mark Received button is clicked', async () => {
    const onMarkReceived = vi.fn()
    const user = userEvent.setup()

    render(
      <ComponentsBulkActions
        {...defaultProps}
        selectionMode={true}
        selectedCount={3}
        onMarkReceived={onMarkReceived}
      />
    )

    const markReceivedButton = screen.getByText('Mark Received')
    await user.click(markReceivedButton)

    expect(onMarkReceived).toHaveBeenCalledTimes(1)
  })

  it('disables Mark Received button when isProcessing is true', () => {
    render(
      <ComponentsBulkActions
        {...defaultProps}
        selectionMode={true}
        selectedCount={3}
        isProcessing={true}
      />
    )

    // Button shows "Processing..." when isProcessing=true
    const markReceivedButton = screen.getByText('Processing...')
    expect(markReceivedButton).toBeDisabled()
  })

  it('does not disable Mark Received button when isProcessing is false', () => {
    render(
      <ComponentsBulkActions
        {...defaultProps}
        selectionMode={true}
        selectedCount={3}
        isProcessing={false}
      />
    )

    const markReceivedButton = screen.getByText('Mark Received')
    expect(markReceivedButton).not.toBeDisabled()
  })

  it('does not call onMarkReceived when Mark Received button is clicked while processing', async () => {
    const onMarkReceived = vi.fn()
    const user = userEvent.setup()

    render(
      <ComponentsBulkActions
        {...defaultProps}
        selectionMode={true}
        selectedCount={3}
        onMarkReceived={onMarkReceived}
        isProcessing={true}
      />
    )

    // Button shows "Processing..." when isProcessing=true
    const markReceivedButton = screen.getByText('Processing...')
    await user.click(markReceivedButton)

    expect(onMarkReceived).not.toHaveBeenCalled()
  })

  it('applies custom className when provided', () => {
    const { container } = render(
      <ComponentsBulkActions {...defaultProps} className="custom-class" />
    )

    const bulkActionsContainer = container.querySelector('.custom-class')
    expect(bulkActionsContainer).toBeInTheDocument()
  })

  it('supports keyboard navigation for toggle button', async () => {
    const onToggleSelectionMode = vi.fn()
    const user = userEvent.setup()

    render(
      <ComponentsBulkActions
        {...defaultProps}
        onToggleSelectionMode={onToggleSelectionMode}
      />
    )

    const toggle = screen.getByRole('button', { name: /selection off/i })
    toggle.focus()
    await user.keyboard(' ')

    expect(onToggleSelectionMode).toHaveBeenCalledTimes(1)
  })

  it('supports keyboard navigation for Clear button', async () => {
    const onClearSelection = vi.fn()
    const user = userEvent.setup()

    render(
      <ComponentsBulkActions
        {...defaultProps}
        selectionMode={true}
        selectedCount={3}
        onClearSelection={onClearSelection}
      />
    )

    const clearButton = screen.getByText('Clear')
    clearButton.focus()
    await user.keyboard('{Enter}')

    expect(onClearSelection).toHaveBeenCalledTimes(1)
  })

  it('supports keyboard navigation for Mark Received button', async () => {
    const onMarkReceived = vi.fn()
    const user = userEvent.setup()

    render(
      <ComponentsBulkActions
        {...defaultProps}
        selectionMode={true}
        selectedCount={3}
        onMarkReceived={onMarkReceived}
      />
    )

    const markReceivedButton = screen.getByText('Mark Received')
    markReceivedButton.focus()
    await user.keyboard('{Enter}')

    expect(onMarkReceived).toHaveBeenCalledTimes(1)
  })

  it('has correct ARIA pressed attribute for toggle button', () => {
    render(<ComponentsBulkActions {...defaultProps} />)

    const toggle = screen.getByRole('button', { name: /selection off/i })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
  })

  it('shows both Clear and Mark Received buttons together when conditions are met', () => {
    render(
      <ComponentsBulkActions
        {...defaultProps}
        selectionMode={true}
        selectedCount={5}
      />
    )

    expect(screen.getByText('Clear')).toBeInTheDocument()
    expect(screen.getByText('Mark Received')).toBeInTheDocument()
    expect(screen.getByText('5 selected')).toBeInTheDocument()
  })

  it('handles rapid toggle clicks correctly', async () => {
    const onToggleSelectionMode = vi.fn()
    const user = userEvent.setup()

    render(
      <ComponentsBulkActions
        {...defaultProps}
        onToggleSelectionMode={onToggleSelectionMode}
      />
    )

    const toggle = screen.getByRole('button', { name: /selection off/i })
    await user.click(toggle)
    await user.click(toggle)
    await user.click(toggle)

    expect(onToggleSelectionMode).toHaveBeenCalledTimes(3)
  })

  it('handles isProcessing defaulting to false when not provided', () => {
    const propsWithoutProcessing: ComponentsBulkActionsProps = {
      selectionMode: true,
      onToggleSelectionMode: vi.fn(),
      selectedCount: 3,
      onClearSelection: vi.fn(),
      onMarkReceived: vi.fn(),
      // isProcessing not provided (should default to false)
    }

    render(<ComponentsBulkActions {...propsWithoutProcessing} />)

    const markReceivedButton = screen.getByText('Mark Received')
    expect(markReceivedButton).not.toBeDisabled()
  })
})
