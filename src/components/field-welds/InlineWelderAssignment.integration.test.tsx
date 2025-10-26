import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'
import { FieldWeldRow } from './FieldWeldRow'
import * as useFieldWeldModule from '@/hooks/useFieldWeld'
import * as useWeldersModule from '@/hooks/useWelders'
import * as useAssignWelderModule from '@/hooks/useAssignWelder'
import type { ComponentRow } from '@/types/drawing-table.types'

// Mock the hooks
vi.mock('@/hooks/useFieldWeld')
vi.mock('@/hooks/useWelders')
vi.mock('@/hooks/useAssignWelder')

const mockFieldWeld = {
  id: 'field-weld-1',
  component_id: 'component-1',
  project_id: 'project-1',
  weld_type: 'BW' as const,
  weld_size: '6"',
  schedule: 'SCH 40',
  base_metal: 'CS',
  spec: 'A106',
  welder_id: null,
  date_welded: null,
  nde_required: true,
  nde_type: 'RT' as const,
  nde_result: null,
  nde_date: null,
  nde_notes: null,
  status: 'active' as const,
  original_weld_id: null,
  is_repair: false,
  created_at: '2025-01-01',
  updated_at: '2025-01-01',
  identityDisplay: 'Weld 42',
}

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
    status: 'verified' as const,
    project_id: 'project-1',
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
  },
]

const mockComponent: ComponentRow = {
  id: 'component-1',
  identityDisplay: 'Weld 42',
  type: 'field_weld',
  percent_complete: 30,
  drawing_id: 'drawing-1',
  area: null,
  system: null,
  test_package: null,
  milestones: [
    { name: 'Fit-up', complete: true, weight: 30 },
    { name: 'Weld Complete', complete: false, weight: 65 },
    { name: 'Accepted', complete: false, weight: 5 },
  ],
}

