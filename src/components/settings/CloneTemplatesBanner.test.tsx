/**
 * Tests for CloneTemplatesBanner component (Feature 026 - US1)
 * Banner prompting users to clone system templates for existing projects
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CloneTemplatesBanner } from './CloneTemplatesBanner'

describe('CloneTemplatesBanner', () => {
  it('renders prompt message', () => {
    render(<CloneTemplatesBanner onClone={() => {}} isCloning={false} />)

    expect(screen.getByText(/clone templates to get started/i)).toBeInTheDocument()
  })

  it('shows Clone Templates button', () => {
    render(<CloneTemplatesBanner onClone={() => {}} isCloning={false} />)

    expect(screen.getByRole('button', { name: /clone templates/i })).toBeInTheDocument()
  })

  it('calls onClone when button clicked', async () => {
    const user = userEvent.setup()
    const handleClone = vi.fn()
    render(<CloneTemplatesBanner onClone={handleClone} isCloning={false} />)

    await user.click(screen.getByRole('button', { name: /clone templates/i }))
    expect(handleClone).toHaveBeenCalledTimes(1)
  })

  it('disables button and shows loading state when isCloning is true', () => {
    render(<CloneTemplatesBanner onClone={() => {}} isCloning={true} />)

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveTextContent('Cloning...')
  })

  it('explains what cloning templates does', () => {
    render(<CloneTemplatesBanner onClone={() => {}} isCloning={false} />)

    // Should have some descriptive text explaining the action
    expect(screen.getByText(/milestone weight/i)).toBeInTheDocument()
  })
})
