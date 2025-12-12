/**
 * QuickFilterChips component
 * Provides quick-access filter buttons for common progress states
 */

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QuickFilter {
  id: string;
  label: string;
  isActive: boolean;
  // Filter values to apply when clicked
  filter: {
    progress_min?: number;
    progress_max?: number;
  };
}

interface QuickFilterChipsProps<T = unknown> {
  activeFilters: T & {
    progress_min?: number;
    progress_max?: number;
  };
  onFilterChange: (filters: T & {
    progress_min?: number;
    progress_max?: number;
  }) => void;
  onClearAll: () => void;
}

const QUICK_FILTERS: QuickFilter[] = [
  {
    id: 'not-started',
    label: 'Not Started',
    isActive: false,
    filter: { progress_min: 0, progress_max: 0 },
  },
  {
    id: 'in-progress',
    label: 'In Progress',
    isActive: false,
    filter: { progress_min: 1, progress_max: 99 },
  },
  {
    id: 'complete',
    label: 'Complete',
    isActive: false,
    filter: { progress_min: 100, progress_max: 100 },
  },
];

export function QuickFilterChips({ activeFilters, onFilterChange, onClearAll }: QuickFilterChipsProps) {
  // Determine which quick filters are active
  const getActiveFilters = () => {
    return QUICK_FILTERS.map(qf => ({
      ...qf,
      isActive:
        activeFilters.progress_min === qf.filter.progress_min &&
        activeFilters.progress_max === qf.filter.progress_max,
    }));
  };

  const filters = getActiveFilters();
  const hasAnyFilter = Object.values(activeFilters).some(v => v !== undefined);

  const handleQuickFilter = (qf: QuickFilter) => {
    if (qf.isActive) {
      // Clear this filter
      onFilterChange({
        ...activeFilters,
        progress_min: undefined,
        progress_max: undefined,
      });
    } else {
      // Apply this filter
      onFilterChange({
        ...activeFilters,
        ...qf.filter,
      });
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-muted-foreground">Quick:</span>

      {filters.map(qf => (
        <Button
          key={qf.id}
          variant={qf.isActive ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleQuickFilter(qf)}
          className={cn(
            'h-7 text-xs',
            qf.isActive && 'ring-2 ring-offset-1'
          )}
        >
          {qf.label}
        </Button>
      ))}

      {hasAnyFilter && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
        >
          <X className="h-3 w-3" />
          Clear
        </Button>
      )}
    </div>
  );
}
