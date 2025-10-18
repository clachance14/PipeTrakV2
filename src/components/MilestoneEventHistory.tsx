/**
 * MilestoneEventHistory component (Feature 007)
 * Displays audit trail of milestone updates for a component
 */

import { useMilestoneEvents } from '@/hooks/useMilestones';
import type { Database } from '@/types/database.types';

type MilestoneEvent = Database['public']['Tables']['milestone_events']['Row'];

interface MilestoneEventHistoryProps {
  componentId: string;
}

/**
 * MilestoneEventHistory component
 * Shows chronological list of milestone updates (audit trail)
 * Includes action type, value changes, timestamp, and user
 */
export function MilestoneEventHistory({ componentId }: MilestoneEventHistoryProps) {
  const { data: events = [], isLoading } = useMilestoneEvents(componentId);

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground">Loading milestone history...</div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">No milestone updates yet</div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm">Milestone History</h3>
      <div className="space-y-1 max-h-[300px] overflow-y-auto">
        {events.map((event) => (
          <MilestoneEventRow key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}

function MilestoneEventRow({ event }: { event: MilestoneEvent }) {
  // Format timestamp
  const timestamp = new Date(event.created_at).toLocaleString();

  // Format action with appropriate icon
  let actionIcon = '';
  let actionColor = '';
  switch (event.action) {
    case 'complete':
      actionIcon = '✓';
      actionColor = 'text-green-600';
      break;
    case 'rollback':
      actionIcon = '↶';
      actionColor = 'text-yellow-600';
      break;
    case 'update':
      actionIcon = '↻';
      actionColor = 'text-blue-600';
      break;
  }

  // Format value change
  const valueDisplay =
    event.previous_value !== null
      ? `${event.previous_value} → ${event.value}`
      : `${event.value}`;

  return (
    <div className="flex items-start gap-2 p-2 bg-muted/50 rounded text-xs">
      <span className={`${actionColor} font-bold`}>{actionIcon}</span>
      <div className="flex-1 min-w-0">
        <div className="font-medium">
          {event.milestone_name}: {valueDisplay}
        </div>
        <div className="text-muted-foreground">{timestamp}</div>
        {event.metadata && (
          <div className="text-muted-foreground mt-1">
            {JSON.stringify(event.metadata)}
          </div>
        )}
      </div>
    </div>
  );
}
