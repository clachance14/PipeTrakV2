/**
 * DateRangeFilter Component (Feature 033)
 * Allows users to filter progress reports by date range using presets or custom dates
 */

import { X } from 'lucide-react';
import { useReportPreferencesStore } from '@/stores/useReportPreferencesStore';
import { DATE_RANGE_PRESET_LABELS, type DateRangePreset } from '@/types/reports';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export function DateRangeFilter() {
  const { dateRange, setDateRangePreset, setCustomDateRange, resetDateRange } =
    useReportPreferencesStore();

  const handlePresetChange = (value: string) => {
    setDateRangePreset(value as DateRangePreset);
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const startDate = e.target.value;
    const endDate = dateRange.endDate || '';
    setCustomDateRange(startDate, endDate);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const startDate = dateRange.startDate || '';
    const endDate = e.target.value;
    setCustomDateRange(startDate, endDate);
  };

  const handleClearFilter = () => {
    resetDateRange();
  };

  const showClearButton = dateRange.preset !== 'all_time';
  const showCustomInputs = dateRange.preset === 'custom';

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Preset Select Dropdown */}
      <div className="flex items-center gap-2">
        <Select value={dateRange.preset} onValueChange={handlePresetChange}>
          <SelectTrigger
            className="w-[180px] h-11 min-h-[44px]"
            aria-label="Select date range preset"
          >
            <SelectValue placeholder="Select date range" />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(DATE_RANGE_PRESET_LABELS) as [DateRangePreset, string][]).map(
              ([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>

        {/* Clear Button (when preset is not 'all_time') */}
        {showClearButton && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClearFilter}
            className="h-11 w-11 min-h-[44px] min-w-[44px]"
            aria-label="Clear date range filter"
            title="Clear date range filter"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>

      {/* Custom Date Inputs (when preset === 'custom') */}
      {showCustomInputs && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex flex-col gap-1">
            <label htmlFor="start-date" className="text-xs text-muted-foreground">
              Start Date
            </label>
            <input
              id="start-date"
              type="date"
              value={dateRange.startDate || ''}
              onChange={handleStartDateChange}
              className="h-11 min-h-[44px] px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              aria-label="Start date"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="end-date" className="text-xs text-muted-foreground">
              End Date
            </label>
            <input
              id="end-date"
              type="date"
              value={dateRange.endDate || ''}
              onChange={handleEndDateChange}
              className="h-11 min-h-[44px] px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              aria-label="End date"
            />
          </div>
        </div>
      )}
    </div>
  );
}
