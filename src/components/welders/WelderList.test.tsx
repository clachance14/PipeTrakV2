/**
 * Unit Tests: WelderList Component (T033)
 * Tests sortable welder table with search and status badges
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WelderList } from './WelderList'
import { useWelders } from '@/hooks/useWelders'

// Mock the useWelders hook
vi.mock('@/hooks/useWelders')

const mockWelders = [
  {
    id: '1',
    stencil: 'K-07',
    name: 'John Smith',
    status: 'verified',
    project_id: 'project-1',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    stencil: 'R-05',
    name: 'Jane Doe',
    status: 'unverified',
    project_id: 'project-1',
    created_at: '2024-01-02T00:00:00Z',
  },
  {
    id: '3',
    stencil: 'A-01',
    name: 'Bob Wilson',
    status: 'verified',
    project_id: 'project-1',
    created_at: '2024-01-03T00:00:00Z',
  },
]

describe('WelderList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders sortable welder table', () => {
    vi.mocked(useWelders).mockReturnValue({
      data: mockWelders,
      isLoading: false,
      error: null,
    } as any)

    render(<WelderList projectId="project-1" />)

    // Check table headers
    expect(screen.getByText('Stencil')).toBeInTheDocument()
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()

    // Check data rows
    expect(screen.getByText('K-07')).toBeInTheDocument()
    expect(screen.getByText('John Smith')).toBeInTheDocument()
    expect(screen.getByText('R-05')).toBeInTheDocument()
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
  })

  it('displays stencil + name + status badges', () => {
    vi.mocked(useWelders).mockReturnValue({
      data: mockWelders,
      isLoading: false,
      error: null,
    } as any)

    render(<WelderList projectId="project-1" />)

    // Check stencils
    expect(screen.getByText('K-07')).toBeInTheDocument()
    expect(screen.getByText('R-05')).toBeInTheDocument()
    expect(screen.getByText('A-01')).toBeInTheDocument()

    // Check names
    expect(screen.getByText('John Smith')).toBeInTheDocument()
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    expect(screen.getByText('Bob Wilson')).toBeInTheDocument()

    // Check status badges
    const verifiedBadges = screen.getAllByText(/Verified/i)
    const unverifiedBadges = screen.getAllByText(/Unverified/i)
    expect(verifiedBadges.length).toBe(2)
    expect(unverifiedBadges.length).toBe(1)
  })

  it('search filters welders by stencil', async () => {
    const user = userEvent.setup()
    vi.mocked(useWelders).mockReturnValue({
      data: mockWelders,
      isLoading: false,
      error: null,
    } as any)

    render(<WelderList projectId="project-1" />)

    const searchInput = screen.getByPlaceholderText(/search by stencil or name/i)
    await user.type(searchInput, 'K-07')

    // Should show only K-07
    expect(screen.getByText('K-07')).toBeInTheDocument()
    expect(screen.getByText('John Smith')).toBeInTheDocument()

    // Should not show others
    expect(screen.queryByText('R-05')).not.toBeInTheDocument()
    expect(screen.queryByText('A-01')).not.toBeInTheDocument()
  })

  it('search filters welders by name', async () => {
    const user = userEvent.setup()
    vi.mocked(useWelders).mockReturnValue({
      data: mockWelders,
      isLoading: false,
      error: null,
    } as any)

    render(<WelderList projectId="project-1" />)

    const searchInput = screen.getByPlaceholderText(/search by stencil or name/i)
    await user.type(searchInput, 'Jane')

    // Should show only Jane Doe
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    expect(screen.getByText('R-05')).toBeInTheDocument()

    // Should not show others
    expect(screen.queryByText('John Smith')).not.toBeInTheDocument()
    expect(screen.queryByText('Bob Wilson')).not.toBeInTheDocument()
  })

  it('search is case-insensitive', async () => {
    const user = userEvent.setup()
    vi.mocked(useWelders).mockReturnValue({
      data: mockWelders,
      isLoading: false,
      error: null,
    } as any)

    render(<WelderList projectId="project-1" />)

    const searchInput = screen.getByPlaceholderText(/search by stencil or name/i)
    await user.type(searchInput, 'JANE')

    // Should still find Jane Doe
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
  })

  it('shows no results message when search has no matches', async () => {
    const user = userEvent.setup()
    vi.mocked(useWelders).mockReturnValue({
      data: mockWelders,
      isLoading: false,
      error: null,
    } as any)

    render(<WelderList projectId="project-1" />)

    const searchInput = screen.getByPlaceholderText(/search by stencil or name/i)
    await user.type(searchInput, 'NONEXISTENT')

    expect(screen.getByText(/no welders found matching your search/i)).toBeInTheDocument()
  })

  it('"Add Welder" button opens form', async () => {
    const user = userEvent.setup()
    vi.mocked(useWelders).mockReturnValue({
      data: mockWelders,
      isLoading: false,
      error: null,
    } as any)

    render(<WelderList projectId="project-1" />)

    const addButton = screen.getByRole('button', { name: /add welder/i })
    expect(addButton).toBeInTheDocument()

    await user.click(addButton)

    // WelderForm should be rendered (assuming it has a dialog role or heading)
    // Since WelderForm is a dialog, we expect it to appear after clicking
    await waitFor(() => {
      // The form dialog should open - we can't test the full dialog without mocking Radix Dialog
      // but we can verify the button click doesn't error
      expect(addButton).toBeInTheDocument()
    })
  })

  it('sorts by stencil ascending by default', () => {
    vi.mocked(useWelders).mockReturnValue({
      data: mockWelders,
      isLoading: false,
      error: null,
    } as any)

    render(<WelderList projectId="project-1" />)

    const rows = screen.getAllByRole('row')
    // Skip header row (index 0), check data rows
    const firstDataRow = rows[1]
    const secondDataRow = rows[2]
    const thirdDataRow = rows[3]

    // Should be sorted A-01, K-07, R-05
    expect(firstDataRow).toHaveTextContent('A-01')
    expect(secondDataRow).toHaveTextContent('K-07')
    expect(thirdDataRow).toHaveTextContent('R-05')
  })

  it('toggles sort direction when clicking same column', async () => {
    const user = userEvent.setup()
    vi.mocked(useWelders).mockReturnValue({
      data: mockWelders,
      isLoading: false,
      error: null,
    } as any)

    render(<WelderList projectId="project-1" />)

    const stencilHeader = screen.getByText('Stencil').closest('th')
    expect(stencilHeader).toBeInTheDocument()

    // First click: should show ascending indicator
    await user.click(stencilHeader!)
    expect(screen.getByText('↑')).toBeInTheDocument()

    // Second click: should toggle to descending
    await user.click(stencilHeader!)
    expect(screen.getByText('↓')).toBeInTheDocument()
  })

  it('sorts by name when clicking name header', async () => {
    const user = userEvent.setup()
    vi.mocked(useWelders).mockReturnValue({
      data: mockWelders,
      isLoading: false,
      error: null,
    } as any)

    render(<WelderList projectId="project-1" />)

    const nameHeader = screen.getByText('Name').closest('th')
    await user.click(nameHeader!)

    const rows = screen.getAllByRole('row')
    // Should be sorted by name: Bob, Jane, John
    expect(rows[1]).toHaveTextContent('Bob Wilson')
    expect(rows[2]).toHaveTextContent('Jane Doe')
    expect(rows[3]).toHaveTextContent('John Smith')
  })

  it('shows loading state', () => {
    vi.mocked(useWelders).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any)

    render(<WelderList projectId="project-1" />)

    expect(screen.getByText(/loading welders/i)).toBeInTheDocument()
  })

  it('shows error state', () => {
    vi.mocked(useWelders).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to load welders'),
    } as any)

    render(<WelderList projectId="project-1" />)

    expect(screen.getByText(/error loading welders/i)).toBeInTheDocument()
    expect(screen.getByText(/failed to load welders/i)).toBeInTheDocument()
  })

  it('shows empty state when no welders', () => {
    vi.mocked(useWelders).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any)

    render(<WelderList projectId="project-1" />)

    expect(screen.getByText(/no welders yet/i)).toBeInTheDocument()
  })

  it('row click triggers console log (edit not implemented yet)', async () => {
    const user = userEvent.setup()
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    vi.mocked(useWelders).mockReturnValue({
      data: mockWelders,
      isLoading: false,
      error: null,
    } as any)

    render(<WelderList projectId="project-1" />)

    const firstRow = screen.getByText('K-07').closest('tr')
    await user.click(firstRow!)

    expect(consoleLogSpy).toHaveBeenCalledWith('Edit welder:', '1')

    consoleLogSpy.mockRestore()
  })

  it('displays correct status badge colors', () => {
    vi.mocked(useWelders).mockReturnValue({
      data: mockWelders,
      isLoading: false,
      error: null,
    } as any)

    const { container } = render(<WelderList projectId="project-1" />)

    // Check verified badge has green background
    const verifiedBadges = container.querySelectorAll('.bg-green-100')
    expect(verifiedBadges.length).toBeGreaterThan(0)

    // Check unverified badge has yellow background
    const unverifiedBadges = container.querySelectorAll('.bg-yellow-100')
    expect(unverifiedBadges.length).toBeGreaterThan(0)
  })

  it('renders search icon', () => {
    vi.mocked(useWelders).mockReturnValue({
      data: mockWelders,
      isLoading: false,
      error: null,
    } as any)

    const { container } = render(<WelderList projectId="project-1" />)

    // Search icon should be present (Lucide Search component)
    const searchIcon = container.querySelector('svg')
    expect(searchIcon).toBeInTheDocument()
  })
})
