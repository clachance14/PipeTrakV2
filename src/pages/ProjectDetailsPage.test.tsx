/**
 * Tests for ProjectDetailsPage component
 * Renders project details form with edit and archive capabilities
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ProjectDetailsPage } from './ProjectDetailsPage'
import { usePermissions } from '@/hooks/usePermissions'
import { supabase } from '@/lib/supabase'
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/hooks/usePermissions')
vi.mock('@/lib/supabase')
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ projectId: 'test-project-id' }),
    useNavigate: () => vi.fn(),
  }
})

describe('ProjectDetailsPage', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    vi.mocked(usePermissions).mockReturnValue({
      role: 'admin',
      can_manage_project: true,
      can_manage_team: false,
      can_update_milestones: true,
      can_edit_metadata: true,
      can_view_reports: true,
    })

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'test-project-id',
              name: 'Test Project',
              description: 'Test description',
            },
            error: null,
          }),
        }),
      }),
    } as any)
  })

  it('renders project details form', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ProjectDetailsPage />
        </BrowserRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByLabelText(/project name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    })
  })

  it('renders danger zone', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ProjectDetailsPage />
        </BrowserRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Danger Zone')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /archive project/i })).toBeInTheDocument()
    })
  })

  it('populates form with project data', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ProjectDetailsPage />
        </BrowserRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      const nameInput = screen.getByLabelText(/project name/i) as HTMLInputElement
      const descInput = screen.getByLabelText(/description/i) as HTMLTextAreaElement

      expect(nameInput.value).toBe('Test Project')
      expect(descInput.value).toBe('Test description')
    })
  })

  it('disables save button when form is pristine', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ProjectDetailsPage />
        </BrowserRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      const saveButton = screen.getByRole('button', { name: /save changes/i })
      expect(saveButton).toBeDisabled()
    })
  })

  it('enables save button when form is dirty', async () => {
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ProjectDetailsPage />
        </BrowserRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByLabelText(/project name/i)).toBeInTheDocument()
    })

    const nameInput = screen.getByLabelText(/project name/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'Updated Name')

    const saveButton = screen.getByRole('button', { name: /save changes/i })
    expect(saveButton).toBeEnabled()
  })

  it('shows character counter for name', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ProjectDetailsPage />
        </BrowserRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('12/100 characters')).toBeInTheDocument()
    })
  })

  it('shows character counter for description', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ProjectDetailsPage />
        </BrowserRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('16/500 characters')).toBeInTheDocument()
    })
  })

  it('shows archive confirmation dialog when archive clicked', async () => {
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ProjectDetailsPage />
        </BrowserRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /archive project/i })).toBeInTheDocument()
    })

    const archiveButton = screen.getAllByRole('button', { name: /archive project/i })[0]
    await user.click(archiveButton)

    expect(screen.getByText('Archive Project?')).toBeInTheDocument()
  })

  it('renders basic information section', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ProjectDetailsPage />
        </BrowserRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Basic Information')).toBeInTheDocument()
    })
  })
})
