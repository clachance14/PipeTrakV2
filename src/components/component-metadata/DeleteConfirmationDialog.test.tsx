import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog'

describe('DeleteConfirmationDialog', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    componentCount: 3,
    componentSummary: '3 Valve, 2 Fitting',
  }

  it('renders count in title', () => {
    render(<DeleteConfirmationDialog {...defaultProps} />)
    expect(screen.getByText('Delete 3 component(s)?')).toBeInTheDocument()
  })

  it('shows component summary', () => {
    render(<DeleteConfirmationDialog {...defaultProps} />)
    expect(screen.getByText('3 Valve, 2 Fitting')).toBeInTheDocument()
  })

  it('Cancel button calls onClose', () => {
    const onClose = vi.fn()
    render(<DeleteConfirmationDialog {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('Confirm button calls onConfirm with reason when provided', () => {
    const onConfirm = vi.fn()
    render(<DeleteConfirmationDialog {...defaultProps} onConfirm={onConfirm} />)
    const input = screen.getByPlaceholderText(
      /e\.g\. AI misextraction, duplicate, not needed/i
    )
    fireEvent.change(input, { target: { value: 'AI misextraction' } })
    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    expect(onConfirm).toHaveBeenCalledWith('AI misextraction')
  })

  it('Confirm button calls onConfirm with undefined when no reason provided', () => {
    const onConfirm = vi.fn()
    render(<DeleteConfirmationDialog {...defaultProps} onConfirm={onConfirm} />)
    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    expect(onConfirm).toHaveBeenCalledWith(undefined)
  })
})
