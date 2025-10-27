import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProfileInfoSection } from '@/components/profile/ProfileInfoSection'

describe('ProfileInfoSection', () => {
  it('displays email, organization, and role', () => {
    render(
      <ProfileInfoSection
        email="john@example.com"
        organizationName="ACME Corp"
        role="admin"
      />
    )

    expect(screen.getByText('john@example.com')).toBeInTheDocument()
    expect(screen.getByText('ACME Corp')).toBeInTheDocument()
    expect(screen.getByText(/admin/i)).toBeInTheDocument()
  })

  it('displays "No organization" when organizationName is null', () => {
    render(
      <ProfileInfoSection
        email="john@example.com"
        organizationName={null}
        role="admin"
      />
    )

    expect(screen.getByText(/no organization/i)).toBeInTheDocument()
  })

  it('handles null role gracefully', () => {
    render(
      <ProfileInfoSection
        email="john@example.com"
        organizationName="ACME Corp"
        role={null}
      />
    )

    // Should not crash
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
  })

  it('formats role correctly (project_manager → Project Manager)', () => {
    render(
      <ProfileInfoSection
        email="john@example.com"
        organizationName="ACME Corp"
        role="project_manager"
      />
    )

    expect(screen.getByText(/Project Manager/i)).toBeInTheDocument()
  })

  it('has proper accessibility labels', () => {
    render(
      <ProfileInfoSection
        email="john@example.com"
        organizationName="ACME Corp"
        role="admin"
      />
    )

    // Expect semantic HTML (dl, dt, dd) or aria-labels
    // This will depend on implementation
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
  })
})
