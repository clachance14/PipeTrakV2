/**
 * Contract Tests: CreateProjectPage (Feature 013)
 *
 * Contracts 2-6: Form validation, creation, error handling, cancel, loading state
 * Reference: specs/013-the-new-add/contracts/README.md Contracts 2-6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { CreateProjectPage } from './CreateProjectPage'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useProject } from '@/contexts/ProjectContext'
import { useCreateProject } from '@/hooks/useProjects'

// Mock dependencies
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: vi.fn(),
  }
})

vi.mock('@/contexts/AuthContext')
vi.mock('@/contexts/ProjectContext')
vi.mock('@/hooks/useProjects')

describe('CreateProjectPage form validation', () => {
  const mockNavigate = vi.fn()
  const mockSetSelectedProjectId = vi.fn()
  const mockMutate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useNavigate).mockReturnValue(mockNavigate)
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' },
      loading: false,
    } as any)
    vi.mocked(useProject).mockReturnValue({
      selectedProjectId: null,
      setSelectedProjectId: mockSetSelectedProjectId,
    } as any)
    vi.mocked(useCreateProject).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as any)
  })

  it('displays error when name is empty', async () => {
    const user = userEvent.setup()
    render(
      <BrowserRouter>
        <CreateProjectPage />
      </BrowserRouter>
    )

    const nameInput = screen.getByLabelText(/project name/i)
    const descInput = screen.getByLabelText(/description/i)
    const submitButton = screen.getByRole('button', { name: /create project/i })

    await user.clear(nameInput)
    await user.type(descInput, 'Valid description')
    await user.click(submitButton)

    expect(screen.getByText(/project name is required/i)).toBeInTheDocument()
  })

  it('displays error when description is empty', async () => {
    const user = userEvent.setup()
    render(
      <BrowserRouter>
        <CreateProjectPage />
      </BrowserRouter>
    )

    const nameInput = screen.getByLabelText(/project name/i)
    const descInput = screen.getByLabelText(/description/i)
    const submitButton = screen.getByRole('button', { name: /create project/i })

    await user.type(nameInput, 'Valid project name')
    await user.clear(descInput)
    await user.click(submitButton)

    expect(screen.getByText(/description is required/i)).toBeInTheDocument()
  })

  it('displays error when name is whitespace-only', async () => {
    const user = userEvent.setup()
    render(
      <BrowserRouter>
        <CreateProjectPage />
      </BrowserRouter>
    )

    const nameInput = screen.getByLabelText(/project name/i)
    const descInput = screen.getByLabelText(/description/i)
    const submitButton = screen.getByRole('button', { name: /create project/i })

    await user.type(nameInput, '   ')
    await user.type(descInput, 'Valid description')
    await user.click(submitButton)

    expect(screen.getByText(/project name is required/i)).toBeInTheDocument()
  })

  it('displays error when description is whitespace-only', async () => {
    const user = userEvent.setup()
    render(
      <BrowserRouter>
        <CreateProjectPage />
      </BrowserRouter>
    )

    const nameInput = screen.getByLabelText(/project name/i)
    const descInput = screen.getByLabelText(/description/i)
    const submitButton = screen.getByRole('button', { name: /create project/i })

    await user.type(nameInput, 'Valid project name')
    await user.type(descInput, '   ')
    await user.click(submitButton)

    expect(screen.getByText(/description is required/i)).toBeInTheDocument()
  })
})

describe('CreateProjectPage successful creation', () => {
  const mockNavigate = vi.fn()
  const mockSetSelectedProjectId = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useNavigate).mockReturnValue(mockNavigate)
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' },
      loading: false,
    } as any)
    vi.mocked(useProject).mockReturnValue({
      selectedProjectId: null,
      setSelectedProjectId: mockSetSelectedProjectId,
    } as any)
  })

  it('creates project, auto-selects, and navigates on success', async () => {
    const user = userEvent.setup()
    const mockMutate = vi.fn((data: any, { onSuccess }: any) => {
      const newProject = { id: 'new-project-id', name: data.name, description: data.description }
      onSuccess(newProject)
    })

    vi.mocked(useCreateProject).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as any)

    render(
      <BrowserRouter>
        <CreateProjectPage />
      </BrowserRouter>
    )

    await user.type(screen.getByLabelText(/project name/i), 'New Construction Project')
    await user.type(screen.getByLabelText(/description/i), 'Downtown pipeline installation')
    await user.click(screen.getByRole('button', { name: /create project/i }))

    expect(mockMutate).toHaveBeenCalledWith(
      { name: 'New Construction Project', description: 'Downtown pipeline installation' },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
    expect(mockSetSelectedProjectId).toHaveBeenCalledWith('new-project-id')
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })
})

describe('CreateProjectPage failed creation', () => {
  const mockNavigate = vi.fn()
  const mockSetSelectedProjectId = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useNavigate).mockReturnValue(mockNavigate)
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' },
      loading: false,
    } as any)
    vi.mocked(useProject).mockReturnValue({
      selectedProjectId: null,
      setSelectedProjectId: mockSetSelectedProjectId,
    } as any)
  })

  it('shows error toast and stays on page when creation fails', async () => {
    const user = userEvent.setup()
    const mockMutate = vi.fn((data: any, { onError }: any) => {
      onError(new Error('Network error'))
    })

    vi.mocked(useCreateProject).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as any)

    render(
      <BrowserRouter>
        <CreateProjectPage />
      </BrowserRouter>
    )

    await user.type(screen.getByLabelText(/project name/i), 'Test Project')
    await user.type(screen.getByLabelText(/description/i), 'Test Description')
    await user.click(screen.getByRole('button', { name: /create project/i }))

    // Toast error should be displayed (we'll check for the error message in the DOM)
    expect(await screen.findByText(/failed to create project.*network error/i)).toBeInTheDocument()
    expect(mockSetSelectedProjectId).not.toHaveBeenCalled()
    expect(mockNavigate).not.toHaveBeenCalled()
    expect(screen.getByLabelText(/project name/i)).toHaveValue('Test Project')
  })
})

describe('CreateProjectPage cancel', () => {
  const mockNavigate = vi.fn()
  const mockMutate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useNavigate).mockReturnValue(mockNavigate)
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' },
      loading: false,
    } as any)
    vi.mocked(useProject).mockReturnValue({
      selectedProjectId: null,
      setSelectedProjectId: vi.fn(),
    } as any)
    vi.mocked(useCreateProject).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as any)
  })

  it('navigates to home without creating project', async () => {
    const user = userEvent.setup()
    render(
      <BrowserRouter>
        <CreateProjectPage />
      </BrowserRouter>
    )

    await user.type(screen.getByLabelText(/project name/i), 'Partial data')
    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(mockMutate).not.toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })
})

describe('CreateProjectPage loading state', () => {
  const mockNavigate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useNavigate).mockReturnValue(mockNavigate)
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' },
      loading: false,
    } as any)
    vi.mocked(useProject).mockReturnValue({
      selectedProjectId: null,
      setSelectedProjectId: vi.fn(),
    } as any)
  })

  it('disables submit button while mutation is pending', () => {
    vi.mocked(useCreateProject).mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
    } as any)

    render(
      <BrowserRouter>
        <CreateProjectPage />
      </BrowserRouter>
    )

    const submitButton = screen.getByRole('button', { name: /create project/i })
    expect(submitButton).toBeDisabled()
  })
})
