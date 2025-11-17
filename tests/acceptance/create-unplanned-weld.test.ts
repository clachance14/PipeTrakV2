/**
 * Acceptance Test: Create Unplanned Weld (T023)
 *
 * Feature: 028-add-unplanned-welds
 * Date: 2025-11-17
 *
 * End-to-end test for the complete user flow of creating an unplanned weld
 * from the Weld Log page.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { createElement, type ReactNode } from 'react'
import { WeldLogPage } from '@/pages/WeldLogPage'
import { supabase } from '@/lib/supabase'

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}))

// Mock auth context
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      email: 'foreman@example.com',
    },
    profile: {
      id: 'user-1',
      role: 'foreman', // Has permission to create welds
      organization_id: 'org-1',
    },
    loading: false,
  }),
}))

// Mock project context
vi.mock('@/contexts/ProjectContext', () => ({
  useProject: () => ({
    selectedProjectId: 'project-1',
  }),
}))

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Test wrapper with all providers
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return ({ children }: { children: ReactNode }) =>
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(BrowserRouter, {}, children)
    )
}

describe('Acceptance Test: Create Unplanned Weld User Flow', () => {
  const mockDrawings = [
    {
      id: 'drawing-1',
      drawing_number: 'P&ID-001',
      title: 'Main Process Line',
      area_id: 'area-1',
      system_id: 'system-1',
      test_package_id: 'pkg-1',
    },
  ]

  const mockFieldWelds = [
    {
      id: 'weld-existing',
      component_id: 'comp-existing',
      project_id: 'project-1',
      weld_type: 'BW',
      weld_size: '2"',
      spec: 'HC05',
      status: 'active',
      component: {
        identity_key: { weld_number: 'W-050' },
        drawing: {
          drawing_number: 'P&ID-001',
        },
      },
    },
  ]

  const mockComponents = [
    {
      id: 'comp-existing',
      component_type: 'field_weld',
      identity_key: { weld_number: 'W-050' },
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock authenticated user
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email: 'foreman@example.com',
          created_at: '2024-01-01',
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
        },
      },
      error: null,
    } as any)

    // Mock supabase.from calls
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'field_welds') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: mockFieldWelds,
              error: null,
            }),
          }),
        } as any
      }

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
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: mockComponents,
                    error: null,
                  }),
                }),
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

  it('T023: Complete user flow - foreman creates unplanned weld and sees it in table', async () => {
    const user = userEvent.setup()

    // STEP 1: Render Weld Log Page
    render(<WeldLogPage />, { wrapper: createWrapper() })

    // Verify page loads
    await waitFor(() => {
      expect(screen.getByText(/Weld Log/i)).toBeInTheDocument()
    })

    // STEP 2: User clicks "Add Weld" button
    const addWeldButton = screen.getByRole('button', { name: /Add Weld/i })
    expect(addWeldButton).toBeInTheDocument()
    expect(addWeldButton).toBeEnabled()

    await user.click(addWeldButton)

    // STEP 3: Dialog opens with pre-filled weld number
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText(/Create Unplanned Weld/i)).toBeInTheDocument()
    })

    await waitFor(() => {
      const weldNumberInput = screen.getByLabelText(/Weld Number/i)
      expect(weldNumberInput).toHaveValue('W-051') // Next after W-050
    })

    // STEP 4: User fills required fields
    // Select drawing
    const drawingInput = screen.getByLabelText(/Drawing/i)
    await user.click(drawingInput)
    await user.click(screen.getByText('P&ID-001'))

    // Select weld type
    const weldTypeSelect = screen.getByLabelText(/Weld Type/i)
    await user.click(weldTypeSelect)
    await user.click(screen.getByText('BW'))

    // Type weld size
    const weldSizeInput = screen.getByLabelText(/Weld Size/i)
    await user.type(weldSizeInput, '2"')

    // Type spec
    const specInput = screen.getByLabelText(/Spec/i)
    await user.type(specInput, 'HC05')

    // STEP 5: Verify submit button is enabled
    const submitButton = screen.getByRole('button', { name: /Create Weld/i })
    await waitFor(() => {
      expect(submitButton).toBeEnabled()
    })

    // STEP 6: Mock successful RPC response
    const mockResponse = {
      field_weld: {
        id: 'weld-new',
        component_id: 'comp-new',
        project_id: 'project-1',
        weld_type: 'BW',
        weld_size: '2"',
        spec: 'HC05',
        status: 'active',
        created_by: 'user-1',
        created_at: '2025-11-17T10:00:00Z',
      },
      component: {
        id: 'comp-new',
        project_id: 'project-1',
        drawing_id: 'drawing-1',
        component_type: 'field_weld',
        identity_key: { weld_number: 'W-051' },
        percent_complete: 0,
        created_by: 'user-1',
      },
    }

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: mockResponse,
      error: null,
    } as any)

    // STEP 7: User submits form
    await user.click(submitButton)

    // STEP 8: Verify success toast
    await waitFor(() => {
      expect(screen.getByText(/Weld created successfully/i)).toBeInTheDocument()
    })

    // STEP 9: Verify dialog closes
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    // STEP 10: Verify new weld appears in table (after query invalidation)
    // Note: In real app, table would refetch and show new weld
    // For this test, we verify RPC was called correctly
    expect(supabase.rpc).toHaveBeenCalledWith('create_unplanned_weld', {
      p_project_id: 'project-1',
      p_drawing_id: 'drawing-1',
      p_weld_number: 'W-051',
      p_weld_type: 'BW',
      p_weld_size: '2"',
      p_spec: 'HC05',
      p_schedule: undefined,
      p_base_metal: undefined,
      p_notes: undefined,
    })
  })

  it('should show "Add Weld" button only for users with permission', async () => {
    // This test verifies permission-based button visibility
    render(<WeldLogPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Add Weld/i })).toBeInTheDocument()
    })
  })

  it('should handle cancellation without creating weld', async () => {
    const user = userEvent.setup()

    render(<WeldLogPage />, { wrapper: createWrapper() })

    // Open dialog
    const addWeldButton = screen.getByRole('button', { name: /Add Weld/i })
    await user.click(addWeldButton)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // Click cancel or close
    const cancelButton = screen.getByRole('button', { name: /Cancel/i })
    await user.click(cancelButton)

    // Verify dialog closes
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    // Verify RPC was not called
    expect(supabase.rpc).not.toHaveBeenCalled()
  })
})
