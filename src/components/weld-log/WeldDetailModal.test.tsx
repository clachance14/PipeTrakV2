/**
 * WeldDetailModal Component Tests (Feature 022 - Phase 1, Tasks T001-T009)
 * Tests for read-only weld detail modal with conditional action buttons
 *
 * Conditional Button Logic:
 * - If weld not made (no welder_id): Show "Update Weld" button
 * - If weld made but no NDE result: Show "Record NDE" button
 * - If NDE recorded: Show NO action buttons
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WeldDetailModal } from './WeldDetailModal'
import type { EnrichedFieldWeld } from '@/types/database.types'

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    loading: false,
  }),
}))

// Mock hooks used by child dialogs
vi.mock('@/hooks/useRecordNDE', () => ({
  useRecordNDE: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
}))

vi.mock('@/hooks/useAssignWelder', () => ({
  useAssignWelder: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
}))

vi.mock('@/hooks/useWelders', () => ({
  useWelders: () => ({
    data: [],
    isLoading: false,
  }),
}))

vi.mock('@/hooks/useUpdateMilestone', () => ({
  useUpdateMilestone: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}))

// Helper to wrap component with QueryClientProvider
function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0, staleTime: 0 },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  )
}

// Mock weld data fixtures
const mockWeldNotMade: EnrichedFieldWeld = {
  id: 'weld-1',
  identityDisplay: 'W-001',
  component_id: 'comp-1',
  project_id: 'proj-1',
  weld_type: 'BW',
  weld_size: '2"',
  schedule: 'SCH 40',
  base_metal: 'CS',
  spec: 'ASME B31.3',
  welder_id: null, // Not made yet
  date_welded: null,
  nde_required: true,
  nde_type: 'RT',
  nde_result: null,
  nde_date: null,
  nde_notes: null,
  status: 'active',
  is_repair: false,
  original_weld_id: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  component: {
    id: 'comp-1',
    type: 'P',
    identity_key: 'P-100',
    percent_complete: 0,
    current_milestones: {}
  },
  drawing: {
    id: 'drawing-1',
    drawing_no_norm: 'DWG-001',
    project_id: 'proj-1'
  },
  welder: null,
  area: null,
  system: null,
  test_package: null
} as EnrichedFieldWeld

const mockWeldMadeNoNDE: EnrichedFieldWeld = {
  ...mockWeldNotMade,
  welder_id: 'welder-1', // Weld made
  date_welded: '2025-01-15',
  welder: {
    id: 'welder-1',
    stencil: 'WD-01',
    name: 'John Welder',
    status: 'active'
  },
  nde_result: null // No NDE yet
} as EnrichedFieldWeld

const mockWeldNDERecorded: EnrichedFieldWeld = {
  ...mockWeldMadeNoNDE,
  nde_result: 'PASS' as const,
  nde_date: '2025-01-20',
  nde_notes: 'RT inspection passed'
} as EnrichedFieldWeld

const mockWeldMissingFields: EnrichedFieldWeld = {
  ...mockWeldNotMade,
  weld_size: null,
  schedule: null,
  base_metal: null,
  spec: null,
  nde_type: null,
  drawing: null
} as EnrichedFieldWeld

describe('WeldDetailModal - Conditional Action Buttons (T001-T009)', () => {
  let mockOnUpdateWeld: ReturnType<typeof vi.fn>
  let mockOnRecordNDE: ReturnType<typeof vi.fn>
  let mockOnOpenChange: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockOnUpdateWeld = vi.fn()
    mockOnRecordNDE = vi.fn()
    mockOnOpenChange = vi.fn()
  })

  // T001: Shows "Update Weld" button when weld not made
  it('T001: shows "Update Weld" button when weld not made', () => {
    render(
      <WeldDetailModal
        weld={mockWeldNotMade}
        open={true}
        onOpenChange={mockOnOpenChange}
        onUpdateWeld={mockOnUpdateWeld}
        onRecordNDE={mockOnRecordNDE}
      />
    )

    expect(screen.getByRole('button', { name: /update weld/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /record nde/i })).not.toBeInTheDocument()
  })

  // T002: Shows "Record NDE" button when weld made but no NDE
  it('T002: shows "Record NDE" button when weld made but no NDE', () => {
    render(
      <WeldDetailModal
        weld={mockWeldMadeNoNDE}
        open={true}
        onOpenChange={mockOnOpenChange}
        onUpdateWeld={mockOnUpdateWeld}
        onRecordNDE={mockOnRecordNDE}
      />
    )

    expect(screen.getByRole('button', { name: /record nde/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /update weld/i })).not.toBeInTheDocument()
  })

  // T003: Shows NO action buttons when NDE recorded
  it('T003: shows no action buttons when NDE recorded', () => {
    render(
      <WeldDetailModal
        weld={mockWeldNDERecorded}
        open={true}
        onOpenChange={mockOnOpenChange}
        onUpdateWeld={mockOnUpdateWeld}
        onRecordNDE={mockOnRecordNDE}
      />
    )

    expect(screen.queryByRole('button', { name: /update weld/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /record nde/i })).not.toBeInTheDocument()

    // Only the "Close" button should be present (from DialogContent)
    const buttons = screen.getAllByRole('button')
    const hasActionButton = buttons.some(btn =>
      btn.textContent?.match(/update weld|record nde/i)
    )
    expect(hasActionButton).toBe(false)
  })

  // T004: Calls onUpdateWeld when button clicked
  it('T004: calls onUpdateWeld when "Update Weld" button clicked', () => {
    render(
      <WeldDetailModal
        weld={mockWeldNotMade}
        open={true}
        onOpenChange={mockOnOpenChange}
        onUpdateWeld={mockOnUpdateWeld}
        onRecordNDE={mockOnRecordNDE}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /update weld/i }))
    expect(mockOnUpdateWeld).toHaveBeenCalledTimes(1)
    expect(mockOnRecordNDE).not.toHaveBeenCalled()
  })

  // T005: Calls onRecordNDE when button clicked
  it('T005: calls onRecordNDE when "Record NDE" button clicked', () => {
    render(
      <WeldDetailModal
        weld={mockWeldMadeNoNDE}
        open={true}
        onOpenChange={mockOnOpenChange}
        onUpdateWeld={mockOnUpdateWeld}
        onRecordNDE={mockOnRecordNDE}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /record nde/i }))
    expect(mockOnRecordNDE).toHaveBeenCalledTimes(1)
    expect(mockOnUpdateWeld).not.toHaveBeenCalled()
  })

  // T006: Displays "-" for null/missing fields
  it('T006: displays "-" for null/missing fields', () => {
    render(
      <WeldDetailModal
        weld={mockWeldMissingFields}
        open={true}
        onOpenChange={mockOnOpenChange}
        onUpdateWeld={mockOnUpdateWeld}
        onRecordNDE={mockOnRecordNDE}
      />
    )

    // Check for multiple "-" placeholders for missing fields
    const dashes = screen.getAllByText('-')
    expect(dashes.length).toBeGreaterThan(0)
  })

  // T007: All sections render correctly
  it('T007: renders all sections correctly', () => {
    render(
      <WeldDetailModal
        weld={mockWeldNotMade}
        open={true}
        onOpenChange={mockOnOpenChange}
        onUpdateWeld={mockOnUpdateWeld}
        onRecordNDE={mockOnRecordNDE}
      />
    )

    // Check for section headings using getAllByText since some words appear multiple times
    expect(screen.getAllByText(/identification/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/specifications/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/welder/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/nde/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/status/i).length).toBeGreaterThan(0)
  })

  // T008: Modal closes on close button
  it('T008: closes modal when close button clicked', () => {
    render(
      <WeldDetailModal
        weld={mockWeldNotMade}
        open={true}
        onOpenChange={mockOnOpenChange}
        onUpdateWeld={mockOnUpdateWeld}
        onRecordNDE={mockOnRecordNDE}
      />
    )

    // Find the main close button (not the X button)
    const closeButton = screen.getByRole('button', { name: 'Close dialog' })
    fireEvent.click(closeButton)
    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  // T009: Modal closes on Escape key
  it('T009: closes modal on Escape key press', () => {
    render(
      <WeldDetailModal
        weld={mockWeldNotMade}
        open={true}
        onOpenChange={mockOnOpenChange}
        onUpdateWeld={mockOnUpdateWeld}
        onRecordNDE={mockOnRecordNDE}
      />
    )

    // Shadcn Dialog should handle Escape key internally
    // Simulate Escape on the dialog element
    const dialog = screen.getByRole('dialog')
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' })
    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })
})

// Additional tests for comprehensive coverage
describe('WeldDetailModal - Data Display', () => {
  const mockOnUpdateWeld = vi.fn()
  const mockOnRecordNDE = vi.fn()
  const mockOnOpenChange = vi.fn()

  it('displays weld identification information', () => {
    render(
      <WeldDetailModal
        weld={mockWeldNotMade}
        open={true}
        onOpenChange={mockOnOpenChange}
        onUpdateWeld={mockOnUpdateWeld}
        onRecordNDE={mockOnRecordNDE}
      />
    )

    expect(screen.getByText('W-001')).toBeInTheDocument()
    expect(screen.getByText('DWG-001')).toBeInTheDocument()
  })

  it('displays weld specifications', () => {
    render(
      <WeldDetailModal
        weld={mockWeldNotMade}
        open={true}
        onOpenChange={mockOnOpenChange}
        onUpdateWeld={mockOnUpdateWeld}
        onRecordNDE={mockOnRecordNDE}
      />
    )

    expect(screen.getByText('2"')).toBeInTheDocument()
    expect(screen.getByText('SCH 40')).toBeInTheDocument()
    expect(screen.getByText('CS')).toBeInTheDocument()
    expect(screen.getByText('ASME B31.3')).toBeInTheDocument()
  })

  it('displays welder information when assigned', () => {
    render(
      <WeldDetailModal
        weld={mockWeldMadeNoNDE}
        open={true}
        onOpenChange={mockOnOpenChange}
        onUpdateWeld={mockOnUpdateWeld}
        onRecordNDE={mockOnRecordNDE}
      />
    )

    expect(screen.getByText(/WD-01/)).toBeInTheDocument()
    expect(screen.getByText(/John Welder/)).toBeInTheDocument()
  })

  it('displays NDE information when recorded', () => {
    render(
      <WeldDetailModal
        weld={mockWeldNDERecorded}
        open={true}
        onOpenChange={mockOnOpenChange}
        onUpdateWeld={mockOnUpdateWeld}
        onRecordNDE={mockOnRecordNDE}
      />
    )

    expect(screen.getByText('PASS')).toBeInTheDocument()
    expect(screen.getByText('RT inspection passed')).toBeInTheDocument()
  })
})

describe('WeldDetailModal - Accessibility', () => {
  const mockOnUpdateWeld = vi.fn()
  const mockOnRecordNDE = vi.fn()
  const mockOnOpenChange = vi.fn()

  it('action buttons meet touch target requirements (≥44px)', () => {
    render(
      <WeldDetailModal
        weld={mockWeldNotMade}
        open={true}
        onOpenChange={mockOnOpenChange}
        onUpdateWeld={mockOnUpdateWeld}
        onRecordNDE={mockOnRecordNDE}
      />
    )

    const updateButton = screen.getByRole('button', { name: /update weld/i })

    // Check for min-h-[44px] class
    expect(updateButton.className).toContain('min-h-[44px]')
  })

  it('has proper dialog structure with ARIA labels', () => {
    render(
      <WeldDetailModal
        weld={mockWeldNotMade}
        open={true}
        onOpenChange={mockOnOpenChange}
        onUpdateWeld={mockOnUpdateWeld}
        onRecordNDE={mockOnRecordNDE}
      />
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-labelledby')
  })
})
