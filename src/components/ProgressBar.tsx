import { cn } from '@/lib/utils';

interface MiniProgressBarProps {
  value: number; // 0-100
  size?: 'sm' | 'md'; // sm: 4px, md: 6px height
  showLabel?: boolean; // Show percentage text
  className?: string;
}

/**
 * MiniProgressBar component
 * A compact progress bar with color-coded thresholds
 *
 * Color scheme:
 * - 0%: transparent (empty)
 * - 1-25%: red (just started)
 * - 26-75%: amber (in progress)
 * - 76-99%: blue (nearly complete)
 * - 100%: green (complete)
 */
export function MiniProgressBar({
  value,
  size = 'sm',
  showLabel = false,
  className
}: MiniProgressBarProps) {
  const clampedValue = Math.max(0, Math.min(100, value));

  const getColor = () => {
    if (clampedValue === 0) return 'bg-transparent';
    if (clampedValue <= 25) return 'bg-red-500';
    if (clampedValue <= 75) return 'bg-amber-500';
    if (clampedValue < 100) return 'bg-blue-500';
    return 'bg-green-500';
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn(
        'w-16 bg-slate-200 rounded-full overflow-hidden',
        size === 'sm' ? 'h-1' : 'h-1.5'
      )}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            getColor()
          )}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-sm font-medium tabular-nums">
          {clampedValue.toFixed(1)}%
        </span>
      )}
    </div>
  );
}
