/**
 * Unit tests for MilestoneEventHistory component
 * Tests milestone event history display with rollback reason support
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { MilestoneEventHistory } from './MilestoneEventHistory'
import * as useMilestonesModule from '@/hooks/useMilestones'

// Mock the useMilestoneEvents hook
vi.mock('@/hooks/useMilestones', () => ({
  useMilestoneEvents: vi.fn(),
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0 },
    },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('MilestoneEventHistory', () => {
  const mockComponentId = 'component-123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('displays rollback reason label when present in metadata', () => {
    const mockEvents = [
      {
        id: 'event-1',
        component_id: mockComponentId,
        milestone_name: 'Install',
        action: 'rollback',
        value: 0,
        previous_value: 100,
        user_id: 'user-1',
        created_at: '2024-10-19T15:30:45.000000+00:00',
        metadata: {
          rollback_reason: 'qc_rejection',
          rollback_reason_label: 'QC/QA rejection',
        },
      },
    ]

    vi.mocked(useMilestonesModule.useMilestoneEvents).mockReturnValue({
      data: mockEvents,
      isLoading: false,
    } as any)

    render(
      React.createElement(
        createWrapper(),
        null,
        React.createElement(MilestoneEventHistory, { componentId: mockComponentId })
      )
    )

    expect(screen.getByText(/Install/)).toBeInTheDocument()
    expect(screen.getByText(/Reason:/)).toBeInTheDocument()
    expect(screen.getByText(/QC\/QA rejection/)).toBeInTheDocument()
  })

  it('displays rollback details when present in metadata', () => {
    const mockEvents = [
      {
        id: 'event-1',
        component_id: mockComponentId,
        milestone_name: 'Install',
        action: 'rollback',
        value: 0,
        previous_value: 100,
        user_id: 'user-1',
        created_at: '2024-10-19T15:30:45.000000+00:00',
        metadata: {
          rollback_reason: 'qc_rejection',
          rollback_reason_label: 'QC/QA rejection',
          rollback_details: 'Weld failed X-ray, porosity detected',
        },
      },
    ]

    vi.mocked(useMilestonesModule.useMilestoneEvents).mockReturnValue({
      data: mockEvents,
      isLoading: false,
    } as any)

    render(
      React.createElement(
        createWrapper(),
        null,
        React.createElement(MilestoneEventHistory, { componentId: mockComponentId })
      )
    )

    expect(screen.getByText(/Install/)).toBeInTheDocument()
    expect(screen.getByText(/Reason:/)).toBeInTheDocument()
    expect(screen.getByText(/QC\/QA rejection/)).toBeInTheDocument()
    expect(screen.getByText(/Weld failed X-ray, porosity detected/)).toBeInTheDocument()
  })

  it('does not display rollback info for non-rollback events', () => {
    const mockEvents = [
      {
        id: 'event-1',
        component_id: mockComponentId,
        milestone_name: 'Install',
        action: 'complete',
        value: 100,
        previous_value: 0,
        user_id: 'user-1',
        created_at: '2024-10-19T15:30:45.000000+00:00',
        metadata: null,
      },
    ]

    vi.mocked(useMilestonesModule.useMilestoneEvents).mockReturnValue({
      data: mockEvents,
      isLoading: false,
    } as any)

    render(
      React.createElement(
        createWrapper(),
        null,
        React.createElement(MilestoneEventHistory, { componentId: mockComponentId })
      )
    )

    expect(screen.getByText(/Install/)).toBeInTheDocument()
    expect(screen.queryByText(/Reason:/)).not.toBeInTheDocument()
  })

  it('does not display rollback info when metadata lacks rollback_reason_label', () => {
    const mockEvents = [
      {
        id: 'event-1',
        component_id: mockComponentId,
        milestone_name: 'Install',
        action: 'rollback',
        value: 0,
        previous_value: 100,
        user_id: 'user-1',
        created_at: '2024-10-19T15:30:45.000000+00:00',
        metadata: null,
      },
    ]

    vi.mocked(useMilestonesModule.useMilestoneEvents).mockReturnValue({
      data: mockEvents,
      isLoading: false,
    } as any)

    render(
      React.createElement(
        createWrapper(),
        null,
        React.createElement(MilestoneEventHistory, { componentId: mockComponentId })
      )
    )

    expect(screen.getByText(/Install/)).toBeInTheDocument()
    expect(screen.queryByText(/Reason:/)).not.toBeInTheDocument()
  })

  it('displays rollback events with amber/warning styling', () => {
    const mockEvents = [
      {
        id: 'event-1',
        component_id: mockComponentId,
        milestone_name: 'Install',
        action: 'rollback',
        value: 0,
        previous_value: 100,
        user_id: 'user-1',
        created_at: '2024-10-19T15:30:45.000000+00:00',
        metadata: {
          rollback_reason: 'qc_rejection',
          rollback_reason_label: 'QC/QA rejection',
        },
      },
    ]

    vi.mocked(useMilestonesModule.useMilestoneEvents).mockReturnValue({
      data: mockEvents,
      isLoading: false,
    } as any)

    const { container } = render(
      React.createElement(
        createWrapper(),
        null,
        React.createElement(MilestoneEventHistory, { componentId: mockComponentId })
      )
    )

    // Verify rollback icon is displayed with yellow/amber color
    const rollbackIcon = container.querySelector('.text-yellow-600')
    expect(rollbackIcon).toBeInTheDocument()
    expect(rollbackIcon?.textContent).toBe('↶')
  })
})
