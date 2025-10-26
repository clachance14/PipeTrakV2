import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'
import { InlineWelderAssignment } from './InlineWelderAssignment'
import * as useWeldersModule from '@/hooks/useWelders'

// Mock the useWelders hook
vi.mock('@/hooks/useWelders')

const mockWelders = [
  {
    id: 'welder-1',
    stencil: 'ABC123',
    name: 'John Smith',
    status: 'verified' as const,
    project_id: 'project-1',
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
  },
  {
    id: 'welder-2',
    stencil: 'XYZ789',
    name: 'Jane Doe',
    status: 'unverified' as const,
    project_id: 'project-1',
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
  },
]

describe('InlineWelderAssignment', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })

    // Default mock: return welders successfully
    vi.mocked(useWeldersModule.useWelders).mockReturnValue({
      data: mockWelders,
      isLoading: false,
      isError: false,
      error: null,
    } as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  const renderComponent = (props: {
    projectId?: string
    onConfirm?: (welderId: string, dateWelded: string) => void
    onCancel?: () => void
  } = {}) => {
    const defaultProps = {
      projectId: 'project-1',
      onConfirm: vi.fn(),
      onCancel: vi.fn(),
      ...props,
    }

    return render(
      <QueryClientProvider client={queryClient}>
        <InlineWelderAssignment {...defaultProps} />
      </QueryClientProvider>
    )
  }

  it('renders welder dropdown, date display, and action buttons', () => {
    renderComponent()

    expect(screen.getByText('Welder:')).toBeInTheDocument()
    expect(screen.getByLabelText('Select welder')).toBeInTheDocument()
    expect(screen.getByText('Date Welded:')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument()
  })

  it('displays today\'s date in read-only format', () => {
    renderComponent()

    // Check that Date Welded label exists
    expect(screen.getByText('Date Welded:')).toBeInTheDocument()

    // Check that a date in MM/DD/YYYY format is displayed
    const datePattern = /\d{2}\/\d{2}\/\d{4}/
    const dateElement = screen.getByText(datePattern)
    expect(dateElement).toBeInTheDocument()
  })

  it('shows loading state when welders are loading', () => {
    vi.mocked(useWeldersModule.useWelders).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as any)

    renderComponent()

    expect(screen.getByText('Loading welders...')).toBeInTheDocument()
  })

  it('disables confirm button when no welder is selected', () => {
    renderComponent()

    const confirmButton = screen.getByRole('button', { name: /confirm/i })
    expect(confirmButton).toBeDisabled()
  })

  it('enables confirm button after selecting a welder', async () => {
    const user = userEvent.setup()
    renderComponent()

    const confirmButton = screen.getByRole('button', { name: /confirm/i })
    expect(confirmButton).toBeDisabled()

    // Open dropdown and select welder
    const selectTrigger = screen.getByLabelText('Select welder')
    await user.click(selectTrigger)

    const welderOption = await screen.findByText(/ABC123/)
    await user.click(welderOption)

    await waitFor(() => {
      expect(confirmButton).toBeEnabled()
    })
  })

  it('calls onConfirm with welder ID and today\'s date when confirmed', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    renderComponent({ onConfirm })

    // Select welder
    const selectTrigger = screen.getByLabelText('Select welder')
    await user.click(selectTrigger)
    const welderOption = await screen.findByText(/ABC123/)
    await user.click(welderOption)

    // Confirm
    const confirmButton = screen.getByRole('button', { name: /confirm/i })
    await user.click(confirmButton)

    const today = new Date().toISOString().split('T')[0]
    expect(onConfirm).toHaveBeenCalledWith('welder-1', today)
  })

  it('shows validation error toast when confirming without selecting welder', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    renderComponent({ onConfirm })

    const confirmButton = screen.getByRole('button', { name: /confirm/i })

    // Try to confirm without selecting welder (button is disabled, but test the logic)
    // We need to enable it temporarily to test validation
    confirmButton.removeAttribute('disabled')
    await user.click(confirmButton)

    // onConfirm should not be called
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    renderComponent({ onCancel })

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('displays welders sorted by stencil', async () => {
    const user = userEvent.setup()
    renderComponent()

    const selectTrigger = screen.getByLabelText('Select welder')
    await user.click(selectTrigger)

    const options = await screen.findAllByRole('option')
    // First option should be ABC123 (comes before XYZ789)
    expect(options[0]).toHaveTextContent('ABC123')
    expect(options[1]).toHaveTextContent('XYZ789')
  })

  it('shows verified/unverified badges for welders', async () => {
    const user = userEvent.setup()
    renderComponent()

    const selectTrigger = screen.getByLabelText('Select welder')
    await user.click(selectTrigger)

    expect(await screen.findByText('Verified')).toBeInTheDocument()
    expect(await screen.findByText('Unverified')).toBeInTheDocument()
  })

  it('handles empty welders list gracefully', async () => {
    const user = userEvent.setup()
    vi.mocked(useWeldersModule.useWelders).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    } as any)

    renderComponent()

    const selectTrigger = screen.getByLabelText('Select welder')
    await user.click(selectTrigger)

    expect(await screen.findByText('No welders available')).toBeInTheDocument()
  })
})
