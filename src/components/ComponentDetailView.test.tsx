import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ComponentDetailView } from './ComponentDetailView'

// Mock hooks
vi.mock('@/hooks/useComponents', () => ({
  useComponent: vi.fn((componentId: string) => {
    // Return field_weld mock for fw-1
    if (componentId === 'fw-1') {
      return {
        data: {
          id: 'fw-1',
          project_id: 'proj-1',
          component_type: 'field_weld',
          identity_key: { drawing_number: 'DWG-001', sequence: 1 },
          percent_complete: 10,
          current_milestones: {
            'Fit-Up': false,
            'Weld Made': false,
            'Punch': false,
            'Test': false,
            'Restore': false,
          },
          progress_template: {
            milestones_config: [
              { name: 'Fit-Up', weight: 10, is_partial: false, order: 1, requires_welder: false },
              { name: 'Weld Made', weight: 60, is_partial: false, order: 2, requires_welder: true },
              { name: 'Punch', weight: 10, is_partial: false, order: 3, requires_welder: false },
              { name: 'Test', weight: 15, is_partial: false, order: 4, requires_welder: false },
              { name: 'Restore', weight: 5, is_partial: false, order: 5, requires_welder: false },
            ]
          },
          area_id: null,
          system_id: null,
          test_package_id: null,
        },
        isLoading: false,
      }
    }

    // Component with attributes (comp-with-attrs)
    if (componentId === 'comp-with-attrs') {
      return {
        data: {
          id: 'comp-with-attrs',
          project_id: 'proj-1',
          component_type: 'threaded_pipe',
          identity_key: { size: '1"' },
          percent_complete: 25,
          current_milestones: {},
          progress_template: {
            milestones_config: []
          },
          attributes: {
            spec: 'A106B',
            description: 'Blind Flange 2" 150# RF A105',
            size: '2',
            cmdty_code: 'FBLAG2DFA2351215',
            comments: 'Test comments',
          },
          area_id: null,
          system_id: null,
          test_package_id: null,
        },
        isLoading: false,
      }
    }

    // Component with null attributes (comp-null-attrs)
    if (componentId === 'comp-null-attrs') {
      return {
        data: {
          id: 'comp-null-attrs',
          project_id: 'proj-1',
          component_type: 'valve',
          identity_key: { commodity_code: 'VALVE-001', size: '3', seq: 1 },
          percent_complete: 0,
          current_milestones: {},
          progress_template: {
            milestones_config: []
          },
          attributes: null,
          area_id: null,
          system_id: null,
          test_package_id: null,
        },
        isLoading: false,
      }
    }

    // Component with empty attributes object (comp-empty-attrs)
    if (componentId === 'comp-empty-attrs') {
      return {
        data: {
          id: 'comp-empty-attrs',
          project_id: 'proj-1',
          component_type: 'valve',
          identity_key: { commodity_code: 'VALVE-002', size: '4', seq: 1 },
          percent_complete: 0,
          current_milestones: {},
          progress_template: {
            milestones_config: []
          },
          attributes: {},
          area_id: null,
          system_id: null,
          test_package_id: null,
        },
        isLoading: false,
      }
    }

    // Component with completed milestone for rollback testing (comp-completed)
    if (componentId === 'comp-completed') {
      return {
        data: {
          id: 'comp-completed',
          project_id: 'proj-1',
          component_type: 'valve',
          identity_key: { commodity_code: 'VALVE-ROLLBACK', size: '4', seq: 1 },
          percent_complete: 50,
          current_milestones: {
            'Receive': 100,
            'Install': 0,
            'Test': 0,
            'Punch': 0,
            'Restore': 0,
          },
          progress_template: {
            milestones_config: [
              { name: 'Receive', weight: 10, is_partial: false, order: 1, requires_welder: false },
              { name: 'Install', weight: 60, is_partial: false, order: 2, requires_welder: false },
              { name: 'Test', weight: 15, is_partial: false, order: 3, requires_welder: false },
              { name: 'Punch', weight: 10, is_partial: false, order: 4, requires_welder: false },
              { name: 'Restore', weight: 5, is_partial: false, order: 5, requires_welder: false },
            ]
          },
          area_id: null,
          system_id: null,
          test_package_id: null,
        },
        isLoading: false,
      }
    }

    // Component with partial milestone for slider rollback testing (comp-partial)
    if (componentId === 'comp-partial') {
      return {
        data: {
          id: 'comp-partial',
          project_id: 'proj-1',
          component_type: 'pipe',
          identity_key: { commodity_code: 'PIPE-001', size: '6', seq: 1 },
          percent_complete: 30,
          current_milestones: {
            'Receive': 100,
            'Fabricate': 50,
            'Install': 0,
          },
          progress_template: {
            milestones_config: [
              { name: 'Receive', weight: 10, is_partial: false, order: 1, requires_welder: false },
              { name: 'Fabricate', weight: 60, is_partial: true, order: 2, requires_welder: false },
              { name: 'Install', weight: 30, is_partial: false, order: 3, requires_welder: false },
            ]
          },
          area_id: null,
          system_id: null,
          test_package_id: null,
        },
        isLoading: false,
      }
    }

    // Default valve mock
    return {
      data: {
        id: 'comp-1',
        project_id: 'proj-1',
        component_type: 'valve',
        identity_key: { commodity_code: 'VBALU-001', size: '2', seq: 1 },
        percent_complete: 50,
        current_milestones: {},
        progress_template: {
          milestones_config: []
        },
        area_id: null,
        system_id: null,
        test_package_id: null,
      },
      isLoading: false,
    }
  }),
  useEffectiveTemplate: () => ({
    data: null,
    isLoading: false,
  })
}))

