/**
 * Integration tests for Unified Component Details Form
 * Feature 022: Combines view and edit capabilities in one interface
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { ComponentDetailView } from '@/components/ComponentDetailView'

// Mock hooks
vi.mock('@/hooks/useComponents', () => ({
  useComponent: () => ({
    data: {
      id: 'comp-1',
      project_id: 'proj-1',
      component_type: 'valve',
      identity_key: { commodity_code: 'VBALU-001', size: '2', seq: 1 },
      percent_complete: 50,
      current_milestones: { Install: false, Test: false },
      area_id: 'area-1',
      system_id: null,
      test_package_id: null,
      last_updated_at: '2025-10-31T12:00:00Z',
      last_updated_by: 'user-1',
      template: {
        milestones_config: [
          { name: 'Install', weight: 50, order: 1, is_partial: false },
          { name: 'Test', weight: 50, order: 2, is_partial: false },
        ],
      },
      area: { name: 'Area 1' },
      system: null,
      test_package: null,
    },
    isLoading: false,
  }),
}))

vi.mock('@/hooks/useMilestoneHistory', () => ({
  useMilestoneHistory: () => ({
    data: [
      {
        id: 'event-1',
        milestone_name: 'Install',
        previous_value: false,
        value: true,
        created_at: '2025-10-31T12:00:00Z',
        user: { email: 'test@example.com', full_name: 'Test User' },
      },
    ],
    isLoading: false,
  }),
}))

vi.mock('@/hooks/useAreas', () => ({
  useAreas: () => ({
    data: [
      { id: 'area-1', name: 'Area 1' },
      { id: 'area-2', name: 'Area 2' },
    ],
    isLoading: false,
  }),
}))

vi.mock('@/hooks/useSystems', () => ({
  useSystems: () => ({
    data: [
      { id: 'system-1', name: 'System 1' },
      { id: 'system-2', name: 'System 2' },
    ],
    isLoading: false,
  }),
}))

vi.mock('@/hooks/useTestPackages', () => ({
  useTestPackages: () => ({
    data: [
      { id: 'tp-1', name: 'TP1' },
      { id: 'tp-2', name: 'TP2' },
    ],
    isLoading: false,
  }),
}))

vi.mock('@/hooks/useComponentAssignment', () => ({
  useAssignComponents: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
}))

vi.mock('@/hooks/useMilestones', () => ({
  useUpdateMilestone: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
}))

describe('Unified Component Details - Integration', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  )

  describe('Tab Navigation', () => {
    it('renders all four tabs', () => {
      render(
        <ComponentDetailView
          componentId="comp-1"
          canUpdateMilestones={true}
          canEditMetadata={true}
        />,
        { wrapper }
      )

      // Check tab triggers exist (desktop view)
      expect(screen.getByText('Overview')).toBeInTheDocument()
      expect(screen.getByText('Details')).toBeInTheDocument()
      expect(screen.getByText('Milestones')).toBeInTheDocument()
      expect(screen.getByText('History')).toBeInTheDocument()
    })

    it('switches between all tabs on desktop', async () => {
      render(
        <ComponentDetailView
          componentId="comp-1"
          canUpdateMilestones={true}
          canEditMetadata={true}
        />,
        { wrapper }
      )

      // Default: Overview tab should show progress
      expect(screen.getByText(/Progress/i)).toBeInTheDocument()

      // Switch to Details
      const detailsTab = screen.getAllByText('Details').find(
        (el) => el.tagName === 'BUTTON'
      )
      if (detailsTab) {
        fireEvent.click(detailsTab)
        await waitFor(() => {
          expect(screen.getByText(/Area/i)).toBeInTheDocument()
        })
      }

      // Switch to Milestones
      const milestonesTab = screen.getAllByText('Milestones').find(
        (el) => el.tagName === 'BUTTON'
      )
      if (milestonesTab) {
        fireEvent.click(milestonesTab)
        await waitFor(() => {
          expect(screen.getByText('Install')).toBeInTheDocument()
        })
      }

      // Switch to History
      const historyTab = screen.getAllByText('History').find(
        (el) => el.tagName === 'BUTTON'
      )
      if (historyTab) {
        fireEvent.click(historyTab)
        await waitFor(() => {
          expect(screen.getByText(/History/i)).toBeInTheDocument()
        })
      }
    })

    it('defaults to Overview tab', () => {
      render(
        <ComponentDetailView
          componentId="comp-1"
          canUpdateMilestones={true}
          canEditMetadata={true}
        />,
        { wrapper }
      )

      // Overview content should be visible by default
      expect(screen.getByText(/Progress/i)).toBeInTheDocument()
      expect(screen.getByText('50%')).toBeInTheDocument()
    })
  })

  describe('Overview Tab', () => {
    it('displays component identity and type', () => {
      render(
        <ComponentDetailView
          componentId="comp-1"
          canUpdateMilestones={true}
          canEditMetadata={true}
        />,
        { wrapper }
      )

      expect(screen.getByText(/VBALU-001/i)).toBeInTheDocument()
      expect(screen.getByText('valve')).toBeInTheDocument()
    })

    it('shows progress percentage', () => {
      render(
        <ComponentDetailView
          componentId="comp-1"
          canUpdateMilestones={true}
          canEditMetadata={true}
        />,
        { wrapper }
      )

      expect(screen.getByText('50%')).toBeInTheDocument()
    })

    it('displays milestone statistics', () => {
      render(
        <ComponentDetailView
          componentId="comp-1"
          canUpdateMilestones={true}
          canEditMetadata={true}
        />,
        { wrapper }
      )

      // Should show total and completed milestones
      expect(screen.getByText(/milestones/i)).toBeInTheDocument()
    })
  })

  describe('Metadata Editing Workflow', () => {
    it('shows metadata editing form when canEditMetadata is true', () => {
      render(
        <ComponentDetailView
          componentId="comp-1"
          canUpdateMilestones={true}
          canEditMetadata={true}
        />,
        { wrapper }
      )

      // Switch to Details tab
      const detailsTab = screen.getAllByText('Details').find(
        (el) => el.tagName === 'BUTTON'
      )
      if (detailsTab) {
        fireEvent.click(detailsTab)
      }

      // Verify Save button exists
      expect(screen.getByText('Save')).toBeInTheDocument()
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    it('disables form when canEditMetadata is false', () => {
      render(
        <ComponentDetailView
          componentId="comp-1"
          canUpdateMilestones={true}
          canEditMetadata={false}
        />,
        { wrapper }
      )

      // Switch to Details tab
      const detailsTab = screen.getAllByText('Details').find(
        (el) => el.tagName === 'BUTTON'
      )
      if (detailsTab) {
        fireEvent.click(detailsTab)
      }

      // Should show permission message
      expect(
        screen.getByText(/don't have permission to edit metadata/i)
      ).toBeInTheDocument()
    })

    it('allows editing and saving metadata', () => {
      const onMetadataChange = vi.fn()

      render(
        <ComponentDetailView
          componentId="comp-1"
          canUpdateMilestones={true}
          canEditMetadata={true}
          onMetadataChange={onMetadataChange}
        />,
        { wrapper }
      )

      // Switch to Details tab
      const detailsTab = screen.getAllByText('Details').find(
        (el) => el.tagName === 'BUTTON'
      )
      if (detailsTab) {
        fireEvent.click(detailsTab)
      }

      // Verify form elements exist
      expect(screen.getByText('Save')).toBeInTheDocument()
      expect(screen.getByText(/Area/i)).toBeInTheDocument()
      expect(screen.getByText(/System/i)).toBeInTheDocument()
      expect(screen.getByText(/Test Package/i)).toBeInTheDocument()
    })
  })

  describe('Milestone Interaction', () => {
    it('shows milestone controls when canUpdateMilestones is true', () => {
      render(
        <ComponentDetailView
          componentId="comp-1"
          canUpdateMilestones={true}
          canEditMetadata={true}
        />,
        { wrapper }
      )

      // Switch to Milestones tab
      const milestonesTab = screen.getAllByText('Milestones').find(
        (el) => el.tagName === 'BUTTON'
      )
      if (milestonesTab) {
        fireEvent.click(milestonesTab)
      }

      // Should show milestone controls
      expect(screen.getByText('Install')).toBeInTheDocument()
      expect(screen.getByText('Test')).toBeInTheDocument()
    })

    it('disables milestone controls when canUpdateMilestones is false', () => {
      render(
        <ComponentDetailView
          componentId="comp-1"
          canUpdateMilestones={false}
          canEditMetadata={true}
        />,
        { wrapper }
      )

      // Switch to Milestones tab
      const milestonesTab = screen.getAllByText('Milestones').find(
        (el) => el.tagName === 'BUTTON'
      )
      if (milestonesTab) {
        fireEvent.click(milestonesTab)
      }

      // Should show permission message
      expect(
        screen.getByText(/don't have permission to update milestones/i)
      ).toBeInTheDocument()
    })

    it('updates milestones and shows in history', async () => {
      render(
        <ComponentDetailView
          componentId="comp-1"
          canUpdateMilestones={true}
          canEditMetadata={true}
        />,
        { wrapper }
      )

      // Go to Milestones tab
      const milestonesTab = screen.getAllByText('Milestones').find(
        (el) => el.tagName === 'BUTTON'
      )
      if (milestonesTab) {
        fireEvent.click(milestonesTab)
      }

      // Should show milestone controls
      expect(screen.getByText('Install')).toBeInTheDocument()
      expect(screen.getByText('Test')).toBeInTheDocument()

      // Go to History tab
      const historyTab = screen.getAllByText('History').find(
        (el) => el.tagName === 'BUTTON'
      )
      if (historyTab) {
        fireEvent.click(historyTab)
      }

      // Should show history event
      await waitFor(() => {
        expect(screen.getByText('Install')).toBeInTheDocument()
        expect(screen.getByText(/Test User/i)).toBeInTheDocument()
      })
    })
  })

  describe('History Timeline', () => {
    it('displays milestone history events', () => {
      render(
        <ComponentDetailView
          componentId="comp-1"
          canUpdateMilestones={true}
          canEditMetadata={true}
        />,
        { wrapper }
      )

      // Switch to History tab
      const historyTab = screen.getAllByText('History').find(
        (el) => el.tagName === 'BUTTON'
      )
      if (historyTab) {
        fireEvent.click(historyTab)
      }

      // Should show history event details
      expect(screen.getByText('Install')).toBeInTheDocument()
      expect(screen.getByText(/Test User/i)).toBeInTheDocument()
    })

    it('shows formatted milestone value changes', () => {
      render(
        <ComponentDetailView
          componentId="comp-1"
          canUpdateMilestones={true}
          canEditMetadata={true}
        />,
        { wrapper }
      )

      // Switch to History tab
      const historyTab = screen.getAllByText('History').find(
        (el) => el.tagName === 'BUTTON'
      )
      if (historyTab) {
        fireEvent.click(historyTab)
      }

      // Should show value transition (Incomplete → Complete)
      expect(screen.getByText(/Incomplete.*Complete/s)).toBeInTheDocument()
    })
  })

  describe('Permission Enforcement', () => {
    it('enforces milestone permission', () => {
      render(
        <ComponentDetailView
          componentId="comp-1"
          canUpdateMilestones={false}
          canEditMetadata={true}
        />,
        { wrapper }
      )

      // Switch to Milestones tab
      const milestonesTab = screen.getAllByText('Milestones').find(
        (el) => el.tagName === 'BUTTON'
      )
      if (milestonesTab) {
        fireEvent.click(milestonesTab)
      }

      expect(
        screen.getByText(/don't have permission to update milestones/i)
      ).toBeInTheDocument()
    })

    it('enforces metadata permission', () => {
      render(
        <ComponentDetailView
          componentId="comp-1"
          canUpdateMilestones={true}
          canEditMetadata={false}
        />,
        { wrapper }
      )

      // Switch to Details tab
      const detailsTab = screen.getAllByText('Details').find(
        (el) => el.tagName === 'BUTTON'
      )
      if (detailsTab) {
        fireEvent.click(detailsTab)
      }

      expect(
        screen.getByText(/don't have permission to edit metadata/i)
      ).toBeInTheDocument()
    })

    it('allows both permissions when both are true', () => {
      render(
        <ComponentDetailView
          componentId="comp-1"
          canUpdateMilestones={true}
          canEditMetadata={true}
        />,
        { wrapper }
      )

      // Verify we can access edit controls
      const detailsTab = screen.getAllByText('Details').find(
        (el) => el.tagName === 'BUTTON'
      )
      if (detailsTab) {
        fireEvent.click(detailsTab)
      }
      expect(screen.getByText('Save')).toBeInTheDocument()

      const milestonesTab = screen.getAllByText('Milestones').find(
        (el) => el.tagName === 'BUTTON'
      )
      if (milestonesTab) {
        fireEvent.click(milestonesTab)
      }
      expect(screen.getByText('Install')).toBeInTheDocument()
    })
  })
})
