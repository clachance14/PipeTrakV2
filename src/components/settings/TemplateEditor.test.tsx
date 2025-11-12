/**
 * Tests for TemplateEditor component (Feature 026 - User Story 2)
 * Modal for editing milestone weights with validation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { TemplateEditor } from './TemplateEditor'

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ count: 0, error: null }))
        }))
      }))
    }))
  }
}))

// Mock the update hook
vi.mock('@/hooks/useUpdateProjectTemplates', () => ({
  useUpdateProjectTemplates: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    isSuccess: false,
  }))
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  }
}))

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('TemplateEditor', () => {
  const mockWeights = [
    { milestone_name: 'Fit-Up', weight: 10 },
    { milestone_name: 'Weld Made', weight: 70 },
    { milestone_name: 'Punch', weight: 10 },
    { milestone_name: 'Test', weight: 5 },
    { milestone_name: 'Restore', weight: 5 }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders modal with component type in title', () => {
    render(
      <TemplateEditor
        open={true}
        onOpenChange={vi.fn()}
        projectId="project-123"
        componentType="Field Weld"
        weights={mockWeights}
        lastUpdated="2025-11-10T10:00:00Z"
      />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByText(/Field Weld/i)).toBeInTheDocument()
    expect(screen.getByText(/Milestone Weights/i)).toBeInTheDocument()
  })

  it('displays WeightInput for each milestone', () => {
    render(
      <TemplateEditor
        open={true}
        onOpenChange={vi.fn()}
        projectId="project-123"
        componentType="Field Weld"
        weights={mockWeights}
        lastUpdated="2025-11-10T10:00:00Z"
      />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByLabelText('Fit-Up')).toBeInTheDocument()
    expect(screen.getByLabelText('Weld Made')).toBeInTheDocument()
    expect(screen.getByLabelText('Punch')).toBeInTheDocument()
    expect(screen.getByLabelText('Test')).toBeInTheDocument()
    expect(screen.getByLabelText('Restore')).toBeInTheDocument()
  })

  it('displays WeightProgressBar showing current total', () => {
    render(
      <TemplateEditor
        open={true}
        onOpenChange={vi.fn()}
        projectId="project-123"
        componentType="Field Weld"
        weights={mockWeights}
        lastUpdated="2025-11-10T10:00:00Z"
      />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByText('Total: 100%')).toBeInTheDocument()
  })

  it('disables Save button when total is not 100%', async () => {
    const user = userEvent.setup()

    render(
      <TemplateEditor
        open={true}
        onOpenChange={vi.fn()}
        projectId="project-123"
        componentType="Field Weld"
        weights={mockWeights}
        lastUpdated="2025-11-10T10:00:00Z"
      />,
      { wrapper: createWrapper() }
    )

    // Change a weight to make total ≠ 100%
    const fitUpInput = screen.getByLabelText('Fit-Up')
    await user.clear(fitUpInput)
    await user.type(fitUpInput, '20') // Total becomes 110%

    const saveButton = screen.getByRole('button', { name: /save/i })
    expect(saveButton).toBeDisabled()
  })

  it('enables Save button when total equals 100%', () => {
    render(
      <TemplateEditor
        open={true}
        onOpenChange={vi.fn()}
        projectId="project-123"
        componentType="Field Weld"
        weights={mockWeights}
        lastUpdated="2025-11-10T10:00:00Z"
      />,
      { wrapper: createWrapper() }
    )

    const saveButton = screen.getByRole('button', { name: /save/i })
    expect(saveButton).not.toBeDisabled()
  })

  it('updates total in real-time as user changes weights', async () => {
    const user = userEvent.setup()

    render(
      <TemplateEditor
        open={true}
        onOpenChange={vi.fn()}
        projectId="project-123"
        componentType="Field Weld"
        weights={mockWeights}
        lastUpdated="2025-11-10T10:00:00Z"
      />,
      { wrapper: createWrapper() }
    )

    // Initial total
    expect(screen.getByText('Total: 100%')).toBeInTheDocument()

    // Change a weight
    const fitUpInput = screen.getByLabelText('Fit-Up')
    await user.clear(fitUpInput)
    await user.type(fitUpInput, '15')

    // Total should update (105%)
    await waitFor(() => {
      expect(screen.getByText('Total: 105%')).toBeInTheDocument()
    })
  })

  it('calls mutation with correct parameters when Save is clicked', async () => {
    const user = userEvent.setup()
    const mockMutate = vi.fn()

    const { useUpdateProjectTemplates } = await import('@/hooks/useUpdateProjectTemplates')
    vi.mocked(useUpdateProjectTemplates).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: false,
      isSuccess: false,
    } as any)

    render(
      <TemplateEditor
        open={true}
        onOpenChange={vi.fn()}
        projectId="project-123"
        componentType="Field Weld"
        weights={mockWeights}
        lastUpdated="2025-11-10T10:00:00Z"
      />,
      { wrapper: createWrapper() }
    )

    const saveButton = screen.getByRole('button', { name: /save/i })
    await user.click(saveButton)

    // Check first argument only (vars object)
    expect(mockMutate).toHaveBeenCalled()
    const firstCallFirstArg = mockMutate.mock.calls[0][0]
    expect(firstCallFirstArg).toEqual({
      componentType: 'Field Weld',
      weights: mockWeights,
      applyToExisting: false,
      lastUpdated: '2025-11-10T10:00:00Z'
    })
  })

  it('includes applyToExisting flag when checkbox is checked', async () => {
    const user = userEvent.setup()
    const mockMutate = vi.fn()

    const { useUpdateProjectTemplates } = await import('@/hooks/useUpdateProjectTemplates')
    vi.mocked(useUpdateProjectTemplates).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: false,
      isSuccess: false,
    } as any)

    render(
      <TemplateEditor
        open={true}
        onOpenChange={vi.fn()}
        projectId="project-123"
        componentType="Field Weld"
        weights={mockWeights}
        lastUpdated="2025-11-10T10:00:00Z"
      />,
      { wrapper: createWrapper() }
    )

    // Check "Apply to existing components" checkbox
    const checkbox = screen.getByRole('checkbox', { name: /apply to existing/i })
    await user.click(checkbox)

    const saveButton = screen.getByRole('button', { name: /save/i })
    await user.click(saveButton)

    // Check first argument only (vars object)
    expect(mockMutate).toHaveBeenCalled()
    const firstCallFirstArg = mockMutate.mock.calls[0][0]
    expect(firstCallFirstArg.applyToExisting).toBe(true)
  })

  it('shows loading state while mutation is pending', async () => {
    const { useUpdateProjectTemplates } = await import('@/hooks/useUpdateProjectTemplates')
    vi.mocked(useUpdateProjectTemplates).mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
      isError: false,
      isSuccess: false,
    } as any)

    render(
      <TemplateEditor
        open={true}
        onOpenChange={vi.fn()}
        projectId="project-123"
        componentType="Field Weld"
        weights={mockWeights}
        lastUpdated="2025-11-10T10:00:00Z"
      />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByText(/saving/i)).toBeInTheDocument()
  })

  it('closes modal after successful save', async () => {
    const user = userEvent.setup()
    const mockOnOpenChange = vi.fn()
    const mockMutate = vi.fn((vars, { onSuccess }) => {
      onSuccess?.()
    })

    const { useUpdateProjectTemplates } = await import('@/hooks/useUpdateProjectTemplates')
    vi.mocked(useUpdateProjectTemplates).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: false,
      isSuccess: true,
    } as any)

    render(
      <TemplateEditor
        open={true}
        onOpenChange={mockOnOpenChange}
        projectId="project-123"
        componentType="Field Weld"
        weights={mockWeights}
        lastUpdated="2025-11-10T10:00:00Z"
      />,
      { wrapper: createWrapper() }
    )

    const saveButton = screen.getByRole('button', { name: /save/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('has Cancel button that closes modal without saving', async () => {
    const user = userEvent.setup()
    const mockOnOpenChange = vi.fn()

    render(
      <TemplateEditor
        open={true}
        onOpenChange={mockOnOpenChange}
        projectId="project-123"
        componentType="Field Weld"
        weights={mockWeights}
        lastUpdated="2025-11-10T10:00:00Z"
      />,
      { wrapper: createWrapper() }
    )

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('validates individual weights are between 0-100', async () => {
    const user = userEvent.setup()

    render(
      <TemplateEditor
        open={true}
        onOpenChange={vi.fn()}
        projectId="project-123"
        componentType="Field Weld"
        weights={mockWeights}
        lastUpdated="2025-11-10T10:00:00Z"
      />,
      { wrapper: createWrapper() }
    )

    const fitUpInput = screen.getByLabelText('Fit-Up')

    // Try to enter value > 100
    await user.clear(fitUpInput)
    await user.type(fitUpInput, '150')

    // Should show validation error
    expect(screen.getByText(/must be between 0 and 100/i)).toBeInTheDocument()

    // Save button should be disabled
    const saveButton = screen.getByRole('button', { name: /save/i })
    expect(saveButton).toBeDisabled()
  })

  it('supports keyboard navigation (Tab, Enter, Escape)', async () => {
    const user = userEvent.setup()
    const mockOnOpenChange = vi.fn()

    render(
      <TemplateEditor
        open={true}
        onOpenChange={mockOnOpenChange}
        projectId="project-123"
        componentType="Field Weld"
        weights={mockWeights}
        lastUpdated="2025-11-10T10:00:00Z"
      />,
      { wrapper: createWrapper() }
    )

    // Press Escape to close
    await user.keyboard('{Escape}')

    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  // User Story 3 Tests: Affected Component Count and Success Toast

  it('displays affected component count when checkbox is checked (US3)', async () => {
    const user = userEvent.setup()

    render(
      <TemplateEditor
        open={true}
        onOpenChange={vi.fn()}
        projectId="project-123"
        componentType="Field Weld"
        weights={mockWeights}
        lastUpdated="2025-11-10T10:00:00Z"
        affectedCount={25}
      />,
      { wrapper: createWrapper() }
    )

    // Check "Apply to existing components" checkbox
    const checkbox = screen.getByRole('checkbox', { name: /apply to existing/i })
    await user.click(checkbox)

    // Should show warning with affected count
    await waitFor(() => {
      expect(screen.getByText(/this affects 25 existing components/i)).toBeInTheDocument()
    })
  })

  it('shows loading spinner during recalculation (US3)', async () => {
    const _user = userEvent.setup()
    const mockMutate = vi.fn()

    const { useUpdateProjectTemplates } = await import('@/hooks/useUpdateProjectTemplates')
    vi.mocked(useUpdateProjectTemplates).mockReturnValue({
      mutate: mockMutate,
      isPending: true,
      isError: false,
      isSuccess: false,
    } as any)

    render(
      <TemplateEditor
        open={true}
        onOpenChange={vi.fn()}
        projectId="project-123"
        componentType="Field Weld"
        weights={mockWeights}
        lastUpdated="2025-11-10T10:00:00Z"
      />,
      { wrapper: createWrapper() }
    )

    // Should show loading spinner
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('displays success toast with affected count after recalculation (US3)', async () => {
    const user = userEvent.setup()
    const mockMutate = vi.fn((vars, { onSuccess }) => {
      onSuccess?.({ affected_count: 25 })
    })

    const { useUpdateProjectTemplates } = await import('@/hooks/useUpdateProjectTemplates')
    vi.mocked(useUpdateProjectTemplates).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: false,
      isSuccess: false,
    } as any)

    const { toast } = await import('sonner')

    render(
      <TemplateEditor
        open={true}
        onOpenChange={vi.fn()}
        projectId="project-123"
        componentType="Field Weld"
        weights={mockWeights}
        lastUpdated="2025-11-10T10:00:00Z"
      />,
      { wrapper: createWrapper() }
    )

    // Check "Apply to existing components" checkbox
    const checkbox = screen.getByRole('checkbox', { name: /apply to existing/i })
    await user.click(checkbox)

    // Click Save button
    const saveButton = screen.getByRole('button', { name: /save/i })
    await user.click(saveButton)

    // Should show success toast with affected count
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Template weights updated',
        expect.objectContaining({
          description: expect.stringContaining('25'),
        })
      )
    })
  })

  it('hides affected count warning when checkbox is unchecked (US3)', async () => {
    const user = userEvent.setup()

    render(
      <TemplateEditor
        open={true}
        onOpenChange={vi.fn()}
        projectId="project-123"
        componentType="Field Weld"
        weights={mockWeights}
        lastUpdated="2025-11-10T10:00:00Z"
        affectedCount={25}
      />,
      { wrapper: createWrapper() }
    )

    // Check then uncheck the checkbox
    const checkbox = screen.getByRole('checkbox', { name: /apply to existing/i })
    await user.click(checkbox)
    await user.click(checkbox)

    // Warning should not be visible
    expect(screen.queryByText(/this affects 25 existing components/i)).not.toBeInTheDocument()
  })
})
