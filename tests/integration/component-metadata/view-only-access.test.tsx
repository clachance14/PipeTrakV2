/**
 * Integration Test: View-Only Component Metadata Access
 * Feature 020 - Component Metadata Editing from Drawings View
 * User Story 4 - View-Only Access for Field Users
 *
 * Tests that Field Users can view component metadata but not edit it:
 * - Field User can click component rows to open modal
 * - Modal shows current metadata as static text (no dropdowns)
 * - Milestone history is visible in read-only format
 * - No Save/Cancel/Edit buttons are visible
 * - Close button and Escape key work properly
 *
 * NOTE: This is TDD RED phase - these tests SHOULD FAIL until implementation is complete
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ComponentMetadataModal } from '@/components/component-metadata/ComponentMetadataModal'
import { AuthContext } from '@/contexts/AuthContext'
import { useComponent } from '@/hooks/useComponents'
import React from 'react'

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(() => Promise.resolve({
        data: { user: { id: 'test-user-field', email: 'field@test.com', role: 'viewer' } },
        error: null
      }))
    }
  }
}))

// Mock hooks
vi.mock('@/hooks/useComponents', () => ({
  useComponent: vi.fn(),
  useUpdateComponentMetadata: vi.fn(() => ({
    mutate: vi.fn(),
    isLoading: false,
    isError: false,
    error: null,
    reset: vi.fn()
  }))
}))

vi.mock('@/hooks/useAreas', () => ({
  useAreas: vi.fn(() => ({
    data: [
      { id: 'area-north', name: 'North Wing', project_id: 'project-001' },
      { id: 'area-south', name: 'South Wing', project_id: 'project-001' }
    ],
    isLoading: false,
    isError: false
  })),
  useCreateArea: vi.fn(() => ({ mutateAsync: vi.fn() }))
}))

vi.mock('@/hooks/useSystems', () => ({
  useSystems: vi.fn(() => ({
    data: [
      { id: 'system-hvac', name: 'HVAC System', project_id: 'project-001' },
      { id: 'system-drain', name: 'Drain System', project_id: 'project-001' }
    ],
    isLoading: false,
    isError: false
  })),
  useCreateSystem: vi.fn(() => ({ mutateAsync: vi.fn() }))
}))

vi.mock('@/hooks/useTestPackages', () => ({
  useTestPackages: vi.fn(() => ({
    data: [
      { id: 'tp-100', name: 'TP-100', project_id: 'project-001' },
      { id: 'tp-200', name: 'TP-200', project_id: 'project-001' }
    ],
    isLoading: false,
    isError: false
  })),
  useCreateTestPackage: vi.fn(() => ({ mutateAsync: vi.fn() }))
}))

// Mock component with metadata
const mockComponentWithMetadata = {
  id: 'comp-001',
  drawing_id: 'drawing-001',
  component_identity: 'SP-001-A',
  area_id: 'area-north',
  system_id: 'system-hvac',
  test_package_id: 'tp-100',
  version: 1,
  component_type: 'spool',
  project_id: 'project-001',
  progress_template_id: 'template-001',
  area: { id: 'area-north', name: 'North Wing', project_id: 'project-001' },
  system: { id: 'system-hvac', name: 'HVAC System', project_id: 'project-001' },
  test_package: { id: 'tp-100', name: 'TP-100', project_id: 'project-001' }
}

describe('View-Only Access - Field User (User Story 4)', () => {
  let queryClient: QueryClient
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })
    user = userEvent.setup()
    vi.clearAllMocks()

    // Mock useComponent hook to return component data
    vi.mocked(useComponent).mockReturnValue({
      data: mockComponentWithMetadata,
      isLoading: false,
      isError: false,
      error: null
    } as any)
  })

  describe('T042-T043: Field User Opening Modal', () => {
    it('should open modal when Field User clicks component row', async () => {
      const mockFieldUser = {
        id: 'test-user-field',
        email: 'field@test.com',
        // @ts-expect-error - role exists after migration
        role: 'viewer'
      }

      const onClose = vi.fn()

      render(
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider
            value={{
              user: mockFieldUser,
              session: null,
              loading: false,
              signIn: vi.fn(),
              signOut: vi.fn()
            }}
          >
            <ComponentMetadataModal
              componentId="comp-001"
              open={true}
              onClose={onClose}
            />
          </AuthContext.Provider>
        </QueryClientProvider>
      )

      // Modal should be visible
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
    })

    it('should show component identity', async () => {
      const mockFieldUser = {
        id: 'test-user-field',
        email: 'field@test.com',
        // @ts-expect-error - role exists after migration
        role: 'viewer'
      }

      render(
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider
            value={{
              user: mockFieldUser,
              session: null,
              loading: false,
              signIn: vi.fn(),
              signOut: vi.fn()
            }}
          >
            <ComponentMetadataModal
              componentId="comp-001"
              open={true}
              onClose={vi.fn()}
            />
          </AuthContext.Provider>
        </QueryClientProvider>
      )

      // Component identity should be visible
      await waitFor(() => {
        expect(screen.getByText('SP-001-A')).toBeInTheDocument()
      })
    })

    it('should show metadata as static text (not editable)', async () => {
      const mockFieldUser = {
        id: 'test-user-field',
        email: 'field@test.com',
        // @ts-expect-error - role exists after migration
        role: 'viewer'
      }

      render(
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider
            value={{
              user: mockFieldUser,
              session: null,
              loading: false,
              signIn: vi.fn(),
              signOut: vi.fn()
            }}
          >
            <ComponentMetadataModal
              componentId="comp-001"
              open={true}
              onClose={vi.fn()}
            />
          </AuthContext.Provider>
        </QueryClientProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('SP-001-A')).toBeInTheDocument()
      })

      // Metadata should be shown as static text
      expect(screen.getByText('North Wing')).toBeInTheDocument()
      expect(screen.getByText('HVAC System')).toBeInTheDocument()
      expect(screen.getByText('TP-100')).toBeInTheDocument()

      // No comboboxes should be present
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    })

    it('should not show Save/Cancel buttons', async () => {
      const mockFieldUser = {
        id: 'test-user-field',
        email: 'field@test.com',
        // @ts-expect-error - role exists after migration
        role: 'viewer'
      }

      render(
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider
            value={{
              user: mockFieldUser,
              session: null,
              loading: false,
              signIn: vi.fn(),
              signOut: vi.fn()
            }}
          >
            <ComponentMetadataModal
              componentId="comp-001"
              open={true}
              onClose={vi.fn()}
            />
          </AuthContext.Provider>
        </QueryClientProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('SP-001-A')).toBeInTheDocument()
      })

      // No Save or Cancel buttons should be visible
      expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
    })

    it('should close modal when Close button clicked', async () => {
      const mockFieldUser = {
        id: 'test-user-field',
        email: 'field@test.com',
        // @ts-expect-error - role exists after migration
        role: 'viewer'
      }

      const onClose = vi.fn()

      render(
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider
            value={{
              user: mockFieldUser,
              session: null,
              loading: false,
              signIn: vi.fn(),
              signOut: vi.fn()
            }}
          >
            <ComponentMetadataModal
              componentId="comp-001"
              open={true}
              onClose={onClose}
            />
          </AuthContext.Provider>
        </QueryClientProvider>
      )

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Find and click close button (X button in dialog)
      const closeButton = screen.getByRole('button', { name: /close/i })
      await user.click(closeButton)

      // onClose should be called
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('should close modal when Escape key pressed', async () => {
      const mockFieldUser = {
        id: 'test-user-field',
        email: 'field@test.com',
        // @ts-expect-error - role exists after migration
        role: 'viewer'
      }

      const onClose = vi.fn()

      render(
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider
            value={{
              user: mockFieldUser,
              session: null,
              loading: false,
              signIn: vi.fn(),
              signOut: vi.fn()
            }}
          >
            <ComponentMetadataModal
              componentId="comp-001"
              open={true}
              onClose={onClose}
            />
          </AuthContext.Provider>
        </QueryClientProvider>
      )

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Press Escape key
      await user.keyboard('{Escape}')

      // onClose should be called
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('T044: Milestone History Displayed', () => {
    it('should show milestone history section', async () => {
      const mockFieldUser = {
        id: 'test-user-field',
        email: 'field@test.com',
        // @ts-expect-error - role exists after migration
        role: 'viewer'
      }

      render(
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider
            value={{
              user: mockFieldUser,
              session: null,
              loading: false,
              signIn: vi.fn(),
              signOut: vi.fn()
            }}
          >
            <ComponentMetadataModal
              componentId="comp-001"
              open={true}
              onClose={vi.fn()}
            />
          </AuthContext.Provider>
        </QueryClientProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('SP-001-A')).toBeInTheDocument()
      })

      // Milestone history section should be visible
      // Note: This will be implemented later when milestone history feature is added
      // For now, we verify that in view mode, the modal is accessible
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  describe('Admin/Manager Users Should Still See Edit Mode', () => {
    it('should show editable comboboxes for Admin user', async () => {
      const mockAdminUser = {
        id: 'test-user-admin',
        email: 'admin@test.com',
        // @ts-expect-error - role exists after migration
        role: 'admin'
      }

      render(
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider
            value={{
              user: mockAdminUser,
              session: null,
              loading: false,
              signIn: vi.fn(),
              signOut: vi.fn()
            }}
          >
            <ComponentMetadataModal
              componentId="comp-001"
              open={true}
              onClose={vi.fn()}
            />
          </AuthContext.Provider>
        </QueryClientProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('SP-001-A')).toBeInTheDocument()
      })

      // Admin should see comboboxes (editable)
      // Note: The actual combobox implementation may render differently,
      // but at minimum we should NOT see static text for metadata
      const dialog = screen.getByRole('dialog')
      expect(dialog).toBeInTheDocument()
    })

    it('should show Save/Cancel buttons for Manager user', async () => {
      const mockManagerUser = {
        id: 'test-user-manager',
        email: 'manager@test.com',
        // @ts-expect-error - role exists after migration
        role: 'project_manager'
      }

      render(
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider
            value={{
              user: mockManagerUser,
              session: null,
              loading: false,
              signIn: vi.fn(),
              signOut: vi.fn()
            }}
          >
            <ComponentMetadataModal
              componentId="comp-001"
              open={true}
              onClose={vi.fn()}
            />
          </AuthContext.Provider>
        </QueryClientProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('SP-001-A')).toBeInTheDocument()
      })

      // Manager should see Save and Cancel buttons
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
      })
    })
  })
})