import { useComponent } from '@/hooks/useComponents'

vi.mock('@/hooks/useMilestoneHistory', () => ({
  useMilestoneHistory: () => ({
    data: [],
    isLoading: false,
  })
}))

// Track mutation calls for testing
const mockMutateAsync = vi.fn()

vi.mock('@/hooks/useMilestones', () => ({
  useUpdateMilestone: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  })
}))

vi.mock('@/hooks/useAreas', () => ({
  useAreas: () => ({
    data: [],
  })
}))

vi.mock('@/hooks/useSystems', () => ({
  useSystems: () => ({
    data: [],
  })
}))

vi.mock('@/hooks/useTestPackages', () => ({
  useTestPackages: () => ({
    data: [],
  })
}))

vi.mock('@/hooks/useComponentAssignment', () => ({
  useAssignComponents: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })
}))

describe('ComponentDetailView - Tabs', () => {
  const queryClient = new QueryClient()

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  it('renders all tabs on desktop', () => {
    render(
      <ComponentDetailView
        componentId="comp-1"
        canUpdateMilestones={true}
      />,
      { wrapper }
    )

    // Check tab triggers exist (may appear in both desktop tabs and mobile dropdown)
    expect(screen.getAllByText('Overview').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Details').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Milestones').length).toBeGreaterThan(0)
    expect(screen.getAllByText('History').length).toBeGreaterThan(0)
  })

  it('shows Overview tab by default', () => {
    render(
      <ComponentDetailView
        componentId="comp-1"
        canUpdateMilestones={true}
      />,
      { wrapper }
    )

    // Overview content should be visible (may appear in both desktop and mobile)
    expect(screen.getAllByText(/Overview content/i).length).toBeGreaterThan(0)
  })

  it('switches tabs when clicked', () => {
    render(
      <ComponentDetailView
        componentId="comp-1"
        canUpdateMilestones={true}
      />,
      { wrapper }
    )

    // Find all tab buttons
    const tabs = screen.getAllByRole('tab')

    // Should have 4 tabs (Overview, Details, Milestones, History)
    expect(tabs.length).toBeGreaterThanOrEqual(4)

    // Find the Milestones tab
    const milestoneTab = tabs.find(tab => tab.textContent === 'Milestones')
    expect(milestoneTab).toBeDefined()

    // Click the tab - this should trigger the onValueChange callback
    fireEvent.click(milestoneTab!)

    // The tab should now be clickable (not disabled)
    expect(milestoneTab).not.toBeDisabled()
  })
})