describe('Inline Welder Assignment Integration', () => {
  let queryClient: QueryClient
  let mockAssignWelder: ReturnType<typeof vi.fn>

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    mockAssignWelder = vi.fn()

    // Mock useFieldWeld
    vi.mocked(useFieldWeldModule.useFieldWeld).mockReturnValue({
      data: mockFieldWeld,
      isLoading: false,
      isError: false,
      error: null,
    } as any)

    // Mock useWelders
    vi.mocked(useWeldersModule.useWelders).mockReturnValue({
      data: mockWelders,
      isLoading: false,
      isError: false,
      error: null,
    } as any)

    // Mock useAssignWelder
    vi.mocked(useAssignWelderModule.useAssignWelder).mockReturnValue({
      mutateAsync: mockAssignWelder,
      isPending: false,
      isError: false,
      error: null,
    } as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  const renderComponent = (props: Partial<typeof mockComponent> = {}) => {
    const component = { ...mockComponent, ...props }
    return render(
      <QueryClientProvider client={queryClient}>
        <FieldWeldRow
          component={component}
          projectId="project-1"
          onMilestoneUpdate={vi.fn()}
          style={{}}
        />
      </QueryClientProvider>
    )
  }

  it('shows normal milestones when row is expanded', async () => {
    const user = userEvent.setup()
    renderComponent()

    // Expand the row
    const expandButton = screen.getByRole('button', { name: /expand/i })
    await user.click(expandButton)

    // Should see milestone checkboxes
    expect(screen.getByLabelText('Fit-up milestone')).toBeInTheDocument()
    expect(screen.getByLabelText('Weld Complete milestone')).toBeInTheDocument()
    expect(screen.getByLabelText('Accepted milestone')).toBeInTheDocument()
  })

  it('replaces milestones with inline assignment UI when Weld Complete is checked', async () => {
    const user = userEvent.setup()
    renderComponent()

    // Expand the row
    const expandButton = screen.getByRole('button', { name: /expand/i })
    await user.click(expandButton)

    // Click "Weld Complete" checkbox
    const weldCompleteCheckbox = screen.getByLabelText('Weld Complete milestone')
    await user.click(weldCompleteCheckbox)

    // Milestone checkboxes should be replaced with inline assignment UI
    await waitFor(() => {
      expect(screen.queryByLabelText('Fit-up milestone')).not.toBeInTheDocument()
    })

    expect(screen.getByText('Welder:')).toBeInTheDocument()
    expect(screen.getByText('Date Welded:')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('calls useAssignWelder mutation when user confirms assignment', async () => {
    const user = userEvent.setup()
    mockAssignWelder.mockResolvedValue({})

    renderComponent()

    // Expand and trigger inline assignment
    const expandButton = screen.getByRole('button', { name: /expand/i })
    await user.click(expandButton)

    const weldCompleteCheckbox = screen.getByLabelText('Weld Complete milestone')
    await user.click(weldCompleteCheckbox)

    // Select welder
    const welderSelect = screen.getByLabelText('Select welder')
    await user.click(welderSelect)
    const welderOption = await screen.findByText(/ABC123/)
    await user.click(welderOption)

    // Confirm assignment
    const confirmButton = screen.getByRole('button', { name: /confirm/i })
    await user.click(confirmButton)

    // Should call mutation with correct payload
    const today = new Date().toISOString().split('T')[0]
    expect(mockAssignWelder).toHaveBeenCalledWith({
      field_weld_id: 'field-weld-1',
      welder_id: 'welder-1',
      date_welded: today,
    })
  })

  it('hides inline assignment UI and shows milestones after successful assignment', async () => {
    const user = userEvent.setup()
    mockAssignWelder.mockResolvedValue({})

    renderComponent()

    // Expand and trigger inline assignment
    const expandButton = screen.getByRole('button', { name: /expand/i })
    await user.click(expandButton)

    const weldCompleteCheckbox = screen.getByLabelText('Weld Complete milestone')
    await user.click(weldCompleteCheckbox)

    // Complete assignment
    const welderSelect = screen.getByLabelText('Select welder')
    await user.click(welderSelect)
    const welderOption = await screen.findByText(/ABC123/)
    await user.click(welderOption)

    const confirmButton = screen.getByRole('button', { name: /confirm/i })
    await user.click(confirmButton)

    // After successful assignment, should return to milestone view
    await waitFor(() => {
      expect(screen.queryByText('Welder:')).not.toBeInTheDocument()
    })

    expect(screen.getByLabelText('Fit-up milestone')).toBeInTheDocument()
    expect(screen.getByLabelText('Weld Complete milestone')).toBeInTheDocument()
  })

  it('hides inline assignment UI when user cancels', async () => {
    const user = userEvent.setup()
    renderComponent()

    // Expand and trigger inline assignment
    const expandButton = screen.getByRole('button', { name: /expand/i })
    await user.click(expandButton)

    const weldCompleteCheckbox = screen.getByLabelText('Weld Complete milestone')
    await user.click(weldCompleteCheckbox)

    // Cancel assignment
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    // Should return to milestone view
    await waitFor(() => {
      expect(screen.queryByText('Welder:')).not.toBeInTheDocument()
    })

    expect(screen.getByLabelText('Fit-up milestone')).toBeInTheDocument()
    expect(screen.getByLabelText('Weld Complete milestone')).toBeInTheDocument()
  })

  it('handles assignment errors gracefully', async () => {
    const user = userEvent.setup()
    mockAssignWelder.mockRejectedValue(new Error('Network error'))

    renderComponent()

    // Expand and trigger inline assignment
    const expandButton = screen.getByRole('button', { name: /expand/i })
    await user.click(expandButton)

    const weldCompleteCheckbox = screen.getByLabelText('Weld Complete milestone')
    await user.click(weldCompleteCheckbox)

    // Complete assignment
    const welderSelect = screen.getByLabelText('Select welder')
    await user.click(welderSelect)
    const welderOption = await screen.findByText(/ABC123/)
    await user.click(welderOption)

    const confirmButton = screen.getByRole('button', { name: /confirm/i })
    await user.click(confirmButton)

    // After error, should close inline assignment UI
    await waitFor(() => {
      expect(screen.queryByText('Welder:')).not.toBeInTheDocument()
    })

    // Should return to milestone view
    expect(screen.getByLabelText('Fit-up milestone')).toBeInTheDocument()
  })

  it('shows today\'s date in the inline assignment UI', async () => {
    const user = userEvent.setup()
    renderComponent()

    // Expand and trigger inline assignment
    const expandButton = screen.getByRole('button', { name: /expand/i })
    await user.click(expandButton)

    const weldCompleteCheckbox = screen.getByLabelText('Weld Complete milestone')
    await user.click(weldCompleteCheckbox)

    // Check that today's date is displayed
    const datePattern = /\d{2}\/\d{2}\/\d{4}/
    expect(screen.getByText(datePattern)).toBeInTheDocument()
  })
})
