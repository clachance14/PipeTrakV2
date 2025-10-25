/**
 * Contract Tests: Layout Dropdown Navigation (Feature 013)
 *
 * Contract 1: Dropdown includes "Add New Project" option that triggers navigation
 * Reference: specs/013-the-new-add/contracts/README.md Contract 1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { Layout } from './Layout'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useProject } from '@/contexts/ProjectContext'
import { useProjects } from '@/hooks/useProjects'
import { useSidebarStore } from '@/stores/useSidebarStore'

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
  })

  it('includes "Add New Project" option in dropdown', () => {
    render(
      <BrowserRouter>
        <Layout>
          <div />
        </Layout>
      </BrowserRouter>
    )

    const dropdown = screen.getByRole('combobox')
    expect(dropdown).toBeInTheDocument()
    expect(dropdown.innerHTML).toContain('➕ Add New Project')
  })

  it('navigates to /projects/new when "Add New Project" selected', () => {
    render(
      <BrowserRouter>
        <Layout>
          <div />
        </Layout>
      </BrowserRouter>
    )

    const dropdown = screen.getByRole('combobox')
    fireEvent.change(dropdown, { target: { value: '__new__' } })

    expect(mockNavigate).toHaveBeenCalledWith('/projects/new')
  })

  it('does not change selectedProjectId when navigating to create page', () => {
    render(
      <BrowserRouter>
        <Layout>
          <div />
        </Layout>
      </BrowserRouter>
    )

    const dropdown = screen.getByRole('combobox')
    fireEvent.change(dropdown, { target: { value: '__new__' } })

    expect(mockSetSelectedProjectId).not.toHaveBeenCalled()
  })
})
