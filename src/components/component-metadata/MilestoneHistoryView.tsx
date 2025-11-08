/**
 * MilestoneHistoryView component (Feature 020 - T013)
 * Read-only display of milestone event history for component metadata modal
 */

import { useMilestoneEvents } from '@/hooks/useMilestoneEvents'

interface MilestoneHistoryViewProps {
  componentId: string
}

/**
 * Formats ISO timestamp as readable date string
 * Example: "2024-10-19T15:30:45.123456+00:00" -> "Oct 19, 2024, 3:30 PM"
 */
function formatTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return isoString
  }
}

export function MilestoneHistoryView({ componentId }: MilestoneHistoryViewProps) {
  const { data: events, isLoading, isError } = useMilestoneEvents(componentId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-gray-500">Loading milestone history...</div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="text-sm text-red-800">
          <p className="font-medium">Error loading milestone history</p>
          <p className="mt-1">Failed to load milestone events</p>
        </div>
      </div>
    )
  }

  if (!events || events.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-gray-500">No milestone history available</div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {events.map((event) => (
        <div
          key={event.id}
          className="flex items-start justify-between rounded-md border border-gray-200 bg-white p-3 hover:bg-gray-50"
        >
          <div className="flex-1">
            <div className="font-medium text-gray-900">{event.milestone_name}</div>
            <div className="mt-1 text-sm text-gray-500">
              {formatTimestamp(event.created_at)}
            </div>
          </div>
          {event.action === 'complete' && (
            <div className="ml-4 flex-shrink-0">
              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                Completed
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