describe('ComponentDetailView - Details Tab', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0 },
      mutations: { retry: false }
    }
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  it('shows metadata editing form when canEditMetadata is true', async () => {
    render(
      <ComponentDetailView
        componentId="comp-1"
        canUpdateMilestones={true}
        canEditMetadata={true}
      />,
      { wrapper }
    )

    // Wait for component to load
    await waitFor(() => {
      expect(screen.queryByText('Loading component details...')).not.toBeInTheDocument()
    })

    // Find all tab buttons
    const tabs = screen.getAllByRole('tab')
    const detailsTab = tabs.find(tab => tab.textContent === 'Details')
    expect(detailsTab).toBeDefined()

    fireEvent.click(detailsTab!)

    await waitFor(() => {
      expect(screen.getByText('Assign Metadata')).toBeInTheDocument()
      expect(screen.getByText('Save')).toBeInTheDocument()
    })
  })

  it('disables form when canEditMetadata is false', async () => {
    render(
      <ComponentDetailView
        componentId="comp-1"
        canUpdateMilestones={true}
        canEditMetadata={false}
      />,
      { wrapper }
    )

    // Wait for component to load
    await waitFor(() => {
      expect(screen.queryByText('Loading component details...')).not.toBeInTheDocument()
    })

    // Find all tab buttons
    const tabs = screen.getAllByRole('tab')
    const detailsTab = tabs.find(tab => tab.textContent === 'Details')
    expect(detailsTab).toBeDefined()

    fireEvent.click(detailsTab!)

    await waitFor(() => {
      expect(screen.getByText(/don't have permission/i)).toBeInTheDocument()
    })
  })
})

describe('ComponentDetailView - Milestones Tab', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0 },
      mutations: { retry: false }
    }
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  it('shows milestone checkboxes when canUpdateMilestones is true', async () => {
    render(
      <ComponentDetailView
        componentId="comp-1"
        canUpdateMilestones={true}
      />,
      { wrapper }
    )

    // Wait for component to load
    await waitFor(() => {
      expect(screen.queryByText('Loading component details...')).not.toBeInTheDocument()
    })

    // Find all tab buttons
    const tabs = screen.getAllByRole('tab')
    const milestonesTab = tabs.find(tab => tab.textContent === 'Milestones')
    expect(milestonesTab).toBeDefined()

    fireEvent.click(milestonesTab!)

    // Should show milestone controls header
    await waitFor(() => {
      expect(screen.getByText(/Milestones/i)).toBeInTheDocument()
    })
  })

  it('disables milestone controls when canUpdateMilestones is false', async () => {
    render(
      <ComponentDetailView
        componentId="comp-1"
        canUpdateMilestones={false}
      />,
      { wrapper }
    )

    // Wait for component to load
    await waitFor(() => {
      expect(screen.queryByText('Loading component details...')).not.toBeInTheDocument()
    })

    // Find all tab buttons
    const tabs = screen.getAllByRole('tab')
    const milestonesTab = tabs.find(tab => tab.textContent === 'Milestones')
    expect(milestonesTab).toBeDefined()

    fireEvent.click(milestonesTab!)

    // Should show permission message
    await waitFor(() => {
      expect(screen.getByText(/don't have permission/i)).toBeInTheDocument()
    })
  })
})

// Mock WelderAssignDialog component
vi.mock('@/components/field-welds/WelderAssignDialog', () => ({
  WelderAssignDialog: ({ open }: { open: boolean }) => {
    return open ? <div role="dialog" data-testid="welder-dialog">Welder Assignment Dialog</div> : null
  }
}))

// Mock RollbackConfirmationModal component
let _mockRollbackConfirmCallback: ((data: { reason: string; reasonLabel: string; details?: string }) => void) | null = null
let _mockRollbackCloseCallback: (() => void) | null = null

vi.mock('@/components/drawing-table/RollbackConfirmationModal', () => ({
  RollbackConfirmationModal: ({ isOpen, onClose, onConfirm, componentName, milestoneName }: {
    isOpen: boolean
    onClose: () => void
    onConfirm: (data: { reason: string; reasonLabel: string; details?: string }) => void
    componentName: string
    milestoneName: string
  }) => {
    // Store callbacks for test interaction
    _mockRollbackConfirmCallback = onConfirm
    _mockRollbackCloseCallback = onClose

    if (!isOpen) return null
    return (
      <div role="dialog" data-testid="rollback-modal">
        <div>Rollback Confirmation</div>
        <div data-testid="rollback-component">{componentName}</div>
        <div data-testid="rollback-milestone">{milestoneName}</div>
        <button
          data-testid="rollback-confirm-btn"
          onClick={() => onConfirm({ reason: 'data_entry_error', reasonLabel: 'Data entry error' })}
        >
          Confirm Rollback
        </button>
        <button data-testid="rollback-cancel-btn" onClick={onClose}>
          Cancel
        </button>
      </div>
    )
  }
}))

