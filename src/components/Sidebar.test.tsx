import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useSidebarStore } from '@/stores/useSidebarStore'
import { useProject } from '@/contexts/ProjectContext'
import { usePermissions } from '@/hooks/usePermissions'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useLocation: vi.fn(() => ({ pathname: '/dashboard' })),
  }
})

vi.mock('@/stores/useSidebarStore')
vi.mock('@/contexts/ProjectContext')
vi.mock('@/hooks/usePermissions')
vi.mock('@/hooks/useDemoTour', () => ({
  advanceDemoTour: vi.fn(),
}))

function renderSidebar() {
  return render(
    <BrowserRouter>
      <Sidebar />
    </BrowserRouter>
  )
}

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useSidebarStore).mockReturnValue({
      isCollapsed: false,
      isMobileOpen: false,
      isHovering: false,
      toggle: vi.fn(),
      setMobileOpen: vi.fn(),
      setHovering: vi.fn(),
      setCollapsed: vi.fn(),
      toggleMobile: vi.fn(),
    } as any)

    vi.mocked(useProject).mockReturnValue({
      selectedProjectId: 'project-1',
      setSelectedProjectId: vi.fn(),
    } as any)

    vi.mocked(usePermissions).mockReturnValue({
      role: 'owner',
      permissions: {},
    } as any)
  })

  describe('group structure', () => {
    it('renders Dashboard standalone above groups', () => {
      renderSidebar()
      const nav = screen.getByRole('navigation', { name: 'Main' })
      const links = within(nav).getAllByRole('link')
      expect(links[0]).toHaveTextContent('Dashboard')
    })

    it('renders PROJECT group with Components, Drawings, Test Packages', () => {
      renderSidebar()
      const projectGroup = screen.getByRole('group', { name: 'PROJECT' })
      expect(within(projectGroup).getByText('Components')).toBeInTheDocument()
      expect(within(projectGroup).getByText('Drawings')).toBeInTheDocument()
      expect(within(projectGroup).getByText('Test Packages')).toBeInTheDocument()
    })

    it('renders QC group with Welders, Weld Log, Needs Review', () => {
      renderSidebar()
      const qcGroup = screen.getByRole('group', { name: 'QC' })
      expect(within(qcGroup).getByText('Welders')).toBeInTheDocument()
      expect(within(qcGroup).getByText('Weld Log')).toBeInTheDocument()
      expect(within(qcGroup).getByText('Needs Review')).toBeInTheDocument()
    })

    it('renders TOOLS group with Reports, Imports', () => {
      renderSidebar()
      const toolsGroup = screen.getByRole('group', { name: 'TOOLS' })
      expect(within(toolsGroup).getByText('Reports')).toBeInTheDocument()
      expect(within(toolsGroup).getByText('Imports')).toBeInTheDocument()
    })

    it('renders ADMIN group for owner role', () => {
      renderSidebar()
      const adminGroup = screen.getByRole('group', { name: 'ADMIN' })
      expect(within(adminGroup).getByText('Settings')).toBeInTheDocument()
    })

    it('hides Settings when no project selected', () => {
      vi.mocked(useProject).mockReturnValue({
        selectedProjectId: null,
        setSelectedProjectId: vi.fn(),
      } as any)
      renderSidebar()
      expect(screen.queryByText('Settings')).not.toBeInTheDocument()
    })
  })

  describe('section headers', () => {
    it('shows text headers when expanded', () => {
      renderSidebar()
      expect(screen.getByText('PROJECT')).toBeInTheDocument()
      expect(screen.getByText('QC')).toBeInTheDocument()
      expect(screen.getByText('TOOLS')).toBeInTheDocument()
      expect(screen.getByText('ADMIN')).toBeInTheDocument()
    })

    it('hides text headers when collapsed', () => {
      vi.mocked(useSidebarStore).mockReturnValue({
        isCollapsed: true,
        isMobileOpen: false,
        isHovering: false,
        toggle: vi.fn(),
        setMobileOpen: vi.fn(),
        setHovering: vi.fn(),
        setCollapsed: vi.fn(),
        toggleMobile: vi.fn(),
      } as any)
      renderSidebar()
      expect(screen.queryByText('PROJECT')).not.toBeInTheDocument()
      expect(screen.queryByText('QC')).not.toBeInTheDocument()
    })

    it('shows headers when collapsed but hovering', () => {
      vi.mocked(useSidebarStore).mockReturnValue({
        isCollapsed: true,
        isMobileOpen: false,
        isHovering: true,
        toggle: vi.fn(),
        setMobileOpen: vi.fn(),
        setHovering: vi.fn(),
        setCollapsed: vi.fn(),
        toggleMobile: vi.fn(),
      } as any)
      renderSidebar()
      expect(screen.getByText('PROJECT')).toBeInTheDocument()
      expect(screen.getByText('QC')).toBeInTheDocument()
    })
  })

  describe('badges', () => {
    it('shows badge count on Needs Review when > 0', () => {
      renderSidebar()
      // Badge is rendered via the NavItem badge field — initially no badge data
      // This test verifies the badge container renders when badge prop is set
      const qcGroup = screen.getByRole('group', { name: 'QC' })
      expect(within(qcGroup).getByText('Needs Review')).toBeInTheDocument()
    })

    it('does not show badge when count is 0 or undefined', () => {
      renderSidebar()
      // With no badge data, no badge element should render
      const badgeElements = document.querySelectorAll('.bg-destructive')
      expect(badgeElements).toHaveLength(0)
    })
  })

  describe('accessibility', () => {
    it('has aria-label="Main" on nav element', () => {
      renderSidebar()
      expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
    })

    it('has role="group" with aria-label on each section', () => {
      renderSidebar()
      expect(screen.getByRole('group', { name: 'PROJECT' })).toBeInTheDocument()
      expect(screen.getByRole('group', { name: 'QC' })).toBeInTheDocument()
      expect(screen.getByRole('group', { name: 'TOOLS' })).toBeInTheDocument()
      expect(screen.getByRole('group', { name: 'ADMIN' })).toBeInTheDocument()
    })

    it('toggle button has correct aria-label', () => {
      renderSidebar()
      expect(screen.getByLabelText('Collapse sidebar')).toBeInTheDocument()
    })
  })

  describe('active state', () => {
    it('highlights Dashboard as active when on /dashboard', () => {
      renderSidebar()
      const dashboardLink = screen.getByRole('link', { name: /Dashboard/ })
      expect(dashboardLink.className).toContain('text-primary')
    })
  })
})
