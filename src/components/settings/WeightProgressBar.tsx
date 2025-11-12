/**
 * WeightProgressBar component (Feature 026 - User Story 2)
 * Visual weight distribution bar showing milestone weights
 */

import { cn } from '@/lib/utils';

interface MilestoneWeight {
  milestone_name: string;
  weight: number;
}

interface WeightProgressBarProps {
  weights: MilestoneWeight[];
}

// Color palette for different milestones
const MILESTONE_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-red-500',
  'bg-orange-500',
  'bg-teal-500',
  'bg-cyan-500',
];

export function WeightProgressBar({ weights }: WeightProgressBarProps) {
  const total = weights.reduce((sum, { weight }) => sum + weight, 0);
  const isValid = total === 100;

  return (
    <div className="space-y-2">
      {/* Progress bar */}
      <div
        className="flex h-8 w-full overflow-hidden rounded-md border border-gray-300"
        role="progressbar"
        aria-label="Weight distribution"
        aria-valuenow={total}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {weights.length === 0 ? (
          <div className="flex items-center justify-center w-full text-sm text-gray-400">
            No weights configured
          </div>
        ) : (
          weights.map((milestone, index) => {
            const colorClass = MILESTONE_COLORS[index % MILESTONE_COLORS.length];

            // Don't render segments with 0 width visually, but keep them in DOM
            if (milestone.weight === 0) {
              return (
                <div
                  key={milestone.milestone_name}
                  data-testid={`weight-segment-${milestone.milestone_name}`}
                  title={`${milestone.milestone_name}: ${milestone.weight}%`}
                  className={cn(colorClass, 'transition-all duration-200')}
                  style={{ width: '0%' }}
                />
              );
            }

            return (
              <div
                key={milestone.milestone_name}
                data-testid={`weight-segment-${milestone.milestone_name}`}
                title={`${milestone.milestone_name}: ${milestone.weight}%`}
                className={cn(
                  colorClass,
                  'flex items-center justify-center text-xs font-medium text-white',
                  'transition-all duration-200'
                )}
                style={{ width: `${milestone.weight}%` }}
              >
                {/* Only show label if segment is wide enough */}
                {milestone.weight >= 10 && (
                  <span className="px-1">{milestone.weight}%</span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Total display */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">Total Weight:</span>
        <span
          className={cn(
            'font-semibold',
            isValid ? 'text-green-600' : 'text-red-600'
          )}
        >
          Total: {total}%
        </span>
      </div>
    </div>
  );
}
