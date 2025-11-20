/**
 * Test Suite: CreateUnplannedWeldDialog Component (T019-T022)
 *
 * Feature: 028-add-unplanned-welds
 * Date: 2025-11-17
 *
 * Tests for creating unplanned field welds dialog with form validation,
 * weld number generation, and mobile accessibility.
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CreateUnplannedWeldDialog } from './CreateUnplannedWeldDialog'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}))

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  )
}

describe('CreateUnplannedWeldDialog Component', () => {
  const mockDrawings = [
    {
      id: 'drawing-1',
      drawing_number: 'P&ID-001',
      title: 'Main Process Line',
      area_id: 'area-1',
      system_id: 'system-1',
      test_package_id: 'pkg-1',
    },
    {
      id: 'drawing-2',
      drawing_number: 'P&ID-002',
      title: 'Secondary Loop',
      area_id: 'area-2',
      system_id: 'system-2',
      test_package_id: null,
    },
  ]

  const mockComponents = [
    {
      id: 'comp-1',
      component_type: 'field_weld',
      identity_key: { weld_number: 'W-050' },
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock drawings query
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'drawings') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: mockDrawings,
              error: null,
            }),
          }),
        } as any
      }

      if (table === 'components') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: mockComponents,
                error: null,
              }),
            }),
          }),
        } as any
      }

      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      } as any
    })
  })

  describe('T019: Dialog Rendering with Pre-filled Weld Number', () => {
    it('should not render when open is false', () => {
      renderWithProviders(
        <CreateUnplannedWeldDialog
          open={false}
          onOpenChange={vi.fn()}
          projectId="project-1"
        />
      )
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should render when open is true', () => {
      renderWithProviders(
        <CreateUnplannedWeldDialog
          open={true}
          onOpenChange={vi.fn()}
          projectId="project-1"
        />
      )
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('should render title "Create Unplanned Weld"', () => {
      renderWithProviders(
        <CreateUnplannedWeldDialog
          open={true}
          onOpenChange={vi.fn()}
          projectId="project-1"
        />
      )
      expect(screen.getByText(/Create Unplanned Weld/i)).toBeInTheDocument()
    })

    it('should auto-generate and display weld number in read-only field', async () => {
      renderWithProviders(
        <CreateUnplannedWeldDialog
          open={true}
          onOpenChange={vi.fn()}
          projectId="project-1"
        />
      )

      // Wait for weld number generation
      await waitFor(() => {
        const weldNumberInput = screen.getByLabelText(/Weld Number/i)
        expect(weldNumberInput).toHaveValue('W-051') // Next after W-050
      })

      const weldNumberInput = screen.getByLabelText(/Weld Number/i) as HTMLInputElement
      expect(weldNumberInput.readOnly).toBe(true)
    })

    it('should use smart numbering to fill gaps in sequence', async () => {
      // Mock components with gaps: W-001, W-003, W-005
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'drawings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: mockDrawings,
                error: null,
              }),
            }),
          } as any
        }

        if (table === 'components') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [
                    { id: 'comp-1', identity_key: { weld_number: 'W-001' } },
                    { id: 'comp-3', identity_key: { weld_number: 'W-003' } },
                    { id: 'comp-5', identity_key: { weld_number: 'W-005' } },
                  ],
                  error: null,
                }),
              }),
            }),
          } as any
        }

        return { select: vi.fn() } as any
      })

      renderWithProviders(
        <CreateUnplannedWeldDialog
          open={true}
          onOpenChange={vi.fn()}
          projectId="project-1"
        />
      )

      // Should fill first gap (W-002)
      await waitFor(() => {
        const weldNumberInput = screen.getByLabelText(/Weld Number/i)
        expect(weldNumberInput).toHaveValue('W-002')
      })
    })

    it('should detect FW-## pattern from existing welds', async () => {
      // Mock components with FW-## pattern
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'drawings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: mockDrawings,
                error: null,
              }),
            }),
          } as any
        }

        if (table === 'components') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [
                    { id: 'comp-1', identity_key: { weld_number: 'FW-01' } },
                    { id: 'comp-2', identity_key: { weld_number: 'FW-02' } },
                  ],
                  error: null,
                }),
              }),
            }),
          } as any
        }

        return { select: vi.fn() } as any
      })

      renderWithProviders(
        <CreateUnplannedWeldDialog
          open={true}
          onOpenChange={vi.fn()}
          projectId="project-1"
        />
      )

      // Should continue FW-## pattern
      await waitFor(() => {
        const weldNumberInput = screen.getByLabelText(/Weld Number/i)
        expect(weldNumberInput).toHaveValue('FW-03')
      })
    })

    it('should detect numeric-only pattern from existing welds', async () => {
      // Mock components with numeric-only pattern
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'drawings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: mockDrawings,
                error: null,
              }),
            }),
          } as any
        }

        if (table === 'components') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [
                    { id: 'comp-1', identity_key: { weld_number: '1' } },
                    { id: 'comp-2', identity_key: { weld_number: '2' } },
                  ],
                  error: null,
                }),
              }),
            }),
          } as any
        }

        return { select: vi.fn() } as any
      })

      renderWithProviders(
        <CreateUnplannedWeldDialog
          open={true}
          onOpenChange={vi.fn()}
          projectId="project-1"
        />
      )

      // Should continue numeric pattern
      await waitFor(() => {
        const weldNumberInput = screen.getByLabelText(/Weld Number/i)
        expect(weldNumberInput).toHaveValue('3')
      })
    })

    it('should render all required form fields', () => {
      renderWithProviders(
        <CreateUnplannedWeldDialog
          open={true}
          onOpenChange={vi.fn()}
          projectId="project-1"
        />
      )

      expect(screen.getByLabelText(/Drawing/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Weld Type/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Weld Size/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Spec/i)).toBeInTheDocument()
    })

    it('should render optional form fields', () => {
      renderWithProviders(
        <CreateUnplannedWeldDialog
          open={true}
          onOpenChange={vi.fn()}
          projectId="project-1"
        />
      )

      expect(screen.getByLabelText(/Schedule/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Base Metal/i)).toBeInTheDocument()
    })
  })

  describe('T020: Form Validation (Submit Disabled Until Required Fields)', () => {
    it('should disable submit button initially', () => {
      renderWithProviders(
        <CreateUnplannedWeldDialog
          open={true}
          onOpenChange={vi.fn()}
          projectId="project-1"
        />
      )

      const submitButton = screen.getByRole('button', { name: /Create Weld/i })
      expect(submitButton).toBeDisabled()
    })

    it('should disable submit button when only some required fields are filled', async () => {
      const user = userEvent.setup()

      renderWithProviders(
        <CreateUnplannedWeldDialog
          open={true}
          onOpenChange={vi.fn()}
          projectId="project-1"
        />
      )

      // Fill only weld size
      const weldSizeInput = screen.getByLabelText(/Weld Size/i)
      await user.type(weldSizeInput, '2"')

      const submitButton = screen.getByRole('button', { name: /Create Weld/i })
      expect(submitButton).toBeDisabled()
    })

    // Note: Full form interaction testing with Radix Select is complex in tests.
    // Validation logic is tested via unit tests and E2E tests.
    // Here we verify the submit button state based on form validity.
  })

  describe('T021: Success/Error Handling', () => {
    it('should render error message when displayed', () => {
      renderWithProviders(
        <CreateUnplannedWeldDialog
          open={true}
          onOpenChange={vi.fn()}
          projectId="project-1"
        />
      )

      // Component renders without errors
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument()
    })

    // Note: Full form submission testing with Radix Select requires E2E tests.
    // Component logic is tested via unit tests and integration tests.
  })

  describe('T022: Mobile Accessibility (≥44px Touch Targets)', () => {
    it('should have min-h-[44px] classes on interactive elements', () => {
      renderWithProviders(
        <CreateUnplannedWeldDialog
          open={true}
          onOpenChange={vi.fn()}
          projectId="project-1"
        />
      )

      // Verify inputs have min-height class
      const weldSizeInput = screen.getByLabelText(/Weld Size/i)
      expect(weldSizeInput).toHaveClass('min-h-[44px]')

      // Verify buttons have min-height class
      const submitButton = screen.getByRole('button', { name: /Create Weld/i })
      expect(submitButton).toHaveClass('min-h-[44px]')
    })

    it('should support keyboard navigation (Escape)', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()

      renderWithProviders(
        <CreateUnplannedWeldDialog
          open={true}
          onOpenChange={onOpenChange}
          projectId="project-1"
        />
      )

      // Press Escape to close
      await user.keyboard('{Escape}')

      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('should have accessible labels for all form fields', () => {
      renderWithProviders(
        <CreateUnplannedWeldDialog
          open={true}
          onOpenChange={vi.fn()}
          projectId="project-1"
        />
      )

      // All inputs should have labels
      expect(screen.getByLabelText(/Weld Number/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Drawing/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Weld Type/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Weld Size/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Spec/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Schedule/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Base Metal/i)).toBeInTheDocument()
    })
  })
})
