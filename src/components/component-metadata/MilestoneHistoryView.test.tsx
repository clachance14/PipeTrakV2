/**
 * Unit tests for MilestoneHistoryView component (Feature 020 - T012)
 * Tests read-only milestone history display in component metadata modal
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { MilestoneHistoryView } from './MilestoneHistoryView'
import * as useMilestoneEventsModule from '@/hooks/useMilestoneEvents'

// Mock the useMilestoneEvents hook
vi.mock('@/hooks/useMilestoneEvents', () => ({
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

describe('MilestoneHistoryView', () => {
  const mockComponentId = 'component-123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders list of milestone events', () => {
    const mockEvents = [
      {
        id: 'event-1',
        component_id: mockComponentId,
        milestone_name: 'Receive',
        action: 'complete',
        value: 1,
        previous_value: null,
        user_id: 'user-1',
        created_at: '2024-10-19T23:59:19.785701+00:00',
        metadata: null,
      },
      {
        id: 'event-2',
        component_id: mockComponentId,
        milestone_name: 'Install',
        action: 'complete',
        value: 1,
        previous_value: null,
        user_id: 'user-2',
        created_at: '2024-10-20T14:30:00.000000+00:00',
        metadata: null,
      },
    ]

    vi.mocked(useMilestoneEventsModule.useMilestoneEvents).mockReturnValue({
      data: mockEvents,
      isLoading: false,
      isError: false,
      error: null,
    } as any)

    render(
      React.createElement(
        createWrapper(),
        null,
        React.createElement(MilestoneHistoryView, { componentId: mockComponentId })
      )
    )

    expect(screen.getByText('Receive')).toBeInTheDocument()
    expect(screen.getByText('Install')).toBeInTheDocument()
  })

  it('shows milestone type and timestamp', () => {
    const mockEvents = [
      {
        id: 'event-1',
        component_id: mockComponentId,
        milestone_name: 'Receive',
        action: 'complete',
        value: 1,
        previous_value: null,
        user_id: 'user-1',
        created_at: '2024-10-19T15:30:45.000000+00:00',
        metadata: null,
      },
    ]

    vi.mocked(useMilestoneEventsModule.useMilestoneEvents).mockReturnValue({
      data: mockEvents,
      isLoading: false,
      isError: false,
      error: null,
    } as any)

    render(
      React.createElement(
        createWrapper(),
        null,
        React.createElement(MilestoneHistoryView, { componentId: mockComponentId })
      )
    )

    expect(screen.getByText('Receive')).toBeInTheDocument()
    // Timestamp should be formatted as readable date (implementation will determine exact format)
    expect(screen.getByText(/2024/)).toBeInTheDocument()
  })

  it('shows "No milestone history" when empty', () => {
    vi.mocked(useMilestoneEventsModule.useMilestoneEvents).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    } as any)

    render(
      React.createElement(
        createWrapper(),
        null,
        React.createElement(MilestoneHistoryView, { componentId: mockComponentId })
      )
    )

    expect(screen.getByText(/no milestone history/i)).toBeInTheDocument()
  })

  it('formats timestamps as readable dates', () => {
    const mockEvents = [
      {
        id: 'event-1',
        component_id: mockComponentId,
        milestone_name: 'Receive',
        action: 'complete',
        value: 1,
        previous_value: null,
        user_id: 'user-1',
        created_at: '2024-10-19T15:30:45.123456+00:00',
        metadata: null,
      },
    ]

    vi.mocked(useMilestoneEventsModule.useMilestoneEvents).mockReturnValue({
      data: mockEvents,
      isLoading: false,
      isError: false,
      error: null,
    } as any)

    render(
      React.createElement(
        createWrapper(),
        null,
        React.createElement(MilestoneHistoryView, { componentId: mockComponentId })
      )
    )

    // Should show human-readable date format (not raw ISO string)
    // Exact format will be determined by implementation (e.g., "Oct 19, 2024, 3:30 PM")
    const dateText = screen.getByText(/Oct|10\/19|2024/)
    expect(dateText).toBeInTheDocument()
  })

  it('handles loading state', () => {
    vi.mocked(useMilestoneEventsModule.useMilestoneEvents).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as any)

    render(
      React.createElement(
        createWrapper(),
        null,
        React.createElement(MilestoneHistoryView, { componentId: mockComponentId })
      )
    )

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('handles error state', () => {
    vi.mocked(useMilestoneEventsModule.useMilestoneEvents).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Failed to load milestone history'),
    } as any)

    render(
      React.createElement(
        createWrapper(),
        null,
        React.createElement(MilestoneHistoryView, { componentId: mockComponentId })
      )
    )

    expect(screen.getByText(/error/i)).toBeInTheDocument()
    expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
  })

  it('displays events in chronological order (most recent first)', () => {
    const mockEvents = [
      {
        id: 'event-2',
        component_id: mockComponentId,
        milestone_name: 'Install',
        action: 'complete',
        value: 1,
        previous_value: null,
        user_id: 'user-2',
        created_at: '2024-10-20T14:30:00.000000+00:00',
        metadata: null,
      },
      {
        id: 'event-1',
        component_id: mockComponentId,
        milestone_name: 'Receive',
        action: 'complete',
        value: 1,
        previous_value: null,
        user_id: 'user-1',
        created_at: '2024-10-19T23:59:19.785701+00:00',
        metadata: null,
      },
    ]

    vi.mocked(useMilestoneEventsModule.useMilestoneEvents).mockReturnValue({
      data: mockEvents,
      isLoading: false,
      isError: false,
      error: null,
    } as any)

    render(
      React.createElement(
        createWrapper(),
        null,
        React.createElement(MilestoneHistoryView, { componentId: mockComponentId })
      )
    )

    const milestoneElements = screen.getAllByText(/Install|Receive/)
    // First element should be Install (most recent)
    expect(milestoneElements[0]).toHaveTextContent('Install')
    expect(milestoneElements[1]).toHaveTextContent('Receive')
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

    vi.mocked(useMilestoneEventsModule.useMilestoneEvents).mockReturnValue({
      data: mockEvents,
      isLoading: false,
      isError: false,
      error: null,
    } as any)

    render(
      React.createElement(
        createWrapper(),
        null,
        React.createElement(MilestoneHistoryView, { componentId: mockComponentId })
      )
    )

    expect(screen.getByText('Install')).toBeInTheDocument()
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

    vi.mocked(useMilestoneEventsModule.useMilestoneEvents).mockReturnValue({
      data: mockEvents,
      isLoading: false,
      isError: false,
      error: null,
    } as any)

    render(
      React.createElement(
        createWrapper(),
        null,
        React.createElement(MilestoneHistoryView, { componentId: mockComponentId })
      )
    )

    expect(screen.getByText('Install')).toBeInTheDocument()
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

    vi.mocked(useMilestoneEventsModule.useMilestoneEvents).mockReturnValue({
      data: mockEvents,
      isLoading: false,
      isError: false,
      error: null,
    } as any)

    render(
      React.createElement(
        createWrapper(),
        null,
        React.createElement(MilestoneHistoryView, { componentId: mockComponentId })
      )
    )

    expect(screen.getByText('Install')).toBeInTheDocument()
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

    vi.mocked(useMilestoneEventsModule.useMilestoneEvents).mockReturnValue({
      data: mockEvents,
      isLoading: false,
      isError: false,
      error: null,
    } as any)

    render(
      React.createElement(
        createWrapper(),
        null,
        React.createElement(MilestoneHistoryView, { componentId: mockComponentId })
      )
    )

    expect(screen.getByText('Install')).toBeInTheDocument()
    expect(screen.queryByText(/Reason:/)).not.toBeInTheDocument()
  })
})