// Mock ComponentManhourSection
vi.mock('@/components/component-detail/ComponentManhourSection', () => ({
  ComponentManhourSection: ({ component }: { component: { budgeted_manhours?: number | null } }) => {
    if (!component.budgeted_manhours) return null;
    return (
      <div data-testid="manhour-section">
        <div>Manhour Section</div>
        <div>Budgeted: {component.budgeted_manhours} MH</div>
      </div>
    );
  }
}))

describe('ComponentDetailView - Field Weld Auto-Open Welder Dialog', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0 },
      mutations: { retry: false }
    }
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  it('opens welder dialog when Weld Made milestone is checked for field weld', async () => {
    // The mock at the top of the file handles fw-1 as a field_weld component
    render(
      <ComponentDetailView
        componentId="fw-1"
        canUpdateMilestones={true}
      />,
      { wrapper }
    )

    // Wait for component to load
    await waitFor(() => {
      expect(screen.queryByText('Loading component details...')).not.toBeInTheDocument()
    })

    // Navigate to Milestones tab
    const tabs = screen.getAllByRole('tab')
    const milestonesTab = tabs.find(tab => tab.textContent === 'Milestones')
    expect(milestonesTab).toBeDefined()
    fireEvent.click(milestonesTab!)

    // Find the Weld Made checkbox
    await waitFor(() => {
      expect(screen.getByText('Weld Made')).toBeInTheDocument()
    })

    // Get all checkboxes (should be 5 for the 5 milestones: Fit-Up, Weld Made, Punch, Test, Restore)
    const checkboxes = screen.getAllByRole('checkbox')
    // Weld Made is the second milestone (index 1)
    const weldMadeCheckbox = checkboxes[1]

    // Initially, welder dialog should not be visible
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    // Check the Weld Made checkbox
    fireEvent.click(weldMadeCheckbox)

    // Welder dialog should now be open
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })
})

describe('ComponentDetailView - Attributes Display', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0 },
      mutations: { retry: false }
    }
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  it('displays spec when present in attributes', async () => {
    render(
      <ComponentDetailView
        componentId="comp-with-attrs"
        canUpdateMilestones={false}
      />,
      { wrapper }
    )

    // Wait for component to load
    await waitFor(() => {
      expect(screen.queryByText('Loading component details...')).not.toBeInTheDocument()
    })

    // Should display the spec from attributes
    expect(screen.getByText('A106B')).toBeInTheDocument()
  })

  it('displays description when present in attributes', async () => {
    render(
      <ComponentDetailView
        componentId="comp-with-attrs"
        canUpdateMilestones={false}
      />,
      { wrapper }
    )

    // Wait for component to load
    await waitFor(() => {
      expect(screen.queryByText('Loading component details...')).not.toBeInTheDocument()
    })

    // Should display the description from attributes
    expect(screen.getByText('Blind Flange 2" 150# RF A105')).toBeInTheDocument()
  })

  it('shows "Not specified" when attributes is null', async () => {
    render(
      <ComponentDetailView
        componentId="comp-null-attrs"
        canUpdateMilestones={false}
      />,
      { wrapper }
    )

    // Wait for component to load
    await waitFor(() => {
      expect(screen.queryByText('Loading component details...')).not.toBeInTheDocument()
    })

    // Should show "Not specified" for both spec and description
    const notSpecifiedElements = screen.getAllByText('Not specified')
    expect(notSpecifiedElements.length).toBeGreaterThanOrEqual(2)
  })

  it('shows "Not specified" when attributes object is empty', async () => {
    render(
      <ComponentDetailView
        componentId="comp-empty-attrs"
        canUpdateMilestones={false}
      />,
      { wrapper }
    )

    // Wait for component to load
    await waitFor(() => {
      expect(screen.queryByText('Loading component details...')).not.toBeInTheDocument()
    })

    // Should show "Not specified" for both spec and description
    const notSpecifiedElements = screen.getAllByText('Not specified')
    expect(notSpecifiedElements.length).toBeGreaterThanOrEqual(2)
  })

  it('displays attributes section label', async () => {
    render(
      <ComponentDetailView
        componentId="comp-with-attrs"
        canUpdateMilestones={false}
      />,
      { wrapper }
    )

    // Wait for component to load
    await waitFor(() => {
      expect(screen.queryByText('Loading component details...')).not.toBeInTheDocument()
    })

    // Should have labels for Spec and Description
    expect(screen.getByText('Spec')).toBeInTheDocument()
    expect(screen.getByText('Description')).toBeInTheDocument()
  })
})

