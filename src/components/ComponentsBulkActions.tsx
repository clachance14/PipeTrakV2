import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { ChevronDown, Clock } from 'lucide-react';

export interface ComponentsBulkActionsProps {
  selectionMode: boolean;
  onToggleSelectionMode: () => void;
  selectedCount: number;
  onClearSelection: () => void;
  onMarkReceived: () => void;
  onMarkPostHydro?: () => void;
  onClearPostHydro?: () => void;
  isProcessing?: boolean;
  className?: string;
}

export function ComponentsBulkActions({
  selectionMode,
  onToggleSelectionMode,
  selectedCount,
  onClearSelection,
  onMarkReceived,
  onMarkPostHydro,
  onClearPostHydro,
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

          {/* More Actions Dropdown */}
          {(onMarkPostHydro || onClearPostHydro) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isProcessing}>
                  More
                  <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onMarkPostHydro && (
                  <DropdownMenuItem onClick={onMarkPostHydro} disabled={isProcessing}>
                    <Clock className="mr-2 h-4 w-4" />
                    Mark as Post-Hydro
                  </DropdownMenuItem>
                )}
                {onClearPostHydro && (
                  <DropdownMenuItem onClick={onClearPostHydro} disabled={isProcessing}>
                    <Clock className="mr-2 h-4 w-4" />
                    Clear Post-Hydro
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </>
      )}
    </div>
  );
}
