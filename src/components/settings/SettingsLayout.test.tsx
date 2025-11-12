import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { SettingsLayout } from './SettingsLayout'
import { usePermissions } from '@/hooks/usePermissions'

vi.mock('@/hooks/usePermissions')
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ projectId: 'test-project-id' }),
  }
})

describe('SettingsLayout', () => {
  beforeEach(() => {
    vi.mocked(usePermissions).mockReturnValue({
      role: 'admin',
      canManageProject: true,
      canManageTeam: false,
      canUpdateMilestones: true,
      canManageWelders: false,
      canViewDashboards: true,
      canImportWeldLog: false,
      canResolveReviews: false,
      hasPermission: vi.fn(),
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
      canManageProject: false,
      canManageTeam: false,
      canUpdateMilestones: false,
      canManageWelders: false,
      canViewDashboards: true,
      canImportWeldLog: false,
      canResolveReviews: false,
      hasPermission: vi.fn(),
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
        <SettingsLayout title="Rules of Credit" description="Test description">
          <div>Content</div>
        </SettingsLayout>
      </BrowserRouter>
    )

    expect(screen.getByRole('link', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Rules of Credit' })).toBeInTheDocument()
  })
})
