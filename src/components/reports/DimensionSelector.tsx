/**
 * DimensionSelector Component (Feature 019 - T022)
 * Radio button group (desktop) / dropdown (mobile) for selecting report grouping dimension
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
import type { GroupingDimension } from '@/types/reports';
import { DIMENSION_LABELS } from '@/types/reports';

interface DimensionSelectorProps {
  value: GroupingDimension;
  onChange: (dimension: GroupingDimension) => void;
  disabled?: boolean;
}

export function DimensionSelector({ value, onChange, disabled = false }: DimensionSelectorProps) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Group By</Label>

      {/* Mobile: Dropdown Select (≤1024px) */}
      <div className="lg:hidden">
        <Select
          value={value}
          onValueChange={(newValue) => onChange(newValue as GroupingDimension)}
          disabled={disabled}
        >
          <SelectTrigger className="w-full min-h-[44px]" aria-label="Group by dimension">
            <SelectValue placeholder="Select grouping dimension" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="area">{DIMENSION_LABELS.area}</SelectItem>
            <SelectItem value="system">{DIMENSION_LABELS.system}</SelectItem>
            <SelectItem value="test_package">{DIMENSION_LABELS.test_package}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Desktop: Radio Group (>1024px) */}
      <div className="hidden lg:block">
        <RadioGroup
          value={value}
          onValueChange={(newValue) => onChange(newValue as GroupingDimension)}
          disabled={disabled}
          aria-label="Group by dimension"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="area" id="dimension-area" disabled={disabled} />
            <Label htmlFor="dimension-area" className={disabled ? 'opacity-50' : ''}>
              {DIMENSION_LABELS.area}
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="system" id="dimension-system" disabled={disabled} />
            <Label htmlFor="dimension-system" className={disabled ? 'opacity-50' : ''}>
              {DIMENSION_LABELS.system}
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="test_package" id="dimension-test-package" disabled={disabled} />
            <Label htmlFor="dimension-test-package" className={disabled ? 'opacity-50' : ''}>
              {DIMENSION_LABELS.test_package}
            </Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
}
