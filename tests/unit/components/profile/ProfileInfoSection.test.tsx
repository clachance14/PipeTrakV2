import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProfileInfoSection } from '@/components/profile/ProfileInfoSection'

describe('ProfileInfoSection', () => {
  it('displays email, organization name, and role', () => {
    render(
      <ProfileInfoSection
        email="john@example.com"
        organizationName="Acme Corp"
        role="project_manager"
      />
    )

    expect(screen.getByText('john@example.com')).toBeInTheDocument()
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByText(/project manager/i)).toBeInTheDocument()
  })

  it('displays "No organization" when organizationName is null', () => {
    render(
      <ProfileInfoSection
        email="john@example.com"
        organizationName={null}
        role={null}
      />
    )

    expect(screen.getByText('john@example.com')).toBeInTheDocument()
    expect(screen.getByText('No organization')).toBeInTheDocument()
  })

  it('formats role correctly', () => {
    render(
      <ProfileInfoSection
        email="test@example.com"
        organizationName="Test Org"
        role="site_supervisor"
      />
    )

    // Should format "site_supervisor" as "Site Supervisor"
    expect(screen.getByText(/site supervisor/i)).toBeInTheDocument()
  })

  it('handles null role gracefully', () => {
    render(
      <ProfileInfoSection
        email="test@example.com"
        organizationName="Test Org"
        role={null}
      />
    )

    // Should not crash or show undefined
    expect(screen.queryByText('undefined')).not.toBeInTheDocument()
    expect(screen.queryByText('null')).not.toBeInTheDocument()
  })

  it('has proper semantic HTML for accessibility', () => {
    render(
      <ProfileInfoSection
        email="john@example.com"
        organizationName="Acme Corp"
        role="project_manager"
      />
    )

    // Check for semantic HTML elements (dl, dt, dd)
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Organization')).toBeInTheDocument()
    expect(screen.getByText('Role')).toBeInTheDocument()
  })
})
