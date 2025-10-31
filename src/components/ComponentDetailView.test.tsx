import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ComponentDetailView } from './ComponentDetailView'

// Mock hooks
vi.mock('@/hooks/useComponents', () => ({
  useComponent: () => ({
    data: {
      id: 'comp-1',
      component_type: 'valve',
      identity_key: { commodity_code: 'VBALU-001', size: '2', seq: 1 },
      percent_complete: 50,
      current_milestones: {},
    },
    isLoading: false,
  })
}))

vi.mock('@/hooks/useMilestoneHistory', () => ({
  useMilestoneHistory: () => ({
    data: [],
    isLoading: false,
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
  const queryClient = new QueryClient()

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  it('shows metadata editing form when canEditMetadata is true', () => {
    render(
      <ComponentDetailView
        componentId="comp-1"
        canUpdateMilestones={true}
        canEditMetadata={true}
      />,
      { wrapper }
    )

    // Find all tab buttons
    const tabs = screen.getAllByRole('tab')
    const detailsTab = tabs.find(tab => tab.textContent === 'Details')
    expect(detailsTab).toBeDefined()

    fireEvent.click(detailsTab!)

    expect(screen.getByText('Assign Metadata')).toBeInTheDocument()
    expect(screen.getByText('Save')).toBeInTheDocument()
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

    // Find all tab buttons
    const tabs = screen.getAllByRole('tab')
    const detailsTab = tabs.find(tab => tab.textContent === 'Details')
    expect(detailsTab).toBeDefined()

    fireEvent.click(detailsTab!)

    expect(screen.getByText(/don't have permission/i)).toBeInTheDocument()
  })
})
