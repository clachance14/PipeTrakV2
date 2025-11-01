/**
 * DimensionSelector Component (Feature 019 - T022)
 * Radio button group (desktop) / dropdown (mobile) for selecting report grouping dimension
 *
 * Supports two variants:
 * - 'component': Area, System, Test Package (default)
 * - 'field-weld': Area, System, Test Package, Welder
 */

import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { User } from 'lucide-react';
import type { GroupingDimension, FieldWeldGroupingDimension } from '@/types/reports';
import { DIMENSION_LABELS, FIELD_WELD_DIMENSION_LABELS } from '@/types/reports';

interface BaseDimensionSelectorProps {
  disabled?: boolean;
}

interface ComponentDimensionSelectorProps extends BaseDimensionSelectorProps {
  variant?: 'component';
  value: GroupingDimension;
  onChange: (dimension: GroupingDimension) => void;
}

interface FieldWeldDimensionSelectorProps extends BaseDimensionSelectorProps {
  variant: 'field-weld';
  value: FieldWeldGroupingDimension;
  onChange: (dimension: FieldWeldGroupingDimension) => void;
}

type DimensionSelectorProps = ComponentDimensionSelectorProps | FieldWeldDimensionSelectorProps;

export function DimensionSelector(props: DimensionSelectorProps) {
  const { value, onChange, disabled = false, variant = 'component' } = props;

  // Determine labels based on variant
  const labels = variant === 'field-weld' ? FIELD_WELD_DIMENSION_LABELS : DIMENSION_LABELS;

  // Type-safe onChange handler
  const handleChange = (newValue: string) => {
    if (variant === 'field-weld') {
      (onChange as (dimension: FieldWeldGroupingDimension) => void)(newValue as FieldWeldGroupingDimension);
    } else {
      (onChange as (dimension: GroupingDimension) => void)(newValue as GroupingDimension);
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Group By</Label>

      {/* Mobile: Dropdown Select (≤1024px) */}
      <div className="lg:hidden">
        <Select
          value={value}
          onValueChange={handleChange}
          disabled={disabled}
        >
          <SelectTrigger className="w-full min-h-[44px]" aria-label="Group by dimension">
            <SelectValue placeholder="Select grouping dimension" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="area">{labels.area}</SelectItem>
            <SelectItem value="system">{labels.system}</SelectItem>
            <SelectItem value="test_package">{labels.test_package}</SelectItem>
            {variant === 'field-weld' && (
              <SelectItem value="welder">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {FIELD_WELD_DIMENSION_LABELS.welder}
                </div>
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop: Radio Group (>1024px) */}
      <div className="hidden lg:block">
        <RadioGroup
          value={value}
          onValueChange={handleChange}
          disabled={disabled}
          aria-label="Group by dimension"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="area" id="dimension-area" disabled={disabled} />
            <Label htmlFor="dimension-area" className={disabled ? 'opacity-50' : ''}>
              {labels.area}
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="system" id="dimension-system" disabled={disabled} />
            <Label htmlFor="dimension-system" className={disabled ? 'opacity-50' : ''}>
              {labels.system}
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="test_package" id="dimension-test-package" disabled={disabled} />
            <Label htmlFor="dimension-test-package" className={disabled ? 'opacity-50' : ''}>
              {labels.test_package}
            </Label>
          </div>
          {variant === 'field-weld' && (
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="welder" id="dimension-welder" disabled={disabled} />
              <Label htmlFor="dimension-welder" className={disabled ? 'opacity-50' : ''}>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {FIELD_WELD_DIMENSION_LABELS.welder}
                </div>
              </Label>
            </div>
          )}
        </RadioGroup>
      </div>
    </div>
  );
}
