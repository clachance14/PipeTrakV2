import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { SettingsLayout } from './SettingsLayout'
import { usePermissions } from '@/hooks/usePermissions'

vi.mock('@/hooks/usePermissions')

describe('SettingsLayout', () => {
  beforeEach(() => {
    vi.mocked(usePermissions).mockReturnValue({
      role: 'admin',
      can_manage_project: true,
      can_manage_team: false,
      can_update_milestones: true,
      can_edit_metadata: true,
      can_view_reports: true,
    })
  })

  it('renders title and description', () => {
    render(
      <BrowserRouter>
        <SettingsLayout title="Test Settings" description="Test description">
          <div>Content</div>
        </SettingsLayout>
      </BrowserRouter>
    )

    expect(screen.getByRole('heading', { name: 'Test Settings' })).toBeInTheDocument()
    expect(screen.getByText('Test description')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('shows access denied for unauthorized users', () => {
    vi.mocked(usePermissions).mockReturnValue({
      role: 'viewer',
      can_manage_project: false,
      can_manage_team: false,
      can_update_milestones: false,
      can_edit_metadata: false,
      can_view_reports: true,
    })

    render(
      <BrowserRouter>
        <SettingsLayout title="Test Settings" description="Test description">
          <div>Content</div>
        </SettingsLayout>
      </BrowserRouter>
    )

    expect(screen.getByText('Access Denied')).toBeInTheDocument()
    expect(screen.queryByText('Content')).not.toBeInTheDocument()
  })

  it('renders breadcrumb navigation', () => {
    render(
      <BrowserRouter>
        <SettingsLayout title="Milestone Templates" description="Test description">
          <div>Content</div>
        </SettingsLayout>
      </BrowserRouter>
    )

    expect(screen.getByRole('link', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Milestone Templates' })).toBeInTheDocument()
  })
})
