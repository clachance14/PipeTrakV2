import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface MilestoneConfig {
  name: string;
  weight: number;
  order: number;
  is_partial: boolean;
  requires_welder: boolean;
}

interface MilestoneChipsProps {
  milestonesConfig: MilestoneConfig[];
  currentMilestones: Record<string, boolean | number>;
  maxVisible?: number; // Truncate with "+N more"
  compact?: boolean; // Use abbreviations and smaller styling
}

interface MilestoneBadgeProps {
  milestone: MilestoneConfig;
  currentValue: boolean | number | undefined;
  showPercentage?: boolean;
  compact?: boolean;
}

/**
 * Get 3-letter abbreviation for milestone name
 */
function getAbbreviation(name: string): string {
  const abbreviations: Record<string, string> = {
    'Receive': 'RCV',
    'Install': 'INS',
    'Fit-up': 'FIT',
    'Weld Complete': 'WLD',
    'Punch': 'PUN',
    'Test': 'TST',
    'Restore': 'RST',
    'Erect': 'ERC',
    'Connect': 'CON',
    'Fabricate': 'FAB',
    'Support': 'SUP',
  };
  return abbreviations[name] || name.substring(0, 3).toUpperCase();
}

function getMilestoneState(
  milestone: MilestoneConfig,
  milestoneState: boolean | number | undefined
) {
  let isComplete = false;
  let isPartialProgress = false;
  let progressPercent = 0;

  if (milestone.is_partial) {
    // Partial milestone (0-100)
    progressPercent = typeof milestoneState === 'number' ? milestoneState : 0;
    isComplete = progressPercent === 100;
    isPartialProgress = progressPercent > 0 && progressPercent < 100;
  } else {
    // Discrete milestone (stored as 100 or 0, or legacy true/false)
    isComplete = milestoneState === 100 || milestoneState === true;
  }

  return { isComplete, isPartialProgress, progressPercent };
}

function MilestoneBadge({ milestone, currentValue, showPercentage = false, compact = false }: MilestoneBadgeProps) {
  const { isComplete, isPartialProgress, progressPercent } = getMilestoneState(
    milestone,
    currentValue
  );

  const colorClasses = isComplete
    ? 'bg-green-100 text-green-800 border-green-200'
    : isPartialProgress
    ? 'bg-amber-100 text-amber-800 border-amber-200'
    : 'bg-slate-100 text-slate-600 border-slate-200';

  // In compact mode, use abbreviations; otherwise use full names
  const displayName = compact ? getAbbreviation(milestone.name) : milestone.name;
  const label = showPercentage && isPartialProgress
    ? `${displayName} (${progressPercent}%)`
    : displayName;

  const tooltipText = isComplete
    ? `${milestone.name}: Complete`
    : isPartialProgress
    ? `${milestone.name}: ${progressPercent}%`
    : `${milestone.name}: Not started`;

  return (
    <span
      className={cn(
        'rounded-full font-medium border cursor-default select-none',
        compact
          ? 'px-1.5 py-px text-[10px]'
          : 'px-2 py-0.5 text-xs',
        colorClasses
      )}
      title={tooltipText}
    >
      {label}
    </span>
  );
}

export function MilestoneChips({
  milestonesConfig,
  currentMilestones,
  maxVisible,
  compact = false,
}: MilestoneChipsProps) {
  // Sort milestones by order from template
  const sortedMilestones = [...milestonesConfig].sort((a, b) => a.order - b.order);

  // Determine which milestones to show
  const visibleMilestones = maxVisible
    ? sortedMilestones.slice(0, maxVisible)
    : sortedMilestones;
  const hiddenCount = maxVisible && sortedMilestones.length > maxVisible
    ? sortedMilestones.length - maxVisible
    : 0;

  return (
    <div className={cn('flex items-center', compact ? 'gap-1' : 'gap-1.5')}>
      {visibleMilestones.map((milestone) => (
        <MilestoneBadge
          key={milestone.name}
          milestone={milestone}
          currentValue={currentMilestones?.[milestone.name]}
          showPercentage={false}
          compact={compact}
        />
      ))}
      {hiddenCount > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              className={cn(
                'rounded-full font-medium bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition-colors',
                compact ? 'px-1.5 py-px text-[10px]' : 'px-2 py-0.5 text-xs'
              )}
              aria-label={`Show ${hiddenCount} more milestones`}
            >
              +{hiddenCount}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="start">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">All Milestones</p>
              <div className="flex flex-wrap gap-1.5">
                {sortedMilestones.map((milestone) => (
                  <MilestoneBadge
                    key={milestone.name}
                    milestone={milestone}
                    currentValue={currentMilestones?.[milestone.name]}
                    showPercentage={true}
                    compact={false}
                  />
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
