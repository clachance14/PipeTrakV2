/**
 * MilestoneButton component (Feature 007)
 * Renders checkbox (discrete) or slider (partial %) based on milestone type
 */

import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

interface MilestoneConfig {
  name: string;
  weight: number;
  is_partial?: boolean; // If true, show slider; otherwise show checkbox
}

interface MilestoneButtonProps {
  milestone: MilestoneConfig;
  value: boolean | number; // Current milestone value
  onChange: (value: boolean | number) => void;
  disabled: boolean; // True if user lacks can_update_milestones permission
}

/**
 * MilestoneButton component
 * Conditionally renders:
 * - Checkbox for discrete milestones (boolean values)
 * - Slider for partial % milestones (0-100 values)
 */
export function MilestoneButton({
  milestone,
  value,
  onChange,
  disabled,
}: MilestoneButtonProps) {
  // Hybrid workflow: Show slider for partial %
  if (milestone.is_partial) {
    const numericValue = typeof value === 'number' ? value : 0;

    return (
      <div className="space-y-2">
        <Label>
          {milestone.name} ({milestone.weight}%)
        </Label>
        <div className="flex items-center gap-4">
          <Slider
            value={[numericValue]}
            onValueChange={([newValue]) => onChange(newValue ?? 0)}
            min={0}
            max={100}
            step={5}
            disabled={disabled}
            className="flex-1"
          />
          <span className="text-sm text-muted-foreground min-w-[3rem] text-right">
            {numericValue}%
          </span>
        </div>
      </div>
    );
  }

  // Discrete workflow: Show checkbox
  const booleanValue = !!value;

  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        id={`milestone-${milestone.name}`}
        checked={booleanValue}
        onCheckedChange={(checked) => onChange(checked === true)}
        disabled={disabled}
      />
      <Label
        htmlFor={`milestone-${milestone.name}`}
        className={disabled ? 'opacity-50' : 'cursor-pointer'}
      >
        {milestone.name} ({milestone.weight}%)
      </Label>
    </div>
  );
}
