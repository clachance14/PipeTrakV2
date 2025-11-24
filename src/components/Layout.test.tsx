/**
 * Contract Tests: Layout Dropdown Navigation (Feature 013)
 *
 * Contract 1: Dropdown includes "Add New Project" option that triggers navigation
 * Reference: specs/013-the-new-add/contracts/README.md Contract 1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout } from './Layout'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useProject } from '@/contexts/ProjectContext'
import { useProjects } from '@/hooks/useProjects'
import { useSidebarStore } from '@/stores/useSidebarStore'
import { useChangelog } from '@/hooks/useChangelog'

// Mock all the dependencies
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: vi.fn(),
    useLocation: vi.fn(() => ({ pathname: '/' })),
    useParams: vi.fn(() => ({})),
  }
})

vi.mock('@/contexts/AuthContext')
vi.mock('@/contexts/ProjectContext')
vi.mock('@/hooks/useProjects')
vi.mock('@/stores/useSidebarStore')
vi.mock('@/hooks/useChangelog')

// Helper to wrap component with providers
const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('Layout dropdown navigation', () => {
  const mockNavigate = vi.fn()
  const mockSetSelectedProjectId = vi.fn()
  const mockSignOut = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mocks
    vi.mocked(useNavigate).mockReturnValue(mockNavigate)
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' },
      signOut: mockSignOut,
      loading: false,
    } as any)
    vi.mocked(useProject).mockReturnValue({
      selectedProjectId: 'project-1',
      setSelectedProjectId: mockSetSelectedProjectId,
    } as any)
    vi.mocked(useProjects).mockReturnValue({
      data: [
        { id: 'project-1', name: 'Test Project', description: 'A test project', organization_id: 'org-1', created_at: '2025-01-01', updated_at: '2025-01-01' },
      ],
      isLoading: false,
    } as any)
    vi.mocked(useSidebarStore).mockReturnValue({
      isCollapsed: false,
      toggle: vi.fn(),
      setCollapsed: vi.fn(),
    } as any)
    vi.mocked(useChangelog).mockReturnValue({
      shouldShowModal: false,
      release: null,
      markAsViewed: vi.fn(),
      isLoading: false,
    } as any)
  })

  it('includes "Add New Project" option in dropdown', () => {
    renderWithProviders(
      <Layout>
        <div />
      </Layout>
    )

    const dropdown = screen.getByRole('combobox')
    expect(dropdown).toBeInTheDocument()
    expect(dropdown.innerHTML).toContain('➕ Add New Project')
  })

  it('navigates to /projects/new when "Add New Project" selected', () => {
    renderWithProviders(
      <Layout>
        <div />
      </Layout>
    )

    const dropdown = screen.getByRole('combobox')
    fireEvent.change(dropdown, { target: { value: '__new__' } })

    expect(mockNavigate).toHaveBeenCalledWith('/projects/new')
  })

  it('does not change selectedProjectId when navigating to create page', () => {
    renderWithProviders(
      <Layout>
        <div />
      </Layout>
    )

    const dropdown = screen.getByRole('combobox')
    fireEvent.change(dropdown, { target: { value: '__new__' } })

    expect(mockSetSelectedProjectId).not.toHaveBeenCalled()
  })
})

describe('Layout changelog modal', () => {
  const mockNavigate = vi.fn()
  const mockSetSelectedProjectId = vi.fn()
  const mockSignOut = vi.fn()
  const mockMarkAsViewed = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mocks
    vi.mocked(useNavigate).mockReturnValue(mockNavigate)
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com', last_viewed_release: '1.0.0' },
      signOut: mockSignOut,
      loading: false,
    } as any)
    vi.mocked(useProject).mockReturnValue({
      selectedProjectId: 'project-1',
      setSelectedProjectId: mockSetSelectedProjectId,
    } as any)
    vi.mocked(useProjects).mockReturnValue({
      data: [
        { id: 'project-1', name: 'Test Project', description: 'A test project', organization_id: 'org-1', created_at: '2025-01-01', updated_at: '2025-01-01' },
      ],
      isLoading: false,
    } as any)
    vi.mocked(useSidebarStore).mockReturnValue({
      isCollapsed: false,
      toggle: vi.fn(),
      setCollapsed: vi.fn(),
      toggleMobile: vi.fn(),
      setMobileOpen: vi.fn(),
      setHovering: vi.fn(),
      isMobileOpen: false,
      isHovering: false,
    } as any)
  })

  it('should not reopen modal after dismissal when component remounts with shouldShowModal still true', () => {
    const mockRelease = {
      tag_name: 'v1.2.0',
      name: 'Version 1.2.0',
      published_at: '2025-11-20T10:00:00Z',
      body: '## Features\n- New feature'
    }

    // Mock useChangelog to return shouldShowModal=true (simulating new release)
    vi.mocked(useChangelog).mockReturnValue({
      shouldShowModal: true,
      release: mockRelease,
      markAsViewed: mockMarkAsViewed,
      isLoading: false,
    })

    // First mount
    const { unmount } = renderWithProviders(
      <Layout>
        <div>Test Content</div>
      </Layout>
    )

    // Modal should be open initially
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText("What's New")).toBeInTheDocument()

    // Close the modal
    const closeButton = screen.getByRole('button', { name: /got it/i })
    fireEvent.click(closeButton)

    // Modal should be closed
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    // Unmount component (simulating navigation away)
    unmount()

    // Remount component (simulating navigation to new page)
    // shouldShowModal is still true because the database update hasn't propagated to AuthContext
    renderWithProviders(
      <Layout>
        <div>Test Content After Navigation</div>
      </Layout>
    )

    // Modal should NOT reopen (this is the bug - it currently reopens)
    // Because user already dismissed it in this session
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
