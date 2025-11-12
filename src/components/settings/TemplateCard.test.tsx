/**
 * Tests for TemplateCard component (Feature 026 - US1)
 * Component type card displaying milestone template summary
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TemplateCard } from './TemplateCard'

describe('TemplateCard', () => {
  it('renders component type and milestone count', () => {
    render(
      <TemplateCard
        componentType="Field Weld"
        milestoneCount={5}
        hasTemplates={true}
        onEdit={() => {}}
      />
    )

    expect(screen.getByText('Field Weld')).toBeInTheDocument()
    expect(screen.getByText(/5 milestones/i)).toBeInTheDocument()
  })

  it('shows Edit button when user has permission', () => {
    render(
      <TemplateCard
        componentType="Field Weld"
        milestoneCount={5}
        hasTemplates={true}
        onEdit={() => {}}
        canEdit={true}
      />
    )

    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
  })

  it('hides Edit button when user lacks permission', () => {
    render(
      <TemplateCard
        componentType="Field Weld"
        milestoneCount={5}
        hasTemplates={true}
        onEdit={() => {}}
        canEdit={false}
      />
    )

    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
  })

  it('calls onEdit when Edit button clicked', async () => {
    const user = userEvent.setup()
    const handleEdit = vi.fn()
    render(
      <TemplateCard
        componentType="Field Weld"
        milestoneCount={5}
        hasTemplates={true}
        onEdit={handleEdit}
        canEdit={true}
      />
    )

    await user.click(screen.getByRole('button', { name: /edit/i }))
    expect(handleEdit).toHaveBeenCalledTimes(1)
  })

  it('shows "No templates" state when hasTemplates is false', () => {
    render(
      <TemplateCard
        componentType="Field Weld"
        milestoneCount={0}
        hasTemplates={false}
        onEdit={() => {}}
      />
    )

    expect(screen.getByText(/no templates/i)).toBeInTheDocument()
  })

  // User Story 4 Tests: Last Modified Display

  it('displays "Last modified by" with user name and date (US4)', () => {
    render(
      <TemplateCard
        componentType="Field Weld"
        milestoneCount={5}
        hasTemplates={true}
        onEdit={() => {}}
        lastModified={{
          userName: 'John Doe',
          date: '2025-11-10T14:30:00Z',
        }}
      />
    )

    expect(screen.getByText(/last modified by john doe/i)).toBeInTheDocument()
    expect(screen.getByText(/nov 10, 2025/i)).toBeInTheDocument()
  })

  it('hides "Last modified" when no modification history exists', () => {
    render(
      <TemplateCard
        componentType="Field Weld"
        milestoneCount={5}
        hasTemplates={true}
        onEdit={() => {}}
      />
    )

    expect(screen.queryByText(/last modified/i)).not.toBeInTheDocument()
  })

  it('formats timestamp using relative time for recent changes (US4)', () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    render(
      <TemplateCard
        componentType="Field Weld"
        milestoneCount={5}
        hasTemplates={true}
        onEdit={() => {}}
        lastModified={{
          userName: 'Jane Smith',
          date: oneHourAgo,
        }}
      />
    )

    // Should show relative time like "1 hour ago"
    expect(screen.getByText(/last modified by jane smith/i)).toBeInTheDocument()
    expect(screen.getByText(/1 hour ago/i)).toBeInTheDocument()
  })

  it('handles null user gracefully when user deleted (US4)', () => {
    render(
      <TemplateCard
        componentType="Field Weld"
        milestoneCount={5}
        hasTemplates={true}
        onEdit={() => {}}
        lastModified={{
          userName: null,
          date: '2025-11-10T14:30:00Z',
        }}
      />
    )

    expect(screen.getByText(/last modified by unknown user/i)).toBeInTheDocument()
  })

  it('displays last modified info with proper accessibility labels (US4)', () => {
    render(
      <TemplateCard
        componentType="Field Weld"
        milestoneCount={5}
        hasTemplates={true}
        onEdit={() => {}}
        lastModified={{
          userName: 'John Doe',
          date: '2025-11-10T14:30:00Z',
        }}
      />
    )

    // Should have semantic time element
    const timeElement = screen.getByText(/nov 10, 2025/i)
    expect(timeElement.tagName).toBe('TIME')
  })
})