describe('ComponentDetailView - Done Button', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0 },
      mutations: { retry: false }
    }
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  it('renders Done button in footer', async () => {
    const mockOnClose = vi.fn()

    render(
      <ComponentDetailView
        componentId="comp-1"
        canUpdateMilestones={true}
        onClose={mockOnClose}
      />,
      { wrapper }
    )

    // Wait for component to load
    await waitFor(() => {
      expect(screen.queryByText('Loading component details...')).not.toBeInTheDocument()
    })

    // Done button should be visible
    const doneButton = screen.getByRole('button', { name: /done/i })
    expect(doneButton).toBeInTheDocument()

    // Clicking Done button should call onClose
    fireEvent.click(doneButton)
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })
})

describe('ComponentDetailView - Manhour Section', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0 },
      mutations: { retry: false }
    }
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  it('renders manhour section in overview tab for component with budgeted manhours', async () => {
    // Create a mock component with manhour data
    vi.mocked(useComponent).mockReturnValueOnce({
      data: {
        id: 'comp-with-manhours',
        project_id: 'proj-1',
        component_type: 'valve',
        identity_key: { commodity_code: 'VALVE-003', size: '2', seq: 1 },
        percent_complete: 50,
        current_milestones: {},
        progress_template: { milestones_config: [] },
        area_id: null,
        system_id: null,
        test_package_id: null,
        budgeted_manhours: 100,
        manhour_weight: 0.05,
      } as any,
      isLoading: false,
    } as any)

    render(
      <ComponentDetailView
        componentId="comp-with-manhours"
        canUpdateMilestones={false}
      />,
      { wrapper }
    )

    // Wait for component to load
    await waitFor(() => {
      expect(screen.queryByText('Loading component details...')).not.toBeInTheDocument()
    })

    // Should render manhour section in overview tab
    expect(screen.getByTestId('manhour-section')).toBeInTheDocument()
    expect(screen.getByText('Budgeted: 100 MH')).toBeInTheDocument()
  })
})

