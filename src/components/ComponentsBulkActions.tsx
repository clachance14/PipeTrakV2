import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ComponentsBulkActionsProps {
  selectionMode: boolean;
  onToggleSelectionMode: () => void;
  selectedCount: number;
  onClearSelection: () => void;
  onMarkReceived: () => void;
  isProcessing?: boolean;
  className?: string;
}

export function ComponentsBulkActions({
  selectionMode,
  onToggleSelectionMode,
  selectedCount,
  onClearSelection,
  onMarkReceived,
  isProcessing = false,
  className,
}: ComponentsBulkActionsProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-3 rounded-full border px-3 py-1.5 transition-colors',
        selectionMode
          ? 'bg-primary/10 border-primary'
          : 'bg-muted/50 border-muted-foreground/20',
        className
      )}
    >
      {/* Mode toggle button */}
      <Button
        variant={selectionMode ? 'default' : 'outline'}
        size="sm"
        onClick={onToggleSelectionMode}
        aria-pressed={selectionMode}
        className={cn(
          'font-medium',
          !selectionMode && 'bg-muted/50 hover:bg-muted'
        )}
      >
        {selectionMode ? 'Selection On' : 'Selection Off'}
      </Button>

      {/* Selection count and actions (when mode ON and count > 0) */}
      {selectionMode && selectedCount > 0 && (
        <>
          <div className="h-4 w-px bg-border" />
          <span className="text-sm text-muted-foreground">
            {selectedCount} selected
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onClearSelection}
            disabled={isProcessing}
          >
            Clear
          </Button>
          <Button
            size="sm"
            onClick={onMarkReceived}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Mark Received'}
          </Button>
        </>
      )}
    </div>
  );
}
