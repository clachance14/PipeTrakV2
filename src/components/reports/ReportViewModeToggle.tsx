/**
 * ReportViewModeToggle Component (Feature 032)
 * Toggle between Count view and Manhour view for progress reports
 */

import { Hash, Clock, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReportViewMode } from '@/types/reports';

interface ReportViewModeToggleProps {
  value: ReportViewMode;
  onChange: (mode: ReportViewMode) => void;
  hasBudget: boolean; // Disable manhour mode if no budget exists
  disabled?: boolean;
}

export function ReportViewModeToggle({
  value,
  onChange,
  hasBudget,
  disabled = false,
}: ReportViewModeToggleProps) {
  const handleChange = (mode: ReportViewMode) => {
    if (disabled) return;
    if ((mode === 'manhour' || mode === 'manhour_percent') && !hasBudget) return;
    onChange(mode);
  };

  return (
    <div
      className="inline-flex rounded-md border border-input bg-background"
      role="radiogroup"
      aria-label="Report view mode"
    >
      {/* Count View Button */}
      <button
        type="button"
        role="radio"
        aria-checked={value === 'count'}
        onClick={() => handleChange('count')}
        disabled={disabled}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors',
          'rounded-l-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          value === 'count'
            ? 'bg-primary text-primary-foreground'
            : 'hover:bg-accent hover:text-accent-foreground'
        )}
      >
        <Hash className="h-4 w-4" aria-hidden="true" />
        <span>Count</span>
      </button>

      {/* Manhour View Button */}
      <button
        type="button"
        role="radio"
        aria-checked={value === 'manhour'}
        onClick={() => handleChange('manhour')}
        disabled={disabled || !hasBudget}
        title={!hasBudget ? 'Create a manhour budget in Settings to enable this view' : undefined}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          value === 'manhour'
            ? 'bg-primary text-primary-foreground'
            : 'hover:bg-accent hover:text-accent-foreground'
        )}
      >
        <Clock className="h-4 w-4" aria-hidden="true" />
        <span>Manhours</span>
      </button>

      {/* Manhour Percent View Button */}
      <button
        type="button"
        role="radio"
        aria-checked={value === 'manhour_percent'}
        onClick={() => handleChange('manhour_percent')}
        disabled={disabled || !hasBudget}
        title={!hasBudget ? 'Create a manhour budget in Settings to enable this view' : undefined}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors',
          'rounded-r-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          value === 'manhour_percent'
            ? 'bg-primary text-primary-foreground'
            : 'hover:bg-accent hover:text-accent-foreground'
        )}
      >
        <Percent className="h-4 w-4" aria-hidden="true" />
        <span>MH %</span>
        {!hasBudget && (
          <span className="text-xs text-muted-foreground">(No Budget)</span>
        )}
      </button>
    </div>
  );
}