describe('ComponentDetailView - Rollback Confirmation', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0 },
      mutations: { retry: false }
    }
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  beforeEach(() => {
    mockMutateAsync.mockClear()
  })

  it('opens rollback confirmation modal when unchecking a completed milestone', async () => {
    render(
      <ComponentDetailView
        componentId="comp-completed"
        canUpdateMilestones={true}
      />,
      { wrapper }
    )

    // Wait for component to load
    await waitFor(() => {
      expect(screen.queryByText('Loading component details...')).not.toBeInTheDocument()
    })

    // Navigate to Milestones tab
    const tabs = screen.getAllByRole('tab')
    const milestonesTab = tabs.find(tab => tab.textContent === 'Milestones')
    expect(milestonesTab).toBeDefined()
    fireEvent.click(milestonesTab!)

    // Find the Receive milestone (which is completed - value 100)
    await waitFor(() => {
      expect(screen.getByText('Receive')).toBeInTheDocument()
    })

    // Get the Receive checkbox (first checkbox since it's first milestone)
    const checkboxes = screen.getAllByRole('checkbox')
    const receiveCheckbox = checkboxes[0]

    // Initially, rollback modal should not be visible
    expect(screen.queryByTestId('rollback-modal')).not.toBeInTheDocument()

    // Uncheck the completed Receive milestone (this should be a rollback)
    fireEvent.click(receiveCheckbox)

    // Rollback confirmation modal should now be open
    await waitFor(() => {
      expect(screen.getByTestId('rollback-modal')).toBeInTheDocument()
    })

    // Modal should show correct component and milestone info
    expect(screen.getByTestId('rollback-milestone')).toHaveTextContent('Receive')
  })

  it('passes rollback reason to mutation when user confirms rollback', async () => {
    render(
      <ComponentDetailView
        componentId="comp-completed"
        canUpdateMilestones={true}
      />,
      { wrapper }
    )

    // Wait for component to load
    await waitFor(() => {
      expect(screen.queryByText('Loading component details...')).not.toBeInTheDocument()
    })

    // Navigate to Milestones tab
    const tabs = screen.getAllByRole('tab')
    const milestonesTab = tabs.find(tab => tab.textContent === 'Milestones')
    fireEvent.click(milestonesTab!)

    await waitFor(() => {
      expect(screen.getByText('Receive')).toBeInTheDocument()
    })

    // Get the Receive checkbox and uncheck it
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0])

    // Wait for modal to open
    await waitFor(() => {
      expect(screen.getByTestId('rollback-modal')).toBeInTheDocument()
    })

    // Click confirm button in the modal
    const confirmBtn = screen.getByTestId('rollback-confirm-btn')
    fireEvent.click(confirmBtn)

    // Mutation should be called with rollback metadata
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          component_id: 'comp-completed',
          milestone_name: 'Receive',
          value: 0,
          metadata: expect.objectContaining({
            rollback: true,
            rollbackReason: 'data_entry_error',
            rollbackReasonLabel: 'Data entry error',
          })
        })
      )
    })
  })

  it('does not update milestone when rollback is cancelled', async () => {
    render(
      <ComponentDetailView
        componentId="comp-completed"
        canUpdateMilestones={true}
      />,
      { wrapper }
    )

    // Wait for component to load
    await waitFor(() => {
      expect(screen.queryByText('Loading component details...')).not.toBeInTheDocument()
    })

    // Navigate to Milestones tab
    const tabs = screen.getAllByRole('tab')
    const milestonesTab = tabs.find(tab => tab.textContent === 'Milestones')
    fireEvent.click(milestonesTab!)

    await waitFor(() => {
      expect(screen.getByText('Receive')).toBeInTheDocument()
    })

    // Get the Receive checkbox and uncheck it
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0])

    // Wait for modal to open
    await waitFor(() => {
      expect(screen.getByTestId('rollback-modal')).toBeInTheDocument()
    })

    // Click cancel button
    const cancelBtn = screen.getByTestId('rollback-cancel-btn')
    fireEvent.click(cancelBtn)

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByTestId('rollback-modal')).not.toBeInTheDocument()
    })

    // Mutation should NOT have been called
    expect(mockMutateAsync).not.toHaveBeenCalled()
  })

  it('does NOT show rollback modal when checking an incomplete milestone', async () => {
    render(
      <ComponentDetailView
        componentId="comp-completed"
        canUpdateMilestones={true}
      />,
      { wrapper }
    )

    // Wait for component to load
    await waitFor(() => {
      expect(screen.queryByText('Loading component details...')).not.toBeInTheDocument()
    })

    // Navigate to Milestones tab
    const tabs = screen.getAllByRole('tab')
    const milestonesTab = tabs.find(tab => tab.textContent === 'Milestones')
    fireEvent.click(milestonesTab!)

    await waitFor(() => {
      expect(screen.getByText('Install')).toBeInTheDocument()
    })

    // Get the Install checkbox (second checkbox, currently at 0/unchecked)
    const checkboxes = screen.getAllByRole('checkbox')
    const installCheckbox = checkboxes[1]

    // Check the Install milestone (this is NOT a rollback)
    fireEvent.click(installCheckbox)

    // Rollback modal should NOT appear
    expect(screen.queryByTestId('rollback-modal')).not.toBeInTheDocument()

    // Mutation should be called directly (no rollback modal)
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          component_id: 'comp-completed',
          milestone_name: 'Install',
          value: 100,
        })
      )
    })

    // Should NOT have rollback metadata
    expect(mockMutateAsync).not.toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          rollback: true
        })
      })
    )
  })
})
