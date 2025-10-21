/**
 * Component: DrawingBulkActions
 * Feature: 011-the-drawing-component
 *
 * Toolbar displayed when drawings are selected in selection mode.
 * Shows count of selected drawings and action buttons.
 */

import { Button } from '@/components/ui/button';

interface DrawingBulkActionsProps {
  /** Number of drawings selected */
  selectedCount: number;
  /** Callback when "Assign Metadata" button clicked */
  onAssignMetadata: () => void;
  /** Callback when "Clear Selection" button clicked */
  onClearSelection: () => void;
  /** Optional CSS classes */
  className?: string;
}

export function DrawingBulkActions({
  selectedCount,
  onAssignMetadata,
  onClearSelection,
  className = '',
}: DrawingBulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 ${className}`}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-blue-900">
          {selectedCount} {selectedCount === 1 ? 'drawing' : 'drawings'} selected
        </span>
        {selectedCount >= 50 && (
          <span className="text-xs text-blue-700">(maximum reached)</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onClearSelection}>
          Clear Selection
        </Button>
        <Button size="sm" onClick={onAssignMetadata}>
          Assign Metadata
        </Button>
      </div>
    </div>
  );
}
