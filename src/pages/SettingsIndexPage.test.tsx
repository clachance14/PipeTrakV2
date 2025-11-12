import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { SettingsIndexPage } from './SettingsIndexPage'
import { usePermissions } from '@/hooks/usePermissions'

vi.mock('@/hooks/usePermissions')
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ projectId: 'test-project-id' }),
  }
})

describe('SettingsIndexPage', () => {
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

  it('renders all three settings cards', () => {
    render(
      <BrowserRouter>
        <SettingsIndexPage />
      </BrowserRouter>
    )

    expect(screen.getByText('Rules of Credit')).toBeInTheDocument()
    expect(screen.getByText('Metadata Management')).toBeInTheDocument()
    expect(screen.getByText('Project Details')).toBeInTheDocument()
  })

  it('renders manage buttons for each card', () => {
    render(
      <BrowserRouter>
        <SettingsIndexPage />
      </BrowserRouter>
    )

    const buttons = screen.getAllByRole('link', { name: /manage/i })
    expect(buttons).toHaveLength(3)
  })

  it('links to correct subsections', () => {
    render(
      <BrowserRouter>
        <SettingsIndexPage />
      </BrowserRouter>
    )

    expect(screen.getByRole('link', { name: /milestone templates/i }))
      .toHaveAttribute('href', '/projects/test-project-id/settings/milestones')

    expect(screen.getByRole('link', { name: /metadata management/i }))
      .toHaveAttribute('href', '/projects/test-project-id/settings/metadata')

    expect(screen.getByRole('link', { name: /project details/i }))
      .toHaveAttribute('href', '/projects/test-project-id/settings/project')
  })
})
